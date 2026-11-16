# Design

## Context

- App Next.js 16.4 (App Router) com PWA via `@serwist/next`, Supabase para banco e login, rotas de servidor (`/api/cron/reminders`, proxy `/supabase/[...path]`, server actions do painel) e `middleware.ts` protegendo `/admin`.
- O Netlify roda Next.js 16 sem configuração pelo adaptador OpenNext (rotas de servidor e middleware viram funções do Netlify). Não é preciso instalar plugin.
- Problemas encontrados no código atual:
  1. `npm run build` = `next build`. No Next 16 o build usa Turbopack por padrão e falha quando existe configuração de webpack; o `@serwist/next` injeta uma (o mesmo erro já acontece no `npm run dev`). O guia do Next indica `next build --webpack`.
  2. `business_settings` (linha id 1), `business_hours` e `services` só são criados por `supabase/seed.sql`, que também cria o admin de teste. `supabase db push` não roda o seed, e o painel de configurações faz `update ... where id = 1` — sem a linha, nada salva e a home fica sem nome.
  3. O disparo dos lembretes usa `vercel.json` (Vercel Cron). No Netlify isso não existe.
  4. `next.config.ts` tem `output: "standalone"` para a imagem Docker. O adaptador do Netlify gera a própria saída; manter a opção precisa ser conferido no primeiro deploy.
- Variáveis lidas pelo código (`lib/env.ts`, `lib/notifications/*`, rota do cron): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_SITE_URL`, `BUSINESS_TIMEZONE`, `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`, `CRON_SECRET`, `RESEND_API_KEY`, `EMAIL_FROM`, `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_API_VERSION`, `WHATSAPP_TEMPLATE_LANG`. As `NEXT_PUBLIC_*` entram no build do navegador: precisam estar definidas antes do deploy (escopo "Builds" e "Functions").

## Goals / Non-Goals

**Goals:**
- Primeiro deploy no Netlify funcionando a partir do repositório, com o mínimo de configuração no painel do Netlify.
- Banco de produção pronto sem dados de teste.
- Lembretes de 24 h e 2 h saindo a cada 15 minutos.
- Guia em pt-BR simples o bastante para o responsável repetir em cada barbearia nova.

**Non-Goals:**
- Migrar `middleware.ts` → `proxy.ts` (só aviso de depreciação).
- Deploy automático pelo GitHub Actions (o Netlify já faz deploy a cada push).
- Várias barbearias numa instalação.
- Mudar a Vercel como alternativa: `vercel.json` continua.

## Decisions

### 1. Build com webpack no script `build`
`"build": "next build --webpack"`. Vale para o Netlify (que roda `npm run build`) e para o Dockerfile. Alternativa descartada: migrar o PWA para Turbopack — o `@serwist/next` 8 depende do webpack, e isso seria uma troca de biblioteca fora do escopo. O `dev` não muda nesta change (o README já orienta).

### 1.1 Correções que o build revelou
Com webpack, o build parou em erros que já existiam: (a) `app/sw.ts` importa `@serwist/next/worker`, que só existe no `@serwist/next` 9, mas o `package.json` pedia `^8.4.4` (o `serwist` já estava em 9.5.13) — alinhado para `^9.5.13`; (b) `revalidateTag` no Next 16 exige o segundo argumento — passado `{ expire: 0 }`, que é exatamente o comportamento da chamada sem argumento (sem mudança de comportamento); (c) os tipos do nodemailer 8 não têm o namespace `nodemailer.Transporter` — importado o tipo `Transporter`. Testes, lint e `tsc` passam depois das correções.

### 2. `netlify.toml` mínimo
```toml
[build]
  command = "npm run build"
  publish = ".next"

[build.environment]
  NODE_VERSION = "22"

[[headers]]
  for = "/sw.js"
  [headers.values]
    Cache-Control = "public, max-age=0, must-revalidate"
    Service-Worker-Allowed = "/"
```
Node 22 é o mesmo do CI e do Dockerfile. `SECRETS_SCAN_OMIT_KEYS` libera as quatro `NEXT_PUBLIC_*` (públicas por definição) da varredura de segredos do Netlify, que poderia barrar o build ao achá-las no JavaScript gerado. Sem plugin explícito: o Netlify detecta o Next e aplica o adaptador mais novo (a própria Netlify recomenda não fixar versão). O cabeçalho do `/sw.js` evita que o celular fique preso numa versão antiga do app.

### 3. `output: "standalone"` mantido, conferido no deploy
Remover quebraria a imagem Docker. Se o primeiro deploy reclamar, a saída é ligar a opção só fora do Netlify (`process.env.NETLIFY ? undefined : "standalone"`; o Netlify define `NETLIFY=true` no build). Fica como tarefa de verificação, não como mudança antecipada.

### 4. Lembretes: `pg_cron` no Supabase (recomendado) e função agendada do Netlify (alternativa)
- **Recomendado:** rodar `supabase/cron-reminders.example.sql` no projeto de produção trocando a URL para `https://<site>.netlify.app/api/cron/reminders` e o segredo. Não exige código novo, funciona em qualquer hospedagem, o histórico fica em `cron.job_run_details`. O texto do arquivo passa a citar Netlify e Vercel.
- **Alternativa (documentada, não implementada agora):** função agendada `netlify/functions/reminders.mts` com `schedule: "*/15 * * * *"` que chama a rota com o `CRON_SECRET`. Desvantagens: funções agendadas só rodam em deploy publicado, têm limite de execução curto e somam mais uma peça para manter.
- A rota já aceita GET e POST e recusa sem o header (`timingSafeEqual`), então nada muda nela.

### 5. Configuração inicial de produção em SQL separado
Novo `supabase/production-setup.example.sql` com as mesmas inserções de `business_settings`, `business_hours` e `services` do seed, com `on conflict do nothing`, campos de texto marcados para trocar (nome, endereço, WhatsApp, barbeiro) e **sem** `auth.users`, `auth.identities` e `admins`. Roda uma vez no SQL Editor do projeto de produção. Alternativa descartada: migração com os dados — colocaria dados de uma barbearia específica no histórico do banco de todas. Alternativa descartada: rodar o seed em produção — criaria o admin de teste com senha pública.

### 6. Admin de produção pelo script existente
`node --env-file=.env.production.local scripts/create-admin.mjs <email> <senha>` com `NEXT_PUBLIC_SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` de produção num arquivo local ignorado pelo git (`.env*` já está no `.gitignore`). Nenhuma senha vai para o repositório.

### 7. Banco de produção com a CLI já instalada
`npx supabase login` → `npx supabase link --project-ref <ref>` → `npx supabase db push`. Aplica as 6 migrações de `supabase/migrations`. Extensões `pg_cron` e `pg_net` são ligadas pelo SQL da decisão 4.

### 8. Auth do Supabase
No painel do Supabase (Authentication → URL Configuration): Site URL = `NEXT_PUBLIC_SITE_URL` (domínio do Netlify ou próprio) e Redirect URLs com o mesmo domínio. O login do painel é por e-mail e senha; sem isso, links de e-mail do Auth (troca de senha) apontariam para `localhost`.

### 9. Guia e checklist
`docs/deploy-netlify.md` em pt-BR, com: (a) o que o responsável precisa ter em mãos; (b) passo a passo Supabase → Netlify → lembretes; (c) tabela de variáveis (obrigatória/opcional, onde pegar, efeito se vazia); (d) domínio próprio; (e) checklist pós-deploy; (f) como repetir para outra barbearia (um projeto Supabase + um site Netlify por cliente).

O que o responsável precisa fornecer (vai no topo do guia):
- Conta Netlify e o repositório no GitHub/GitLab (o projeto hoje não é repositório git — precisa `git init` e push).
- Conta Supabase e um projeto por barbearia (região São Paulo, `sa-east-1`).
- Dados da barbearia: nome, endereço, WhatsApp, nome do barbeiro, serviços com preço e duração, horários.
- E-mail e senha do dono para o painel.
- Domínio próprio (opcional) e acesso ao DNS.
- E-mail de envio: conta Resend + domínio verificado (opcional; sem ela os e-mails só vão para o log).
- WhatsApp: token e ID do número da Meta (opcional; sem eles as mensagens ficam em modo de teste).

## Risks / Trade-offs

- [Build com webpack fica mais lento que Turbopack] → aceitável; é o caminho que o Next documenta para quem tem config de webpack.
- [Adaptador do Netlify e `output: "standalone"`] → decisão 3; conferido no primeiro deploy.
- [Proxy `/supabase/*` passa por função do Netlify, somando latência e uso de invocações] → o plano gratuito comporta o volume de uma barbearia; registrar no guia como ponto a observar.
- [Limite de tempo das funções do Netlify menor que o `maxDuration = 60` da rota de lembretes] → o disparo processa poucos lembretes por vez a cada 15 min; o `pg_net` tem timeout de 30 s. Conferir no checklist que a chamada responde 200.
- [Projeto Supabase gratuito pausa após 7 dias sem uso] → o `pg_cron` a cada 15 min mantém atividade no banco; mesmo assim citar no guia que o plano pago evita a pausa.
- [Chave `NEXT_PUBLIC_*` errada só aparece depois do build] → guia manda cadastrar variáveis antes do primeiro deploy e refazer o deploy ao mudar qualquer `NEXT_PUBLIC_*`.
- [VAPID de teste do `.env.example` em produção] → guia manda gerar par novo (`npx web-push generate-vapid-keys`) e `CRON_SECRET` aleatório.

## Migration Plan

1. Aplicar as mudanças de repositório (build, `netlify.toml`, SQL inicial, guia) e rodar `npm run build`, `npm test`, `npm run lint` localmente.
2. Responsável cria Supabase de produção, aplica migrações e SQL inicial, cria o admin.
3. Responsável cria o site no Netlify, cadastra variáveis, faz o primeiro deploy.
4. Liga o `pg_cron` com a URL publicada e segue o checklist.
Rollback: no Netlify, "Publish deploy" de um deploy anterior; no banco, as migrações não mudam nesta change.

## Open Questions

- O repositório vai para GitHub ou GitLab? (o projeto ainda não é git)
- Vai usar domínio próprio já no primeiro deploy ou `*.netlify.app`?
- E-mail (Resend) e WhatsApp entram no primeiro deploy ou depois?
- Qual barbearia é a primeira (dados para o SQL inicial)?
