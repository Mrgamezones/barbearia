# Tasks

## 1. Banco de dados

- [x] 1.1 Criar a migration `supabase/migrations/20261112000100_whatsapp_channel.sql` só com `alter type public.reminder_channel add value if not exists 'whatsapp'`; verificar com `npx supabase db reset` sem erro e `select unnest(enum_range(null::public.reminder_channel))` listando `whatsapp`
- [x] 1.2 Criar a migration `20261112000200_whatsapp_notifications.sql` com a coluna `appointments.whatsapp_opt_in boolean not null default false` e o parâmetro `p_whatsapp_opt_in boolean default false` em `_create_booking`, `create_booking` e `admin_create_booking` (com `drop` das assinaturas antigas e os mesmos `grant`/`revoke` de antes); verificar com teste pgTAP em `supabase/tests/08_whatsapp.test.sql` que a chamada sem o parâmetro grava `false` e com `true` grava `true`, e que `anon` continua sem `execute` em `create_booking`
- [x] 1.3 Na mesma migration, trocar a trigger de lembretes por `schedule_reminders_trg`, que agenda `email` quando há e-mail e `whatsapp` quando `whatsapp_opt_in`; verificar no pgTAP que um agendamento com opt-in para daqui a 5 h cria só o lembrete `h2`/`whatsapp`, e um sem opt-in não cria nenhum lembrete de WhatsApp
- [x] 1.4 Recriar `claim_due_reminders` (drop + create, com os mesmos grants) retornando também `customer_phone` e `whatsapp_opt_in`; verificar que `supabase/tests/06_reminders.test.sql` continua passando e que um novo caso no `08` retorna o telefone
- [x] 1.5 Fazer `cancel_booking_by_token` retornar `appointment_id` quando `ok`; verificar no pgTAP que o JSON de sucesso traz o id e que os erros (`not_found`, `too_late`) não mudam
- [x] 1.6 Criar o índice único parcial `notification_log (appointment_id, channel, kind) where kind in ('cancelled_admin','cancelled_client')` e a RPC `claim_notification(appointment_id, channel, kind)`, só para `service_role`, que insere `status='pending'` com `on conflict do nothing` e retorna o id ou null; verificar no pgTAP que a segunda chamada retorna null e que `anon`/`authenticated` não podem executá-la

## 2. Cliente do WhatsApp e mensagens

- [x] 2.1 Implementar `lib/notifications/whatsapp.ts` com `sendWhatsAppTemplate({ to, template, params })`: `fetch` à Graph API, timeout de 8 s, `to` sem `+`, simulação sem credenciais, classificação `sent`/`dry_run`/`temporary`/`permanent` conforme o design (Decisão 3) e `maskPhone`; verificar com `lib/notifications/whatsapp.test.ts` (fetch mockado) cobrindo dry-run, sucesso com wamid, 429, 500, timeout, `131026`, `132001` e que nenhum `console.*` contém o número completo
- [x] 2.2 Adicionar a `lib/notifications/templates.ts` os montadores de parâmetros dos 4 modelos (`agendamento_confirmado`, `agendamento_cancelado_barbearia`, `agendamento_cancelado_cliente`, `lembrete_agendamento`), sem variáveis vazias; verificar com testes em `templates.test.ts` (ex.: "sexta-feira, 22 de maio de 2026", "14:00", "R$ 60,00", endereço vazio → "—", "amanhã" e "daqui a 2 horas")
- [x] 2.3 Escrever `docs/whatsapp-templates.md` com o texto sugerido de cada modelo (categoria Utilidade, `pt_BR`, variáveis na ordem dos montadores) e o passo a passo de configuração na Meta; adicionar a seção WhatsApp ao `.env.example` (`WHATSAPP_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_API_VERSION=v23.0`, `WHATSAPP_TEMPLATE_LANG=pt_BR`) e ao `README.md`; verificar que a quantidade e a ordem das variáveis no documento batem com os testes da 2.2

## 3. Consentimento nos formulários

- [x] 3.1 Adicionar `whatsappOptIn: z.boolean().default(true)` ao `bookingSchema` e repassar `p_whatsapp_opt_in` em `createBooking` e `adminCreateBooking`; verificar com `lib/validation.test.ts` (ausente → `true`, `false` preservado) e com `e2e/booking-api.spec.ts` checando a coluna gravada
- [x] 3.2 Adicionar o checkbox "Receber confirmação e lembretes pelo WhatsApp" (marcado por padrão, alvo ≥ 44 px, com label associado) ao `BookingFlow.tsx` e "Cliente aceitou receber mensagens no WhatsApp" ao `ManualBookingForm.tsx`; verificar com `BookingFlow.test.tsx` (marcado por padrão, desmarcar envia `false`) e que o axe em `e2e/booking-flow.spec.ts` continua sem violações
- [x] 3.3 Atualizar `/privacidade` com o uso do WhatsApp e como deixar de receber as mensagens; verificar com uma asserção nova em `e2e/privacy.spec.ts`

## 4. Confirmação e cancelamentos

- [x] 4.1 Fazer `afterBookingCreated` enviar e-mail e WhatsApp em paralelo (`Promise.allSettled`), WhatsApp só com opt-in, registrando `channel='whatsapp', kind='confirmation'` no `notification_log`; verificar com teste unitário (cliente Supabase e senders mockados): com opt-in envia os dois; sem opt-in, só e-mail; WhatsApp falhando não impede o e-mail nem lança erro
- [x] 4.2 Criar `lib/notifications/after-cancel.ts` com `afterBookingCancelled(id, by: "admin" | "client")`: checa o opt-in, chama `claim_notification`, envia o modelo certo com link `${siteUrl()}/agendar` e atualiza `status`/`detail`; verificar com teste unitário: `claim` nulo não envia, sem opt-in não envia, falha grava `failed` sem lançar erro
- [x] 4.3 Em `cancelBooking` (link do cliente), chamar `afterBookingCancelled(appointment_id, "client")` quando `ok`; verificar com E2E em `e2e/booking-flow.spec.ts` (dry-run) que o cancelamento dentro do prazo gera um log `cancelled_client` e que o `too_late` não gera
- [x] 4.4 Em `updateAppointmentStatus`, para `cancelled`, tentar `update … eq('status','confirmed') select('id')` e chamar `afterBookingCancelled(id, "admin")` só se a linha voltar; nos outros casos, manter o `update` comum; verificar com E2E em `e2e/admin.spec.ts`: cancelar gera um log `cancelled_admin`; "concluído" não gera; cancelar, reativar e cancelar de novo mantém um único log; reativação em conflito ainda retorna "Já existe outro agendamento nesse horário."

## 5. Lembretes pelo WhatsApp

- [x] 5.1 Adicionar `sendWhatsApp` a `Senders` e o ramo `channel === "whatsapp"` em `dispatch.ts`: `temporary` → `failed` + `release_reminder`; `permanent` → `undeliverable` sem release; sem opt-in ou sem telefone → `no_target`; verificar com testes unitários do dispatch para os quatro casos e que os ramos de push e e-mail continuam passando
- [x] 5.2 Injetar o sender real do WhatsApp em `app/api/cron/reminders/route.ts`; verificar com `e2e/reminders.spec.ts` (dry-run): um lembrete vencido de WhatsApp é enviado uma vez, a segunda chamada ao cron não o reenvia, e um agendamento cancelado não gera lembrete

## 6. Verificação integrada

- [x] 6.1 Rodar `npm test`, `npx supabase test db`, `npm run lint` e `npm run test:e2e` com tudo passando, e `npx next build --webpack` sem erros — **CI verde em 597dba7**
- [ ] 6.2 Teste manual com credenciais reais da Meta e modelos aprovados: agendar com o próprio número, receber a confirmação, cancelar pelo painel e receber o aviso; conferir no `notification_log` os wamids e que o log da aplicação mostra só os 4 últimos dígitos — **Pendente de conta da Meta, fora do lançamento (follow-up de prepare-production-launch)**

## Workflow follow-up

- Cadastrar os 4 modelos no Meta Business Manager e aguardar a aprovação antes de configurar `WHATSAPP_TOKEN` em produção.
- Arquivar a change depois da revisão (`/opsx:archive`).
