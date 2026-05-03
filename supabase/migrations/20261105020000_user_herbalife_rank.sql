-- =============================================================================
-- FLEX rank-aware (2026-11-05) — Phase G1
--
-- Ajoute le rang Herbalife du distri sur public.users + le panier moyen
-- estimé sur public.distributor_action_plan. Sert à calculer les cibles
-- KPI FLEX avec la VRAIE marge retail (25 / 35 / 42 / 50 %) au lieu d'un
-- défaut Supervisor.
--
-- Plan marketing Herbalife (validé Thomas) :
--   - distributor_25       : 25 % retail
--   - senior_consultant_35 : 35 %
--   - success_builder_42   : 42 %
--   - supervisor_50        : 50 % retail + 5 % RO downline
--   - world_team_50        : 50 % + 5 % RO + bonus build
--   - get_team_50          : 50 % + 5 % RO + 2 % bonus à 1000 RO infini
--   - millionaire_50       : 50 % + 5 % RO + 4 % bonus à 4000 RO infini
--   - presidents_50        : 50 % + 5 % RO + 6 % bonus à 10000 RO infini
--
-- Pour FLEX V1, seule la marge retail (25/35/42/50) entre dans le calcul.
-- Royalties / bonuses = future feature.
--
-- rank_set_at NULL = jamais rempli → trigger pop-up RankSelectorModal
-- forcé à la prochaine connexion. C'est le cas pour TOUS les users
-- existants après cette migration (default `distributor_25` pour ne pas
-- casser les contraintes, mais rank_set_at reste NULL).
-- =============================================================================

begin;

-- 1. Colonnes users
alter table public.users
  add column if not exists current_rank text not null default 'distributor_25',
  add column if not exists rank_set_at timestamptz;

-- CHECK constraint séparée (idempotent)
alter table public.users
  drop constraint if exists users_current_rank_check;

alter table public.users
  add constraint users_current_rank_check
  check (current_rank in (
    'distributor_25',
    'senior_consultant_35',
    'success_builder_42',
    'supervisor_50',
    'world_team_50',
    'get_team_50',
    'millionaire_50',
    'presidents_50'
  ));

comment on column public.users.current_rank is
  'Rang Herbalife auto-déclaré du distri. Détermine la marge retail (25/35/42/50%) dans FLEX. Modifiable par le distri lui-même + admin.';

comment on column public.users.rank_set_at is
  'Timestamp où le distri a renseigné/confirmé son rang. NULL = jamais rempli → pop-up forcé à la connexion.';

-- 2. Colonne distributor_action_plan : panier moyen retail
alter table public.distributor_action_plan
  add column if not exists average_basket integer not null default 150
  check (average_basket between 30 and 1000);

comment on column public.distributor_action_plan.average_basket is
  'Panier moyen retail (€) saisi par le distri à l''onboarding FLEX. Combiné avec users.current_rank pour calculer le net par client.';

commit;
