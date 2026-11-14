-- Lembretes: agendamento dos horários de envio, inscrição de push e reserva idempotente.
begin;
select plan(13);

create or replace function pg_temp.svc(n text) returns uuid language sql as $$
  select id from public.services where name = n;
$$;

-- Agendamento a ~5 h com e-mail: só o lembrete de 2 h (o de 24 h já passou).
insert into public.appointments (customer_name, customer_phone, customer_email, starts_at, ends_at, total_cents, manage_token_hash)
values ('Perto', '+5511900000001', 'perto@ex.com', now() + interval '5 hours', now() + interval '5 hours 30 minutes', 4500, public.hash_token('token-perto-123456789012345'));
select is(
  (select array_agg(kind::text order by kind) from public.reminders r join public.appointments a on a.id = r.appointment_id where a.customer_name = 'Perto'),
  array['h2'], 'agendamento a 5 h gera apenas o lembrete de 2 h'
);

-- Agendamento a 3 dias com e-mail: h24 e h2.
insert into public.appointments (customer_name, customer_phone, customer_email, starts_at, ends_at, total_cents, manage_token_hash)
values ('Longe', '+5511900000002', 'longe@ex.com', now() + interval '3 days', now() + interval '3 days 30 minutes', 4500, public.hash_token('token-longe-12345678901234'));
select is(
  (select count(*)::int from public.reminders r join public.appointments a on a.id = r.appointment_id where a.customer_name = 'Longe' and channel = 'email'),
  2, 'agendamento a 3 dias gera h24 e h2 por e-mail'
);

-- Sem e-mail: nenhum lembrete até ativar push.
insert into public.appointments (customer_name, customer_phone, starts_at, ends_at, total_cents, manage_token_hash)
values ('SemEmail', '+5511900000003', now() + interval '3 days 2 hours', now() + interval '3 days 2 hours 30 minutes', 4500, public.hash_token('token-semmail-1234567890123'));
select is((select count(*)::int from public.reminders r join public.appointments a on a.id = r.appointment_id where a.customer_name = 'SemEmail'), 0, 'sem e-mail não gera lembretes');

-- Inscrição de push
select is(public.add_push_subscription('token-errado', 'https://push.example/x', 'k', 'a')->>'error', 'not_found', 'token inválido é recusado');
select is(public.add_push_subscription('token-semmail-1234567890123', 'http://inseguro/x', 'k', 'a')->>'error', 'invalid', 'endpoint sem https é recusado');
select is(public.add_push_subscription('token-semmail-1234567890123', 'https://push.example/abc', 'p256', 'auth')->>'ok', 'true', 'inscrição válida é aceita');
select is((select count(*)::int from public.reminders r join public.appointments a on a.id = r.appointment_id where a.customer_name = 'SemEmail' and channel = 'push'), 2, 'push gera h24 e h2');
select lives_ok($$select public.add_push_subscription('token-semmail-1234567890123', 'https://push.example/abc', 'p256', 'auth')$$, 'reinscrição não duplica');
select is((select count(*)::int from public.push_subscriptions where endpoint = 'https://push.example/abc'), 1, 'uma linha por endpoint');

-- Reserva: força os lembretes de "Longe" a vencerem agora.
update public.reminders set send_at = now() - interval '1 minute'
where appointment_id = (select id from public.appointments where customer_name = 'Longe');
select is((select count(*)::int from public.claim_due_reminders(50) c where c.customer_name = 'Longe'), 2, '1ª execução reserva os 2 lembretes');
select is((select count(*)::int from public.claim_due_reminders(50) c where c.customer_name = 'Longe'), 0, '2ª execução não reserva de novo');

-- Cancelado não é reservado.
update public.reminders set send_at = now() - interval '1 minute'
where appointment_id = (select id from public.appointments where customer_name = 'SemEmail');
update public.appointments set status = 'cancelled' where customer_name = 'SemEmail';
select is((select count(*)::int from public.claim_due_reminders(50) c where c.customer_name = 'SemEmail'), 0, 'agendamento cancelado não recebe lembrete');

-- Liberação após falha temporária devolve à fila.
select public.release_reminder((select id from public.reminders where appointment_id = (select id from public.appointments where customer_name = 'Longe') and kind = 'h2'));
select is((select count(*)::int from public.claim_due_reminders(50) c where c.customer_name = 'Longe'), 1, 'lembrete liberado volta a ser reservado');

select * from finish();
rollback;
