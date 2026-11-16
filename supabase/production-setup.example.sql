-- Configuração inicial do banco de PRODUÇÃO (um projeto Supabase para todas as barbearias).
-- Rode UMA VEZ no SQL Editor do projeto de produção, depois de `npx supabase db push`.
--
-- Cria só a barbearia de DEMONSTRAÇÃO, aberta em /barbearia/demonstracao (e na raiz do domínio),
-- usada para mostrar o sistema a barbeiros interessados. Ela não envia WhatsApp, e-mail nem lembretes.
-- As barbearias de clientes NÃO entram aqui: cadastre cada uma com
--   node --env-file=.env.production.local scripts/create-shop.mjs supabase/shops/<slug>.json
--
-- Diferente de supabase/seed.sql, este arquivo NÃO cria usuários de teste nem agendamentos.
-- Pode rodar de novo sem duplicar: nada é inserido se a demonstração já existir.

select public.provision_shop($json$
{
  "slug": "demonstracao",
  "name": "Barbearia Modelo",
  "is_demo": true,
  "notifications_enabled": false,
  "street": "Rua Exemplo",
  "number": "100",
  "district": "Centro",
  "city": "São Paulo",
  "state": "SP",
  "whatsapp": "+5511999999999",
  "about": "Cortes clássicos e modernos, barba feita na navalha e atendimento sem pressa.",
  "hero_eyebrow": "Tradição • Precisão • Cuidado",
  "hero_title_line1": "Corte na medida,",
  "hero_title_line2": "do seu jeito.",
  "hero_subtitle": "Marque seu horário em poucos toques e chegue só para ser atendido.",
  "barber_name": "Rafael Moreira",
  "barber_bio": "12 anos de tesoura e navalha, atendimento sem pressa.",
  "hours": [
    {"weekday": 2, "is_open": true, "open_time": "09:00", "close_time": "19:00", "break_start": "12:00", "break_end": "13:00"},
    {"weekday": 3, "is_open": true, "open_time": "09:00", "close_time": "19:00", "break_start": "12:00", "break_end": "13:00"},
    {"weekday": 4, "is_open": true, "open_time": "09:00", "close_time": "19:00", "break_start": "12:00", "break_end": "13:00"},
    {"weekday": 5, "is_open": true, "open_time": "09:00", "close_time": "19:00", "break_start": "12:00", "break_end": "13:00"},
    {"weekday": 6, "is_open": true, "open_time": "09:00", "close_time": "19:00", "break_start": "12:00", "break_end": "13:00"}
  ],
  "services": [
    {"name": "Corte de cabelo", "description": "Corte na tesoura ou máquina, com lavagem e finalização.", "price_cents": 4500, "duration_min": 30},
    {"name": "Barba", "description": "Barba modelada na navalha com toalha quente.", "price_cents": 3500, "duration_min": 30},
    {"name": "Sobrancelha", "description": "Limpeza e alinhamento na navalha.", "price_cents": 2000, "duration_min": 15},
    {"name": "Corte + Barba", "description": "Combo de corte de cabelo e barba completa.", "price_cents": 7000, "duration_min": 60, "is_combo": true},
    {"name": "Corte + Barba + Sobrancelha", "description": "Combo completo: corte, barba e sobrancelha.", "price_cents": 8500, "duration_min": 75, "is_combo": true}
  ]
}
$json$::jsonb)
where not exists (select 1 from public.shops where slug = 'demonstracao');

-- Conferir:  select slug, name, is_demo, notifications_enabled from public.shops;
--            select count(*) from public.services s join public.shops sh on sh.id = s.shop_id where sh.slug = 'demonstracao';
--            select count(*) from public.shop_admins;   -- só os donos cadastrados pelos scripts
