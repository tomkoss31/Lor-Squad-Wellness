-- =============================================================================
-- Schedule cron client-anniversary-check (chantier 2026-05-08)
-- =============================================================================
--
-- Tourne tous les jours a 07:00 UTC (= 08:00 hiver / 09:00 ete a Paris).
-- Avant le morning-suivis-digest (qui est a 07:00 aussi mais probablement
-- decalage d execution naturel — ces 2 crons ne se penalisent pas).
--
-- Le cron envoie un POST sur l URL de la edge function avec le service_role
-- key dans le header (auth standard pour pg_net.http_post + edge functions).
-- =============================================================================

-- Enable pg_cron + pg_net si pas deja fait (idempotent)
create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Variables d environnement attendues dans la fonction Postgres :
-- - app.settings.supabase_url   (defini globalement dans le projet)
-- - app.settings.service_role_key (idem)
--
-- Ces settings sont normalement configures via Supabase Dashboard > Database
-- > Settings > Custom Postgres Config. S ils sont absents, le cron echoue
-- silencieusement (logs cron.job_run_details).

-- Drop le job existant si re-run (idempotent)
do $$
declare
  v_jobid bigint;
begin
  select jobid into v_jobid from cron.job where jobname = 'client-anniversary-check-daily';
  if v_jobid is not null then
    perform cron.unschedule(v_jobid);
  end if;
end $$;

-- Schedule : 07:00 UTC tous les jours
select cron.schedule(
  'client-anniversary-check-daily',
  '0 7 * * *',
  $$
  select net.http_post(
    url := current_setting('app.settings.supabase_url') || '/functions/v1/client-anniversary-check',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
    ),
    body := '{}'::jsonb
  ) as request_id;
  $$
);

comment on extension pg_cron is 'Schedule cron jobs (Supabase native).';
