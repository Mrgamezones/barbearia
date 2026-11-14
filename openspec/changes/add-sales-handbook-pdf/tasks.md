# Tasks

## 1. Estrutura e geração do PDF

- [x] 1.1 Criar `docs/vendas/apostila.html` com a estrutura das 14 seções do design (títulos e textos provisórios), CSS de impressão A4 e o bloco único de valores (R$ 350,00; 4 × R$ 87,50; 7 dias grátis; 3 meses grátis; R$ 89,90/mês; R$ 110,00 avulsa); verificar abrindo o arquivo no navegador e vendo as quebras de página na pré-visualização de impressão
- [x] 1.2 Criar `scripts/generate-handbook.mjs` (Chromium do Playwright, `page.pdf()` em A4 com fundo impresso) e o script `handbook:pdf` no `package.json`; verificar que `npm run handbook:pdf` gera `docs/vendas/apostila-vendas.pdf` sem erro e com mais de uma página

## 2. Telas do sistema

- [x] 2.1 Criar `scripts/capture-handbook-screens.mjs` e o script `handbook:screens`: com o site local no ar e dados do seed, capturar em viewport de 390 px a home, serviços, as cinco etapas do agendamento, a página do agendamento pelo link e, logado como admin local, agenda do dia, serviços, horários e configurações; verificar que os PNG existem em `docs/vendas/telas/` e mostram só dados de exemplo
- [x] 2.2 Se o ambiente local não subir, usar os snapshots de `e2e/visual.spec.ts-snapshots` como plano B e anotar no resumo final quais telas ficaram de fora; verificar que toda imagem referenciada no HTML existe

## 3. Conteúdo: o produto

- [x] 3.1 Escrever as seções 1 a 5 (capa, produto em uma frase, como funciona para o cliente, como funciona para o barbeiro, benefícios para consumidor final e dono) com as telas inseridas; verificar cada afirmação contra o README e as specs (30 dias, 60 minutos de antecedência, 2 agendamentos por número, cancelamento até 2 h antes, lembretes de 24 h e 2 h)
- [x] 3.2 Escrever a página "Como o cliente é avisado" conforme as decisões 5 e 5.1 do design: quadro Avisos grátis × WhatsApp automático, tabela de custo por movimento (100 a 400 agendamentos), frase pronta para o vendedor apresentar a escolha e o aviso de que o atalho de WhatsApp do painel é manual; verificar o valor por mensagem na tabela oficial da Meta no dia e que a página não promete que a opção de WhatsApp some do agendamento
- [x] 3.3 Escrever a seção 13 (o que o produto não faz e perguntas frequentes); verificar que pagamento online, vários barbeiros, conta de cliente, fidelidade e atendimento automático aparecem como não incluídos

## 4. Conteúdo: como vender

- [x] 4.1 Escrever as seções 6 a 8 (para quem vender, formas de oferecer, roteiro de demonstração em 5 minutos); verificar seguindo o roteiro no site local e confirmando que cada passo descrito existe na tela
- [x] 4.2 Escrever as seções 9 a 11 (gatilhos com frase pronta, mensagens prontas de abordagem, retorno e fechamento, objeções e respostas); verificar que não há escassez, números de clientes ou percentuais inventados
- [x] 4.3 Escrever as seções 12 e 14 (tabela de oferta e como apresentar o preço, checklist do fechamento); verificar que os valores do texto batem com o bloco único de valores e com a proposta

## 5. Revisão e entrega

- [x] 5.1 Revisar a linguagem: frases curtas, sem termos técnicos, ortografia em pt-BR; verificar buscando no HTML por "PWA", "API", "deploy", "Supabase" e "Next" e não encontrando nenhum no texto visível
- [x] 5.2 Gerar o PDF final e conferir página por página (imagens nítidas, nenhum texto cortado, tabela de preços inteira em uma página, sumário coerente); verificar convertendo as páginas em imagem e olhando cada uma
- [x] 5.3 Acrescentar ao README a seção "Apostila de vendas" com os dois comandos; verificar que os comandos rodam como escritos
- [ ] 5.4 Apresentar ao responsável o PDF e a lista das perguntas em aberto do design (cobertura da manutenção, hospedagem sem plano, formato dos 7 dias, custo do WhatsApp, sugestões comerciais, nome e contato); verificar que cada resposta recebida foi aplicada ao HTML e o PDF foi gerado de novo

## Workflow follow-up

- Arquivar a change depois que o responsável aprovar o PDF.
