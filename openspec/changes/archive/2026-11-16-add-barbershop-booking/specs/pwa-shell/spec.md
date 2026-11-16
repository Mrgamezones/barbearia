# Spec Delta

## Purpose

Garante que o site seja instalável como app, funcione de forma básica sem conexão e siga um layout minimalista, acessível e mobile-first.

## ADDED Requirements

### Requirement: Instalabilidade
O site SHALL atender aos critérios de instalação de PWA (manifest com nome, ícones 192/512 e maskable, cor de tema, display standalone, service worker registrado e HTTPS).

#### Scenario: Instalar no Android
- **WHEN** o cliente abre o site no Chrome Android
- **THEN** o navegador oferece "Instalar app" e o app abre em modo standalone com o nome e ícone da barbearia

#### Scenario: Instruções no iOS
- **WHEN** o cliente abre o site no Safari iOS fora do modo instalado
- **THEN** o site pode mostrar uma dica discreta de "Compartilhar → Adicionar à Tela de Início", que pode ser dispensada

### Requirement: Comportamento offline
O site SHALL exibir offline a página inicial, o catálogo de serviços já visitado e uma página "sem conexão"; agendar, cancelar e o painel MUST exigir conexão e informar isso claramente.

#### Scenario: Sem conexão ao agendar
- **WHEN** o cliente está offline e tenta abrir a etapa de horários
- **THEN** vê a mensagem de que é preciso estar conectado para ver horários livres

### Requirement: Layout minimalista e responsivo
A interface SHALL ser mobile-first, sem rolagem horizontal a partir de 320 px de largura, com paleta neutra (preto, branco, cinzas e uma cor de destaque), uma família tipográfica e no máximo uma ação principal por tela no fluxo de agendamento.

#### Scenario: Tela pequena
- **WHEN** o site é aberto em uma tela de 320 px de largura
- **THEN** todo o conteúdo cabe na largura sem rolagem horizontal

### Requirement: Acessibilidade
A interface MUST ter contraste mínimo WCAG AA, navegação completa por teclado com foco visível, rótulos em todos os campos e alvos de toque de no mínimo 44×44 px.

#### Scenario: Navegação por teclado
- **WHEN** um usuário percorre o fluxo de agendamento apenas com o teclado
- **THEN** consegue selecionar serviços, data, horário, preencher dados e confirmar, sempre vendo qual elemento está em foco

### Requirement: Tema claro e escuro
O site SHALL seguir a preferência de tema do sistema operacional (claro ou escuro).

#### Scenario: Sistema em modo escuro
- **WHEN** o dispositivo está em modo escuro
- **THEN** o site é exibido com o tema escuro mantendo o contraste AA
