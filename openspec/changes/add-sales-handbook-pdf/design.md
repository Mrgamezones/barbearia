# Design

## Context

Ver `proposal.md` para a motivação. Fatos do projeto que moldam a apostila:

- O produto é um site de agendamento (PWA) com painel do barbeiro. Cada instalação atende **uma barbearia e um barbeiro**.
- Regras atuais que o vendedor precisa conhecer: agendamento sem conta (nome + WhatsApp, e-mail opcional); horários de hoje até 30 dias à frente, com no mínimo 60 minutos de antecedência; no máximo 2 agendamentos futuros por número; cancelamento pelo link até 2 horas antes; lembretes 24 h e 2 h antes.
- O envio por WhatsApp (confirmação, cancelamento e lembretes) está implementado na change `add-whatsapp-notifications`, mas falta o teste manual com credenciais reais da Meta (tarefa 6.2). Em produção exige conta Meta Business, número dedicado e modelos aprovados.
- Já existem Playwright e Chromium instalados, um ambiente local com dados de exemplo (seed) e o admin de teste `admin@barbearia.local`.
- A identidade visual do produto é escura com dourado, títulos em Cormorant Garamond e texto em Inter.

## Goals / Non-Goals

**Goals:**

- Um PDF em A4 que o vendedor leia em cerca de 20 minutos e consulte durante a venda.
- Conteúdo fiel ao que o sistema faz hoje: toda afirmação sobre o produto deve ser conferida no código ou nas specs.
- Regerar o PDF com um comando quando preços ou textos mudarem.

**Non-Goals:**

- Slides, vídeo ou página de vendas online.
- Apostila personalizada por barbearia cliente.
- Tradução para outros idiomas.

## Decisions

### 1. Fonte em HTML, PDF gerado pelo Chromium do Playwright

A apostila é escrita em um único arquivo HTML com CSS de impressão (`@page` A4, quebras de página por seção), e `scripts/generate-handbook.mjs` abre o arquivo no Chromium e chama `page.pdf()`.

- Por quê: não adiciona dependência, dá controle total do visual e as imagens entram direto.
- Alternativas: Markdown + pandoc (não instalado, visual limitado); biblioteca Python de PDF (segunda linguagem no projeto, layout manual); documento Word (não fica versionado de forma legível).

### 2. Telas reais capturadas por script

`scripts/capture-handbook-screens.mjs` navega no site local em viewport de celular (390 px) e salva em `docs/vendas/telas/`: página inicial, serviços, as etapas do agendamento (serviços, data, horário, dados, confirmação), página do agendamento pelo link, e no painel: agenda do dia, serviços, horários e configurações.

- Por quê: o vendedor precisa reconhecer as telas na demonstração, e o script permite atualizar as imagens quando o visual mudar.
- Alternativa: reutilizar os snapshots de `e2e/visual.spec.ts-snapshots` (só cobrem home e painel, em tamanhos de teste). Ficam como plano B se o ambiente local não subir.
- As capturas usam só os dados do seed. Nenhum dado de cliente real aparece.

### 3. Estrutura do conteúdo

Ordem fixa, uma ideia por página, frases curtas, sem termos técnicos (nada de "PWA", "API", "deploy"; usar "site que vira aplicativo no celular"):

1. Capa e "como usar esta apostila".
2. O produto em uma frase e em um parágrafo.
3. Como funciona para o cliente da barbearia: 4 passos com telas.
4. Como funciona para o barbeiro: o painel, com telas.
5. O que o consumidor final ganha / o que o dono ganha (duas colunas), seguida da página "Como o cliente é avisado" (decisão 5).
6. Para quem vender: perfil ideal e sinais de que a barbearia precisa.
7. Formas de oferecer: visita presencial, WhatsApp, Instagram, indicação.
8. Roteiro de demonstração em 5 minutos (o vendedor agenda um horário no celular na frente do dono).
9. Gatilhos de atenção, cada um com uma frase pronta.
10. Mensagens prontas: primeira abordagem, retorno após 2 dias, fechamento.
11. Objeções e respostas.
12. Oferta e condições (tabela de preços) e como apresentar o preço.
13. O que o produto não faz, e perguntas frequentes.
14. Checklist do fechamento: o que pedir ao cliente (nome, endereço, serviços e preços, horários, fotos, WhatsApp).

### 4. Gatilhos: só os verdadeiros

Gatilhos usados e a base de cada um:

- **Dor**: horário vago por falta, cliente que chama no WhatsApp enquanto o barbeiro está cortando.
- **Facilidade**: o cliente marca em poucos toques, sem baixar nada e sem criar conta.
- **Teste sem risco**: 7 dias grátis.
- **Ancoragem de preço**: R$ 89,90 por mês equivale a cerca de dois cortes (o corte do exemplo custa R$ 45,00).
- **Parcelamento**: 4 × R$ 87,50 em vez de R$ 350,00.
- **Bônus**: 3 meses de manutenção grátis.
- **Imagem profissional**: site próprio com a marca da barbearia.
- **Demonstração ao vivo**: ver funcionando convence mais que explicar.

A apostila MUST NOT trazer escassez ou prova social inventadas ("últimas vagas", "mais de 100 barbearias usam", percentuais de redução de faltas). Se o responsável tiver números ou limite de vagas reais, entram depois.

### 5. Duas formas de aviso: grátis por padrão, WhatsApp automático como opcional

Decisão do responsável: a barbearia que não quiser WhatsApp escolhe uma forma de aviso grátis. A apostila ganha uma página "Como o cliente é avisado", com um quadro lado a lado:

| | Avisos grátis | WhatsApp automático (opcional) |
|---|---|---|
| Canais | E-mail e notificação no celular | WhatsApp do cliente |
| O que envia | Confirmação por e-mail; lembretes de 24 h e 2 h por e-mail e notificação | Confirmação, lembretes de 24 h e 2 h, aviso de cancelamento |
| Custo por mensagem | Nenhum | Cerca de R$ 0,035, cobrado pela Meta |
| O que a barbearia precisa | Nada | Conta Meta Business, número dedicado, modelos aprovados |
| Ponto fraco | O e-mail é opcional no agendamento e a notificação depende de o cliente tocar em "Ativar lembrete" | Custo cresce com o movimento; ativação leva alguns dias |

- Por quê: o produto já funciona sem WhatsApp (sem as credenciais, o envio fica desligado e e-mail e notificação continuam). Vender o WhatsApp como opcional evita prometer algo que depende da Meta e protege a margem da manutenção.
- Nos dois casos o barbeiro continua com o atalho do painel para abrir a conversa com o cliente no WhatsApp dele, sem custo. Isso é manual, não automático, e a apostila deve dizer assim.
- Alternativa descartada: WhatsApp incluído para todos. O custo e o trabalho de ativação por barbearia não cabem em R$ 89,90 sem regra de repasse.

### 5.1 Custo da API de WhatsApp da Meta

Fonte: documentação de preços da Meta e tabela em vigor desde 1º de outubro de 2026. Conferir a tabela oficial antes de imprimir a apostila.

- A Meta cobra **por mensagem entregue**. As mensagens do sistema são da categoria "Utilidade": cerca de **US$ 0,0068**, ou **R$ 0,035**, por mensagem no Brasil. Não há mensalidade da Meta.
- Desde outubro de 2026 as mensagens de utilidade são cobradas mesmo dentro da janela de atendimento. Mensagens de marketing custam cerca de R$ 0,32 cada, mas o sistema não envia marketing.
- Cada agendamento gera até **3 mensagens** (confirmação, lembrete de 24 h, lembrete de 2 h) e uma 4ª se houver cancelamento. Custo por agendamento: cerca de **R$ 0,11**.

| Agendamentos por mês | Mensagens | Custo aproximado |
|---|---|---|
| 100 | 300 | R$ 10,50 |
| 200 | 600 | R$ 21,00 |
| 300 | 900 | R$ 31,50 |
| 400 | 1.200 | R$ 42,00 |

- Custos que não são da Meta: um número de telefone só para isso, o tempo de cadastro e verificação da empresa, a aprovação dos 4 modelos de mensagem e o suporte quando um modelo é pausado.
- **Avaliação**: o valor por mensagem é baixo e uma falta evitada (R$ 45,00) paga o mês de uma barbearia de movimento médio. O que pesa é quem paga e o trabalho de ativação. Se o custo ficar dentro da manutenção de R$ 89,90, ele consome de 12% a 47% da mensalidade conforme o movimento.
- **Recomendação**: manter o WhatsApp no projeto como opcional, com o custo das mensagens por conta da barbearia (conta da Meta no nome dela, com o cartão dela), ou cobrado como adicional fixo na manutenção. A decisão de quem paga é do responsável (ver Open Questions).

### 6. Local e versionamento

Fonte, telas e PDF ficam em `docs/vendas/`. O PDF é versionado, para o responsável enviar ao vendedor sem precisar gerar. Os valores ficam em um único bloco no topo do HTML, para mudar preço em um lugar só.

## Risks / Trade-offs

- [O vendedor promete o que o produto não faz] → seção "O que o produto não faz" e revisão de cada afirmação contra o código e as specs.
- [O WhatsApp real não passa no teste com a Meta] → ele é vendido como opcional; o texto pode virar "em breve" com uma edição.
- [Barbearia sem WhatsApp ainda mostra a opção "Receber confirmação e lembretes pelo WhatsApp"] → hoje a caixa aparece sempre no agendamento e no painel, mesmo sem as credenciais, e o cliente não recebe nada. Corrigir isso é mudança no sistema e fica fora desta change; precisa de uma change própria antes de vender o plano de avisos grátis. Até lá a apostila não deve prometer que a opção some.
- [No plano grátis o cliente pode não receber nenhum aviso] → o e-mail é opcional e a notificação precisa ser ativada. A apostila orienta o vendedor a dizer isso com clareza e a sugerir que o barbeiro peça o e-mail.
- [Preço da Meta muda] → a tabela muda algumas vezes por ano; a apostila cita o valor como aproximado, com a data.
- [O ambiente local não sobe na hora de capturar as telas] → plano B com os snapshots existentes, registrando quais telas ficaram de fora.
- [Preço muda e a apostila fica desatualizada] → valores em um único bloco e comando para regerar.
- [Termos de manutenção vagos geram conflito com o cliente] → ver Open Questions; até a resposta, a apostila usa a descrição padrão proposta abaixo.

## Open Questions

Podem ser respondidas na revisão do rascunho, sem mudar a estrutura nem as tarefas:

1. **O que a manutenção de R$ 89,90 cobre?** Proposta padrão: site no ar (hospedagem), alterações de textos, fotos, serviços e preços a pedido, correções e suporte por WhatsApp.
2. **Sem plano de manutenção, quem paga a hospedagem?** Sem definição, o site fica no ar sem ninguém pagando por isso. Sugestão: uma taxa pequena de hospedagem, ou deixar claro que a manutenção avulsa de R$ 110,00 cobre só o atendimento pedido.
3. **Como funcionam os 7 dias grátis?** Sugestão: o cliente testa o site já com o nome e os serviços dele, o que aumenta a chance de fechar. Alternativa mais barata: um site de demonstração único para todos.
4. **Quem paga as mensagens de WhatsApp?** Recomendação: a barbearia, direto à Meta. Alternativa: adicional fixo na manutenção (por exemplo R$ 30,00 por mês). Até a resposta, a apostila diz "custo das mensagens por conta da barbearia".
5. **Sugestões comerciais para avaliar**: bônus por indicação (por exemplo, um mês de manutenção grátis para quem indicar outra barbearia) e desconto para pagamento à vista do site.
6. **Nome comercial do produto e contato do responsável** para a capa e o rodapé.
