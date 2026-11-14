# Tasks

## 1. Build de produção

- [x] 1.1 Trocar o script `build` do `package.json` para `next build --webpack`; verificar que `npm run build` termina com código 0 usando as variáveis do `.env.local` e que `public/sw.js` é gerado
- [x] 1.2 Rodar `npm test`, `npm run lint` e `npx tsc --noEmit` depois da troca; verificar que passam como antes
- [x] 1.3 Criar `netlify.toml` (build `npm run build`, publish `.next`, `NODE_VERSION = "22"`, cabeçalhos de `/sw.js`) conforme a decisão 2; verificar com `npx netlify-cli build --offline` se o CLI estiver disponível, senão revisar contra a documentação do Netlify e anotar que a verificação real fica para o primeiro deploy (tarefa 4.3)

## 2. Banco de produção

- [x] 2.1 Criar `supabase/production-setup.example.sql` com `business_settings`, `business_hours` e `services` iguais ao seed, `on conflict do nothing` e campos para trocar marcados, sem `auth.users`, `auth.identities` e `admins`; verificar rodando `npx supabase db reset` local seguido de `delete` das três tabelas e do arquivo no banco local, e conferindo que home, serviços e salvar configurações funcionam
- [x] 2.2 Atualizar o comentário de `supabase/cron-reminders.example.sql` para citar Netlify e Vercel (`https://SEU-SITE.netlify.app/...`); verificar que o SQL continua igual fora dos comentários e da URL de exemplo

## 3. Guia de deploy

- [x] 3.1 Escrever `docs/deploy-netlify.md` (decisão 9): o que o responsável precisa fornecer, Supabase (projeto em `sa-east-1`, `login`/`link`/`db push`, SQL inicial, Auth URL Configuration), admin com `scripts/create-admin.mjs` e `.env.production.local`, Netlify (importar repositório, variáveis antes do primeiro deploy, novo deploy ao mudar `NEXT_PUBLIC_*`), lembretes com `pg_cron` e a alternativa da função agendada, domínio próprio, e como repetir para outra barbearia; verificar que cada comando citado existe no projeto ou na CLI instalada
- [x] 3.2 Incluir no guia a tabela de variáveis com todas as variáveis lidas pelo código (lista do design), marcando obrigatória/opcional, onde obter, efeito se vazia e se é só de servidor; verificar com busca por `process.env.` em `app/` e `lib/` que nenhuma variável usada ficou de fora
- [x] 3.3 Incluir no guia o checklist pós-deploy (spec "Verificação pós-deploy"): agendar, receber o link com o domínio publicado, cancelar pelo link, login do dono, login do admin de teste recusado, instalar como app, `curl` sem segredo → 401, `cron.job_run_details` com sucesso; verificar que cada item tem ação e resultado esperado
- [x] 3.4 Acrescentar ao README a seção "Deploy no Netlify" apontando para o guia e ajustar a linha do `npm run build` na tabela de comandos; verificar que os links relativos abrem os arquivos

## 4. Primeiro deploy (com o responsável)

- [ ] 4.1 Com o responsável: repositório git criado e enviado ao GitHub/GitLab, projeto Supabase de produção com migrações, SQL inicial e admin; verificar no painel do Supabase que as tabelas existem e que só o admin do dono está em `admins`
- [ ] 4.2 Com o responsável: site criado no Netlify, variáveis cadastradas e primeiro deploy; verificar que o deploy termina sem erro e que `/sw.js` e `/manifest.webmanifest` respondem 200 (se `output: "standalone"` causar erro, aplicar a saída da decisão 3 e repetir)
- [ ] 4.3 Ligar o `pg_cron` com a URL publicada e seguir o checklist do guia de ponta a ponta; verificar que todos os itens passam e que o agendamento de teste foi cancelado

## Workflow follow-up

- Arquivar a change depois do primeiro deploy conferido.
