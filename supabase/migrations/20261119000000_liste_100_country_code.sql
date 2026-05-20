-- =============================================================================
-- Liste 100 — ajout colonne country_code (2026-05-19)
--
-- Permet à Thomas de tagger chaque contact par pays (ISO 3166 alpha-2)
-- pour visualiser sa répartition internationale + filtrer la liste.
-- Affichage : drapeau Twemoji + label côté front (cf. lib/countries.ts).
-- =============================================================================

begin;

alter table public.liste_100_contacts
  add column if not exists country_code text;

comment on column public.liste_100_contacts.country_code is
  'Code pays ISO 3166 alpha-2 (FR, BE, CH, CA, MA, US, ...). Nullable. Rendu en drapeau Twemoji côté front via lib/countries.ts.';

commit;
