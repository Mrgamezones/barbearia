# admin-panel Specification

## Purpose
Dá ao barbeiro uma área restrita para acompanhar a agenda e gerenciar serviços, horário de funcionamento, bloqueios e o status dos atendimentos.

## Requirements

### Requirement: Acesso restrito ao administrador
As rotas do painel MUST exigir login com e-mail e senha de um usuário marcado como administrador; não há cadastro público de administradores.

#### Scenario: Visitante sem login
- **WHEN** alguém sem sessão acessa /admin
- **THEN** é redirecionado para a tela de login

#### Scenario: Usuário autenticado sem papel de admin
- **WHEN** um usuário autenticado que não é administrador acessa o painel ou suas operações
- **THEN** o acesso é negado e nenhum dado de agendamento é retornado

### Requirement: Agenda do dia e da semana
O painel SHALL exibir os agendamentos do dia (padrão) e da semana, em ordem cronológica, com horário, nome e WhatsApp do cliente, serviços, total e status, além de um atalho para abrir conversa no WhatsApp do cliente.

#### Scenario: Visualizar o dia
- **WHEN** o administrador abre o painel
- **THEN** vê os agendamentos de hoje em ordem de horário e o total previsto do dia

### Requirement: Alteração de status
O administrador SHALL poder marcar um agendamento como "concluído", "não compareceu" ou "cancelado"; cancelar pelo painel libera o horário e interrompe lembretes pendentes.

#### Scenario: Marcar falta
- **WHEN** o administrador marca um agendamento passado como "não compareceu"
- **THEN** o status é atualizado e aparece no histórico do cliente

### Requirement: Agendamento manual
O administrador SHALL poder criar agendamentos (ex.: cliente que ligou), sujeitos às mesmas regras de conflito, mas sem os limites de antecedência mínima e de agendamentos por cliente.

#### Scenario: Encaixe pelo painel
- **WHEN** o administrador cria um agendamento para daqui a 20 minutos num horário livre
- **THEN** o agendamento é criado

### Requirement: Gestão de serviços
O administrador SHALL poder criar, editar, reordenar, ativar e desativar serviços. Serviços com agendamentos MUST NOT ser excluídos, apenas desativados, e alterações de preço MUST NOT alterar agendamentos já feitos.

#### Scenario: Alterar preço
- **WHEN** o administrador muda o preço do Corte de R$ 45,00 para R$ 50,00
- **THEN** novos agendamentos usam R$ 50,00 e os existentes mantêm R$ 45,00

### Requirement: Horário de funcionamento
O administrador SHALL poder definir, para cada dia da semana, se abre, horário de abertura e fechamento e um intervalo opcional (ex.: almoço).

#### Scenario: Fechado aos domingos
- **WHEN** o domingo é marcado como fechado
- **THEN** nenhum domingo aparece disponível para agendamento

### Requirement: Bloqueios de agenda
O administrador SHALL poder bloquear um dia inteiro ou um período (data/hora início e fim) com motivo opcional. Se existirem agendamentos no período, o sistema MUST avisar e listá-los antes de salvar, sem cancelá-los automaticamente.

#### Scenario: Bloqueio com agendamentos existentes
- **WHEN** o administrador bloqueia uma tarde que tem 2 agendamentos
- **THEN** o sistema lista os 2 agendamentos e pede confirmação; após salvar, eles continuam confirmados e o período fica indisponível para novos agendamentos

### Requirement: Configurações da barbearia
O administrador SHALL poder editar nome, endereço, WhatsApp de contato e texto de apresentação exibidos no site.

#### Scenario: Atualizar WhatsApp
- **WHEN** o administrador altera o WhatsApp de contato
- **THEN** o novo número aparece no site público e nas mensagens ao cliente
