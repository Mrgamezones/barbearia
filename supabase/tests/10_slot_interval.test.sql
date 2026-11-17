-- Intervalo da agenda por barbearia (shops.slot_interval_minutes).
begin;
select plan(5);

-- Próxima terça com pelo menos 2 dias de distância (barbearia-teste: aberta 09–19, almoço 12–13).
create temporary table t_day as
select d::date as day
from generate_series((now() at time zone 'America/Sao_Paulo')::date + 2,
                     (now() at time zone 'America/Sao_Paulo')::date + 9, interval '1 day') d
where extract(dow from d) = 2
limit 1;

create or replace function pg_temp.local_times(p_minutes integer) returns text[] language sql as $$
  select array_agg(to_char(s.slot at time zone 'America/Sao_Paulo', 'HH24:MI') order by s.slot)
  from public.get_available_slots('barbearia-teste', (select day from t_day), p_minutes) s;
$$;

select is((select slot_interval_minutes from public.shops where slug = 'barbearia-teste'), 15::smallint,
  'padrão de 15 minutos');
select is((pg_temp.local_times(30))[1:3], array['09:00', '09:15', '09:30'], 'com 15 min: 9h, 9h15, 9h30');

update public.shops set slot_interval_minutes = 40 where slug = 'barbearia-teste';
select is((pg_temp.local_times(40))[1:4], array['09:00', '09:40', '10:20', '11:00'], 'com 40 min: 9h, 9h40, 10h20, 11h');
select ok(not ('12:20' = any (pg_temp.local_times(40))), 'o almoço continua fora da agenda');

select throws_ok($$update public.shops set slot_interval_minutes = 7 where slug = 'barbearia-teste'$$,
  '23514', null, 'intervalo precisa ser múltiplo de 5');

select * from finish();
rollback;
