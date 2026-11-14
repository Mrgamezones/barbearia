# Proposal

## Why

O sistema de agendamento para barbearias está pronto para ser oferecido a donos de barbearia, mas o vendedor não tem nenhum material que explique o produto nem como vendê-lo. Toda a documentação atual (README, specs) é técnica e voltada a quem desenvolve.

## What Changes

- Nova **apostila de vendas em PDF**, em pt-BR e linguagem simples, para o vendedor ler e usar no dia a dia. Público do vendedor: **donos de barbearia**.
- **Parte 1 – Entender o produto**: o que é, como funciona para o cliente da barbearia (consumidor final) e para o barbeiro, com telas reais do sistema e um passo a passo do agendamento.
- **Parte 2 – O que o produto oferece**: benefícios para o consumidor final (agendar em poucos toques, sem criar conta, lembretes, cancelar pelo link, instalar no celular) e para o dono (agenda organizada, menos faltas, painel, histórico de clientes).
- **Parte 3 – Como vender**: perfil do cliente ideal, formas de abordagem (visita, WhatsApp, Instagram), roteiro de demonstração em 5 minutos, mensagens prontas para copiar, gatilhos para chamar atenção e respostas para as objeções mais comuns.
- **Parte 4 – Oferta e condições**, com os valores definidos pelo responsável:
  - Site: **R$ 350,00**, em até **4x sem juros** (4 × R$ 87,50).
  - **7 dias de uso gratuito** antes de pagar.
  - Plano de manutenção: **3 primeiros meses grátis**, depois **R$ 89,90 por mês**.
  - Sem plano de manutenção: o cliente paga só o site, e cada manutenção avulsa custa **R$ 110,00**.
- **Formas de aviso ao cliente (página própria na apostila)**: a barbearia escolhe como o cliente dela recebe confirmação e lembretes.
  - **Avisos grátis**: e-mail e notificação no celular. Sem custo por mensagem e sem cadastro na Meta.
  - **WhatsApp automático (opcional)**: confirmação, lembretes de 24 h e 2 h e aviso de cancelamento no WhatsApp do cliente. Tem custo por mensagem cobrado pela Meta (cerca de R$ 0,035 por mensagem, tabela de outubro de 2026) e exige conta Meta Business e número dedicado.
  - A apostila traz um quadro comparando as duas formas, uma conta simples de custo por mês e a frase pronta para o vendedor apresentar a escolha.
- **Parte 5 – Perguntas frequentes e limites**: o que o produto não faz hoje (pagamento online, vários barbeiros na mesma agenda, conta de cliente, programa de fidelidade, atendimento automático por WhatsApp), para o vendedor não prometer o que não existe.
- Fonte da apostila versionada no repositório e um comando que gera o PDF de novo quando o conteúdo ou os preços mudarem.

Fora do escopo: mudanças no site ou no painel, página de vendas pública, tabela de preços dentro do sistema, contrato ou termo de serviço, material de anúncios pagos.

## Capabilities

### New Capabilities

Nenhuma. A apostila é um material de documentação e vendas; o comportamento do sistema não muda. Por isso a change declara `skip_specs: true`.

### Modified Capabilities

Nenhuma.

## Impact

- **Arquivos novos**: `docs/vendas/apostila.html` (fonte), `docs/vendas/telas/*.png` (capturas das telas), `docs/vendas/apostila-vendas.pdf` (entregável), `scripts/capture-handbook-screens.mjs` e `scripts/generate-handbook.mjs`.
- **`package.json`**: novos scripts `handbook:screens` e `handbook:pdf`. Nenhuma dependência nova: usa o Playwright (Chromium) que já é dependência de desenvolvimento.
- **README**: seção curta explicando como gerar a apostila de novo.
- **Código da aplicação, banco e deploy**: sem alteração.
- **Dependência de ambiente**: capturar as telas exige o site rodando localmente com os dados do seed (`npm run docker:up` ou `npm run dev` com Supabase local).
