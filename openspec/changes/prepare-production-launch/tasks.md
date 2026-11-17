# Tasks

## 1. Repositório pronto para publicar

- [x] 1.1 Em `next.config.ts`, trocar para `output: process.env.NETLIFY ? undefined : "standalone"` (decisão 1), com comentário explicando; remover de "Problemas comuns" em `docs/deploy-netlify.md` a linha sobre `output: standalone`; verificar com `NETLIFY=true npm run build` sem gerar `.next/standalone` e com `npm run build` gerando `.next/standalone/server.js`
- [x] 1.2 Commitar o trabalho de `add-multi-shop-tenancy` e desta change, sem `supabase/shops/*.json` reais, e enviar para o GitHub (decisão 4); verificar em GitHub → Actions que o CI da `main` termina verde (lint, tsc, unitários, `supabase test db`, E2E)

## 2. Changes antigas organizadas

- [x] 2.1 Anotar as tasks pendentes das changes antigas sem marcá-las como feitas, conforme a tabela do design:
  - `add-netlify-deploy` 4.1–4.3: "substituída por prepare-production-launch";
  - `add-barbershop-booking` 7.6 e 8.3: "superada por Netlify + pg_cron";
  - 7.5 e 8.2: marcar como feitas só depois de conferir `app/sw.ts`, `e2e/push.spec.ts` e `e2e/admin-journey.spec.ts` no CI verde da task 1.2;
  - `add-whatsapp-notifications` 6.1: marcar como feita com base no CI verde;
  - 6.2: "pendente de conta da Meta, fora do lançamento".

  Verificar que cada task pendente tem a nota e que `openspec validate --all` passa.
- [x] 2.2 Arquivar, na ordem da decisão 2: `add-barbershop-booking`, `add-premium-visual-identity`, `add-whatsapp-notifications` e `add-netlify-deploy`, sincronizando os specs. Verificar que `openspec/specs/` passa a ter `netlify-deployment`, `pwa-shell`, `appointment-booking`, `admin-panel`, `service-catalog`, `appointment-reminders`, `home-page`, `visual-identity` e `whatsapp-notifications`, e que `openspec validate --all --strict` passa (inclusive o delta desta change contra `netlify-deployment`)

## 3. Conta e domínio (com o responsável)

- [ ] 3.1 Escolher e registrar o domínio no registro.br (Open Questions do design); verificar que o domínio aparece como ativo no painel do registro.br
- [x] 3.2 Criar o projeto Supabase de produção em `sa-east-1`, rodar `npx supabase link` e `npx supabase db push` e aplicar `supabase/production-setup.example.sql` (guia, passos 2.1 a 2.3); verificar no SQL Editor que `select slug, is_demo from shops;` retorna só `demonstracao | true` e que `auth.users` está vazia
- [ ] 3.3 Configurar o Auth do Supabase com o domínio (Site URL e Redirect URLs, guia passo 2.5); verificar que as duas URLs aparecem salvas em Authentication → URL Configuration

## 4. Primeiro deploy (com o responsável)

- [ ] 4.1 Gerar as chaves VAPID e o `CRON_SECRET` (guia 3.1), criar o site no Netlify a partir do repositório e cadastrar todas as variáveis obrigatórias antes do primeiro deploy, com `NEXT_PUBLIC_SITE_URL` igual ao domínio (guia 3.2 e 3.3); verificar que o deploy termina sem erro no log do Netlify
- [ ] 4.2 Apontar o domínio para o Netlify (guia passo 5); verificar que `https://DOMINIO/` abre com HTTPS e redireciona para `/barbearia/demonstracao`, e que `https://DOMINIO/sw.js` e `https://DOMINIO/barbearia/demonstracao/manifest.webmanifest` respondem 200
- [ ] 4.3 Ligar os lembretes com `supabase/cron-reminders.example.sql`, usando o domínio e o `CRON_SECRET` (guia passo 4); verificar depois de 15 minutos que `cron.job_run_details` mostra `succeeded` e que `net._http_response` mostra `200`

## 5. Demir Barbershop no ar (com o responsável)

- [ ] 5.1 Concluir a task 7.1 de `add-multi-shop-tenancy` (dados reais da Demir) e cadastrar em produção com `node --env-file=.env.production.local scripts/create-shop.mjs supabase/shops/demir-barbershop.json`; verificar que `https://DOMINIO/barbearia/demir-barbershop` mostra nome, endereço, horário e os quatro serviços com os preços confirmados
- [ ] 5.2 Entregar ao dono o endereço do site, o do painel e a senha (provisória, se gerada pelo script); verificar que o dono consegue entrar em `https://DOMINIO/painel` e cai em `/painel/demir-barbershop`

## 6. Conferência e fechamento

- [ ] 6.1 Atualizar o checklist do guia (`docs/deploy-netlify.md`, seção 6) para os cenários do spec "Verificação pós-deploy" e segui-lo no celular de ponta a ponta no site publicado: raiz → demonstração, agendamento na Demir, link com o domínio, cancelamento pelo link, login do dono, acesso negado na demonstração, `admin@barbearia.local` recusado, `/barbearia/barbearia-teste` 404, instalação como app, cron 401 sem segredo e 200 com segredo; verificar que todos os itens passam e que o agendamento de teste terminou cancelado
- [ ] 6.2 Arquivar `add-multi-shop-tenancy` com os specs sincronizados; verificar que `openspec/specs/` tem `shop-tenancy` e `shop-provisioning`

## Workflow follow-up

- Arquivar esta change depois da conferência do grupo 6.
- Abrir a change `update-specs-for-multi-shop` para atualizar as rotas antigas nos specs principais de agendamento, painel e PWA (decisão 3).
- Antes de cobrar das barbearias: Supabase no plano Pro (sem pausa) e, se quiser mensagens de verdade, Resend (e-mail) e Meta (WhatsApp), conforme `docs/whatsapp-templates.md`.
