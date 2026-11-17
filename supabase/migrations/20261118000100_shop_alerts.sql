-- Avisos ao dono da barbearia: agendamentos feitos e cancelamentos feitos pelos clientes.
-- shop_alerts: registro de cada aviso (gravado pelo servidor com a service role); o painel consulta
--   o último id para atualizar a agenda aberta e tocar o som.
-- admin_push_subscriptions: aparelhos em que o dono ativou os avisos (por barbearia e usuário).

create type public.shop_alert_kind as enum ('booked', 'cancelled_by_client');

create table public.shop_alerts (
  id bigint generated always as identity primary key,
  shop_id uuid not null references public.shops (id) on delete cascade,
  kind public.shop_alert_kind not null,
  appointment_id uuid references public.appointments (id) on delete set null,
  created_at timestamptz not null default now()
);
create index shop_alerts_shop_idx on public.shop_alerts (shop_id, id desc);

create table public.admin_push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  endpoint text not null check (endpoint ~ '^https://' and length(endpoint) <= 2000),
  p256dh text not null check (length(p256dh) between 1 and 200),
  auth text not null check (length(auth) between 1 and 100),
  user_agent text check (length(user_agent) <= 500),
  created_at timestamptz not null default now(),
  unique (shop_id, endpoint)
);
create index admin_push_subscriptions_user_idx on public.admin_push_subscriptions (user_id);

alter table public.shop_alerts enable row level security;
alter table public.admin_push_subscriptions enable row level security;

-- O dono lê os avisos das barbearias que administra; ninguém grava pelo app (só a service role).
create policy shop_alerts_admin_read on public.shop_alerts
  for select to authenticated using ((select public.is_shop_admin(shop_id)));

-- O dono vê, cria, atualiza e apaga só as próprias inscrições, e só nas barbearias que administra.
create policy admin_push_subscriptions_own on public.admin_push_subscriptions
  for all to authenticated
  using (user_id = (select auth.uid()) and (select public.is_shop_admin(shop_id)))
  with check (user_id = (select auth.uid()) and (select public.is_shop_admin(shop_id)));

revoke all on public.shop_alerts, public.admin_push_subscriptions from anon, authenticated;
grant select on public.shop_alerts to authenticated;
grant select, insert, update, delete on public.admin_push_subscriptions to authenticated;
