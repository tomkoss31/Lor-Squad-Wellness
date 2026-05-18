-- =============================================================================
-- Fix annonce business : redirige cloche vers /developpement (2026-05-18)
-- =============================================================================
-- L'annonce "Nouvelle page business 💼" pointait directement vers /business,
-- mais Thomas veut que les distri atterrissent d'abord dans le hub
-- "Mon développement" pour découvrir le contexte (Simulateur EBE, Outils
-- prospection, etc.) avant de partager le lien aux prospects.
-- =============================================================================

update public.app_announcements
   set link_path = '/developpement'
 where title = 'Nouvelle page business 💼';
