-- =============================================================================
-- Cron stripe-manual-reconcile — confirme les paiements Stripe « manuels » en
-- attente (audit 2026-07-27, constat #5). Les liens manuels Stripe (Mon panier /
-- bilan physique) n'ont aucun webhook (modèle « clé du distri, zéro config ») →
-- sans ce cron, la commande reste `pending` et le coach n'est jamais notifié.
-- Le cron interroge Stripe avec la clé du distri et bascule les commandes payées.
-- Toutes les 20 min. Auth = service_role_key (Vault), même pattern que les autres
-- crons.
-- =============================================================================

select cron.schedule(
  'stripe-manual-reconcile',
  '*/20 * * * *',
  $$
  select net.http_post(
    url := 'https://gqxnndwrdbghxflwmfxy.supabase.co/functions/v1/stripe-manual-reconcile',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 30000
  );
  $$
);
