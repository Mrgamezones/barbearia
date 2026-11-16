# appointment-reminders Specification

## Purpose
Reduz faltas enviando ao cliente lembretes do agendamento por notificação push do PWA e por e-mail, respeitando o consentimento dele.

## Requirements

### Requirement: Consentimento para notificações push
Após confirmar o agendamento, o sistema SHALL oferecer ao cliente a ativação de lembretes por notificação; a permissão do navegador MUST ser solicitada somente após ação explícita do cliente.

#### Scenario: Cliente aceita
- **WHEN** o cliente toca em "Ativar lembrete" e o navegador concede permissão
- **THEN** a inscrição de push fica associada àquele agendamento

#### Scenario: Navegador sem suporte
- **WHEN** o navegador não suporta notificações push (ex.: iOS sem o app instalado)
- **THEN** a opção explica que é preciso instalar o app ou informar um e-mail, sem gerar erro

### Requirement: E-mail de confirmação
Quando o cliente informar e-mail, o sistema SHALL enviar um e-mail de confirmação logo após o agendamento, contendo data, horário, serviços, total, endereço e o link de gerenciamento.

#### Scenario: Agendamento com e-mail
- **WHEN** um agendamento com e-mail é criado
- **THEN** o cliente recebe o e-mail de confirmação com o link de gerenciamento

### Requirement: Envio de lembretes
O sistema SHALL enviar um lembrete 24 horas antes e outro 2 horas antes do início, por cada canal disponível (push e/ou e-mail). Lembretes cujo momento já passou na criação do agendamento MUST NOT ser enviados.

#### Scenario: Lembrete de 2 horas
- **WHEN** faltam 2 horas para um agendamento confirmado com push ativo
- **THEN** o cliente recebe uma notificação com horário e serviços, que abre o link de gerenciamento ao ser tocada

#### Scenario: Agendamento feito com menos de 24 horas
- **WHEN** o agendamento é criado 5 horas antes do horário
- **THEN** apenas o lembrete de 2 horas é enviado

### Requirement: Envio único e respeito ao status
Cada lembrete MUST ser enviado no máximo uma vez por canal, e MUST NOT ser enviado para agendamentos cancelados.

#### Scenario: Agendamento cancelado
- **WHEN** um agendamento é cancelado antes do lembrete de 24 horas
- **THEN** nenhum lembrete é enviado

#### Scenario: Reexecução do disparo
- **WHEN** o processo de disparo roda duas vezes na mesma janela
- **THEN** o cliente recebe cada lembrete uma única vez

### Requirement: Inscrição expirada
Se o serviço de push informar que a inscrição não é mais válida, o sistema SHALL descartá-la e continuar enviando pelos demais canais.

#### Scenario: Push expirado com e-mail disponível
- **WHEN** o envio push retorna inscrição expirada e o agendamento tem e-mail
- **THEN** a inscrição é removida e o lembrete por e-mail é enviado normalmente
