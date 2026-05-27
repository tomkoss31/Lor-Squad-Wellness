-- =============================================================================
-- Chantier "bilan online V2" — capture contact dès étape 1
-- 2026-05-27
--
-- Ajoute phone + email comme colonnes first-class sur online_bilans pour :
-- - Affichage direct dans le kanban + LeadDetailModal
-- - Boutons tel: / mailto: rapides côté coach
-- - Export CSV propre (sans déballer le payload jsonb)
-- - Recherche/filtrage si besoin futur
--
-- Les deux champs restent nullables :
-- - Les leads legacy n'en ont pas
-- - Le front V2 exige "au moins un des deux" mais la DB reste tolérante
-- =============================================================================

alter table public.online_bilans
  add column if not exists phone text,
  add column if not exists email text;

-- Index léger sur email (texte court, lookup ad-hoc possible)
-- Pas d'index sur phone (formats hétérogènes, peu utile)
create index if not exists idx_online_bilans_email
  on public.online_bilans(email)
  where email is not null;

comment on column public.online_bilans.phone is
  'Téléphone du lead (saisi à l''étape 1 du formulaire V2). Nullable, format libre.';
comment on column public.online_bilans.email is
  'Email du lead (saisi à l''étape 1 du formulaire V2). Nullable, validé front-side.';
