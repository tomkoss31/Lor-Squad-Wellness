-- =============================================================================
-- Annonce distri — « Mon business » centralise tes outils + Prospecter (B2/B4).
-- Règle du livrable complet : on annonce le regroupement nav pour que les distri
-- retrouvent la prospection au bon endroit (faire/piloter), distinct du hub
-- « Mon développement » (apprendre).
--
-- ⚠️ INERTE tant que `supabase db push --linked` n'est pas lancé manuellement.
-- À jouer au déploiement prod de la simplification.
-- =============================================================================

insert into public.app_announcements
  (title, body, emoji, accent, link_path, link_label, audience, published_at)
values
  ('« Mon business » : tout pour piloter ton activité',
   'Ton ancien menu « Outils » devient « Mon business 💼 » : un seul endroit pour piloter ton activité. Nouveauté : la carte « 🎯 Prospecter » t''y emmène directement vers ta machine à prospects (méthode, bilan online, liens marketing, international). « Mon développement » reste réservé à se former. Une règle simple : faire/piloter dans Mon business, apprendre dans Mon développement.',
   '💼', 'teal', '/outils', 'Ouvrir Mon business', 'all', now())
on conflict do nothing;
