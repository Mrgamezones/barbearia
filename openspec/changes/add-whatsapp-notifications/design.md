# Design

## Context

- Os envios de hoje ficam em `lib/notifications/`. `after-booking.ts` manda o e-mail de confirmação logo depois de `create_booking`/`admin_create_booking`. `dispatch.ts` consome a fila `reminders` (canais `push` e `email`) pelo cron `app/api/cron/reminders`, usando `claim_due_reminders` (com SKIP LOCKED e `sent_at`) e `release_reminder` em caso de falha temporária. Cada tentativa é registrada em `notification_log`.
- O e-mail já tem um modo de simulação (sem `RESEND_API_KEY`, registra `dry_run`), e o WhatsApp vai seguir o mesmo padrão.
- O telefone já chega normalizado em E.164 (`+55DDNNNNNNNNN`, com constraint `appointments_phone_e164`).
- O barbeiro cancela pelo `updateAppointmentStatus` (`app/admin/(painel)/actions.ts`), que hoje faz um `update` simples e não sabe qual era o status anterior. O cliente cancela por `cancel_booking_by_token`, que retorna só `{ ok }`.
- A Cloud API da Meta só permite que a empresa inicie uma conversa com um **modelo de mensagem aprovado**. Texto livre só é aceito dentro da janela de 24 h depois que o cliente escreve. Todas as mensagens desta change são iniciadas pela barbearia, então todas usam modelos.

## Goals / Non-Goals

**Goals:**
- Um único cliente HTTP do WhatsApp, testável com `fetch` mockado, que classifica o resultado em `sent`, `dry_run`, `temporary` ou `permanent`.
- Reaproveitar a fila de lembretes existente: o WhatsApp entra como mais um canal, sem criar um segundo agendador.
- Garantir que cada aviso de cancelamento seja enviado uma só vez, inclusive se o barbeiro clicar duas vezes ou houver corrida.

**Non-Goals:**
- Webhook da Meta (status de entrega e leitura, mensagens recebidas).
- Fila de reenvio para confirmação ou cancelamento: essas mensagens têm uma única tentativa, registrada no log.
- Tela no painel para ver o `notification_log`.

## Decisions

### 1. Cloud API por `fetch`, sem SDK
`POST https://graph.facebook.com/{WHATSAPP_API_VERSION}/{WHATSAPP_PHONE_NUMBER_ID}/messages` com `Authorization: Bearer {WHATSAPP_TOKEN}` e corpo `{ messaging_product: "whatsapp", to, type: "template", template: { name, language: { code }, components: [{ type: "body", parameters }] } }`. O `to` é o E.164 sem o `+`. Há timeout de 8 s (`AbortSignal.timeout`) para não travar o agendamento.
- *Alternativa*: SDKs da comunidade. Foi descartada porque não são oficiais e acrescentariam uma dependência para uma única chamada HTTP.

### 2. Modelos de mensagem (categoria Utilidade, idioma `pt_BR`)
| Nome | Variáveis do corpo |
|---|---|
| `agendamento_confirmado` | {{1}} primeiro nome, {{2}} barbearia, {{3}} data por extenso, {{4}} hora, {{5}} serviços, {{6}} total, {{7}} endereço, {{8}} link de gerenciamento |
| `agendamento_cancelado_barbearia` | {{1}} nome, {{2}} barbearia, {{3}} data, {{4}} hora, {{5}} link para agendar |
| `agendamento_cancelado_cliente` | {{1}} nome, {{2}} data, {{3}} hora, {{4}} link para agendar |
| `lembrete_agendamento` | {{1}} nome, {{2}} "amanhã" / "daqui a 2 horas", {{3}} hora, {{4}} barbearia, {{5}} serviços |

Os montadores de parâmetros ficam em `templates.ts`, ao lado dos de e-mail, e reaproveitam `formatDateLong`, `formatTime` e `formatPrice`. Nenhuma variável pode ser vazia, porque a Meta rejeita. Endereço em branco vira "—". O texto sugerido de cada modelo fica em `docs/whatsapp-templates.md`, para cadastrar no Meta Business Manager. Os nomes são fixos no código, e só o idioma é configurável.
- *Alternativa*: um único modelo genérico com o texto pronto. Foi descartada porque a Meta reprova modelos com variáveis que são o corpo inteiro.

### 3. Classificação de erros
- Sem `WHATSAPP_TOKEN` ou `WHATSAPP_PHONE_NUMBER_ID` → `dry_run`, com log `[whatsapp:dry-run] para=…8888 modelo=…`.
- HTTP 2xx → `sent`, guardando `messages[0].id` (wamid) em `detail`.
- HTTP 429, 5xx, erro de rede/timeout ou código Meta de limite (`130429`, `131048`, `131056`, `80007`) → `temporary`.
- Demais erros, como `131026` (número não pode receber), `132xxx` (modelo inexistente ou parâmetros errados) e 401/403 → `permanent`, com `código: mensagem` em `detail`.

No `dispatch.ts`, `temporary` vira `failed` e chama `release_reminder`, como já acontece com o e-mail. `permanent` vira `undeliverable` e **não** volta para a fila, para não repetir o erro a cada execução do cron.

### 4. Consentimento em `appointments.whatsapp_opt_in`
Coluna `boolean not null default false`, então os agendamentos antigos ficam sem envio. `create_booking`/`admin_create_booking` (e `_create_booking`) ganham `p_whatsapp_opt_in boolean default false` no fim da assinatura, então quem chama sem o parâmetro continua funcionando. O `bookingSchema` ganha `whatsappOptIn: z.boolean().default(true)`, e os formulários `BookingFlow` e `ManualBookingForm` mostram um checkbox marcado por padrão. No painel, o texto é "Cliente aceitou receber mensagens no WhatsApp". Como a assinatura muda, é preciso fazer `drop function` das versões antigas e conceder `grant` de novo.
- *Alternativa*: sem checkbox, só um aviso no formulário. Foi descartada porque a Meta exige opt-in e porque a LGPD favorece uma escolha explícita.

### 5. Lembretes: novo valor `whatsapp` no enum `reminder_channel`
O `alter type … add value 'whatsapp'` fica numa migration **separada e anterior**, porque o Postgres não permite usar um valor novo de enum na mesma transação em que ele foi criado. Na migration seguinte:
- a trigger `schedule_email_reminders_trg` vira `schedule_reminders_trg`, que agenda `email` quando há e-mail e `whatsapp` quando `whatsapp_opt_in`;
- `claim_due_reminders` é recriada (com `drop` + `create`, porque o tipo de retorno muda) passando a retornar `customer_phone` e `whatsapp_opt_in`.

O `dispatch.ts` ganha `sendWhatsApp` em `Senders` e o ramo `channel === "whatsapp"`. O cron injeta o sender real.

### 6. Envio imediato da confirmação e dos cancelamentos
- **Confirmação**: `afterBookingCreated` envia e-mail e WhatsApp em paralelo (`Promise.allSettled`), cada um com seu registro no log. A função continua engolindo erros.
- **Cancelamento pelo cliente**: `cancel_booking_by_token` passa a retornar `appointment_id` quando `ok`. A action `cancelBooking` chama `afterBookingCancelled(id, "client")`.
- **Cancelamento pelo barbeiro**: quando o status pedido é `cancelled`, `updateAppointmentStatus` primeiro tenta `update … where id = ? and status = 'confirmed' returning id`. Se uma linha voltar, houve a transição confirmado → cancelado e a action chama `afterBookingCancelled(id, "admin")`. Se nenhuma linha voltar, faz o `update` comum, sem aviso. Isso evita ler e depois gravar em dois passos, o que abriria espaço para corrida.
- *Alternativa*: trigger no banco com `pg_net` chamando a aplicação. Foi descartada porque complica o ambiente local e a depuração, e o volume não justifica.

### 7. Aviso de cancelamento único por reserva no log
Índice único parcial: `notification_log (appointment_id, channel, kind) where kind in ('cancelled_admin','cancelled_client')`. `afterBookingCancelled` primeiro **insere** a linha com `status = 'pending'`, usando `on conflict do nothing` via RPC `claim_notification`. Se não conseguir inserir, já houve aviso e o envio é ignorado. Se conseguir, envia e atualiza `status`/`detail`. Isso atende ao cenário "cancelar, reativar e cancelar de novo". O e-mail de cancelamento não existe hoje e continua fora do escopo.

### 8. Privacidade nos logs
Um helper `maskPhone("+5511999998888") → "…8888"` é usado em todo `console.*` do módulo. O `notification_log` guarda só o wamid ou o código do erro, nunca o número. A página `/privacidade` ganha um parágrafo sobre o uso do WhatsApp.

### 9. Configuração
Novas variáveis em `.env.example` (seção WhatsApp, vazias): `WHATSAPP_TOKEN` (token permanente de usuário do sistema), `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_API_VERSION=v23.0` e `WHATSAPP_TEMPLATE_LANG=pt_BR`. Elas são lidas em tempo de execução, sem `NEXT_PUBLIC_`.

## Risks / Trade-offs

- [Modelos reprovados ou ainda em análise na Meta] → até a aprovação, os envios retornam erro `132xxx` (permanente) e ficam registrados. O agendamento segue normal, e e-mail e push continuam funcionando.
- [Números antigos sem o 9º dígito, ou divergência com o `wa_id`] → a Cloud API aceita o número com 9 dígitos na grande maioria dos casos. Os erros `131026` ficam no log para análise, sem reenvio.
- [O envio síncrono deixa a confirmação do agendamento mais lenta] → timeout de 8 s, e os envios de e-mail e WhatsApp correm em paralelo. Se ficar lento na prática, dá para trocar por `after()` do Next sem mudar o comportamento descrito na spec.
- [Custo por conversa] → as mensagens de utilidade são cobradas por conversa depois da cota gratuita. São no máximo 4 por agendamento (confirmação, 2 lembretes, cancelamento). O volume de uma barbearia fica perto da cota.
- [Token vazado] → só no servidor, nunca com `NEXT_PUBLIC_`, e com um token de usuário do sistema restrito ao app do WhatsApp.
- [Checkbox marcado por padrão] → o cliente pode desmarcar, e o texto deixa claro o que será enviado. Se a Meta ou o jurídico exigirem opt-in ativo, basta inverter o padrão, sem mudar a estrutura.

## Migration Plan

1. Aplicar as migrations: primeiro a do enum `whatsapp`, depois a de colunas, RPCs, trigger e índice (`npx supabase db reset` local; `supabase db push` em produção).
2. Publicar o código sem as variáveis do WhatsApp. Tudo roda em `dry_run`, o que permite validar pelos registros do `notification_log`.
3. Na Meta: criar o app e o número de WhatsApp Business, cadastrar os 4 modelos de `docs/whatsapp-templates.md` e aguardar a aprovação.
4. Configurar as variáveis na Vercel e fazer um agendamento de teste com o próprio número.
5. **Rollback**: remover `WHATSAPP_TOKEN` volta tudo para simulação na hora. As migrations são aditivas (coluna com default, novo valor de enum, parâmetro opcional), então o código anterior continua compatível.

## Open Questions

- O texto final dos modelos pode precisar de ajustes pedidos pela Meta na aprovação. Isso muda só `docs/whatsapp-templates.md` e, se a ordem das variáveis mudar, os montadores de parâmetros.
