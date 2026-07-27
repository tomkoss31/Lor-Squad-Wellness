-- =============================================================================
-- Chantier Simplification (2026-07-27) — LOT 5 : diète notifications.
--
-- Mesure prod sur 30 jours : chaque coach recevait ~3 push/jour, dont DEUX
-- venant de FLEX — la fonctionnalité la plus morte de l'app (table
-- daily_action_checkin : 0 ligne depuis la mise en service). Mélanie a reçu
-- 54 notifications FLEX en un mois pour une page qu'elle n'ouvre jamais.
--
-- On désactive (`active = false`) plutôt que supprimer : un simple
-- `cron.alter_job(jobid, active := true)` les rallume, commande et planning
-- intacts (y compris le passage par Vault pour la clé service).
--
-- COUPÉS (11 jobs) :
--   • flex-evening-reminder / flex-evening-late / flex-weekly-recap (×2 chacun,
--     été + hiver) — 6 jobs, la feature part en niveau « complet »
--   • coach-tips-dispatcher — 1 push/jour à tout le monde
--   • pv-month-end-reminder (×2) et rank-threshold-notifier (×2) — choix Thomas
--
-- GARDÉS : morning-suivis-digest + crm-relance-notifier (7h, les deux vraies
-- notifs métier « qui relancer aujourd'hui »), daily-actions-notifier 18h/19h
-- (check-list 20h Paris, choix Thomas), et tout ce qui touche aux RDV, aux
-- messages clients et aux paiements reçus.
-- =============================================================================

do $$
declare
  j record;
begin
  for j in
    select jobid, jobname from cron.job
    where jobname in (
      'flex-evening-reminder-summer',
      'flex-evening-reminder-winter',
      'flex-evening-late-summer',
      'flex-evening-late-winter',
      'flex-weekly-recap-summer',
      'flex-weekly-recap-winter',
      'coach-tips-dispatcher',
      'pv-month-end-reminder-08',
      'pv-month-end-reminder-09',
      'rank-threshold-notifier-06',
      'rank-threshold-notifier-07'
    )
  loop
    perform cron.alter_job(j.jobid, active := false);
    raise notice 'cron desactive : %', j.jobname;
  end loop;
end $$;
