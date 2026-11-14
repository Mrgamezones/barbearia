# Design

## Context

Ver proposal.md – Why. Referência visual: `img/Olha só essa imagem.jpeg` (landing de barbearia premium, desktop). O app ainda não foi implementado: as changes `add-barbershop-booking` (Next.js 15 + Tailwind + Supabase, design decisão 9 com "fonte única Inter, tema por `prefers-color-scheme`") e `add-docker-mobile-simulation` estão só planejadas. Por isso esta identidade deve ser aplicada **desde a primeira implementação** da tarefa 3.1 de `add-barbershop-booking`, evitando construir o tema minimalista e depois refazê-lo. Requisitos em `specs/visual-identity`, `specs/home-page` e o delta de `specs/pwa-shell`.

### Leitura da referência (o que extrair)
| Aspecto | Observado na referência | Adaptação |
|---|---|---|
| Cor | preto quase puro, cartões grafite, bordas finas, dourado envelhecido em botões e destaques | tokens da spec `visual-identity` |
| Tipografia | título serifado de alto contraste, peso regular; texto sans pequeno; eyebrow em caixa alta espaçada dourada; menu em caixa alta pequena | Cormorant Garamond (500/600) + Inter (400/500/600) |
| Layout | header ~72 px; hero 2 colunas (texto à esquerda, foto em sangria à direita); painel de agendamento sobreposto ao hero; 4 colunas; faixa de 4 diferenciais; rodapé de 5 colunas | mantido; a coluna "barbeiro" vira "Seus dados" com cartão do barbeiro |
| Espaçamento | muito ar; seções separadas por ~64–96 px; cartões com padding ~16–24 px | escala de 4 px; `section-y` 64/96 px |
| Componentes | stepper com círculos numerados (ativo dourado preenchido); cartões selecionáveis com radio/check; chips de horário em grade 3×N; calendário mensal compacto; resumo com total em dourado e nota "dados seguros" com cadeado | componentes base da spec |
| Não copiar | nome "Barbearia Exclusiva", slogan, textos, foto, nomes/fotos de barbeiros, notas, "pagamento facilitado" | marca configurável, textos próprios, foto licenciada, diferencial "Lembretes automáticos" |

## Goals / Non-Goals

**Goals:**
- Fidelidade de estilo e composição à referência no desktop, e versão mobile que preserve a mesma sensação (escuro, dourado, serifada), com uma etapa por tela.
- Tokens únicos consumidos por Tailwind, sem cores soltas no código.
- Performance: fontes e imagens otimizadas, LCP do hero < 2,5 s em 4G no celular.

**Non-Goals:**
- Painel admin com layout de landing: ele usa os mesmos tokens e componentes, mas com layout funcional (lista/tabela), sem hero.
- CMS de galeria: a v1 usa fotos estáticas em `public/galeria/`; o upload pelo painel fica para depois.

## Decisions

### 1. Tokens em CSS variables + tema do Tailwind
`app/globals.css` define `--color-bg`, `--color-surface`, `--color-card`, `--color-border`, `--color-text`, `--color-muted`, `--color-gold`, `--color-gold-hover`, `--color-on-gold: #0B0B0C`, `--radius-sm: 8px`, `--radius-md: 12px` em `:root`. O Tailwind (v4 `@theme`) mapeia para utilitários (`bg-surface`, `text-gold`…). Regra de lint (`eslint-plugin-tailwindcss` com cores customizadas e proibição de valores arbitrários de cor) evita hex fora dos tokens. `color-scheme: dark` no `<html>`. Alternativa: tema com alternância claro/escuro — descartada pela decisão do cliente (só escuro).

### 2. Fontes
`next/font/google`: **Cormorant Garamond** (500, 600, subsets latin, `display: swap`, `adjustFontFallback`) como `--font-display` e **Inter** (variável) como `--font-sans`. Cormorant só em tamanhos ≥ 24 px, porque é pouco legível em tamanho pequeno; abaixo disso, Inter. Escala: display 56/64 px desktop e 40 px mobile (`clamp`), h2 36/28, h3 20, corpo 16, pequeno 14, eyebrow 12 com `tracking-[0.2em]` em caixa alta. Alternativas: Playfair Display (contraste mais pesado, menos próximo da referência), fonte local paga — desnecessária.

### 3. Marca
Componente `<Brand>`: ícone `Scissors` do lucide (traço 1.5, dourado) + nome de `business_settings.name` em Cormorant caixa alta. Se o nome tiver 2+ palavras, a primeira palavra vai em linha menor acima (como o arranjo da referência, mas com conteúdo próprio). Ícones do PWA gerados a partir de um SVG próprio (tesoura dourada centralizada em fundo `#0B0B0C`, versão maskable com área segura) por script `scripts/generate-icons.mjs` (sharp).

### 4. Composição da home
`app/(public)/page.tsx` (Server Component) monta `Header`, `Hero`, `BookingPanel` (client, o mesmo componente usado em `/agendar`), `Features`, `Gallery`, `Footer`. O hero usa `next/image` com `priority`, `sizes="100vw"`, `object-position` à direita no desktop e gradiente `linear-gradient(90deg, bg 0%, bg/85 35%, transparent 70%)`; no mobile, o gradiente é vertical (base escura). O painel tem `-mt-24` sobre o hero no desktop (`-mt-12` no mobile), `bg-surface`, borda e `radius-md`. Header fixo com `backdrop-blur` e fundo `bg/80` após rolar; `scroll-margin-top` nas seções para as âncoras.

### 5. Painel de agendamento responsivo
Um único componente com estado do fluxo (já definido em `add-barbershop-booking`, estado na URL). Em `lg:` renderiza grid `grid-cols-[1.1fr_1.2fr_1fr_1fr]` com as quatro colunas sempre visíveis; a etapa "ativa" do stepper é derivada do preenchimento (sem serviço → 1; sem horário → 2; dados incompletos → 3; pronto → 4). Abaixo de `lg`, renderiza só a etapa atual com transição sutil, botão "Continuar" e um `BookingSummaryBar` fixo (`position: sticky; bottom: 0`, `safe-area-inset-bottom`). O calendário é próprio (grade 7 colunas, domingo primeiro como na referência; dias indisponíveis em `text-muted/40`, selecionado em círculo dourado preenchido), sem biblioteca de datepicker, para controlar o visual e a acessibilidade (`role="grid"`, setas do teclado).

### 6. Textos configuráveis
Novos campos opcionais em `business_settings`: `hero_eyebrow`, `hero_title_line1`, `hero_title_line2`, `hero_subtitle`, `barber_name`, `barber_bio`, `barber_photo_url`, `instagram_url`, `email`. O seed usa textos próprios em pt-BR, por exemplo: eyebrow "Tradição • Precisão • Cuidado", título "Corte na medida," / "do seu jeito.", subtítulo "Marque seu horário em poucos toques e chegue só para ser atendido.". Os campos ficam editáveis na tela de configurações do painel (tarefa 5.7 de `add-barbershop-booking`). É uma alteração de esquema aditiva, sem mudar comportamento já especificado.

### 7. Imagens
Foto do hero e 8 fotos da galeria de bancos com licença comercial gratuita (Unsplash/Pexels), registradas em `public/CREDITS.md` com autor, link e licença, até a barbearia enviar fotos reais. Formato AVIF/WebP via `next/image`, galeria com `loading="lazy"` e `placeholder="blur"`. A imagem de referência fica em `docs/design/referencia.jpeg`, apenas como documentação: nunca em `public/` nem no build.

### 8. Verificação visual
Screenshots de referência por breakpoint (360, 768, 1280) com `toHaveScreenshot` no Playwright local (Chromium) para home e painel, com tolerância pequena, para pegar regressões de estilo. Checagem de contraste automatizada com axe. Revisão lado a lado com a referência registrada em `docs/design/comparativo.md`.

## Risks / Trade-offs

- [Dourado sobre preto pode cansar ou perder contraste em textos pequenos] → dourado só em destaques (spec), textos longos em `#F4F1EA`; contraste do dourado `#C8A165` sobre `#0B0B0C` ≈ 8:1.
- [Cormorant ilegível em tamanhos pequenos e em telas de baixa densidade] → restrita a ≥ 24 px; o restante em Inter.
- [Painel de 4 colunas ficar apertado entre 1024 e 1180 px] → colunas com `minmax`; abaixo de 1180 px o resumo vai para uma linha inferior em largura total (3 + 1).
- [Foto de banco não representar a barbearia] → `CREDITS.md` e tarefa explícita de troca por fotos reais; o componente aceita a foto vinda das configurações.
- [Semelhança excessiva com a referência] → marca, textos, fotos e diferencial próprios; a coluna de barbeiro foi substituída; a referência é usada como estilo, não como cópia.
- [Delta `pwa-shell` depende do arquivamento de `add-barbershop-booking`] → ordem de arquivamento documentada nas tarefas.

## Open Questions

- Fotos reais do ambiente, dos cortes e do barbeiro (substituem as de banco sem mudar código).
- Nome definitivo da barbearia (afeta só os dados de configuração e os ícones gerados).
