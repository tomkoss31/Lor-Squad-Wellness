-- =============================================================================
-- FIX CRONS → lecture de la clé service_role depuis le Vault (2026-06-03)
--
-- Contexte : sur ce projet Supabase, ALTER DATABASE/ROLE SET "app.settings.*"
-- est refusé (permission denied). Les ~19 crons reposaient sur
-- current_setting('app.settings.*') → jamais réglé → tous en échec depuis
-- 2026-04-21. On bascule sur le Vault.
--
-- PRÉREQUIS (à faire AVANT ce script, une fois) :
--   select vault.update_secret(
--     (select id from vault.secrets where name = 'service_role_key'),
--     'TA_VRAIE_SERVICE_ROLE_KEY', 'service_role_key', 'crons');
--   -- vérifier : l'aperçu doit commencer par eyJ
--   select left(decrypted_secret,4) from vault.decrypted_secrets where name='service_role_key';
--
-- cron.schedule(name, ...) fait un UPSERT par nom → ré-exécuter écrase le job.
-- L'URL projet n'est pas secrète → en dur. La clé → Vault uniquement.
-- =============================================================================

-- ── client-anniversary-check ────────────────────────────────────────────────
select cron.schedule('client-anniversary-check-daily', '0 7 * * *', $job$
  select net.http_post(
    url := 'https://gqxnndwrdbghxflwmfxy.supabase.co/functions/v1/client-anniversary-check',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key')
    ),
    body := '{}'::jsonb
  );
$job$);

-- ── client-app-data warmup (token bidon volontaire) ─────────────────────────
select cron.schedule('client-app-data-warmup', '*/5 * * * *', $job$
  select net.http_post(
    url := 'https://gqxnndwrdbghxflwmfxy.supabase.co/functions/v1/client-app-data?token=warmup-ping-no-real-client',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 5000
  );
$job$);

-- ── coach-tips-dispatcher ────────────────────────────────────────────────────
select cron.schedule('coach-tips-dispatcher', '0 6 * * *', $job$
  select net.http_post(
    url := 'https://gqxnndwrdbghxflwmfxy.supabase.co/functions/v1/coach-tips-dispatcher',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 60000
  );
$job$);

-- ── daily-actions-notifier (18h + 19h UTC, gate Paris=20h dans la function) ──
select cron.schedule('daily-actions-notifier-18', '0 18 * * *', $job$
  select net.http_post(
    url := 'https://gqxnndwrdbghxflwmfxy.supabase.co/functions/v1/daily-actions-notifier',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key')
    ),
    body := '{}'::jsonb
  );
$job$);

select cron.schedule('daily-actions-notifier-19', '0 19 * * *', $job$
  select net.http_post(
    url := 'https://gqxnndwrdbghxflwmfxy.supabase.co/functions/v1/daily-actions-notifier',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key')
    ),
    body := '{}'::jsonb
  );
$job$);

-- ── flex-notifier (4 modes × DST) ────────────────────────────────────────────
select cron.schedule('flex-evening-late-summer', '0 20 * * *', $job$
  select net.http_post(
    url := 'https://gqxnndwrdbghxflwmfxy.supabase.co/functions/v1/flex-notifier?mode=evening_late',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 60000
  );
$job$);

select cron.schedule('flex-evening-late-winter', '0 21 * * *', $job$
  select net.http_post(
    url := 'https://gqxnndwrdbghxflwmfxy.supabase.co/functions/v1/flex-notifier?mode=evening_late',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 60000
  );
$job$);

select cron.schedule('flex-evening-reminder-summer', '0 18 * * *', $job$
  select net.http_post(
    url := 'https://gqxnndwrdbghxflwmfxy.supabase.co/functions/v1/flex-notifier?mode=evening',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 60000
  );
$job$);

select cron.schedule('flex-evening-reminder-winter', '0 19 * * *', $job$
  select net.http_post(
    url := 'https://gqxnndwrdbghxflwmfxy.supabase.co/functions/v1/flex-notifier?mode=evening',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 60000
  );
$job$);

select cron.schedule('flex-weekly-recap-summer', '0 18 * * 0', $job$
  select net.http_post(
    url := 'https://gqxnndwrdbghxflwmfxy.supabase.co/functions/v1/flex-notifier?mode=weekly_recap',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 60000
  );
$job$);

select cron.schedule('flex-weekly-recap-winter', '0 19 * * 0', $job$
  select net.http_post(
    url := 'https://gqxnndwrdbghxflwmfxy.supabase.co/functions/v1/flex-notifier?mode=weekly_recap',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 60000
  );
$job$);

-- ── formation-relay-to-admin ─────────────────────────────────────────────────
select cron.schedule('formation-relay-to-admin', '0 * * * *', $job$
  select net.http_post(
    url := 'https://gqxnndwrdbghxflwmfxy.supabase.co/functions/v1/formation-relay-to-admin',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 60000
  );
$job$);

-- ── morning-suivis-digest (corrige le 'Bearer <...>' cassé + clé en clair) ──
select cron.schedule('morning-suivis-digest', '0 7 * * *', $job$
  select net.http_post(
    url := 'https://gqxnndwrdbghxflwmfxy.supabase.co/functions/v1/morning-suivis-digest',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 30000
  );
$job$);

-- ── pv-month-end-reminder (08h + 09h) ────────────────────────────────────────
select cron.schedule('pv-month-end-reminder-08', '0 8 * * *', $job$
  select net.http_post(
    url := 'https://gqxnndwrdbghxflwmfxy.supabase.co/functions/v1/pv-month-end-reminder',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key')
    ),
    body := '{}'::jsonb
  );
$job$);

select cron.schedule('pv-month-end-reminder-09', '0 9 * * *', $job$
  select net.http_post(
    url := 'https://gqxnndwrdbghxflwmfxy.supabase.co/functions/v1/pv-month-end-reminder',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key')
    ),
    body := '{}'::jsonb
  );
$job$);

-- ── rank-threshold-notifier (06h + 07h) ──────────────────────────────────────
select cron.schedule('rank-threshold-notifier-06', '0 6 * * *', $job$
  select net.http_post(
    url := 'https://gqxnndwrdbghxflwmfxy.supabase.co/functions/v1/rank-threshold-notifier',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key')
    ),
    body := '{}'::jsonb
  );
$job$);

select cron.schedule('rank-threshold-notifier-07', '0 7 * * *', $job$
  select net.http_post(
    url := 'https://gqxnndwrdbghxflwmfxy.supabase.co/functions/v1/rank-threshold-notifier',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key')
    ),
    body := '{}'::jsonb
  );
$job$);

-- ── rdv-imminent-notifier (toutes les 30 min) ────────────────────────────────
select cron.schedule('rdv-imminent-notifier', '*/30 * * * *', $job$
  select net.http_post(
    url := 'https://gqxnndwrdbghxflwmfxy.supabase.co/functions/v1/rdv-imminent-notifier',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 15000
  );
$job$);

-- ── request-testimonial ──────────────────────────────────────────────────────
select cron.schedule('request-testimonial-daily', '0 8 * * *', $job$
  select net.http_post(
    url := 'https://gqxnndwrdbghxflwmfxy.supabase.co/functions/v1/request-testimonial',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 60000
  );
$job$);

-- =============================================================================
-- NB business-plan-reminder : appelle public.cron_business_plan_reminder().
-- Si les rappels business ne partent pas, inspecter la fonction :
--   select prosrc from pg_proc where proname = 'cron_business_plan_reminder';
-- (elle utilise probablement aussi current_setting → à porter sur Vault.)
-- =============================================================================
