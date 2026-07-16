-- =============================================================================
-- Chantier Qualif — choix de saveurs multiples (2026-07-16).
--
-- Un programme standard contient plusieurs produits à saveur (Formula 1, Thé,
-- Aloé). Le client choisit une saveur PAR produit → on stocke une map JSON
-- { "f1": "...", "the": "...", "aloe": "..." }, en plus de flavor_product_id
-- (conservé = choix Formula 1, rétro-compat).
-- =============================================================================

alter table public.client_qualif_onboarding
  add column if not exists flavor_choices jsonb not null default '{}'::jsonb;
