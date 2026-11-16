# Tasks

## 1. Banco: barbearias e isolamento

- [x] 1.1 Criar migration `supabase/migrations/<data>_multi_shop.sql` com `shops` (slug com check `^[a-z0-9]+(-[a-z0-9]+)*$` e 3–40 caracteres, campos de `business_settings`, endereço estruturado, `timezone`, `notifications_enabled`, `is_demo`, `active`) e `shop_id` em `services`, `business_hours` (PK `(shop_id, weekday)`), `schedule_blocks` e `appointments`; remover `business_settings` (decisões 1 e 10); verificar com `npx supabase db reset` sem erros
- [x] 1.2 Trocar `appointments_no_overlap` pela exclusão com `shop_id with =` (decisão 2); verificar com teste em `supabase/tests` que o mesmo horário em duas barbearias é aceito e que, na mesma barbearia, ele é recusado
- [x] 1.3 Substituir `admins`/`is_admin()` por `shop_admins`/`is_shop_admin(p_shop_id)` e `my_shops()`, e reescrever todas as políticas RLS por `shop_id` (decisão 3); verificar com novo `supabase/tests/09_multi_shop_rls.test.sql`: duas barbearias e dois donos, e cada tabela testada em ler, inserir, alterar e apagar como o dono da outra barbearia, tudo recusado ou vazio
- [x] 1.4 Reescrever as RPCs públicas com `p_shop_slug` e as do painel com `p_shop_id` + `is_shop_admin`, incluindo `shop_tz`, janela de agendamento, token restrito à barbearia, `shop_not_found` e chave de rate limit com o slug (decisão 4); verificar com testes de banco cobrindo cada RPC nas duas barbearias, incluindo token da barbearia A recusado na B
- [x] 1.5 Ajustar o trigger de lembretes e `claim_due_reminders` para respeitar `notifications_enabled` (decisão 8); verificar com teste de banco que um agendamento na demonstração não gera lembretes
- [x] 1.6 Criar a RPC `provision_shop(jsonb)` (só `service_role`, transação única) para barbearia, horários, serviços e vínculo do dono (decisão 11); verificar com testes de banco: cadastro completo, slug repetido recusado sem alteração e serviço inválido sem nada gravado
- [x] 1.7 Reescrever `supabase/seed.sql` com a barbearia `demonstracao` ("Barbearia Modelo", `is_demo`, notificações desligadas, mesmos IDs de serviços), mais uma segunda barbearia de teste e o admin local vinculado às duas; atualizar `01`–`08` em `supabase/tests` para o novo esquema; verificar com `npx supabase test db` passando

## 2. Dados e formatação no app

- [x] 2.1 Atualizar `lib/types.ts` (`Shop` no lugar de `BusinessSettings`) e `lib/data/public.ts` com `getShop(slug)`, serviços e horários por slug, chaves `[nome, slug]` e tags `shop:<slug>` (decisão 6); verificar com `npx tsc --noEmit` e testes unitários dos loaders com o Supabase simulado
- [x] 2.2 Em `lib/hours.ts`, horas sem zero à esquerda; criar `formatAddress` em `lib/format.ts` (decisão 10); verificar com `lib/hours.test.ts` atualizado ("TER–SÁB: 9h às 19h", "12h30") e testes novos de `formatAddress` com endereço completo e com só logradouro e número ("Rua Abaré, 2")

## 3. Site público por barbearia

- [x] 3.1 Mover `app/(public)/*` para `app/barbearia/[slug]/*` (início, agendar, serviços, privacidade, agendamento/[token], estilo), com layout que chama `getShop` e responde `notFound()`; ajustar as Server Actions para enviar o slug às RPCs; verificar com `npm run build` e com `/barbearia/nao-existe` respondendo 404
- [x] 3.2 Trocar todos os links internos fixos (`SiteHeader`, `SiteFooter`, `BookingFlow`, `EnableReminderButton`, `CancelBookingButton`, `not-found`) por caminhos com o slug; verificar com busca sem resultados por `"/agendar"`, `"/servicos"`, `"/privacidade"` e `"/agendamento"` fora de `app/barbearia`
- [x] 3.3 Criar `app/page.tsx` com redirecionamento para `/barbearia/demonstracao` e remover as rotas antigas; verificar com `curl -I http://localhost:3000/` mostrando o redirecionamento
- [x] 3.4 Atualizar o E2E público (`home`, `booking-flow`, `booking-api`, `public-pages`, `privacy`, `visual`, `visual-identity`, `e2e/helpers/*`, `e2e/mobile/*`) para as novas rotas e incluir os testes "mesmo horário em barbearias diferentes" e "token de outra barbearia"; verificar com os projetos `desktop` e `mobile` passando

## 4. Painel por barbearia

- [x] 4.1 Mover `app/admin/(painel)/*` para `app/painel/[slug]/*` e o login para `app/painel/login`; criar `app/painel/page.tsx` (redireciona com uma barbearia, lista com várias); `lib/admin/auth.ts` passa a exigir `is_shop_admin` da barbearia da URL e mostra "acesso negado" nos outros casos; verificar com `npm run build`
- [x] 4.2 Atualizar `middleware.ts` para proteger `/painel/:path*`, exceto `/painel/login`, preservando `next`; ajustar `AdminNav`, as actions (`revalidateTag("shop:<slug>")`) e os formulários (`SettingsForm` com endereço estruturado); verificar com testes unitários dos formulários atualizados
- [x] 4.3 Atualizar `scripts/create-admin.mjs` para receber o slug e gravar em `shop_admins`; verificar criando um admin local para `demonstracao` e entrando no painel
- [x] 4.4 Atualizar o E2E do painel (`admin`, `admin-journey`, `admin-visual`, `e2e/helpers/admin.ts`, `e2e/mobile/panel.spec.ts`) e incluir os testes "sem login volta ao painel certo", "painel de outra barbearia: acesso negado" e "`/painel` com várias barbearias lista as duas"; verificar com o projeto `admin` passando

## 5. Notificações e PWA

- [x] 5.1 Atualizar `lib/notifications/after-booking.ts`, `after-cancel.ts` e `dispatch.ts` para ler `shops`, montar links com o slug e pular o envio quando `notifications_enabled` for falso (decisão 8); verificar com os testes unitários de notificações atualizados, incluindo o caso da demonstração sem envio
- [x] 5.2 Criar `app/barbearia/[slug]/manifest.webmanifest/route.ts` com `id`, `start_url` e `scope` da barbearia, apontar o `<link rel="manifest">` no layout da barbearia, remover `app/manifest.ts` e ajustar as rotas de `app/sw.ts` (decisão 7); verificar com `e2e/pwa.spec.ts` e `e2e/push.spec.ts` atualizados passando
- [x] 5.3 Ajustar `e2e/reminders.spec.ts` e o teste do cron para a nova estrutura; verificar com o teste passando e um lembrete gerado na barbearia de teste com o link `/barbearia/<slug>/agendamento/...`

## 6. Cadastro por script

- [x] 6.1 Criar `scripts/create-shop.mjs <arquivo.json>` com validação zod, criação ou reuso do usuário do dono, chamada a `provision_shop` e remoção do usuário recém-criado em caso de falha (decisão 11); verificar cadastrando uma barbearia de exemplo no banco local e vendo `/barbearia/<slug>` e `/painel/<slug>` funcionando
- [x] 6.2 Adicionar ao `.gitignore` a regra `supabase/shops/*.json` com exceção `!supabase/shops/*.example.json`, e criar `supabase/shops/demir-barbershop.example.json` com os dados conhecidos e os provisórios do design (Open Questions); verificar que `git status` mostra o exemplo e ignora uma cópia `demir-barbershop.json`
- [x] 6.3 Documentar no README e em `docs/deploy-netlify.md` como cadastrar uma barbearia (produção e local), a regra de que o slug não muda, a limpeza da demonstração e o domínio único; atualizar `supabase/production-setup.example.sql` para criar só a demonstração; verificar que cada comando citado existe e roda como escrito

## 7. Demir Barbershop

- [ ] 7.1 Com o responsável: confirmar dias de atendimento, pausa, duração dos serviços, bairro, cidade, UF, CEP, WhatsApp, Instagram, nome e foto do barbeiro e e-mail do dono; criar `supabase/shops/demir-barbershop.json` (não versionado) a partir do exemplo; verificar que o script aceita o arquivo no banco local
- [x] 7.2 Cadastrar no banco local e conferir `/barbearia/demir-barbershop`: "Rua Abaré, 2" no formato da decisão 10, "8h às 19h", Corte de cabelo R$ 30,00, Barba R$ 20,00, Sobrancelha R$ 10,00 e Corte, barba e sobrancelha R$ 40,00; verificar também o login do dono em `/painel/demir-barbershop` e o acesso negado em `/painel/demonstracao`

## 8. Verificação final

- [x] 8.1 Rodar `npx tsc --noEmit`, `npm run lint`, `npm test`, `npx supabase test db`, `npm run build` e `npm run test:e2e`; verificar que tudo passa

## Workflow follow-up

- Ao arquivar `add-barbershop-booking`, `add-premium-visual-identity`, `add-whatsapp-notifications` e `add-netlify-deploy`, revisar os cenários que citam `/agendar`, `/admin` e `business_settings` (decisão 9).
- Depois do primeiro deploy: comprar o domínio, configurá-lo no Netlify e cadastrar a Demir Barbershop em produção com `scripts/create-shop.mjs`.
