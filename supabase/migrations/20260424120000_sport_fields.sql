-- Chantier Prise de masse (2026-04-24) : élargir objective CHECK + champs sport.
ALTER TABLE public.clients DROP CONSTRAINT IF EXISTS clients_objective_check;
ALTER TABLE public.clients ADD CONSTRAINT clients_objective_check
  CHECK (objective IN ('weight-loss','sport','mass-gain','strength','cutting','endurance','fitness','competition'));
ALTER TABLE public.assessments DROP CONSTRAINT IF EXISTS assessments_objective_check;
ALTER TABLE public.assessments ADD CONSTRAINT assessments_objective_check
  CHECK (objective IN ('weight-loss','sport','mass-gain','strength','cutting','endurance','fitness','competition'));
ALTER TABLE public.assessments
  ADD COLUMN IF NOT EXISTS sport_frequency text
    CHECK (sport_frequency IS NULL OR sport_frequency IN ('none','occasional','regular','intensive')),
  ADD COLUMN IF NOT EXISTS sport_types jsonb,
  ADD COLUMN IF NOT EXISTS sport_sub_objective text
    CHECK (sport_sub_objective IS NULL OR sport_sub_objective IN ('mass-gain','strength','cutting','endurance','fitness','competition')),
  ADD COLUMN IF NOT EXISTS current_intake jsonb;
SELECT pg_notify('pgrst','reload schema');
