-- =============================================================================
-- Chantier bilan updates (2026-04-20)
-- Ajoute un champ "general_note" sur la table clients pour stocker les
-- anecdotes personnelles du client (loisirs, préférences : "aime le
-- cheval", "va à la piscine", "adore les Mars", etc.)
--
-- Distinct de clients.notes qui est utilisé comme note libre par bilan.
-- Ici, on veut UN seul champ synthétique persistant sur la fiche client.
--
-- À EXÉCUTER DANS SUPABASE STUDIO → SQL EDITOR.
-- =============================================================================

alter table public.clients
  add column if not exists general_note text;

comment on column public.clients.general_note is
  'Chantier bilan updates (2026-04-20) : note libre "À savoir sur ce client" '
  '(loisirs, préférences, anecdotes). Affichée en haut de la fiche client. '
  'Distinct du champ notes (notes générales du dossier par bilan).';
