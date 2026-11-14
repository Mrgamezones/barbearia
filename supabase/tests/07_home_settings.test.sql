-- Campos de textos da home e do barbeiro em business_settings.
begin;
select plan(5);

select has_column('public', 'business_settings', 'hero_title_line1', 'tem título do hero');
select has_column('public', 'business_settings', 'barber_photo_url', 'tem foto do barbeiro');

set local role anon;
select isnt((select hero_title_line1 from public.business_settings), null, 'anon lê os textos da home');
reset role;

select throws_ok($$update public.business_settings set instagram_url = 'http://insta.example' where id = 1$$, '23514', null, 'Instagram sem https é rejeitado');
select lives_ok($$update public.business_settings set barber_photo_url = 'https://exemplo.com/foto.jpg' where id = 1$$, 'foto com https é aceita');

select * from finish();
rollback;
