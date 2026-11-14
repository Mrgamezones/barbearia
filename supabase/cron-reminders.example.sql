-- Disparo dos lembretes a cada 15 minutos agendado no próprio Supabase.
-- Recomendado no Netlify (docs/deploy-netlify.md) e alternativa à Vercel Cron (no plano Hobby
-- a Vercel só permite execução diária). Funciona com qualquer hospedagem.
-- Execute no SQL Editor do projeto de PRODUÇÃO, trocando a URL (Netlify: https://SEU-SITE.netlify.app,
-- Vercel: https://SEU-DOMINIO.vercel.app, ou o domínio próprio) e o segredo (o mesmo CRON_SECRET do site).
-- Não é uma migração porque contém o segredo e a URL do ambiente.

create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.schedule(
  'lembretes-barbearia',
  '*/15 * * * *',
  $$
  select net.http_post(
    url := 'https://SEU-SITE.netlify.app/api/cron/reminders',
    headers := jsonb_build_object('Authorization', 'Bearer SEU_CRON_SECRET', 'Content-Type', 'application/json'),
    body := '{}'::jsonb,
    timeout_milliseconds := 30000
  );
  $$
);

-- Conferir execuções:   select * from cron.job_run_details order by start_time desc limit 10;
-- Remover o agendamento: select cron.unschedule('lembretes-barbearia');
