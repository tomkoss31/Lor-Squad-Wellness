-- =============================================================================
-- Audit sécurité du 2026-08-11 — `client_messages`
--
-- LE CONSTAT
--
-- `msg_public_insert` était la SEULE policy INSERT de la table, en `to public`
-- avec `with check (true)`. Et `anon` détient le GRANT INSERT. Donc n'importe
-- qui sur Internet pouvait écrire dans la messagerie, avec n'importe quel
-- `client_id` ET n'importe quel `sender` — y compris `sender = 'coach'`,
-- c'est-à-dire fabriquer un faux message DU coach VERS un client.
--
-- Ce n'est pas une fuite de données : c'est une usurpation. Un inconnu pouvait
-- écrire à un client en se faisant passer pour Mélanie.
--
-- POURQUOI ON NE SUPPRIME PAS LA POLICY
--
-- Elle est AUSSI le support fonctionnel de deux pages publiques sans session :
--   src/pages/RecapPage.tsx:78            (/recap/:token)
--   src/pages/EvolutionReportPage.tsx:88  (/evolution/:token)
--
-- La retirer les casserait toutes les deux — exactement le piège du 29/07, où
-- le retrait d'une policy `*_public_read` a laissé l'espace client mort 24 h.
-- Protocole appliqué : grep des DEUX styles de guillemets, puis ouverture de
-- chacun des 7 appels d'insertion trouvés.
--
-- CE QU'ON FAIT
--
--   1. Une policy INSERT dédiée aux coachs authentifiés actifs. Elle reproduit
--      EXACTEMENT ce qu'ils peuvent faire aujourd'hui (`is_active_user()`) —
--      zéro changement de comportement pour eux.
--   2. La policy publique est resserrée à `sender = 'client'`. Les deux pages
--      publiques ne fournissent pas ce champ (son DEFAULT vaut 'client'),
--      donc elles continuent de fonctionner à l'identique.
--
-- POURQUOI PAS PLUS STRICT
--
-- On a envisagé d'exiger que `client_id` corresponde à un vrai client.
-- MESURÉ EN BASE : 10 messages sur 117 ont un `client_id` orphelin, dont
-- 8 écrits par un coach — /recap y met le JETON, pas un id client, et les
-- réponses du coach héritent de ce `client_id`. La contrainte aurait bloqué
-- 8 cas réels.
--
-- VÉRIFIÉ, quatre scénarios en transaction annulée :
--   anon → sender='coach' .................. BLOQUÉ
--   page /recap (sender par défaut) ........ PASSE
--   coach → sender='coach' ................. PASSE
--   coach répond dans un fil orphelin ...... PASSE
--
-- CE QUI RESTE OUVERT, ET ASSUMÉ
--
-- Un anonyme peut toujours insérer un message `sender='client'` avec un
-- `client_id` arbitraire : c'est du spam dans la messagerie, pas une
-- usurpation. Le remède complet est une fonction `security definer` exigeant
-- le jeton en paramètre (motif déjà en place pour `get_client_messages_by_token`)
-- plus la réécriture des deux pages publiques. Chantier avec recette.
-- =============================================================================

create policy msg_coach_insert
  on public.client_messages
  for insert
  to authenticated
  with check (is_active_user());

drop policy if exists msg_public_insert on public.client_messages;

create policy msg_public_insert
  on public.client_messages
  for insert
  to public
  with check (sender = 'client');

comment on table public.client_messages is
  'Messagerie coach <-> client. INSERT : les coachs actifs passent par msg_coach_insert ; le public (pages /recap et /evolution, sans session) par msg_public_insert, limitée à sender=''client'' depuis le 2026-08-11 — un anonyme ne peut plus fabriquer un message signé du coach.';
