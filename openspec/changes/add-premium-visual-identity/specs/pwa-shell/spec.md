# Spec Delta

## MODIFIED Requirements

### Requirement: Layout minimalista e responsivo
A interface SHALL ser mobile-first, sem rolagem horizontal a partir de 320 px de largura, seguindo a capability `visual-identity` (paleta escura e dourada, serifada nos títulos e sans-serif no texto). No fluxo de agendamento SHALL haver no máximo uma ação principal por tela abaixo de 1024 px; no desktop, as etapas podem aparecer lado a lado.

#### Scenario: Tela pequena
- **WHEN** o site é aberto em uma tela de 320 px de largura
- **THEN** todo o conteúdo cabe na largura sem rolagem horizontal

#### Scenario: Desktop
- **WHEN** o fluxo de agendamento é aberto em 1280 px de largura
- **THEN** as etapas aparecem lado a lado e há um único botão dourado sólido de confirmação

## REMOVED Requirements

### Requirement: Tema claro e escuro
**Reason**: A identidade visual adotada a partir da referência é escura e premium, com tema único; ver `visual-identity` › "Paleta escura e dourada".
**Migration**: Não implementar alternância por `prefers-color-scheme`. Os tokens existem apenas no tema escuro.
