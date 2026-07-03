-- =============================================================================
-- Cron coach-reminder-notifier (2026-07-03) — push AU COACH le jour J.
--
-- Toutes les 30 min : appelle l'edge coach-reminder-notifier qui envoie un push
-- au coach pour chaque rappel « à relancer » arrivé à échéance (remind_at<=now,
-- notified_at null). Le client ne reçoit jamais rien.
--
-- Clé service_role lue depuis le Vault (cf. docs/fix_crons_vault.sql). Upsert
-- par nom → ré-exécutable.
-- =============================================================================

select cron.schedule('coach-reminder-notifier', '*/30 * * * *', $job$
  select net.http_post(
    url := 'https://gqxnndwrdbghxflwmfxy.supabase.co/functions/v1/coach-reminder-notifier',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 60000
  );
$job$);
