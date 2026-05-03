-- =============================================================================
-- Extension HerbalifeRank — paliers intermédiaires (2026-05-03)
--
-- Thomas a déposé 11 pins dans /public/pins/ couvrant des paliers que
-- la 1ère version n'avait pas (Active Supervisor, Active World Team,
-- G.E.T. 2500, Millionaire 7500). On étend la CHECK constraint pour
-- accepter ces 4 nouvelles valeurs, sans toucher les rows existantes.
--
-- Tous restent à 50 % de marge retail (cf. RANK_MARGINS côté front).
-- La différence se fait sur les paliers Royalty Override.
--
-- Si jamais "Active World Team" finit par avoir besoin d'un fichier
-- séparé, dépose `public/pins/active-world-team.webp`. Pour l'instant
-- pas de fichier → fallback initiales.
-- =============================================================================

begin;

-- Drop ancien CHECK + recrée avec les 4 nouveaux paliers
alter table public.users
  drop constraint if exists users_current_rank_check;

alter table public.users
  add constraint users_current_rank_check
  check (current_rank in (
    -- Paliers existants
    'distributor_25',
    'senior_consultant_35',
    'success_builder_42',
    'supervisor_50',
    'world_team_50',
    'get_team_50',
    'millionaire_50',
    'presidents_50',
    -- Nouveaux paliers intermédiaires (2026-05-03)
    'active_supervisor_50',
    'active_world_team_50',
    'get_team_2500_50',
    'millionaire_7500_50'
  ));

commit;
