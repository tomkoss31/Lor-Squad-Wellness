-- =============================================================================
-- Chantier Academy refonte premium (2026-04-27)
--
-- Ajoute la colonne users.coach_referent_user_id pour permettre a un
-- distributeur d indiquer quel coach interne (admin / referent) le suit.
--
-- Utilise par la section "welcome" de l Academy (champ select dans
-- ProfilTab.tsx).
-- =============================================================================

begin;

alter table public.users
  add column if not exists coach_referent_user_id uuid
    references public.users(id) on delete set null;

create index if not exists idx_users_coach_referent_user_id
  on public.users(coach_referent_user_id)
  where coach_referent_user_id is not null;

comment on column public.users.coach_referent_user_id is
  'ID du coach interne (admin/referent) qui suit ce user. Renseigne via Academy section welcome.';

commit;
