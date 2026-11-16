# Design

## Context

Veja proposal.md (Why). Estado atual que define o trabalho:

- **Banco** (`supabase/migrations/*`):
  - `business_settings` é uma linha única (`check (id = 1)`), e `business_hours` usa `weekday` como chave primária.
  - `appointments_no_overlap` é uma exclusão GiST sobre `during`, válida para o banco inteiro.
  - `is_admin()` só checa se o usuário está em `admins`, sem barbearia.
  - `business_tz()` lê o fuso da linha 1.
  - Todas as RPCs públicas (`get_available_slots`, `get_available_dates`, `create_booking`, `get_booking_by_token`, `cancel_booking_by_token`, `add_push_subscription`) e as do painel não recebem barbearia.
- **App:**
  - `app/(public)/*` e `app/admin/*` têm rotas fixas.
  - `lib/data/public.ts` faz cache com `unstable_cache` por chave fixa (`business-settings` etc.).
  - `middleware.ts` protege `/admin/:path*`.
  - `lib/notifications/after-*.ts` montam links com `siteUrl()` + `/agendamento/...` e `/agendar`.
  - `app/manifest.ts` gera um manifesto só, com `scope: "/"`.
  - `lib/hours.ts` formata horas com zero à esquerda ("09h").
- **Ainda não há produção:** nada publicado e nenhum link divulgado. Por isso, não há dados a migrar nem rotas antigas a redirecionar.

## Goals / Non-Goals

**Goals:**
- Isolamento garantido **no banco** (RLS e funções `security definer` com a barbearia como parâmetro), não só no app.
- Uma barbearia nova entra no sistema sem deploy nem mudança de código.

**Non-Goals:**
- Painel de super administrador, cobrança ou planos por barbearia.
- Domínio próprio por barbearia, subdomínios ou tema visual por barbearia. Todas usam a identidade visual atual; o que muda são os textos, os dados e a foto do barbeiro.
- Vários barbeiros com agendas separadas dentro da mesma barbearia (cada barbearia continua com uma agenda).
- Número de WhatsApp remetente por barbearia: o envio continua pelo número único do sistema, com o nome da barbearia no texto do modelo.

## Decisions

1. **Tabela `shops` + `shop_id` em tudo, com uma migration nova.** A migration cria `shops` com slug, nome, campos de endereço, contato, textos da home, fuso, `notifications_enabled`, `is_demo` e datas. Os campos de `business_settings` passam para `shops`, e `business_settings` deixa de existir. `services`, `business_hours` (chave `(shop_id, weekday)`), `schedule_blocks` e `appointments` ganham `shop_id not null references shops on delete restrict`, com índice. `appointment_services`, `reminders`, `push_subscriptions` e `notification_log` herdam a barbearia pelo agendamento.
   *Alternativa descartada:* um schema do Postgres por barbearia. Multiplica migrations e não combina com o PostgREST do Supabase.
   *Sem migração de dados:* não há produção. O seed é reescrito.

2. **Sobreposição por barbearia.** A exclusão vira `exclude using gist (shop_id with =, during with &&) where (status <> 'cancelled')`. A extensão `btree_gist` já está instalada.

3. **Administradores por barbearia.** `admins` vira `shop_admins (shop_id, user_id, primary key (shop_id, user_id))`, e `is_admin()` vira `is_shop_admin(p_shop_id uuid)`. As políticas RLS de escrita e as leituras restritas usam `is_shop_admin(shop_id)`. As RPCs do painel recebem `p_shop_id` e checam `is_shop_admin`. Uma função `my_shops()` lista as barbearias do usuário logado, para a tela `/painel`.

4. **RPCs públicas recebem `p_shop_slug`.** O slug é resolvido para o id dentro da função. Uma barbearia inativa ou inexistente devolve erro `shop_not_found`. `get_booking_by_token` e `cancel_booking_by_token` recebem slug e token e só aceitam o token se ele for daquela barbearia (spec: "Token de outra barbearia"). `business_tz()` vira `shop_tz(p_shop_id)`.
   *Por que slug, não id, no público:* o app recebe o slug da URL e economiza uma consulta. Dentro do banco, tudo usa o id.

5. **Rotas no App Router.**
   - `app/barbearia/[slug]/` recebe o atual `(public)`: `page`, `agendar`, `servicos`, `privacidade`, `agendamento/[token]`, `layout` com cabeçalho e rodapé, e `manifest.webmanifest/route.ts`.
   - `app/painel/[slug]/` recebe o atual `admin/(painel)`.
   - `app/painel/login` e `app/painel/page.tsx` (lista ou redirecionamento, spec "Dono com várias barbearias").
   - `app/page.tsx` faz `redirect("/barbearia/demonstracao")`.
   - `/estilo` (guia visual interno) passa para `/barbearia/[slug]/estilo`, ainda atrás de `ENABLE_STYLE_GUIDE`.
   - O layout de cada grupo chama `getShop(slug)` e responde `notFound()` quando o slug não existe.
   - O `middleware.ts` passa a proteger `/painel/:path*`, exceto `/painel/login`, preservando `next`.

6. **Cache por barbearia.** As funções de `lib/data/public.ts` passam a receber o slug, com chave `[nome, slug]` e tags `shop:<slug>` (o painel invalida só a própria barbearia). Os parâmetros são dinâmicos (sem `generateStaticParams`) e mantêm `revalidate: 300`. Assim, uma barbearia nova aparece sem novo build, e o build não depende de quantas barbearias existem. A verificação `scripts/check-supabase.mjs` continua valendo.

7. **PWA por barbearia.** O manifesto é gerado por rota (`/barbearia/<slug>/manifest.webmanifest`), com `id`, `start_url` e `scope` iguais a `/barbearia/<slug>/` e nome da barbearia. O layout da barbearia aponta `<link rel="manifest">` para ele, e o `app/manifest.ts` global é removido. O service worker continua único em `/sw.js`, com escopo `/`. As rotas de fallback e cache de `app/sw.ts` passam a usar `/barbearia/*`, e a página offline fica genérica.

8. **Notificações.**
   - Links montados com o slug do agendamento: `siteUrl()/barbearia/<slug>/agendamento/<token>` e `/barbearia/<slug>/agendar`.
   - `dispatchDueReminders` e os disparos após agendar ou cancelar leem nome e endereço em `shops`.
   - Barbearia com `notifications_enabled = false` (a demonstração): os lembretes não são agendados (trigger) e os disparos imediatos são pulados, registrados como `skipped` no `notification_log`.

9. **Specs das changes em andamento.** As capacidades de agendamento, painel e PWA vivem só nas changes ainda não arquivadas e descrevem as rotas antigas. Esta change não as edita, porque cada uma tem tasks manuais próprias pendentes. A nova capacidade `shop-tenancy` define as rotas a partir de agora. Ao arquivar aquelas changes, os cenários com `/agendar` e `/admin` devem ser revistos. Isso fica registrado em "Workflow follow-up" no tasks.md.

10. **Endereço estruturado e formatação.**
    - O endereço deixa de ser um texto livre e passa a ter os campos `street` (logradouro), `number`, `complement`, `district`, `city`, `state` (UF, 2 letras) e `postal_code` (CEP, 8 dígitos).
    - `lib/format.ts#formatAddress` monta "Rua Abaré, 2 – Bairro, Cidade – UF, 00000-000" e omite as partes vazias.
    - `shortTime` deixa de usar zero à esquerda ("8h", "12h30"), conforme o Manual de Redação da Presidência da República (padrão usado em textos oficiais no Brasil). A ABNT não tem norma específica para esse caso.
    - O nº "02" informado vira "2", como os Correios recomendam escrever números de imóvel.
    - O combo ganha um nome que se lê bem em lista ("Corte, barba e sobrancelha"), em vez de "Sobrancelha + corte + barba".

11. **Cadastro por script (`scripts/create-shop.mjs <arquivo.json>`).**
    - O script valida o JSON com zod (mesmas regras do banco), cria ou reaproveita o usuário do dono pelo Auth Admin API e chama uma RPC `provision_shop(jsonb)` (`security definer`, só `service_role`). A RPC grava barbearia, horários, serviços e vínculo numa transação só.
    - Se o usuário foi criado agora e a RPC falhar, o script apaga esse usuário.
    - Um exemplo versionado (`supabase/shops/demir-barbershop.example.json`) serve de modelo. O arquivo real com o e-mail do dono não é versionado (`supabase/shops/*.json` vai para o `.gitignore`, exceto `*.example.json`).

## Risks / Trade-offs

- [Uma política RLS esquecida vaza dados entre barbearias] → Testes de banco com duas barbearias e dois donos cobrindo cada tabela (ler, inserir, alterar e apagar como o outro dono) e cada RPC do painel. Mais um teste E2E de acesso negado.
- [Mudança grande em todos os arquivos de rota e E2E] → As tasks seguem a ordem banco → dados → rotas públicas → painel → notificações → PWA, com a suíte rodando ao fim de cada grupo.
- [Rate limit por IP compartilhado entre barbearias] → Chave do rate limit com o slug como prefixo, para que o limite de uma barbearia não bloqueie outra.
- [Demonstração acumula agendamentos de quem testa] → `is_demo` permite um `delete` periódico. Por ora fica documentado um comando SQL de limpeza. Automatizar fica para depois.
- [Slug é permanente: trocar quebra links] → Documentar que o slug não muda depois de divulgado. O script recusa slug repetido.

## Migration Plan

Não há produção: a migration nova recria a estrutura sobre o banco local (`supabase db reset`). Para a produção, o primeiro `db push` já leva tudo. Rollback antes do primeiro deploy: reverter o commit. Depois dele, só com migration nova.

## Domínio

O endereço fica, por exemplo, `dominio.com.br/barbearia/demir-barbershop`. Como "barbearia" já aparece no caminho, um domínio com nome de produto fica mais curto e não repete a palavra. Sugestões (a disponibilidade precisa ser confirmada no registro.br antes da compra):

- `agendacorte.com.br`: diz o que o sistema faz.
- `horanacadeira.com.br`: marca mais memorável.
- `navalhaagenda.com.br`: puxa para a identidade escura e dourada do site.
- `meucorte.app.br`: curto, com `.app.br` (exige HTTPS, que o Netlify já fornece).

## Open Questions

Dados da Demir Barbershop que não mudam o desenho e entram como dados no arquivo de cadastro (task 7.1). Até lá valem os valores provisórios abaixo:
- Dias de atendimento: provisório **segunda a sábado**, domingo fechado. Pausa de almoço: provisório **nenhuma**.
- Duração dos serviços: provisório corte 30 min, barba 20 min, sobrancelha 10 min, combo 60 min.
- Bairro, cidade, UF e CEP; WhatsApp; Instagram; nome e foto do barbeiro; e-mail do dono para o painel.
