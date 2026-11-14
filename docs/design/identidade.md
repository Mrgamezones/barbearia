# Identidade visual

Referência: [`referencia.jpeg`](./referencia.jpeg), uma landing page de barbearia premium enviada pelo cliente. Ela é **só documentação**: não fica em `public/` e não entra no build.

A referência foi usada como guia de **estilo e composição**. Marca, textos, fotos e diferenciais são próprios.

## Extração

| Aspecto | Observado na referência | Adotado no site |
|---|---|---|
| Fundo | preto quase puro | `--color-bg` `#0B0B0C` |
| Superfícies | painel grafite com cartões um tom acima | `--color-surface` `#141416`, `--color-card` `#1B1B1E` |
| Bordas | linhas finas e discretas | `--color-border` `#2A2A2E` |
| Texto | off-white quente e cinza para secundário | `--color-text` `#F4F1EA`, `--color-muted` `#A39F97` |
| Destaque | dourado envelhecido em botões, ícones, seleção e total | `--color-gold` `#C8A165`, hover `#D8B57E`, texto sobre dourado `#0B0B0C` |
| Títulos | serifada de alto contraste, peso regular | Cormorant Garamond 500/600, apenas em ≥ 24 px |
| Texto e interface | sans pequena e neutra | Inter 400/500/600 |
| Eyebrow e menu | caixa alta pequena e espaçada (eyebrow dourado) | utilitário `eyebrow`: 12 px, `tracking 0.2em` |
| Escala | display grande, h2 médio, corpo 14–16 px | display `clamp(2.5rem, 7vw, 4rem)`, h2 36/28 px, h3 20 px, corpo 16 px, pequeno 14 px |
| Espaçamento | muito ar; seções a ~64–96 px; cartões com ~16–24 px de padding | múltiplos de 4 px; seções `py-16`/`py-24`; cartões `p-4`/`p-6`; container de 1200 px com margem lateral mínima de 16 px |
| Cantos | arredondamento suave | `--radius-sm` 8 px (campos, chips, botões), `--radius-md` 12 px (painéis) |
| Ícones | traço fino dourado | lucide com `strokeWidth` 1.5, sem preenchimento (exceto marcador de seleção) |
| Cabeçalho | ~72 px: marca à esquerda, menu central em caixa alta, botão contornado à direita | idem; menu em tela cheia abaixo de 1024 px |
| Hero | texto à esquerda, foto em sangria à direita, gradiente escuro, título em 2 linhas (2ª dourada), botão sólido | idem, com foto licenciada e textos editáveis no painel |
| Agendamento | painel sobreposto ao hero, stepper numerado, 4 colunas | idem; a coluna "barbeiro" virou "Seus dados" com cartão "Seu barbeiro" |
| Componentes | cartão selecionável com marcador; chips de horário 3×N; calendário mensal com dia em círculo dourado; resumo com total dourado e cadeado | `SelectableCard`, `TimeChip`, `Calendar`, resumo do `BookingFlow` |
| Diferenciais | faixa com 4 itens e divisórias verticais | `Features`: grade 2×2 no celular |
| Rodapé | 5 colunas: marca, navegação, serviços, contato, horários | idem, com dados das configurações e do catálogo |

## O que **não** foi copiado

- Nome, wordmark e slogan da referência. A marca usa o nome configurado em `business_settings` e uma tesoura do lucide.
- Textos: eyebrow, título, subtítulo e descrições são próprios e editáveis no painel.
- Fotos: hero e galeria usam fotos com licença livre (veja `public/CREDITS.md`) até haver fotos reais.
- Barbeiros, avatares e notas: há um único barbeiro, apresentado num cartão informativo sem avaliação.
- Diferencial "pagamento facilitado": trocado por "Lembretes automáticos", já que não há pagamento online.
- Rodapé "Desenvolvido com ♥ por…": não existe.

## Regras de uso

- O dourado aparece só em ações principais, seleção, etapa ativa, ícones de destaque, eyebrow, 2ª linha do hero e totais.
- Cada tela tem **no máximo um** botão dourado sólido.
- Cores só via tokens (`bg-surface`, `text-gold`, …). O lint bloqueia classes arbitrárias de cor (`text-[#…]`) e hex soltos em componentes.
- Contraste mínimo AA em todas as combinações de texto e fundo, verificado em `lib/design-tokens.test.ts`.
