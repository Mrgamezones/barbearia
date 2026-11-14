# Proposal

## Why

O responsável vai publicar o site no Netlify. Hoje o projeto só está preparado para rodar localmente (Docker) e tem uma configuração pensada para a Vercel (`vercel.json`): não há `netlify.toml`, o `npm run build` falha no Next 16 (o build padrão usa Turbopack e o plugin do PWA, `@serwist/next`, injeta configuração de webpack), o banco de produção não recebe os dados iniciais obrigatórios (a linha `business_settings` id 1 só existe no seed) e o disparo dos lembretes a cada 15 minutos depende do Vercel Cron.

## What Changes

- Build de produção que funciona fora do Docker: `npm run build` passa a usar webpack (`next build --webpack`), mantendo o service worker do PWA.
- `netlify.toml` na raiz com comando de build, versão do Node e cabeçalhos do service worker (`/sw.js` sem cache longo).
- Disparo dos lembretes no Netlify: recomendação de usar o agendamento no próprio Supabase (`pg_cron` + `pg_net`, já documentado em `supabase/cron-reminders.example.sql`), apontando para a URL do Netlify; função agendada do Netlify fica como alternativa documentada.
- Dados iniciais de produção sem dados de teste: arquivo SQL de configuração inicial (nome da barbearia, horários e serviços de partida, sem o admin `admin@barbearia.local`), para rodar uma vez no projeto Supabase de produção.
- Guia `docs/deploy-netlify.md` com o passo a passo: criar o projeto no Supabase, aplicar migrações, configurar Auth (Site URL e Redirect URLs), criar o admin com `scripts/create-admin.mjs`, cadastrar as variáveis no Netlify, gerar chaves VAPID e `CRON_SECRET`, ligar o agendamento dos lembretes e conferir o site publicado.
- Lista do que o responsável precisa fornecer (contas, domínio, dados da barbearia, chaves de e-mail/WhatsApp opcionais).
- README: seção "Deploy no Netlify" apontando para o guia; o texto atual sobre Vercel continua como alternativa.

Fora do escopo: migrar `middleware.ts` para `proxy.ts` (aviso de depreciação do Next 16, não impede o deploy), CI/CD de deploy automático pelo GitHub Actions, multi-barbearia.

## Capabilities

### New Capabilities
- `netlify-deployment`: publicação do site no Netlify com Supabase de produção — build, variáveis de ambiente, dados iniciais sem dados de teste, disparo periódico dos lembretes e verificação pós-deploy.

### Modified Capabilities
<!-- Nenhuma: o ambiente Docker local (container-runtime) não muda de comportamento. -->

## Impact

- `package.json` (script `build`; `@serwist/next` alinhado à versão 9 que o `app/sw.ts` já usa), três server actions do painel e `lib/notifications/email.ts` (ajustes de tipo do Next 16 e do nodemailer 8, sem mudança de comportamento), `netlify.toml` (novo), `supabase/production-setup.example.sql` (novo), `docs/deploy-netlify.md` (novo), `README.md`.
- `Dockerfile` usa `npm run build`: passa a buildar com webpack também, o que é o comportamento esperado do plugin do PWA.
- Serviços externos: conta Netlify, projeto Supabase (plano gratuito atende), opcionalmente Resend (e-mail) e Meta (WhatsApp).
- Sem mudança de banco (migrações existentes) nem de código de páginas.
