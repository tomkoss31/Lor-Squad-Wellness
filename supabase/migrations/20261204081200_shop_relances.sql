-- =============================================================================
-- Relances boutique HL SKIN (2026-07-12)
-- =============================================================================
-- 1. Panier abandonné : commande `pending` (lead capturé) 2 h–72 h → email relance.
-- 2. Demande d'avis : commande `paid` depuis ≥ 7 j → email invitant à laisser un
--    avis (alimente les témoignages skin). 1 email max par flux (colonnes _sent_at).
-- Cron horaire → edge shop-relance-notifier (service_role via Vault). Idempotent.
-- =============================================================================

alter table public.shop_orders add column if not exists relance_email_sent_at timestamptz;
alter table public.shop_orders add column if not exists review_request_sent_at timestamptz;

do $$
begin
  perform cron.unschedule(jobid) from cron.job where jobname = 'shop-relance-notifier';
exception when others then null;
end $$;

select cron.schedule('shop-relance-notifier', '0 * * * *', $job$
  select net.http_post(
    url := 'https://gqxnndwrdbghxflwmfxy.supabase.co/functions/v1/shop-relance-notifier',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 60000
  );
$job$);
