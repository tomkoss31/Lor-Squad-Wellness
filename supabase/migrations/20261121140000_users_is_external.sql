-- =============================================================================
-- Distri externe sur users (2026-05-21)
--
-- Permet de référencer dans `users` des distri qui ne sont PAS dans
-- l'app (anciennes downlines historiques, distri inactifs jamais inscrits).
-- Utilité : construire l'arborescence Herbalife complète pour les calculs
-- de rentabilité, override, uplink HL, sans devoir créer un vrai compte
-- (pas d'email actif, pas de mot de passe utilisable).
--
-- Marqueur `is_external = true` + `active = false` + email synthétique
-- (xxxxx@external.labase360.local). Ces users sont créés via endpoint
-- admin-create-external-distributor.
-- =============================================================================

begin;

alter table public.users
  add column if not exists is_external boolean not null default false;

create index if not exists idx_users_is_external
  on public.users(is_external)
  where is_external = true;

comment on column public.users.is_external is
  'Chantier 2026-05-21 : true si le user représente un distri Herbalife hors-app (ancien sponsor, downline historique). Compte synthétique sans auth utilisable. Utilisé pour reconstruire l''arborescence HL et calculer override/uplink.';

commit;
