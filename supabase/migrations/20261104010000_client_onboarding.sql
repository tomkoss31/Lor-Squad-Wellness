-- =============================================================================
-- Onboarding client PWA (chantier C — 2026-11-04)
--
-- Ajoute client_app_accounts.onboarded_at pour persister la complétion
-- du tour d'accueil (4 slides). NULL = jamais fait → on lance le tour
-- au mount de ClientAppPage. Set à now() au "Terminer" / "Skip".
-- =============================================================================

begin;

alter table public.client_app_accounts
  add column if not exists onboarded_at timestamptz;

comment on column public.client_app_accounts.onboarded_at is
  'Timestamp de completion du tour d accueil PWA (4 slides). NULL = jamais lance ou skipped.';

commit;
