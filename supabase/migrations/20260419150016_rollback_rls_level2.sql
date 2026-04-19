-- =============================================================================
-- ROLLBACK D'URGENCE — audit sécurité L2
--
-- ⚠️ À N'EXÉCUTER QUE SI UN FLUX BUSINESS CRITIQUE EST BLOQUÉ APRÈS LA PHASE 2.
--
-- Ce script :
--   1. Supprime toute policy v2_* encore présente (filet si bascule partielle)
--   2. Supprime les policies renommées (état post-phase 2)
--   3. Recrée les policies permissives d'origine (état pré-phase 1)
--
-- APRÈS ROLLBACK : les 5 failles RLS sont RÉ-OUVERTES. Ne pas laisser
-- l'app en prod dans cet état plus de quelques heures — identifier la
-- cause de blocage et re-préparer une migration corrective.
-- =============================================================================

begin;


-- ──────────────────────────────────────────────────────────────────────────────
-- 1. Nettoyage : supprimer TOUTES les policies issues du chantier L2
--    (v2_* de la shadow ET leurs équivalents renommés post-commit)
-- ──────────────────────────────────────────────────────────────────────────────

-- client_messages
drop policy if exists "v2_msg_coach_read"   on public.client_messages;
drop policy if exists "v2_msg_coach_update" on public.client_messages;
drop policy if exists "v2_msg_coach_delete" on public.client_messages;
drop policy if exists "msg_coach_read"   on public.client_messages;
drop policy if exists "msg_coach_update" on public.client_messages;
drop policy if exists "msg_coach_delete" on public.client_messages;

-- client_evolution_reports
drop policy if exists "v2_report_coach_insert" on public.client_evolution_reports;
drop policy if exists "v2_report_coach_update" on public.client_evolution_reports;
drop policy if exists "v2_report_coach_delete" on public.client_evolution_reports;
drop policy if exists "report_coach_insert" on public.client_evolution_reports;
drop policy if exists "report_coach_update" on public.client_evolution_reports;
drop policy if exists "report_coach_delete" on public.client_evolution_reports;

-- push_subscriptions
drop policy if exists "v2_push_user_select" on public.push_subscriptions;
drop policy if exists "v2_push_user_insert" on public.push_subscriptions;
drop policy if exists "v2_push_user_update" on public.push_subscriptions;
drop policy if exists "v2_push_user_delete" on public.push_subscriptions;
drop policy if exists "push_user_select" on public.push_subscriptions;
drop policy if exists "push_user_insert" on public.push_subscriptions;
drop policy if exists "push_user_update" on public.push_subscriptions;
drop policy if exists "push_user_delete" on public.push_subscriptions;

-- client_app_accounts
drop policy if exists "v2_client_app_coach_select" on public.client_app_accounts;
drop policy if exists "v2_client_app_coach_insert" on public.client_app_accounts;
drop policy if exists "v2_client_app_coach_update" on public.client_app_accounts;
drop policy if exists "v2_client_app_coach_delete" on public.client_app_accounts;
drop policy if exists "client_app_coach_select" on public.client_app_accounts;
drop policy if exists "client_app_coach_insert" on public.client_app_accounts;
drop policy if exists "client_app_coach_update" on public.client_app_accounts;
drop policy if exists "client_app_coach_delete" on public.client_app_accounts;

-- client_recaps
drop policy if exists "v2_recap_coach_update" on public.client_recaps;
drop policy if exists "recap_coach_update" on public.client_recaps;


-- ──────────────────────────────────────────────────────────────────────────────
-- 2. Recréer les policies permissives d'origine (état pré-chantier L2)
--    Source : supabase/schema.sql, export 2026-04-18
-- ──────────────────────────────────────────────────────────────────────────────

-- client_messages
create policy "msg_coach_read"
  on public.client_messages
  as permissive
  for select
  to public
  using (true);

create policy "msg_coach_update"
  on public.client_messages
  as permissive
  for update
  to public
  using (true);

create policy "msg_coach_delete"
  on public.client_messages
  as permissive
  for delete
  to public
  using (true);

-- client_evolution_reports
create policy "report_coach_insert"
  on public.client_evolution_reports
  as permissive
  for insert
  to public
  with check (true);

create policy "report_coach_update"
  on public.client_evolution_reports
  as permissive
  for update
  to public
  using (true);

create policy "report_coach_delete"
  on public.client_evolution_reports
  as permissive
  for delete
  to public
  using (true);

-- push_subscriptions
create policy "push_public_select"
  on public.push_subscriptions
  as permissive
  for select
  to public
  using (true);

create policy "push_public_insert"
  on public.push_subscriptions
  as permissive
  for insert
  to public
  with check (true);

create policy "push_public_update"
  on public.push_subscriptions
  as permissive
  for update
  to public
  using (true);

create policy "push_public_delete"
  on public.push_subscriptions
  as permissive
  for delete
  to public
  using (true);

-- client_app_accounts
create policy "client_app_coach_write"
  on public.client_app_accounts
  as permissive
  for all
  to public
  using (auth.uid() is not null);

-- client_recaps
create policy "recap_public_update"
  on public.client_recaps
  as permissive
  for update
  to public
  using (expires_at > now())
  with check (expires_at > now());


commit;


-- =============================================================================
-- FIN ROLLBACK — état permissif d'origine restauré.
--
-- ⚠️ AUDIT POST-MORTEM OBLIGATOIRE : identifier quelle policy v2_ a cassé
-- un flux, ajuster, puis re-préparer une phase 1 corrective.
-- =============================================================================
