-- =============================================================================
-- Flags VIP/Distri sur tiers ambigus 25% et 35% (chantier 2026-11-07)
-- =============================================================================
--
-- Probleme : tier 25% peut etre Silver VIP OU Distributor 25%. Tier 35% peut
-- etre Gold VIP OU Senior Consultant 35%. Les autres tiers sont sans
-- ambiguite (15% = toujours Prefere VIP, 42% = toujours distri SB, royalty
-- = toujours Supervisor).
--
-- Solution : ajout de booleans pv_25_is_vip et pv_35_is_vip sur les 2 tables
-- pv_monthly_breakdown et manual_pv_entries. Default false (= distri).
-- Calcul commission inchange (les 2 ont meme remise donc meme commission
-- pour le sponsor). Servent UNIQUEMENT pour le rangement / lisibilite UI.
-- =============================================================================

ALTER TABLE public.pv_monthly_breakdown
  ADD COLUMN IF NOT EXISTS pv_25_is_vip boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS pv_35_is_vip boolean NOT NULL DEFAULT false;

ALTER TABLE public.manual_pv_entries
  ADD COLUMN IF NOT EXISTS pv_25_is_vip boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS pv_35_is_vip boolean NOT NULL DEFAULT false;

-- ─── MAJ RPC set_user_pv_breakdown : ajoute les 2 flags ──────────────────────
CREATE OR REPLACE FUNCTION public.set_user_pv_breakdown(
  p_user_id uuid,
  p_month text,
  p_pv_15 numeric,
  p_pv_25 numeric,
  p_pv_35 numeric,
  p_pv_42 numeric,
  p_pv_royalty numeric,
  p_pv_25_is_vip boolean DEFAULT false,
  p_pv_35_is_vip boolean DEFAULT false
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller uuid := auth.uid();
  v_caller_role text;
  v_total numeric;
BEGIN
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

  IF COALESCE(p_pv_15,0) = 0
     AND COALESCE(p_pv_25,0) = 0
     AND COALESCE(p_pv_35,0) = 0
     AND COALESCE(p_pv_42,0) = 0
     AND COALESCE(p_pv_royalty,0) = 0
  THEN
    DELETE FROM public.pv_monthly_breakdown
     WHERE user_id = p_user_id AND month = p_month;
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
    pv_25_is_vip, pv_35_is_vip, declared_by, declared_at
  ) VALUES (
    p_user_id, p_month,
    COALESCE(p_pv_15,0), COALESCE(p_pv_25,0), COALESCE(p_pv_35,0),
    COALESCE(p_pv_42,0), COALESCE(p_pv_royalty,0),
    COALESCE(p_pv_25_is_vip, false), COALESCE(p_pv_35_is_vip, false),
    v_caller, now()
  )
  ON CONFLICT (user_id, month) DO UPDATE SET
    pv_15 = EXCLUDED.pv_15,
    pv_25 = EXCLUDED.pv_25,
    pv_35 = EXCLUDED.pv_35,
    pv_42 = EXCLUDED.pv_42,
    pv_royalty = EXCLUDED.pv_royalty,
    pv_25_is_vip = EXCLUDED.pv_25_is_vip,
    pv_35_is_vip = EXCLUDED.pv_35_is_vip,
    declared_by = EXCLUDED.declared_by,
    declared_at = EXCLUDED.declared_at;

  UPDATE public.users
     SET monthly_pv_override = v_total,
         monthly_pv_override_month = p_month,
         monthly_pv_override_set_by = v_caller,
         monthly_pv_override_set_at = now()
   WHERE id = p_user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.set_user_pv_breakdown(
  uuid, text, numeric, numeric, numeric, numeric, numeric, boolean, boolean
) TO authenticated;

-- ─── MAJ RPC upsert_manual_pv_entry : ajoute les 2 flags ─────────────────────
CREATE OR REPLACE FUNCTION public.upsert_manual_pv_entry(
  p_id uuid,
  p_name text,
  p_parent_name text,
  p_depth int,
  p_own_tier_pct numeric,
  p_intermediate_tiers numeric[],
  p_month text,
  p_pv_15 numeric,
  p_pv_25 numeric,
  p_pv_35 numeric,
  p_pv_42 numeric,
  p_pv_royalty numeric,
  p_pv_25_is_vip boolean DEFAULT false,
  p_pv_35_is_vip boolean DEFAULT false
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller uuid := auth.uid();
  v_caller_role text;
  v_id uuid;
BEGIN
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  SELECT role INTO v_caller_role FROM public.users WHERE id = v_caller;
  IF v_caller_role NOT IN ('admin', 'referent') THEN
    RAISE EXCEPTION 'Only admin/referent can manage manual PV entries';
  END IF;
  IF p_month !~ '^[0-9]{4}-[0-9]{2}$' THEN
    RAISE EXCEPTION 'p_month must be YYYY-MM';
  END IF;
  IF p_depth NOT IN (1, 2, 3) THEN
    RAISE EXCEPTION 'p_depth must be 1, 2 or 3';
  END IF;
  IF p_own_tier_pct NOT IN (15, 25, 35, 42, 50) THEN
    RAISE EXCEPTION 'p_own_tier_pct must be 15, 25, 35, 42 or 50';
  END IF;

  IF p_id IS NULL THEN
    INSERT INTO public.manual_pv_entries (
      viewer_user_id, name, parent_name, depth, own_tier_pct, intermediate_tiers,
      month, pv_15, pv_25, pv_35, pv_42, pv_royalty,
      pv_25_is_vip, pv_35_is_vip, declared_by
    ) VALUES (
      v_caller, p_name, p_parent_name, p_depth, p_own_tier_pct,
      COALESCE(p_intermediate_tiers, '{}'::numeric[]),
      p_month,
      COALESCE(p_pv_15, 0), COALESCE(p_pv_25, 0), COALESCE(p_pv_35, 0),
      COALESCE(p_pv_42, 0), COALESCE(p_pv_royalty, 0),
      COALESCE(p_pv_25_is_vip, false), COALESCE(p_pv_35_is_vip, false),
      v_caller
    ) RETURNING id INTO v_id;
  ELSE
    UPDATE public.manual_pv_entries
       SET name = p_name,
           parent_name = p_parent_name,
           depth = p_depth,
           own_tier_pct = p_own_tier_pct,
           intermediate_tiers = COALESCE(p_intermediate_tiers, '{}'::numeric[]),
           month = p_month,
           pv_15 = COALESCE(p_pv_15, 0),
           pv_25 = COALESCE(p_pv_25, 0),
           pv_35 = COALESCE(p_pv_35, 0),
           pv_42 = COALESCE(p_pv_42, 0),
           pv_royalty = COALESCE(p_pv_royalty, 0),
           pv_25_is_vip = COALESCE(p_pv_25_is_vip, false),
           pv_35_is_vip = COALESCE(p_pv_35_is_vip, false),
           updated_at = now()
     WHERE id = p_id AND viewer_user_id = v_caller
     RETURNING id INTO v_id;
    IF v_id IS NULL THEN
      RAISE EXCEPTION 'Entry not found or not owned by caller';
    END IF;
  END IF;
  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.upsert_manual_pv_entry(
  uuid, text, text, int, numeric, numeric[], text,
  numeric, numeric, numeric, numeric, numeric, boolean, boolean
) TO authenticated;
