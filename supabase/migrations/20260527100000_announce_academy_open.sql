-- =============================================================================
-- Annonce Academy ouverte à tous (chantier onboarding 2026-05-27)
-- =============================================================================
-- Academy n'est plus admin-only. Carte "Commence ici" en gold dans
-- /developpement + bandeau progression en hero. Boîte à outils débloquée
-- à 50% Academy, Simulateur EBE + Prospection internationale + Comment
-- marche la prospection débloquées à 100% Academy. Cartes Témoignages
-- clients et Fiche distri enrichie retirées (déjà accessibles via fiche
-- client / Mon équipe).
-- =============================================================================

insert into public.app_announcements
  (title, body, emoji, accent, link_path, link_label, audience, published_at)
values
  (
    'Academy ouverte à tous',
    'L''Academy est maintenant accessible à tous les distri (et plus admin only). C''est la porte d''entrée pour comprendre l''app. Termine-la pour débloquer la Boîte à outils (à 50%), le Simulateur EBE et la Prospection internationale (à 100%). Commence par la carte gold "Commence ici" dans Mon développement, ou le bandeau de progression en haut de la page.',
    '🎓',
    'gold',
    '/academy',
    'Démarrer l''Academy',
    'all',
    now()
  )
on conflict do nothing;
