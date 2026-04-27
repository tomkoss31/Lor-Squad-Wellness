-- =============================================================================
-- Chantier Lor'Squad Academy — Foundation (2026-04-26)
--
--   1. Colonne public.users.herbalife_id (texte, unique partiel non-NULL).
--      Renseignée via l'Academy section 1 ("Profil distri"). NULL pour les
--      admins / coachs internes qui n'ont pas d'identifiant Herbalife.
--
--   2. Table public.user_tour_progress — générique, réutilisable au-delà de
--      l'Academy (futurs tours coach). Distinct du tuto client app qui
--      stocke sa progression côté client_app_accounts. PK composite
--      (user_id, tour_key) → 1 user peut suivre plusieurs tours en
--      parallèle (academy, futurs).
--
--   3. Table public.user_tour_reminder_dismissals — anti-spam du popup
--      de rappel (1 ligne = "ce user a fermé le popup ce jour-là").
--
--   4. RLS aligné sur le pattern training_progress (chantier 2026-04-23) :
--      `to authenticated` + `auth.uid() = user_id` pour le scope self,
--      helper `public.is_admin()` pour la lecture admin (déjà présent dans
--      le schéma — voir 20260419151210_add_can_access_owner_helper.sql).
--
-- À EXÉCUTER DANS SUPABASE STUDIO → SQL EDITOR (ou via supabase db push).
-- =============================================================================

begin;

-- ─── 1. Colonne herbalife_id sur public.users ────────────────────────────────
alter table public.users
  add column if not exists herbalife_id text;

-- Unique partiel : on autorise plusieurs users sans herbalife_id (admins),
-- mais s'il est renseigné il doit être unique au sein de la table.
create unique index if not exists users_herbalife_id_unique
  on public.users(herbalife_id)
  where herbalife_id is not null;

comment on column public.users.herbalife_id is
  'Identifiant Herbalife du distributeur. Renseigné via l''Academy section 1. NULL pour admins / coachs internes.';

-- ─── 2. Table user_tour_progress ─────────────────────────────────────────────
create table if not exists public.user_tour_progress (
  user_id      uuid not null references public.users(id) on delete cascade,
  tour_key     text not null,
  last_step    integer not null default 0,
  completed_at timestamptz,
  skipped_at   timestamptz,
  started_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  primary key (user_id, tour_key)
);

create index if not exists idx_user_tour_progress_tour_key
  on public.user_tour_progress(tour_key);

-- Trigger updated_at automatique
create or replace function public.touch_user_tour_progress_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists user_tour_progress_set_updated_at on public.user_tour_progress;
create trigger user_tour_progress_set_updated_at
  before update on public.user_tour_progress
  for each row
  execute function public.touch_user_tour_progress_updated_at();

comment on table public.user_tour_progress is
  'Progression des tours interactifs côté coach (Academy, etc.). Distinct du tuto client app qui a sa propre table client_app_accounts.';
comment on column public.user_tour_progress.tour_key is
  'Identifiant du tour. Ex: ''academy''. Permet plusieurs tours par user.';

-- ─── 3. Table user_tour_reminder_dismissals ──────────────────────────────────
create table if not exists public.user_tour_reminder_dismissals (
  user_id      uuid not null references public.users(id) on delete cascade,
  tour_key     text not null,
  dismissed_on date not null default current_date,
  primary key (user_id, tour_key, dismissed_on)
);

comment on table public.user_tour_reminder_dismissals is
  'Anti-spam du popup de rappel. 1 ligne = "le user a fermé le popup ce jour-là". S''il y a déjà une ligne pour aujourd''hui, on ne ré-affiche pas.';

-- ─── 4. RLS ──────────────────────────────────────────────────────────────────
alter table public.user_tour_progress enable row level security;
alter table public.user_tour_reminder_dismissals enable row level security;

-- ─ user_tour_progress : self CRUD + admin read-all ───────────────────────────
drop policy if exists "user_tour_progress_self_select" on public.user_tour_progress;
create policy "user_tour_progress_self_select"
  on public.user_tour_progress for select
  to authenticated
  using (auth.uid() = user_id or public.is_admin());

drop policy if exists "user_tour_progress_self_insert" on public.user_tour_progress;
create policy "user_tour_progress_self_insert"
  on public.user_tour_progress for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "user_tour_progress_self_update" on public.user_tour_progress;
create policy "user_tour_progress_self_update"
  on public.user_tour_progress for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "user_tour_progress_self_delete" on public.user_tour_progress;
create policy "user_tour_progress_self_delete"
  on public.user_tour_progress for delete
  to authenticated
  using (auth.uid() = user_id);

-- ─ user_tour_reminder_dismissals : self uniquement (admin pas concerné) ──────
drop policy if exists "user_tour_reminder_dismissals_self_select" on public.user_tour_reminder_dismissals;
create policy "user_tour_reminder_dismissals_self_select"
  on public.user_tour_reminder_dismissals for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "user_tour_reminder_dismissals_self_insert" on public.user_tour_reminder_dismissals;
create policy "user_tour_reminder_dismissals_self_insert"
  on public.user_tour_reminder_dismissals for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "user_tour_reminder_dismissals_self_delete" on public.user_tour_reminder_dismissals;
create policy "user_tour_reminder_dismissals_self_delete"
  on public.user_tour_reminder_dismissals for delete
  to authenticated
  using (auth.uid() = user_id);

commit;
