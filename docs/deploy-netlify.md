# Deploy no Netlify

Passo a passo para publicar o site de **uma barbearia**. Para cada barbearia nova, repita tudo: cada cliente tem o próprio projeto no Supabase e o próprio site no Netlify (veja [Outra barbearia](#outra-barbearia)).

Tempo estimado na primeira vez: 1 hora. Nas próximas: 20 minutos.

## 1. O que ter em mãos

| Item | Obrigatório? | Para quê |
|---|---|---|
| Conta no [Netlify](https://app.netlify.com) | sim | hospedagem do site |
| Conta no [Supabase](https://supabase.com/dashboard) | sim | banco de dados e login do painel |
| Repositório no GitHub ou GitLab com este projeto | sim | o Netlify publica a partir dele, e publica de novo a cada `git push` |
| Dados da barbearia: nome, endereço, WhatsApp, nome do barbeiro, serviços (preço e duração), horários | sim | configuração inicial (dá para ajustar depois no painel) |
| E-mail e senha do dono | sim | acesso ao painel `/admin` |
| Domínio próprio e acesso ao DNS | não | sem ele, o endereço fica `https://nome.netlify.app` |
| Conta no [Resend](https://resend.com) com o domínio verificado | não | sem ela, os e-mails não são enviados (só aparecem no log) |
| Token e ID do número do WhatsApp na Meta | não | sem eles, as mensagens de WhatsApp não são enviadas (veja [whatsapp-templates.md](whatsapp-templates.md)) |

Na sua máquina: Node 22+, este projeto com `npm install` feito.

Se o projeto ainda não é um repositório git:

```bash
git init
git add .
git commit -m "Primeira versão"
# crie o repositório vazio no GitHub e siga as instruções dele, por exemplo:
git remote add origin https://github.com/SEU-USUARIO/barbearia.git
git push -u origin main
```

Os arquivos `.env*` já estão no `.gitignore`: nenhuma chave vai para o repositório.

## 2. Supabase de produção

### 2.1 Criar o projeto

1. No painel do Supabase: **New project**. Região **South America (São Paulo)**. Guarde a senha do banco.
2. Em **Project Settings → API Keys** anote:
   - **URL do projeto** (`https://xxxx.supabase.co`) — também em **Project Settings → Data API**;
   - na aba **Legacy API keys**: `anon` (pública) e `service_role` (secreta, nunca no navegador).
   - O **Project ref** é o `xxxx` da URL.

### 2.2 Criar as tabelas

```bash
npx supabase login
npx supabase link --project-ref SEU_PROJECT_REF
npx supabase db push
```

O `db push` aplica as migrações de `supabase/migrations`. Ele **não** roda o `seed.sql` (que tem o admin de teste) — e é isso que queremos.

### 2.3 Dados iniciais da barbearia

1. Abra `supabase/production-setup.example.sql`, troque os textos marcados com `TROCAR` (nome, endereço, WhatsApp no formato `+5511999999999`, barbeiro, e-mail) e, se quiser, os horários e serviços.
2. No Supabase: **SQL Editor → New query**, cole o conteúdo e clique em **Run**.

Pode rodar de novo sem duplicar nada. Tudo fica editável depois em `/admin/config`, `/admin/horarios` e `/admin/servicos`.

### 2.4 Criar o acesso do dono

Crie na raiz do projeto o arquivo `.env.production.local` (fica fora do git):

```bash
NEXT_PUBLIC_SUPABASE_URL=https://SEU_PROJECT_REF.supabase.co
SUPABASE_SERVICE_ROLE_KEY=chave-service_role
```

E rode:

```bash
node --env-file=.env.production.local scripts/create-admin.mjs email-do-dono@exemplo.com "senha com 8 ou mais caracteres"
```

Depois disso, pode apagar o `.env.production.local`. Para trocar a senha, rode o mesmo comando com a senha nova.

### 2.5 Endereço do site no login

Em **Authentication → URL Configuration**:

- **Site URL:** o endereço do site (ex.: `https://barbearia-modelo.netlify.app` ou o domínio próprio).
- **Redirect URLs:** o mesmo endereço seguido de `/**` (ex.: `https://barbearia-modelo.netlify.app/**`). Com domínio próprio, adicione os dois.

Se ainda não sabe o endereço do Netlify, volte aqui depois do passo 3.

## 3. Site no Netlify

### 3.1 Gerar as chaves que só você tem

```bash
npx web-push generate-vapid-keys        # par de chaves das notificações (pública e privada)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"   # CRON_SECRET
```

Não use os valores do `.env.example` em produção: são públicos.

### 3.2 Importar o projeto

1. No Netlify: **Add new project → Import an existing project**, escolha o GitHub/GitLab e o repositório.
2. Em **Project name**, dê o nome que vira o endereço (`barbearia-modelo` → `https://barbearia-modelo.netlify.app`).
3. As configurações de build vêm do `netlify.toml` (comando `npm run build`, pasta `.next`, Node 22). Não mude nada.
4. **Antes de clicar em Deploy**, abra **Add environment variables** e cadastre as variáveis da tabela abaixo. Se o primeiro deploy já tiver saído, cadastre em **Project configuration → Environment variables** e faça **Deploys → Trigger deploy → Deploy project without cache**.

Deixe cada variável com o escopo padrão (**All scopes**) e o mesmo valor em todos os contextos. Nas marcadas como **secreta**, ligue **Contains secret values**.

### 3.3 Variáveis de ambiente

| Variável | Obrigatória? | Onde obter | Se ficar vazia | Secreta? |
|---|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | sim | Supabase → URL do projeto | o site não abre | não (vai para o navegador) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | sim | Supabase → Legacy API keys → `anon` | o site não abre | não (vai para o navegador) |
| `SUPABASE_SERVICE_ROLE_KEY` | sim | Supabase → Legacy API keys → `service_role` | agendamento, lembretes e avisos falham | **sim** |
| `NEXT_PUBLIC_SITE_URL` | sim | endereço do site, sem `/` no fim | links das mensagens apontam para `localhost` | não |
| `BUSINESS_TIMEZONE` | não | `America/Sao_Paulo` (ou o fuso da barbearia) | usa `America/Sao_Paulo` | não |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | sim | chave pública do passo 3.1 | o botão "Ativar lembrete" não funciona | não (vai para o navegador) |
| `VAPID_PRIVATE_KEY` | sim | chave privada do passo 3.1 | lembretes por notificação falham | **sim** |
| `VAPID_SUBJECT` | sim | `mailto:` + e-mail da barbearia | usa `mailto:contato@barbearia.local` | não |
| `CRON_SECRET` | sim | valor gerado no passo 3.1 | a rota de lembretes recusa tudo (nenhum lembrete sai) | **sim** |
| `RESEND_API_KEY` | não | Resend → API Keys | e-mails só vão para o log | **sim** |
| `EMAIL_FROM` | se usar e-mail | ex.: `Barbearia Modelo <agendamentos@seudominio.com.br>` (domínio verificado no Resend) | usa `onboarding@resend.dev`, que só envia para o dono da conta Resend | não |
| `WHATSAPP_TOKEN` | não | Meta → token permanente do usuário do sistema | mensagens de WhatsApp só vão para o log | **sim** |
| `WHATSAPP_PHONE_NUMBER_ID` | não | Meta → WhatsApp → Configuração da API | idem | não |
| `WHATSAPP_API_VERSION` | não | — | usa `v23.0` | não |
| `WHATSAPP_TEMPLATE_LANG` | não | — | usa `pt_BR` | não |

Não cadastre no Netlify as variáveis do ambiente Docker local: `SUPABASE_INTERNAL_URL`, `SUPABASE_ANON_KEY`, `SITE_URL`, `VAPID_PUBLIC_KEY`, `EMAIL_TRANSPORT`, `SMTP_*`. `ENABLE_STYLE_GUIDE` também fica de fora (a página `/estilo` é só para desenvolvimento).

As variáveis `NEXT_PUBLIC_*` entram no código **durante o build**. Mudou alguma? Faça um novo deploy (**Trigger deploy**).

### 3.4 Primeiro deploy

Clique em **Deploy**. Leva de 3 a 6 minutos. Se o deploy falhar, veja [Problemas comuns](#problemas-comuns).

Faça o passo 2.3 **antes** do primeiro deploy: a página inicial é montada no build com os dados do banco. Se o banco estiver vazio nesse momento, a home aparece sem nome até o próximo deploy ou por até 5 minutos.

## 4. Lembretes automáticos (a cada 15 minutos)

Recomendado: agendar no próprio Supabase.

1. Abra `supabase/cron-reminders.example.sql`.
2. Troque `https://SEU-SITE.netlify.app` pelo endereço do site e `SEU_CRON_SECRET` pelo mesmo `CRON_SECRET` cadastrado no Netlify.
3. Cole no **SQL Editor** do Supabase e clique em **Run**.

Para conferir (depois de 15 minutos):

```sql
select status, return_message, start_time from cron.job_run_details order by start_time desc limit 5;
select status_code, content from net._http_response order by created desc limit 5;
```

`status = succeeded` e `status_code = 200` indicam que está funcionando.

**Alternativa (não incluída no projeto):** uma função agendada do Netlify (`netlify/functions/reminders.mts` com `schedule: "*/15 * * * *"`) que chama a mesma rota com o header `Authorization: Bearer CRON_SECRET`. Funções agendadas só rodam no deploy publicado e têm tempo de execução curto. Use só se não puder usar o `pg_cron`.

## 5. Domínio próprio (opcional)

1. Netlify → **Domain management → Add a domain**, digite o domínio e siga as instruções de DNS. O certificado HTTPS sai sozinho.
2. Troque `NEXT_PUBLIC_SITE_URL` para o domínio novo e faça um novo deploy.
3. Supabase → **Authentication → URL Configuration**: troque o **Site URL** e adicione o domínio em **Redirect URLs**.
4. Troque a URL no agendamento dos lembretes. Remova o agendamento antigo e crie de novo:

```sql
select cron.unschedule('lembretes-barbearia');
-- depois rode de novo o cron-reminders.example.sql com a URL nova
```

## 6. Conferência depois de publicar

Faça no celular, com o site publicado. Cada item tem a ação e o resultado esperado.

| # | Ação | Resultado esperado |
|---|---|---|
| 1 | Abra o site | home com o nome da barbearia, sem "TROCAR" nem "Barbearia Modelo" |
| 2 | Abra **Serviços** | serviços e preços da barbearia |
| 3 | Faça um agendamento de teste com seu nome e WhatsApp | tela "Agendamento confirmado!", com endereço `https://SEU-SITE/agendamento/...` |
| 4 | Se e-mail ou WhatsApp estiverem configurados, abra o link "Ver ou cancelar" da mensagem recebida | o link começa com o domínio publicado, não com `localhost` |
| 5 | Na página do agendamento, toque em **Ativar lembrete** e permita notificações | "Lembretes ativados: avisaremos 24 h e 2 h antes." |
| 6 | Entre em `/admin` com o e-mail e a senha do dono | agenda do dia; o agendamento de teste aparece na data marcada |
| 7 | Tente entrar em `/admin` com `admin@barbearia.local` / `admin-local-123` | login recusado |
| 8 | No celular, use **Adicionar à tela de início** (iPhone: Compartilhar → Adicionar à Tela de Início; Android: menu → Instalar app) | ícone da barbearia na tela, abre sem barra do navegador |
| 9 | No computador: `curl -i https://SEU-SITE/api/cron/reminders` | `401` e `{"error":"unauthorized"}` |
| 10 | `curl -H "Authorization: Bearer SEU_CRON_SECRET" https://SEU-SITE/api/cron/reminders` | `200` com `{"claimed":...,"sent":...}` |
| 11 | Depois de 15 minutos, rode as consultas do passo 4 | `succeeded` e `200` |
| 12 | Volte à página do agendamento de teste e toque em **Cancelar agendamento** → **Sim, cancelar** | status "Cancelado"; o horário volta a ficar livre |

## 7. Outra barbearia

Repita o guia com um **projeto Supabase novo** e um **site Netlify novo**, ligados ao **mesmo repositório**. Muda só o que é da barbearia: dados iniciais (passo 2.3), admin (2.4), endereço (2.5), chaves (3.1) e variáveis (3.3). Um `git push` atualiza o site de todos os clientes de uma vez.

No plano gratuito, o Supabase permite 2 projetos ativos por conta e pausa um projeto depois de 7 dias sem acesso. Para mais clientes, ou para evitar pausa, use o plano pago (ou uma organização por cliente).

## Problemas comuns

| Sintoma | Causa provável | O que fazer |
|---|---|---|
| Build falha com "Build interrompido: Supabase não configurado." | variáveis não cadastradas antes do build | cadastre (3.3) e faça **Deploy project without cache** |
| Build falha com "Build interrompido: Supabase inacessível em https://... (motivo)" | a verificação antes do build (`scripts/check-supabase.mjs`) não conseguiu falar com o Supabase: URL errada, projeto pausado ou ainda não criado | confira `NEXT_PUBLIC_SUPABASE_URL` e a anon key (3.3) e se o projeto está ativo no painel do Supabase; depois, novo deploy |
| Build falha com "Secrets scanning found secrets in build" | o Netlify achou o valor de uma variável no código gerado | se for uma `NEXT_PUBLIC_*`, ela já está liberada no `netlify.toml`; se for outra, confira se a chave secreta não foi cadastrada com nome `NEXT_PUBLIC_*` por engano |
| Build falha mencionando `output: standalone` | adaptador do Netlify e a opção usada pelo Docker | em `next.config.ts`, troque `output: "standalone"` por `output: process.env.NETLIFY ? undefined : "standalone"` |
| Home sem nome ou com dados antigos | banco vazio no momento do build | rode o passo 2.3 e espere 5 minutos, ou faça um novo deploy |
| Painel volta sempre para o login | Site URL / Redirect URLs do Supabase sem o domínio | passo 2.5 |
| Lembretes não saem | `pg_cron` não criado, URL ou `CRON_SECRET` diferentes do site | passo 4 e itens 10 e 11 da conferência |
| E-mail não chega | `RESEND_API_KEY` vazia ou `EMAIL_FROM` com domínio não verificado | verifique o domínio no Resend |

Desfazer um deploy ruim: Netlify → **Deploys**, escolha um deploy anterior que funcionava → **Publish deploy**.
