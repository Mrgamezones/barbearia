# Spec Delta

## Purpose

Permite que várias barbearias usem o mesmo sistema, no mesmo domínio e no mesmo banco, cada uma com seu endereço, seus dados e seu painel, sem que uma veja ou altere os dados de outra.

## ADDED Requirements

### Requirement: Barbearia identificada por slug
Cada barbearia SHALL ter um slug único, em minúsculas, com letras sem acento, números e hífens (de 3 a 40 caracteres), que a identifica nos endereços. Um slug inexistente MUST resultar em página "não encontrada" (HTTP 404).

#### Scenario: Slug válido
- **WHEN** o visitante abre `/barbearia/demir-barbershop`
- **THEN** vê o site da Demir Barbershop, com nome, endereço, horário e serviços dela

#### Scenario: Slug inexistente
- **WHEN** o visitante abre `/barbearia/nao-existe` ou `/painel/nao-existe`
- **THEN** recebe a página de não encontrado com status 404

### Requirement: Site público por barbearia
O site público de cada barbearia SHALL ficar em `/barbearia/<slug>`, com as páginas de agendamento, serviços, privacidade e gerenciamento de agendamento como subcaminhos desse endereço. Todos os links internos, o manifesto do app instalado e os links enviados por e-mail, WhatsApp e push MUST apontar para o endereço da mesma barbearia.

#### Scenario: Agendar pela página da barbearia
- **WHEN** o cliente agenda em `/barbearia/demir-barbershop/agendar`
- **THEN** vê só os serviços e horários livres da Demir Barbershop, e o agendamento fica registrado nela

#### Scenario: Link de gerenciamento
- **WHEN** o cliente recebe a confirmação de um agendamento na Demir Barbershop
- **THEN** o link abre `/barbearia/demir-barbershop/agendamento/<token>`

#### Scenario: Token de outra barbearia
- **WHEN** um token válido da barbearia A é aberto no endereço da barbearia B
- **THEN** a página responde 404 e não mostra nenhum dado do agendamento

#### Scenario: App instalado
- **WHEN** o cliente instala o site da Demir Barbershop como app no celular
- **THEN** o app abre em `/barbearia/demir-barbershop` e mostra o nome da barbearia

### Requirement: Agendas independentes
Horários livres, bloqueios e a regra de não sobreposição de agendamentos MUST ser calculados por barbearia. Um agendamento em uma barbearia MUST NOT ocupar horário em outra.

#### Scenario: Mesmo horário em barbearias diferentes
- **WHEN** a barbearia A já tem um agendamento às 10h de um dia e um cliente agenda às 10h do mesmo dia na barbearia B
- **THEN** o agendamento na barbearia B é confirmado

#### Scenario: Bloqueio isolado
- **WHEN** o dono da barbearia A bloqueia uma tarde
- **THEN** os horários dessa tarde continuam livres na barbearia B

### Requirement: Painel por barbearia com login
O painel de cada barbearia SHALL ficar em `/painel/<slug>` e exigir login. Um usuário MUST acessar e alterar apenas as barbearias às quais está vinculado. Essa regra MUST valer também no banco, mesmo para chamadas feitas direto à API do Supabase.

#### Scenario: Sem login
- **WHEN** um visitante sem sessão abre `/painel/demir-barbershop`
- **THEN** é levado ao login e, depois de entrar, volta para `/painel/demir-barbershop`

#### Scenario: Dono da própria barbearia
- **WHEN** o dono da Demir Barbershop entra no painel
- **THEN** vê e altera agenda, serviços, horários, bloqueios e configurações só da Demir Barbershop

#### Scenario: Painel de outra barbearia
- **WHEN** o dono da Demir Barbershop, logado, abre `/painel/demonstracao`
- **THEN** recebe a mensagem de acesso negado, sem nenhum dado da outra barbearia

#### Scenario: Chamada direta à API
- **WHEN** um usuário vinculado só à barbearia A usa a API do Supabase com a própria sessão para ler ou alterar agendamentos, serviços ou configurações da barbearia B
- **THEN** a leitura não retorna linhas e a alteração é recusada

### Requirement: Textos no padrão brasileiro
Os textos exibidos SHALL seguir as convenções brasileiras de redação: horas sem zero à esquerda e com "h" ("8h às 19h", "12h30"), valores com "R$", espaço e duas casas decimais com vírgula ("R$ 30,00"), e o endereço no formato "Logradouro, número – Bairro, Cidade – UF, CEP", omitindo as partes não informadas.

#### Scenario: Horário de atendimento
- **WHEN** a barbearia abre das 08:00 às 19:00
- **THEN** o site mostra "8h às 19h", e não "08h às 19h"

#### Scenario: Endereço incompleto
- **WHEN** a barbearia tem só logradouro e número cadastrados
- **THEN** o site mostra "Rua Abaré, 2" sem traços ou vírgulas sobrando
