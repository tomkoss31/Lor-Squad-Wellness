-- =============================================================================
-- Phase 0.8 brainstorm Égypte (2026-05) — Enrichissement Liste 100
--
-- 1. Ajoute deux colonnes : platform (plateforme sociale) + profile_url
--    (username, URL profil, ou identifiant deep-link selon plateforme).
-- 2. Élargit la CHECK frank_category pour couvrir la méthode FRANK
--    complète : N = Neighbors (voisins) et K = Kids' friends parents
--    (amis_enfants) étaient manquants. Valeurs existantes conservées
--    pour compat (zéro migration de data).
-- =============================================================================

begin;

-- ─── 1. Colonnes platform + profile_url ────────────────────────────────────
alter table public.liste_100_contacts
  add column if not exists platform text,
  add column if not exists profile_url text;

comment on column public.liste_100_contacts.platform is
  'Plateforme sociale : instagram / whatsapp / facebook / linkedin / telegram / tiktok / twitter / snapchat / irl / autre. Texte libre pour extensibilité future.';

comment on column public.liste_100_contacts.profile_url is
  'Username, URL complète ou identifiant deep-link. Interprété par buildProfileUrl(platform, value) côté front.';

-- ─── 2. Élargir CHECK frank_category ──────────────────────────────────────
alter table public.liste_100_contacts
  drop constraint if exists liste_100_contacts_frank_category_check;

alter table public.liste_100_contacts
  add constraint liste_100_contacts_frank_category_check
  check (frank_category is null or frank_category in (
    'famille', 'reseau', 'amis', 'nouveaux', 'connaissances',
    'voisins', 'amis_enfants'
  ));

commit;
