-- =============================================================================
-- Fix RLS users : policy UPDATE manquante (cas Mandy 2026-05-05)
--
-- Bug observé :
--   - Mandy choisit son rang dans RankSelectorModal → semble OK côté UI
--     mais au refresh, popup re-apparaît systématiquement
--   - Sa jauge de rentabilité ne calcule pas (ou prend la marge default
--     25% au lieu de son vrai rang)
--
-- Cause racine : la table public.users a RLS enabled mais AUCUNE policy
-- UPDATE n'a jamais été créée. Donc TOUS les UPDATE depuis le client
-- (ProfilTab.handleSaveProfile, RankSelectorModal.handleConfirm,
-- AvatarUploader, NotificationsTab, etc.) sont bloqués silencieusement
-- par PostgreSQL → 0 row affected, pas d'erreur explicite.
--
-- Pourquoi on ne l'avait pas vu avant : les operations critiques (login,
-- création de client, bilans) passent par le service_role côté edge
-- functions, qui bypass RLS. Le seul flow user-side qui UPDATE users
-- est exactement ce qu'on teste maintenant (rank, profil), d'où le bug
-- découvert seulement à l'usage avec Mandy.
--
-- Fix : 2 policies idempotentes
--   1. users_update_self      : un user peut update sa propre row
--   2. users_update_admin     : un admin peut update n'importe quelle row
--                                (utile pour /users côté admin)
-- =============================================================================

begin;

-- 1. Self-update : un user peut éditer ses propres infos
drop policy if exists "users_update_self" on public.users;
create policy "users_update_self"
  on public.users
  for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

comment on policy "users_update_self" on public.users is
  'Self-service : un user peut update son propre profil (rang, avatar, bio, ville, monthly_pv_target, etc). Fix bug Mandy 2026-05-05 où l''absence de cette policy bloquait silencieusement tous les UPDATE depuis ProfilTab/RankSelectorModal.';

-- 2. Admin override : un admin peut update n'importe quel user
drop policy if exists "users_update_admin" on public.users;
create policy "users_update_admin"
  on public.users
  for update
  to authenticated
  using (
    exists (
      select 1 from public.users u
      where u.id = auth.uid() and u.role = 'admin'
    )
  )
  with check (
    exists (
      select 1 from public.users u
      where u.id = auth.uid() and u.role = 'admin'
    )
  );

comment on policy "users_update_admin" on public.users is
  'Admin override : un admin peut update n''importe quel user (utilisé par /users coté admin pour activer/désactiver, changer rôle, reset rang, etc).';

commit;
