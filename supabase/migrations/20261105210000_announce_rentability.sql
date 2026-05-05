-- Annonce : Phase A Rentabilite (2026-05-05)
begin;

insert into public.app_announcements (id, title, body, emoji, accent, link_path, link_label, audience, published_at)
select
  gen_random_uuid(),
  'Ta rentabilité en € ce mois 💎',
  'Nouveau widget en haut du Co-pilote : tu vois en un coup d''œil combien tu as gagné en € ce mois (CA brut × ta marge selon ton rang Herbalife). Jauge animée rouge/orange/vert + projection fin de mois + comparaison vs mois précédent. Click pour voir le détail complet par programme.',
  '💎',
  'gold',
  '/rentabilite',
  'Voir ma rentabilité',
  'all',
  now()
where not exists (
  select 1 from public.app_announcements where title = 'Ta rentabilité en € ce mois 💎'
);

commit;
