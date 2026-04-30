-- =============================================================================
-- Cron coach-tips-dispatcher (2026-04-30)
--
-- Schedule 06:00 UTC tous les jours (= 08:00 Paris ete / 07:00 Paris hiver).
-- On accepte ce shift 1h - le creneau matinal reste correct dans les 2 cas.
--
-- L Edge function elle-meme respecte users.notif_coach_tips et dedup
-- via push_notifications_sent (1 max par 22h).
-- =============================================================================

begin;

-- Unschedule au cas ou (idempotent)
select cron.unschedule('coach-tips-dispatcher')
where exists (select 1 from cron.job where jobname = 'coach-tips-dispatcher');

select cron.schedule(
  'coach-tips-dispatcher',
  '0 6 * * *',
  $$
  select net.http_post(
    url := current_setting('app.settings.supabase_url', true) || '/functions/v1/coach-tips-dispatcher',
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
