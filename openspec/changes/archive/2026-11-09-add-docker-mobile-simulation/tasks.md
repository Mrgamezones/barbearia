# Tasks

> Pré-requisito: grupos 1–6 da change `add-barbershop-booking` implementados (app, banco, fluxo de agendamento, painel e PWA).

## 1. Preparação do app para container

- [x] 1.1 Configurar `output: 'standalone'` no `next.config` e verificar que `npm run build` gera `.next/standalone/server.js`
- [x] 1.2 Criar proxy `app/supabase/[...path]/route.ts` (todos os métodos, headers e corpo em streaming, `SUPABASE_INTERNAL_URL` lida em runtime) e verificar com teste que `GET /supabase/rest/v1/services` retorna os serviços
- [x] 1.3 Ajustar `lib/supabase/browser.ts` para `${location.origin}/supabase` com anon key vinda do layout, e `cookieOptions.name = 'sb-barbearia-auth'` nos clientes browser e server; verificar que login do painel mantém a sessão entre navegador e Server Components
- [x] 1.4 Criar `/api/health` (200 com banco ok, 503 sem banco) e verificar com teste das duas respostas
- [x] 1.5 Adaptador de e-mail `EMAIL_TRANSPORT=resend|smtp` (nodemailer para smtp) e verificar com teste unitário que cada transporte é escolhido corretamente

## 2. Supabase local

- [x] 2.1 Adicionar `supabase` como devDependency, fixar `project_id = "barbearia"` em `supabase/config.toml` e verificar que `npx supabase start` sobe e cria a rede `supabase_network_barbearia`
- [x] 2.2 Adicionar ao `seed.sql` o admin local de teste (`admin@barbearia.local`) em `auth.users` + `admins`; verificar com `npx supabase db reset` e login no painel
- [x] 2.3 Atualizar `.env.example` com as variáveis do ambiente Docker (`SUPABASE_INTERNAL_URL`, anon/service keys locais, `EMAIL_TRANSPORT=smtp`, `SMTP_HOST/PORT`, VAPID de teste, `CRON_SECRET`) e verificar que copiar para `.env` basta para subir

## 3. Docker do app e orquestração

- [x] 3.1 Criar `Dockerfile` multi-stage (node:22-alpine, usuário uid 1001) e `.dockerignore`; verificar com `docker build` e `docker run --rm <img> id -u` retornando 1001 e ausência de `.env` na imagem (`docker run --rm <img> ls -a`)
- [x] 3.2 Criar `docker-compose.yml` com serviço `app` (env_file, healthcheck em `/api/health`, portas 3000/9323, rede externa do Supabase); verificar com `docker compose up -d --wait app` e status `healthy`
- [x] 3.3 Criar `.gitattributes` (LF para Dockerfile e scripts) e scripts npm `docker:up`, `docker:down`, `docker:reset` (Node em `scripts/` quando necessário); verificar no PowerShell e no Git Bash que `docker:up` deixa http://localhost:3000 e http://localhost:54323 acessíveis, `docker:reset` zera agendamentos e `docker:down` derruba tudo
- [x] 3.4 Verificar e-mail local: criar agendamento com e-mail no site em Docker e confirmar a mensagem na caixa de teste http://localhost:54324
- [x] 3.5 Documentar no README a seção "Rodando com Docker" (requisitos, ~6 GB RAM, comandos, URLs, admin local); verificar executando os passos numa cópia limpa do repositório

## 4. Simulação Android e iOS

- [x] 4.1 Fixar versão exata de `@playwright/test`, criar `e2e/mobile/playwright.config.ts` com os projetos `android-pixel-7`, `android-galaxy-s9`, `ios-iphone-15`, `ios-iphone-se` (pt-BR, America/Sao_Paulo, serviceWorkers allow, vídeo/trace em falha, reporter html em `e2e/results/report`) e `e2e/results/` no `.gitignore`; verificar com `npx playwright test --list` mostrando os 4 projetos
- [x] 4.2 Adicionar serviço `mobile` (perfil `mobile`, imagem Playwright na mesma versão, `network_mode: service:app`, `ipc: host`, volumes de `e2e/`) e checagem de versão imagem × pacote; verificar com um teste trivial passando nos 4 projetos
- [x] 4.3 Helpers de dados por aparelho (telefone/e-mail por índice do projeto, slot `índice * 4` do primeiro dia aberto) e verificar com execução paralela dos 4 projetos sem conflito
- [x] 4.4 Cenário home + serviços (sem rolagem horizontal, screenshot página inteira anexada); verificar passando nos 4 aparelhos
- [x] 4.5 Cenário agendamento completo por toque (Corte + Barba → data → horário → dados → confirmação) + link de gerenciamento + cancelamento, com screenshots de cada etapa; verificar passando nos 4 aparelhos
- [x] 4.6 Cenário offline (home exibida offline, aviso de conexão na etapa de horários); verificar passando nos 4 aparelhos
- [x] 4.7 Cenário painel (login admin local, agenda do dia mostrando os agendamentos criados); verificar passando nos 4 aparelhos
- [x] 4.8 Verificações de PWA: Android (manifest válido, SW ativo controlando a página) e iOS (apple-touch-icon, `apple-mobile-web-app-title`/status bar, dica de instalação dispensável); verificar passando nos respectivos perfis
- [x] 4.9 Scripts `docker:mobile`, `docker:mobile:android`, `docker:mobile:ios`, `docker:mobile:ui` e `docker:report`; verificar código de saída 0 com tudo passando e ≠ 0 forçando uma falha, e o modo UI abrindo em http://localhost:9323
- [x] 4.10 Documentar no README a seção "Simulação Android e iOS" (comandos, como ler o relatório, o que a emulação cobre e não cobre); verificar que as limitações também aparecem como anotação no relatório HTML

## 5. Execução final

- [x] 5.1 Rodar o fluxo completo do zero: `npm run docker:up` → `npm run docker:mobile` → `npm run docker:report`; verificar os 4 aparelhos verdes no relatório com screenshots de home, serviços, agendamento, cancelamento e painel, e então `npm run docker:down`

## Workflow follow-up

- Arquivar a change (`/opsx:archive`) depois de `add-barbershop-booking` e após revisão.
