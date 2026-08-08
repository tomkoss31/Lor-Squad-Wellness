-- =============================================================================
-- revoke_truncate_tables_recentes (2026-08-07)
--
-- La migration 20261207100000_fermeture_ecriture_anonyme retirait TRUNCATE à
-- anon ET authenticated sur toutes les tables du schéma public. Mais un REVOKE
-- n'est PAS rétroactif : les tables créées APRÈS (campaigns, campaign_recipients,
-- email_suppressions — chantier Campagnes email) sont nées avec le droit.
--
-- TRUNCATE contourne le RLS par nature : un simple compte coach connecté
-- pouvait vider ces tables. On repasse donc la révocation sur TOUT le schéma —
-- idempotent, et ça rattrape aussi toute autre table qui aurait glissé.
--
-- Sans effet sur l'app : aucun TRUNCATE dans le code (les seules occurrences
-- sont la classe CSS Tailwind « truncate » et une fonction JS de troncature),
-- et ces tables sont écrites par des edge functions en service_role, qui
-- conserve tous ses droits (vérifié : 116 tables, TRUNCATE intact).
--
-- ⚠️ LEÇON : toute table créée après coup échappe aux révocations passées.
-- Rejouer ce bloc après chaque création de table (ou l'ajouter à la migration
-- qui crée la table). Cf. règle 3 de la section Sécurité du CLAUDE.md.
--
-- Appliquée en prod le 2026-08-07 (registre : 20260808211025).
-- Vérification après application : 0 TRUNCATE restant pour anon/authenticated.
-- =============================================================================

do $$
declare
  t record;
begin
  for t in
    select c.relname
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relkind = 'r'
  loop
    execute format('revoke truncate on public.%I from anon, authenticated', t.relname);
  end loop;
end
$$;
