-- Mensagens transacionais pelo WhatsApp: consentimento, lembretes, cancelamento e envio único.

-- Consentimento -------------------------------------------------------------------
-- Agendamentos antigos ficam sem consentimento (nenhuma mensagem é enviada para eles).
alter table public.appointments add column whatsapp_opt_in boolean not null default false;

-- Criação de agendamento com consentimento ------------------------------------------
drop function if exists public.create_booking(uuid[], timestamptz, text, text, text);
drop function if exists public.admin_create_booking(uuid[], timestamptz, text, text, text);
drop function if exists public._create_booking(uuid[], timestamptz, text, text, text, public.appointment_source);

-- Retorna jsonb: { ok: true, id, token } ou { ok: false, error: <código> }
-- Códigos: invalid_services, invalid_data, slot_unavailable, slot_taken, limit_reached
create function public._create_booking(
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
      (customer_name, customer_phone, customer_email, starts_at, ends_at, total_cents, manage_token_hash, source, whatsapp_opt_in)
    values
      (btrim(p_name), p_phone, v_email, p_starts_at, p_starts_at + make_interval(mins => v_total_min),
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

-- Público: chamado apenas pelo servidor (service_role), que aplica rate limit por IP.
create function public.create_booking(
  p_service_ids uuid[], p_starts_at timestamptz, p_name text, p_phone text, p_email text default null,
  p_whatsapp_opt_in boolean default false
)
returns jsonb language sql volatile security definer set search_path = '' as $$
  select public._create_booking(p_service_ids, p_starts_at, p_name, p_phone, p_email, 'web', p_whatsapp_opt_in);
$$;

-- Admin: sem antecedência mínima nem limite por cliente.
create function public.admin_create_booking(
  p_service_ids uuid[], p_starts_at timestamptz, p_name text, p_phone text, p_email text default null,
  p_whatsapp_opt_in boolean default false
)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
begin
  if not public.is_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  return public._create_booking(p_service_ids, p_starts_at, p_name, p_phone, p_email, 'admin', p_whatsapp_opt_in);
end $$;

revoke all on function public._create_booking(uuid[], timestamptz, text, text, text, public.appointment_source, boolean) from public, anon, authenticated;
revoke all on function public.create_booking(uuid[], timestamptz, text, text, text, boolean) from public, anon, authenticated;
grant execute on function public.create_booking(uuid[], timestamptz, text, text, text, boolean) to service_role;
revoke all on function public.admin_create_booking(uuid[], timestamptz, text, text, text, boolean) from public, anon;
grant execute on function public.admin_create_booking(uuid[], timestamptz, text, text, text, boolean) to authenticated;

-- Lembretes: e-mail quando há e-mail, WhatsApp quando há consentimento --------------
drop trigger if exists appointments_schedule_email_reminders on public.appointments;
drop function if exists public.schedule_email_reminders_trg();

create function public.schedule_reminders_trg()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.customer_email is not null then
    perform public.schedule_reminders(new.id, 'email');
  end if;
  if new.whatsapp_opt_in then
    perform public.schedule_reminders(new.id, 'whatsapp');
  end if;
  return new;
end $$;
revoke all on function public.schedule_reminders_trg() from public, anon, authenticated;

create trigger appointments_schedule_reminders
  after insert on public.appointments
  for each row execute function public.schedule_reminders_trg();

-- Reserva de lembretes vencidos, agora com telefone e consentimento -----------------
drop function if exists public.claim_due_reminders(integer);
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
  whatsapp_opt_in boolean
)
language sql volatile security definer set search_path = '' as $$
  with due as (
    select r.id
    from public.reminders r
    join public.appointments a on a.id = r.appointment_id
    where r.sent_at is null
      and r.send_at <= now()
      and a.status = 'confirmed'
      and a.starts_at > now()
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
         a.customer_phone, a.whatsapp_opt_in
  from claimed c join public.appointments a on a.id = c.appointment_id;
$$;
revoke all on function public.claim_due_reminders(integer) from public, anon, authenticated;
grant execute on function public.claim_due_reminders(integer) to service_role;

-- Cancelamento pelo cliente devolve o id (para o aviso pelo WhatsApp) ----------------
-- Retorna { ok, appointment_id? , error? } com códigos: not_found, not_cancellable, too_late
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
  return jsonb_build_object('ok', true, 'appointment_id', v.id);
end $$;

-- Aviso de cancelamento: no máximo um por agendamento e canal -----------------------
create unique index notification_log_cancel_once_idx
  on public.notification_log (appointment_id, channel, kind)
  where kind in ('cancelled_admin', 'cancelled_client');

-- Reserva o envio de uma notificação única. Retorna o id da linha de log criada
-- (status 'pending') ou null quando ela já foi reservada antes.
create function public.claim_notification(p_appointment_id uuid, p_channel text, p_kind text)
returns bigint language plpgsql volatile security definer set search_path = '' as $$
declare
  v_id bigint;
begin
  if p_kind not in ('cancelled_admin', 'cancelled_client') then
    raise exception 'kind sem envio único: %', p_kind using errcode = '22023';
  end if;
  insert into public.notification_log (appointment_id, channel, kind, status)
  values (p_appointment_id, p_channel, p_kind, 'pending')
  on conflict (appointment_id, channel, kind) where kind in ('cancelled_admin', 'cancelled_client') do nothing
  returning id into v_id;
  return v_id;
end $$;
revoke all on function public.claim_notification(uuid, text, text) from public, anon, authenticated;
grant execute on function public.claim_notification(uuid, text, text) to service_role;
