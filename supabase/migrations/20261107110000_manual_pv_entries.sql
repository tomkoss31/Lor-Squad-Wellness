-- =============================================================================
-- Manual PV entries (V3 - distri hors-app, 2026-11-07)
-- =============================================================================
--
-- Probleme : Thomas a une downline Herbalife (Alexandre, Aurelie Tock,
-- Vanessa, etc.) qui n'est pas dans Lor'Squad mais qui commande chaque mois.
-- Il connait leur rang + leur lignage. Il veut saisir manuellement leur PV
-- pour avoir sa rentabilite TOTALE, pas juste celle des distri-app.
--
-- Solution : table manual_pv_entries possedee par le viewer (Thomas), avec
-- name + lignage texte + tier Herbalife + PV breakdown par tier.
-- Le compute reutilise computeSponsorCutOnDownstream avec les
-- intermediate_tiers fournis manuellement.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.manual_pv_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  viewer_user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  parent_name text NULL,
  depth int NOT NULL CHECK (depth IN (1, 2, 3)),
  own_tier_pct numeric NOT NULL CHECK (own_tier_pct IN (15, 25, 35, 42, 50)),
  intermediate_tiers numeric[] NOT NULL DEFAULT '{}'::numeric[],
  month text NOT NULL CHECK (month ~ '^[0-9]{4}-[0-9]{2}$'),
  pv_15 numeric NOT NULL DEFAULT 0 CHECK (pv_15 >= 0),
  pv_25 numeric NOT NULL DEFAULT 0 CHECK (pv_25 >= 0),
  pv_35 numeric NOT NULL DEFAULT 0 CHECK (pv_35 >= 0),
  pv_42 numeric NOT NULL DEFAULT 0 CHECK (pv_42 >= 0),
  pv_royalty numeric NOT NULL DEFAULT 0 CHECK (pv_royalty >= 0),
  declared_by uuid NULL REFERENCES public.users(id) ON DELETE SET NULL,
  declared_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.manual_pv_entries IS
  'Entrees manuelles PV pour distri hors-app (V3 fiche RO 2026-11-07). Owned par viewer_user_id.';

CREATE INDEX IF NOT EXISTS manual_pv_viewer_month_idx
  ON public.manual_pv_entries (viewer_user_id, month);

ALTER TABLE public.manual_pv_entries ENABLE ROW LEVEL SECURITY;

-- Lecture : un user voit ses propres entrees + admin voit tout.
DROP POLICY IF EXISTS manual_pv_select ON public.manual_pv_entries;
CREATE POLICY manual_pv_select ON public.manual_pv_entries
  FOR SELECT TO authenticated
  USING (
    viewer_user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  );

-- Insert/update bloque sauf via RPC.
DROP POLICY IF EXISTS manual_pv_no_direct_write ON public.manual_pv_entries;
CREATE POLICY manual_pv_no_direct_write ON public.manual_pv_entries
  FOR ALL TO authenticated
  USING (false)
  WITH CHECK (false);

-- ─── RPC: upsert_manual_pv_entry ─────────────────────────────────────────────
-- Un user (admin/referent) cree ou met a jour ses propres entrees.
-- Si p_id est null, INSERT ; sinon UPDATE de la ligne (proprietaire only).
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
  p_pv_royalty numeric
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
      month, pv_15, pv_25, pv_35, pv_42, pv_royalty, declared_by
    ) VALUES (
      v_caller, p_name, p_parent_name, p_depth, p_own_tier_pct,
      COALESCE(p_intermediate_tiers, '{}'::numeric[]),
      p_month,
      COALESCE(p_pv_15, 0), COALESCE(p_pv_25, 0), COALESCE(p_pv_35, 0),
      COALESCE(p_pv_42, 0), COALESCE(p_pv_royalty, 0), v_caller
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
  uuid, text, text, int, numeric, numeric[], text, numeric, numeric, numeric, numeric, numeric
) TO authenticated;

-- ─── RPC: delete_manual_pv_entry ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.delete_manual_pv_entry(p_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller uuid := auth.uid();
  v_deleted int;
BEGIN
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  DELETE FROM public.manual_pv_entries
   WHERE id = p_id AND viewer_user_id = v_caller;
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  IF v_deleted = 0 THEN
    RAISE EXCEPTION 'Entry not found or not owned by caller';
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.delete_manual_pv_entry(uuid) TO authenticated;
