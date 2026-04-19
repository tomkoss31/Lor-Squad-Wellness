-- ============================================================
-- EXPORT DES SCHÉMAS ET POLICIES MANQUANTES
--
-- Les 7 tables ci-dessous ont été créées manuellement via Supabase
-- Studio et ne sont PAS versionnées dans supabase/schema.sql.
-- Ce script génère la DDL correspondante, à coller dans schema.sql.
--
-- Tables concernées :
--   - client_recaps
--   - client_evolution_reports
--   - client_app_accounts
--   - client_messages
--   - client_referrals
--   - rdv_change_requests
--   - push_subscriptions
--
-- MODE D'EMPLOI (Thomas) :
--   1. Ouvre Supabase Studio > SQL Editor
--   2. Colle intégralement ce fichier et clique Run
--   3. Récupère le texte produit par CHAQUE bloc (table definition,
--      policies, enable RLS)
--   4. Colle le résultat dans supabase/schema.sql à la fin du fichier,
--      sous un commentaire clair :
--        -- === Tables créées via Studio (export YYYY-MM-DD) ===
--   5. Commit : chore(db): version RLS policies for client_recaps + 6 tables
-- ============================================================

-- ---------- BLOC 1 : structure des tables ----------
-- Produit une suite de CREATE TABLE IF NOT EXISTS ...
SELECT
  'CREATE TABLE IF NOT EXISTS public.' || c.table_name || E' (\n' ||
  string_agg(
    '  ' || c.column_name || ' ' ||
    CASE
      WHEN c.data_type = 'USER-DEFINED' THEN c.udt_name
      WHEN c.data_type = 'ARRAY' THEN c.udt_name
      WHEN c.character_maximum_length IS NOT NULL
        THEN c.data_type || '(' || c.character_maximum_length || ')'
      ELSE c.data_type
    END ||
    CASE WHEN c.is_nullable = 'NO' THEN ' NOT NULL' ELSE '' END ||
    CASE WHEN c.column_default IS NOT NULL
      THEN ' DEFAULT ' || c.column_default
      ELSE ''
    END,
    E',\n' ORDER BY c.ordinal_position
  ) || E'\n);' AS ddl
FROM information_schema.columns c
WHERE c.table_schema = 'public'
  AND c.table_name IN (
    'client_recaps',
    'client_evolution_reports',
    'client_app_accounts',
    'client_messages',
    'client_referrals',
    'rdv_change_requests',
    'push_subscriptions'
  )
GROUP BY c.table_name
ORDER BY c.table_name;

-- ---------- BLOC 2 : activation RLS ----------
SELECT
  'ALTER TABLE public.' || tablename || ' ENABLE ROW LEVEL SECURITY;' AS ddl
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN (
    'client_recaps',
    'client_evolution_reports',
    'client_app_accounts',
    'client_messages',
    'client_referrals',
    'rdv_change_requests',
    'push_subscriptions'
  )
ORDER BY tablename;

-- ---------- BLOC 3 : policies RLS ----------
-- Reproduit les CREATE POLICY tels qu'ils existent en prod.
SELECT
  'DROP POLICY IF EXISTS "' || policyname || '" ON public.' || tablename || E';\n' ||
  'CREATE POLICY "' || policyname || '"' || E'\n' ||
  '  ON public.' || tablename || E'\n' ||
  '  AS ' || permissive || E'\n' ||
  '  FOR ' || cmd || E'\n' ||
  '  TO ' || array_to_string(roles, ', ') || E'\n' ||
  CASE WHEN qual IS NOT NULL
    THEN '  USING (' || qual || E')\n'
    ELSE ''
  END ||
  CASE WHEN with_check IS NOT NULL
    THEN '  WITH CHECK (' || with_check || E')\n'
    ELSE ''
  END || ';' AS ddl
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN (
    'client_recaps',
    'client_evolution_reports',
    'client_app_accounts',
    'client_messages',
    'client_referrals',
    'rdv_change_requests',
    'push_subscriptions'
  )
ORDER BY tablename, policyname;

-- ---------- BLOC 4 : index (pour cohérence complète) ----------
SELECT
  indexdef || ';' AS ddl
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN (
    'client_recaps',
    'client_evolution_reports',
    'client_app_accounts',
    'client_messages',
    'client_referrals',
    'rdv_change_requests',
    'push_subscriptions'
  )
  AND indexname NOT LIKE '%_pkey'  -- les PK sont déjà dans le CREATE TABLE
ORDER BY tablename, indexname;
