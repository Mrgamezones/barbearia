# home-page Specification

## Purpose
Define a estrutura da página inicial da barbearia (cabeçalho, hero, agendamento embutido, diferenciais, galeria e rodapé), seguindo a composição da referência visual com conteúdo próprio do negócio.

## Requirements

### Requirement: Ordem das seções
A página inicial SHALL apresentar, nesta ordem: cabeçalho, hero, painel de agendamento, faixa de diferenciais, galeria e rodapé. Cada seção navegável SHALL ter âncora própria (`#inicio`, `#servicos`, `#agendar`, `#galeria`, `#contato`).

#### Scenario: Navegação por âncora
- **WHEN** o visitante toca em "Galeria" no menu
- **THEN** a página rola suavemente até a galeria, sem que o cabeçalho fixo cubra o título da seção

### Requirement: Cabeçalho
O cabeçalho SHALL ficar fixo no topo com a marca à esquerda, navegação ao centro (Início, Serviços, Galeria, Contato) e botão contornado "Agendar" à direita. Abaixo de 1024 px, a navegação SHALL ir para um menu em tela cheia aberto por um botão acessível, mantendo "Agendar" visível.

#### Scenario: Menu no celular
- **WHEN** o visitante toca no botão de menu em um celular
- **THEN** abre um menu em tela cheia sobre fundo escuro com os itens de navegação, fechável pelo botão ou pela tecla Esc, com foco preso dentro do menu enquanto aberto

### Requirement: Hero
O hero SHALL mostrar a foto da barbearia em sangria com gradiente escuro, um eyebrow com três palavras de valor separadas por "•", um título serifado em duas linhas (a segunda em dourado), um subtítulo curto e o botão sólido "Agendar agora" que leva ao painel de agendamento. Todos os textos SHALL ser próprios e editáveis nas configurações da barbearia.

#### Scenario: Botão do hero
- **WHEN** o visitante toca em "Agendar agora"
- **THEN** a página rola até o painel de agendamento e o foco vai para a primeira etapa

#### Scenario: Hero no celular
- **WHEN** a página é aberta em 360 px de largura
- **THEN** a foto ocupa o fundo com o gradiente reforçado na base, e título, subtítulo e botão ficam legíveis sobre ela

### Requirement: Painel de agendamento embutido
A página inicial SHALL conter o painel de agendamento completo (o mesmo de `/agendar`), sobreposto ao fim do hero, com título "Agende seu horário" sublinhado por um traço dourado curto e o horário de atendimento vindo das configurações. Concluir um agendamento pela home MUST ter o mesmo resultado que concluir por `/agendar`.

#### Scenario: Horário de atendimento exibido
- **WHEN** o horário de funcionamento é terça a sábado das 09:00 às 19:00
- **THEN** o painel exibe, com ícone de relógio, "Atendimento — TER–SÁB: 09h às 19h"

### Requirement: Layout do painel por largura
No desktop (≥ 1024 px), o painel SHALL mostrar o stepper e quatro colunas lado a lado: Serviço | Data e hora (calendário mensal e grade de horários em 3 colunas) | Seus dados (com o cartão "Seu barbeiro") | Resumo (com total em dourado e botão confirmar). Abaixo de 1024 px, SHALL mostrar uma etapa por vez, com o resumo fixo no rodapé da tela.

#### Scenario: Desktop
- **WHEN** o painel é exibido em 1280 px de largura
- **THEN** as quatro colunas ficam visíveis, e a etapa ativa do stepper é atualizada conforme o cliente preenche serviço, horário e dados

#### Scenario: Celular
- **WHEN** o painel é exibido em 390 px de largura
- **THEN** apenas a etapa atual aparece, com botão "Continuar", e o rodapé fixo mostra a duração, o total e a quantidade de serviços

### Requirement: Cartão do barbeiro
O painel SHALL exibir um cartão informativo "Seu barbeiro", com foto, nome e uma frase de apresentação vindos das configurações, sem seleção, notas ou avaliações.

#### Scenario: Barbeiro sem foto cadastrada
- **WHEN** não há foto do barbeiro cadastrada
- **THEN** o cartão mostra um avatar com as iniciais do nome sobre fundo de cartão e borda dourada

### Requirement: Faixa de diferenciais
A página SHALL exibir quatro diferenciais com ícone dourado em traço, título e uma linha de descrição: Agendamento rápido, Profissional experiente, Ambiente premium e Lembretes automáticos. Em telas estreitas, SHALL ser exibidos em grade de 2 colunas ou lista.

#### Scenario: Diferenciais no desktop
- **WHEN** a faixa é exibida em 1280 px de largura
- **THEN** os quatro itens aparecem em uma linha, separados por divisórias verticais sutis

### Requirement: Galeria
A página SHALL exibir uma galeria de 6 a 12 fotos de cortes e do ambiente, em grade responsiva, com carregamento preguiçoso, texto alternativo e ampliação em tela cheia navegável por teclado e gestos.

#### Scenario: Ampliar foto
- **WHEN** o visitante toca em uma foto da galeria
- **THEN** ela abre ampliada em tela cheia com botões anterior, próximo e fechar, e Esc fecha a visualização

### Requirement: Rodapé
O rodapé SHALL ter colunas com: marca e frase curta com ícones de Instagram e WhatsApp; Navegação; Serviços (os ativos, até 5, e "Outros serviços"); Contato (telefone, e-mail, endereço com link para mapa); e Horário de funcionamento por dia. Também SHALL ter a linha final com o copyright do ano atual e o link da política de privacidade. Todos os dados SHALL vir das configurações e do catálogo.

#### Scenario: Domingo fechado
- **WHEN** o domingo está marcado como fechado no horário de funcionamento
- **THEN** o rodapé exibe "Domingo — Fechado"

#### Scenario: Rodapé no celular
- **WHEN** o rodapé é exibido em 360 px de largura
- **THEN** as colunas ficam empilhadas, sem rolagem horizontal
