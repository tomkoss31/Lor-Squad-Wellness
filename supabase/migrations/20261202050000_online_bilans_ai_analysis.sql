-- Noaly bilan online (ONLINE-A, 2026-06-10) — analyse IA stockée sur le bilan.
-- Générée 1× à la soumission (edge submit-online-bilan), affichée au prospect
-- sur la page résultats + visible par le coach dans le CRM. Stockage = 1 seule
-- génération par bilan (maîtrise du coût). Nullable : sans clé API ou en cas
-- d'erreur, le bilan reste valide (fallback verdict déterministe).
-- Idempotent.

alter table public.online_bilans
  add column if not exists ai_analysis text null,
  add column if not exists ai_analysis_at timestamptz null;

comment on column public.online_bilans.ai_analysis is
  'Analyse personnalisée de Noaly (nutrition, sans marque) générée à la soumission.';
