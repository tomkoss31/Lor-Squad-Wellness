-- Announce Hub Equipe centralise (2026-05-04)
begin;

insert into public.app_announcements (id, title, body, emoji, accent, link_path, link_label, audience, published_at)
select
  gen_random_uuid(),
  'Hub Équipe : tout le pilotage en 1 endroit',
  'L''onglet Mon équipe a été refondu avec 5 onglets : Vue d''ensemble (KPIs + podium XP top 3), Engagement (table triable par statut actif/bloqué/décroché), Apprentissage (Academy + Formation par membre), Arbre lignée, Gamification. Click sur un membre = drill-down avec toutes ses métriques (XP breakdown, Academy %, Formation N1/N2/N3, activité 7-30j, dernière connexion).',
  '🏆',
  'gold',
  '/team',
  'Voir mon équipe',
  'admin',
  now()
where not exists (
  select 1 from public.app_announcements where title = 'Hub Équipe : tout le pilotage en 1 endroit'
);

commit;
