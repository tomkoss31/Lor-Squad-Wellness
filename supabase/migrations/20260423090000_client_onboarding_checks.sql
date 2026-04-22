-- Chantier Polish Vue complète + refonte bilan (2026-04-24).
-- Ajoute un jsonb onboarding_checks sur clients pour suivre les 3 checks
-- initiaux côté coach : telegram installé, photo avant reçue, mensurations.
--
-- Idempotent : ok à rejouer.

alter table public.clients
  add column if not exists onboarding_checks jsonb not null
  default '{"telegram": false, "photo_before": false, "measurements": false}'::jsonb;

comment on column public.clients.onboarding_checks is
  'Checks onboarding côté coach : telegram, photo_before, measurements. JSONB libre pour extension future.';
