-- =============================================================================
-- Annonces : refonte Academy + 2 modules Formation profonds (2026-05-04)
--
-- Publie 3 spotlights pour annoncer aux distri :
--   1. Section Academy "Tes nouveaux outils Lor'Squad" (8 QCM)
--   2. Module Formation M1.E "Méthode FRANK & ma Liste 100"
--   3. Module Formation M1.F "La trame EBE en 6 étapes"
--
-- Pattern : INSERT IF NOT EXISTS pour ne pas dupliquer si on relance la migration.
-- =============================================================================

begin;

insert into public.app_announcements (id, title, body, emoji, accent, link_path, link_label, audience, published_at)
select
  gen_random_uuid(),
  'Academy : nouvelle section "Tes nouveaux outils"',
  'Une nouvelle section Academy avec 8 QCM pour valider que tu maîtrises tous les outils Lor''Squad récents : Hub Développement, Cahier de bord (21j cobaye + Liste 100 + Journal EBE), Simulateur EBE, connexions automatiques. Seuil 75 % pour valider.',
  '🎓',
  'purple',
  '/academy/new-tools-2026',
  'Démarrer le quiz',
  'admin',
  now()
where not exists (
  select 1 from public.app_announcements where title = 'Academy : nouvelle section "Tes nouveaux outils"'
);

insert into public.app_announcements (id, title, body, emoji, accent, link_path, link_label, audience, published_at)
select
  gen_random_uuid(),
  'Formation : Méthode FRANK & ma Liste 100',
  'Nouveau module M1.E : 5 leçons + quiz pour construire ta Liste 100 sans rien oublier (Famille / Réseau / Amis / Nouveaux / Konnaissances), tagger chaque contact en chaud/tiède/froid, et faire vivre ta liste comme un funnel de prospection chaude.',
  '📒',
  'gold',
  '/formation/demarrer/methode-frank-liste-100',
  'Lire le module',
  'all',
  now() - interval '1 minute'
where not exists (
  select 1 from public.app_announcements where title = 'Formation : Méthode FRANK & ma Liste 100'
);

insert into public.app_announcements (id, title, body, emoji, accent, link_path, link_label, audience, published_at)
select
  gen_random_uuid(),
  'Formation : la trame EBE en 6 étapes',
  'Nouveau module M1.F : 7 leçons + quiz pour maîtriser la trame complète d''un EBE Lor''Squad. Accueil → Découverte → Body scan → Présentation → Closing → Recommandations. La même trame que dans le Simulateur EBE, ici expliquée pas à pas.',
  '🎯',
  'teal',
  '/formation/demarrer/trame-ebe-6-etapes',
  'Lire le module',
  'all',
  now() - interval '2 minutes'
where not exists (
  select 1 from public.app_announcements where title = 'Formation : la trame EBE en 6 étapes'
);

commit;
