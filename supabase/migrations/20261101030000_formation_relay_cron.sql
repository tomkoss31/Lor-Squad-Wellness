-- =============================================================================
-- Phase E — Cron formation-relay-to-admin (2026-11-01)
--
-- Schedule horaire qui appelle l Edge function formation-relay-to-admin.
-- La function escalade les modules en pending_review_sponsor depuis >48h
-- vers pending_review_admin et notifie admin + sponsor.
--
-- Idempotent : unschedule + re-schedule.
-- =============================================================================

begin;

select cron.unschedule('formation-relay-to-admin')
where exists (select 1 from cron.job where jobname = 'formation-relay-to-admin');

select cron.schedule(
  'formation-relay-to-admin',
  '0 * * * *',
  $$
  select net.http_post(
    url := current_setting('app.settings.supabase_url', true) || '/functions/v1/formation-relay-to-admin',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key'),
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 60000
  );
  $$
);

commit;
