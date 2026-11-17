# Spec Delta

## MODIFIED Requirements

### Requirement: Instalabilidade
O site SHALL atender aos critérios de instalação de PWA (manifest com nome, ícones 192/512 e maskable, cor de tema, display standalone, service worker registrado e HTTPS). O painel de cada barbearia SHALL ser instalável como um app separado do app do cliente, com nome próprio, abrindo na agenda da barbearia e restrito às páginas do painel (`/painel/`), inclusive a tela de login.

#### Scenario: Instalar no Android
- **WHEN** o cliente abre o site no Chrome Android
- **THEN** o navegador oferece "Instalar app" e o app abre em modo standalone com o nome e ícone da barbearia

#### Scenario: Instruções no iOS
- **WHEN** o cliente abre o site no Safari iOS fora do modo instalado
- **THEN** o site pode mostrar uma dica discreta de "Compartilhar → Adicionar à Tela de Início", que pode ser dispensada

#### Scenario: Instalar o painel
- **WHEN** o dono da Demir Barbershop adiciona `/painel/demir-barbershop` à Tela de Início ou instala pelo Chrome
- **THEN** o app abre em modo standalone na agenda da Demir, com o nome "Painel Demir Barbershop" (ou abreviado), separado do app de agendamento do cliente

#### Scenario: Instruções do painel no iOS
- **WHEN** o dono abre o painel no Safari iOS fora do modo instalado
- **THEN** o painel mostra a dica "Compartilhar → Adicionar à Tela de Início", que pode ser dispensada
