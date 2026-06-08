-- Blindage message_type (incident 2026-06-08)
-- L'edge function client-app-set-baseline insérait message_type='message',
-- valeur hors de l'union front ('product_request'|'recommendation'|
-- 'rdv_request'|'coach_reply'|'general'). MessagesPage ne rend que ces types
-- → le message devenait invisible côté coach (badge "+1" mais introuvable).
--
-- La colonne message_type est un text libre sans contrainte : rien n'empêchait
-- l'écriture d'une valeur invalide. On pose un CHECK pour échouer à l'écriture
-- plutôt que de perdre silencieusement le message.
--
-- Pré-requis : les 3 lignes 'message' existantes ont déjà été backfillées en
-- 'general' (2026-06-08). Valeurs prod au moment du déploiement : coach_reply,
-- general, product_request, rdv_request → toutes conformes.

alter table public.client_messages
  drop constraint if exists client_messages_message_type_check;

alter table public.client_messages
  add constraint client_messages_message_type_check
  check (message_type in (
    'product_request',
    'recommendation',
    'rdv_request',
    'coach_reply',
    'general'
  ));
