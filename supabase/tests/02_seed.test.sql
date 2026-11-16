begin;
select plan(5);

-- Barbearia padrão dos inserts deste arquivo (demonstracao); desfeito no rollback.
alter table public.services alter column shop_id set default '5a000000-0000-4000-8000-000000000001';
alter table public.schedule_blocks alter column shop_id set default '5a000000-0000-4000-8000-000000000001';
alter table public.appointments alter column shop_id set default '5a000000-0000-4000-8000-000000000001';
select is((select count(*)::int from public.services where active and shop_id = '5a000000-0000-4000-8000-000000000001'), 10, 'demonstração tem 10 serviços ativos');
select is((select count(*)::int from public.services where price_cents is null or duration_min is null), 0, 'todos com preço e duração');
select is((select count(*)::int from public.business_hours where is_open and shop_id = '5a000000-0000-4000-8000-000000000001'), 5, 'abre 5 dias por semana');
select is((select count(*)::int from public.shops), 2, 'seed tem a demonstração e a barbearia de teste');
select is((select notifications_enabled from public.shops where slug = 'demonstracao'), false, 'demonstração não envia notificações');
select * from finish();
rollback;
