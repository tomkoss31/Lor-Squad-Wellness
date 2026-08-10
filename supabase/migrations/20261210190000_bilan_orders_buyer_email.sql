-- =============================================================================
-- bilan_orders.buyer_email — l'acheteur d'une carte du club
--
-- `bilan_orders` est née pour la page Résultat Bilan : l'acheteur y était
-- toujours un prospect DÉJÀ connu (`online_bilan_id` → son bilan porte son
-- email). Le site du club vend maintenant des cartes de visites à des gens qui
-- n'ont aucun bilan — `online_bilan_id` est nul et il n'existe alors AUCUN
-- moyen de recontacter la personne qui vient de payer 80 €.
--
-- Colonne nullable, sans valeur par défaut : les commandes issues d'un bilan
-- continuent de ne rien y écrire, leur email vit dans `online_bilans`. Aucune
-- ligne existante n'est touchée, aucun appelant existant n'est à modifier.
-- =============================================================================

alter table public.bilan_orders
  add column if not exists buyer_email text;

comment on column public.bilan_orders.buyer_email is
  'Email saisi par l''acheteur sur le site public du club (cartes de visites). '
  'Nul pour les commandes issues d''un bilan en ligne : leur email vit dans online_bilans.';
