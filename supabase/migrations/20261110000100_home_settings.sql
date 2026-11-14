-- Textos da página inicial e dados do barbeiro, editáveis no painel (alteração aditiva).
alter table public.business_settings
  add column hero_eyebrow text not null default '',
  add column hero_title_line1 text not null default '',
  add column hero_title_line2 text not null default '',
  add column hero_subtitle text not null default '',
  add column barber_name text not null default '',
  add column barber_bio text not null default '',
  add column barber_photo_url text not null default '',
  add column instagram_url text not null default '',
  add column email text not null default '';

alter table public.business_settings
  add constraint business_settings_urls check (
    (barber_photo_url = '' or barber_photo_url ~ '^https://')
    and (instagram_url = '' or instagram_url ~ '^https://')
  );
