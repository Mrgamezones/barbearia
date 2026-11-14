-- Lembretes por push (Web Push) e e-mail.

create type public.reminder_kind as enum ('h24', 'h2');
create type public.reminder_channel as enum ('push', 'email');

create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid not null references public.appointments (id) on delete cascade,
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now(),
  unique (appointment_id, endpoint)
);

create table public.reminders (
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid not null references public.appointments (id) on delete cascade,
  kind public.reminder_kind not null,
  channel public.reminder_channel not null,
  send_at timestamptz not null,
  sent_at timestamptz,
  unique (appointment_id, kind, channel)
);
create index reminders_due_idx on public.reminders (send_at) where sent_at is null;

-- Registro de envios (auditoria e depuração).
create table public.notification_log (
  id bigint generated always as identity primary key,
  appointment_id uuid references public.appointments (id) on delete cascade,
  reminder_id uuid references public.reminders (id) on delete set null,
  channel text not null,
  kind text not null,
  status text not null,
  detail text,
  created_at timestamptz not null default now()
);

alter table public.push_subscriptions enable row level security;
alter table public.reminders enable row level security;
alter table public.notification_log enable row level security;
create policy reminders_admin_read on public.reminders for select to authenticated using ((select public.is_admin()));
create policy notification_log_admin_read on public.notification_log for select to authenticated using ((select public.is_admin()));
revoke all on public.push_subscriptions, public.reminders, public.notification_log from anon, authenticated;
grant select on public.reminders, public.notification_log to authenticated;

-- Agenda os lembretes de 24 h e 2 h de um canal, apenas os que ainda estão no futuro.
create or replace function public.schedule_reminders(p_appointment_id uuid, p_channel public.reminder_channel)
returns void language sql volatile security definer set search_path = '' as $$
  insert into public.reminders (appointment_id, kind, channel, send_at)
  select a.id, k.kind, p_channel, a.starts_at - k.lead
  from public.appointments a
  cross join (values ('h24'::public.reminder_kind, interval '24 hours'), ('h2'::public.reminder_kind, interval '2 hours')) as k(kind, lead)
  where a.id = p_appointment_id
    and a.status = 'confirmed'
    and a.starts_at - k.lead > now()
  on conflict (appointment_id, kind, channel) do nothing;
$$;
revoke all on function public.schedule_reminders(uuid, public.reminder_channel) from public, anon, authenticated;

-- Agendamento com e-mail já nasce com lembretes por e-mail.
create or replace function public.schedule_email_reminders_trg()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.customer_email is not null then
    perform public.schedule_reminders(new.id, 'email');
  end if;
  return new;
end $$;

create trigger appointments_schedule_email_reminders
  after insert on public.appointments
  for each row execute function public.schedule_email_reminders_trg();

-- Inscrição de push vinculada a um agendamento (validada pelo token do link).
-- Retorna { ok, error?, appointment_id? }. Códigos: not_found, not_active
create or replace function public.add_push_subscription(p_token text, p_endpoint text, p_p256dh text, p_auth text)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare
  v public.appointments;
begin
  select * into v from public.appointments where manage_token_hash = public.hash_token(p_token);
  if not found then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;
  if v.status <> 'confirmed' or v.starts_at <= now() then
    return jsonb_build_object('ok', false, 'error', 'not_active');
  end if;
  if p_endpoint !~ '^https://' or length(p_endpoint) > 2000 or length(p_p256dh) > 200 or length(p_auth) > 100 then
    return jsonb_build_object('ok', false, 'error', 'invalid');
  end if;

  insert into public.push_subscriptions (appointment_id, endpoint, p256dh, auth)
  values (v.id, p_endpoint, p_p256dh, p_auth)
  on conflict (appointment_id, endpoint) do update set p256dh = excluded.p256dh, auth = excluded.auth;

  perform public.schedule_reminders(v.id, 'push');
  return jsonb_build_object('ok', true, 'appointment_id', v.id);
end $$;
revoke all on function public.add_push_subscription(text, text, text, text) from public;
grant execute on function public.add_push_subscription(text, text, text, text) to anon, authenticated, service_role;

-- Reserva lembretes vencidos de agendamentos confirmados, marcando sent_at na mesma operação.
-- SKIP LOCKED garante que execuções simultâneas não peguem o mesmo lembrete.
create or replace function public.claim_due_reminders(p_limit integer default 50)
returns table (
  reminder_id uuid,
  appointment_id uuid,
  kind public.reminder_kind,
  channel public.reminder_channel,
  starts_at timestamptz,
  customer_name text,
  customer_email text,
  services text
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
         (select string_agg(s.name_snapshot, ' + ' order by s.name_snapshot) from public.appointment_services s where s.appointment_id = a.id)
  from claimed c join public.appointments a on a.id = c.appointment_id;
$$;

-- Devolve um lembrete à fila após falha temporária de envio.
create or replace function public.release_reminder(p_reminder_id uuid)
returns void language sql volatile security definer set search_path = '' as $$
  update public.reminders set sent_at = null where id = p_reminder_id;
$$;

revoke all on function public.claim_due_reminders(integer) from public, anon, authenticated;
revoke all on function public.release_reminder(uuid) from public, anon, authenticated;
grant execute on function public.claim_due_reminders(integer) to service_role;
grant execute on function public.release_reminder(uuid) to service_role;
