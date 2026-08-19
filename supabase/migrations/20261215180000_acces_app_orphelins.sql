-- =============================================================================
-- Les accès à l'app qui survivaient à leur client.
--
-- Trouvé le 19/08 en préparant le bouton « supprimer le membre » : DEUX lignes
-- de `client_app_accounts` n'avaient plus de client, avec un jeton valable
-- jusqu'en 2027. Des comptes de test d'avril — donc aucune donnée réelle
-- exposée — mais le mécanisme, lui, est bien réel.
--
-- LA CAUSE : 18 tables suivent en CASCADE quand un client est supprimé
-- (bilans, mesures, visites, carte, cœurs, suivis…). `client_app_accounts`
-- n'en fait pas partie, parce que sa colonne `client_id` est en TEXT quand
-- `clients.id` est en UUID : il n'existe aucune clé étrangère entre les deux,
-- donc rien à quoi accrocher une cascade.
--
-- ⚠️ On NE convertit PAS la colonne en UUID pour créer cette clé. Cette
-- différence de type est le cœur de la règle RLS du 25/04 : une seule ligne au
-- `client_id` non convertible ferait planter l'évaluation d'une policy et
-- rendrait TOUTE la table clients illisible, admins compris. Le prix à payer
-- est un nettoyage explicite dans `api/admin-delete-client.ts` — fait dans le
-- même commit.
-- =============================================================================

delete from public.client_app_accounts a
where not exists (select 1 from public.clients c where c.id::text = a.client_id);

comment on table public.client_app_accounts is
  'Accès PWA du client (jeton dans l''URL). ⚠️ client_id est en TEXT alors que clients.id est en UUID : il n''y a AUCUNE clé étrangère, donc AUCUNE cascade. Toute suppression de client doit retirer la ligne d''ici À LA MAIN — sinon le jeton reste actif sur un dossier mort (2 orphelins trouvés le 19/08, purgés). C''est api/admin-delete-client.ts qui s''en charge.';
