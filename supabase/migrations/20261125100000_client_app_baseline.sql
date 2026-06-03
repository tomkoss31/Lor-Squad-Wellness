-- =============================================================================
-- Chantier poids / point de départ (2026-06-03) — Couche 2
--
-- Marque le moment où le client a renseigné (ou skippé via "je le ferai avec
-- mon coach") son point de départ à l'onboarding de l'app client. NULL = pas
-- encore demandé/traité → l'app affiche l'étape obligatoire "ton point de
-- départ" (poids OU mensurations). Évite de re-demander à l'infini.
-- =============================================================================

alter table public.client_app_accounts
  add column if not exists baseline_at timestamptz;

comment on column public.client_app_accounts.baseline_at is
  'Point de départ (poids ou mensurations) renseigné/skippé par le client à '
  'l''onboarding. NULL = à demander. Chantier poids couche 2, 2026-06-03.';
