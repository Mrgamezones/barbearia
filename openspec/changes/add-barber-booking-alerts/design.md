# Design

## Context

- Hoje só o cliente recebe push. A tabela `push_subscriptions` é **por agendamento** (`appointment_id`) e o clique na notificação (`app/sw.ts`) abre o link de gerenciamento guardado em cache. Nada disso serve ao dono, que precisa de inscrição **por barbearia/usuário/aparelho**.
- O envio Web Push já existe: `lib/notifications/push.ts` (`sendPush`, VAPID configurado no Netlify, `urgency: high`, devolve `gone` em 404/410).
- Agendamento pelo site: `app/barbearia/[slug]/agendar/actions.ts` chama `create_booking` e depois `await afterBookingCreated(...)`. Cancelamento pelo cliente: `app/barbearia/[slug]/agendamento/[token]/actions.ts` chama `cancel_booking_by_token` e depois `await afterBookingCancelled(..., "client")`. O painel usa outras actions (`app/painel/[slug]/novo/actions.ts`, `app/painel/[slug]/actions.ts`), então "feito pelo cliente" se distingue pelo ponto de chamada, sem coluna nova.
- `shops.notifications_enabled` já desliga tudo na demonstração.
- O manifesto existe só para `/barbearia/<slug>/` (`app/barbearia/[slug]/manifest.webmanifest/route.ts`); o painel não é instalável. O service worker é único (`/sw.js`, escopo `/`).
- Donos: `shop_admins (shop_id, user_id)` e `is_shop_admin(shop_id)` para RLS.
- iOS: Web Push só existe a partir do 16.4 e só para sites adicionados à Tela de Início, com permissão pedida após gesto do usuário. Cada app da Tela de Início tem cookies próprios (o dono entra de novo). Todo push recebido precisa mostrar uma notificação visível; caso contrário, o Safari revoga a inscrição.

## Goals / Non-Goals

**Goals:**
- Aviso push ao dono em segundos, sem tornar o agendamento do cliente mais lento.
- Agenda aberta atualizada sozinha e com o som escolhido, tenha ou não ativado o push.
- Painel instalável no iPhone para que os avisos funcionem lá.

**Non-Goals:**
- Supabase Realtime (websocket) para a agenda: a consulta periódica atende "até 1 minuto" sem configurar publicação/realtime em produção.
- Escolha de toque sincronizada entre aparelhos: o toque é do aparelho, como o toque de um celular.
- Rever a experiência iOS do cliente além do roteiro de conferência (tarefa de teste, não de código).

## Decisions

1. **Tabela `admin_push_subscriptions` separada** (`id, shop_id, user_id, endpoint, p256dh, auth, user_agent, created_at`, `unique (shop_id, endpoint)`). Com RLS, o dono só lê, insere e apaga linhas com `user_id = auth.uid()` e `is_shop_admin(shop_id)`. Inscrever e desinscrever são server actions do painel com o cliente autenticado; o envio usa o cliente admin.
   *Alternativa:* reaproveitar `push_subscriptions` com `appointment_id` nulo. Foi descartada porque misturaria clientes e donos, as regras de cascata e as RPCs públicas de inscrição.

2. **Tabela `shop_alerts`** (`id bigint identity, shop_id, kind ('booked'|'cancelled_by_client'), appointment_id, created_at`), gravada no servidor nos dois pontos de chamada, inclusive na demonstração. O dono lê pela RLS (`is_shop_admin`). Ela é a fonte única para:
   - o push (o payload leva `alertId`);
   - a consulta periódica do painel ("há alertas com id maior que o último visto?");
   - evitar tocar o som duas vezes quando o push e a consulta trazem o mesmo alerta.
   *Alternativa:* comparar `updated_at` das consultas. Foi descartada porque não distingue cliente de painel nem agendamento de cancelamento.
   *Alternativa:* gravar dentro das RPCs ou por trigger. Foi descartada porque o trigger não sabe quem cancelou e alterar `create_booking`/`cancel_booking_by_token` é mais arriscado. A gravação fica junto ao envio, depois do sucesso da RPC.

3. **Envio em `lib/notifications/shop-alert.ts`** (`notifyShopAdmins(appointmentId, kind)`): grava o `shop_alerts`; se `notifications_enabled`, lê as inscrições dos donos da barbearia e envia em paralelo com `sendPush`, apagando as que voltarem `gone`; registra falhas no log e nunca lança erro. Nas actions do cliente, ele roda **em paralelo** com `afterBookingCreated`/`afterBookingCancelled` (`Promise.allSettled`), com limite de 5 s por envio.
   *Alternativa:* `after()` do Next. Foi descartada por coerência com o restante do projeto, que hoje aguarda os envios antes de responder, e por não depender do suporte do runtime do Netlify a trabalho depois da resposta.

4. **Payload e service worker.** O payload ganha campos opcionais `url` e `alertId`, e o `tag` vira `alerta-<alertId>`. No `push`, o SW sempre mostra a notificação (exigência do iOS) e faz `postMessage({ type: "shop-alert", alertId })` para as janelas do painel abertas. No `notificationclick`, se houver `data.url`, foca uma janela que já esteja em `/painel/<slug>` navegando para a URL, ou abre uma nova; sem `url`, mantém o comportamento atual dos lembretes do cliente. A URL é `/painel/<slug>?data=YYYY-MM-DD` (parâmetro já aceito pela agenda).

5. **Atualização da agenda: `PanelLiveUpdates`**, um componente cliente no layout do painel. Ele consulta a cada 30 s, só com a página visível, uma server action `latestAlertId(slug)`. Também consulta imediatamente ao voltar a ficar visível (`visibilitychange`) e ao receber a mensagem do SW. Se o id for maior que o último visto, chama `router.refresh()` e toca o som uma vez. O último id visto fica em memória; o primeiro carregamento só inicializa, sem tocar.

6. **Sons gerados com Web Audio** (`lib/admin/alert-sounds.ts`): "Campainha" (padrão), "Sino", "Bipe triplo" e "Silencioso", sintetizados por oscilador. Sem arquivos de áudio, licenças nem cache. A escolha fica em `localStorage` (`toque-painel`), com leitura e gravação em try/catch e padrão "Campainha". O `AudioContext` é destravado no primeiro toque na página. Se continuar `suspended` quando um som deveria tocar, aparece o aviso "Toque para ativar o som".
   *Alternativa:* coluna em `shops`. Foi descartada porque o toque é por aparelho e não deveria mudar o celular de outro dono.

7. **Painel instalável:** a rota `app/painel/[slug]/manifest.webmanifest/route.ts` gera o manifesto (`id` `/painel/<slug>/`, `scope` `/painel/` para incluir `/painel/<slug>` e a tela de login, `start_url` `/painel/<slug>?origem=pwa`, nome "Painel <barbearia>", `short_name` "Painel") e o layout do painel declara `manifest` e `appleWebApp`. O manifesto responde só com nome, slug e ícones, sem dados privados. Barbearia inexistente responde 404. O layout do painel é `force-dynamic`, então o `<link rel=manifest>` sai em todas as telas.

8. **Cartão "Avisos neste aparelho"** no topo de Configurações (`app/painel/[slug]/config`), com estes estados:
   - sem suporte;
   - iOS fora do app instalado (instruções, reaproveitando o padrão de `IosInstallHint`);
   - bloqueado;
   - inativo (botão de ativar);
   - ativo ("Enviar aviso de teste" e "Desativar").

   Abaixo fica a escolha de toque com "Testar" e a explicação sobre o som do sistema. Na agenda aparece um lembrete discreto "Ative os avisos" enquanto o aparelho não estiver inscrito, e ele pode ser dispensado. O aviso de teste é uma server action que envia só para o endpoint deste aparelho.

## Risks / Trade-offs

- [O iOS entrega push com atraso ou descarta em modo de economia ou Foco] → Documentar no roteiro do iPhone. A agenda aberta continua se atualizando pela consulta periódica.
- [O dono instala o painel no iPhone mas não entra de novo, porque os cookies do app são separados] → A instrução do cartão avisa "entre de novo no app instalado". Sem sessão, o app abre no login com o `next` do painel.
- [Som bloqueado por política de autoplay, principalmente no iOS] → O `AudioContext` é destravado no primeiro toque e aparece o aviso "Toque para ativar o som". Com o painel em segundo plano, quem toca é a notificação do sistema.
- [Envio do push atrasa a resposta ao cliente] → O envio roda em paralelo com a confirmação, com limite de 5 s e sem `throw`.
- [Consulta a cada 30 s gera carga] → É só com a aba visível, numa consulta indexada por `(shop_id, id)` e de poucos bytes.
- [Notificação duplicada no Android quando o mesmo aparelho ativa os avisos duas vezes] → `unique (shop_id, endpoint)` com `upsert`.
- [Dono com várias barbearias] → A inscrição é por barbearia. Cada painel ativa a sua, e o `tag` e a URL apontam para a barbearia certa.

## Migration Plan

1. Migration nova com `admin_push_subscriptions`, `shop_alerts`, índices e RLS; `supabase test db` cobrindo o acesso de dono, de outro dono e anônimo.
2. Deploy normal (push na `main`). Não há variáveis novas, porque o VAPID já está no Netlify.
3. Em produção: `npx supabase db push` e conferência no iPhone e no Android com a Demir.
4. Rollback: reverter o commit. As tabelas novas podem ficar, porque nada antigo depende delas.
