-- ==========================================================================
-- MIGRATION : Lifecycle status + fragile flag + structuration étape 13 bilan
-- Date      : 2026-04-18 13:35:00 UTC
-- Auteur    : feat/lifecycle-status-v1
--
-- ⚠️ AVANT EXÉCUTION :
--   1. BACKUP complet de la DB via Supabase Studio
--      (Database → Backups → Create backup) — OBLIGATOIRE
--   2. Exécuter en heure creuse si possible
--   3. Tester en staging si dispo (sinon direct prod, c'est safe
--      car on ajoute uniquement des colonnes optionnelles avec defaults)
--
-- Impact applicatif :
--   - Aucun code côté client ne lit encore ces colonnes à l'instant T
--     de l'exécution. La migration est donc compatible avec la version
--     déployée. Déploiement front APRÈS ou SIMULTANÉ.
--
-- Rollback : voir la section "-- ROLLBACK" en fin de fichier.
-- ==========================================================================

-- ─── 1. Enum lifecycle_status ─────────────────────────────────────────────
-- Remarque : on crée un type ENUM Postgres, avec gestion idempotente.
DO $$ BEGIN
  CREATE TYPE client_lifecycle_status AS ENUM (
    'active',
    'not_started',
    'paused',
    'stopped',
    'lost'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- ─── 2. Nouvelles colonnes sur clients ────────────────────────────────────
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS lifecycle_status client_lifecycle_status NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS is_fragile boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS lifecycle_updated_at timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS lifecycle_updated_by uuid REFERENCES auth.users(id);

-- ─── 3. Colonnes structurées sur assessments (étape 13 du bilan) ──────────
-- Colonnes optionnelles : NULL si bilan antérieur au déploiement.
ALTER TABLE public.assessments
  ADD COLUMN IF NOT EXISTS decision_client text
    CHECK (decision_client IS NULL OR decision_client IN ('partant', 'a_rassurer', 'a_confirmer')),
  ADD COLUMN IF NOT EXISTS type_de_suite text
    CHECK (type_de_suite IS NULL OR type_de_suite IN ('rdv_fixe', 'message_rappel', 'relance_douce')),
  ADD COLUMN IF NOT EXISTS message_a_laisser text
    CHECK (message_a_laisser IS NULL OR message_a_laisser IN ('simple', 'progressif', 'cadre_clair'));

-- ─── 4. Élargir la check constraint de follow_ups.status ──────────────────
-- Le code TS utilise déjà 4 valeurs ('scheduled', 'pending', 'completed',
-- 'dismissed') alors que la DB n'autorise que 'scheduled' et 'pending'.
-- Cette incohérence silencieuse est réparée ici, et on ajoute 'inactive'
-- pour marquer les follow-ups rendus obsolètes par un arrêt client.
ALTER TABLE public.follow_ups DROP CONSTRAINT IF EXISTS follow_ups_status_check;
ALTER TABLE public.follow_ups
  ADD CONSTRAINT follow_ups_status_check
  CHECK (status IN ('scheduled', 'pending', 'completed', 'dismissed', 'inactive'));

-- ─── 5. Backfill lifecycle_status depuis l'ancien champ status ────────────
-- Uniquement les lignes qui sont encore à la valeur par défaut 'active'
-- (pour éviter d'écraser un état posé manuellement entre-temps).
UPDATE public.clients
SET lifecycle_status = CASE
  WHEN status = 'pending'   THEN 'not_started'::client_lifecycle_status
  WHEN status = 'follow-up' THEN 'not_started'::client_lifecycle_status
  WHEN status = 'active'    THEN 'active'::client_lifecycle_status
  ELSE 'active'::client_lifecycle_status
END
WHERE lifecycle_status = 'active';

-- ─── 6. Index de filtrage ─────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_clients_lifecycle_status
  ON public.clients(lifecycle_status);

CREATE INDEX IF NOT EXISTS idx_clients_is_fragile
  ON public.clients(is_fragile)
  WHERE is_fragile = true;

-- ─── 7. RLS : les policies existantes sur clients / assessments / ───────
--           follow_ups sont basées sur distributor_id (via la fonction
--           public.can_access_owner). Elles continuent de fonctionner
--           pour les nouvelles colonnes — aucune policy supplémentaire
--           n'est nécessaire.
--
-- Policies vérifiées (source : supabase/schema.sql) :
--   • clients.{select|insert|update|delete} "own or admin"
--   • assessments.{select|insert|update|delete} via client
--   • follow_ups.{select|insert|update|delete} via client

-- ==========================================================================
-- ROLLBACK (à exécuter SEULEMENT en cas de souci après déploiement)
-- ==========================================================================
-- DROP INDEX IF EXISTS public.idx_clients_is_fragile;
-- DROP INDEX IF EXISTS public.idx_clients_lifecycle_status;
--
-- ALTER TABLE public.assessments DROP COLUMN IF EXISTS message_a_laisser;
-- ALTER TABLE public.assessments DROP COLUMN IF EXISTS type_de_suite;
-- ALTER TABLE public.assessments DROP COLUMN IF EXISTS decision_client;
--
-- ALTER TABLE public.clients DROP COLUMN IF EXISTS lifecycle_updated_by;
-- ALTER TABLE public.clients DROP COLUMN IF EXISTS lifecycle_updated_at;
-- ALTER TABLE public.clients DROP COLUMN IF EXISTS is_fragile;
-- ALTER TABLE public.clients DROP COLUMN IF EXISTS lifecycle_status;
--
-- DROP TYPE IF EXISTS client_lifecycle_status;
--
-- Pour follow_ups, revenir à l'ancienne contrainte :
-- ALTER TABLE public.follow_ups DROP CONSTRAINT IF EXISTS follow_ups_status_check;
-- ALTER TABLE public.follow_ups
--   ADD CONSTRAINT follow_ups_status_check
--   CHECK (status IN ('scheduled', 'pending'));
-- ==========================================================================
