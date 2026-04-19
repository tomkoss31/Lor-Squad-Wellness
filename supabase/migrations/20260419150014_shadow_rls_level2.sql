-- =============================================================================
-- PHASE 1 — SHADOW POLICIES v2 (audit sécurité L2 — 5 failles)
--
-- À EXÉCUTER DANS SUPABASE STUDIO → SQL EDITOR.
--
-- STRATÉGIE : on AJOUTE des policies préfixées `v2_` à côté des anciennes.
-- PostgreSQL applique la politique la plus permissive : les policies
-- existantes (USING true / FOR ALL) restent dominantes, donc ce script
-- est SANS IMPACT fonctionnel. Il prépare la bascule atomique (phase 2).
--
-- RÈGLES COMMUNES :
--   - Toutes les policies v2_ ciblent `authenticated` uniquement.
--   - Le contrôle d'accès réutilise les helpers SQL existants :
--       public.is_active_user()     → bloque les comptes désactivés
--       public.can_access_owner(u)  → admin OR owner OR referent(sponsor)
--   - Cast systématique `clients.id::text = <table>.client_id`
--     (les tables Studio stockent les IDs en text alors que `public.clients`
--     les stocke en uuid).
--   - Aucune policy publique par token (recap_public_read, report_public_read,
--     client_app_public_read, msg_public_insert) n'est touchée.
--
-- TABLES CONCERNÉES :
--   - client_messages             (faille 🔴 : read/update/delete TO public USING true)
--   - client_evolution_reports    (faille 🔴 : insert/update/delete TO public USING true)
--   - push_subscriptions          (faille 🔴 : select/insert/update/delete TO public USING true)
--   - client_app_accounts         (faille 🟡 : FOR ALL auth.uid() IS NOT NULL, pas de scope owner)
--   - client_recaps               (faille 🟡 : update TO public USING expires_at > now())
-- =============================================================================


-- ──────────────────────────────────────────────────────────────────────────────
-- 1. CLIENT_MESSAGES — resserrer read / update / delete au coach propriétaire
-- ──────────────────────────────────────────────────────────────────────────────
-- Note : `msg_public_insert` (INSERT TO public WITH CHECK (true)) est PRÉSERVÉE.
--        Elle permet aux rapports/recaps publics (token-based) d'envoyer des
--        demandes produits ou recommandations côté coach.

drop policy if exists "v2_msg_coach_read" on public.client_messages;
create policy "v2_msg_coach_read"
  on public.client_messages
  as permissive
  for select
  to authenticated
  using (
    public.is_active_user()
    and exists (
      select 1 from public.clients
      where public.clients.id::text = public.client_messages.client_id
        and public.can_access_owner(public.clients.distributor_id)
    )
  );

drop policy if exists "v2_msg_coach_update" on public.client_messages;
create policy "v2_msg_coach_update"
  on public.client_messages
  as permissive
  for update
  to authenticated
  using (
    public.is_active_user()
    and exists (
      select 1 from public.clients
      where public.clients.id::text = public.client_messages.client_id
        and public.can_access_owner(public.clients.distributor_id)
    )
  )
  with check (
    public.is_active_user()
    and exists (
      select 1 from public.clients
      where public.clients.id::text = public.client_messages.client_id
        and public.can_access_owner(public.clients.distributor_id)
    )
  );

drop policy if exists "v2_msg_coach_delete" on public.client_messages;
create policy "v2_msg_coach_delete"
  on public.client_messages
  as permissive
  for delete
  to authenticated
  using (
    public.is_active_user()
    and exists (
      select 1 from public.clients
      where public.clients.id::text = public.client_messages.client_id
        and public.can_access_owner(public.clients.distributor_id)
    )
  );


-- ──────────────────────────────────────────────────────────────────────────────
-- 2. CLIENT_EVOLUTION_REPORTS — resserrer insert / update / delete
-- ──────────────────────────────────────────────────────────────────────────────
-- Note : `report_public_read` (SELECT TO public USING (expires_at > now()))
--        est PRÉSERVÉE. Elle permet au client d'ouvrir /rapport/:token.

drop policy if exists "v2_report_coach_insert" on public.client_evolution_reports;
create policy "v2_report_coach_insert"
  on public.client_evolution_reports
  as permissive
  for insert
  to authenticated
  with check (
    public.is_active_user()
    and exists (
      select 1 from public.clients
      where public.clients.id::text = public.client_evolution_reports.client_id
        and public.can_access_owner(public.clients.distributor_id)
    )
  );

drop policy if exists "v2_report_coach_update" on public.client_evolution_reports;
create policy "v2_report_coach_update"
  on public.client_evolution_reports
  as permissive
  for update
  to authenticated
  using (
    public.is_active_user()
    and exists (
      select 1 from public.clients
      where public.clients.id::text = public.client_evolution_reports.client_id
        and public.can_access_owner(public.clients.distributor_id)
    )
  )
  with check (
    public.is_active_user()
    and exists (
      select 1 from public.clients
      where public.clients.id::text = public.client_evolution_reports.client_id
        and public.can_access_owner(public.clients.distributor_id)
    )
  );

drop policy if exists "v2_report_coach_delete" on public.client_evolution_reports;
create policy "v2_report_coach_delete"
  on public.client_evolution_reports
  as permissive
  for delete
  to authenticated
  using (
    public.is_active_user()
    and exists (
      select 1 from public.clients
      where public.clients.id::text = public.client_evolution_reports.client_id
        and public.can_access_owner(public.clients.distributor_id)
    )
  );


-- ──────────────────────────────────────────────────────────────────────────────
-- 3. PUSH_SUBSCRIPTIONS — chacun gère exclusivement les siennes
-- ──────────────────────────────────────────────────────────────────────────────
-- Pas de `can_access_owner()` ici : la table porte `user_id text` qui mappe
-- directement à `auth.uid()`. Pas de notion d'admin-voit-tout sur les push :
-- un admin ne doit pas manipuler les endpoints VAPID des autres coachs.
-- Note : `push_own` (FOR ALL USING (auth.uid())::text = user_id) existe déjà
-- et reste compatible avec les v2_ ci-dessous.

drop policy if exists "v2_push_user_select" on public.push_subscriptions;
create policy "v2_push_user_select"
  on public.push_subscriptions
  as permissive
  for select
  to authenticated
  using ((auth.uid())::text = user_id);

drop policy if exists "v2_push_user_insert" on public.push_subscriptions;
create policy "v2_push_user_insert"
  on public.push_subscriptions
  as permissive
  for insert
  to authenticated
  with check ((auth.uid())::text = user_id);

drop policy if exists "v2_push_user_update" on public.push_subscriptions;
create policy "v2_push_user_update"
  on public.push_subscriptions
  as permissive
  for update
  to authenticated
  using ((auth.uid())::text = user_id)
  with check ((auth.uid())::text = user_id);

drop policy if exists "v2_push_user_delete" on public.push_subscriptions;
create policy "v2_push_user_delete"
  on public.push_subscriptions
  as permissive
  for delete
  to authenticated
  using ((auth.uid())::text = user_id);


-- ──────────────────────────────────────────────────────────────────────────────
-- 4. CLIENT_APP_ACCOUNTS — remplacer le FOR ALL trop large
-- ──────────────────────────────────────────────────────────────────────────────
-- Note : `client_app_public_read` (SELECT TO public USING (expires_at > now()))
--        est PRÉSERVÉE. Elle permet l'ouverture de /client/:token.

drop policy if exists "v2_client_app_coach_select" on public.client_app_accounts;
create policy "v2_client_app_coach_select"
  on public.client_app_accounts
  as permissive
  for select
  to authenticated
  using (
    public.is_active_user()
    and exists (
      select 1 from public.clients
      where public.clients.id::text = public.client_app_accounts.client_id
        and public.can_access_owner(public.clients.distributor_id)
    )
  );

drop policy if exists "v2_client_app_coach_insert" on public.client_app_accounts;
create policy "v2_client_app_coach_insert"
  on public.client_app_accounts
  as permissive
  for insert
  to authenticated
  with check (
    public.is_active_user()
    and exists (
      select 1 from public.clients
      where public.clients.id::text = public.client_app_accounts.client_id
        and public.can_access_owner(public.clients.distributor_id)
    )
  );

drop policy if exists "v2_client_app_coach_update" on public.client_app_accounts;
create policy "v2_client_app_coach_update"
  on public.client_app_accounts
  as permissive
  for update
  to authenticated
  using (
    public.is_active_user()
    and exists (
      select 1 from public.clients
      where public.clients.id::text = public.client_app_accounts.client_id
        and public.can_access_owner(public.clients.distributor_id)
    )
  )
  with check (
    public.is_active_user()
    and exists (
      select 1 from public.clients
      where public.clients.id::text = public.client_app_accounts.client_id
        and public.can_access_owner(public.clients.distributor_id)
    )
  );

drop policy if exists "v2_client_app_coach_delete" on public.client_app_accounts;
create policy "v2_client_app_coach_delete"
  on public.client_app_accounts
  as permissive
  for delete
  to authenticated
  using (
    public.is_active_user()
    and exists (
      select 1 from public.clients
      where public.clients.id::text = public.client_app_accounts.client_id
        and public.can_access_owner(public.clients.distributor_id)
    )
  );


-- ──────────────────────────────────────────────────────────────────────────────
-- 5. CLIENT_RECAPS — retirer l'UPDATE public (seul coach peut régénérer)
-- ──────────────────────────────────────────────────────────────────────────────
-- Notes préservées :
--   - `recap_public_read` (SELECT TO public USING expires_at > now()) : lecture
--      anonyme via /recap/:token. PRÉSERVÉE.
--   - `recap_coach_insert` (INSERT WITH CHECK (auth.uid() IS NOT NULL)) : sera
--      resserrée lors d'un audit L3 (hors scope L2). NON TOUCHÉE ici.

drop policy if exists "v2_recap_coach_update" on public.client_recaps;
create policy "v2_recap_coach_update"
  on public.client_recaps
  as permissive
  for update
  to authenticated
  using (
    public.is_active_user()
    and exists (
      select 1 from public.clients
      where public.clients.id::text = public.client_recaps.client_id
        and public.can_access_owner(public.clients.distributor_id)
    )
  )
  with check (
    public.is_active_user()
    and exists (
      select 1 from public.clients
      where public.clients.id::text = public.client_recaps.client_id
        and public.can_access_owner(public.clients.distributor_id)
    )
  );


-- =============================================================================
-- FIN PHASE 1 — SHADOW POLICIES INSTALLÉES
--
-- Résumé : 16 policies v2_ ajoutées, 0 policy existante supprimée.
-- Comportement applicatif inchangé (les policies FOR ALL TO public USING (true)
-- restent dominantes). Tester les 5 flux puis lancer commit_rls_level2.sql.
-- =============================================================================
