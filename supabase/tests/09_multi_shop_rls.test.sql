-- Várias barbearias: agendas independentes, isolamento entre donos, RPCs por barbearia,
-- demonstração sem notificações e cadastro de barbearia.
-- A = demonstração (dono a…01), B = barbearia-teste (dono a…02), ambos do seed.
begin;
select plan(44);

create temporary table t_day as
select d::date as day
from generate_series((now() at time zone 'America/Sao_Paulo')::date + 2,
                     (now() at time zone 'America/Sao_Paulo')::date + 9, interval '1 day') d
where extract(dow from d) = 3   -- quarta-feira (aberta nas duas)
limit 1;
grant select on t_day to authenticated;

create or replace function pg_temp.at_local(t time) returns timestamptz language sql as $$
  select ((select day from t_day) + t) at time zone 'America/Sao_Paulo';
$$;
create or replace function pg_temp.a() returns uuid language sql as $$ select '5a000000-0000-4000-8000-000000000001'::uuid $$;
create or replace function pg_temp.b() returns uuid language sql as $$ select '5a000000-0000-4000-8000-000000000002'::uuid $$;
create or replace function pg_temp.svc(shop uuid, n text) returns uuid language sql as $$
  select id from public.services where shop_id = shop and name = n;
$$;

-- Dados da barbearia A usados nos testes de isolamento.
insert into public.services (shop_id, name, price_cents, duration_min, active) values (pg_temp.a(), 'Inativo A', 1000, 30, false);
insert into public.schedule_blocks (shop_id, starts_at, ends_at, reason)
values (pg_temp.a(), pg_temp.at_local('15:00'), pg_temp.at_local('17:00'), 'Bloqueio A');
create temporary table t_a as
select public.create_booking('demonstracao', array[pg_temp.svc(pg_temp.a(), 'Barba')], pg_temp.at_local('10:00'),
                             'Cliente A', '+5511933330001', 'cliente-a@ex.com', true) as r;
grant select on t_a to authenticated;

-- 1.2 Agendas independentes ------------------------------------------------------------------
select is((select r->>'ok' from t_a), 'true', 'A: agendamento às 10h confirmado');
select is(
  public.create_booking('barbearia-teste', array[pg_temp.svc(pg_temp.b(), 'Barba')], pg_temp.at_local('10:00'), 'Cliente B', '+5511933330002')->>'ok',
  'true', 'B: mesmo horário das 10h também é confirmado'
);
select is(
  public.create_booking('demonstracao', array[pg_temp.svc(pg_temp.a(), 'Corte de cabelo')], pg_temp.at_local('10:00'), 'Outro A', '+5511933330003')->>'error',
  'slot_taken', 'A: segundo agendamento às 10h é recusado'
);
select ok(
  not exists (select 1 from public.get_available_slots('demonstracao', (select day from t_day), 30) where slot = pg_temp.at_local('15:30')),
  'A: tarde bloqueada sem horários'
);
select ok(
  exists (select 1 from public.get_available_slots('barbearia-teste', (select day from t_day), 30) where slot = pg_temp.at_local('15:30')),
  'B: bloqueio da A não afeta a B'
);
select is(
  (select count(*)::int from public.appointments where shop_id = pg_temp.b() and starts_at = pg_temp.at_local('10:00')),
  1, 'B: agendamento gravado na barbearia B'
);

-- 1.3 Isolamento entre donos (dono da B tentando a A) -----------------------------------------
set local role authenticated;
set local request.jwt.claims = '{"sub":"a0000000-0000-4000-8000-000000000002","role":"authenticated"}';

select is(public.is_shop_admin(pg_temp.a()), false, 'dono B não é admin da A');
select is(public.is_shop_admin(pg_temp.b()), true, 'dono B é admin da B');
select is((select array_agg(slug) from public.my_shops()), array['barbearia-teste'], 'my_shops lista só a B');

select is((select count(*)::int from public.appointments where shop_id = pg_temp.a()), 0, 'não lê agendamentos da A');
select is((select count(*)::int from public.appointment_services s join public.services v on v.id = s.service_id where v.shop_id = pg_temp.a()), 0, 'não lê itens de agendamento da A');
select is((select count(*)::int from public.schedule_blocks where shop_id = pg_temp.a()), 0, 'não lê bloqueios da A');
select is((select count(*)::int from public.services where shop_id = pg_temp.a() and not active), 0, 'não vê serviços inativos da A');
select is((select count(*)::int from public.reminders), 0, 'não lê lembretes da A');
select is((select count(*)::int from public.notification_log), 0, 'não lê log de notificações da A');
select ok((select count(*) from public.appointments where shop_id = pg_temp.b()) >= 1, 'lê agendamentos da própria barbearia');

update public.shops set name = 'Invadida' where id = pg_temp.a();
update public.services set price_cents = 1 where shop_id = pg_temp.a();
update public.business_hours set is_open = false where shop_id = pg_temp.a();
update public.appointments set status = 'cancelled' where shop_id = pg_temp.a();
update public.schedule_blocks set reason = 'Invadido' where shop_id = pg_temp.a();
delete from public.services where shop_id = pg_temp.a();
delete from public.schedule_blocks where shop_id = pg_temp.a();
delete from public.appointments where shop_id = pg_temp.a();

select throws_ok($$insert into public.services (shop_id, name, price_cents, duration_min) values (pg_temp.a(), 'Invasor', 1, 5)$$, '42501', null, 'não cria serviço na A');
select throws_ok($$insert into public.schedule_blocks (shop_id, starts_at, ends_at) values (pg_temp.a(), now() + interval '40 days', now() + interval '41 days')$$, '42501', null, 'não cria bloqueio na A');
select throws_ok($$insert into public.business_hours (shop_id, weekday, is_open) values (pg_temp.a(), 0, false) on conflict (shop_id, weekday) do update set is_open = true$$, '42501', null, 'não altera horários da A por upsert');
select throws_ok(
  $$insert into public.appointments (shop_id, customer_name, customer_phone, starts_at, ends_at, total_cents, manage_token_hash)
    values (pg_temp.a(), 'Invasor', '+5511933330009', now() + interval '20 days', now() + interval '20 days 30 minutes', 1, 'h-invasor')$$,
  '42501', null, 'não cria agendamento na A');
select throws_ok($$insert into public.shop_admins (shop_id, user_id) values (pg_temp.a(), 'a0000000-0000-4000-8000-000000000002')$$, '42501', null, 'não se vincula à A');
select throws_ok($$update public.shops set notifications_enabled = false where id = pg_temp.b()$$, '42501', null, 'dono não altera notificações nem na própria barbearia');
select throws_ok($$update public.shops set slug = 'outro-slug' where id = pg_temp.b()$$, '42501', null, 'dono não altera o slug');
select lives_ok($$update public.shops set about = 'Sobre a B' where id = pg_temp.b()$$, 'dono altera os textos da própria barbearia');

-- 1.4 RPCs do painel com a barbearia de outro dono
select throws_ok($$select public.admin_available_slots(pg_temp.a(), (select day from t_day), 30)$$, '42501', null, 'admin_available_slots da A recusado');
select throws_ok($$select public.admin_create_booking(pg_temp.a(), array[]::uuid[], now(), 'x', 'x')$$, '42501', null, 'admin_create_booking na A recusado');
select lives_ok($$select public.admin_available_slots(pg_temp.b(), (select day from t_day), 30)$$, 'admin_available_slots da própria barbearia funciona');
reset role;

select is((select name from public.shops where id = pg_temp.a()), 'Barbearia Modelo', 'nome da A intacto');
select is((select count(*)::int from public.services where shop_id = pg_temp.a() and price_cents = 1), 0, 'preços da A intactos');
select is((select count(*)::int from public.business_hours where shop_id = pg_temp.a() and is_open), 5, 'horários da A intactos');
select is((select status::text from public.appointments where id = (select (r->>'id')::uuid from t_a)), 'confirmed', 'agendamento da A intacto');
select is((select count(*)::int from public.schedule_blocks where reason = 'Bloqueio A'), 1, 'bloqueio da A intacto');

-- 1.4 RPCs públicas por slug ----------------------------------------------------------------
select is(public.get_booking_by_token('barbearia-teste', (select r->>'token' from t_a)), null, 'token da A não é lido no endereço da B');
select is(public.cancel_booking_by_token('barbearia-teste', (select r->>'token' from t_a))->>'error', 'not_found', 'token da A não cancela no endereço da B');
select is((public.get_booking_by_token('demonstracao', (select r->>'token' from t_a)))->>'customer_name', 'Cliente A', 'token da A é lido no endereço da A');
select is(
  public.create_booking('barbearia-teste', array[pg_temp.svc(pg_temp.a(), 'Corte de cabelo')], pg_temp.at_local('16:00'), 'Mistura', '+5511933330004')->>'error',
  'invalid_services', 'serviço da A não é aceito na B'
);
select is(public.create_booking('nao-existe', array[]::uuid[], now(), 'x', 'x')->>'error', 'shop_not_found', 'create_booking com slug inexistente');
select throws_ok($$select * from public.get_available_slots('nao-existe', current_date, 30)$$, 'P0002', null, 'disponibilidade com slug inexistente');

-- 1.5 Demonstração não gera lembretes -------------------------------------------------------
select is(
  (select count(*)::int from public.reminders where appointment_id = (select (r->>'id')::uuid from t_a)),
  0, 'agendamento na demonstração com e-mail e WhatsApp não gera lembretes'
);

-- 1.6 Cadastro de barbearia -----------------------------------------------------------------
select lives_ok($$select public.provision_shop('{
  "slug": "nova-barbearia", "name": "Nova Barbearia", "street": "Rua Abaré", "number": "2",
  "hours": [{"weekday": 1, "is_open": true, "open_time": "08:00", "close_time": "19:00"}],
  "services": [{"name": "Corte de cabelo", "price_cents": 3000, "duration_min": 30},
               {"name": "Corte, barba e sobrancelha", "price_cents": 4000, "duration_min": 60, "is_combo": true}],
  "owner_user_id": "a0000000-0000-4000-8000-000000000002"
}'::jsonb)$$, 'cadastro completo');
select is(
  (select count(*)::int from public.services s join public.shops sh on sh.id = s.shop_id where sh.slug = 'nova-barbearia')
  + (select count(*)::int from public.business_hours h join public.shops sh on sh.id = h.shop_id where sh.slug = 'nova-barbearia')
  + (select count(*)::int from public.shop_admins a join public.shops sh on sh.id = a.shop_id where sh.slug = 'nova-barbearia'),
  2 + 7 + 1, 'cadastro grava 2 serviços, 7 dias de horário e o dono'
);
select throws_ok($$select public.provision_shop('{"slug": "demonstracao", "name": "Outra"}'::jsonb)$$, '23505', null, 'slug repetido é recusado');
select throws_ok($$select public.provision_shop('{"slug": "invalida", "name": "Inválida",
  "services": [{"name": "Corte", "price_cents": 3000, "duration_min": 22}]}'::jsonb)$$, '23514', null, 'serviço com duração inválida é recusado');
select is((select count(*)::int from public.shops where slug = 'invalida'), 0, 'cadastro com erro não deixa barbearia gravada');

select * from finish();
rollback;
