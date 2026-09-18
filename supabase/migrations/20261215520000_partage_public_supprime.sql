-- Lot 3 (18/09/2026) — le partage public d'une fiche anonymisée (/partage/:token) est
-- SUPPRIMÉ de partout, décision Thomas : le bouton avait été retiré en juin, il restait la
-- page, deux edge functions (create-public-share-token, resolve-public-share), deux tables
-- (3 jetons d'avril, 6 vues) et trois colonnes de consentement sur clients (1 consentement).
-- Aucune fonction ni vue en base ne les référençait (vérifié le 18/09).

drop table if exists public.client_public_share_views;
drop table if exists public.client_public_share_tokens;
alter table public.clients
  drop column if exists public_share_consent,
  drop column if exists public_share_consent_at,
  drop column if exists public_share_revoked_at;
