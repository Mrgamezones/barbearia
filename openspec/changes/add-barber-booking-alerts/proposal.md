# Proposal

## Why

Hoje o barbeiro não recebe nenhum aviso quando um cliente marca ou cancela um horário. As notificações do sistema vão só para o cliente (confirmação por e-mail/WhatsApp e lembrete por push). O barbeiro só descobre um agendamento novo se abrir o painel e recarregar a agenda. Com a Demir Barbershop no ar, um horário marcado em cima da hora pode passar despercebido, e um cancelamento pode deixar uma vaga ociosa que ele poderia preencher.

## What Changes

- **Aviso imediato ao barbeiro** por notificação do celular/computador (Web Push) quando um cliente **marca** um horário pelo site ou **cancela** pelo link de gerenciamento. Ações feitas no próprio painel não geram aviso, porque o barbeiro já sabe delas.
- **Ativação por aparelho** no painel ("Receber avisos neste aparelho"), com a permissão do navegador pedida só depois do toque do barbeiro. É possível desativar e há um botão para enviar um aviso de teste.
- **Toque do painel**: nas configurações, o barbeiro escolhe entre 3 sons gerados pela própria página (ou "Silencioso") e pode testar cada um. Com o painel aberto e visível, a agenda se atualiza sozinha e toca o som escolhido quando chega um agendamento ou cancelamento. Com o celular bloqueado ou o painel fechado, o som é o **padrão de notificação do aparelho**: nenhum navegador deixa um site escolher o som da notificação do sistema. No Android, esse som pode ser trocado nas configurações do telefone; no iPhone, não.
- **Painel instalável como app próprio** (manifesto em `/painel/<slug>/`). É obrigatório para notificações no iPhone: o iOS (16.4+) só entrega push a sites adicionados à Tela de Início. O painel mostra no iPhone as instruções "Compartilhar → Adicionar à Tela de Início" quando os avisos não estão disponíveis.
- **Conferência no iPhone**: roteiro de teste em aparelho real do agendamento do cliente, da instalação, dos lembretes e dos avisos ao barbeiro, porque o CI só cobre Chromium.

Fora do escopo: som personalizado na notificação do sistema (não suportado pelos navegadores); aviso por WhatsApp ou e-mail ao barbeiro; avisos de agendamentos ou cancelamentos feitos no painel; app nativo (App Store/Play Store).

## Capabilities

### New Capabilities
- `barber-alerts`: avisos ao dono da barbearia sobre agendamentos e cancelamentos feitos pelos clientes. Cobre a ativação por aparelho, o envio push, a atualização automática da agenda aberta, o som escolhido no painel e o comportamento no iOS.

### Modified Capabilities
- `pwa-shell`: o requisito "Instalabilidade" passa a cobrir também o painel de cada barbearia como app instalável separado, com instruções no iOS.

## Impact

- **Banco**: nova tabela de inscrições de push dos donos (por barbearia, usuário e aparelho), com RLS restrita ao próprio dono. Nova migration.
- **Servidor**: `lib/notifications/` ganha o envio dos avisos ao barbeiro, chamado em `app/barbearia/[slug]/agendar/actions.ts` (agendamento pelo site) e em `app/barbearia/[slug]/agendamento/[token]/actions.ts` (cancelamento pelo cliente). Reaproveita `sendPush` (VAPID já configurado em produção).
- **Service worker** (`app/sw.ts`): o clique na notificação passa a aceitar um endereço de destino (a agenda do dia) e a avisar as abas abertas do painel para atualizar e tocar o som.
- **Painel**: manifesto e metadados de app em `app/painel/[slug]/`, cartão de ativação dos avisos, escolha de toque em Configurações, atualização automática da agenda.
- **Testes**: unitários do envio e E2E no perfil `admin` (Chromium, com push simulado como em `e2e/push.spec.ts`); roteiro manual no iPhone.
- Sem novas dependências nem novas variáveis de ambiente.
