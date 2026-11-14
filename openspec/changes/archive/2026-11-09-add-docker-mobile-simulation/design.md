# Design

## Context

Ver proposal.md – Why. O app é definido pela change `add-barbershop-booking`: Next.js 15 (App Router), Supabase (Auth + Postgres via RPC), PWA com Serwist e Playwright já previsto para E2E. Máquina de desenvolvimento: Windows 11 com Docker 29 / Compose v5 (WSL2), sem Android SDK e sem macOS. Requisitos em `specs/container-runtime` e `specs/mobile-device-simulation`.

## Goals / Non-Goals

**Goals:**
- Um fluxo `up → mobile → down` reproduzível, sem dependências além de Docker e Node/npm.
- Service worker funcionando dentro da simulação nos dois motores (exige contexto seguro).
- Resultados determinísticos mesmo com os quatro aparelhos em paralelo.

**Non-Goals:**
- Orquestração de produção (Kubernetes, imagens publicadas em registry).
- Hot reload dentro do container: desenvolvimento diário continua com `npm run dev` no host; o Docker é para rodar e validar o build de produção.

## Decisions

### 1. Supabase local via Supabase CLI (que usa Docker), não compose próprio
`supabase start` sobe Postgres, GoTrue, PostgREST, Kong, Studio e Inbucket/Mailpit em containers na rede `supabase_network_barbearia`, aplicando migrações e `seed.sql`. Os nossos serviços entram nessa rede como `external`. Alternativa: copiar o `docker-compose` self-hosted do Supabase (~12 serviços) — descartada: muita configuração para manter, versões divergentes do CLI usado nas migrações. A CLI é executada via `npx supabase` (devDependency), então não exige instalação global.

### 2. Imagem do app
`Dockerfile` multi-stage em `node:22-alpine`: `deps` (`npm ci`) → `build` (`next build` com `output: 'standalone'`) → `runner` com apenas `.next/standalone`, `.next/static` e `public`, usuário `nextjs` (uid 1001), `NODE_ENV=production`, porta 3000. `.dockerignore` exclui `.env*`, `node_modules`, `.next`, `e2e/results`. Nenhuma variável `NEXT_PUBLIC_*` é necessária no build (ver decisão 3), então a mesma imagem serve para qualquer ambiente.

### 3. Supabase no mesmo endereço do site (proxy em runtime)
Route Handler `app/supabase/[...path]/route.ts` repassa requisições (método, headers, corpo, streaming) para `SUPABASE_INTERNAL_URL` lida em runtime (no Docker: `http://supabase_kong_barbearia:8000`). O cliente do navegador usa `${location.origin}/supabase`; a anon key é entregue pelo layout do servidor. O cliente servidor usa a URL interna diretamente. Como o nome do cookie de sessão do `@supabase/ssr` deriva do hostname da URL, os dois clientes definem `cookieOptions.name` fixo (`sb-barbearia-auth`) para compartilhar a sessão. Alternativa: `rewrites()` no `next.config` — descartada porque no build `standalone` o destino fica congelado no momento do build.

### 4. Orquestração
`docker-compose.yml` com:
- `app`: build local, `env_file: .env`, `healthcheck` com `wget -qO- http://localhost:3000/api/health`, portas `3000` e `9323` (UI da simulação, ver decisão 6), rede externa do Supabase.
- `mobile` (perfil `mobile`, não sobe por padrão): imagem `mcr.microsoft.com/playwright:v<versão igual à do pacote>-noble`, `network_mode: "service:app"`, `depends_on: app: condition: service_healthy`, monta `./e2e` e `./playwright.config.ts`, `ipc: host`, `init: true`.
Scripts npm:
- `docker:up` = `supabase start && docker compose up -d --build --wait app`
- `docker:down` = `docker compose down && supabase stop`
- `docker:reset` = `supabase db reset`
- `docker:mobile` = `supabase db reset && docker compose --profile mobile run --rm mobile npx playwright test --config e2e/mobile/playwright.config.ts`
- `docker:mobile:ui` = mesmo container com `npx playwright test --ui --ui-host=0.0.0.0 --ui-port=9323`
- `docker:report` = abre `e2e/results/report/index.html`
Scripts escritos em Node (`scripts/*.mjs`) quando houver lógica além de encadear comandos, para funcionar igual no PowerShell e no bash.

### 5. Contexto seguro para o service worker
Com `network_mode: "service:app"`, o navegador do container acessa o site em `http://localhost:3000`, que é contexto seguro em Chromium e WebKit — o SW e as APIs de PWA funcionam sem HTTPS nem flags. Alternativa: acessar `http://app:3000` com `--unsafely-treat-insecure-origin-as-secure` — só existe no Chromium, não resolve o WebKit.

### 6. Perfis e configuração do Playwright
`e2e/mobile/playwright.config.ts` com `projects` baseados em `devices['Pixel 7']`, `devices['Galaxy S9+']`, `devices['iPhone 15']`, `devices['iPhone SE']`, todos com `locale: 'pt-BR'`, `timezoneId: 'America/Sao_Paulo'`, `serviceWorkers: 'allow'`. Nomes `android-pixel-7`, `android-galaxy-s9`, `ios-iphone-15`, `ios-iphone-se`; filtros `--project "android-*"` / `"ios-*"` expostos como `docker:mobile:android` e `docker:mobile:ios`. `screenshot: 'on'` (página inteira nas telas principais via `toHaveScreenshot` desligado; usamos `testInfo.attach` para evidência, não comparação visual), `video: 'retain-on-failure'`, `trace: 'retain-on-failure'`, reporter `html` em `e2e/results/report` (no `.gitignore`). A porta 9323 do modo UI é publicada no serviço `app` porque o `mobile` compartilha a rede dele.

### 7. Dados determinísticos em paralelo
`docker:mobile` reseta o banco antes. Cada projeto recebe um índice (0–3) via `testInfo.project` e usa: telefone `+55119990000<índice>`, e-mail `<projeto>@teste.local` e um horário diferente — o teste busca o primeiro dia aberto e pega o slot de posição `índice * 4` da lista, evitando colisão. O teste de conflito de horário já existe na change anterior e não é repetido aqui. Admin local de teste (`admin@barbearia.local` / senha documentada) criado no `seed.sql` (que só roda localmente; `supabase db push` não executa seed).

### 8. E-mail local
Adaptador de e-mail com `EMAIL_TRANSPORT=resend|smtp`. No Docker, `smtp` aponta para o Inbucket/Mailpit da CLI (`supabase_inbucket_barbearia:2500`, interface em http://localhost:54324). Assim nenhum e-mail sai para fora e a simulação pode consultar a caixa pela API para validar a confirmação.

### 9. Rota de saúde
`/api/health` faz um `select` leve via PostgREST (`services?limit=1`) e responde 200 `{ status: 'ok' }` ou 503. Sem dados sensíveis, sem cache.

### 10. Ajustes feitos durante a implementação
- **Config pública do navegador (decisão 3):** a anon key e a chave VAPID pública vêm de `GET /api/public-config` (dinâmica, lida em runtime), não do layout: home/serviços/agendar são estáticas (ISR) e o HTML pré-renderizado congelaria os valores do build. Os clientes do navegador (`lib/public-config.ts`) buscam essa config uma vez e usam `${location.origin}/supabase`.
- **Build da imagem (decisão 2):** o `next build` pré-renderiza páginas lendo o catálogo do Supabase, então precisa do banco no build. O BuildKit não entra em redes customizadas; o estágio de build usa a API publicada no host (`host.docker.internal:56321`, com `extra_hosts: host-gateway`) e recebe só URL e anon key (pública) como build args — nada disso chega ao estágio final.
- **IDs fixos dos serviços no `seed.sql`:** com UUID aleatório, cada `supabase db reset` deixaria as páginas pré-renderizadas/em cache com IDs inexistentes.
- **Variáveis da topologia Docker (decisão 4):** `SUPABASE_INTERNAL_URL`, `EMAIL_TRANSPORT`, `SMTP_*` têm padrão no `docker-compose.yml` e aparecem comentadas no `.env.example`, porque o Next do host também lê `.env` e o `npm run dev` quebraria com endereços internos da rede Docker.
- **Portas e e-mail (decisão 8):** este projeto usa as portas 5632x (Studio 56323, Mailpit 56324) e a CLI atual sobe Mailpit (SMTP `supabase_inbucket_barbearia:1025`), não Inbucket 2500.
- **Container de simulação (decisão 4):** monta `node_modules` do host (só JavaScript; navegadores vêm da imagem) e chama `node node_modules/@playwright/test/cli.js`, porque os atalhos de `.bin` gerados no Windows não rodam no Linux. Containers `mobile` órfãos são removidos antes de cada execução.
- **Dados em paralelo (decisão 7):** os horários de cada aparelho são calculados uma vez no `globalSetup` (banco recém-resetado), a partir de **amanhã** (o cancelamento exige 2 h de antecedência); o cenário de painel cria o próprio agendamento no segundo dia aberto. Telefone `+5511999<aparelho:2><cenário:4>` (o formato do design tinha um dígito a menos) e IP próprio por aparelho em `x-forwarded-for` (limite de 5 agendamentos/10 min por IP).

## Risks / Trade-offs

- [Emulação não é aparelho real: WebKit do Playwright ≠ Safari iOS; sem prompt de instalação nem push no iOS] → limitações listadas no README/relatório; checklist manual opcional em aparelho real antes do lançamento.
- [Consumo de memória (Supabase + app + 2 motores de navegador)] → `workers: 2` por padrão, configurável por `MOBILE_WORKERS`; requisito de ~6 GB documentado.
- [Versão da imagem Playwright divergir do pacote npm] → versão do pacote fixada sem `^` e lida pelo compose via variável `PLAYWRIGHT_VERSION` gerada a partir do `package.json`; teste de sanidade falha cedo se divergir.
- [Nome da rede do Supabase depende do `project_id` em `supabase/config.toml`] → fixar `project_id = "barbearia"`.
- [Fins de linha CRLF no Windows quebrando scripts shell dentro de containers] → `.gitattributes` com `eol=lf` para `*.sh` e Dockerfile; preferir scripts Node.
- [Proxy do Supabase passando por Next adiciona latência] → apenas no navegador (login do painel e poucas chamadas); o servidor fala direto com a URL interna.

## Migration Plan

Aditivo: não muda produção (Vercel). O proxy `/supabase` também funciona em produção, mas em produção `SUPABASE_INTERNAL_URL` aponta para a URL pública do projeto. Rollback: remover arquivos Docker/e2e mobile e voltar o cliente do navegador para `NEXT_PUBLIC_SUPABASE_URL`.

## Open Questions

- Se depois quiser aparelhos reais, avaliar BrowserStack/LambdaTest reutilizando os mesmos testes (apenas novos `projects`).
