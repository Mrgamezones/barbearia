# Design

## Context

Veja proposal.md (Why) para os dois erros. Fatos relevantes do código atual:

- `e2e/home.spec.ts:90` espera `[...document.images].every((i) => i.complete)`. O hero usa `next/image` com `priority` (`components/home/Hero.tsx`), mas a galeria usa `loading="lazy"` (`components/home/Gallery.tsx:73`). No viewport do Pixel 7 as fotos da galeria ficam abaixo da dobra e nunca são pedidas. `e2e/visual.spec.ts:23` usa a mesma espera. Ele não falhou na última execução, provavelmente porque a captura de página inteira rola até as imagens, mas tem o mesmo risco.
- `lib/data/public.ts` envolve as três leituras públicas em `unstable_cache` (revalidate 300) e lança o erro do Supabase. Na pré-renderização de `/`, `/agendar`, `/servicos` e `/privacidade`, o Next serve a entrada antiga do `.next/cache/fetch-cache` e registra a falha da revalidação. Por isso o build local "passa".
- A URL usada pelo servidor vem de `publicEnv()` em `lib/env.ts`: `SUPABASE_INTERNAL_URL || NEXT_PUBLIC_SUPABASE_URL`, e a chave vem de `SUPABASE_ANON_KEY || NEXT_PUBLIC_SUPABASE_ANON_KEY`. O Dockerfile passa `SUPABASE_INTERNAL_URL`/`SUPABASE_ANON_KEY` como variáveis do build. O CI exporta as `NEXT_PUBLIC_*` a partir de `supabase status`.

## Goals / Non-Goals

**Goals:**
- O E2E do hero passa de forma estável no `desktop` e no `mobile`.
- Um build sem banco falha rápido, com uma mensagem só.

**Non-Goals:**
- Mudar o lazy load da galeria ou a estratégia ISR/`unstable_cache` das páginas públicas.
- Criar um fallback de dados padrão para builds sem banco, o que esconderia o problema.
- Concluir as tasks manuais pendentes de outras changes (deploy Netlify, testes com credenciais da Meta etc.). Elas não são erros de código.

## Decisions

1. **Espera restrita às imagens do hero.** Trocar a espera global por `hero.locator("img")` e conferir `complete && naturalWidth > 0` em cada uma (via `evaluateAll` dentro de `expect.poll` ou de `waitForFunction` com o elemento do hero). O teste mede contraste só sobre a foto do hero, então essa é a dependência real.
   *Alternativa descartada:* rolar a página para disparar o lazy load. Deixa o teste mais lento e mexe no `scrollY` que o próprio teste usa para recortar a captura.
   No `visual.spec.ts`, manter a espera global, porque a captura de página inteira precisa da galeria, mas rolar até o fim antes dela, para que a espera não dependa de sorte. Isso só será feito se a suíte completa mostrar instabilidade ali (task 3.2).

2. **Verificação antes do build em script Node separado (`scripts/check-supabase.mjs`)**, chamado no `build`: `node scripts/check-supabase.mjs && next build --webpack`.
   - Carrega `.env*` com `loadEnvConfig` de `@next/env` (já vem com o `next`, sem dependência nova), na mesma ordem que o Next usa.
   - Resolve URL e chave com a mesma precedência de `lib/env.ts`. A lógica é duplicada em poucas linhas, porque `lib/env.ts` é TypeScript e o script roda antes da compilação. Um comentário aponta para `lib/env.ts`.
   - Faz `GET <url>/rest/v1/` com o cabeçalho `apikey` e `AbortSignal.timeout(5000)`. Qualquer resposta HTTP abaixo de 500 conta como "no ar". Falha de rede, timeout ou 5xx imprime uma mensagem em pt-BR e sai com código 1.
   *Alternativas descartadas:* (a) verificar dentro de `next.config.ts`, que também roda no `next dev` e no `next start` e pode atrasar ou derrubar o dev server; (b) capturar o erro em `lib/data/public.ts`, que não impede os logs do próprio Next e misturaria a lógica de build com a de runtime.

3. **Sem opção para pular a verificação.** O projeto já assume banco no ar em todo build (CI, Docker e Netlify). Se surgir necessidade, uma variável `SKIP_SUPABASE_CHECK=1` pode ser adicionada depois sem mudar o spec.

## Risks / Trade-offs

- [O Kong do Supabase local responde 401/404 em `/rest/v1/` dependendo da versão] → Tratar qualquer status abaixo de 500 como serviço acessível. O objetivo é só detectar ECONNREFUSED ou timeout.
- [Build do Docker: o `host.docker.internal` pode demorar a resolver] → Timeout de 5 s. O `docker:up` já sobe o Supabase antes, então isso só pesa em caso de falha real.
- [Netlify: o primeiro deploy pode acontecer antes de o Supabase de produção existir] → A falha clara é o comportamento desejado. O guia `docs/deploy-netlify.md` já manda criar o Supabase antes. Acrescentar uma linha citando a mensagem.
- [Duplicar a precedência de variáveis em dois lugares] → Comentário cruzado nos dois arquivos e um teste unitário do resolvedor do script.

## Migration Plan

Não há migração de dados. Para reverter, basta voltar o script `build` do `package.json` para `next build --webpack`.
