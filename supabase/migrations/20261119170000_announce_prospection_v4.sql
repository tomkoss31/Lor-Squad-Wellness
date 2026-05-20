-- =============================================================================
-- Annonce : Kit prospection V4 complet (2026-05-19)
--
-- Bascule le module /prospection de la V3 (6 étapes linéaires, 3 profils)
-- vers la V4 (hub permanent à 10 modules, 4 profils avec split H/F sur
-- "Perte de poids", 6 marchés × 10 sections de contenu).
-- =============================================================================

begin;

insert into public.app_announcements
  (id, title, body, emoji, accent, link_path, link_label, audience, published_at)
select
  gen_random_uuid(),
  'Kit prospection complet 🌍',
  'Le module /prospection passe en V4 : tunnel onboarding la 1ère fois, puis hub permanent avec 10 modules cliquables (mindset, hashtags, M1, arbres M2/M3, objections, suivi appel, closing, cas spéciaux, storytelling, routine). 6 marchés × 4 profils (avec split Perte de poids Femmes/Hommes) × 10 sections de contenu. Tout est filtrable par marché + profil en haut du hub.',
  '🌍',
  'gold',
  '/prospection',
  'Ouvrir le hub',
  'all',
  now()
where not exists (
  select 1 from public.app_announcements where title = 'Kit prospection complet 🌍'
);

commit;
