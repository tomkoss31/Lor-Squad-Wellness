-- Cron crm-relance-notifier (wagon 2 chantier 4, 2026-06-10).
-- Push du matin « ⏳ X leads attendent dans ton CRM » à chaque coach.
--
-- Pattern Vault (cf. crons réécrits 2026-06-03) : la clé service_role est lue
-- depuis vault.decrypted_secrets (secret 'service_role_key' déjà présent), pas
-- en clair. pg_cron travaille en UTC : 07:00 UTC = 8h Paris (hiver) / 9h (été),
-- aligné sur morning-suivis-digest.
--
-- Idempotent : unschedule puis schedule. cron.schedule ne stocke que la commande
-- (pas d'exécution), donc safe même si l'edge n'est pas encore appelable.

create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.unschedule('crm-relance-notifier')
where exists (select 1 from cron.job where jobname = 'crm-relance-notifier');

select cron.schedule('crm-relance-notifier', '0 7 * * *', $job$
  select net.http_post(
    url := 'https://gqxnndwrdbghxflwmfxy.supabase.co/functions/v1/crm-relance-notifier',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 30000
  );
$job$);
