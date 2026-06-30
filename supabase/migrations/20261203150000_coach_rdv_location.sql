-- =============================================================================
-- Lieu de RDV du coach — pour les emails de rappel RDV (2026-06-30).
-- ADDITIF PUR. Adresse/lieu où le coach reçoit (club, cabinet). Affichée dans
-- les emails de confirmation + rappel J-1. NULL = fallback sur users.city.
-- =============================================================================

alter table public.users
  add column if not exists rdv_location text;

comment on column public.users.rdv_location is
  'Lieu / adresse de RDV du coach (club, cabinet, ville). Affiché dans les emails de rappel RDV (confirmation + veille). NULL = fallback users.city.';
