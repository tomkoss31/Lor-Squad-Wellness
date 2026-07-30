-- =============================================================================
-- Sauvegarde — découverte automatique des tables (incident du 2026-07-29).
--
-- Pourquoi : `scripts/backup-supabase.ts` portait une liste de 14 tables écrite
-- à la main. La base en compte 118. Des données réelles n'étaient donc pas
-- sauvegardées (prospects, consentements RGPD, commandes de paiement, leads…),
-- et la liste contenait `activity_logs` — une table SUPPRIMÉE depuis, qui
-- échouait à chaque exécution pendant que le récap hebdo annonçait « OK ».
--
-- Une liste écrite à la main redevient fausse au premier `create table`. Cette
-- fonction la remplace : le script demande à la base ce qu'elle contient.
--
-- `security definer` parce que `pg_class` n'est pas exposé via l'API REST.
-- Droit d'exécution donné au seul `service_role` : la clé de sauvegarde, jamais
-- le navigateur d'un coach ou d'un client.
-- =============================================================================

create or replace function public.backup_table_list()
returns table (nom text, lignes_estimees bigint)
language sql
stable
security definer
set search_path = public, pg_catalog
as $$
  select c.relname::text,
         greatest(c.reltuples, 0)::bigint
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public'
     and c.relkind = 'r'          -- tables ordinaires seulement : pas les vues
                                  -- (données dupliquées) ni les partitions
     and c.relispartition = false
   order by c.relname;
$$;

comment on function public.backup_table_list() is
  'Liste les tables du schéma public à sauvegarder. Utilisée par scripts/backup-supabase.ts pour ne plus dépendre d''une liste écrite à la main.';

-- Personne d'autre que la sauvegarde n'a besoin de cette fonction.
revoke execute on function public.backup_table_list() from public, anon, authenticated;
grant  execute on function public.backup_table_list() to service_role;
