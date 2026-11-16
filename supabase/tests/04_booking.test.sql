-- Criação, conflito, limite por cliente, consulta e cancelamento por token.
begin;
select plan(20);

-- Barbearia padrão dos inserts deste arquivo (demonstracao); desfeito no rollback.
alter table public.services alter column shop_id set default '5a000000-0000-4000-8000-000000000001';
alter table public.schedule_blocks alter column shop_id set default '5a000000-0000-4000-8000-000000000001';
alter table public.appointments alter column shop_id set default '5a000000-0000-4000-8000-000000000001';

create temporary table t_day as
select d::date as day
from generate_series((now() at time zone 'America/Sao_Paulo')::date + 2,
                     (now() at time zone 'America/Sao_Paulo')::date + 9, interval '1 day') d
where extract(dow from d) = 3   -- quarta-feira
limit 1;

create or replace function pg_temp.at_local(t time, plus_days int default 0) returns timestamptz language sql as $$
  select ((select day from t_day) + plus_days + t) at time zone 'America/Sao_Paulo';
$$;
create or replace function pg_temp.svc(n text) returns uuid language sql as $$
  select id from public.services where name = n and shop_id = '5a000000-0000-4000-8000-000000000001';
$$;

-- Criação com sucesso
create temporary table t_ok as
select public.create_booking('demonstracao', array[pg_temp.svc('Corte de cabelo'), pg_temp.svc('Bigode')],
                             pg_temp.at_local('10:00'), 'Ana Cliente', '+5511988887777', 'ana@ex.com') as r;

select is((select r->>'ok' from t_ok), 'true', 'agendamento válido é criado');
select ok(length((select r->>'token' from t_ok)) >= 40, 'retorna token longo');
select is(
  (select ends_at - starts_at from public.appointments where id = (select (r->>'id')::uuid from t_ok)),
  interval '40 minutes',
  'duração é a soma dos serviços (30 + 10)'
);
select is(
  (select total_cents from public.appointments where id = (select (r->>'id')::uuid from t_ok)),
  6000,
  'total é a soma dos preços (45 + 15)'
);
select is(
  (select status::text from public.appointments where id = (select (r->>'id')::uuid from t_ok)),
  'confirmed',
  'status inicial é confirmado'
);
select is(
  (select count(*)::int from public.appointment_services where appointment_id = (select (r->>'id')::uuid from t_ok)),
  2,
  'grava snapshot dos dois serviços'
);
select isnt(
  (select manage_token_hash from public.appointments where id = (select (r->>'id')::uuid from t_ok)),
  (select r->>'token' from t_ok),
  'o banco guarda apenas o hash do token'
);

-- Conflito
select is(
  public.create_booking('demonstracao', array[pg_temp.svc('Barba')], pg_temp.at_local('10:15'), 'Bruno', '+5511977776666')->>'error',
  'slot_taken',
  'horário sobreposto retorna slot_taken'
);
select throws_ok(
  $$insert into public.appointments (customer_name, customer_phone, starts_at, ends_at, total_cents, manage_token_hash)
    values ('Xavier', '+5511966665555', pg_temp.at_local('10:20'), pg_temp.at_local('10:50'), 1, 'h-dup')$$,
  '23P01', null,
  'constraint de exclusão impede sobreposição direta'
);

-- Fora do funcionamento / serviço inválido / dados inválidos
select is(
  public.create_booking('demonstracao', array[pg_temp.svc('Barba')], pg_temp.at_local('12:00'), 'Bruno', '+5511977776666')->>'error',
  'slot_unavailable', 'horário do almoço é recusado'
);
select is(
  public.create_booking('demonstracao', array[]::uuid[], pg_temp.at_local('15:00'), 'Bruno', '+5511977776666')->>'error',
  'invalid_services', 'sem serviços é recusado'
);
update public.services set active = false where name = 'Pezinho/acabamento';
select is(
  public.create_booking('demonstracao', array[pg_temp.svc('Pezinho/acabamento')], pg_temp.at_local('15:00'), 'Bruno', '+5511977776666')->>'error',
  'invalid_services', 'serviço inativo é recusado'
);
select is(
  public.create_booking('demonstracao', array[pg_temp.svc('Barba')], pg_temp.at_local('15:00'), 'Bruno', '1234')->>'error',
  'invalid_data', 'telefone fora do formato é recusado pelo banco'
);

-- Limite de 2 futuros por telefone
select is(public.create_booking('demonstracao', array[pg_temp.svc('Barba')], pg_temp.at_local('15:00'), 'Carla', '+5511955554444')->>'ok', 'true', '1º agendamento');
select is(public.create_booking('demonstracao', array[pg_temp.svc('Barba')], pg_temp.at_local('16:00'), 'Carla', '+5511955554444')->>'ok', 'true', '2º agendamento');
select is(
  public.create_booking('demonstracao', array[pg_temp.svc('Barba')], pg_temp.at_local('17:00'), 'Carla', '+5511955554444')->>'error',
  'limit_reached', '3º agendamento futuro do mesmo número é recusado'
);

-- Consulta por token
select is(
  (public.get_booking_by_token('demonstracao', (select r->>'token' from t_ok)))->>'customer_name',
  'Ana Cliente', 'consulta pelo token retorna os detalhes'
);
select is(public.get_booking_by_token('demonstracao', 'token-inexistente'), null, 'token inexistente não retorna nada');

-- Cancelamento: dentro do prazo libera o horário
select is(public.cancel_booking_by_token('demonstracao', (select r->>'token' from t_ok))->>'ok', 'true', 'cancela com mais de 2 h de antecedência');
select ok(
  exists (select 1 from public.get_available_slots('demonstracao', (select day from t_day), 30) where slot = pg_temp.at_local('10:00')),
  'horário cancelado volta a ficar livre'
);

select * from finish();
rollback;
