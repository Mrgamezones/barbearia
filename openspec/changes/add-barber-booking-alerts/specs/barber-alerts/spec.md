# Spec Delta

## Purpose

Avisa o dono da barbearia, na hora, quando um cliente marca ou cancela um horário pelo site, para que nenhum agendamento passe despercebido e vagas liberadas possam ser preenchidas.

## ADDED Requirements

### Requirement: Ativação dos avisos por aparelho
O painel SHALL oferecer ao dono a ativação dos avisos no aparelho em uso. A permissão de notificação do navegador MUST ser pedida somente após um toque explícito do dono. Cada aparelho ativado fica ligado à barbearia e ao usuário que o ativou.

#### Scenario: Dono ativa no celular
- **WHEN** o dono toca em "Receber avisos neste aparelho" e o navegador concede a permissão
- **THEN** o painel mostra que os avisos estão ativos neste aparelho e oferece "Enviar aviso de teste" e "Desativar"

#### Scenario: Permissão negada
- **WHEN** o dono toca em ativar e nega a permissão do navegador
- **THEN** o painel explica que os avisos ficaram bloqueados e como liberar nas configurações do navegador, sem gerar erro

#### Scenario: Nenhum pedido sem toque
- **WHEN** o dono abre o painel pela primeira vez
- **THEN** o navegador não pede permissão de notificação até o dono tocar em ativar

### Requirement: Desativação dos avisos
O dono SHALL poder desativar os avisos no aparelho em uso; a partir daí, nenhum aviso MUST ser enviado para esse aparelho.

#### Scenario: Desativar
- **WHEN** o dono toca em "Desativar" com os avisos ativos
- **THEN** o aparelho deixa de receber avisos e o painel volta a oferecer a ativação

### Requirement: Aviso de agendamento novo
Quando um cliente concluir um agendamento pelo site, o sistema SHALL enviar imediatamente um aviso a todos os aparelhos ativados pelos donos daquela barbearia, com o nome do cliente, o dia, o horário e os serviços. Agendamentos criados pelo painel MUST NOT gerar aviso.

#### Scenario: Cliente agenda pelo site
- **WHEN** um cliente agenda "Corte" para amanhã às 14:00 na Demir Barbershop
- **THEN** os aparelhos ativados pelos donos da Demir recebem um aviso "Novo agendamento" com o nome do cliente, "amanhã, 14:00" (ou a data) e "Corte"

#### Scenario: Agendamento manual no painel
- **WHEN** o dono cria um agendamento pela tela "Novo agendamento" do painel
- **THEN** nenhum aviso é enviado aos donos

#### Scenario: Outra barbearia
- **WHEN** um cliente agenda na barbearia A
- **THEN** donos que só administram a barbearia B não recebem aviso

### Requirement: Aviso de cancelamento pelo cliente
Quando um cliente cancelar o próprio agendamento pelo link de gerenciamento, o sistema SHALL enviar imediatamente um aviso aos aparelhos ativados pelos donos da barbearia, informando que o horário ficou livre. Cancelamentos feitos pelo painel MUST NOT gerar aviso.

#### Scenario: Cliente cancela pelo link
- **WHEN** o cliente cancela o horário de sexta às 10:00 pelo link
- **THEN** os donos recebem um aviso "Agendamento cancelado" com o nome do cliente e "sexta, 10:00", indicando que o horário está livre

#### Scenario: Dono cancela no painel
- **WHEN** o dono marca um agendamento como cancelado no painel
- **THEN** nenhum aviso é enviado aos donos

### Requirement: Aviso não atrasa nem bloqueia o cliente
Falhas no envio dos avisos ao barbeiro MUST NOT impedir, atrasar visivelmente nem desfazer o agendamento ou o cancelamento do cliente.

#### Scenario: Serviço de push fora do ar
- **WHEN** o serviço de push recusa ou não responde ao envio de um aviso
- **THEN** o cliente vê a confirmação normalmente e a falha fica registrada no servidor

### Requirement: Barbearia de demonstração sem avisos
Barbearias com notificações desligadas (como a demonstração) MUST NOT enviar avisos aos donos.

#### Scenario: Visitante agenda na demonstração
- **WHEN** um visitante agenda em `/barbearia/demonstracao`
- **THEN** nenhum aviso é enviado

### Requirement: Abrir a agenda pelo aviso
Tocar no aviso SHALL abrir o painel da barbearia na agenda do dia do agendamento, reaproveitando uma janela do painel já aberta quando existir.

#### Scenario: Tocar no aviso
- **WHEN** o dono toca no aviso de um agendamento para 21/11
- **THEN** o painel abre em `/painel/<slug>` na data 21/11, mostrando o agendamento

### Requirement: Aviso de teste
O painel SHALL permitir enviar um aviso de teste ao próprio aparelho, para o dono conferir que os avisos chegam e como soam.

#### Scenario: Testar
- **WHEN** o dono toca em "Enviar aviso de teste" com os avisos ativos
- **THEN** o aparelho recebe em poucos segundos um aviso identificado como teste

### Requirement: Aparelho que deixou de receber
Quando o serviço de push informar que a inscrição de um aparelho expirou ou foi revogada, o sistema SHALL removê-la e continuar enviando aos demais aparelhos.

#### Scenario: Inscrição expirada
- **WHEN** um aviso é enviado e um dos dois aparelhos do dono responde como expirado
- **THEN** o outro aparelho recebe o aviso e a inscrição expirada é removida

### Requirement: Agenda aberta se atualiza sozinha
Com o painel aberto e visível, a agenda SHALL mostrar agendamentos novos e cancelamentos feitos por clientes sem o dono recarregar a página, em no máximo 1 minuto, mesmo sem avisos ativados.

#### Scenario: Agendamento chega com a agenda aberta
- **WHEN** o dono está com a agenda de hoje aberta e um cliente agenda para hoje
- **THEN** o agendamento aparece na agenda sem recarregar a página

#### Scenario: Volta ao painel
- **WHEN** o dono volta para a aba ou o app do painel depois de um tempo em outra tela
- **THEN** a agenda é atualizada imediatamente

### Requirement: Toque escolhido no painel
Nas configurações, o dono SHALL poder escolher, para o aparelho em uso, um entre 3 sons ou "Silencioso", e testar cada um. Com o painel aberto e visível, o som escolhido MUST tocar quando chegar um agendamento novo ou um cancelamento de cliente. O padrão é o primeiro som.

#### Scenario: Escolher e testar
- **WHEN** o dono escolhe o segundo som e toca em "Testar"
- **THEN** o som escolhido toca, e a escolha continua valendo ao reabrir o painel no mesmo aparelho

#### Scenario: Silencioso
- **WHEN** o dono escolhe "Silencioso" e um cliente agenda com o painel aberto
- **THEN** a agenda se atualiza sem tocar som

#### Scenario: Som bloqueado pelo navegador
- **WHEN** o navegador bloqueia o som porque o dono ainda não tocou na página desde que ela abriu
- **THEN** o painel mostra um aviso discreto "Toque para ativar o som" e, após o toque, os sons voltam a tocar

### Requirement: Som da notificação do sistema
Com o painel fechado ou o aparelho bloqueado, o aviso SHALL usar o som padrão de notificação do aparelho. O painel MUST informar, junto da escolha de toque, que esse som só pode ser trocado nas configurações do aparelho (Android) e não pode ser trocado no iPhone.

#### Scenario: Explicação junto da escolha
- **WHEN** o dono abre a escolha de toque nas configurações
- **THEN** vê a explicação de que o toque escolhido vale com o painel aberto e que, com o celular bloqueado, toca o som de notificação do aparelho

### Requirement: Avisos no iPhone
No iPhone e no iPad, os avisos SHALL funcionar com o painel adicionado à Tela de Início, no iOS 16.4 ou mais novo. Fora do app instalado, o painel MUST mostrar no lugar do botão de ativar as instruções "Compartilhar → Adicionar à Tela de Início" e avisar que é preciso entrar de novo no app instalado.

#### Scenario: Safari do iPhone sem instalar
- **WHEN** o dono abre o painel no Safari do iPhone, fora do app instalado
- **THEN** vê as instruções para adicionar o painel à Tela de Início, sem botão de ativar avisos e sem erro

#### Scenario: App do painel instalado no iPhone
- **WHEN** o dono abre o painel pelo ícone da Tela de Início, entra com e-mail e senha e toca em ativar
- **THEN** o iOS pede permissão e, concedida, os avisos chegam como nos outros aparelhos

#### Scenario: Navegador sem suporte
- **WHEN** o navegador não tem suporte a notificações push
- **THEN** o painel informa que este aparelho não recebe avisos e que a agenda aberta continua se atualizando sozinha
