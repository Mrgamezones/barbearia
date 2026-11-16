# Spec Delta

## Purpose

Define como uma barbearia nova entra no sistema e como o sistema é demonstrado a barbeiros interessados antes da venda.

## ADDED Requirements

### Requirement: Cadastro de barbearia por comando
O sistema SHALL oferecer um comando documentado que, a partir de um arquivo de dados, cria uma barbearia com slug, nome, endereço, contato, horário semanal, serviços e o login do dono, tudo de uma vez. Se qualquer parte falhar, nada MUST ficar gravado.

#### Scenario: Cadastro completo
- **WHEN** o operador executa o comando com o arquivo de dados da Demir Barbershop
- **THEN** `/barbearia/demir-barbershop` mostra os dados e os serviços cadastrados, e o e-mail do dono entra em `/painel/demir-barbershop`

#### Scenario: Slug já usado
- **WHEN** o operador executa o comando com um slug que já existe
- **THEN** o comando termina com erro, sem alterar a barbearia existente

#### Scenario: Dado inválido
- **WHEN** o arquivo tem um serviço com duração que não é múltipla de 5 minutos
- **THEN** o comando termina com erro indicando o campo, e nenhuma barbearia é criada

### Requirement: Dono com várias barbearias
Um mesmo login SHALL poder ser vinculado a mais de uma barbearia. Ao entrar pelo endereço geral do painel (`/painel`), o usuário MUST ser levado à sua barbearia, se tiver uma só, ou ver a lista das suas barbearias, se tiver mais de uma.

#### Scenario: Uma barbearia
- **WHEN** um dono vinculado só à Demir Barbershop entra em `/painel`
- **THEN** é levado a `/painel/demir-barbershop`

#### Scenario: Várias barbearias
- **WHEN** um usuário vinculado a duas barbearias entra em `/painel`
- **THEN** vê a lista com as duas e escolhe qual abrir

### Requirement: Barbearia de demonstração
O sistema SHALL ter uma barbearia de demonstração em `/barbearia/demonstracao`, com dados fictícios, para mostrar o site a barbeiros interessados. A raiz do domínio (`/`) MUST redirecionar para ela. A demonstração MUST NOT enviar mensagens de WhatsApp nem e-mails a clientes.

#### Scenario: Mostrar ao barbeiro
- **WHEN** o vendedor abre o domínio no celular para mostrar a um barbeiro
- **THEN** cai em `/barbearia/demonstracao` com o site completo da barbearia fictícia

#### Scenario: Agendamento na demonstração
- **WHEN** alguém faz um agendamento na demonstração informando o próprio WhatsApp e e-mail
- **THEN** o agendamento aparece na tela de confirmação, mas nenhuma mensagem é enviada
