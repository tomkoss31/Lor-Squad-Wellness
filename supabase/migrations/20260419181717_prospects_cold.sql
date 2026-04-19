-- =============================================================================
-- Chantier Prospects Cold (2026-04-19)
-- Ajout statut "cold" + date de réchauffement + note contextuelle.
--
-- Flow métier :
--   - Un prospect peut être mis en "froid" à tout moment (scheduled, done, lost)
--   - cold_until = date à partir de laquelle le relancer
--   - cold_reason = note libre sur le contexte (budget, momentum, etc.)
--   - Le dashboard affiche un widget "À réchauffer" si cold_until <= now()
--
-- À EXÉCUTER DANS SUPABASE STUDIO → SQL EDITOR.
-- =============================================================================

-- 1. Étendre le CHECK constraint status pour inclure 'cold'
alter table public.prospects
  drop constraint if exists prospects_status_check;
alter table public.prospects
  add constraint prospects_status_check
  check (status in ('scheduled', 'done', 'converted', 'lost', 'no_show', 'cancelled', 'cold'));

-- 2. cold_until : date à partir de laquelle relancer
alter table public.prospects
  add column if not exists cold_until timestamptz;

-- 3. cold_reason : note contextuelle
alter table public.prospects
  add column if not exists cold_reason text;

-- 4. Index partiel : n'indexe que les prospects en statut cold (minoritaires)
--    pour accélérer le widget "à réchauffer" côté dashboard.
create index if not exists idx_prospects_cold_until
  on public.prospects(cold_until)
  where status = 'cold';

comment on column public.prospects.cold_until is
  'Chantier Cold (2026-04-19) : date à partir de laquelle relancer le prospect. Le widget dashboard filtre cold_until <= now().';

comment on column public.prospects.cold_reason is
  'Chantier Cold (2026-04-19) : note libre sur le contexte au moment de passer en froid (budget, timing, etc.).';
