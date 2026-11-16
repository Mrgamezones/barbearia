-- Dados iniciais locais: barbearia de demonstração + barbearia de teste (valores de exemplo, editáveis no painel).

-- Demonstração: mostrada aos barbeiros interessados em /barbearia/demonstracao.
-- Notificações desligadas: agendamentos feitos por quem testa não geram WhatsApp, e-mail nem lembretes.
insert into public.shops (
  id, slug, is_demo, notifications_enabled, name,
  street, number, district, city, state, whatsapp, about,
  hero_eyebrow, hero_title_line1, hero_title_line2, hero_subtitle,
  barber_name, barber_bio, email
)
values (
  '5a000000-0000-4000-8000-000000000001', 'demonstracao', true, false, 'Barbearia Modelo',
  'Rua Exemplo', '100', 'Centro', 'São Paulo', 'SP', '+5511999999999',
  'Cortes clássicos e modernos, barba feita na navalha e atendimento sem pressa.',
  'Tradição • Precisão • Cuidado',
  'Corte na medida,',
  'do seu jeito.',
  'Marque seu horário em poucos toques e chegue só para ser atendido.',
  'Rafael Moreira',
  '12 anos de tesoura e navalha, atendimento sem pressa.',
  'contato@barbearia.local'
),
-- Barbearia de teste: mesma vitrine da demonstração (serviços, textos, barbeiro), com outro nome e endereço
-- e notificações ligadas. Os testes E2E rodam nela; os testes de isolamento comparam as duas.
(
  '5a000000-0000-4000-8000-000000000002', 'barbearia-teste', false, true, 'Barbearia Teste',
  'Avenida Teste', '200', 'Jardim', 'Campinas', 'SP', '+5519988887777',
  'Cortes clássicos e modernos, barba feita na navalha e atendimento sem pressa.',
  'Tradição • Precisão • Cuidado',
  'Corte na medida,',
  'do seu jeito.',
  'Marque seu horário em poucos toques e chegue só para ser atendido.',
  'Rafael Moreira',
  '12 anos de tesoura e navalha, atendimento sem pressa.',
  'teste@barbearia.local'
)
on conflict (id) do nothing;

-- IDs fixos: páginas pré-renderizadas/em cache continuam válidas após `supabase db reset` (ambiente Docker).
insert into public.services (id, shop_id, name, description, price_cents, duration_min, sort_order, is_combo) values
  ('5e000000-0000-4000-8000-000000000001', '5a000000-0000-4000-8000-000000000001', 'Corte de cabelo',             'Corte na tesoura ou máquina, com lavagem e finalização.',       4500, 30,  10, false),
  ('5e000000-0000-4000-8000-000000000002', '5a000000-0000-4000-8000-000000000001', 'Barba',                       'Barba modelada na navalha com toalha quente.',                  3500, 30,  20, false),
  ('5e000000-0000-4000-8000-000000000003', '5a000000-0000-4000-8000-000000000001', 'Bigode',                      'Aparo e desenho do bigode.',                                    1500, 10,  30, false),
  ('5e000000-0000-4000-8000-000000000004', '5a000000-0000-4000-8000-000000000001', 'Sobrancelha',                 'Limpeza e alinhamento na navalha.',                             2000, 15,  40, false),
  ('5e000000-0000-4000-8000-000000000005', '5a000000-0000-4000-8000-000000000001', 'Pezinho/acabamento',          'Acabamento de nuca, costeletas e contorno.',                    1500, 15,  50, false),
  ('5e000000-0000-4000-8000-000000000006', '5a000000-0000-4000-8000-000000000001', 'Hidratação capilar',          'Hidratação profunda para cabelo e couro cabeludo.',             4000, 30,  60, false),
  ('5e000000-0000-4000-8000-000000000007', '5a000000-0000-4000-8000-000000000001', 'Pigmentação de barba',        'Preenchimento de falhas com pigmento natural.',                 4000, 30,  70, false),
  ('5e000000-0000-4000-8000-000000000008', '5a000000-0000-4000-8000-000000000001', 'Corte infantil',              'Corte para crianças de até 12 anos.',                           3500, 30,  80, false),
  ('5e000000-0000-4000-8000-000000000009', '5a000000-0000-4000-8000-000000000001', 'Corte + Barba',               'Combo de corte de cabelo e barba completa.',                    7000, 60,  90, true),
  ('5e000000-0000-4000-8000-000000000010', '5a000000-0000-4000-8000-000000000001', 'Corte + Barba + Sobrancelha', 'Combo completo: corte, barba e sobrancelha.',                   8500, 75, 100, true);

-- Mesmos serviços na barbearia de teste (IDs 5e…1xx, também fixos).
insert into public.services (id, shop_id, name, description, price_cents, duration_min, sort_order, is_combo)
select ('5e000000-0000-4000-8000-000000000' || (100 + right(id::text, 2)::int))::uuid,
       '5a000000-0000-4000-8000-000000000002', name, description, price_cents, duration_min, sort_order, is_combo
from public.services
where shop_id = '5a000000-0000-4000-8000-000000000001';

-- Ter a sáb, 9h–19h, almoço 12h–13h. Dom e seg fechados. Mesmo horário nas duas barbearias.
insert into public.business_hours (shop_id, weekday, is_open, open_time, close_time, break_start, break_end)
select s.id, h.weekday, h.is_open, h.open_time, h.close_time, h.break_start, h.break_end
from (values ('5a000000-0000-4000-8000-000000000001'::uuid), ('5a000000-0000-4000-8000-000000000002'::uuid)) as s(id)
cross join (values
  (0, false, null::time, null::time, null::time, null::time),
  (1, false, null, null, null, null),
  (2, true, '09:00', '19:00', '12:00', '13:00'),
  (3, true, '09:00', '19:00', '12:00', '13:00'),
  (4, true, '09:00', '19:00', '12:00', '13:00'),
  (5, true, '09:00', '19:00', '12:00', '13:00'),
  (6, true, '09:00', '19:00', '12:00', '13:00')
) as h(weekday, is_open, open_time, close_time, break_start, break_end);

-- Administrador local de teste (somente ambiente local: `supabase db push` não executa o seed).
-- admin@barbearia.local / admin-local-123 → dono da demonstração.
-- dono-teste@barbearia.local / admin-local-123 → dono da barbearia de teste.
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change, email_change_token_current, reauthentication_token, phone_change, phone_change_token
) values (
  '00000000-0000-0000-0000-000000000000', 'a0000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated',
  'admin@barbearia.local', extensions.crypt('admin-local-123', extensions.gen_salt('bf')), now(),
  '{"provider":"email","providers":["email"]}', '{}', now(), now(),
  '', '', '', '', '', '', '', ''
), (
  '00000000-0000-0000-0000-000000000000', 'a0000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated',
  'dono-teste@barbearia.local', extensions.crypt('admin-local-123', extensions.gen_salt('bf')), now(),
  '{"provider":"email","providers":["email"]}', '{}', now(), now(),
  '', '', '', '', '', '', '', ''
) on conflict (id) do nothing;

insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
values (
  'a0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001',
  '{"sub":"a0000000-0000-4000-8000-000000000001","email":"admin@barbearia.local","email_verified":true}', 'email', now(), now(), now()
), (
  'a0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000002',
  '{"sub":"a0000000-0000-4000-8000-000000000002","email":"dono-teste@barbearia.local","email_verified":true}', 'email', now(), now(), now()
) on conflict do nothing;

insert into public.shop_admins (shop_id, user_id) values
  ('5a000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001'),
  ('5a000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000002')
on conflict do nothing;

