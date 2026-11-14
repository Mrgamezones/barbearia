-- Base: catálogo, configurações, horários, bloqueios e administradores.

create extension if not exists btree_gist with schema extensions;
create extension if not exists pgcrypto with schema extensions;

-- Atualiza updated_at automaticamente.
create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end $$;

-- Serviços ---------------------------------------------------------------
create table public.services (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text not null default '',
  price_cents integer not null,
  duration_min integer not null,
  sort_order integer not null default 0,
  active boolean not null default true,
  is_combo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint services_name_not_blank check (length(btrim(name)) > 0),
  constraint services_price_non_negative check (price_cents >= 0),
  constraint services_duration_step check (duration_min > 0 and duration_min % 5 = 0)
);
create trigger services_updated_at before update on public.services
  for each row execute function public.set_updated_at();

-- Configurações (linha única) --------------------------------------------
create table public.business_settings (
  id smallint primary key default 1,
  name text not null default 'Barbearia',
  address text not null default '',
  whatsapp text not null default '',
  about text not null default '',
  timezone text not null default 'America/Sao_Paulo',
  updated_at timestamptz not null default now(),
  constraint business_settings_singleton check (id = 1)
);
create trigger business_settings_updated_at before update on public.business_settings
  for each row execute function public.set_updated_at();

-- Horário de funcionamento (0 = domingo ... 6 = sábado) -------------------
create table public.business_hours (
  weekday smallint primary key,
  is_open boolean not null default false,
  open_time time,
  close_time time,
  break_start time,
  break_end time,
  constraint business_hours_weekday check (weekday between 0 and 6),
  constraint business_hours_open_times check (
    not is_open or (open_time is not null and close_time is not null and open_time < close_time)
  ),
  constraint business_hours_break_pair check ((break_start is null) = (break_end is null)),
  constraint business_hours_break_inside check (
    break_start is null or (break_start < break_end and break_start >= open_time and break_end <= close_time)
  )
);

-- Bloqueios de agenda ----------------------------------------------------
create table public.schedule_blocks (
  id uuid primary key default gen_random_uuid(),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  reason text,
  created_at timestamptz not null default now(),
  constraint schedule_blocks_range check (starts_at < ends_at)
);
create index schedule_blocks_range_idx on public.schedule_blocks using gist (tstzrange(starts_at, ends_at, '[)'));

-- Administradores --------------------------------------------------------
create table public.admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.admins where user_id = (select auth.uid()));
$$;
revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

-- RLS --------------------------------------------------------------------
alter table public.services enable row level security;
alter table public.business_settings enable row level security;
alter table public.business_hours enable row level security;
alter table public.schedule_blocks enable row level security;
alter table public.admins enable row level security;

-- Público vê apenas serviços ativos; admin vê e altera todos.
create policy services_public_read on public.services
  for select to anon, authenticated using (active or (select public.is_admin()));
create policy services_admin_write on public.services
  for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

create policy settings_public_read on public.business_settings
  for select to anon, authenticated using (true);
create policy settings_admin_write on public.business_settings
  for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

create policy hours_public_read on public.business_hours
  for select to anon, authenticated using (true);
create policy hours_admin_write on public.business_hours
  for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

-- Bloqueios (com motivo) só para admin; a disponibilidade pública é calculada por função.
create policy blocks_admin_all on public.schedule_blocks
  for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

-- Cada usuário só enxerga a própria linha (permite ao app checar o papel).
create policy admins_self_read on public.admins
  for select to authenticated using (user_id = (select auth.uid()));

revoke all on public.admins from anon;
revoke all on public.schedule_blocks from anon;
