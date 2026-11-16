# Tasks

## 1. E2E de contraste do hero

- [x] 1.1 Em `e2e/home.spec.ts` (teste "título e subtítulo com contraste AA sobre a foto"), trocar a espera de `document.images` por uma espera que só confira as imagens dentro de `data-testid="hero"` (`complete && naturalWidth > 0`), conforme a decisão 1; verificar com `npx playwright test e2e/home.spec.ts -g "contraste AA" --project=desktop --project=mobile` (Supabase local no ar) passando nos dois projetos
- [x] 1.2 Rodar o mesmo teste 5 vezes seguidas (`--repeat-each=5`) no projeto `mobile`; verificar que todas passam bem abaixo do timeout de 60 s

## 2. Verificação do Supabase antes do build

- [x] 2.1 Criar `scripts/check-supabase.mjs` (decisão 2): carregar `.env*` com `loadEnvConfig` de `@next/env`, resolver URL e chave com a mesma precedência de `lib/env.ts` (com comentário cruzado nos dois arquivos), fazer `GET <url>/rest/v1/` com `apikey` e timeout de 5 s, tratar status < 500 como acessível e, em caso de falha, imprimir uma mensagem em pt-BR com a URL e as dicas (`npm run docker:up`, `npx supabase start` ou as variáveis) e sair com código 1; exportar o resolvedor de URL/chave para teste; verificar com `node scripts/check-supabase.mjs` com o Supabase parado (código 1, mensagem única) e no ar (código 0)
- [x] 2.2 Adicionar `tests/unit/check-supabase.test.ts` cobrindo a precedência (`SUPABASE_INTERNAL_URL` antes de `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_ANON_KEY` antes de `NEXT_PUBLIC_SUPABASE_ANON_KEY`, barra final removida) e o caso sem variáveis; verificar com `npm test` passando
- [x] 2.3 Trocar o script `build` do `package.json` para `node scripts/check-supabase.mjs && next build --webpack`; verificar os cenários do spec "Build exige Supabase acessível": com o Supabase parado, `npm run build` falha em poucos segundos sem stack traces de `ECONNREFUSED`; com ele no ar, o build conclui e `public/sw.js` é gerado
- [x] 2.4 Atualizar a linha do `npm run build` na tabela de comandos do `README.md` e acrescentar em `docs/deploy-netlify.md` uma linha explicando a mensagem de falha da verificação; verificar que o texto cita o comando e a mensagem exatamente como o script os imprime
- [x] 2.5 Gerar a imagem com `npm run docker:up` (Supabase local no ar); verificar que o build da imagem passa pela verificação usando `SUPABASE_INTERNAL_URL` e que o site responde em http://localhost:3000

## 3. Suíte completa com Docker ligado

- [x] 3.1 Com o Supabase local no ar, rodar `npx tsc --noEmit`, `npm run lint`, `npm test` e `npx supabase test db`; verificar que tudo passa e corrigir dentro desta change qualquer falha nova, registrando cada correção como subtarefa aqui
- [x] 3.2 Rodar `npm run test:e2e` completo (desktop, mobile e admin); verificar que tudo passa. Se `e2e/visual.spec.ts` ficar instável pela mesma espera de imagens, aplicar a segunda parte da decisão 1 (rolar até o fim antes de esperar) e rodar de novo
  - [x] 3.2.1 Snapshot `e2e/visual.spec.ts-snapshots/painel-1280-desktop-win32.png` desatualizado: não tinha o checkbox de WhatsApp adicionado por `add-whatsapp-notifications`. Regenerado só esse arquivo e conferido visualmente que a única diferença é o checkbox; verificado com o teste passando
  - [x] 3.2.2 Observação: numa das rodadas, `booking-flow › caminho feliz` (mobile) falhou com "Esse horário acabou de ser ocupado", por colisão de horário sorteado entre testes paralelos (perto do fim do mês sobram poucos dias livres). Não é defeito do app; a rodada seguinte passou completa (108 passed, 38 skipped). Fica como possível melhoria futura do helper `chooseDateAndTime`
