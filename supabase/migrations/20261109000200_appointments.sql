-- Agendamentos, disponibilidade e operações públicas por token.

create type public.appointment_status as enum ('confirmed', 'completed', 'no_show', 'cancelled');
create type public.appointment_source as enum ('web', 'admin');

create table public.appointments (
  id uuid primary key default gen_random_uuid(),
  customer_name text not null,
  customer_phone text not null,
  customer_email text,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  during tstzrange generated always as (tstzrange(starts_at, ends_at, '[)')) stored,
  status public.appointment_status not null default 'confirmed',
  total_cents integer not null,
  manage_token_hash text not null unique,
  source public.appointment_source not null default 'web',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint appointments_name_len check (char_length(btrim(customer_name)) between 2 and 80),
  constraint appointments_phone_e164 check (customer_phone ~ '^\+55[1-9][0-9][2-9][0-9]{7,8}$'),
  constraint appointments_email check (customer_email is null or customer_email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  constraint appointments_range check (starts_at < ends_at),
  constraint appointments_total check (total_cents >= 0),
  -- Garantia de não sobreposição, atômica mesmo com requisições simultâneas.
  constraint appointments_no_overlap exclude using gist (during with &&) where (status <> 'cancelled')
);
create index appointments_starts_at_idx on public.appointments (starts_at);
create index appointments_phone_idx on public.appointments (customer_phone, starts_at);
create trigger appointments_updated_at before update on public.appointments
  for each row execute function public.set_updated_at();

create table public.appointment_services (
  appointment_id uuid not null references public.appointments (id) on delete cascade,
  service_id uuid not null references public.services (id) on delete restrict,
  name_snapshot text not null,
  price_cents_snapshot integer not null,
  duration_min_snapshot integer not null,
  primary key (appointment_id, service_id)
);

alter table public.appointments enable row level security;
alter table public.appointment_services enable row level security;

create policy appointments_admin_all on public.appointments
  for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy appointment_services_admin_all on public.appointment_services
  for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
revoke all on public.appointments, public.appointment_services from anon;

-- Limite de requisições (rate limit) por chave -----------------------------
create table public.rate_limits (
  key text primary key,
  window_start timestamptz not null,
  hits integer not null
);
alter table public.rate_limits enable row level security;
revoke all on public.rate_limits from anon, authenticated;

create or replace function public.hit_rate_limit(p_key text, p_limit integer, p_window_seconds integer)
returns boolean language plpgsql security definer set search_path = '' as $$
declare
  v_hits integer;
begin
  insert into public.rate_limits as r (key, window_start, hits)
  values (p_key, now(), 1)
  on conflict (key) do update set
    hits = case when r.window_start < now() - make_interval(secs => p_window_seconds) then 1 else r.hits + 1 end,
    window_start = case when r.window_start < now() - make_interval(secs => p_window_seconds) then now() else r.window_start end
  returning hits into v_hits;
  return v_hits <= p_limit;
end $$;

-- Helpers ----------------------------------------------------------------
create or replace function public.business_tz()
returns text language sql stable set search_path = '' as $$
  select coalesce((select timezone from public.business_settings where id = 1), 'America/Sao_Paulo');
$$;

create or replace function public.hash_token(p_token text)
returns text language sql immutable set search_path = '' as $$
  select encode(extensions.digest(p_token, 'sha256'), 'hex');
$$;

-- Horários livres (interno): passos de 15 min dentro do funcionamento,
-- sem sobrepor intervalo, bloqueios e agendamentos ativos, a partir de p_min_start.
create or replace function public._available_slots(
  p_date date,
  p_total_minutes integer,
  p_min_start timestamptz
)
returns table (slot timestamptz)
language sql stable security definer set search_path = '' as $$
  with h as (
    select bh.*, public.business_tz() as tz
    from public.business_hours bh
    where bh.weekday = extract(dow from p_date)::smallint and bh.is_open
  ),
  candidates as (
    select s as slot_start, s + make_interval(mins => p_total_minutes) as slot_end, h.*
    from h,
    lateral generate_series(
      (p_date + h.open_time) at time zone h.tz,
      ((p_date + h.close_time) at time zone h.tz) - make_interval(mins => p_total_minutes),
      interval '15 minutes'
    ) as s
  )
  select c.slot_start
  from candidates c
  where p_total_minutes > 0
    and c.slot_start >= p_min_start
    and (
      c.break_start is null
      or not tstzrange(c.slot_start, c.slot_end, '[)')
             && tstzrange((p_date + c.break_start) at time zone c.tz, (p_date + c.break_end) at time zone c.tz, '[)')
    )
    and not exists (
      select 1 from public.schedule_blocks b
      where tstzrange(b.starts_at, b.ends_at, '[)') && tstzrange(c.slot_start, c.slot_end, '[)')
    )
    and not exists (
      select 1 from public.appointments a
      where a.status <> 'cancelled'
        and a.during && tstzrange(c.slot_start, c.slot_end, '[)')
    )
  order by c.slot_start;
$$;
revoke all on function public._available_slots(date, integer, timestamptz) from public, anon, authenticated;

-- Janela pública: hoje até 30 dias.
create or replace function public.booking_window_ok(p_date date)
returns boolean language sql stable set search_path = '' as $$
  select p_date between (now() at time zone public.business_tz())::date
                    and (now() at time zone public.business_tz())::date + 30;
$$;

-- Público: antecedência mínima de 60 min.
create or replace function public.get_available_slots(p_date date, p_total_minutes integer)
returns table (slot timestamptz)
language sql stable security definer set search_path = '' as $$
  select s.slot from public._available_slots(p_date, p_total_minutes, now() + interval '60 minutes') s
  where public.booking_window_ok(p_date);
$$;

-- Datas com pelo menos um horário livre no intervalo pedido (para o calendário).
create or replace function public.get_available_dates(p_from date, p_to date, p_total_minutes integer)
returns table (day date)
language sql stable security definer set search_path = '' as $$
  select d::date
  from generate_series(p_from, least(p_to, p_from + 62), interval '1 day') d
  where public.booking_window_ok(d::date)
    and exists (select 1 from public._available_slots(d::date, p_total_minutes, now() + interval '60 minutes'));
$$;

-- Admin: sem janela e sem antecedência mínima (apenas não no passado).
create or replace function public.admin_available_slots(p_date date, p_total_minutes integer)
returns table (slot timestamptz)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  return query select s.slot from public._available_slots(p_date, p_total_minutes, now()) s;
end $$;

-- Criação de agendamento ----------------------------------------------------
-- Retorna jsonb: { ok: true, id, token } ou { ok: false, error: <código> }
-- Códigos: invalid_services, invalid_data, slot_unavailable, slot_taken, limit_reached
create or replace function public._create_booking(
  p_service_ids uuid[],
  p_starts_at timestamptz,
  p_name text,
  p_phone text,
  p_email text,
  p_source public.appointment_source
)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare
  v_count integer;
  v_total_min integer;
  v_total_cents integer;
  v_local_date date;
  v_min_start timestamptz;
  v_token text;
  v_id uuid;
  v_email text := nullif(btrim(coalesce(p_email, '')), '');
begin
  select count(*), sum(duration_min), sum(price_cents)
    into v_count, v_total_min, v_total_cents
  from public.services
  where id = any (p_service_ids) and active;

  if coalesce(array_length(p_service_ids, 1), 0) = 0
     or v_count <> (select count(distinct x) from unnest(p_service_ids) x) then
    return jsonb_build_object('ok', false, 'error', 'invalid_services');
  end if;

  v_local_date := (p_starts_at at time zone public.business_tz())::date;

  if p_source = 'web' then
    if not public.booking_window_ok(v_local_date) then
      return jsonb_build_object('ok', false, 'error', 'slot_unavailable');
    end if;
    v_min_start := now() + interval '60 minutes';
    if (select count(*) from public.appointments
        where customer_phone = p_phone and status = 'confirmed' and starts_at > now()) >= 2 then
      return jsonb_build_object('ok', false, 'error', 'limit_reached');
    end if;
  else
    v_min_start := now();
  end if;

  if not exists (
    select 1 from public._available_slots(v_local_date, v_total_min, v_min_start) s where s.slot = p_starts_at
  ) then
    -- Distingue "acabou de ser ocupado" de "fora do funcionamento".
    if exists (
      select 1 from public.appointments a
      where a.status <> 'cancelled'
        and a.during && tstzrange(p_starts_at, p_starts_at + make_interval(mins => v_total_min), '[)')
    ) then
      return jsonb_build_object('ok', false, 'error', 'slot_taken');
    end if;
    return jsonb_build_object('ok', false, 'error', 'slot_unavailable');
  end if;

  v_token := translate(encode(extensions.gen_random_bytes(32), 'base64'), '+/=', '-_');

  begin
    insert into public.appointments
      (customer_name, customer_phone, customer_email, starts_at, ends_at, total_cents, manage_token_hash, source)
    values
      (btrim(p_name), p_phone, v_email, p_starts_at, p_starts_at + make_interval(mins => v_total_min),
       v_total_cents, public.hash_token(v_token), p_source)
    returning id into v_id;
  exception
    when exclusion_violation then
      return jsonb_build_object('ok', false, 'error', 'slot_taken');
    when check_violation then
      return jsonb_build_object('ok', false, 'error', 'invalid_data');
  end;

  insert into public.appointment_services (appointment_id, service_id, name_snapshot, price_cents_snapshot, duration_min_snapshot)
  select v_id, s.id, s.name, s.price_cents, s.duration_min
  from public.services s where s.id = any (p_service_ids);

  return jsonb_build_object('ok', true, 'id', v_id, 'token', v_token);
end $$;
revoke all on function public._create_booking(uuid[], timestamptz, text, text, text, public.appointment_source) from public, anon, authenticated;

-- Público: chamado apenas pelo servidor (service_role), que aplica rate limit por IP.
create or replace function public.create_booking(
  p_service_ids uuid[], p_starts_at timestamptz, p_name text, p_phone text, p_email text default null
)
returns jsonb language sql volatile security definer set search_path = '' as $$
  select public._create_booking(p_service_ids, p_starts_at, p_name, p_phone, p_email, 'web');
$$;

-- Admin: sem antecedência mínima nem limite por cliente.
create or replace function public.admin_create_booking(
  p_service_ids uuid[], p_starts_at timestamptz, p_name text, p_phone text, p_email text default null
)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
begin
  if not public.is_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  return public._create_booking(p_service_ids, p_starts_at, p_name, p_phone, p_email, 'admin');
end $$;

-- Consulta e cancelamento por token -------------------------------------------
create or replace function public.get_booking_by_token(p_token text)
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'id', a.id,
    'customer_name', a.customer_name,
    'starts_at', a.starts_at,
    'ends_at', a.ends_at,
    'status', a.status,
    'total_cents', a.total_cents,
    'has_email', a.customer_email is not null,
    'can_cancel', a.status = 'confirmed' and a.starts_at - now() >= interval '2 hours',
    'services', coalesce((
      select jsonb_agg(jsonb_build_object('name', s.name_snapshot, 'price_cents', s.price_cents_snapshot,
                                          'duration_min', s.duration_min_snapshot) order by s.name_snapshot)
      from public.appointment_services s where s.appointment_id = a.id), '[]'::jsonb)
  )
  from public.appointments a
  where a.manage_token_hash = public.hash_token(p_token);
$$;

-- Retorna { ok, error? } com códigos: not_found, not_cancellable, too_late
create or replace function public.cancel_booking_by_token(p_token text)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare
  v public.appointments;
begin
  select * into v from public.appointments
  where manage_token_hash = public.hash_token(p_token)
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;
  if v.status <> 'confirmed' then
    return jsonb_build_object('ok', false, 'error', 'not_cancellable');
  end if;
  if v.starts_at - now() < interval '2 hours' then
    return jsonb_build_object('ok', false, 'error', 'too_late');
  end if;

  update public.appointments set status = 'cancelled' where id = v.id;
  return jsonb_build_object('ok', true);
end $$;

-- Permissões das funções ------------------------------------------------------
revoke all on function public.hit_rate_limit(text, integer, integer) from public, anon, authenticated;
revoke all on function public.create_booking(uuid[], timestamptz, text, text, text) from public, anon, authenticated;
grant execute on function public.hit_rate_limit(text, integer, integer) to service_role;
grant execute on function public.create_booking(uuid[], timestamptz, text, text, text) to service_role;

revoke all on function public.get_available_slots(date, integer) from public;
revoke all on function public.get_available_dates(date, date, integer) from public;
revoke all on function public.get_booking_by_token(text) from public;
revoke all on function public.cancel_booking_by_token(text) from public;
grant execute on function public.get_available_slots(date, integer) to anon, authenticated, service_role;
grant execute on function public.get_available_dates(date, date, integer) to anon, authenticated, service_role;
grant execute on function public.get_booking_by_token(text) to anon, authenticated, service_role;
grant execute on function public.cancel_booking_by_token(text) to anon, authenticated, service_role;

revoke all on function public.admin_available_slots(date, integer) from public, anon;
revoke all on function public.admin_create_booking(uuid[], timestamptz, text, text, text) from public, anon;
grant execute on function public.admin_available_slots(date, integer) to authenticated;
grant execute on function public.admin_create_booking(uuid[], timestamptz, text, text, text) to authenticated;
