# Spec Delta

## Purpose

Valida o site da barbearia em perfis emulados de Android e iOS, rodando em Docker, e entrega evidências visuais (relatório, screenshots e vídeos) de como o site se comporta em cada aparelho.

## ADDED Requirements

### Requirement: Perfis de aparelhos
A simulação SHALL executar em quatro perfis: Android Pixel 7 e Android Galaxy S9+ (motor Chromium) e iOS iPhone 15 e iOS iPhone SE (motor WebKit), com tamanho de tela, densidade de pixels, toque e user agent do aparelho, em português do Brasil e fuso America/Sao_Paulo.

#### Scenario: Execução nos quatro aparelhos
- **WHEN** a simulação é executada sem filtros
- **THEN** cada cenário roda uma vez em cada um dos quatro perfis e o relatório agrupa os resultados por aparelho

#### Scenario: Filtrar por plataforma
- **WHEN** o desenvolvedor executa a simulação apenas de iOS
- **THEN** somente os perfis iPhone 15 e iPhone SE são executados

### Requirement: Execução em container
A simulação MUST rodar inteiramente em container, contra o site rodando no ambiente Docker, sem exigir navegadores, Android SDK ou macOS na máquina do desenvolvedor.

#### Scenario: Comando final
- **WHEN** o ambiente está no ar e o desenvolvedor executa `npm run docker:mobile`
- **THEN** a simulação roda no container e termina com código 0 se todos os cenários passarem, ou diferente de 0 se algum falhar

### Requirement: Cenários simulados
Em cada aparelho a simulação SHALL cobrir: página inicial e serviços sem rolagem horizontal; agendamento completo por toque (serviços, data, horário, dados, confirmação); abertura do link de gerenciamento e cancelamento; aviso offline na etapa de horários; e login e agenda do painel.

#### Scenario: Agendamento no iPhone SE
- **WHEN** a simulação agenda Corte + Barba no perfil iPhone SE
- **THEN** o agendamento é confirmado, o link de gerenciamento abre os detalhes e o cancelamento libera o horário

#### Scenario: Offline no Pixel 7
- **WHEN** a simulação coloca o perfil Pixel 7 offline após visitar a home
- **THEN** a home continua exibida e a etapa de horários mostra o aviso de conexão necessária

### Requirement: Verificações de PWA na simulação
Nos perfis Android a simulação SHALL verificar que o manifest é válido e o service worker está ativo; nos perfis iOS SHALL verificar as meta tags de app web (ícone Apple, título e status bar) e que a dica de instalação aparece e pode ser dispensada.

#### Scenario: Service worker no Android
- **WHEN** a home é carregada no perfil Galaxy S9+
- **THEN** existe um service worker ativo controlando a página

### Requirement: Evidências geradas
Cada execução SHALL gerar um relatório HTML navegável, screenshots de página inteira das telas principais por aparelho e, em caso de falha, vídeo e trace do cenário, salvos em pasta do projeto ignorada pelo Git.

#### Scenario: Consultar resultado
- **WHEN** a simulação termina
- **THEN** o desenvolvedor abre o relatório pelo navegador do host e vê, por aparelho, os cenários, as screenshots e os vídeos das falhas

### Requirement: Modo visual
O ambiente SHALL oferecer um modo visual da simulação, acessível no navegador do host, que permita escolher o aparelho e o cenário, executar e assistir passo a passo.

#### Scenario: Assistir a simulação no iPhone 15
- **WHEN** o desenvolvedor executa `npm run docker:mobile:ui` e abre o endereço indicado
- **THEN** pode selecionar um cenário no perfil iPhone 15 e assistir à execução com a tela do aparelho

### Requirement: Isolamento dos dados de teste
A simulação MUST partir de um banco no estado do seed e MUST NOT depender da ordem de execução entre aparelhos; cada aparelho SHALL usar dados próprios (ex.: telefones distintos) para não esbarrar em limites ou conflitos.

#### Scenario: Aparelhos em paralelo
- **WHEN** os quatro perfis executam o agendamento ao mesmo tempo
- **THEN** todos concluem sem erro de horário ocupado ou de limite por cliente

### Requirement: Limitações declaradas
O relatório e o README MUST informar que a simulação é emulação de navegador e não substitui teste em aparelho real para instalação do PWA no iOS, notificações push e particularidades do Safari.

#### Scenario: Leitura do relatório
- **WHEN** o desenvolvedor abre o README na seção de simulação mobile
- **THEN** encontra a lista do que é e do que não é coberto pela emulação
