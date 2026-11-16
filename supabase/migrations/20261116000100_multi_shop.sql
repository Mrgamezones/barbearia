-- Várias barbearias no mesmo banco: cada dado pertence a uma barbearia (shop_id),
-- e cada dono só enxerga e altera as barbearias às quais está vinculado.
-- Ainda não há produção: as tabelas estão vazias quando esta migration roda (o seed vem depois).

-- 1. Barbearias -------------------------------------------------------------------
create table public.shops (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  active boolean not null default true,
  is_demo boolean not null default false,
  notifications_enabled boolean not null default true,
  name text not null,
  -- Endereço estruturado (formatado no app como "Logradouro, número – Bairro, Cidade – UF, CEP").
  street text not null default '',
  number text not null default '',
  complement text not null default '',
  district text not null default '',
  city text not null default '',
  state text not null default '',
  postal_code text not null default '',
  whatsapp text not null default '',
  email text not null default '',
  instagram_url text not null default '',
  about text not null default '',
  timezone text not null default 'America/Sao_Paulo',
  hero_eyebrow text not null default '',
  hero_title_line1 text not null default '',
  hero_title_line2 text not null default '',
  hero_subtitle text not null default '',
  barber_name text not null default '',
  barber_bio text not null default '',
  barber_photo_url text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint shops_slug_format check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) between 3 and 40),
  constraint shops_name_not_blank check (length(btrim(name)) > 0),
  constraint shops_state check (state ~ '^([A-Z]{2})?$'),
  constraint shops_postal_code check (postal_code ~ '^([0-9]{8})?$'),
  constraint shops_urls check (
    (barber_photo_url = '' or barber_photo_url ~ '^https://')
    and (instagram_url = '' or instagram_url ~ '^https://')
  )
);
create trigger shops_updated_at before update on public.shops
  for each row execute function public.set_updated_at();

-- 2. Dono(s) de cada barbearia ------------------------------------------------------
create table public.shop_admins (
  shop_id uuid not null references public.shops (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (shop_id, user_id)
);
create index shop_admins_user_idx on public.shop_admins (user_id);

create function public.is_shop_admin(p_shop_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.shop_admins where shop_id = p_shop_id and user_id = (select auth.uid()));
$$;
revoke all on function public.is_shop_admin(uuid) from public;
grant execute on function public.is_shop_admin(uuid) to anon, authenticated;

-- Barbearias do usuário logado (tela /painel).
create function public.my_shops()
returns table (id uuid, slug text, name text)
language sql stable security definer set search_path = '' as $$
  select s.id, s.slug, s.name
  from public.shops s join public.shop_admins a on a.shop_id = s.id
  where a.user_id = (select auth.uid())
  order by s.name;
$$;
revoke all on function public.my_shops() from public, anon;
grant execute on function public.my_shops() to authenticated;

-- 3. Remove o modelo de barbearia única --------------------------------------------
drop policy services_public_read on public.services;
drop policy services_admin_write on public.services;
drop policy hours_public_read on public.business_hours;
drop policy hours_admin_write on public.business_hours;
drop policy blocks_admin_all on public.schedule_blocks;
drop policy appointments_admin_all on public.appointments;
drop policy appointment_services_admin_all on public.appointment_services;
drop policy reminders_admin_read on public.reminders;
drop policy notification_log_admin_read on public.notification_log;

drop function public.create_booking(uuid[], timestamptz, text, text, text, boolean);
drop function public.admin_create_booking(uuid[], timestamptz, text, text, text, boolean);
drop function public._create_booking(uuid[], timestamptz, text, text, text, public.appointment_source, boolean);
drop function public.admin_available_slots(date, integer);
drop function public.get_available_dates(date, date, integer);
drop function public.get_available_slots(date, integer);
drop function public.booking_window_ok(date);
drop function public._available_slots(date, integer, timestamptz);
drop function public.get_booking_by_token(text);
drop function public.cancel_booking_by_token(text);
drop function public.claim_due_reminders(integer);

drop table public.business_settings;
drop function public.business_tz();
drop table public.admins;
drop function public.is_admin();

-- 4. shop_id nas tabelas de negócio --------------------------------------------------
alter table public.services add column shop_id uuid not null references public.shops (id) on delete restrict;
create index services_shop_idx on public.services (shop_id, sort_order);

alter table public.business_hours drop constraint business_hours_pkey;
alter table public.business_hours add column shop_id uuid not null references public.shops (id) on delete cascade;
alter table public.business_hours add primary key (shop_id, weekday);

alter table public.schedule_blocks add column shop_id uuid not null references public.shops (id) on delete restrict;
create index schedule_blocks_shop_idx on public.schedule_blocks (shop_id);

alter table public.appointments add column shop_id uuid not null references public.shops (id) on delete restrict;
create index appointments_shop_starts_idx on public.appointments (shop_id, starts_at);

-- Sobreposição só dentro da mesma barbearia (atômico mesmo com requisições simultâneas).
alter table public.appointments drop constraint appointments_no_overlap;
alter table public.appointments add constraint appointments_no_overlap
  exclude using gist (shop_id extensions.gist_uuid_ops with =, during with &&) where (status <> 'cancelled');

-- Um agendamento só pode ter serviços da própria barbearia.
create function public.appointment_services_same_shop_trg()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if (select shop_id from public.appointments where id = new.appointment_id)
     is distinct from (select shop_id from public.services where id = new.service_id) then
    raise exception 'serviço de outra barbearia' using errcode = '23514';
  end if;
  return new;
end $$;
revoke all on function public.appointment_services_same_shop_trg() from public, anon, authenticated;
create trigger appointment_services_same_shop
  before insert or update on public.appointment_services
  for each row execute function public.appointment_services_same_shop_trg();

-- 5. RLS por barbearia ----------------------------------------------------------------
alter table public.shops enable row level security;
alter table public.shop_admins enable row level security;

-- Dados públicos da barbearia (nome, endereço, textos): qualquer um lê as ativas.
create policy shops_public_read on public.shops
  for select to anon, authenticated using (active or (select public.is_shop_admin(id)));
create policy shops_admin_update on public.shops
  for update to authenticated using ((select public.is_shop_admin(id))) with check ((select public.is_shop_admin(id)));
-- O dono altera só os textos e contatos: slug, status, demonstração e notificações ficam com o operador.
revoke insert, update, delete on public.shops from anon, authenticated;
grant update (
  name, street, number, complement, district, city, state, postal_code, whatsapp, email, instagram_url, about,
  hero_eyebrow, hero_title_line1, hero_title_line2, hero_subtitle, barber_name, barber_bio, barber_photo_url
) on public.shops to authenticated;

create policy shop_admins_self_read on public.shop_admins
  for select to authenticated using (user_id = (select auth.uid()));
revoke all on public.shop_admins from anon;
revoke insert, update, delete on public.shop_admins from authenticated;

create policy services_public_read on public.services
  for select to anon, authenticated using (active or (select public.is_shop_admin(shop_id)));
create policy services_admin_write on public.services
  for all to authenticated using ((select public.is_shop_admin(shop_id))) with check ((select public.is_shop_admin(shop_id)));

create policy hours_public_read on public.business_hours
  for select to anon, authenticated using (true);
create policy hours_admin_write on public.business_hours
  for all to authenticated using ((select public.is_shop_admin(shop_id))) with check ((select public.is_shop_admin(shop_id)));

create policy blocks_admin_all on public.schedule_blocks
  for all to authenticated using ((select public.is_shop_admin(shop_id))) with check ((select public.is_shop_admin(shop_id)));

create policy appointments_admin_all on public.appointments
  for all to authenticated using ((select public.is_shop_admin(shop_id))) with check ((select public.is_shop_admin(shop_id)));

-- Tabelas filhas herdam a barbearia do agendamento.
create function public.can_admin_appointment(p_appointment_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.appointments a
    where a.id = p_appointment_id and public.is_shop_admin(a.shop_id)
  );
$$;
revoke all on function public.can_admin_appointment(uuid) from public, anon;
grant execute on function public.can_admin_appointment(uuid) to authenticated;

create policy appointment_services_admin_all on public.appointment_services
  for all to authenticated
  using ((select public.can_admin_appointment(appointment_id)))
  with check ((select public.can_admin_appointment(appointment_id)));
create policy reminders_admin_read on public.reminders
  for select to authenticated using ((select public.can_admin_appointment(appointment_id)));
create policy notification_log_admin_read on public.notification_log
  for select to authenticated using ((select public.can_admin_appointment(appointment_id)));

-- 6. Funções auxiliares ------------------------------------------------------------------
create function public.shop_tz(p_shop_id uuid)
returns text language sql stable set search_path = '' as $$
  select coalesce((select timezone from public.shops where id = p_shop_id), 'America/Sao_Paulo');
$$;

-- Barbearia ativa pelo slug (null se não existir ou estiver inativa).
create function public.shop_id_by_slug(p_slug text)
returns uuid language sql stable security definer set search_path = '' as $$
  select id from public.shops where slug = p_slug and active;
$$;
revoke all on function public.shop_id_by_slug(text) from public, anon, authenticated;

create function public._require_shop(p_slug text)
returns uuid language plpgsql stable security definer set search_path = '' as $$
declare
  v uuid := public.shop_id_by_slug(p_slug);
begin
  if v is null then
    raise exception 'shop_not_found' using errcode = 'P0002';
  end if;
  return v;
end $$;
revoke all on function public._require_shop(text) from public, anon, authenticated;

create function public._require_shop_admin(p_shop_id uuid)
returns void language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_shop_admin(p_shop_id) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
end $$;
revoke all on function public._require_shop_admin(uuid) from public, anon;
grant execute on function public._require_shop_admin(uuid) to authenticated;

-- 7. Disponibilidade -------------------------------------------------------------------------
-- Horários livres (interno): passos de 15 min dentro do funcionamento da barbearia,
-- sem sobrepor intervalo, bloqueios e agendamentos ativos dela, a partir de p_min_start.
create function public._available_slots(
  p_shop_id uuid,
  p_date date,
  p_total_minutes integer,
  p_min_start timestamptz
)
returns table (slot timestamptz)
language sql stable security definer set search_path = '' as $$
  with h as (
    select bh.*, public.shop_tz(p_shop_id) as tz
    from public.business_hours bh
    where bh.shop_id = p_shop_id and bh.weekday = extract(dow from p_date)::smallint and bh.is_open
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
      where b.shop_id = p_shop_id
        and tstzrange(b.starts_at, b.ends_at, '[)') && tstzrange(c.slot_start, c.slot_end, '[)')
    )
    and not exists (
      select 1 from public.appointments a
      where a.shop_id = p_shop_id
        and a.status <> 'cancelled'
        and a.during && tstzrange(c.slot_start, c.slot_end, '[)')
    )
  order by c.slot_start;
$$;
revoke all on function public._available_slots(uuid, date, integer, timestamptz) from public, anon, authenticated;

-- Janela pública: hoje até 30 dias, no fuso da barbearia.
create function public.booking_window_ok(p_shop_id uuid, p_date date)
returns boolean language sql stable set search_path = '' as $$
  select p_date between (now() at time zone public.shop_tz(p_shop_id))::date
                    and (now() at time zone public.shop_tz(p_shop_id))::date + 30;
$$;

-- Público: antecedência mínima de 60 min.
create function public.get_available_slots(p_shop_slug text, p_date date, p_total_minutes integer)
returns table (slot timestamptz)
language plpgsql stable security definer set search_path = '' as $$
declare
  v_shop uuid := public._require_shop(p_shop_slug);
begin
  return query
    select s.slot from public._available_slots(v_shop, p_date, p_total_minutes, now() + interval '60 minutes') s
    where public.booking_window_ok(v_shop, p_date);
end $$;

-- Datas com pelo menos um horário livre no intervalo pedido (para o calendário).
create function public.get_available_dates(p_shop_slug text, p_from date, p_to date, p_total_minutes integer)
returns table (day date)
language plpgsql stable security definer set search_path = '' as $$
declare
  v_shop uuid := public._require_shop(p_shop_slug);
begin
  return query
    select d::date
    from generate_series(p_from, least(p_to, p_from + 62), interval '1 day') d
    where public.booking_window_ok(v_shop, d::date)
      and exists (select 1 from public._available_slots(v_shop, d::date, p_total_minutes, now() + interval '60 minutes'));
end $$;

-- Painel: sem janela e sem antecedência mínima (apenas não no passado).
create function public.admin_available_slots(p_shop_id uuid, p_date date, p_total_minutes integer)
returns table (slot timestamptz)
language plpgsql stable security definer set search_path = '' as $$
begin
  perform public._require_shop_admin(p_shop_id);
  return query select s.slot from public._available_slots(p_shop_id, p_date, p_total_minutes, now()) s;
end $$;

-- 8. Criação de agendamento ---------------------------------------------------------------
-- Retorna jsonb: { ok: true, id, token } ou { ok: false, error: <código> }
-- Códigos: shop_not_found, invalid_services, invalid_data, slot_unavailable, slot_taken, limit_reached
create function public._create_booking(
  p_shop_id uuid,
  p_service_ids uuid[],
  p_starts_at timestamptz,
  p_name text,
  p_phone text,
  p_email text,
  p_source public.appointment_source,
  p_whatsapp_opt_in boolean default false
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
  where id = any (p_service_ids) and active and shop_id = p_shop_id;

  if coalesce(array_length(p_service_ids, 1), 0) = 0
     or v_count <> (select count(distinct x) from unnest(p_service_ids) x) then
    return jsonb_build_object('ok', false, 'error', 'invalid_services');
  end if;

  v_local_date := (p_starts_at at time zone public.shop_tz(p_shop_id))::date;

  if p_source = 'web' then
    if not public.booking_window_ok(p_shop_id, v_local_date) then
      return jsonb_build_object('ok', false, 'error', 'slot_unavailable');
    end if;
    v_min_start := now() + interval '60 minutes';
    if (select count(*) from public.appointments
        where shop_id = p_shop_id and customer_phone = p_phone and status = 'confirmed' and starts_at > now()) >= 2 then
      return jsonb_build_object('ok', false, 'error', 'limit_reached');
    end if;
  else
    v_min_start := now();
  end if;

  if not exists (
    select 1 from public._available_slots(p_shop_id, v_local_date, v_total_min, v_min_start) s where s.slot = p_starts_at
  ) then
    -- Distingue "acabou de ser ocupado" de "fora do funcionamento".
    if exists (
      select 1 from public.appointments a
      where a.shop_id = p_shop_id
        and a.status <> 'cancelled'
        and a.during && tstzrange(p_starts_at, p_starts_at + make_interval(mins => v_total_min), '[)')
    ) then
      return jsonb_build_object('ok', false, 'error', 'slot_taken');
    end if;
    return jsonb_build_object('ok', false, 'error', 'slot_unavailable');
  end if;

  v_token := translate(encode(extensions.gen_random_bytes(32), 'base64'), '+/=', '-_');

  begin
    insert into public.appointments
      (shop_id, customer_name, customer_phone, customer_email, starts_at, ends_at, total_cents, manage_token_hash, source, whatsapp_opt_in)
    values
      (p_shop_id, btrim(p_name), p_phone, v_email, p_starts_at, p_starts_at + make_interval(mins => v_total_min),
       v_total_cents, public.hash_token(v_token), p_source, coalesce(p_whatsapp_opt_in, false))
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
revoke all on function public._create_booking(uuid, uuid[], timestamptz, text, text, text, public.appointment_source, boolean)
  from public, anon, authenticated;

-- Público: chamado apenas pelo servidor (service_role), que aplica rate limit por IP.
create function public.create_booking(
  p_shop_slug text, p_service_ids uuid[], p_starts_at timestamptz, p_name text, p_phone text,
  p_email text default null, p_whatsapp_opt_in boolean default false
)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare
  v_shop uuid := public.shop_id_by_slug(p_shop_slug);
begin
  if v_shop is null then
    return jsonb_build_object('ok', false, 'error', 'shop_not_found');
  end if;
  return public._create_booking(v_shop, p_service_ids, p_starts_at, p_name, p_phone, p_email, 'web', p_whatsapp_opt_in);
end $$;

-- Painel: sem antecedência mínima nem limite por cliente.
create function public.admin_create_booking(
  p_shop_id uuid, p_service_ids uuid[], p_starts_at timestamptz, p_name text, p_phone text,
  p_email text default null, p_whatsapp_opt_in boolean default false
)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
begin
  perform public._require_shop_admin(p_shop_id);
  return public._create_booking(p_shop_id, p_service_ids, p_starts_at, p_name, p_phone, p_email, 'admin', p_whatsapp_opt_in);
end $$;

-- 9. Consulta e cancelamento por token (só no endereço da barbearia do agendamento) -------
create function public.get_booking_by_token(p_shop_slug text, p_token text)
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
  where a.manage_token_hash = public.hash_token(p_token)
    and a.shop_id = public.shop_id_by_slug(p_shop_slug);
$$;

-- Retorna { ok, appointment_id?, error? } com códigos: not_found, not_cancellable, too_late
create function public.cancel_booking_by_token(p_shop_slug text, p_token text)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare
  v public.appointments;
begin
  select * into v from public.appointments
  where manage_token_hash = public.hash_token(p_token)
    and shop_id = public.shop_id_by_slug(p_shop_slug)
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
  return jsonb_build_object('ok', true, 'appointment_id', v.id);
end $$;

-- 10. Lembretes: nenhum para barbearias com notificações desligadas (demonstração) -------
create or replace function public.schedule_reminders(p_appointment_id uuid, p_channel public.reminder_channel)
returns void language sql volatile security definer set search_path = '' as $$
  insert into public.reminders (appointment_id, kind, channel, send_at)
  select a.id, k.kind, p_channel, a.starts_at - k.lead
  from public.appointments a
  join public.shops sh on sh.id = a.shop_id
  cross join (values ('h24'::public.reminder_kind, interval '24 hours'), ('h2'::public.reminder_kind, interval '2 hours')) as k(kind, lead)
  where a.id = p_appointment_id
    and a.status = 'confirmed'
    and sh.notifications_enabled
    and a.starts_at - k.lead > now()
  on conflict (appointment_id, kind, channel) do nothing;
$$;

create function public.claim_due_reminders(p_limit integer default 50)
returns table (
  reminder_id uuid,
  appointment_id uuid,
  kind public.reminder_kind,
  channel public.reminder_channel,
  starts_at timestamptz,
  customer_name text,
  customer_email text,
  services text,
  customer_phone text,
  whatsapp_opt_in boolean,
  shop_id uuid
)
language sql volatile security definer set search_path = '' as $$
  with due as (
    select r.id
    from public.reminders r
    join public.appointments a on a.id = r.appointment_id
    join public.shops sh on sh.id = a.shop_id
    where r.sent_at is null
      and r.send_at <= now()
      and a.status = 'confirmed'
      and a.starts_at > now()
      and sh.notifications_enabled
    order by r.send_at
    limit p_limit
    for update of r skip locked
  ),
  claimed as (
    update public.reminders r set sent_at = now()
    from due where r.id = due.id
    returning r.id, r.appointment_id, r.kind, r.channel
  )
  select c.id, c.appointment_id, c.kind, c.channel, a.starts_at, a.customer_name, a.customer_email,
         (select string_agg(s.name_snapshot, ' + ' order by s.name_snapshot) from public.appointment_services s where s.appointment_id = a.id),
         a.customer_phone, a.whatsapp_opt_in, a.shop_id
  from claimed c join public.appointments a on a.id = c.appointment_id;
$$;

-- 11. Cadastro de barbearia (operador, via scripts/create-shop.mjs) ---------------------------
-- Entrada: { slug, name, ..., hours: [{weekday, is_open, open_time, close_time, break_start, break_end}],
--            services: [{name, description, price_cents, duration_min, is_combo}], owner_user_id }
-- Tudo numa transação: qualquer erro desfaz o cadastro inteiro.
create function public.provision_shop(p jsonb)
returns uuid language plpgsql volatile security definer set search_path = '' as $$
declare
  v_shop uuid;
  v_i integer := 0;
  s jsonb;
begin
  if exists (select 1 from public.shops where slug = p->>'slug') then
    raise exception 'slug_taken: %', p->>'slug' using errcode = '23505';
  end if;

  insert into public.shops (
    slug, name, street, number, complement, district, city, state, postal_code, whatsapp, email, instagram_url, about,
    timezone, hero_eyebrow, hero_title_line1, hero_title_line2, hero_subtitle, barber_name, barber_bio, barber_photo_url,
    is_demo, notifications_enabled
  ) values (
    p->>'slug', p->>'name',
    coalesce(p->>'street', ''), coalesce(p->>'number', ''), coalesce(p->>'complement', ''), coalesce(p->>'district', ''),
    coalesce(p->>'city', ''), coalesce(p->>'state', ''), coalesce(p->>'postal_code', ''), coalesce(p->>'whatsapp', ''),
    coalesce(p->>'email', ''), coalesce(p->>'instagram_url', ''), coalesce(p->>'about', ''),
    coalesce(p->>'timezone', 'America/Sao_Paulo'),
    coalesce(p->>'hero_eyebrow', ''), coalesce(p->>'hero_title_line1', ''), coalesce(p->>'hero_title_line2', ''),
    coalesce(p->>'hero_subtitle', ''), coalesce(p->>'barber_name', ''), coalesce(p->>'barber_bio', ''),
    coalesce(p->>'barber_photo_url', ''),
    coalesce((p->>'is_demo')::boolean, false), coalesce((p->>'notifications_enabled')::boolean, true)
  ) returning id into v_shop;

  insert into public.business_hours (shop_id, weekday, is_open, open_time, close_time, break_start, break_end)
  select v_shop, d.weekday, coalesce(h.is_open, false), h.open_time, h.close_time, h.break_start, h.break_end
  from generate_series(0, 6) as d(weekday)
  left join jsonb_to_recordset(coalesce(p->'hours', '[]'::jsonb))
    as h(weekday smallint, is_open boolean, open_time time, close_time time, break_start time, break_end time)
    on h.weekday = d.weekday;

  for s in select * from jsonb_array_elements(coalesce(p->'services', '[]'::jsonb)) loop
    v_i := v_i + 1;
    insert into public.services (shop_id, name, description, price_cents, duration_min, sort_order, is_combo)
    values (v_shop, s->>'name', coalesce(s->>'description', ''), (s->>'price_cents')::integer,
            (s->>'duration_min')::integer, v_i * 10, coalesce((s->>'is_combo')::boolean, false));
  end loop;

  if p ? 'owner_user_id' then
    insert into public.shop_admins (shop_id, user_id) values (v_shop, (p->>'owner_user_id')::uuid);
  end if;

  return v_shop;
end $$;
revoke all on function public.provision_shop(jsonb) from public, anon, authenticated;
grant execute on function public.provision_shop(jsonb) to service_role;

-- 12. Permissões ----------------------------------------------------------------------------
revoke all on function public.create_booking(text, uuid[], timestamptz, text, text, text, boolean) from public, anon, authenticated;
grant execute on function public.create_booking(text, uuid[], timestamptz, text, text, text, boolean) to service_role;

revoke all on function public.get_available_slots(text, date, integer) from public;
revoke all on function public.get_available_dates(text, date, date, integer) from public;
revoke all on function public.get_booking_by_token(text, text) from public;
revoke all on function public.cancel_booking_by_token(text, text) from public;
grant execute on function public.get_available_slots(text, date, integer) to anon, authenticated, service_role;
grant execute on function public.get_available_dates(text, date, date, integer) to anon, authenticated, service_role;
grant execute on function public.get_booking_by_token(text, text) to anon, authenticated, service_role;
grant execute on function public.cancel_booking_by_token(text, text) to anon, authenticated, service_role;

revoke all on function public.admin_available_slots(uuid, date, integer) from public, anon;
revoke all on function public.admin_create_booking(uuid, uuid[], timestamptz, text, text, text, boolean) from public, anon;
grant execute on function public.admin_available_slots(uuid, date, integer) to authenticated;
grant execute on function public.admin_create_booking(uuid, uuid[], timestamptz, text, text, text, boolean) to authenticated;

revoke all on function public.claim_due_reminders(integer) from public, anon, authenticated;
grant execute on function public.claim_due_reminders(integer) to service_role;
