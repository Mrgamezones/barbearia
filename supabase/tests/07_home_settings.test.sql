-- Campos de textos da home e do barbeiro em shops.
begin;
select plan(5);

-- Barbearia padrão dos inserts deste arquivo (demonstracao); desfeito no rollback.
alter table public.services alter column shop_id set default '5a000000-0000-4000-8000-000000000001';
alter table public.schedule_blocks alter column shop_id set default '5a000000-0000-4000-8000-000000000001';
alter table public.appointments alter column shop_id set default '5a000000-0000-4000-8000-000000000001';

select has_column('public', 'shops', 'hero_title_line1', 'tem título do hero');
select has_column('public', 'shops', 'barber_photo_url', 'tem foto do barbeiro');

set local role anon;
select isnt((select hero_title_line1 from public.shops where slug = 'demonstracao'), null, 'anon lê os textos da home');
reset role;

select throws_ok($$update public.shops set instagram_url = 'http://insta.example' where slug = 'demonstracao'$$, '23514', null, 'Instagram sem https é rejeitado');
select lives_ok($$update public.shops set barber_photo_url = 'https://exemplo.com/foto.jpg' where slug = 'demonstracao'$$, 'foto com https é aceita');

select * from finish();
rollback;
