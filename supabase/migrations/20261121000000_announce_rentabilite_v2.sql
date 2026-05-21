-- =============================================================================
-- Annonce : Refonte Rentabilité Premium V2 (chantier 2026-05-20)
--
-- Refonte majeure du module rentabilité :
--   - Widget Co-pilote V5 horizontal premium (jauge + projection + chips)
--   - Page /rentabilite éditoriale 3 sections (Calcul / Équipe / Top clients)
--   - Carte wallet "Apple style" en rappel visuel
--   - Modale "Analyse détaillée" : vue 12 mois (BarChart + annotations
--     auto-computed) + filtres pivot + plan d'action 3 nudges contextuels
--   - Section 01 toggle "Vue classique / Vue flux" (diagramme Sankey)
--   - Nouvelle RPC `get_user_rentability_history` pour l'historique
--
-- =============================================================================

begin;

insert into public.app_announcements
  (id, title, body, emoji, accent, link_path, link_label, audience, published_at)
select
  gen_random_uuid(),
  'Ta rentabilité, version premium ✨',
  'On a refait à zéro le module rentabilité : nouveau widget Co-pilote (montant + jauge avec projection), page /rentabilité éditoriale (Le calcul · Mon équipe · Top clients), modale analyse 12 mois avec graphique + plan d''action contextuel. Toggle Vue classique / Vue flux pour visualiser d''où viennent tes euros. Tape sur l''app sur ton iPhone pour forcer la mise à jour.',
  '✨',
  'teal',
  '/rentabilite',
  'Voir ma rentabilité',
  'all',
  now()
where not exists (
  select 1 from public.app_announcements where title = 'Ta rentabilité, version premium ✨'
);

commit;
