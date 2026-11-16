# whatsapp-notifications Specification

## Purpose
Mantém o cliente informado sobre o próprio agendamento pelo WhatsApp: confirmação, cancelamentos e lembretes. Respeita o consentimento dele e nunca bloqueia o agendamento quando o envio falha.

## Requirements

### Requirement: Consentimento para mensagens pelo WhatsApp
Os formulários de agendamento do site e do painel SHALL exibir a opção "Receber confirmação e lembretes pelo WhatsApp", marcada por padrão. O sistema SHALL guardar a escolha no agendamento e MUST NOT enviar nenhuma mensagem de WhatsApp para um agendamento sem consentimento.

#### Scenario: Cliente mantém a opção marcada
- **WHEN** o cliente confirma o agendamento com a opção marcada
- **THEN** o agendamento fica registrado com consentimento e as mensagens de WhatsApp desta capability são enviadas

#### Scenario: Cliente desmarca a opção
- **WHEN** o cliente desmarca a opção e confirma o agendamento
- **THEN** o agendamento é criado normalmente e nenhuma mensagem de WhatsApp é enviada para ele, nem confirmação, nem cancelamento, nem lembrete

#### Scenario: Agendamento manual no painel
- **WHEN** o barbeiro cria um agendamento no painel com a opção marcada
- **THEN** o cliente recebe a confirmação pelo WhatsApp no número informado

### Requirement: Confirmação do agendamento pelo WhatsApp
Logo após um agendamento com consentimento ser criado, pelo site ou pelo painel, o sistema SHALL enviar ao WhatsApp do cliente uma mensagem com nome da barbearia, data, horário, serviços, total, endereço e o link para ver ou cancelar o agendamento.

#### Scenario: Agendamento pelo site
- **WHEN** um cliente com consentimento agenda "Corte de cabelo" para sexta-feira às 14:00
- **THEN** ele recebe no WhatsApp a confirmação com "sexta-feira", "14:00", "Corte de cabelo", o total, o endereço e o link de gerenciamento

#### Scenario: Cliente também informou e-mail
- **WHEN** o agendamento tem consentimento de WhatsApp e e-mail
- **THEN** o cliente recebe a confirmação pelos dois canais

### Requirement: Aviso de cancelamento pelo barbeiro
Quando o barbeiro muda um agendamento confirmado para "cancelado" no painel, o sistema SHALL enviar ao WhatsApp do cliente uma mensagem informando que o horário foi cancelado pela barbearia, com data, horário e o link para agendar de novo.

#### Scenario: Barbeiro cancela um horário futuro
- **WHEN** o barbeiro cancela no painel o agendamento confirmado de amanhã às 10:00
- **THEN** o cliente recebe no WhatsApp a mensagem de cancelamento pela barbearia com a data, "10:00" e o link para agendar

#### Scenario: Mudança para outro status
- **WHEN** o barbeiro marca um agendamento como "concluído" ou "não compareceu"
- **THEN** nenhuma mensagem de cancelamento é enviada

#### Scenario: Agendamento que já estava cancelado
- **WHEN** o status salvo já é "cancelado" e o barbeiro salva "cancelado" de novo
- **THEN** nenhuma nova mensagem de cancelamento é enviada

### Requirement: Confirmação de cancelamento pelo cliente
Quando o cliente cancela o próprio agendamento pelo link de gerenciamento, o sistema SHALL enviar ao WhatsApp dele uma confirmação do cancelamento, com data, horário e o link para agendar de novo.

#### Scenario: Cliente cancela pelo link
- **WHEN** o cliente cancela pelo link um agendamento com consentimento
- **THEN** a página confirma o cancelamento e o cliente recebe a confirmação no WhatsApp

#### Scenario: Cancelamento recusado
- **WHEN** o cliente tenta cancelar a menos de 2 horas do horário e o cancelamento é recusado
- **THEN** nenhuma mensagem de cancelamento é enviada

### Requirement: Lembretes pelo WhatsApp
Para agendamentos com consentimento, o sistema SHALL enviar pelo WhatsApp um lembrete 24 horas antes e outro 2 horas antes do início, com horário e serviços. Lembretes cujo momento já passou quando o agendamento foi criado MUST NOT ser enviados.

#### Scenario: Lembrete de 24 horas
- **WHEN** faltam 24 horas para um agendamento confirmado com consentimento
- **THEN** o cliente recebe no WhatsApp o lembrete com horário e serviços

#### Scenario: Agendamento feito com menos de 24 horas
- **WHEN** o agendamento com consentimento é criado 5 horas antes do horário
- **THEN** apenas o lembrete de 2 horas é enviado pelo WhatsApp

### Requirement: Envio único e respeito ao status no WhatsApp
Cada lembrete de WhatsApp MUST ser enviado no máximo uma vez, e MUST NOT ser enviado para agendamentos cancelados. Cada aviso de cancelamento MUST ser enviado no máximo uma vez por agendamento.

#### Scenario: Agendamento cancelado antes do lembrete
- **WHEN** um agendamento é cancelado antes do lembrete de 24 horas
- **THEN** o cliente recebe só o aviso de cancelamento e nenhum lembrete

#### Scenario: Reexecução do disparo
- **WHEN** o processo de disparo de lembretes roda duas vezes na mesma janela
- **THEN** o cliente recebe cada lembrete de WhatsApp uma única vez

#### Scenario: Cancelar, reativar e cancelar de novo
- **WHEN** o barbeiro cancela um agendamento, reativa e cancela outra vez
- **THEN** o cliente recebe apenas um aviso de cancelamento

### Requirement: Falha no WhatsApp não bloqueia o fluxo
Uma falha ao enviar mensagem pelo WhatsApp MUST NOT impedir nem desfazer o agendamento, o cancelamento ou o envio pelos demais canais. Toda tentativa de envio SHALL ser registrada com canal, tipo, resultado e detalhe do erro.

#### Scenario: Provedor indisponível na confirmação
- **WHEN** o serviço do WhatsApp está fora do ar no momento do agendamento
- **THEN** o agendamento é criado, o cliente vê a tela de sucesso, o e-mail (se houver) é enviado e a falha fica registrada

#### Scenario: Falha temporária em lembrete
- **WHEN** o envio de um lembrete pelo WhatsApp falha por erro temporário (limite de envio ou indisponibilidade)
- **THEN** o lembrete volta para a fila e é tentado na próxima execução do disparo

#### Scenario: Número sem WhatsApp
- **WHEN** o provedor informa que o número do cliente não pode receber mensagens
- **THEN** o lembrete não volta para a fila, o motivo fica registrado e os demais canais seguem normalmente

### Requirement: Modo de simulação sem credenciais
Quando as credenciais do WhatsApp não estão configuradas, o sistema SHALL simular os envios: nada é enviado e cada tentativa fica registrada como simulação, sem erro para o cliente nem para o barbeiro.

#### Scenario: Ambiente de desenvolvimento
- **WHEN** um agendamento com consentimento é criado sem as credenciais do WhatsApp configuradas
- **THEN** nenhuma mensagem real é enviada e o registro de envio mostra a confirmação como simulação

### Requirement: Privacidade do número do cliente
O número de WhatsApp do cliente MUST ser usado apenas para mensagens sobre os agendamentos dele, e MUST NOT aparecer completo nos logs da aplicação. A política de privacidade SHALL informar esse uso.

#### Scenario: Log da aplicação
- **WHEN** um envio pelo WhatsApp é feito ou falha
- **THEN** o log da aplicação mostra no máximo os 4 últimos dígitos do número

#### Scenario: Política de privacidade
- **WHEN** o visitante abre a página de privacidade
- **THEN** ela informa que o WhatsApp informado é usado para confirmação, cancelamento e lembretes do agendamento, e como deixar de recebê-los
