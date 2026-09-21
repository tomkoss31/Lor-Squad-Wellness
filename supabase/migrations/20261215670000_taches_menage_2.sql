-- =============================================================================
-- Les tâches du matin, 2e passage (21/09/2026, Thomas : « 9h20 pas besoin…
-- 9h40 supprime-la totalement… paiement une seule fois par jour »).
--
--   • `morning-suivis-digest` (9 h 20 Paris, « X suivis à faire aujourd'hui »)
--     → SUPPRIMÉE (tâche + edge, supprimée à part). Les suivis du jour restent
--     dans l'app (Suivis du jour, Le matin).
--   • `formation-relay-to-admin` (9 h 40, formations en attente de validation
--     depuis 48 h remontées à l'admin : 0 en 30 j, 0 en attente) → SUPPRIMÉE
--     (tâche + edge).
--   • `stripe-manual-reconcile` (4 fois par jour, 0 lien Stripe créé en 30 j) →
--     UNE fois par jour, 8 h 50 à Paris l'été (6 h 50 UTC, minute libre).
-- Pour remettre une tâche : ses commandes d'origine sont en bas.
-- =============================================================================

select cron.unschedule(jobid) from cron.job where jobname in ('morning-suivis-digest', 'formation-relay-to-admin');

select cron.alter_job(jobid, schedule := '50 6 * * *') from cron.job where jobname = 'stripe-manual-reconcile';

-- ─── Pour remettre (commandes d'origine) ─────────────────────────────────────
-- select cron.schedule('morning-suivis-digest', '20 7 * * *', $$ select net.http_post(
--   url := 'https://gqxnndwrdbghxflwmfxy.supabase.co/functions/v1/morning-suivis-digest',
--   headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' ||
--     (select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key')),
--   body := '{}'::jsonb, timeout_milliseconds := 30000); $$);
-- select cron.schedule('formation-relay-to-admin', '40 7 * * *', $$ select net.http_post(
--   url := 'https://gqxnndwrdbghxflwmfxy.supabase.co/functions/v1/formation-relay-to-admin',
--   headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' ||
--     (select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key')),
--   body := '{}'::jsonb, timeout_milliseconds := 60000); $$);
--   (+ leurs edges : historique git, supabase/functions/<nom>)
-- select cron.alter_job(jobid, schedule := '50 */6 * * *') from cron.job where jobname = 'stripe-manual-reconcile';
