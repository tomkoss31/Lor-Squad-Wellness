-- =============================================================================
-- Suppression des tables de l'ancien modèle de données (2026-07-29).
--
-- Vestiges d'un schéma en français, remplacé depuis par le schéma anglais :
--   profiles         -> users
--   bilans           -> assessments
--   body_scans       -> (fondu dans assessments.body_scan)
--   suivis           -> follow_ups
--   client_produits  -> pv_client_products
--
-- Le danger n'était pas la place occupée (elles sont vides) mais la confusion :
-- deux tables plausibles pour la même chose, et rien qui dise laquelle est la
-- vraie. Le prochain qui ouvre la base — toi dans trois mois, ou moi — pouvait
-- écrire dans la mauvaise.
--
-- VÉRIFIÉ AVANT SUPPRESSION, le jour même :
--   · 0 ligne dans chacune (compté, pas estimé) ;
--   · 0 insertion en 166 jours de statistiques Postgres ;
--   · 0 référence dans le code (`src/`, `supabase/functions/`, `api/`) ;
--   · aucune clé étrangère ne pointe vers elles ;
--   · aucune vue, aucune fonction ne les cite.
--
-- Filet : la sauvegarde du 2026-07-29 les contient (fichiers JSON vides), et
-- leur structure reste dans l'historique git des anciennes migrations.
--
-- `restrict` et non `cascade` : si une dépendance avait échappé aux
-- vérifications, la commande échoue au lieu d'emporter autre chose avec elle.
-- =============================================================================

drop table if exists public.client_produits restrict;
drop table if exists public.body_scans      restrict;
drop table if exists public.suivis          restrict;
drop table if exists public.bilans          restrict;
drop table if exists public.profiles        restrict;
