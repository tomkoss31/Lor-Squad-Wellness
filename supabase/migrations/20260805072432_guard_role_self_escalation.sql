-- =============================================================================
-- Audit sécurité 2026-08-05 — garde-fou anti self-escalation du RÔLE.
--
-- ⚠ DÉJÀ APPLIQUÉE en base via Supabase MCP (apply_migration), enregistrée au
--   registre sous la version 20260805072432. Ce fichier est le miroir repo pour
--   la traçabilité + un futur `db push` (idempotent : il sera SKIP car déjà au
--   registre). Ne pas renuméroter (sinon re-run sous une nouvelle version).
--
-- Faille : la policy `users_update_self` autorise chacun à modifier SA propre
-- ligne (ville, avatar, rang, monthly_pv_target…) SANS restreindre les colonnes.
-- Conséquence : n'importe quel compte coach ('distributor'/'referent') pouvait
--   update public.users set role='admin' where id = auth.uid()
-- directement depuis le navigateur (API PostgREST). Découvert en cartographiant
-- l'archi de promotion client→distributeur (le fix rend cette promotion sûre à
-- l'échelle : promouvoir des clients élargit la population qui pourrait exploiter
-- ce trou tant qu'il n'est pas colmaté).
--
-- Correctif : un trigger BEFORE UPDATE qui bloque un changement de `role`
-- UNIQUEMENT quand l'appelant est un end-user 'authenticated' non-admin. Tous les
-- chemins légitimes passent :
--   - service_role  (/api/admin-update-user, /api/admin-repair-user, edges)  → auth.role()='service_role'
--   - postgres      (migrations, MCP)                                        → auth.role() IS NULL
--   - admin via navigateur                                                   → is_admin() = true
-- Ne se déclenche que si `role` CHANGE (is distinct from) → zéro impact sur les
-- updates de profil habituels. Même patron éprouvé que guard_app_level_change()
-- (migration 20261206080000).
--
-- Vérifié à l'application (transaction annulée, 0 donnée touchée) :
--   T1 distri 'authenticated' → role='admin'   = BLOQUÉ (exception)
--   T2 admin  'authenticated' → change un rôle = autorisé
--   T3 service_role           → change un rôle = autorisé
-- =============================================================================
create or replace function public.guard_role_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role is distinct from old.role
     and auth.role() = 'authenticated'
     and not public.is_admin() then
    raise exception 'role : modification réservée aux admins (self-escalation bloquée)';
  end if;
  return new;
end;
$$;

comment on function public.guard_role_change() is
  'Garde-fou anti self-escalation : bloque tout changement de users.role initié par un end-user authenticated non-admin. service_role / postgres / admin passent. Audit sécurité 2026-08-05.';

drop trigger if exists users_guard_role on public.users;
create trigger users_guard_role
  before update on public.users
  for each row
  execute function public.guard_role_change();
