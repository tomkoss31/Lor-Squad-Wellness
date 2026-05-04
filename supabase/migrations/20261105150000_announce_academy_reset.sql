-- =============================================================================
-- Annonce : Academy refaite, on repart à 0 (2026-05-04)
--
-- Pourquoi : on a reset la progression Academy de tout le monde + ajouté
-- 4 nouvelles sections. Les distri reviennent et voient leur barre XP
-- Academy à 0 — il FAUT leur expliquer pourquoi (sinon : confusion).
-- =============================================================================

begin;

insert into public.app_announcements (id, title, body, emoji, accent, link_path, link_label, audience, published_at)
select
  gen_random_uuid(),
  'Academy refaite : on repart de 0 ensemble 🎓',
  'Tu vas voir ta progression Academy à 0 — c''est voulu. On a ajouté 4 nouvelles sections (Cahier de bord, Simulateur EBE, Liste 100 → Agenda, Vue d''ensemble) avec des tours guidés interactifs. Pour que tout le monde profite des nouveaux contenus, on a remis tout le monde à zéro. Bonne nouvelle : le plafond XP Academy passe de 400 à 600 XP (12 sections × 50). Lance-toi !',
  '🎓',
  'gold',
  '/academy',
  'Démarrer l''Academy',
  'all',
  now()
where not exists (
  select 1 from public.app_announcements where title = 'Academy refaite : on repart de 0 ensemble 🎓'
);

commit;
