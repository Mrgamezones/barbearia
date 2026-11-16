# Tasks

> Aplicar junto com o grupo 3 de `add-barbershop-booking`: esta change substitui a decisão 9 e a tarefa 3.1 daquela (tema minimalista claro/escuro com fonte única).

## 1. Fundamentos da identidade

- [x] 1.1 Mover a referência para `docs/design/referencia.jpeg` e criar `docs/design/identidade.md` com a tabela de extração (cores, tipografia, espaçamento, componentes, o que não copiar); verificar que a imagem não está em `public/` nem no build (`npm run build` + busca em `.next/`)
- [x] 1.2 Definir tokens em `app/globals.css` (`:root` com paleta, raios, `color-scheme: dark`) e mapear no `@theme` do Tailwind; verificar com teste automatizado de contraste das combinações texto/fundo da spec (≥ 4,5:1)
- [x] 1.3 Configurar Cormorant Garamond e Inter via `next/font/google` (`display: swap`, fallback ajustado) e a escala tipográfica (display com `clamp`, h2, h3, corpo, eyebrow); verificar numa página `/_estilo` (só em dev) que todos os estilos aparecem e que não há texto invisível com a rede lenta (throttling)
- [x] 1.4 Regra de lint proibindo cores hex/arbitrárias fora dos tokens; verificar que `npm run lint` falha com um `text-[#ff0000]` de teste e passa sem ele

## 2. Marca e componentes base

- [x] 2.1 Componente `Brand` (tesoura lucide dourada + nome de `business_settings` em serifada caixa alta, com quebra em duas linhas); verificar com teste de unidade para nome de uma e de várias palavras
- [x] 2.2 Componentes `Button` (sólido dourado, contornado), `SelectableCard`, `TextField`, `Stepper`, `TimeChip`, `FeatureItem`, `Avatar` (iniciais) com estados hover/foco/desabilitado/selecionado; verificar na `/_estilo` e com axe sem violações
- [x] 2.3 Script `scripts/generate-icons.mjs` gerando ícones do PWA (192, 512, maskable, apple-touch-icon) a partir de SVG próprio, e atualizar o manifest (`theme_color`/`background_color` `#0B0B0C`); verificar com Lighthouse sem falhas de ícone

## 3. Página inicial

- [x] 3.1 Migração aditiva em `business_settings` (textos do hero, barbeiro, Instagram, e-mail) com seed de textos próprios, e campos na tela de configurações do painel; verificar que editar o título do hero no painel muda a home
- [x] 3.2 `Header` fixo (marca, navegação, botão "Agendar" contornado, fundo com blur ao rolar) e menu mobile em tela cheia com foco preso e Esc; verificar com E2E de navegação por âncora e teclado
- [x] 3.3 `Hero` com foto (`next/image` priority), gradiente horizontal no desktop e vertical no mobile, eyebrow, título em duas linhas (a segunda dourada), subtítulo e "Agendar agora" rolando até o painel e focando a etapa 1; verificar contraste AA sobre a foto e LCP < 2,5 s no Lighthouse mobile
- [x] 3.4 `Features` (Agendamento rápido, Profissional experiente, Ambiente premium, Lembretes automáticos) com divisórias no desktop e grade 2×2 no mobile; verificar visualmente em 360 e 1280 px
- [x] 3.5 `Gallery` com 8 fotos licenciadas (`public/galeria/`, `public/CREDITS.md`), lazy loading, blur placeholder e lightbox acessível (anterior/próximo, Esc, gestos); verificar com E2E abrindo, navegando e fechando por teclado
- [x] 3.6 `Footer` em colunas (marca + redes, navegação, serviços ativos até 5 + "Outros serviços", contato com link de mapa, horários por dia com "Fechado", copyright do ano atual + privacidade) e empilhado no mobile; verificar com teste que o domingo fechado aparece como "Domingo — Fechado"

## 4. Painel de agendamento

- [x] 4.1 Layout desktop (≥ 1024 px) com stepper e quatro colunas (Serviço | Data e hora | Seus dados com cartão "Seu barbeiro" | Resumo com total dourado, confirmar e nota de segurança), passando a 3 + 1 abaixo de 1180 px; verificar etapa ativa do stepper com teste de componente
- [x] 4.2 Layout mobile com uma etapa por tela, botão "Continuar" e `BookingSummaryBar` fixo com safe-area; verificar com E2E em 390 px que só a etapa atual aparece e o resumo acompanha a seleção
- [x] 4.3 Calendário próprio (domingo primeiro, indisponíveis esmaecidos, selecionado em círculo dourado, `role="grid"` com setas do teclado) e grade de horários em 3 colunas; verificar com teste de teclado e axe
- [x] 4.4 Cartão do horário de atendimento no topo do painel (relógio + dias/horas das configurações, ex.: "TER–SÁB: 09h às 19h"); verificar com teste de formatação para dias contíguos e não contíguos
- [x] 4.5 Painel embutido na home (`#agendar`, sobreposto ao hero) e em `/agendar` usando o mesmo componente; verificar com E2E que um agendamento pela home e outro por `/agendar` geram o mesmo resultado

## 5. Demais telas

- [x] 5.1 Aplicar identidade à página do link de gerenciamento, `/offline`, `not-found` e `error`; verificar visualmente e com axe
- [x] 5.2 Aplicar tokens e componentes ao painel admin (login, agenda, serviços, horários, bloqueios, configurações) com layout funcional; verificar com axe e navegação por teclado no painel

## 6. Verificação visual

- [x] 6.1 Screenshots de referência com `toHaveScreenshot` (home e painel em 360, 768 e 1280 px) e comparativo lado a lado com a referência em `docs/design/comparativo.md`; verificar que a suíte visual passa e que o comparativo lista as adaptações (barbeiro, diferencial, textos, marca)

## Workflow follow-up

- Arquivar primeiro `add-barbershop-booking` e só depois esta change, para que o delta de `pwa-shell` encontre a spec base.
