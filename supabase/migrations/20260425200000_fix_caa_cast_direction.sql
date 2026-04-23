-- Hotfix urgent (2026-04-25).
-- Les policies RLS ajoutées dans les migrations 20260424210000,
-- 20260424211000 et 20260425100000 font `caa.client_id::uuid = X`.
-- Problème : client_app_accounts.client_id est TEXT, et si UNE seule row
-- de cette table contient un client_id non-UUID (import manuel, legacy,
-- token expiré, valeur corrompue), le cast ::uuid plante à l'évaluation
-- du RLS → l'EXISTS du policy throw → Postgres propage l'erreur →
-- **toute** la table clients (et tokens, follow_ups, pv_client_products)
-- devient illisible, même pour les coachs.
--
-- Fix : inverser le cast — on cast clients.id::text (toujours safe car
-- les UUIDs sont toujours convertibles en text) et on compare text=text.
--
-- Idempotent.

-- ─── 20260424210000 : clients_self_update_via_app ──────────────────────
drop policy if exists "clients_self_update_via_app" on public.clients;
create policy "clients_self_update_via_app"
  on public.clients
  for update
  to authenticated
  using (
    exists (
      select 1 from public.client_app_accounts caa
      where caa.auth_user_id = auth.uid()
        and caa.client_id = clients.id::text
    )
  )
  with check (
    exists (
      select 1 from public.client_app_accounts caa
      where caa.auth_user_id = auth.uid()
        and caa.client_id = clients.id::text
    )
  );

-- ─── 20260424211000 : public_share_tokens_client_self_select ──────────
drop policy if exists "public_share_tokens_client_self_select" on public.client_public_share_tokens;
create policy "public_share_tokens_client_self_select"
  on public.client_public_share_tokens
  for select
  to authenticated
  using (
    exists (
      select 1 from public.client_app_accounts caa
      where caa.auth_user_id = auth.uid()
        and caa.client_id = client_public_share_tokens.client_id::text
    )
  );

drop policy if exists "public_share_tokens_client_self_delete" on public.client_public_share_tokens;
create policy "public_share_tokens_client_self_delete"
  on public.client_public_share_tokens
  for delete
  to authenticated
  using (
    exists (
      select 1 from public.client_app_accounts caa
      where caa.auth_user_id = auth.uid()
        and caa.client_id = client_public_share_tokens.client_id::text
    )
  );

-- ─── 20260425100000 : clients_self_select_via_app ─────────────────────
drop policy if exists "clients_self_select_via_app" on public.clients;
create policy "clients_self_select_via_app"
  on public.clients
  for select
  to authenticated
  using (
    exists (
      select 1 from public.client_app_accounts caa
      where caa.auth_user_id = auth.uid()
        and caa.client_id = clients.id::text
    )
  );

-- ─── 20260425100000 : follow_ups_self_select_via_app ──────────────────
drop policy if exists "follow_ups_self_select_via_app" on public.follow_ups;
create policy "follow_ups_self_select_via_app"
  on public.follow_ups
  for select
  to authenticated
  using (
    exists (
      select 1 from public.client_app_accounts caa
      where caa.auth_user_id = auth.uid()
        and caa.client_id = follow_ups.client_id::text
    )
  );

-- ─── 20260425100000 : pv_client_products_self_select_via_app ──────────
drop policy if exists "pv_client_products_self_select_via_app" on public.pv_client_products;
create policy "pv_client_products_self_select_via_app"
  on public.pv_client_products
  for select
  to authenticated
  using (
    exists (
      select 1 from public.client_app_accounts caa
      where caa.auth_user_id = auth.uid()
        and caa.client_id = pv_client_products.client_id::text
    )
  );
