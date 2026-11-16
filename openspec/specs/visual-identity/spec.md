# visual-identity Specification

## Purpose
Define a identidade visual escura e dourada da barbearia (cores, tipografia, espaçamento, marca e componentes) aplicada de forma consistente a todas as telas do site, do painel e do PWA.

## Requirements

### Requirement: Paleta escura e dourada
A interface SHALL usar tema escuro único com esta paleta: fundo `#0B0B0C`, superfície `#141416`, cartão `#1B1B1E`, borda `#2A2A2E`, texto `#F4F1EA`, texto secundário `#A39F97`, dourado `#C8A165` e dourado hover `#D8B57E`. Cores fora da paleta MUST ficar restritas a estados de erro e sucesso.

#### Scenario: Preferência de sistema clara
- **WHEN** o dispositivo está em modo claro
- **THEN** o site continua exibido no tema escuro

#### Scenario: Contraste
- **WHEN** qualquer texto é exibido sobre fundo, superfície, cartão ou botão dourado
- **THEN** a razão de contraste atende WCAG AA (4,5:1 para texto normal, 3:1 para texto grande)

### Requirement: Uso do dourado
O dourado SHALL ser usado apenas para ação principal, item selecionado, etapa ativa, ícones de destaque, rótulos "eyebrow", a segunda linha do título do hero e valores totais. Cada tela MUST ter no máximo uma ação principal com botão dourado sólido.

#### Scenario: Seleção de serviço
- **WHEN** o cliente seleciona um serviço
- **THEN** o cartão ganha borda dourada e marcador dourado preenchido com check, e os não selecionados mantêm borda neutra e marcador vazio

### Requirement: Tipografia
Títulos, marca e números de destaque SHALL usar uma serifada de alto contraste; textos, rótulos, botões e formulários SHALL usar uma sans-serif. Rótulos "eyebrow" e itens de navegação SHALL usar sans-serif em caixa alta com espaçamento entre letras ampliado.

#### Scenario: Título do hero
- **WHEN** a página inicial é exibida
- **THEN** o título aparece em serifada, em duas linhas, com a segunda linha em dourado, e acima dele há um eyebrow em caixa alta dourada

#### Scenario: Fontes indisponíveis
- **WHEN** as fontes web não carregam
- **THEN** o texto é exibido imediatamente com fontes de fallback de métricas compatíveis, sem texto invisível

### Requirement: Escala de espaçamento e forma
Espaçamentos SHALL seguir múltiplos de 4 px; containers SHALL ter largura máxima de 1200 px com margem lateral mínima de 16 px; cartões e botões SHALL ter cantos de 8 a 12 px; ícones SHALL ser de traço fino, sem preenchimento, exceto marcadores de seleção.

#### Scenario: Margem lateral no celular
- **WHEN** o site é exibido em 360 px de largura
- **THEN** nenhum conteúdo encosta nas bordas: há pelo menos 16 px de margem lateral

### Requirement: Marca própria
O site SHALL exibir uma marca original composta por ícone de tesoura em traço dourado e o nome configurado da barbearia em serifada caixa alta (em duas linhas quando o nome tiver mais de uma palavra). O site MUST NOT reproduzir nome, slogan, textos, fotos ou logotipo da imagem de referência.

#### Scenario: Nome alterado no painel
- **WHEN** o administrador altera o nome da barbearia nas configurações
- **THEN** a marca no cabeçalho, no rodapé, no título das páginas e no nome do PWA passa a usar o novo nome

### Requirement: Componentes base
O sistema SHALL ter variantes únicas de: botão sólido dourado (texto escuro, caixa alta), botão contornado dourado, cartão selecionável, campo de formulário em superfície escura com borda dourada no foco, stepper numerado, chip de horário e cartão de diferencial. Todos MUST ter estados hover, foco visível, desabilitado e selecionado quando aplicável.

#### Scenario: Foco por teclado
- **WHEN** um usuário navega por teclado até um chip de horário
- **THEN** o chip exibe anel de foco visível distinto do estado selecionado

### Requirement: Identidade em todas as telas
O painel administrativo, a página do link de gerenciamento, as páginas de erro e offline, o manifest e os ícones do PWA SHALL seguir a mesma paleta, tipografia e marca.

#### Scenario: App instalado
- **WHEN** o cliente abre o PWA instalado
- **THEN** a tela de abertura e a barra de status usam o fundo `#0B0B0C` e o ícone mostra a tesoura dourada sobre preto

### Requirement: Imagens com licença
Fotos exibidas no site MUST ter licença que permita uso comercial ou ser da própria barbearia, e SHALL ter texto alternativo descritivo; fotos decorativas sob texto SHALL ter sobreposição escura que garanta o contraste do texto.

#### Scenario: Texto sobre a foto do hero
- **WHEN** o hero é exibido em qualquer largura
- **THEN** o título e o subtítulo mantêm contraste AA graças ao gradiente escuro sobre a foto
