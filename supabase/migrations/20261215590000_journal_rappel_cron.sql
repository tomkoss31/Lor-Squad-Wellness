-- =============================================================================
-- Journal nutritionnel — le rappel de 20 h (lot 3) est programmé (21/09/2026).
--
-- Texte validé par Thomas avec la maquette v8 (« ok pour V8 et l'ensemble des
-- demandes ») : « Camille, ton journal t'attend — Tu n'as encore rien noté
-- aujourd'hui : 1 minute et c'est fait. » L'edge `journal-rappel` ne l'envoie
-- qu'à celles qui se servent de leur journal et n'ont rien noté ce jour-là
-- (tri : journal_rappel_cibles(), anti-doublon : journal_rappels_envoyes).
--
-- 20 h 16 à Paris été comme hiver : deux passages UTC (18 h 16 et 19 h 16), la
-- fonction ne travaille qu'à 20 h Paris et l'autre passage repart à vide.
-- Minute 16 : libre ce jour-là (5/35, 8/38, 2/12/22… sont prises) — et jamais
-- la minute 0 (incident Nano du 29/07).
-- =============================================================================

select cron.unschedule(jobid) from cron.job where jobname = 'journal-rappel';

select cron.schedule(
  'journal-rappel',
  '16 18,19 * * *',
  $$
  select net.http_post(
    url := 'https://gqxnndwrdbghxflwmfxy.supabase.co/functions/v1/journal-rappel',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 30000
  );
  $$
);
