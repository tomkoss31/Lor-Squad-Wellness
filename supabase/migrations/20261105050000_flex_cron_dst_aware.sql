-- =============================================================================
-- FLEX V3.a (2026-11-05) — Cron DST-aware
--
-- Avant : 1 schedule par mode → shift 1h selon DST (ex. evening tirait à
-- 20h hiver mais 21h été).
--
-- Maintenant : 2 schedules par mode (1h d'écart pour couvrir hiver+été).
-- L'edge function flex-notifier checke l'heure Paris et ne dispatche que
-- si elle correspond à la cible. Un des 2 cron tirera dans le créneau
-- valide, l'autre return early "skipped: paris_hour_is_X_expected_Y".
--
-- Cible Paris :
--   - evening      : 20h Paris (= 18h UTC été, 19h UTC hiver)
--   - evening_late : 22h Paris (= 20h UTC été, 21h UTC hiver)
--   - weekly_recap : dim 20h Paris (= dim 18h UTC été, dim 19h UTC hiver)
-- =============================================================================

begin;

-- Drop des anciens schedules (1 par mode)
select cron.unschedule('flex-evening-reminder')
where exists (select 1 from cron.job where jobname = 'flex-evening-reminder');
select cron.unschedule('flex-evening-late')
where exists (select 1 from cron.job where jobname = 'flex-evening-late');
select cron.unschedule('flex-weekly-recap')
where exists (select 1 from cron.job where jobname = 'flex-weekly-recap');

-- Drop d'éventuels nouveaux schedules (idempotent)
select cron.unschedule('flex-evening-reminder-summer')
where exists (select 1 from cron.job where jobname = 'flex-evening-reminder-summer');
select cron.unschedule('flex-evening-reminder-winter')
where exists (select 1 from cron.job where jobname = 'flex-evening-reminder-winter');
select cron.unschedule('flex-evening-late-summer')
where exists (select 1 from cron.job where jobname = 'flex-evening-late-summer');
select cron.unschedule('flex-evening-late-winter')
where exists (select 1 from cron.job where jobname = 'flex-evening-late-winter');
select cron.unschedule('flex-weekly-recap-summer')
where exists (select 1 from cron.job where jobname = 'flex-weekly-recap-summer');
select cron.unschedule('flex-weekly-recap-winter')
where exists (select 1 from cron.job where jobname = 'flex-weekly-recap-winter');

-- Helper : génère un select net.http_post vers flex-notifier
-- (inline puisque pg_cron prend une string SQL directement)

-- ── evening (20h Paris) ──
-- 18:00 UTC → couvre été (20h Paris)
select cron.schedule(
  'flex-evening-reminder-summer',
  '0 18 * * *',
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
-- 19:00 UTC → couvre hiver (20h Paris)
select cron.schedule(
  'flex-evening-reminder-winter',
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

-- ── evening_late (22h Paris) ──
select cron.schedule(
  'flex-evening-late-summer',
  '0 20 * * *',
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
select cron.schedule(
  'flex-evening-late-winter',
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

-- ── weekly_recap (dim 20h Paris) ──
select cron.schedule(
  'flex-weekly-recap-summer',
  '0 18 * * 0',
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
select cron.schedule(
  'flex-weekly-recap-winter',
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
