# Spec Delta

## Purpose

Permite que clientes, sem criar conta, consultem horários livres do barbeiro e agendem, consultem ou cancelem atendimentos sem conflitos de agenda.

## ADDED Requirements

### Requirement: Seleção de serviços
O cliente SHALL poder selecionar um ou mais serviços ativos em um mesmo agendamento; a duração total e o preço total SHALL ser a soma dos serviços selecionados e exibidos antes da confirmação.

#### Scenario: Dois serviços selecionados
- **WHEN** o cliente seleciona Corte de cabelo (30 min, R$ 45,00) e Bigode (10 min, R$ 15,00)
- **THEN** o resumo mostra duração total de 40 min e total de R$ 60,00

#### Scenario: Nenhum serviço selecionado
- **WHEN** o cliente tenta avançar sem selecionar serviços
- **THEN** o sistema impede o avanço e pede a escolha de ao menos um serviço

### Requirement: Cálculo de horários disponíveis
O sistema SHALL oferecer horários de início, em intervalos de 15 minutos, em que a duração total cabe inteiramente dentro do horário de funcionamento do dia, sem sobrepor intervalos, bloqueios ou agendamentos não cancelados. Horários usam o fuso America/Sao_Paulo.

#### Scenario: Horário que ultrapassa o fechamento
- **WHEN** a barbearia fecha às 19:00 e a duração total é 60 min
- **THEN** o último horário oferecido é 18:00

#### Scenario: Horário ocupado
- **WHEN** existe agendamento confirmado das 14:00 às 14:30 e a duração escolhida é 30 min
- **THEN** os horários 13:45, 14:00 e 14:15 não são oferecidos, e 14:30 é oferecido

#### Scenario: Dia bloqueado
- **WHEN** o administrador bloqueou o dia inteiro
- **THEN** a data aparece como indisponível no calendário

### Requirement: Janela de agendamento
O sistema SHALL permitir agendar apenas de hoje até 30 dias à frente, e MUST NOT oferecer horários com início a menos de 60 minutos do momento atual.

#### Scenario: Horário muito próximo
- **WHEN** são 10:20 e o cliente consulta horários de hoje
- **THEN** o primeiro horário oferecido é 11:30 ou posterior

#### Scenario: Data além do limite
- **WHEN** o cliente tenta escolher uma data 31 dias à frente
- **THEN** a data está indisponível

### Requirement: Dados do cliente
Para confirmar, o cliente MUST informar nome (2 a 80 caracteres) e WhatsApp brasileiro válido (DDD + número); e-mail SHALL ser opcional e, se informado, MUST ser válido.

#### Scenario: Telefone inválido
- **WHEN** o cliente informa o WhatsApp "1234"
- **THEN** o sistema recusa e mostra a mensagem de telefone inválido

### Requirement: Criação de agendamento sem conflito
O sistema MUST garantir, no momento da gravação, que nenhum par de agendamentos não cancelados se sobreponha no tempo, mesmo com requisições simultâneas.

#### Scenario: Dois clientes no mesmo horário
- **WHEN** dois clientes confirmam o mesmo horário quase ao mesmo tempo
- **THEN** apenas um agendamento é criado e o outro cliente recebe aviso de que o horário acabou de ser ocupado e é convidado a escolher outro

#### Scenario: Agendamento criado
- **WHEN** o cliente confirma um horário livre com dados válidos
- **THEN** o agendamento é gravado com status "confirmado" e o cliente vê a página de confirmação com data, horário, serviços, total e endereço

### Requirement: Limite de agendamentos por cliente
O sistema MUST NOT permitir mais de 2 agendamentos futuros não cancelados para o mesmo número de WhatsApp.

#### Scenario: Terceiro agendamento
- **WHEN** um número já possui 2 agendamentos futuros confirmados e tenta criar outro
- **THEN** o sistema recusa e orienta a cancelar um existente ou contatar a barbearia

### Requirement: Link de gerenciamento do agendamento
Cada agendamento SHALL ter um link único, não adivinhável, exibido na confirmação (e enviado por e-mail, se informado), que permite ao cliente ver os detalhes sem login. Nenhuma outra rota pública MUST expor dados de agendamentos.

#### Scenario: Acesso pelo link
- **WHEN** o cliente abre o link de gerenciamento
- **THEN** vê serviços, data, horário, total e status do seu agendamento

#### Scenario: Link inválido
- **WHEN** alguém abre um link com token inexistente
- **THEN** o sistema mostra "agendamento não encontrado" sem revelar outros dados

### Requirement: Cancelamento pelo cliente
O cliente SHALL poder cancelar pelo link de gerenciamento até 2 horas antes do início; após esse prazo o sistema SHALL orientar contato direto com a barbearia. O horário cancelado volta a ficar disponível.

#### Scenario: Cancelamento dentro do prazo
- **WHEN** faltam 5 horas para o horário e o cliente confirma o cancelamento
- **THEN** o status muda para "cancelado", o horário volta a aparecer como livre e lembretes pendentes não são enviados

#### Scenario: Cancelamento fora do prazo
- **WHEN** falta 1 hora para o horário
- **THEN** o botão de cancelar não está disponível e é exibido o WhatsApp da barbearia
