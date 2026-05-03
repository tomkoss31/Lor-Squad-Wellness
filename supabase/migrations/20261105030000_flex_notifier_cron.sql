-- =============================================================================
-- FLEX Lor'Squad — pg_cron schedules pour flex-notifier (Phase E, 2026-11-05)
--
-- 3 jobs planifiés :
--   - flex-evening-reminder : 19:00 UTC tous les jours (= 20h hiver / 21h été)
--   - flex-evening-late     : 21:00 UTC tous les jours (= 22h hiver / 23h été)
--   - flex-weekly-recap     : 19:00 UTC dimanche      (= 20h hiver / 21h été)
--
-- Thomas a accepté le shift ±1h DST (cf. décision Phase A). Si jamais on
-- veut être pile à 20h Paris peu importe DST, il faudra deux schedules
-- (un été 18:00 UTC, un hiver 19:00 UTC) ou un wrapper SQL qui calcule
-- dynamiquement l'offset Paris.
-- =============================================================================

begin;

-- Unschedule au cas où (idempotent)
select cron.unschedule('flex-evening-reminder')
where exists (select 1 from cron.job where jobname = 'flex-evening-reminder');
select cron.unschedule('flex-evening-late')
where exists (select 1 from cron.job where jobname = 'flex-evening-late');
select cron.unschedule('flex-weekly-recap')
where exists (select 1 from cron.job where jobname = 'flex-weekly-recap');

-- 1. Evening reminder : 19:00 UTC daily
select cron.schedule(
  'flex-evening-reminder',
  '0 19 * * *',
  $$
  select net.http_post(
    url := current_setting('app.settings.supabase_url', true) || '/functions/v1/flex-notifier?mode=evening',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key'),
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 60000
  );
  $$
);

-- 2. Evening late : 21:00 UTC daily
select cron.schedule(
  'flex-evening-late',
  '0 21 * * *',
  $$
  select net.http_post(
    url := current_setting('app.settings.supabase_url', true) || '/functions/v1/flex-notifier?mode=evening_late',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key'),
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 60000
  );
  $$
);

-- 3. Weekly recap : Sunday 19:00 UTC
select cron.schedule(
  'flex-weekly-recap',
  '0 19 * * 0',
  $$
  select net.http_post(
    url := current_setting('app.settings.supabase_url', true) || '/functions/v1/flex-notifier?mode=weekly_recap',
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
