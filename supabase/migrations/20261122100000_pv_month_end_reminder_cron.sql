-- =============================================================================
-- Cron pv-month-end-reminder (2026-05-22, chantier #6 polish arborescence)
--
-- Schedule pg_cron à 08h/09h UTC (= 10h Paris hiver + été DST).
-- L'edge function vérifie l'heure Paris exacte ET le jour >= 25 du mois,
-- skip sinon. Push 1× / coach / mois (dedup 28 jours via sendPushToUser).
-- =============================================================================

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Drop existant si re-run
do $$
declare v_jobid bigint;
begin
  for v_jobid in
    select jobid from cron.job
    where jobname in ('pv-month-end-reminder-08', 'pv-month-end-reminder-09')
  loop
    perform cron.unschedule(v_jobid);
  end loop;
end $$;

-- 2× cron pour couvrir DST (8h UTC = 10h Paris été, 9h UTC = 10h Paris hiver)
select cron.schedule(
  'pv-month-end-reminder-08',
  '0 8 * * *',
  $$
  select net.http_post(
    url := current_setting('app.settings.supabase_url') || '/functions/v1/pv-month-end-reminder',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
    ),
    body := '{}'::jsonb
  ) as request_id;
  $$
);

select cron.schedule(
  'pv-month-end-reminder-09',
  '0 9 * * *',
  $$
  select net.http_post(
    url := current_setting('app.settings.supabase_url') || '/functions/v1/pv-month-end-reminder',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
    ),
    body := '{}'::jsonb
  ) as request_id;
  $$
);

comment on extension pg_cron is
  'pv-month-end-reminder : push rappel le 25-31 du mois aux admins/référents avec distri externes sans PV saisi (chantier #6 polish 2026-05-22).';
