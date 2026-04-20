-- =============================================================================
-- PHASE 2 — BASCULE ATOMIQUE (audit sécurité L2)
--
-- ⚠️ À N'EXÉCUTER QUE LORSQUE LES 5 FLUX DE TEST VALIDENT LA SHADOW PHASE.
--
-- Principe : supprimer les policies permissives historiques et renommer les
-- `v2_*` en nom final. Tout est dans UNE SEULE transaction — si une étape
-- échoue, PostgreSQL rollback l'ensemble automatiquement.
--
-- Pré-requis : shadow_rls_level2.sql a été exécuté avec succès au préalable.
-- =============================================================================

begin;


-- ──────────────────────────────────────────────────────────────────────────────
-- 1. CLIENT_MESSAGES
-- ──────────────────────────────────────────────────────────────────────────────
drop policy if exists "msg_coach_read"   on public.client_messages;
drop policy if exists "msg_coach_update" on public.client_messages;
drop policy if exists "msg_coach_delete" on public.client_messages;

alter policy "v2_msg_coach_read"   on public.client_messages rename to "msg_coach_read";
alter policy "v2_msg_coach_update" on public.client_messages rename to "msg_coach_update";
alter policy "v2_msg_coach_delete" on public.client_messages rename to "msg_coach_delete";


-- ──────────────────────────────────────────────────────────────────────────────
-- 2. CLIENT_EVOLUTION_REPORTS
-- ──────────────────────────────────────────────────────────────────────────────
drop policy if exists "report_coach_insert" on public.client_evolution_reports;
drop policy if exists "report_coach_update" on public.client_evolution_reports;
drop policy if exists "report_coach_delete" on public.client_evolution_reports;

alter policy "v2_report_coach_insert" on public.client_evolution_reports rename to "report_coach_insert";
alter policy "v2_report_coach_update" on public.client_evolution_reports rename to "report_coach_update";
alter policy "v2_report_coach_delete" on public.client_evolution_reports rename to "report_coach_delete";


-- ──────────────────────────────────────────────────────────────────────────────
-- 3. PUSH_SUBSCRIPTIONS
-- ──────────────────────────────────────────────────────────────────────────────
drop policy if exists "push_public_select" on public.push_subscriptions;
drop policy if exists "push_public_insert" on public.push_subscriptions;
drop policy if exists "push_public_update" on public.push_subscriptions;
drop policy if exists "push_public_delete" on public.push_subscriptions;

alter policy "v2_push_user_select" on public.push_subscriptions rename to "push_user_select";
alter policy "v2_push_user_insert" on public.push_subscriptions rename to "push_user_insert";
alter policy "v2_push_user_update" on public.push_subscriptions rename to "push_user_update";
alter policy "v2_push_user_delete" on public.push_subscriptions rename to "push_user_delete";
-- Note : `push_own` (FOR ALL USING auth.uid()::text = user_id) reste active ;
-- redondante mais non conflictuelle avec les v2_ renommées.


-- ──────────────────────────────────────────────────────────────────────────────
-- 4. CLIENT_APP_ACCOUNTS
-- ──────────────────────────────────────────────────────────────────────────────
drop policy if exists "client_app_coach_write" on public.client_app_accounts;

alter policy "v2_client_app_coach_select" on public.client_app_accounts rename to "client_app_coach_select";
alter policy "v2_client_app_coach_insert" on public.client_app_accounts rename to "client_app_coach_insert";
alter policy "v2_client_app_coach_update" on public.client_app_accounts rename to "client_app_coach_update";
alter policy "v2_client_app_coach_delete" on public.client_app_accounts rename to "client_app_coach_delete";


-- ──────────────────────────────────────────────────────────────────────────────
-- 5. CLIENT_RECAPS
-- ──────────────────────────────────────────────────────────────────────────────
drop policy if exists "recap_public_update" on public.client_recaps;

alter policy "v2_recap_coach_update" on public.client_recaps rename to "recap_coach_update";


commit;


-- =============================================================================
-- FIN PHASE 2 — BASCULE TERMINÉE
--
-- Après cette transaction :
--   - Plus aucune policy `TO public USING (true)` sur les 5 tables ciblées.
--   - Plus aucune policy préfixée `v2_`.
--   - Les policies publiques par token (read/insert) sont conservées.
--
-- Rollback d'urgence : rollback_rls_level2.sql (recrée l'état permissif
-- d'origine, à n'utiliser que si un flux critique se bloque en prod).
-- =============================================================================
