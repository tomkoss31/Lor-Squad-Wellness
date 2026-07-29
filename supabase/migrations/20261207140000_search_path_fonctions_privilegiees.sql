-- =============================================================================
-- Chemin de recherche figé sur les fonctions privilégiées (2026-07-29).
--
-- LE RISQUE : une fonction `security definer` s'exécute avec les droits de son
-- propriétaire (souvent `postgres`). Si son `search_path` n'est pas fixé, il
-- prend celui de l'appelant — qui peut y glisser un schéma à lui, contenant une
-- table ou une fonction portant le même nom qu'un objet interne. La fonction
-- privilégiée exécute alors le faux objet, avec des droits d'administrateur.
-- C'est le vecteur d'élévation de privilèges classique de PostgreSQL.
--
-- 13 fonctions étaient concernées.
--
-- PORTÉE VOLONTAIREMENT LIMITÉE : les 22 fonctions `security invoker` sans
-- chemin figé ne sont PAS touchées. Elles s'exécutent avec les droits de
-- l'appelant : rien à escalader, donc du risque de régression pour aucun gain
-- de sécurité. L'analyseur Supabase les signale quand même — c'est un
-- faux positif dans notre contexte, et c'est assumé.
--
-- `public, extensions` et non `''` : les fonctions référencent leurs objets
-- sans les qualifier (`clients`, `users`…). Un chemin vide imposerait de
-- réécrire les 13 corps, avec un vrai risque d'erreur. Ce qui compte pour la
-- sécurité, c'est que `pg_temp` — le schéma que l'attaquant contrôle — n'y
-- figure plus. Les appels vers d'autres schémas (`net.http_post`,
-- `vault.decrypted_secrets`, `auth.uid`) sont déjà qualifiés : ils continuent
-- de fonctionner quel que soit le chemin.
-- =============================================================================

do $$
declare f record;
begin
  for f in
    select p.oid::regprocedure as signature
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public'
       and p.prokind = 'f'
       and p.prosecdef                          -- privilégiées uniquement
       and not exists (
             select 1 from unnest(coalesce(p.proconfig, '{}')) cfg
              where cfg like 'search_path=%')
  loop
    execute format('alter function %s set search_path = public, extensions', f.signature);
  end loop;
end $$;
