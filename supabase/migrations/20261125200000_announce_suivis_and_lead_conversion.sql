-- =============================================================================
-- Annonces distri (règle du livrable complet) — 2026-06-03
-- 2 annonces : page Suivis du jour + conversion des bilans online en fiches.
-- Idempotent via WHERE NOT EXISTS sur le titre (re-run sans doublon).
-- =============================================================================

insert into public.app_announcements
  (title, body, emoji, accent, link_path, link_label, audience, published_at)
select
  'Ta page « Suivis du jour »',
  'Tous tes suivis du protocole (J+1/3/7/10) au même endroit, sans les RDV : envoie le bon message en 2 clics et coche au fur et à mesure. La notif du matin t''y emmène direct.',
  '📱', 'gold', '/suivis-du-jour', 'Voir mes suivis', 'all', now()
where not exists (
  select 1 from public.app_announcements where title = 'Ta page « Suivis du jour »'
);

insert into public.app_announcements
  (title, body, emoji, accent, link_path, link_label, audience, published_at)
select
  'Transforme tes bilans online en fiches',
  'Depuis tes Leads, valide un bilan online pour créer la fiche client en 15 secondes (nom + sexe, le reste est pré-rempli), ou programme un RDV qui atterrit direct dans ton agenda.',
  '✅', 'gold', '/clients', 'Voir mes leads', 'all', now()
where not exists (
  select 1 from public.app_announcements where title = 'Transforme tes bilans online en fiches'
);
