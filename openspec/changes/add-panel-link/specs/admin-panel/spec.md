## ADDED Requirements

### Requirement: Login identifica a barbearia
Quando a tela de login for aberta a caminho do painel de uma barbearia existente (`next=/painel/<slug>`), ela SHALL mostrar o nome dessa barbearia na marca e no título. Com `next` ausente, de outra rota ou de um slug inexistente, SHALL mostrar a marca genérica "Agendamento online" e o título "Entrar", como hoje.

#### Scenario: Login vindo do painel da barbearia
- **WHEN** alguém abre `/painel/login?next=/painel/demir-barbershop`
- **THEN** a tela mostra "Demir Barbershop" e o título "Entrar no painel da Demir Barbershop"

#### Scenario: Slug inexistente
- **WHEN** alguém abre `/painel/login?next=/painel/nao-existe`
- **THEN** a tela mostra a marca genérica "Agendamento online" e o título "Entrar"
