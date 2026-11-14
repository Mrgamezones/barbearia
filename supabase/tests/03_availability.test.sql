-- Disponibilidade: funcionamento, intervalo, ocupação, bloqueios, antecedência e janela.
begin;
select plan(14);

-- Próxima terça-feira com pelo menos 2 dias de distância (dia aberto 09–19, almoço 12–13).
create temporary table t_day as
select d::date as day
from generate_series((now() at time zone 'America/Sao_Paulo')::date + 2,
                     (now() at time zone 'America/Sao_Paulo')::date + 9, interval '1 day') d
where extract(dow from d) = 2
limit 1;

create or replace function pg_temp.at_local(t time) returns timestamptz language sql as $$
  select ((select day from t_day) + t) at time zone 'America/Sao_Paulo';
$$;

-- Fechamento
select is(
  (select max(slot) from public.get_available_slots((select day from t_day), 60)),
  pg_temp.at_local('18:00'),
  'com 60 min e fechamento às 19:00, o último horário é 18:00'
);
select is(
  (select min(slot) from public.get_available_slots((select day from t_day), 30)),
  pg_temp.at_local('09:00'),
  'primeiro horário é a abertura'
);
select is(
  (select count(*)::int from public.get_available_slots((select day from t_day), 30)
   where extract(minute from slot at time zone 'America/Sao_Paulo')::int % 15 <> 0),
  0,
  'horários em passos de 15 minutos'
);

-- Intervalo de almoço
select ok(
  not exists (select 1 from public.get_available_slots((select day from t_day), 30)
              where slot in (pg_temp.at_local('11:45'), pg_temp.at_local('12:00'), pg_temp.at_local('12:30'))),
  'horários que tocam o almoço (12–13) não são oferecidos'
);
select ok(
  exists (select 1 from public.get_available_slots((select day from t_day), 30) where slot = pg_temp.at_local('11:30'))
  and exists (select 1 from public.get_available_slots((select day from t_day), 30) where slot = pg_temp.at_local('13:00')),
  '11:30 e 13:00 continuam livres'
);

-- Horário ocupado 14:00–14:30
insert into public.appointments (customer_name, customer_phone, starts_at, ends_at, total_cents, manage_token_hash)
values ('Teste', '+5511999990001', pg_temp.at_local('14:00'), pg_temp.at_local('14:30'), 4500, 'hash-ocupado');

select ok(
  not exists (select 1 from public.get_available_slots((select day from t_day), 30)
              where slot in (pg_temp.at_local('13:45'), pg_temp.at_local('14:00'), pg_temp.at_local('14:15'))),
  '13:45, 14:00 e 14:15 não são oferecidos com agendamento 14:00–14:30'
);
select ok(
  exists (select 1 from public.get_available_slots((select day from t_day), 30) where slot = pg_temp.at_local('14:30')),
  '14:30 é oferecido'
);

-- Cancelado não bloqueia
update public.appointments set status = 'cancelled' where manage_token_hash = 'hash-ocupado';
select ok(
  exists (select 1 from public.get_available_slots((select day from t_day), 30) where slot = pg_temp.at_local('14:00')),
  'agendamento cancelado libera o horário'
);

-- Dia bloqueado
insert into public.schedule_blocks (starts_at, ends_at, reason)
values (pg_temp.at_local('00:00'), pg_temp.at_local('23:59'), 'Folga');
select is(
  (select count(*)::int from public.get_available_slots((select day from t_day), 30)),
  0,
  'dia bloqueado não tem horários'
);
select ok(
  not exists (select 1 from public.get_available_dates((select day from t_day), (select day from t_day) + 7, 30)
              where day = (select day from t_day)),
  'dia bloqueado aparece indisponível no calendário'
);
select ok(
  exists (select 1 from public.get_available_dates((select day from t_day), (select day from t_day) + 7, 30)
          where day = (select day from t_day) + 1),
  'dia seguinte (quarta) continua disponível'
);

-- Domingo fechado
select is(
  (select count(*)::int from public.get_available_slots((select day from t_day) - 2, 30)),
  0,
  'domingo (fechado) não tem horários'
);

-- Antecedência mínima e janela de 30 dias
select is(
  (select count(*)::int from public.get_available_slots((now() at time zone 'America/Sao_Paulo')::date, 15)
   where slot < now() + interval '60 minutes'),
  0,
  'nenhum horário com início a menos de 60 minutos'
);
select is(
  (select count(*)::int from generate_series(31, 37) n,
          lateral public.get_available_slots((now() at time zone 'America/Sao_Paulo')::date + n, 30)),
  0,
  'datas além de 30 dias não têm horários'
);

select * from finish();
rollback;
