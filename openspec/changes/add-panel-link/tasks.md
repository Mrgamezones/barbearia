# Tasks

## 1. Link no rodapé

- [x] 1.1 Em `components/site/SiteFooter.tsx`, adicionar na linha final, ao lado de "Política de privacidade", o link "Área do barbeiro" para `panelPath(slug)` com `rel="nofollow"` e a mesma classe de toque mínimo (44 px); verificar em 360 px que a linha final continua sem rolagem horizontal
- [x] 1.2 Em `components/site/SiteFooter.test.tsx`, testar que o link existe com o texto "Área do barbeiro", `href` `/painel/<slug>` e `rel` contendo `nofollow`; verificar com `npm test`

## 2. Login com o nome da barbearia

- [x] 2.1 Em `app/painel/login/page.tsx`, extrair o slug do `next` (`/^\/painel\/([a-z0-9-]+)(\/|$)/`, ignorando `login`), buscar com `getShop` e, se existir, mostrar `Brand` com o nome e o título "Entrar no painel da <nome>"; sem match, manter "Agendamento online" e "Entrar"
- [x] 2.2 E2E em `e2e/admin-multi-shop.spec.ts`: no site da `barbearia-teste`, clicar em "Área do barbeiro", ver o login com "Barbearia Teste", entrar com `dono-teste@barbearia.local` e cair em `/painel/barbearia-teste`; e `/painel/login?next=/painel/nao-existe` mostra "Agendamento online"; verificar com `npx playwright test e2e/admin-multi-shop.spec.ts`

## 3. Conferência

- [x] 3.1 Regenerar os snapshots de `e2e/visual.spec.ts` que mostram o rodapé e revisar que só a linha final mudou; rodar `npm run lint`, `npx tsc --noEmit`, `npm test` e `npm run test:e2e` sem falhas
- [ ] 3.2 Depois do deploy, conferir em `https://cortecabelo.netlify.app/barbearia/demir-barbershop` que o link aparece no rodapé e leva ao login com "Demir Barbershop"
