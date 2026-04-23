-- Chantier sync coach↔client (2026-04-25).
-- Policies RLS permettant au client (via client_app_accounts.auth_user_id)
-- de lire en LIVE ses propres infos → statut programme + RDV synchronisés
-- automatiquement depuis la source de vérité coach (plus de snapshot figé).
--
-- client_app_accounts.client_id est TEXT, clients.id et follow_ups.client_id
-- sont UUID → cast explicite ::uuid.
--
-- Idempotent.

-- ─── clients : SELECT self (lit current_program, public_share_*, etc.) ──
drop policy if exists "clients_self_select_via_app" on public.clients;
create policy "clients_self_select_via_app"
  on public.clients
  for select
  to authenticated
  using (
    exists (
      select 1 from public.client_app_accounts caa
      where caa.client_id::uuid = clients.id
        and caa.auth_user_id = auth.uid()
    )
  );

-- ─── follow_ups : SELECT self (lit les RDV planifiés du client) ────────
drop policy if exists "follow_ups_self_select_via_app" on public.follow_ups;
create policy "follow_ups_self_select_via_app"
  on public.follow_ups
  for select
  to authenticated
  using (
    exists (
      select 1 from public.client_app_accounts caa
      where caa.client_id::uuid = follow_ups.client_id
        and caa.auth_user_id = auth.uid()
    )
  );

comment on policy "clients_self_select_via_app" on public.clients is
  'Chantier sync 2026-04-25 : le client peut lire sa propre row via son auth_user_id (client_app_accounts) → statut programme live.';

comment on policy "follow_ups_self_select_via_app" on public.follow_ups is
  'Chantier sync 2026-04-25 : le client peut lire ses propres RDV → affichage live côté app client, plus de snapshot figé.';
