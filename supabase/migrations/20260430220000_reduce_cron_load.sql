-- =============================================================================
-- Hotfix I/O budget Supabase (2026-04-30 soir)
--
-- Email Supabase : "votre projet epuise son budget E/S disque". Trop de
-- writes/reads sur le tier free. On reduit la frequence du cron RDV imminent
-- de 5 min -> 30 min (6x moins de runs).
--
-- Pour ne pas rater de notif RDV avec un cron moins frequent, on elargit la
-- fenetre de detection cote Edge function de [+55min, +65min] -> [+30min,
-- +90min]. Resultat : le coach recoit sa notif entre 30 min et 1h30 avant
-- son RDV (au lieu d exactement 1h avant). UX meme amelioree (plus de
-- preavis si RDV detecte tot).
--
-- Le redeploy de la function avec la nouvelle fenetre se fait separement
-- avec : supabase functions deploy rdv-imminent-notifier
-- =============================================================================

begin;

-- Reschedule rdv-imminent-notifier : 5 min -> 30 min
select cron.unschedule('rdv-imminent-notifier')
where exists (select 1 from cron.job where jobname = 'rdv-imminent-notifier');

select cron.schedule(
  'rdv-imminent-notifier',
  '*/30 * * * *',
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

commit;
