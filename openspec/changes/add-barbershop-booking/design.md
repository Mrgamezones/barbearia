# Design

## Context

Projeto greenfield (pasta vazia). Ver proposal.md – Why. Restrições: um único barbeiro, clientes sem conta, fuso America/Sao_Paulo, stack Next.js + Supabase + PWA, deploy na Vercel com plano gratuito sempre que possível. Requisitos detalhados em `specs/`.

## Goals / Non-Goals

**Goals:**
- Garantia de não-sobreposição no banco, não só na UI.
- Nenhum dado de cliente acessível pela chave pública (anon) do Supabase.
- Bundle pequeno e páginas públicas rápidas (catálogo renderizado no servidor e cacheável).

**Non-Goals:**
- Arquitetura multi-barbeiro/multi-unidade (o modelo não terá `barber_id` agora; adicionar depois é uma migração simples).
- Componentização de design system completa; usar Tailwind com poucos componentes próprios.

## Decisions

### 1. Next.js 15 (App Router) + TypeScript + Tailwind CSS
Server Components para páginas públicas e Server Actions/Route Handlers para escrita. Alternativa: Vite SPA + Supabase direto do browser — descartada porque exporia regras de negócio ao cliente e exigiria RLS permissivo para anon.

### 2. Acesso a dados: cliente público nunca lê/escreve agendamentos diretamente
- `anon` só tem `SELECT` em `services` (ativos), `business_settings` (campos públicos).
- Disponibilidade e criação passam por funções Postgres `SECURITY DEFINER`: `get_available_slots(date, total_minutes)` (retorna só horários, nunca dados de clientes) e `create_booking(...)`, chamadas a partir de Server Actions.
- Consulta/cancelamento por token via `get_booking_by_token(token)` e `cancel_booking_by_token(token)`.
- Painel usa sessão Supabase Auth (`@supabase/ssr`, cookies) e RLS com `is_admin()` (tabela `admins(user_id)`).
- `service_role` usado somente no job de lembretes (server-only).
Alternativa: tudo via `service_role` em Route Handlers — mais simples, mas concentra todo o risco numa chave; RPCs restritas são mais seguras.

### 3. Modelo de dados
- `services(id, name, description, price_cents, duration_min, sort_order, active, is_combo)`
- `business_hours(weekday 0–6, is_open, open_time, close_time, break_start, break_end)`
- `schedule_blocks(id, starts_at, ends_at, reason)`
- `appointments(id, customer_name, customer_phone, customer_email, starts_at, ends_at, during tstzrange GENERATED, status enum[confirmed, completed, no_show, cancelled], total_cents, manage_token, source enum[web, admin], created_at)`
- `appointment_services(appointment_id, service_id, name_snapshot, price_cents_snapshot, duration_min_snapshot)` — snapshots garantem que mudança de preço não altera agendamentos.
- `push_subscriptions(id, appointment_id, endpoint, p256dh, auth)`
- `reminders(id, appointment_id, kind enum[h24, h2], channel enum[push, email], send_at, sent_at, unique(appointment_id, kind, channel))`
- `business_settings` (linha única: nome, endereço, whatsapp, texto).
Valores monetários em centavos (inteiros) para evitar erros de ponto flutuante.

### 4. Não-sobreposição: constraint de exclusão
`EXCLUDE USING gist (during WITH &&) WHERE (status <> 'cancelled')` com extensão `btree_gist`. Resolve a corrida de dois clientes no mesmo horário de forma atômica; `create_booking` captura o erro `23P01` e retorna código "slot_taken". Bloqueios também são verificados dentro de `create_booking` (exceto para `source = admin` quando apenas antecedência/limite são dispensados — conflito com bloqueios e outros agendamentos continua valendo). Alternativa: lock otimista na aplicação — descartada, não é à prova de concorrência.

### 5. Cálculo de horários
Feito em SQL (`generate_series` em passos de 15 min no fuso local, convertido para `timestamptz`), removendo os que intersectam intervalo, bloqueios e agendamentos ativos, e os anteriores a `now() + 60 min`. Validação de entrada com `zod` nas Server Actions (nome, telefone normalizado para E.164 `+55DDDNÚMERO`, e-mail).

### 6. Token de gerenciamento
`manage_token` = 32 bytes aleatórios (`gen_random_bytes`) em base64url; armazenado como hash SHA-256, o link usa o valor em claro. Rota `/agendamento/[token]` com `noindex` e sem cache.

### 7. Lembretes
Ao criar o agendamento, inserir linhas em `reminders` para cada combinação (h24/h2 × canais disponíveis) cujo `send_at > now()`. Assinatura push criada depois insere seus lembretes. Um Route Handler `/api/cron/reminders` (protegido por `CRON_SECRET`) roda a cada 15 min via **Vercel Cron** — se o plano não permitir essa frequência, usar `pg_cron` + `pg_net` no Supabase chamando a mesma rota. O handler seleciona com `FOR UPDATE SKIP LOCKED` lembretes pendentes de agendamentos `confirmed`, envia e marca `sent_at` (idempotência). Push com `web-push` e chaves VAPID; respostas 404/410 removem a inscrição. E-mail via Resend (templates simples em React Email ou HTML).

### 8. PWA
`app/manifest.ts` nativo do Next + service worker com **Serwist** (`@serwist/next`): precache do shell, `StaleWhileRevalidate` para catálogo, `NetworkOnly` para Server Actions, `/api/*` e `/admin`, fallback `/offline`. Handler `push` e `notificationclick` no próprio SW. Alternativa: `next-pwa` — sem manutenção ativa.

### 9. Layout minimalista
Fonte única (Inter via `next/font`), paleta neutra com uma cor de destaque (ex.: âmbar/dourado discreto), muito espaço em branco, cantos suaves, ícones lineares (lucide-react). Fluxo de agendamento em etapas numa única rota (`/agendar`) com estado na URL (`?servicos=...&data=...`) para permitir voltar/compartilhar. Tema por `prefers-color-scheme` com tokens CSS.

### 10. Estrutura de pastas
```
app/(public)/page.tsx, servicos/, agendar/, agendamento/[token]/, offline/
app/admin/(login|agenda|servicos|horarios|bloqueios|config)/
app/api/cron/reminders/route.ts, app/api/push/subscribe/route.ts
lib/supabase/(server|browser|admin).ts, lib/validation.ts, lib/format.ts
supabase/migrations/*.sql, supabase/seed.sql
```

## Risks / Trade-offs

- [Cliente sem login pode fazer agendamentos falsos] → limite de 2 futuros por telefone, rate limit por IP na Server Action (tabela simples ou Upstash), Cloudflare Turnstile opcional se houver abuso.
- [Push no iOS só funciona com o PWA instalado (iOS 16.4+)] → e-mail como canal alternativo e aviso explicativo.
- [Vercel Cron no plano Hobby tem limitação de frequência] → fallback `pg_cron` + `pg_net`.
- [Fuso horário/horário de verão] → toda conversão feita no Postgres com `AT TIME ZONE 'America/Sao_Paulo'`; testes cobrindo virada de dia.
- [Link de gerenciamento vazado dá acesso ao agendamento] → token longo, só hash no banco, dados mínimos expostos, sem dados de outros clientes.
- [LGPD: dados pessoais (nome, telefone, e-mail)] → página de política de privacidade simples, uso apenas para o agendamento, rotina para anonimizar agendamentos com mais de 12 meses (pode ficar como tarefa futura).

## Migration Plan

1. Criar projeto Supabase; aplicar migrações e seed (`supabase db push`).
2. Criar usuário admin no Supabase Auth e inserir em `admins`.
3. Configurar variáveis de ambiente na Vercel (Supabase, VAPID, Resend, CRON_SECRET) e deploy.
4. Configurar cron (Vercel ou pg_cron).
Rollback: projeto novo — reverter o deploy na Vercel; migrações são aditivas.

## Open Questions

- Nome, endereço, WhatsApp, logotipo e preços reais da barbearia (seed usa valores de exemplo editáveis no painel).
- Domínio próprio e remetente de e-mail verificado no Resend.
