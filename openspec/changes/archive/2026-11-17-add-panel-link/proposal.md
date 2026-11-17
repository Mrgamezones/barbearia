## Why

O dono da barbearia não encontra o painel a partir do site: não há nenhum link para `/painel` nas páginas públicas, então ele precisa saber o endereço de cor. A tela de login também não mostra de qual barbearia é o painel (aparece só "Agendamento online").

## What Changes

- O rodapé de cada barbearia ganha, na linha final (ao lado de "Política de privacidade"), um link discreto **"Área do barbeiro"** para `/painel/<slug>`. Sem sessão, o middleware já leva ao login e, depois de entrar, de volta ao painel daquela barbearia.
- A tela de login, quando aberta a partir do painel de uma barbearia (`?next=/painel/<slug>`), mostra o nome da barbearia na marca e no título ("Entrar no painel da Demir Barbershop"). Sem `next` válido, continua como hoje.
- O link não é indexado (`rel="nofollow"`), e o login continua com `robots: noindex`.

## Capabilities

### New Capabilities

Nenhuma.

### Modified Capabilities

- `home-page`: o requisito "Rodapé" passa a incluir o link "Área do barbeiro" na linha final.
- `admin-panel`: novo requisito de identificação da barbearia na tela de login.

## Impact

- `components/site/SiteFooter.tsx` e `components/site/SiteFooter.test.tsx`.
- `app/painel/login/page.tsx` (lê o slug do `next` e busca o nome com `getShop`).
- E2E: novo teste em `e2e/admin-multi-shop.spec.ts` (link do rodapé → login com o nome → painel da barbearia).
- Snapshots visuais do rodapé (`e2e/*-snapshots`) precisam ser regenerados.
- Sem mudança de banco, de variáveis de ambiente ou de rotas.
