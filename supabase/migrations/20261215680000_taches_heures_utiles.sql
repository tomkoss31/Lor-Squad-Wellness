-- =============================================================================
-- Les trois tâches fréquentes, aux heures utiles seulement (21/09/2026,
-- Thomas : « très bien, go comme ça »). Elles faisaient 240 des ~247 lancements
-- par jour, et la base (Nano, 0,5 Go) a gelé ce soir-là de 18 h 50 à 19 h 21.
-- Aucun envoi perdu : chaque horaire couvre les fenêtres de la fonction, été
-- (Paris = UTC+2) comme hiver (UTC+1). Jamais la minute 0 (incident du 29/07).
--
--   • client-rdv-reminder — toutes les 30 min, 24 h/24 (48/jour) → toutes les
--     30 min de 4 h à 20 h UTC (34/jour), soit 6 h-22 h 35 Paris l'été, 5 h-21 h 35
--     l'hiver. Couvre la veille (18 h-20 h Paris + rattrapage) et le « 2 h avant »
--     (fenêtre 105-150 min) des RDV de 8 h à 20 h. Rien à envoyer la nuit.
--   • rdv-imminent-notifier — toutes les 30 min (48/jour) → 1 fois par heure de
--     5 h à 18 h UTC (14/jour), soit 7 h-20 h Paris l'été. Sa fenêtre fait 60 min
--     (30 à 90 min devant) : à l'heure, les fenêtres se touchent, rien n'est raté.
--   • club-mail-creneau-manquant — toutes les 10 min (144/jour) → toutes les
--     30 min de 5 h à 21 h UTC (34/jour), soit 7 h-23 h 30 Paris l'été. Le mail part
--     5 à 35 min après l'abandon (au lieu de 5 à 15) ; sa fenêtre va jusqu'à 24 h,
--     donc une inscription de nuit reçoit le sien le matin.
-- Total : ~247 → ~89 lancements par jour.
-- Pour revenir : '5,35 * * * *', '8,38 * * * *', '2,12,22,32,42,52 * * * *'.
-- =============================================================================

select cron.alter_job(jobid, schedule := '5,35 4-20 * * *') from cron.job where jobname = 'client-rdv-reminder';
select cron.alter_job(jobid, schedule := '8 5-18 * * *') from cron.job where jobname = 'rdv-imminent-notifier';
select cron.alter_job(jobid, schedule := '2,32 5-21 * * *') from cron.job where jobname = 'club-mail-creneau-manquant';
