begin;
select plan(3);
select is((select count(*)::int from public.services where active), 10, 'seed tem 10 serviços ativos');
select is((select count(*)::int from public.services where price_cents is null or duration_min is null), 0, 'todos com preço e duração');
select is((select count(*)::int from public.business_hours where is_open), 5, 'abre 5 dias por semana');
select * from finish();
rollback;
