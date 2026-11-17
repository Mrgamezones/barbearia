# Design

## Context

- O site público de cada barbearia (`/barbearia/<slug>`) não tem nenhum link para o painel. O dono precisa digitar `/painel`.
- `middleware.ts` já protege `/painel/*`: sem sessão, redireciona para `/painel/login?next=<caminho>`. `LoginForm` já devolve ao `next` depois de entrar.
- `app/painel/login/page.tsx` mostra sempre a marca "Agendamento online", mesmo quando o `next` aponta para uma barbearia.
- `components/site/SiteFooter.tsx` tem a linha final com copyright e "Política de privacidade". `e2e/visual.spec.ts` tira snapshots das páginas públicas, inclusive do rodapé.

## Goals / Non-Goals

**Goals:**
- O dono encontra o painel a partir do site da própria barbearia, no celular e no computador.
- A tela de login deixa claro de qual barbearia é o painel.

**Non-Goals:**
- Botão no cabeçalho ou no menu: o público do site é o cliente, e o link de dono não deve competir com "Agendar".
- Mudar o login (recuperar senha, cadastro) ou as regras de acesso.
- Página inicial geral do sistema (a raiz continua redirecionando para a demonstração).

## Decisions

1. **Link na linha final do rodapé, texto "Área do barbeiro", para `/painel/<slug>`.** É onde sites costumam pôr o acesso restrito, fica visível sem chamar atenção do cliente e aparece em todas as páginas da barbearia. Apontar para `/painel/<slug>` (e não `/painel/login`) reaproveita o redirecionamento do middleware: sem sessão vai para o login com `next`, com sessão abre direto o painel.
   *Alternativa descartada:* item "Painel" no menu de navegação. Confunde o cliente.

2. **`rel="nofollow"` no link.** O login já tem `robots: noindex`. O link não precisa ser seguido por buscadores.

3. **Nome da barbearia no login a partir do `next`.** A página extrai o slug com `/^\/painel\/([a-z0-9-]+)(\/|$)/`, busca com `getShop` (já usado no site público, com cache) e, se existir, mostra `Brand` com o nome e o título "Entrar no painel da <nome>". Os slugs já são públicos, então não há vazamento. Sem match, nada muda.
   *Alternativa descartada:* rota `/painel/<slug>/login`. Mais rotas e mudança no middleware para um ganho só visual.

4. **App instalado (PWA).** O escopo do app é `/barbearia/<slug>/`; o link para `/painel` abre fora do escopo, na visualização do navegador dentro do app. É aceitável para o dono, que normalmente usa o painel no navegador.

## Risks / Trade-offs

- [Snapshots visuais do rodapé mudam] → Regenerar com `--update-snapshots` e revisar o diff (só a linha final deve mudar).
- [Clientes tocarem no link por curiosidade] → Caem numa tela de login; nada é exposto.

## Migration Plan

Só código. Publica com o push na `main` (Netlify). Rollback: publicar o deploy anterior no Netlify.

## Open Questions

Nenhuma.
