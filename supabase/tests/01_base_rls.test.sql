-- Testes de RLS e constraints da base. Rodar com: npx supabase test db
begin;
select plan(11);

-- Serviço inativo para o teste.
insert into public.services (name, price_cents, duration_min, active) values ('Inativo teste', 1000, 30, false);

-- anon
set local role anon;
select is((select count(*)::int from public.services where name = 'Inativo teste'), 0, 'anon não vê serviço inativo');
select ok((select count(*) from public.services) >= 10, 'anon vê os serviços ativos do seed');
select is((select count(*)::int from public.business_settings), 1, 'anon lê configurações públicas');
select throws_ok('select * from public.admins', '42501', null, 'anon não acessa admins');
select throws_ok('select * from public.schedule_blocks', '42501', null, 'anon não acessa bloqueios');
select throws_ok($$insert into public.services (name, price_cents, duration_min) values ('x', 1, 5)$$, '42501', null, 'anon não cria serviços');
reset role;

-- Constraints de validação do serviço
select throws_ok($$insert into public.services (name, price_cents, duration_min) values ('  ', 1000, 30)$$, '23514', null, 'nome vazio é rejeitado');
select throws_ok($$insert into public.services (name, price_cents, duration_min) values ('A', -1, 30)$$, '23514', null, 'preço negativo é rejeitado');
select throws_ok($$insert into public.services (name, price_cents, duration_min) values ('A', 1000, 0)$$, '23514', null, 'duração 0 é rejeitada');
select throws_ok($$insert into public.services (name, price_cents, duration_min) values ('A', 1000, 22)$$, '23514', null, 'duração 22 é rejeitada');
select lives_ok($$insert into public.services (name, price_cents, duration_min) values ('A', 1000, 25)$$, 'duração múltipla de 5 é aceita');

select * from finish();
rollback;
