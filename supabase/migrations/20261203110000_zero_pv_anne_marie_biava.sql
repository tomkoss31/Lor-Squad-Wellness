-- =============================================================================
-- Supprime les points volume (PV) d'Anne Marie BIAVA (2026-06-16, demande Thomas).
--
-- Elle prend ses produits SUR PLACE → le PV ne doit pas compter dans son
-- compteur (déjà compté côté club/Bizworks). On remet à 0 :
--   - pv_transactions.pv      → compteur PV client + PV VIP (get_client_vip_status)
--   - pv_client_products.pv_per_unit → estimations PV (dormants, etc.)
--
-- ⚠️ AUCUN impact sur la RENTABILITÉ : elle se calcule sur le PRIX
-- (price_public_per_unit), jamais sur le PV. Les prix ne sont PAS touchés.
-- Match robuste sur first_name||last_name (casse + espaces normalisés), ciblé.
-- =============================================================================

begin;

update public.pv_transactions
set pv = 0
where pv <> 0
  and client_id in (
    select id from public.clients
    where lower(regexp_replace(trim(coalesce(first_name,'') || ' ' || coalesce(last_name,'')), '\s+', ' ', 'g'))
          = 'anne marie biava'
  );

update public.pv_client_products
set pv_per_unit = 0
where pv_per_unit <> 0
  and client_id in (
    select id from public.clients
    where lower(regexp_replace(trim(coalesce(first_name,'') || ' ' || coalesce(last_name,'')), '\s+', ' ', 'g'))
          = 'anne marie biava'
  );

commit;
