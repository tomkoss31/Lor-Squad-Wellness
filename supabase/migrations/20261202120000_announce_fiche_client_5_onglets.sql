-- =============================================================================
-- Annonce distri — Fiche client simplifiée : 7 → 5 onglets (chantier B1).
-- Règle du livrable complet : on annonce aux distri le regroupement des onglets
-- de la fiche client pour qu'ils retrouvent leurs repères.
--
-- ⚠️ Cette migration est INERTE tant que `supabase db push --linked` n'est pas
-- lancé manuellement. Elle ne s'applique pas automatiquement au merge.
-- À jouer au moment du déploiement prod de la simplification.
-- =============================================================================

insert into public.app_announcements
  (title, body, emoji, accent, link_path, link_label, audience, published_at)
values
  ('Fiche client plus claire : 5 onglets',
   'On a regroupé les onglets de la fiche client pour aller à l''essentiel. Le Body Scan et les Mensurations sont réunis dans un seul onglet « Mesures ». L''Historique des bilans (avec le choix du point de départ pour l''évolution) est désormais en bas de l''onglet « Vue ». Résultat : 5 onglets au lieu de 7 — Vue, Mesures, Produits, Actions, Club VIP. Tout est toujours là, juste mieux rangé.',
   '📂', 'teal', '/clients', 'Voir mes clients', 'all', now())
on conflict do nothing;
