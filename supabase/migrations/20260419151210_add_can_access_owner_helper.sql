-- =============================================================================
-- Helper RLS : public.can_access_owner(uuid)
--
-- Diagnostic prod (2026-04-19) :
--   - current_role()     ✅ existe
--   - is_active_user()   ✅ existe
--   - is_admin()         ✅ existe
--   - can_access_owner() ❌ MANQUANTE → shadow_rls_level2.sql échoue sur
--                                      "function public.can_access_owner(uuid)
--                                       does not exist"
--
-- Ce fichier ne fait QUE créer can_access_owner(uuid). Les 3 autres helpers
-- sont laissés tels quels (pas de DROP ni de CREATE OR REPLACE redondant).
--
-- Source : schema.sql lignes 255-276 (reproduit à l'identique).
--
-- À EXÉCUTER AVANT shadow_rls_level2.sql.
-- =============================================================================

create or replace function public.can_access_owner(target_owner_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    public.is_admin()
    or auth.uid() = target_owner_id
    or (
      public.current_role() = 'referent'
      and exists (
        select 1
        from public.users
        where id = target_owner_id
          and sponsor_id = auth.uid()
      )
    ),
    false
  )
$$;

-- La fonction est SECURITY DEFINER : elle est exécutée avec les droits de
-- son owner (postgres), ce qui lui permet de lire public.users pour la
-- résolution hiérarchique référent → filleul.
-- On révoque le droit par défaut à PUBLIC et on grant explicitement à
-- `authenticated` uniquement. L'anon ne doit JAMAIS pouvoir l'appeler.
revoke all on function public.can_access_owner(uuid) from public;
grant execute on function public.can_access_owner(uuid) to authenticated;

comment on function public.can_access_owner(uuid) is
  'Chantier RLS L2 : helper utilisé par les policies v2_ des tables client_messages, client_evolution_reports, client_app_accounts, client_recaps. Retourne true si l''utilisateur connecté est admin, propriétaire direct, ou référent dont le target est un filleul.';

-- =============================================================================
-- FIN — can_access_owner(uuid) créée et autorisée pour authenticated.
-- =============================================================================
