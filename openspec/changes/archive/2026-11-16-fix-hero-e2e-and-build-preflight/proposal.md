# Proposal

## Why

Uma varredura completa em 2026-11-16 (typecheck, lint, 152 testes unitários e `npm run build`) passou, mas encontrou dois erros reais:

1. O E2E `home.spec.ts › hero › título e subtítulo com contraste AA sobre a foto` falha no projeto `mobile` por timeout de 60 s (último resultado em `test-results/.last-run.json`). O teste espera que **todas** as imagens da página estejam carregadas, mas as fotos da galeria usam `loading="lazy"` e ficam fora da tela, então nunca carregam.
2. Com o Supabase local desligado, `npm run build` imprime vários erros `ECONNREFUSED` ao revalidar `business_settings`, `services` e `business_hours`. O build só termina porque reaproveita o `.next/cache/fetch-cache` de builds anteriores. Assim, ele grava em silêncio dados antigos nas páginas pré-renderizadas. Num build limpo (Docker, CI ou máquina nova), a mesma situação derruba o build com um stack trace pouco claro.

## What Changes

- Corrigir o E2E de contraste do hero para esperar só as imagens do próprio hero, sem mexer no carregamento preguiçoso da galeria.
- Adicionar uma verificação antes do build: `npm run build` confere se a API do Supabase configurada responde. Se não responder, para logo com uma única mensagem em pt-BR que indica a URL tentada e como resolver (`npm run docker:up` / `npx supabase start` ou as variáveis de ambiente).
- **BREAKING (só local)**: um build com o Supabase inacessível, que hoje "passa" com dados antigos do cache, passa a falhar de propósito. O CI, o Docker e o Netlify já sobem o banco antes do build e não mudam.
- Rodar a suíte completa (E2E, `npx supabase test db`) com o Docker ligado, porque nesta varredura o Docker estava desligado, e corrigir dentro desta change qualquer falha que aparecer.

## Capabilities

### New Capabilities
- Nenhuma.

### Modified Capabilities
- `container-runtime`: novo requisito. O build de produção exige um Supabase acessível e falha com uma mensagem clara quando ele não responde.

## Impact

- `e2e/home.spec.ts`: espera de imagens restrita ao hero.
- `scripts/`: novo script de verificação usado pelo `npm run build`.
- `package.json`: o script `build` passa a chamar a verificação antes do `next build --webpack`.
- `Dockerfile` / `docker-compose.yml`: nenhuma mudança esperada, porque a verificação usa a mesma resolução de URL de `lib/env.ts` (`SUPABASE_INTERNAL_URL` antes de `NEXT_PUBLIC_SUPABASE_URL`).
- `README.md`: nota curta de que o build exige o Supabase no ar.
- Sem mudança de comportamento para clientes ou para o painel.
