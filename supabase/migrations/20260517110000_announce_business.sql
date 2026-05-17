-- Chantier #7 V2 (2026-05-17) — Annonce distri refonte page /business.
-- Insertion app_announcements + apparait dans la cloche + spotlight 1re ouverture.
begin;

insert into public.app_announcements (id, title, body, emoji, accent, link_path, link_label, audience, published_at)
select
  gen_random_uuid(),
  'Nouvelle page business 💼',
  'Page /business refondue : un seul scroll narratif (Hero → Pourquoi → Opportunite → Simulateur live → Temoignages → FAQ → Contact). Partage le lien /business?ref=<ton-id> a tes prospects, ils calculent leur plan en 60 sec et te laissent leur contact. Anciennes pages /opportunite et /simulateur redirigent automatiquement. Bonus : une popup "Pre-reserver mon echange" capture les leads froids avant qu''ils ne fassent du scroll.',
  '💼',
  'gold',
  '/business',
  'Voir la page',
  'all',
  now()
where not exists (
  select 1 from public.app_announcements where title = 'Nouvelle page business 💼'
);

commit;
