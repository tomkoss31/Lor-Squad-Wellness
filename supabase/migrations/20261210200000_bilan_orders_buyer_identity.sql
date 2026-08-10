-- =============================================================================
-- bilan_orders — l'identité complète de l'acheteur d'une carte du club
--
-- Le formulaire d'achat du site ne demandait que prénom + email. Insuffisant :
-- sans NOM ni TÉLÉPHONE, le coach ne peut ni retrouver ni créer la fiche
-- client — donc pas attribuer la carte dans BBC — et doit rappeler la personne
-- pour obtenir ce qu'on aurait pu demander au moment de l'achat.
--
-- `buyer_is_member` porte la réponse à « tu es déjà venu(e) au club ? ». C'est
-- le champ qui décide de la suite : membre connu → on attribue la carte tout
-- de suite ; inconnu → il lui faut d'abord un body scan. Le mail interne s'en
-- sert pour dire au coach laquelle des deux actions faire.
--
-- Trois colonnes nullables : les commandes issues d'un bilan en ligne
-- continuent de ne rien y écrire, et aucune ligne existante n'est touchée.
-- =============================================================================

alter table public.bilan_orders
  add column if not exists buyer_last_name text,
  add column if not exists buyer_phone text,
  add column if not exists buyer_is_member boolean;

comment on column public.bilan_orders.buyer_last_name is
  'Nom de famille saisi à l''achat d''une carte du club. Sans lui, deux « Marie » sont indiscernables.';
comment on column public.bilan_orders.buyer_phone is
  'Téléphone saisi à l''achat d''une carte du club — le canal réel pour rattraper quelqu''un qui a payé et n''est jamais venu.';
comment on column public.bilan_orders.buyer_is_member is
  'true = déjà venu au club (le coach attribue la carte) ; false = jamais venu (body scan d''abord) ; null = commande hors site club.';
