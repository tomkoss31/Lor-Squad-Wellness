-- =============================================================================
-- Chantier Notifications push (2026-04-21)
-- 2. Cron toutes les 5 min → notif "RDV dans 1h"
--
-- Appelle l'Edge Function rdv-imminent-notifier toutes les 5 minutes. La
-- fonction scanne follow_ups et prospects pour les créneaux dans la fenêtre
-- [now+55min, now+65min] et envoie une push au coach propriétaire. Dédup
-- via push_notifications_sent (fenêtre 2h) pour ne pas re-notifier le
-- même RDV à chaque tick cron.
--
-- À EXÉCUTER DANS SUPABASE STUDIO → SQL EDITOR (après la migration 080000).
-- =============================================================================

-- Le cron et la table push_notifications_sent sont déjà créés par la
-- migration précédente. On ne planifie ici que le second job.

select cron.unschedule('rdv-imminent-notifier') where exists (
  select 1 from cron.job where jobname = 'rdv-imminent-notifier'
);

select cron.schedule(
  'rdv-imminent-notifier',
  '*/5 * * * *',
  $$
  select net.http_post(
    url := current_setting('app.settings.supabase_url', true) || '/functions/v1/rdv-imminent-notifier',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key'),
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 15000
  );
  $$
);
