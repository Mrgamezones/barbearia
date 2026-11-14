# Modelos de mensagem do WhatsApp

A barbearia envia ao cliente 4 mensagens automáticas pela **WhatsApp Cloud API (Meta)**. Como é a empresa que inicia a conversa, a Meta só aceita **modelos aprovados**. Os modelos abaixo precisam ser cadastrados com **exatamente** estes nomes, na categoria **Utilidade** e no idioma **Português (BR) — `pt_BR`**.

As variáveis `{{1}}`, `{{2}}`… são preenchidas pelo sistema, nesta ordem (ver `lib/notifications/templates.ts`). Se a Meta pedir ajustes no texto, mantenha a **quantidade e a ordem** das variáveis. Se precisar mudar, ajuste também os montadores `whatsapp*Params` e os testes em `templates.test.ts`.

## 1. `agendamento_confirmado` (8 variáveis)

Enviado logo depois do agendamento (pelo site ou pelo painel).

```
Olá, {{1}}! Seu horário na {{2}} está confirmado ✂️

📅 {{3}}, às {{4}}
💈 {{5}}
💰 Total: {{6}}
📍 {{7}}

Para ver ou cancelar (até 2 horas antes): {{8}}
```

Exemplo: Maria · Barbearia Modelo · sexta-feira, 22 de maio de 2026 · 14:00 · Corte de cabelo + Bigode · R$ 60,00 · Rua Exemplo, 100 · https://seusite.com.br/agendamento/abc123

## 2. `agendamento_cancelado_barbearia` (5 variáveis)

Enviado quando o barbeiro cancela o agendamento no painel.

```
Olá, {{1}}. Infelizmente a {{2}} precisou cancelar seu horário de {{3}}, às {{4}}. Pedimos desculpas pelo transtorno.

Para escolher um novo horário: {{5}}
```

Exemplo: João · Barbearia Modelo · sexta-feira, 22 de maio de 2026 · 14:00 · https://seusite.com.br/agendar

## 3. `agendamento_cancelado_cliente` (4 variáveis)

Enviado quando o cliente cancela pelo link de gerenciamento.

```
Olá, {{1}}. Seu agendamento de {{2}}, às {{3}}, foi cancelado conforme solicitado.

Quando quiser, é só agendar de novo: {{4}}
```

Exemplo: João · sexta-feira, 22 de maio de 2026 · 14:00 · https://seusite.com.br/agendar

## 4. `lembrete_agendamento` (5 variáveis)

Enviado 24 horas e 2 horas antes do horário.

```
Oi, {{1}}! Lembrete: seu horário é {{2}}, às {{3}}, na {{4}}.
💈 {{5}}

Até logo!
```

Exemplo: Maria · amanhã · 14:00 · Barbearia Modelo · Corte de cabelo  (no de 2 h: "daqui a 2 horas")

## Configuração na Meta (passo a passo)

1. Em [business.facebook.com](https://business.facebook.com), crie (ou use) a conta **Meta Business** da barbearia.
2. Em [developers.facebook.com](https://developers.facebook.com/apps), crie um app do tipo **Empresa** e adicione o produto **WhatsApp**.
3. Em **WhatsApp → Configuração da API**, adicione o **número de telefone da barbearia**. Ele precisa ser um número que **não** esteja em uso no app WhatsApp do celular, ou que tenha sido migrado. Anote o **ID do número de telefone**, que vai em `WHATSAPP_PHONE_NUMBER_ID`.
4. Em **Gerenciador do WhatsApp → Modelos de mensagem**, crie os 4 modelos acima (categoria Utilidade, `pt_BR`) e preencha os exemplos de cada variável. Aguarde a aprovação, que costuma levar de minutos a algumas horas.
5. Em **Configurações do negócio → Usuários do sistema**, crie um usuário do sistema **Admin**, atribua o app e a conta do WhatsApp e gere um **token permanente** com as permissões `whatsapp_business_messaging` e `whatsapp_business_management`. Ele vai em `WHATSAPP_TOKEN`.
6. Configure no servidor (Vercel → Settings → Environment Variables):

   | Variável | Valor |
   |---|---|
   | `WHATSAPP_TOKEN` | token permanente do usuário do sistema (somente servidor) |
   | `WHATSAPP_PHONE_NUMBER_ID` | ID do número de telefone |
   | `WHATSAPP_API_VERSION` | `v23.0` (padrão) |
   | `WHATSAPP_TEMPLATE_LANG` | `pt_BR` (padrão) |

7. Faça um agendamento de teste com o seu próprio número e confira o resultado na tabela `notification_log` (coluna `detail` = wamid em caso de sucesso, ou `código: mensagem` em caso de erro).

Sem `WHATSAPP_TOKEN` ou `WHATSAPP_PHONE_NUMBER_ID`, nada é enviado: cada mensagem fica registrada como `dry_run`. Para desligar o WhatsApp na hora, basta remover o token.

## Erros comuns

| Código | Significado | O que o sistema faz |
|---|---|---|
| `131026` | O número não pode receber mensagens (não tem WhatsApp, bloqueou etc.) | Registra `undeliverable`/`failed` e não tenta de novo |
| `132000`/`132001` | Variáveis erradas ou modelo inexistente/não aprovado | Registra a falha e não tenta de novo. Confira nome, idioma e variáveis |
| `130429`, `131056`, HTTP 429/5xx | Limite de envio ou instabilidade da Meta | Lembretes voltam para a fila e são tentados no próximo disparo |
| `190`, HTTP 401 | Token inválido ou expirado | Registra a falha. Gere um novo token permanente |
