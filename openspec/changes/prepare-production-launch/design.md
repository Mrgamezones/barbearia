# Design

## Context

Veja proposal.md (Why). Estado em 2026-11-16:

- **Git:** `main` em `3fa86be`, igual a `origin/main` (GitHub `Mrgamezones/barbearia`). Cerca de 120 arquivos de `add-multi-shop-tenancy` estão sem commit.
- **CI:** `.github/workflows/ci.yml` roda lint, tsc, testes unitários, `supabase test db` e o E2E a cada push na `main`. Localmente tudo passa (175 testes unitários, 145 de banco, 122 E2E). O CI no GitHub ainda não rodou com essa versão.
- **`next.config.ts`:** `output: "standalone"` vale para todos os builds. O Netlify define `NETLIFY=true` nos builds dele.
- **Changes abertas:**

  | Change | Pendente | Situação real |
  |---|---|---|
  | `add-netlify-deploy` | 4.1, 4.2, 4.3 (primeiro deploy) | substituídas pelo grupo 4 desta change |
  | `add-barbershop-booking` | 7.5 (push no service worker) | já existe em `app/sw.ts`, coberto por `e2e/push.spec.ts` |
  | | 7.6 (Vercel Cron) | superada pelo `pg_cron` do guia do Netlify |
  | | 8.2 (E2E ponta a ponta em CI) | coberta por `e2e/admin-journey.spec.ts`; falta só ver o CI verde |
  | | 8.3 (deploy na Vercel) | superada pelo Netlify |
  | `add-whatsapp-notifications` | 6.1 (suíte completa) | satisfeita localmente |
  | | 6.2 (teste com credenciais reais da Meta) | depende de conta da Meta |
  | `add-sales-handbook-pdf` | 5.4 (apresentar o PDF ao responsável) | não bloqueia o deploy |
  | `add-multi-shop-tenancy` | 7.1 (dados reais da Demir) | entra no grupo 5 desta change |

- **Specs:** `openspec/specs/` só tem `container-runtime` e `mobile-device-simulation`. `netlify-deployment` existe apenas no delta de `add-netlify-deploy`. Os deltas de agendamento, painel e PWA também ainda não foram para os specs principais.

## Goals / Non-Goals

**Goals:**
- O primeiro deploy funciona de primeira, sem depender do item de "Problemas comuns" sobre `standalone`.
- Um roteiro único e atualizado para o primeiro deploy, no lugar das tasks 4.x antigas.
- As changes antigas ficam arquivadas e os specs principais refletem o sistema atual.

**Non-Goals:**
- Ligar e-mail (Resend) e WhatsApp (Meta) de verdade. Continuam opcionais e podem ser ligados depois só com variáveis de ambiente.
- Automatizar o deploy pelo GitHub Actions: o Netlify já publica a cada push.
- Reescrever os specs de agendamento, painel e PWA para o modelo de várias barbearias. Isso fica para uma change própria, depois do arquivamento (veja a decisão 3).

## Decisions

1. **`output: process.env.NETLIFY ? undefined : "standalone"`.** Netlify, Docker e build local seguem iguais, exceto pela saída. É a correção que o próprio guia já indica como plano B.
   *Alternativa descartada:* tirar o `standalone` de vez. Quebraria o `Dockerfile` (`COPY .next/standalone`) e a capability `container-runtime`.

2. **Ordem de arquivamento.**
   1. `add-barbershop-booking`
   2. `add-premium-visual-identity`
   3. `add-whatsapp-notifications`
   4. `add-netlify-deploy`
   5. `add-multi-shop-tenancy`
   6. esta change

   O motivo da ordem: o delta de `add-premium-visual-identity` modifica `pwa-shell`, que só passa a existir depois que `add-barbershop-booking` é arquivada (o `openspec validate` avisou isso). Do mesmo jeito, esta change modifica `netlify-deployment`, que só existe depois de `add-netlify-deploy`.

   As tasks não feitas das changes antigas não são marcadas como feitas. Cada uma recebe uma nota "substituída por …" ou "superada por …" e a change é arquivada aceitando o aviso de tasks incompletas. O `add-sales-handbook-pdf` fica fora: não é pré-requisito do deploy.

   *Alternativa descartada:* editar `add-netlify-deploy` em vez de criar esta change. Misturaria o histórico de quando o deploy foi planejado (barbearia única) com o modelo atual.

3. **Specs antigos com rotas `/agendar` e `/admin`.** Ao arquivar, os specs principais de `appointment-booking`, `admin-panel` e `pwa-shell` vão citar as rotas antigas. A change `add-multi-shop-tenancy` define as rotas novas em `shop-tenancy`. Para não bloquear o deploy, esta change só registra a revisão como follow-up (uma change `update-specs-for-multi-shop`). O comportamento real está coberto pelos testes.

4. **O commit vem antes de qualquer conta externa.** O Netlify publica o que estiver no GitHub. Commitar, enviar e ver o CI verde primeiro garante que o primeiro deploy já sai na versão de várias barbearias.

5. **Ordem do primeiro deploy**, seguindo `docs/deploy-netlify.md`:
   1. domínio;
   2. Supabase (`db push`, `production-setup.example.sql`, Auth URLs);
   3. Netlify (variáveis antes do primeiro deploy);
   4. `pg_cron`;
   5. cadastro da Demir;
   6. checklist.

   O domínio vem primeiro porque `NEXT_PUBLIC_SITE_URL`, as URLs do Auth e o `pg_cron` usam o endereço final. Sem domínio comprado, dá para publicar no `*.netlify.app` e trocar depois (passo 5 do guia), mas isso faz repetir três configurações.

## Risks / Trade-offs

- [O CI do GitHub falhar por diferença de ambiente (Linux, sem cache)] → A task 1.2 olha o resultado antes de criar qualquer conta. Se falhar, corrige antes de seguir.
- [O Supabase gratuito pausar após 7 dias sem acesso] → Durante o lançamento, os acessos de clientes e do painel mantêm o projeto ativo. Antes de cobrar das barbearias, migrar para o plano Pro (fica no follow-up).
- [`NEXT_PUBLIC_*` cadastradas depois do primeiro deploy] → O guia manda cadastrar antes. Se esquecer, basta um "Deploy project without cache".
- [Arquivar com tasks incompletas esconder trabalho real] → Cada task não feita recebe uma nota dizendo onde o trabalho continua (esta change, ou "superada").

## Migration Plan

Não há dados a migrar: a produção começa vazia. Rollback depois do deploy: no Netlify, **Deploys → publicar o deploy anterior**. No banco, só com migration nova.

## Open Questions

- ~~Nome do domínio~~ Decidido em 2026-11-16: `meucorte.site` (registrado fora do registro.br, por ser `.site`). A task 3.1 confere se ele já responde no DNS.
- Dados da Demir Barbershop listados em `add-multi-shop-tenancy` (dias, pausa, durações, bairro, cidade, UF, CEP, WhatsApp, Instagram, barbeiro e e-mail do dono).
