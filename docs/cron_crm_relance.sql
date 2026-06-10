-- Cron crm-relance-notifier (wagon 2 chantier 4, 2026-06-10).
-- À exécuter dans le SQL Editor Supabase (pattern Vault, cf. docs/fix_crons_vault.sql).
-- Pré-requis : edge function déployée (supabase functions deploy crm-relance-notifier)
-- + secret 'service_role_key' déjà présent dans Vault (posé le 2026-06-03).

select cron.unschedule('crm-relance-notifier')
where exists (select 1 from cron.job where jobname = 'crm-relance-notifier');

-- 07:00 UTC = 8h Paris (hiver) / 9h (été) — aligné sur morning-suivis-digest.
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
