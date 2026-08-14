-- =============================================================================
-- Notification « quelqu'un vient d'ouvrir le paiement » — 13/08/2026
--
-- LE TROU, mesuré le 12/08 :
--
--   bilan en ligne rempli ......... push + email  ✅
--   « rappelez-moi » .............. push          ✅
--   IL CLIQUE « JE DÉMARRE » ...... RIEN          🔴
--   le coach fabrique un lien ..... RIEN          🔴
--   il paie ....................... push + email  ✅
--   réservation du club ........... push + email  ✅
--
-- Entre le moment où quelqu'un sort sa carte et celui où il a payé, l'app est
-- MUETTE — alors qu'une simple réservation du club prévient tout le monde.
-- C'est pourtant le signal le plus chaud que l'application puisse produire.
--
-- Thomas : « je dois savoir qui fait quoi, notif et mails comme pour les résas
-- du club !!! c'est un trou à creuser ».
--
-- Cette migration ne fait qu'UNE chose : autoriser le nouveau type dans la
-- table de déduplication des push. Sans elle, l'insert de trace serait rejeté
-- par la contrainte CHECK et la notification partirait en boucle à chaque
-- rechargement de la page de résultat.
-- =============================================================================

-- ⚠️ TROUVÉ EN APPLIQUANT CETTE MIGRATION — la contrainte n'existait PLUS.
--
-- Le premier essai a été refusé : « check constraint is violated by some row ».
-- La table contient 242 lignes de types que la contrainte n'a jamais
-- autorisés :
--
--   coach_tip ................ 166   (autorisé)
--   flex_evening_late ........ 112   ❌ jamais dans la liste
--   flex_evening_reminder .... 112   ❌
--   flex_weekly_recap ......... 18   ❌
--   formation_admin_relay ...... 1   ❌
--
-- Autrement dit : la contrainte a été retirée à un moment et jamais remise,
-- et des fonctions ont écrit librement pendant des mois. On la RÉTABLIT en
-- incluant l'existant — on ne supprime pas 242 lignes d'historique pour faire
-- plaisir à une contrainte. Les types `flex_*` appartiennent à une
-- fonctionnalité supprimée le 12/08 ; ils restent listés parce que leurs
-- traces, elles, existent encore.

begin;

alter table public.push_notifications_sent
  drop constraint if exists push_notifications_sent_entity_type_check;

alter table public.push_notifications_sent
  add constraint push_notifications_sent_entity_type_check
  check (entity_type in (
    -- Les cinq d'origine.
    'followup',
    'prospect_meeting',
    'client_message',
    'morning_digest',
    'coach_tip',
    -- Écrits en prod sans jamais avoir été autorisés (historique conservé).
    'flex_evening_late',
    'flex_evening_reminder',
    'flex_weekly_recap',
    'formation_admin_relay',
    -- Nouveau : quelqu'un a ouvert un lien de paiement. La clé de dédup est
    -- l'id du BILAN EN LIGNE, pas celui de la commande — un prospect qui
    -- clique deux fois crée deux commandes distinctes (vu en base : Djamal en
    -- a deux à trois minutes d'écart), et le coach ne doit être prévenu
    -- qu'une seule fois.
    'payment_intent'
  ));

commit;
