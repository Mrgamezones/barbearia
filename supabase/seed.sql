-- Dados iniciais (valores de exemplo, editáveis no painel).

insert into public.business_settings (
  id, name, address, whatsapp, about,
  hero_eyebrow, hero_title_line1, hero_title_line2, hero_subtitle,
  barber_name, barber_bio, email
)
values (
  1,
  'Barbearia Modelo',
  'Rua Exemplo, 100 - Centro, São Paulo - SP',
  '+5511999999999',
  'Cortes clássicos e modernos, barba feita na navalha e atendimento sem pressa.',
  'Tradição • Precisão • Cuidado',
  'Corte na medida,',
  'do seu jeito.',
  'Marque seu horário em poucos toques e chegue só para ser atendido.',
  'Rafael Moreira',
  '12 anos de tesoura e navalha, atendimento sem pressa.',
  'contato@barbearia.local'
)
on conflict (id) do nothing;

-- IDs fixos: páginas pré-renderizadas/em cache continuam válidas após `supabase db reset` (ambiente Docker).
insert into public.services (id, name, description, price_cents, duration_min, sort_order, is_combo) values
  ('5e000000-0000-4000-8000-000000000001', 'Corte de cabelo',             'Corte na tesoura ou máquina, com lavagem e finalização.',       4500, 30,  10, false),
  ('5e000000-0000-4000-8000-000000000002', 'Barba',                       'Barba modelada na navalha com toalha quente.',                  3500, 30,  20, false),
  ('5e000000-0000-4000-8000-000000000003', 'Bigode',                      'Aparo e desenho do bigode.',                                    1500, 10,  30, false),
  ('5e000000-0000-4000-8000-000000000004', 'Sobrancelha',                 'Limpeza e alinhamento na navalha.',                             2000, 15,  40, false),
  ('5e000000-0000-4000-8000-000000000005', 'Pezinho/acabamento',          'Acabamento de nuca, costeletas e contorno.',                    1500, 15,  50, false),
  ('5e000000-0000-4000-8000-000000000006', 'Hidratação capilar',          'Hidratação profunda para cabelo e couro cabeludo.',             4000, 30,  60, false),
  ('5e000000-0000-4000-8000-000000000007', 'Pigmentação de barba',        'Preenchimento de falhas com pigmento natural.',                 4000, 30,  70, false),
  ('5e000000-0000-4000-8000-000000000008', 'Corte infantil',              'Corte para crianças de até 12 anos.',                           3500, 30,  80, false),
  ('5e000000-0000-4000-8000-000000000009', 'Corte + Barba',               'Combo de corte de cabelo e barba completa.',                    7000, 60,  90, true),
  ('5e000000-0000-4000-8000-000000000010', 'Corte + Barba + Sobrancelha', 'Combo completo: corte, barba e sobrancelha.',                   8500, 75, 100, true);

-- Ter a sáb, 09:00–19:00, almoço 12:00–13:00. Dom e seg fechados.
insert into public.business_hours (weekday, is_open, open_time, close_time, break_start, break_end) values
  (0, false, null, null, null, null),
  (1, false, null, null, null, null),
  (2, true, '09:00', '19:00', '12:00', '13:00'),
  (3, true, '09:00', '19:00', '12:00', '13:00'),
  (4, true, '09:00', '19:00', '12:00', '13:00'),
  (5, true, '09:00', '19:00', '12:00', '13:00'),
  (6, true, '09:00', '19:00', '12:00', '13:00');

-- Administrador local de teste (somente ambiente local: `supabase db push` não executa o seed).
-- E-mail: admin@barbearia.local · Senha: admin-local-123
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change, email_change_token_current, reauthentication_token, phone_change, phone_change_token
) values (
  '00000000-0000-0000-0000-000000000000', 'a0000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated',
  'admin@barbearia.local', extensions.crypt('admin-local-123', extensions.gen_salt('bf')), now(),
  '{"provider":"email","providers":["email"]}', '{}', now(), now(),
  '', '', '', '', '', '', '', ''
) on conflict (id) do nothing;

insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
values (
  'a0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001',
  '{"sub":"a0000000-0000-4000-8000-000000000001","email":"admin@barbearia.local","email_verified":true}', 'email', now(), now(), now()
) on conflict do nothing;

insert into public.admins (user_id) values ('a0000000-0000-4000-8000-000000000001') on conflict do nothing;
