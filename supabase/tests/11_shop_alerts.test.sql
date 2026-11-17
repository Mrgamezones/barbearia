-- Avisos ao dono: alertas e inscrições de push visíveis só ao próprio dono.
-- A = demonstração (dono a…01), B = barbearia-teste (dono a…02), ambos do seed.
begin;
select plan(14);

create or replace function pg_temp.a() returns uuid language sql as $$ select '5a000000-0000-4000-8000-000000000001'::uuid $$;
create or replace function pg_temp.b() returns uuid language sql as $$ select '5a000000-0000-4000-8000-000000000002'::uuid $$;

-- Dados gravados pelo servidor (service role = dono das tabelas aqui).
insert into public.shop_alerts (shop_id, kind) values (pg_temp.a(), 'booked'), (pg_temp.b(), 'booked'), (pg_temp.b(), 'cancelled_by_client');
insert into public.admin_push_subscriptions (shop_id, user_id, endpoint, p256dh, auth)
values (pg_temp.a(), 'a0000000-0000-4000-8000-000000000001', 'https://push.example/dono-a', 'k', 'a');

-- Dono da B ---------------------------------------------------------------------------------
set local role authenticated;
set local request.jwt.claims = '{"sub":"a0000000-0000-4000-8000-000000000002","role":"authenticated"}';

select is((select count(*)::int from public.shop_alerts), 2, 'dono B vê só os 2 alertas da B');
select is((select count(*)::int from public.shop_alerts where shop_id = pg_temp.a()), 0, 'dono B não vê alertas da A');
select throws_ok($$insert into public.shop_alerts (shop_id, kind) values (pg_temp.b(), 'booked')$$, '42501', null, 'dono não grava alertas');
select lives_ok(
  $$insert into public.admin_push_subscriptions (shop_id, user_id, endpoint, p256dh, auth)
    values (pg_temp.b(), 'a0000000-0000-4000-8000-000000000002', 'https://push.example/dono-b', 'k', 'a')$$,
  'dono B inscreve aparelho na B'
);
select throws_ok(
  $$insert into public.admin_push_subscriptions (shop_id, user_id, endpoint, p256dh, auth)
    values (pg_temp.a(), 'a0000000-0000-4000-8000-000000000002', 'https://push.example/invasor', 'k', 'a')$$,
  '42501', null, 'dono B não se inscreve na A'
);
select throws_ok(
  $$insert into public.admin_push_subscriptions (shop_id, user_id, endpoint, p256dh, auth)
    values (pg_temp.b(), 'a0000000-0000-4000-8000-000000000001', 'https://push.example/outro-usuario', 'k', 'a')$$,
  '42501', null, 'dono B não inscreve em nome de outro usuário'
);
select throws_ok(
  $$insert into public.admin_push_subscriptions (shop_id, user_id, endpoint, p256dh, auth)
    values (pg_temp.b(), 'a0000000-0000-4000-8000-000000000002', 'http://inseguro', 'k', 'a')$$,
  '23514', null, 'endpoint sem https é recusado'
);
select is((select count(*)::int from public.admin_push_subscriptions), 1, 'dono B vê só a própria inscrição');
delete from public.admin_push_subscriptions where endpoint = 'https://push.example/dono-a';
select is(
  (select count(*)::int from public.admin_push_subscriptions where endpoint = 'https://push.example/dono-a'), 0,
  'tentativa de apagar a inscrição da A não a vê'
);
delete from public.admin_push_subscriptions where endpoint = 'https://push.example/dono-b';
select is((select count(*)::int from public.admin_push_subscriptions), 0, 'dono B desativa o próprio aparelho');

-- Anônimo -----------------------------------------------------------------------------------
reset role;
set local role anon;
select throws_ok($$select count(*) from public.shop_alerts$$, '42501', null, 'anônimo não lê alertas');
select throws_ok($$select count(*) from public.admin_push_subscriptions$$, '42501', null, 'anônimo não lê inscrições');

-- Conferência como service role --------------------------------------------------------------
reset role;
select is(
  (select count(*)::int from public.admin_push_subscriptions where endpoint = 'https://push.example/dono-a'), 1,
  'inscrição da A continua gravada'
);
select is(
  (select count(*)::int from public.admin_push_subscriptions where endpoint = 'https://push.example/dono-b'), 0,
  'inscrição da B foi apagada'
);

select * from finish();
rollback;
