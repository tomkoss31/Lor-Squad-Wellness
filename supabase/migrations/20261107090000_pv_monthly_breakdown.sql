-- =============================================================================
-- PV monthly breakdown par palier remise (V2 calibree fiche RO Herbalife)
-- 2026-11-07
-- =============================================================================
--
-- V1 (20261107080000_user_pv_override) stockait un seul nombre PV/mois sur
-- users.monthly_pv_override. Insuffisant car la rentabilite dependante du
-- TIER de remise du downline (mid-month rank-up genere des PV a 25% PUIS
-- a 35% par exemple — chaque palier donne un override different).
--
-- Cette migration ajoute :
--
-- 1) Table pv_monthly_breakdown : 5 colonnes PV par tier de remise downline
--    + 1 colonne pour le volume Royalty (downline Supervisor 50%+).
--
-- 2) RPC set_user_pv_breakdown(user_id, month, pv_15..pv_royalty) admin only.
--    Le RPC met aussi a jour users.monthly_pv_override = somme totale pour
--    que la jauge Co-pilote reste coherente avec le breakdown.
--
-- Formules verifiees sur fiche RO 2026-03 :
--   - Commission% = 50 - %remise_downline (sur Section C de la fiche)
--   - Royalty% = 5 sur Volume d'Organisation niveau 1/2/3 (Section G)
--   - Ratio PV->EUR HT moyen ~1.78 EUR/PV (mix produits typique FR)
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.pv_monthly_breakdown (
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  month text NOT NULL,
  pv_15 numeric NOT NULL DEFAULT 0,
  pv_25 numeric NOT NULL DEFAULT 0,
  pv_35 numeric NOT NULL DEFAULT 0,
  pv_42 numeric NOT NULL DEFAULT 0,
  pv_royalty numeric NOT NULL DEFAULT 0,
  declared_by uuid NULL REFERENCES public.users(id) ON DELETE SET NULL,
  declared_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, month),
  CONSTRAINT pv_breakdown_month_format CHECK (month ~ '^[0-9]{4}-[0-9]{2}$'),
  CONSTRAINT pv_breakdown_non_negative CHECK (
    pv_15 >= 0 AND pv_25 >= 0 AND pv_35 >= 0 AND pv_42 >= 0 AND pv_royalty >= 0
  )
);

COMMENT ON TABLE public.pv_monthly_breakdown IS
  'Breakdown mensuel des PV d''un user par palier de remise Herbalife. Source : transcription fiche Royalty Override par admin/referent. Calibre fiche RO 2026-03.';

CREATE INDEX IF NOT EXISTS pv_breakdown_user_month_idx
  ON public.pv_monthly_breakdown (user_id, month);

ALTER TABLE public.pv_monthly_breakdown ENABLE ROW LEVEL SECURITY;

-- Lecture : tous les users authentifies (visibilite analytics equipe).
-- Le filtre fin se fait cote SELECT par les RPC.
DROP POLICY IF EXISTS pv_breakdown_select ON public.pv_monthly_breakdown;
CREATE POLICY pv_breakdown_select ON public.pv_monthly_breakdown
  FOR SELECT TO authenticated
  USING (true);

-- Insert/update bloque sauf via RPC SECURITY DEFINER.
DROP POLICY IF EXISTS pv_breakdown_no_direct_write ON public.pv_monthly_breakdown;
CREATE POLICY pv_breakdown_no_direct_write ON public.pv_monthly_breakdown
  FOR ALL TO authenticated
  USING (false)
  WITH CHECK (false);

-- ─── RPC : set_user_pv_breakdown ─────────────────────────────────────────────
-- Admin only. Upsert le breakdown pour (user, month). Met aussi a jour
-- users.monthly_pv_override = somme du breakdown pour coherence jauge.
CREATE OR REPLACE FUNCTION public.set_user_pv_breakdown(
  p_user_id uuid,
  p_month text,
  p_pv_15 numeric,
  p_pv_25 numeric,
  p_pv_35 numeric,
  p_pv_42 numeric,
  p_pv_royalty numeric
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller uuid;
  v_caller_role text;
  v_total numeric;
BEGIN
  v_caller := auth.uid();
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  SELECT role INTO v_caller_role FROM public.users WHERE id = v_caller;
  IF v_caller_role <> 'admin' THEN
    RAISE EXCEPTION 'Only admin can set PV breakdown';
  END IF;
  IF p_month !~ '^[0-9]{4}-[0-9]{2}$' THEN
    RAISE EXCEPTION 'p_month must be YYYY-MM';
  END IF;

  -- Cas "tout a zero" = clear (suppression de la ligne)
  IF COALESCE(p_pv_15,0) = 0
     AND COALESCE(p_pv_25,0) = 0
     AND COALESCE(p_pv_35,0) = 0
     AND COALESCE(p_pv_42,0) = 0
     AND COALESCE(p_pv_royalty,0) = 0
  THEN
    DELETE FROM public.pv_monthly_breakdown
     WHERE user_id = p_user_id AND month = p_month;

    -- Si le mois cible == mois courant, on clear aussi l override unique
    UPDATE public.users
       SET monthly_pv_override = NULL,
           monthly_pv_override_month = NULL,
           monthly_pv_override_set_by = NULL,
           monthly_pv_override_set_at = NULL
     WHERE id = p_user_id
       AND monthly_pv_override_month = p_month;
    RETURN;
  END IF;

  v_total := COALESCE(p_pv_15,0) + COALESCE(p_pv_25,0) + COALESCE(p_pv_35,0)
           + COALESCE(p_pv_42,0) + COALESCE(p_pv_royalty,0);

  INSERT INTO public.pv_monthly_breakdown (
    user_id, month, pv_15, pv_25, pv_35, pv_42, pv_royalty,
    declared_by, declared_at
  ) VALUES (
    p_user_id, p_month,
    COALESCE(p_pv_15,0), COALESCE(p_pv_25,0), COALESCE(p_pv_35,0),
    COALESCE(p_pv_42,0), COALESCE(p_pv_royalty,0),
    v_caller, now()
  )
  ON CONFLICT (user_id, month) DO UPDATE SET
    pv_15 = EXCLUDED.pv_15,
    pv_25 = EXCLUDED.pv_25,
    pv_35 = EXCLUDED.pv_35,
    pv_42 = EXCLUDED.pv_42,
    pv_royalty = EXCLUDED.pv_royalty,
    declared_by = EXCLUDED.declared_by,
    declared_at = EXCLUDED.declared_at;

  -- Sync users.monthly_pv_override (somme = total) pour la jauge Co-pilote
  UPDATE public.users
     SET monthly_pv_override = v_total,
         monthly_pv_override_month = p_month,
         monthly_pv_override_set_by = v_caller,
         monthly_pv_override_set_at = now()
   WHERE id = p_user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.set_user_pv_breakdown(uuid, text, numeric, numeric, numeric, numeric, numeric) TO authenticated;
