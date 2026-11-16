# Spec Delta

## MODIFIED Requirements

### Requirement: Build de produção no Netlify
O repositório SHALL conter a configuração de build do Netlify, e o build de produção MUST concluir sem erro a partir de um clone limpo, gerando o service worker do PWA. No Netlify, o build MUST NOT usar a saída `standalone`, que fica restrita à imagem Docker.

#### Scenario: Deploy a partir do repositório
- **WHEN** o site é ligado ao repositório no Netlify sem nenhuma configuração de build feita no painel e as variáveis obrigatórias estão definidas
- **THEN** o deploy termina com sucesso e o site publicado serve `/sw.js` e `/barbearia/demonstracao/manifest.webmanifest`

#### Scenario: Build local igual ao do Netlify
- **WHEN** o desenvolvedor roda `npm run build` com as variáveis de produção
- **THEN** o build termina com código 0

#### Scenario: Imagem Docker continua autocontida
- **WHEN** o build roda fora do Netlify (por exemplo, na imagem Docker)
- **THEN** ele gera `.next/standalone/server.js` como antes

### Requirement: Dados iniciais de produção sem dados de teste
O banco de produção SHALL receber as migrações e a barbearia de demonstração, suficientes para o domínio abrir um site funcionando. As barbearias de clientes SHALL entrar pelo comando de cadastro, uma por uma. O banco MUST NOT conter os donos locais de teste, a barbearia de teste nem agendamentos de exemplo.

#### Scenario: Primeiro acesso ao site publicado
- **WHEN** as migrações e a configuração inicial foram aplicadas e o domínio é aberto
- **THEN** ele redireciona para `/barbearia/demonstracao`, que mostra o nome, os serviços e o horário da demonstração

#### Scenario: Admin de teste não existe em produção
- **WHEN** alguém tenta entrar no painel publicado com `admin@barbearia.local` ou `dono-teste@barbearia.local` e a senha `admin-local-123`
- **THEN** o login é recusado

#### Scenario: Barbearia de teste não existe em produção
- **WHEN** alguém abre `/barbearia/barbearia-teste` no site publicado
- **THEN** a resposta é 404

### Requirement: Administrador de produção
O guia SHALL descrever como cadastrar cada barbearia com o login do dono (`scripts/create-shop.mjs`) e como dar acesso a outra pessoa ou trocar a senha (`scripts/create-admin.mjs`), com e-mail e senha escolhidos pelo responsável e sem gravar a senha no repositório.

#### Scenario: Login do dono
- **WHEN** a barbearia e o dono foram cadastrados conforme o guia e o dono entra em `/painel` no site publicado
- **THEN** o painel abre a agenda do dia em `/painel/<slug>` da barbearia dele

#### Scenario: Dono não vê outra barbearia
- **WHEN** o dono, logado, abre `/painel/demonstracao`
- **THEN** recebe "Acesso negado", sem nenhum dado da demonstração

### Requirement: Verificação pós-deploy
O guia SHALL terminar com uma lista de verificação do site publicado cobrindo:
- redirecionamento da raiz para a demonstração;
- site e agendamento de uma barbearia cadastrada;
- cancelamento pelo link;
- login do dono e acesso negado a outra barbearia;
- instalação como app;
- disparo dos lembretes.

#### Scenario: Conferência após publicar
- **WHEN** o responsável segue a lista de verificação depois do primeiro deploy
- **THEN** cada item tem uma ação e o resultado esperado, e um agendamento de teste feito na conferência é cancelado no fim
