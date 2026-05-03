-- =============================================================================
-- Formation beta access (2026-11-05)
--
-- Ajoute un flag opt-in pour ouvrir la formation aux distri / référents
-- ciblés par l'admin (avant l'ouverture générale). Permet à Mel et Thomas
-- de tester avec une équipe pilote (ex. Mandy + Victoire) qui donne leur
-- retour, pendant que les autres distri restent sur la page chantier.
--
-- Default false. L'admin l'active via /users (toggle inline) ou SQL.
-- =============================================================================

begin;

alter table public.users
  add column if not exists formation_beta_access boolean not null default false;

comment on column public.users.formation_beta_access is
  'Ouvre l''accès à la formation (parcours + boîte à outils) à ce user spécifique, même s''il n''est pas admin. Default false. Géré par l''admin via /users.';

create index if not exists idx_users_formation_beta_access
  on public.users(formation_beta_access)
  where formation_beta_access = true;

commit;
