# Proposal

## Why

O plano original definiu só um "layout minimalista" genérico. O cliente forneceu uma referência visual (`img/Olha só essa imagem.jpeg`): uma barbearia premium em tema escuro, com dourado, títulos serifados e o agendamento em etapas num painel logo abaixo do hero. O site precisa adotar esse estilo, layout, tipografia, espaçamentos, cores e composição, mas com marca, textos e imagens próprios.

## What Changes

- Identidade visual **escura e premium**: fundo preto/grafite, superfícies em camadas, bordas sutis e dourado como cor de destaque, com tema único (sem modo claro).
- Tipografia em duas famílias: **serifada de alto contraste** para títulos e marca e **sans-serif** para texto e interface, mais um rótulo em caixa alta espaçado e dourado ("eyebrow").
- Marca original: wordmark com o nome configurado da barbearia, em duas linhas e caixa alta, e um ícone de tesoura em traço dourado. Nada de nome, slogan ou logotipo da referência.
- Nova composição da página inicial, como na referência:
  - cabeçalho fixo com navegação e botão "Agendar" contornado;
  - hero com foto em sangria e gradiente escuro à esquerda, título em duas linhas (a segunda em dourado) e botão sólido;
  - painel de agendamento sobreposto ao fim do hero;
  - faixa de diferenciais com 4 itens;
  - **Galeria**;
  - rodapé em colunas.
- Painel de agendamento redesenhado:
  - stepper numerado de 4 etapas (**Serviço → Data e hora → Seus dados → Confirmar**);
  - no desktop, 4 colunas lado a lado (serviços | calendário e horários | seus dados com o cartão "Seu barbeiro" | resumo com total em dourado e botão confirmar);
  - no celular, uma etapa por tela com resumo fixo no rodapé.
- Um único barbeiro mantido: não existe a etapa "Escolha o barbeiro" da referência. Ela vira um cartão informativo, e notas ou avaliações não são exibidas.
- O diferencial "pagamento facilitado" da referência é trocado por "lembretes automáticos", porque pagamento online está fora do escopo.
- O painel administrativo, a página do link de gerenciamento, o PWA (cor de tema, ícones, splash) e as páginas de erro e offline passam a seguir a mesma identidade.

## Capabilities

### New Capabilities
- `visual-identity`: tokens de cor, tipografia, espaçamento, raios, ícones, marca, componentes base e regras de uso da identidade escura e dourada.
- `home-page`: estrutura e conteúdo da página inicial (cabeçalho, hero, painel de agendamento embutido, diferenciais, galeria, rodapé) e navegação por âncoras.

### Modified Capabilities
- `pwa-shell` (introduzida pela change `add-barbershop-booking`): o requisito "Layout minimalista e responsivo" passa a referenciar a identidade visual (duas famílias tipográficas, paleta escura e dourada, layout multicoluna no desktop), e o requisito "Tema claro e escuro" é removido em favor de tema escuro único.

## Impact

- Depende de `add-barbershop-booking`, que deve ser arquivada antes desta para que o delta de `pwa-shell` se aplique. Substitui na prática a decisão 9 e a tarefa 3.1 daquela change, que devem ser implementadas já com esta identidade.
- Não muda regras de agendamento, banco ou API: o fluxo continua o mesmo, só a apresentação muda. O campo de dados do cliente fica na etapa 3 do painel.
- Novos recursos: fontes via `next/font/google` (Cormorant Garamond e Inter), foto de hero e da galeria com licença livre até haver fotos reais, ícones lucide em traço, ícones do PWA refeitos.
- A change `add-docker-mobile-simulation` passa a gerar as screenshots já com a nova identidade, sem precisar de alteração.
