# container-runtime Specification

## Purpose

Permite subir o site da barbearia completo (app e Supabase) localmente em Docker com um único comando, de forma reproduzível em qualquer máquina com Docker.

## Requirements

### Requirement: Subida com um comando
O ambiente SHALL subir app e Supabase local com um único comando documentado, exigindo na máquina apenas Docker, Docker Compose e Node/npm para executar o script.

#### Scenario: Primeira subida em máquina limpa
- **WHEN** o desenvolvedor clona o repositório, copia `.env.example` para `.env` e executa `npm run docker:up`
- **THEN** em até 10 minutos o site responde em http://localhost:3000 e o Supabase Studio em http://localhost:56323

### Requirement: Banco pronto para uso
Ao subir pela primeira vez ou após reset, o ambiente SHALL aplicar todas as migrações e o seed, deixando os serviços iniciais, o horário padrão e um usuário administrador local de teste disponíveis.

#### Scenario: Serviços após a subida
- **WHEN** o ambiente termina de subir
- **THEN** a página de serviços lista os serviços iniciais e o login do painel aceita o admin local documentado no README

### Requirement: Reset e encerramento
O ambiente SHALL oferecer comandos para derrubar todos os containers (`npm run docker:down`) mantendo os dados, e para recriar o banco do zero com migrações e seed (`npm run docker:reset`).

#### Scenario: Reset dos dados
- **WHEN** existem agendamentos de teste e o desenvolvedor executa `npm run docker:reset`
- **THEN** o banco volta ao estado inicial sem agendamentos e o site continua acessível

### Requirement: Imagem de produção do app
A imagem do app MUST ser gerada a partir de build de produção, rodar como usuário não-root e não conter segredos embutidos; toda configuração MUST vir de variáveis de ambiente em tempo de execução.

#### Scenario: Inspeção da imagem
- **WHEN** a imagem é inspecionada
- **THEN** o processo roda com usuário diferente de root e nenhum arquivo `.env` ou chave está presente na imagem

### Requirement: Mesmo endereço para o navegador
O navegador MUST acessar o Supabase pelo mesmo endereço do site, de modo que login do painel e chamadas do navegador funcionem igualmente a partir do host e de outros containers.

#### Scenario: Login a partir de outro container
- **WHEN** um navegador dentro do container de simulação faz login no painel
- **THEN** o login funciona sem configuração de rede adicional

### Requirement: Saúde dos serviços
O app SHALL expor uma rota de saúde que indica se o banco está acessível, e o orquestrador MUST só considerar o app pronto quando essa rota responder com sucesso.

#### Scenario: Banco indisponível
- **WHEN** o Supabase local está parado e a rota de saúde é chamada
- **THEN** ela responde com erro 503 e o app não é marcado como saudável

### Requirement: E-mails locais capturados
No ambiente local, e-mails do sistema MUST NOT ser enviados a destinatários reais; SHALL ser capturados por uma caixa de e-mail de teste acessível no navegador.

#### Scenario: E-mail de confirmação local
- **WHEN** um agendamento com e-mail é criado no ambiente Docker
- **THEN** o e-mail aparece na caixa de teste local e não sai para a internet
