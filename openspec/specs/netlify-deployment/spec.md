# netlify-deployment Specification

## Purpose
Permite publicar o site da barbearia no Netlify, ligado a um projeto Supabase de produção, com lembretes funcionando e sem dados de teste no ar.

## Requirements

### Requirement: Build de produção no Netlify
O repositório SHALL conter a configuração de build do Netlify, e o build de produção MUST concluir sem erro a partir de um clone limpo, gerando o service worker do PWA.

#### Scenario: Deploy a partir do repositório
- **WHEN** o site é ligado ao repositório no Netlify sem nenhuma configuração de build feita no painel e as variáveis obrigatórias estão definidas
- **THEN** o deploy termina com sucesso e o site publicado serve `/sw.js` e `/manifest.webmanifest`

#### Scenario: Build local igual ao do Netlify
- **WHEN** o desenvolvedor roda `npm run build` com as variáveis de produção
- **THEN** o build termina com código 0

### Requirement: Configuração só por variáveis de ambiente
Toda URL, chave e segredo de produção MUST vir de variáveis de ambiente do Netlify; nenhum segredo SHALL ser versionado, e chaves de servidor MUST NOT ser expostas ao navegador.

#### Scenario: Chave de serviço fora do navegador
- **WHEN** o código JavaScript entregue ao navegador do site publicado é inspecionado
- **THEN** ele não contém o valor de `SUPABASE_SERVICE_ROLE_KEY`, `VAPID_PRIVATE_KEY`, `CRON_SECRET`, `RESEND_API_KEY` nem `WHATSAPP_TOKEN`

#### Scenario: Variável obrigatória ausente
- **WHEN** o guia de deploy é seguido
- **THEN** ele lista cada variável obrigatória e opcional, onde obter o valor e o que acontece se a opcional ficar vazia

### Requirement: Dados iniciais de produção sem dados de teste
O banco de produção SHALL receber as migrações e uma configuração inicial (dados da barbearia, horários e serviços de partida) suficiente para o site e o painel funcionarem, e MUST NOT conter o administrador local de teste nem agendamentos de exemplo.

#### Scenario: Primeiro acesso ao site publicado
- **WHEN** as migrações e a configuração inicial foram aplicadas e o site é aberto
- **THEN** a página inicial mostra o nome da barbearia, a página de serviços lista os serviços e a tela de configurações do painel salva alterações

#### Scenario: Admin de teste não existe em produção
- **WHEN** alguém tenta entrar no painel publicado com `admin@barbearia.local` / `admin-local-123`
- **THEN** o login é recusado

### Requirement: Administrador de produção
O guia SHALL descrever como criar o administrador do painel em produção com e-mail e senha escolhidos pelo responsável, sem gravar a senha no repositório.

#### Scenario: Login do dono
- **WHEN** o administrador foi criado conforme o guia e entra em `/admin/login` no site publicado
- **THEN** o painel abre a agenda do dia

### Requirement: Lembretes periódicos em produção
O disparo dos lembretes SHALL ser executado a cada 15 minutos contra o site publicado, autenticado pelo segredo `CRON_SECRET`; chamadas sem o segredo correto MUST ser recusadas.

#### Scenario: Disparo agendado
- **WHEN** o agendamento está ativo e passam 15 minutos
- **THEN** a rota de lembretes do site publicado recebe uma chamada autorizada e responde com o resumo do envio

#### Scenario: Chamada sem segredo
- **WHEN** alguém chama `/api/cron/reminders` do site publicado sem o header correto
- **THEN** a resposta é 401 e nenhum lembrete é enviado

### Requirement: Autenticação ligada ao domínio publicado
O guia SHALL incluir a configuração da URL do site e das URLs de redirecionamento do Auth do Supabase com o domínio do Netlify (e o domínio próprio, se houver), e a variável `NEXT_PUBLIC_SITE_URL` MUST ser o mesmo endereço.

#### Scenario: Links nos avisos
- **WHEN** um agendamento é feito no site publicado
- **THEN** o link "ver ou cancelar agendamento" enviado ao cliente aponta para o domínio publicado, não para `localhost`

### Requirement: Verificação pós-deploy
O guia SHALL terminar com uma lista de verificação do site publicado cobrindo agendamento, cancelamento pelo link, login do painel, instalação como app e disparo dos lembretes.

#### Scenario: Conferência após publicar
- **WHEN** o responsável segue a lista de verificação depois do primeiro deploy
- **THEN** cada item tem uma ação e o resultado esperado, e um agendamento de teste feito na conferência é cancelado no fim
