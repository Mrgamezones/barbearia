# Barbearia — agendamento online (PWA)

Site de agendamento para barbearia: o cliente escolhe serviços, data e horário e confirma só com nome e WhatsApp, sem criar conta. O barbeiro gerencia agenda, serviços, horários e bloqueios num painel restrito.

Stack: Next.js 15 (App Router) · TypeScript · Tailwind CSS 4 · Supabase (Postgres, Auth) · PWA (Serwist) · Vitest · Playwright.

## Requisitos

- Node.js 20 ou superior e npm
- Docker Desktop em execução (o Supabase local roda em containers)

## Rodando localmente

```bash
npm install
npx supabase start          # sobe Postgres/Auth/API/Studio, aplica migrações e seed
cp .env.example .env.local  # já vem com valores locais; ajuste se precisar
npm run dev                 # http://localhost:3000
```

Preencha o `.env.local`:

| Variável | De onde vem |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `API_URL` de `npx supabase status` (padrão `http://127.0.0.1:56321`) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `ANON_KEY` de `npx supabase status -o env` |
| `SUPABASE_SERVICE_ROLE_KEY` | `SERVICE_ROLE_KEY` de `npx supabase status -o env` (somente servidor) |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` | `npx web-push generate-vapid-keys` |
| `CRON_SECRET` | qualquer segredo longo |
| `RESEND_API_KEY` / `EMAIL_FROM` | conta Resend; vazio = e-mails só no log |
| `WHATSAPP_TOKEN` / `WHATSAPP_PHONE_NUMBER_ID` | Cloud API da Meta ([docs/whatsapp-templates.md](docs/whatsapp-templates.md)); vazio = WhatsApp só no log |

> O projeto usa as portas **5632x** (API 56321, banco 56322, Studio 56323, e-mails de teste 56324) para não conflitar com outros projetos Supabase locais.

URLs locais:

- Site: http://localhost:3000
- Supabase Studio: http://127.0.0.1:56323
- Caixa de e-mails de teste (Mailpit): http://127.0.0.1:56324

## Rodando com Docker

Sobe o build de **produção** do app e o Supabase local em containers, sem instalar Postgres nem Supabase na máquina. Para o dia a dia (hot reload) continue usando `npm run dev`; o Docker serve para rodar e validar o site como ele vai ao ar.

**Requisitos:** Docker Desktop (no Windows, com WSL2) em execução, Node.js 20+ e npm, e **~6 GB de RAM livres** (Supabase + app + navegadores da simulação mobile).

```bash
npm install
cp .env.example .env    # opcional: o docker:up cria o .env se ele não existir
npm run docker:up       # Supabase local + imagem do app; espera o app ficar saudável
```

O `.env.example` já vem com valores locais de teste (chaves de demonstração do Supabase local, par VAPID de teste). Os endereços internos da rede Docker (`SUPABASE_INTERNAL_URL`, SMTP) são definidos pelo `docker-compose.yml`.

| Comando | O que faz |
|---|---|
| `npm run docker:up` | sobe Supabase (migrações + seed) e o app em http://localhost:3000; reconstrói a imagem se o código mudou |
| `npm run docker:down` | derruba todos os containers, **mantendo** os dados |
| `npm run docker:reset` | recria o banco do zero (migrações + seed, sem agendamentos); o site continua no ar |

URLs:

- Site: http://localhost:3000 · saúde: http://localhost:3000/api/health
- Painel: http://localhost:3000/admin — admin local de teste **`admin@barbearia.local`** / **`admin-local-123`** (criado pelo `seed.sql`, que só roda localmente)
- Supabase Studio: http://localhost:56323
- E-mails de teste (Mailpit): http://localhost:56324 — no Docker os e-mails vão por SMTP para esta caixa e **nunca saem para a internet**

Como funciona:

- `Dockerfile` multi-stage (`node:22-alpine`, build `standalone`, usuário não-root uid 1001). A imagem não contém `.env` nem chaves: tudo vem do ambiente em tempo de execução.
- O build pré-renderiza home e serviços lendo o Supabase local pela porta publicada no host (`host.docker.internal:56321`), por isso o `docker:up` sobe o Supabase antes. Os serviços do seed têm IDs fixos, então as páginas continuam válidas após um `docker:reset`.
- O navegador fala com o Supabase pelo próprio site (`/supabase/*`, proxy no app) e recebe a configuração pública em `/api/public-config`; o servidor usa a URL interna. Assim tudo funciona igual no host e dentro de outros containers.
- O app só é considerado pronto quando `/api/health` responde 200 (503 se o banco estiver fora do ar).

## Simulação Android e iOS

Valida o site em aparelhos **emulados**, rodando tudo em container: não precisa de Android SDK, macOS nem navegadores instalados. Usa o Playwright com perfis de aparelho (tela, densidade de pixels, toque, user agent), em pt-BR e fuso America/Sao_Paulo:

| Projeto | Aparelho | Motor |
|---|---|---|
| `android-pixel-7` | Pixel 7 | Chromium |
| `android-galaxy-s9` | Galaxy S9+ | Chromium |
| `ios-iphone-15` | iPhone 15 | WebKit (o motor do Safari) |
| `ios-iphone-se` | iPhone SE | WebKit |

Com o ambiente no ar (`npm run docker:up`):

| Comando | O que faz |
|---|---|
| `npm run docker:mobile` | reseta o banco e roda todos os cenários nos 4 aparelhos; termina com código 0 se tudo passar e ≠ 0 se algo falhar |
| `npm run docker:mobile:android` / `docker:mobile:ios` | só os perfis Android / só os perfis iOS |
| `npm run docker:mobile:ui` | modo visual em http://localhost:9323: escolha o aparelho (Projects) e o cenário, rode e assista passo a passo |
| `npm run docker:report` | abre o relatório HTML da última execução |

Argumentos extras vão para o Playwright, por exemplo `npm run docker:mobile -- --grep "painel"`. Por padrão rodam 2 navegadores em paralelo; ajuste com `MOBILE_WORKERS` no `.env`.

**Cenários (em cada aparelho):** home e serviços sem rolagem horizontal; agendamento completo por toque (Corte + Barba → data → horário → dados → confirmação), e-mail de confirmação na caixa de teste, link de gerenciamento e cancelamento liberando o horário; home exibida offline e aviso de conexão na etapa de horários; login do admin local e agenda do dia no painel; PWA — no Android, manifest válido e service worker ativo; no iOS, ícone Apple, título/status bar de app web e dica de instalação dispensável.

**Dados isolados:** a simulação parte do banco no estado do seed. Cada aparelho usa telefone, e-mail, IP e horário próprios (posição `índice × 4` da lista de horários do primeiro dia aberto, calculada uma vez antes dos testes), então os quatro podem agendar ao mesmo tempo sem conflito.

**Lendo o relatório** (`e2e/results/report`, fora do Git): os cenários aparecem agrupados por aparelho (filtre pelo nome do projeto). Em cada cenário, a aba de anexos traz as screenshots de página inteira de cada tela (`1-serviços`, `5-confirmação`, `painel-agenda-do-dia`…); nas falhas há também vídeo e trace (abra o trace para ver cada passo, a rede e o console).

**O que a emulação cobre e o que não cobre** (também anotado em cada cenário do relatório):

- ✅ Layout e toque nas medidas reais dos aparelhos, motores Chromium e WebKit, idioma/fuso, service worker e modo offline, meta tags de app web, fluxos completos contra o build de produção.
- ❌ Não substitui aparelho real para: **instalação do PWA no iOS** (Adicionar à Tela de Início), **notificações push**, e particularidades do **Safari do iOS** — o WebKit do Playwright não é o Safari (teclado virtual, barras do navegador, gestos e limites de armazenamento). Antes do lançamento, faça uma passada manual num iPhone e num Android reais.

## Painel administrativo

O painel fica em `/admin` e exige login de um usuário marcado como administrador. Não existe cadastro público: crie o administrador pelo script (usa a `SUPABASE_SERVICE_ROLE_KEY`):

```bash
node --env-file=.env.local scripts/create-admin.mjs voce@suabarbearia.com.br "uma-senha-forte"
```

O script cria o usuário no Supabase Auth (já confirmado) e o inclui na tabela `admins`. Rodar de novo com o mesmo e-mail apenas atualiza a senha. Em produção, rode o mesmo comando com as variáveis do projeto de produção.

Pelo painel o barbeiro:

- vê a agenda do dia ou da semana, com total previsto e atalho para o WhatsApp do cliente;
- muda o status (concluído, não compareceu, cancelado) e consulta o histórico de cada cliente;
- cria agendamentos manuais (sem antecedência mínima nem limite por cliente);
- gerencia serviços (preço, duração, ordem, ativar/desativar), horário de funcionamento, bloqueios e os dados da barbearia;
- edita os textos da página inicial (linha de destaque, título em duas linhas, subtítulo), o cartão "Seu barbeiro" (nome, frase, foto) e os links de contato (e-mail, Instagram) em **Configurações**.

## Identidade visual

Tema escuro único com dourado, Cormorant Garamond nos títulos e Inter no texto, baseado na referência enviada pelo cliente. Detalhes em [`docs/design/identidade.md`](docs/design/identidade.md) e o lado a lado com a referência em [`docs/design/comparativo.md`](docs/design/comparativo.md).

- Cores só via tokens (`bg-surface`, `text-gold`…), definidos em `app/globals.css`. O lint recusa cores arbitrárias (`text-[#…]`) e hex soltos em componentes.
- Guia de estilo com todos os componentes em `/estilo`: disponível em desenvolvimento, ou em produção com `ENABLE_STYLE_GUIDE=1`.
- **Fotos:** hero e galeria usam fotos provisórias com licença livre (créditos em `public/CREDITS.md`). Para usar fotos reais, substitua `public/hero.webp` e `public/galeria/01–08.webp` mantendo os nomes, ajuste os textos alternativos em `components/home/gallery-photos.ts` e atualize os créditos.
- **Ícones do PWA:** gerados a partir de `assets/icon.svg` com `node scripts/generate-icons.mjs`.

## Lembretes e mensagens (push, e-mail e WhatsApp)

- **Confirmação por e-mail:** enviada na hora do agendamento quando o cliente informa e-mail (com o link para ver/cancelar).
- **WhatsApp:** com o consentimento do cliente (caixa "Receber confirmação e lembretes pelo WhatsApp", marcada por padrão), o cliente recebe a confirmação, o aviso quando o barbeiro cancela no painel, a confirmação quando ele mesmo cancela pelo link e os lembretes de 24 h e 2 h. Uma falha no WhatsApp nunca bloqueia o agendamento. Configuração e texto dos modelos da Meta em [docs/whatsapp-templates.md](docs/whatsapp-templates.md).
- **Lembretes:** 24 h e 2 h antes, por e-mail (se informado), por WhatsApp (com consentimento) e por notificação push (se o cliente tocar em "Ativar lembrete" na página do agendamento). Cada lembrete é enviado uma única vez; agendamentos cancelados não recebem.
- **Registro:** toda tentativa de envio fica em `notification_log` (canal, tipo, status `sent`/`dry_run`/`failed`/`undeliverable`/`no_target` e detalhe).
- **Disparo:** a rota `GET/POST /api/cron/reminders` envia os lembretes vencidos. Ela exige o header `Authorization: Bearer $CRON_SECRET`.

Configuração:

1. Gere as chaves VAPID e coloque em `NEXT_PUBLIC_VAPID_PUBLIC_KEY` e `VAPID_PRIVATE_KEY`:
   ```bash
   npx web-push generate-vapid-keys
   ```
2. Crie uma conta no [Resend](https://resend.com), verifique o domínio e preencha `RESEND_API_KEY` e `EMAIL_FROM`. Sem a chave, os e-mails são apenas registrados no log do servidor (útil em desenvolvimento).
3. Agende a rota a cada 15 minutos, por uma destas opções:
   - **Vercel Cron** (já configurado em `vercel.json`): defina `CRON_SECRET` nas variáveis do projeto; a Vercel envia o header sozinha. No plano Hobby a Vercel só permite execução diária — use a opção abaixo.
   - **pg_cron + pg_net no Supabase** (recomendado no Netlify): rode o SQL de `supabase/cron-reminders.example.sql` no projeto de produção, trocando a URL e o segredo.

Para testar localmente:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/reminders
# {"claimed":0,"sent":0,"failed":0,"released":0,"removedSubscriptions":0}
```

> No iPhone, notificações push só funcionam com o site instalado na Tela de Início (iOS 16.4+). Por isso o e-mail é oferecido como alternativa.

## Deploy no Netlify

Passo a passo completo em [`docs/deploy-netlify.md`](docs/deploy-netlify.md): Supabase de produção (migrações, [dados iniciais](supabase/production-setup.example.sql) sem o admin de teste, criação do admin do dono), variáveis de ambiente, lembretes com `pg_cron`, domínio próprio e a conferência depois de publicar. A configuração de build está em [`netlify.toml`](netlify.toml).

A Vercel continua como alternativa (`vercel.json`).

## Apostila de vendas

Material para o vendedor, em [`docs/vendas/apostila-vendas.pdf`](docs/vendas/apostila-vendas.pdf): o que é o produto, como funciona, como vender e a oferta. A fonte é `docs/vendas/apostila.html`; preços e condições ficam no bloco `VALORES`, no topo do arquivo.

```bash
npm run handbook:screens   # recaptura as telas em docs/vendas/telas (site local no ar, com os dados do seed)
npm run handbook:pdf       # gera o PDF de novo; avisa se alguma seção passar de uma página
```

`handbook:screens` cria um agendamento de exemplo e o cancela no fim. Só rode contra o ambiente local.

## Comandos

| Comando | O que faz |
|---|---|
| `npm run dev` | servidor de desenvolvimento |
| `npm run build` / `npm start` | build de produção (webpack, exigido pelo service worker do PWA) e servidor de produção |
| `npm run lint` | ESLint |
| `npm test` | testes unitários (Vitest) |
| `npm run test:e2e` | testes ponta a ponta (Playwright) |
| `npm run docker:up` / `docker:down` / `docker:reset` | ambiente Docker (ver [Rodando com Docker](#rodando-com-docker)) |
| `npm run docker:mobile` / `docker:report` | simulação Android e iOS e relatório (ver [Simulação Android e iOS](#simulação-android-e-ios)) |
| `npx playwright test e2e/visual.spec.ts --project=desktop --update-snapshots` | regrava as referências visuais depois de uma mudança visual intencional (apague os PNGs antes, se a mudança for pequena) |
| `npx supabase test db` | testes do banco (pgTAP: RLS, disponibilidade, agendamento) |
| `npx supabase db reset` | recria o banco local com migrações e seed |
| `npx supabase stop` | para o Supabase local |

## Estrutura

```
app/                 rotas (site público, /agendar, /agendamento/[token], /admin, /api)
components/          componentes de interface
lib/                 formatação, validação, clientes Supabase
supabase/migrations  esquema, RLS e funções (disponibilidade, agendamento)
supabase/seed.sql    serviços, horário padrão e configurações de exemplo
supabase/tests       testes pgTAP
tests/, e2e/         testes unitários e ponta a ponta
docs/design/         referência visual, identidade e comparativo
openspec/            propostas, specs e tarefas (OpenSpec)
```
