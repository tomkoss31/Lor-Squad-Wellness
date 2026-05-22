-- =============================================================================
-- Annonce Passive Light V2 (chantier Aurélie 2026-05-22)
-- =============================================================================

insert into public.app_announcements
  (title, body, emoji, accent, link_path, link_label, audience, published_at)
values
  (
    'Distri passif : accès Light pour Supervisor',
    'Tu peux maintenant inviter un Supervisor passif (qui ne fait pas le business mais touche ses royalties). Il aura un vrai compte avec email + password, sidebar simplifiée (Co-pilote + Académie + Messagerie). À convertir en actif d''un clic quand il décolle.',
    '🔗',
    'gold',
    '/parametres',
    'Inviter un passif',
    'admin',
    now()
  )
on conflict do nothing;
