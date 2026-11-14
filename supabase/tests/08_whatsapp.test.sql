-- WhatsApp: consentimento, lembretes, reserva com telefone, cancelamento e envio único.
begin;
select plan(17);

create temporary table t_day as
select d::date as day
from generate_series((now() at time zone 'America/Sao_Paulo')::date + 2,
                     (now() at time zone 'America/Sao_Paulo')::date + 9, interval '1 day') d
where extract(dow from d) = 3   -- quarta-feira
limit 1;

create or replace function pg_temp.at_local(t time) returns timestamptz language sql as $$
  select ((select day from t_day) + t) at time zone 'America/Sao_Paulo';
$$;
create or replace function pg_temp.svc(n text) returns uuid language sql as $$
  select id from public.services where name = n;
$$;

-- 1.1: o canal existe
select ok('whatsapp' = any (enum_range(null::public.reminder_channel)::text[]), 'enum reminder_channel tem whatsapp');

-- 1.2: consentimento gravado pelo create_booking
create temporary table t_sem as
select public.create_booking(array[pg_temp.svc('Barba')], pg_temp.at_local('10:00'), 'Sem Param', '+5511944440001') as r;
create temporary table t_com as
select public.create_booking(array[pg_temp.svc('Barba')], pg_temp.at_local('11:00'), 'Com Opt', '+5511944440002', null, true) as r;

select is((select r->>'ok' from t_sem), 'true', 'create_booking sem o parâmetro continua funcionando');
select is((select whatsapp_opt_in from public.appointments where id = (select (r->>'id')::uuid from t_sem)), false, 'sem o parâmetro grava false');
select is((select whatsapp_opt_in from public.appointments where id = (select (r->>'id')::uuid from t_com)), true, 'com true grava true');
select ok(not has_function_privilege('anon', 'public.create_booking(uuid[], timestamptz, text, text, text, boolean)', 'execute'), 'anon não executa create_booking');
select ok(has_function_privilege('authenticated', 'public.admin_create_booking(uuid[], timestamptz, text, text, text, boolean)', 'execute'), 'authenticated executa admin_create_booking (checa is_admin dentro)');

-- 1.3: lembretes por WhatsApp só com consentimento
select is(
  (select count(*)::int from public.reminders where appointment_id = (select (r->>'id')::uuid from t_com) and channel = 'whatsapp'),
  2, 'com consentimento e a dias de distância: h24 e h2 por WhatsApp'
);
select is(
  (select count(*)::int from public.reminders where appointment_id = (select (r->>'id')::uuid from t_sem) and channel = 'whatsapp'),
  0, 'sem consentimento: nenhum lembrete por WhatsApp'
);

insert into public.appointments (customer_name, customer_phone, starts_at, ends_at, total_cents, manage_token_hash, whatsapp_opt_in)
values ('Perto Zap', '+5511944440003', now() + interval '5 hours', now() + interval '5 hours 30 minutes', 4500,
        public.hash_token('token-pertozap-1234567890123'), true);
select is(
  (select array_agg(kind::text || '/' || channel::text) from public.reminders r join public.appointments a on a.id = r.appointment_id where a.customer_name = 'Perto Zap'),
  array['h2/whatsapp'], 'a 5 h com consentimento: só h2 por WhatsApp'
);

insert into public.appointments (customer_name, customer_phone, customer_email, starts_at, ends_at, total_cents, manage_token_hash)
values ('Email Ok', '+5511944440004', 'email@ex.com', now() + interval '3 days 3 hours', now() + interval '3 days 3 hours 30 minutes', 4500,
        public.hash_token('token-emailok-12345678901234'));
select is(
  (select count(*)::int from public.reminders r join public.appointments a on a.id = r.appointment_id where a.customer_name = 'Email Ok' and channel = 'email'),
  2, 'lembretes por e-mail continuam sendo agendados'
);

-- 1.4: reserva devolve telefone e consentimento
update public.reminders set send_at = now() - interval '1 minute'
where appointment_id = (select id from public.appointments where customer_name = 'Perto Zap');
select is(
  (select customer_phone || '|' || whatsapp_opt_in::text || '|' || channel::text from public.claim_due_reminders(50) c where c.customer_name = 'Perto Zap'),
  '+5511944440003|true|whatsapp', 'claim_due_reminders retorna telefone e consentimento'
);

-- 1.5: cancelamento pelo token devolve o id
insert into public.appointments (customer_name, customer_phone, starts_at, ends_at, total_cents, manage_token_hash)
values ('Em 1h', '+5511944440005', now() + interval '1 hour', now() + interval '1 hour 30 minutes', 4500,
        public.hash_token('token-em1hora-12345678901234'));
select is(
  public.cancel_booking_by_token('token-em1hora-12345678901234')->>'error', 'too_late', 'a menos de 2 h continua too_late'
);
select is(
  public.cancel_booking_by_token('token-emailok-12345678901234')->>'appointment_id',
  (select id::text from public.appointments where customer_name = 'Email Ok'), 'sucesso devolve appointment_id'
);
select is(public.cancel_booking_by_token('token-inexistente-123456789')->>'error', 'not_found', 'token inválido continua not_found');

-- 1.6: envio único do aviso de cancelamento
select isnt(public.claim_notification((select id from public.appointments where customer_name = 'Email Ok'), 'whatsapp', 'cancelled_client'), null, '1ª reserva do aviso retorna id');
select is(public.claim_notification((select id from public.appointments where customer_name = 'Email Ok'), 'whatsapp', 'cancelled_client'), null, '2ª reserva do aviso retorna null');
select ok(
  not has_function_privilege('anon', 'public.claim_notification(uuid, text, text)', 'execute')
  and not has_function_privilege('authenticated', 'public.claim_notification(uuid, text, text)', 'execute'),
  'anon e authenticated não executam claim_notification'
);

select * from finish();
rollback;
