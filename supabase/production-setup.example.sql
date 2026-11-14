-- Configuração inicial do banco de PRODUÇÃO (uma barbearia por projeto Supabase).
-- Rode UMA VEZ no SQL Editor do projeto de produção, depois de `npx supabase db push`.
-- Troque os textos marcados com TROCAR. Tudo continua editável depois no painel (/admin).
--
-- Diferente de supabase/seed.sql, este arquivo NÃO cria o administrador de teste
-- (admin@barbearia.local) nem agendamentos. O admin real é criado com:
--   node --env-file=.env.production.local scripts/create-admin.mjs <email> <senha>
--
-- Pode rodar de novo sem duplicar: nada é inserido se já existir.

-- Dados da barbearia (linha única, id 1: o site e o painel leem e salvam nela).
insert into public.business_settings (
  id, name, address, whatsapp, about,
  hero_eyebrow, hero_title_line1, hero_title_line2, hero_subtitle,
  barber_name, barber_bio, email
)
values (
  1,
  'TROCAR: Nome da Barbearia',
  'TROCAR: Rua, número - Bairro, Cidade - UF',
  'TROCAR: +55DDDNUMERO',            -- só números com +55, ex.: +5511999999999
  'Cortes clássicos e modernos, barba feita na navalha e atendimento sem pressa.',
  'Tradição • Precisão • Cuidado',
  'Corte na medida,',
  'do seu jeito.',
  'Marque seu horário em poucos toques e chegue só para ser atendido.',
  'TROCAR: Nome do barbeiro',
  'TROCAR: uma frase sobre o barbeiro.',
  'TROCAR: email@dabarbearia.com.br'
)
on conflict (id) do nothing;

-- Horário de funcionamento (0 = domingo ... 6 = sábado). Ter a sáb, 09:00–19:00, almoço 12:00–13:00.
insert into public.business_hours (weekday, is_open, open_time, close_time, break_start, break_end) values
  (0, false, null, null, null, null),
  (1, false, null, null, null, null),
  (2, true, '09:00', '19:00', '12:00', '13:00'),
  (3, true, '09:00', '19:00', '12:00', '13:00'),
  (4, true, '09:00', '19:00', '12:00', '13:00'),
  (5, true, '09:00', '19:00', '12:00', '13:00'),
  (6, true, '09:00', '19:00', '12:00', '13:00')
on conflict (weekday) do nothing;

-- Serviços de partida (preço em centavos, duração em minutos). Só entram se ainda não houver nenhum serviço.
insert into public.services (name, description, price_cents, duration_min, sort_order, is_combo)
select * from (values
  ('Corte de cabelo',  'Corte na tesoura ou máquina, com lavagem e finalização.', 4500, 30, 10, false),
  ('Barba',            'Barba modelada na navalha com toalha quente.',            3500, 30, 20, false),
  ('Sobrancelha',      'Limpeza e alinhamento na navalha.',                       2000, 15, 30, false),
  ('Corte + Barba',    'Combo de corte de cabelo e barba completa.',              7000, 60, 40, true)
) as s(name, description, price_cents, duration_min, sort_order, is_combo)
where not exists (select 1 from public.services);

-- Conferir:  select name, whatsapp from public.business_settings;
--            select count(*) from public.services;
--            select count(*) from public.admins;   -- só o admin criado pelo script
