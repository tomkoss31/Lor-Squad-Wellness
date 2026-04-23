-- REVERT (2026-04-25) — retour à l'état d'avant les chantiers RGPD/sync.
-- Supprime les 5 policies que j'ai ajoutées ces 2 derniers jours pour
-- restaurer l'état initial. Les features "client lit ses propres tokens /
-- RDV / produits / consent" sont désactivées jusqu'à ce qu'on les
-- réintroduise proprement après test.

drop policy if exists "clients_self_select_via_app" on public.clients;
drop policy if exists "clients_self_update_via_app" on public.clients;
drop policy if exists "follow_ups_self_select_via_app" on public.follow_ups;
drop policy if exists "pv_client_products_self_select_via_app" on public.pv_client_products;
drop policy if exists "public_share_tokens_client_self_select" on public.client_public_share_tokens;
drop policy if exists "public_share_tokens_client_self_delete" on public.client_public_share_tokens;
