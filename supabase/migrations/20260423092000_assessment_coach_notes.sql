-- Chantier Polish Vue complète + refonte bilan (2026-04-24).
-- Ajoute 2 colonnes texte sur assessments pour les notes coach prises
-- pendant le bilan. `coach_notes_draft` est auto-sauvegardé toutes les
-- 3 sec, `coach_notes_initial` est figé à la validation du bilan et
-- affiché en lecture seule dans la fiche client.
--
-- Idempotent : ok à rejouer.

alter table public.assessments
  add column if not exists coach_notes_draft text,
  add column if not exists coach_notes_initial text;

comment on column public.assessments.coach_notes_draft is
  'Notes coach en cours de rédaction pendant le bilan (auto-save 3s).';
comment on column public.assessments.coach_notes_initial is
  'Notes coach figées à la validation du bilan — affichées en lecture seule sur la fiche client.';
