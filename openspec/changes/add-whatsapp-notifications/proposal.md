# Proposal

## Why

Hoje o cliente só recebe a confirmação e os lembretes do agendamento por e-mail (opcional) e por push (que exige instalar o PWA no iOS). O único dado de contato obrigatório é o WhatsApp, e ele não é usado para nada automático. Por isso muitos clientes ficam sem confirmação, e quando o barbeiro cancela um horário no painel o cliente não fica sabendo. Enviar essas mensagens pelo WhatsApp, o canal que o cliente já informa e usa, reduz faltas e retrabalho de avisar um a um.

## What Changes

- Integração com a **WhatsApp Cloud API oficial da Meta** (mensagens por modelos aprovados), com modo de simulação (dry-run) quando as credenciais não estão configuradas, igual ao e-mail.
- **Confirmação por WhatsApp** logo após o agendamento (pelo site ou pelo painel): data, horário, serviços, total, endereço e link para ver ou cancelar.
- **Aviso de cancelamento pelo barbeiro**: quando o administrador muda o status de um agendamento confirmado para "cancelado", o cliente recebe uma mensagem com o horário cancelado e um link para agendar de novo.
- **Confirmação de cancelamento pelo cliente**: quando o cliente cancela pelo link, recebe a confirmação no WhatsApp.
- **Lembretes de 24 h e 2 h por WhatsApp**, como mais um canal ao lado de push e e-mail, com envio único e sem envio para agendamentos cancelados.
- **Consentimento**: o formulário de agendamento (site e painel) ganha a opção "Receber confirmação e lembretes pelo WhatsApp", marcada por padrão e que o cliente pode desmarcar. Sem consentimento, nenhuma mensagem é enviada.
- Toda tentativa de envio é registrada em `notification_log`. Uma falha no WhatsApp nunca impede o agendamento nem o cancelamento.
- Os envios de cancelamento também passam a ser registrados no log, para auditoria.

Fora do escopo: receber e responder mensagens do cliente (chatbot ou atendimento), webhooks de status de entrega/leitura, mensagens de marketing, reagendamento pelo WhatsApp, e avisos ao barbeiro.

## Capabilities

### New Capabilities
- `whatsapp-notifications`: envio de mensagens transacionais ao cliente pelo WhatsApp (confirmação, cancelamento pelo barbeiro ou pelo cliente, lembretes de 24 h/2 h), consentimento do cliente, regras de envio único, tratamento de falhas e modo de simulação.

### Modified Capabilities
- Nenhuma em `openspec/specs/`. As capabilities `appointment-booking`, `appointment-reminders` e `admin-panel` ainda estão na change `add-barbershop-booking` (não arquivada). Os requisitos novos ficam em `whatsapp-notifications` para não conflitar com elas. O consentimento no formulário e o novo canal de lembrete são descritos ali.

## Impact

- **Banco (nova migration)**: coluna `appointments.whatsapp_opt_in`; valor `whatsapp` no enum `reminder_channel`; `create_booking`/`admin_create_booking` recebem o consentimento; a trigger agenda lembretes de WhatsApp; `claim_due_reminders` passa a retornar o telefone; `cancel_booking_by_token` passa a retornar o id do agendamento.
- **Código**: novo `lib/notifications/whatsapp.ts` (cliente da Graph API); novos montadores de parâmetros de modelo em `lib/notifications/templates.ts`; `after-booking.ts` passa a enviar também por WhatsApp; novo `after-cancel.ts`; `dispatch.ts` ganha o canal `whatsapp`; ajustes em `app/(public)/agendar/actions.ts`, `app/(public)/agendamento/[token]/actions.ts`, `app/admin/(painel)/actions.ts`, `app/admin/(painel)/novo/actions.ts`, `app/api/cron/reminders/route.ts`, `lib/validation.ts`, `BookingFlow.tsx` e `ManualBookingForm.tsx`.
- **Configuração**: novas variáveis `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_API_VERSION` e `WHATSAPP_TEMPLATE_LANG` em `.env.example` e no ambiente da Vercel.
- **Externo**: conta Meta Business, número de WhatsApp dedicado e 4 modelos de mensagem (categoria "Utilidade") aprovados pela Meta antes de ir para produção.
- **Dependências**: nenhuma nova. A chamada HTTP usa `fetch`.
- **Privacidade**: a política de privacidade (`/privacidade`) deve citar o uso do WhatsApp para mensagens do agendamento.
