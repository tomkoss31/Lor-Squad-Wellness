-- Lot 2 (18/09/2026) — ménage : les 15 tâches planifiées INACTIVES sont supprimées.
-- Elles étaient coupées (active = false) depuis le 27/07 ou le 29/07 et n'avaient
-- jamais été retirées. `bbc-call-reminder` est GARDÉE inactive : CLAUDE.md la
-- note « à rebrancher à l'ouverture du club » (les appels du soir, 0 inscrit
-- pour l'instant — décision de Thomas).
--
-- Pour en recréer une, toutes avaient la même forme :
--   select cron.schedule('<nom>', '<horaire>', $$
--     select net.http_post(
--       url := 'https://gqxnndwrdbghxflwmfxy.supabase.co/functions/v1/<fonction>',
--       headers := jsonb_build_object('Content-Type', 'application/json',
--         'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key')),
--       body := '{}'::jsonb, timeout_milliseconds := 60000);
--   $$);
-- ⚠️ jamais sur la minute 0 (cf. CLAUDE.md, incident du 29/07).
--
-- | nom                          | horaire (UTC)    | fonction appelée                         |
-- | client-app-data-warmup       | */5 * * * *      | client-app-data?token=warmup-ping-no-real-client (échouait à chaque fois) |
-- | coach-reminder-notifier      | 15,45 * * * *    | coach-reminder-notifier                  |
-- | coach-tips-dispatcher        | 0 6 * * *        | coach-tips-dispatcher                    |
-- | daily-actions-notifier-18/19 | 0 18 / 0 19      | daily-actions-notifier                   |
-- | flex-evening-reminder-summer/winter | 0 18 / 0 19 | flex-notifier?mode=evening           |
-- | flex-evening-late-summer/winter     | 0 20 / 0 21 | flex-notifier?mode=evening_late      |
-- | flex-weekly-recap-summer/winter     | 0 18 * * 0 / 0 19 * * 0 | flex-notifier?mode=weekly_recap |
-- | pv-month-end-reminder-08/09  | 0 8 / 0 9        | pv-month-end-reminder                    |
-- | rank-threshold-notifier-06/07| 0 6 / 0 7        | rank-threshold-notifier                  |

select cron.unschedule(jobid)
  from cron.job
 where active = false
   and jobname <> 'bbc-call-reminder';
