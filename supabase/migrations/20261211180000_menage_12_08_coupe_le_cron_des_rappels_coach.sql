-- =============================================================================
-- Ménage du 12/08/2026 — le cron des rappels coach s'arrête avec la fonction
--
-- Décision de Thomas : la liste privée « rappelle-moi » est supprimée.
-- Mesure qui l'a motivée : **2 rappels créés en 90 jours**, le dernier il y a
-- 38 jours — pour un cron réglé sur `15,45 * * * *`, soit **48 passages par
-- jour**. C'est exactement le profil qui a figé la base le 29/07 : beaucoup de
-- réveils pour presque rien.
--
-- Le code front et l'edge `coach-reminder-notifier` sont retirés dans le même
-- commit. Laisser le cron actif le ferait appeler une fonction disparue, deux
-- fois par heure, indéfiniment.
--
-- ── RÉVERSIBLE EN UNE LIGNE ────────────────────────────────────────────────
--   select cron.alter_job(69, active := true);
--
-- On DÉSACTIVE plutôt qu'on ne supprime : la planification reste lisible dans
-- `cron.job`, et le retour arrière ne demande pas de la réécrire de mémoire.
--
-- ⚠️ La table `coach_reminders` et ses 2 lignes sont CONSERVÉES. Règle du
-- ménage : on ne supprime jamais de données comme effet de bord d'un retrait
-- de code — ça se décide séparément.
-- =============================================================================

do $$
declare
  id_job bigint;
begin
  select jobid into id_job from cron.job where jobname = 'coach-reminder-notifier';

  if id_job is null then
    raise notice 'coach-reminder-notifier : déjà absent, rien à faire.';
  else
    perform cron.alter_job(id_job, active := false);
    raise notice 'coach-reminder-notifier (job %) désactivé.', id_job;
  end if;
end
$$;
