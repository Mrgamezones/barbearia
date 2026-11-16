# Proposal

## Why

O código de várias barbearias está pronto e testado localmente, mas o site ainda não está no ar. Um levantamento em 2026-11-16 encontrou o que falta, em três grupos:

1. **No repositório:**
   - O trabalho de várias barbearias (`add-multi-shop-tenancy`, cerca de 120 arquivos) não foi commitado nem enviado ao GitHub. O Netlify publica a partir do GitHub, então hoje publicaria a versão de barbearia única.
   - `next.config.ts` usa `output: "standalone"` (exigido pela imagem Docker). O guia do Netlify já marca isso como provável causa de falha no primeiro deploy.
   - Não há como ver o resultado do CI daqui (`gh` não está instalado). O último CI conhecido é anterior à mudança de rotas.
2. **No planejamento:** a change `add-netlify-deploy`, ainda não arquivada, tem as tasks do primeiro deploy (4.1 a 4.3) e um spec escrito para o modelo antigo: `/admin`, `business_settings`, `/manifest.webmanifest` na raiz e um projeto Supabase por barbearia. Seguir aquelas tasks hoje levaria a um deploy errado.
3. **Fora do código (depende do responsável):**
   - comprar o domínio;
   - criar o projeto Supabase de produção e o site no Netlify;
   - gerar as chaves;
   - ligar os lembretes;
   - cadastrar a Demir Barbershop com os dados confirmados.

## What Changes

- Build no Netlify sem `output: "standalone"`. O Docker continua com o build autocontido.
- Atualizar o spec `netlify-deployment` para o modelo de várias barbearias:
  - dados iniciais de produção = só a demonstração;
  - donos cadastrados por `scripts/create-shop.mjs` e `scripts/create-admin.mjs`, com acesso por `/painel`;
  - manifesto por barbearia;
  - conferência pós-deploy cobrindo o isolamento entre barbearias.
- Organizar as changes em andamento: substituir as tasks 4.x de `add-netlify-deploy` por esta change, fechar as tasks já cumpridas ou superadas das changes antigas e arquivá-las na ordem que o `openspec archive` aceita.
- Roteiro do primeiro deploy, passo a passo e com verificação, para fazer junto com o responsável: commit e CI, domínio, Supabase, Netlify, lembretes, cadastro da Demir e conferência final.
- Fora do escopo: e-mail (Resend) e WhatsApp (Meta) de verdade. O site funciona sem eles (as mensagens ficam só no log) e eles podem ser ligados depois, sem novo código.

## Capabilities

### New Capabilities
- Nenhuma.

### Modified Capabilities
- `netlify-deployment`: build no Netlify sem saída `standalone`; dados iniciais de produção; acesso dos donos; conferência pós-deploy no modelo de várias barbearias. Esse spec ainda está só na change `add-netlify-deploy`, então ela precisa ser arquivada antes desta (veja design.md, decisão 2).

## Impact

- **Código:** `next.config.ts` (uma linha) e um teste unitário da opção de build.
- **Planejamento:** `openspec/changes/add-netlify-deploy`, `add-barbershop-booking`, `add-whatsapp-notifications` e `add-multi-shop-tenancy` (tasks e arquivamento).
- **Documentação:** `docs/deploy-netlify.md` (tirar o item de "Problemas comuns" que vira padrão e ajustar o checklist).
- **Contas externas, criadas pelo responsável:** registro.br (domínio), Supabase (projeto de produção), Netlify (site).
- **Custos:**
  - domínio `.com.br`: cerca de R$ 40 por ano;
  - Netlify: plano gratuito;
  - Supabase: plano gratuito para o lançamento. O projeto pausa após 7 dias sem acesso; com clientes pagando, o plano Pro sai cerca de US$ 25 por mês.
