-- =============================================================================
-- Annonce distri — page Résultat Bilan premium + caisse directe (2026-06-11).
-- Règle du livrable complet : pas de feature sans annonce.
--
-- NB : les features Noaly (bilan physique, analyse online) seront annoncées
-- séparément QUAND la clé API sera posée — annoncer une IA « en attente
-- d'activation » ferait des clics morts.
-- =============================================================================

insert into public.app_announcements
  (title, body, emoji, accent, link_path, link_label, audience, published_at)
values
  ('Page Résultat Bilan premium',
   'Chaque lead bilan online a maintenant SA page personnalisée : analyse, plan en 5 stratégies, tes programmes aux vrais prix, témoignages et FAQ. Dans le CRM, clique « 🔗 Lien Résultat » sur un lead et envoie-lui — c''est ton meilleur pitch, en un lien. Bonus : configure ton encaissement Square dans Paramètres > Profil pour que le prospect paie directement en ligne.',
   '💎', 'gold', '/crm', 'Voir mes leads', 'all', now())
on conflict do nothing;
