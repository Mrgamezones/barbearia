# Tasks

## 1. Banco

- [x] 1.1 Criar a migration `supabase/migrations/20261118000100_shop_alerts.sql` com `admin_push_subscriptions` e `shop_alerts` (decisões 1 e 2): colunas, `unique (shop_id, endpoint)`, índice `(shop_id, id)`, RLS (dono lê, insere e apaga só as próprias inscrições; dono lê os alertas das suas barbearias; anônimo não acessa nada) e grants. Verificar com o novo `supabase/tests/11_shop_alerts.test.sql`, que cobre dono, dono de outra barbearia e anônimo, e com `npx supabase test db` verde.

## 2. Envio dos avisos

- [x] 2.1 Criar `lib/notifications/shop-alert.ts` com `notifyShopAdmins(appointmentId, kind)` (decisão 3): grava `shop_alerts` e, com `notifications_enabled`, envia push a todas as inscrições dos donos daquela barbearia, com título, texto (cliente, dia/horário, serviços; ou "horário livre"), `url` `/painel/<slug>?data=…`, `alertId` e `tag`. Também apaga inscrições `gone`, limita cada envio a 5 s e nunca lança erro. Verificar com `lib/notifications/shop-alert.test.ts`, que cobre: textos de agendamento e de cancelamento, demonstração (grava o alerta sem enviar), outra barbearia não recebe, inscrição `gone` é removida e falha não lança.
- [x] 2.2 Chamar `notifyShopAdmins` em paralelo com a confirmação ao cliente em `app/barbearia/[slug]/agendar/actions.ts` (`booked`) e em `app/barbearia/[slug]/agendamento/[token]/actions.ts` (`cancelled_by_client`), sem tocar nas actions do painel. Verificar com `npm run test` e conferir por leitura que `app/painel/[slug]/novo/actions.ts` e `app/painel/[slug]/actions.ts` não chamam a função.

## 3. Service worker

- [x] 3.1 Em `app/sw.ts`, aceitar `url` e `alertId` no payload; sempre mostrar a notificação; avisar por `postMessage({ type: "shop-alert", alertId })` as janelas abertas em `/painel/`; no clique com `url`, focar e navegar uma janela do painel existente ou abrir uma nova. Os lembretes do cliente continuam como hoje. Verificar com `npm run build` e com o E2E `e2e/push.spec.ts` (lembretes do cliente) ainda verde.

## 4. Painel instalável

- [x] 4.1 Criar `app/painel/[slug]/manifest.webmanifest/route.ts` (decisão 7) e declarar `manifest` e `appleWebApp` no `generateMetadata` de `app/painel/[slug]/layout.tsx`. Verificar com um teste em `e2e/pwa.spec.ts`: o manifesto do painel da barbearia de teste responde 200 com `scope` `/painel/`, `id` `/painel/<slug>/` e nome "Painel …", um slug inexistente responde 404, e a página de login/painel tem `<link rel="manifest">`.

## 5. Ativação no aparelho

- [x] 5.1 Criar as server actions `subscribeAlerts`, `unsubscribeAlerts` e `sendTestAlert` em `app/painel/[slug]/config/alert-actions.ts`, validadas com zod e com `getPanelSession`. O teste envia só para o endpoint informado e apenas se ele pertencer ao usuário. Verificar com testes unitários de validação e com o E2E da 5.2.
- [x] 5.2 Criar `components/admin/AlertsCard.tsx` no topo de Configurações, com os estados da decisão 8: sem suporte, iOS fora do app instalado com instruções, bloqueado, inativo e ativo com teste/desativar. A permissão só é pedida no clique. Verificar com `e2e/admin-alerts.spec.ts` (perfil `admin`, push simulado como em `e2e/push.spec.ts`): nenhum pedido de permissão ao abrir; ativar grava a inscrição; desativar apaga; o estado iOS aparece com user agent de iPhone fora do modo standalone.
- [x] 5.3 Ponta a ponta do aviso: no mesmo `e2e/admin-alerts.spec.ts`, com o dono inscrito, um agendamento pelo site e um cancelamento pelo link geram duas linhas em `shop_alerts`; um agendamento manual pelo painel não gera; e o envio vai ao endpoint simulado do dono, conferido por interceptação ou pelo log do servidor de teste.

## 6. Agenda ao vivo e toque

- [x] 6.1 Criar `lib/admin/alert-sounds.ts` com os sons "Campainha", "Sino" e "Bipe triplo" via Web Audio, além de "Silencioso" e da escolha em `localStorage` (decisão 6). Verificar com `lib/admin/alert-sounds.test.ts`: a leitura e a gravação da escolha toleram armazenamento bloqueado e o padrão é "Campainha".
- [x] 6.2 Criar `components/admin/PanelLiveUpdates.tsx` no layout do painel e a server action `latestAlertId(slug)` (decisão 5): consulta a cada 30 s com a página visível, ao voltar a ficar visível e ao receber a mensagem do SW; com alerta novo, faz `router.refresh()` e toca o som uma vez; mostra "Toque para ativar o som" quando o áudio está suspenso. Verificar com um teste em `e2e/admin-alerts.spec.ts`: com a agenda de hoje aberta, um agendamento inserido pelo site aparece em até 35 s sem recarregar.
- [x] 6.3 Adicionar em Configurações a escolha de toque com "Testar" e a explicação sobre o som do sistema (Android nas configurações do aparelho; iPhone não permite), mais o lembrete dispensável "Ative os avisos" na agenda. Verificar no E2E que a escolha persiste ao recarregar e que o texto explicativo aparece.

## 7. Documentação e conferência

- [x] 7.1 Atualizar `docs/deploy-netlify.md`: aplicar a migration em produção, incluir os itens novos no checklist da seção 6 (ativar avisos no Android, agendar pelo site e receber o aviso, cancelar pelo link e receber o aviso, agendamento manual sem aviso) e adicionar uma seção "iPhone" com instalar o painel, entrar de novo, ativar avisos e os limites (iOS 16.4+, Foco/economia de energia). Verificar que o guia cita a migration e os passos novos.
- [ ] 7.2 Commitar, enviar para a `main` e aplicar a migration em produção (`npx supabase db push`). Verificar que o CI fica verde, o deploy do Netlify termina sem erro e `/painel/demir-barbershop/manifest.webmanifest` responde 200.
- [ ] 7.3 Conferência em aparelhos reais com a Demir:
  - **Android:** ativar e receber os avisos de agendamento e de cancelamento; tocar no aviso abre a agenda do dia; testar o toque com o painel aberto.
  - **iPhone:** fluxo do cliente no Safari (agendar, link, cancelar, instalar o app da barbearia e ativar lembrete); instalar o painel, entrar, ativar os avisos e receber agendamento e cancelamento.

  Verificar que todos os itens passam e anotar no guia qualquer limitação encontrada no iPhone.

## Workflow follow-up

- Arquivar a change depois da conferência 7.3, sincronizando `barber-alerts` e `pwa-shell`.
