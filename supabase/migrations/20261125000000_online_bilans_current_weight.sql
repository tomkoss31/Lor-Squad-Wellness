-- =============================================================================
-- Chantier poids / point de départ (2026-06-03) — Couche 1
--
-- Poids actuel OPTIONNEL collecté dans le bilan online via une question douce
-- adaptée à l'objectif (rassurante pour la perte de poids, cadrage perf pour
-- le sport, absente pour énergie/sommeil/bien-être). Jamais bloquant : le
-- bilan online reste un aimant à leads.
--
-- Pré-remplit le champ "poids" du sandbox de conversion (LeadConvertModal,
-- chantier #3). NULL = non renseigné → le point de départ (poids OU
-- mensurations) sera demandé dans l'app client (couche 2).
-- =============================================================================

alter table public.online_bilans
  add column if not exists current_weight_kg numeric(5,1)
    check (
      current_weight_kg is null
      or (current_weight_kg >= 20 and current_weight_kg <= 400)
    );

comment on column public.online_bilans.current_weight_kg is
  'Poids actuel (kg) saisi optionnellement dans le bilan online selon '
  'l''objectif. NULL = non renseigné. Chantier poids 2026-06-03.';
