-- =============================================================================
-- Fix CHECK constraint users.current_rank — 12 rangs complets (2026-05-05)
--
-- Bug observé : Mandy choisit son rang dans RankSelectorModal, l'UPDATE
-- échoue avec une violation de CHECK constraint (rang 'active_supervisor_50'
-- ou 'get_team_2500_50' etc. pas dans la liste autorisée), rank_set_at
-- reste NULL → pop-up "Confirme ton rang" reapparaît à chaque refresh.
--
-- Cause : la migration originale 20261105020000 n'avait listé que 8 rangs
-- alors que le type TypeScript HerbalifeRank en a 12 (avec les variantes
-- "active_*" et les paliers "_2500_" / "_7500_").
--
-- Fix : drop + recreate la CHECK avec les 12 valeurs officielles.
-- Aucune perte de données (les rows existantes utilisent toutes
-- 'distributor_25' default).
-- =============================================================================

begin;

alter table public.users
  drop constraint if exists users_current_rank_check;

alter table public.users
  add constraint users_current_rank_check
  check (current_rank in (
    'distributor_25',
    'senior_consultant_35',
    'success_builder_42',
    'supervisor_50',
    'active_supervisor_50',
    'world_team_50',
    'active_world_team_50',
    'get_team_50',
    'get_team_2500_50',
    'millionaire_50',
    'millionaire_7500_50',
    'presidents_50'
  ));

comment on constraint users_current_rank_check on public.users is
  'CHECK constraint sur les 12 rangs Herbalife officiels (incluant variantes active_* et paliers 2500/7500). Fix bug Mandy 2026-05-05 où rangs intermédiaires causaient UPDATE silencieux.';

commit;
