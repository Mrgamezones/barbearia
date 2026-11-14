-- RLS do painel: admin x usuário autenticado comum x anônimo.
begin;
select plan(16);

insert into auth.users (id, email, aud, role, instance_id)
values
  ('00000000-0000-0000-0000-0000000000a1', 'admin-rls@teste.local', 'authenticated', 'authenticated', '00000000-0000-0000-0000-000000000000'),
  ('00000000-0000-0000-0000-0000000000b2', 'comum-rls@teste.local', 'authenticated', 'authenticated', '00000000-0000-0000-0000-000000000000');
insert into public.admins (user_id) values ('00000000-0000-0000-0000-0000000000a1');

insert into public.appointments (customer_name, customer_phone, starts_at, ends_at, total_cents, manage_token_hash)
values ('Cliente RLS', '+5511911112222', now() + interval '3 days', now() + interval '3 days 30 minutes', 4500, 'hash-rls');
insert into public.schedule_blocks (starts_at, ends_at, reason) values (now() + interval '10 days', now() + interval '11 days', 'Teste RLS');

-- Usuário comum ----------------------------------------------------------------
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000b2","role":"authenticated"}';

select is(public.is_admin(), false, 'comum: is_admin() = false');
select is((select count(*)::int from public.appointments), 0, 'comum: não lê agendamentos');
select is((select count(*)::int from public.appointment_services), 0, 'comum: não lê itens de agendamento');
select is((select count(*)::int from public.schedule_blocks), 0, 'comum: não lê bloqueios');
select is((select count(*)::int from public.services where not active), 0, 'comum: não vê serviços inativos');
update public.business_settings set name = 'Invadido' where id = 1;
select throws_ok($$select public.admin_available_slots(current_date + 3, 30)$$, '42501', null, 'comum: não usa disponibilidade de admin');
select throws_ok($$select public.admin_create_booking(array[]::uuid[], now(), 'x', 'x')$$, '42501', null, 'comum: não cria agendamento manual');
reset role;
select isnt((select name from public.business_settings where id = 1), 'Invadido', 'comum: não altera configurações');

-- Admin --------------------------------------------------------------------
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}';

select is(public.is_admin(), true, 'admin: is_admin() = true');
select ok((select count(*) from public.appointments where customer_name = 'Cliente RLS') = 1, 'admin: lê agendamentos');
select ok((select count(*) from public.schedule_blocks where reason = 'Teste RLS') = 1, 'admin: lê bloqueios');
select lives_ok($$update public.appointments set status = 'no_show' where customer_name = 'Cliente RLS'$$, 'admin: altera status');
select lives_ok($$insert into public.services (name, price_cents, duration_min) values ('Novo admin', 1000, 20)$$, 'admin: cria serviço');
select lives_ok($$update public.business_settings set about = 'Atualizado pelo admin' where id = 1$$, 'admin: altera configurações');
select lives_ok($$insert into public.schedule_blocks (starts_at, ends_at) values (now() + interval '20 days', now() + interval '21 days')$$, 'admin: cria bloqueio');
reset role;

-- Anônimo --------------------------------------------------------------------
set local role anon;
select throws_ok('select * from public.appointments', '42501', null, 'anon: não acessa agendamentos');
reset role;

select * from finish();
rollback;
