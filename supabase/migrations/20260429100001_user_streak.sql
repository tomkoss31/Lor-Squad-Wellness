-- =============================================================================
-- Gamification 1 - Streak de connexion (2026-04-29)
--
-- Compteur de jours consecutifs ou le user ouvre l app. Reset si le user
-- saute un jour complet (>= 36h sans connexion).
--
-- Mis a jour cote client via useStreak hook au mount d AppLayout.
-- 2 colonnes additionnelles sur public.users :
--   - streak_count int : nombre de jours consecutifs courants
--   - streak_last_active date : derniere date de connexion (UTC)
-- =============================================================================

begin;

alter table public.users
  add column if not exists streak_count integer not null default 0;

alter table public.users
  add column if not exists streak_last_active date;

create index if not exists idx_users_streak_last_active
  on public.users(streak_last_active)
  where streak_last_active is not null;

comment on column public.users.streak_count is
  'Compteur jours consecutifs de connexion. Reset si > 1 jour entre 2 connexions. Update cote client.';
comment on column public.users.streak_last_active is
  'Date (UTC) de la derniere connexion comptee dans le streak. Permet de detecter les sauts de jour.';

commit;
