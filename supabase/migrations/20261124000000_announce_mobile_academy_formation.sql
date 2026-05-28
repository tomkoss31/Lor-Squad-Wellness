-- Annonce distri : refonte mobile Academy + Formation (2026-05-28)
--
-- Étapes 1+2+3 livrées : 25 bugs responsive fixés sur iPhone (SE / Pro / Pro
-- Max) et iPad (portrait / landscape). Lisible sans scroll horizontal +
-- typo qui clamp + paddings qui s'adaptent. Confettis + animations
-- respectent prefers-reduced-motion.
--
-- Surface fixée :
--   - Academy (Overview + Certificat + Modal celebration)
--   - Formation hub + Roadmap card
--   - Page niveau (FormationModulePage) + bandeau progression + pills
--   - Page module détail (header hero + leçons + quiz)
--   - Composants : LessonCard, QuizRunner, ModuleHeaderHero,
--     ParcoursLevelCard, FormationRoadmapCard, ToolkitItemPopup,
--     MarkdownRenderer (code inline word-break)
--
-- Doc audit complète : docs/audits/AUDIT_MOBILE_ACADEMY_FORMATION.md

insert into public.app_announcements
  (title, body, emoji, accent, link_path, link_label, audience, published_at)
values
  (
    'Academy + Formation s''adaptent à ton iPhone',
    'Plus de scroll horizontal, plus de texte coupé. Toute l''Academy et la Formation Herbalife ont été refaites pour s''afficher proprement sur iPhone (SE, Pro, Pro Max) et iPad. Si tu vois encore un bug d''affichage, dis-le moi.',
    '📱',
    'teal',
    '/formation',
    'Ouvrir la Formation',
    'all',
    now()
  )
on conflict do nothing;
