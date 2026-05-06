-- =============================================================================
-- Override PV manuel mensuel (Bizworks) — 2026-11-07
-- =============================================================================
--
-- Permet a un admin de saisir le PV reel d'un distri pour un mois donne
-- (source de verite Bizworks Herbalife) afin de corriger la jauge Co-pilote
-- qui ne compte que les commandes passees via l'app (pv_client_products).
--
-- Approche minimaliste decidee dans CLAUDE.md "Memo PV / Bizworks 2026-05-05" :
-- 1 champ admin "PV total Bizworks ce mois" qui override la jauge mensuelle.
--
-- Le mois est stocke en text "YYYY-MM" (Europe/Paris). Si le mois ne
-- correspond pas au mois courant cote front, l'override est ignore (re-bascule
-- sur le calcul automatique).
-- =============================================================================

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS monthly_pv_override numeric NULL,
  ADD COLUMN IF NOT EXISTS monthly_pv_override_month text NULL,
  ADD COLUMN IF NOT EXISTS monthly_pv_override_set_by uuid NULL REFERENCES public.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS monthly_pv_override_set_at timestamptz NULL;

COMMENT ON COLUMN public.users.monthly_pv_override IS
  'PV total declare manuellement (source Bizworks). Ignore si _month != mois courant.';
COMMENT ON COLUMN public.users.monthly_pv_override_month IS
  'Mois cible de l override au format YYYY-MM (Europe/Paris).';

-- ─── RPC: set_user_pv_override ────────────────────────────────────────────────
-- Admin only. Set ou clear l override pour un user et un mois donnes.
-- p_pv = NULL --> clear (suppression de l override).
CREATE OR REPLACE FUNCTION public.set_user_pv_override(
  p_user_id uuid,
  p_month text,
  p_pv numeric
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller uuid;
  v_caller_role text;
BEGIN
  v_caller := auth.uid();
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT role INTO v_caller_role FROM public.users WHERE id = v_caller;
  IF v_caller_role <> 'admin' THEN
    RAISE EXCEPTION 'Only admin can set PV override';
  END IF;

  IF p_month !~ '^[0-9]{4}-[0-9]{2}$' THEN
    RAISE EXCEPTION 'p_month must be YYYY-MM';
  END IF;

  IF p_pv IS NULL THEN
    UPDATE public.users
       SET monthly_pv_override = NULL,
           monthly_pv_override_month = NULL,
           monthly_pv_override_set_by = NULL,
           monthly_pv_override_set_at = NULL
     WHERE id = p_user_id;
  ELSE
    IF p_pv < 0 THEN
      RAISE EXCEPTION 'p_pv must be >= 0';
    END IF;
    UPDATE public.users
       SET monthly_pv_override = p_pv,
           monthly_pv_override_month = p_month,
           monthly_pv_override_set_by = v_caller,
           monthly_pv_override_set_at = now()
     WHERE id = p_user_id;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.set_user_pv_override(uuid, text, numeric) TO authenticated;

-- ─── RPC: set_user_rank_admin ────────────────────────────────────────────────
-- Admin only. Met a jour current_rank d un user (et stamp rank_set_at).
-- Utile pour les distri qui ne savent pas le faire eux-memes.
CREATE OR REPLACE FUNCTION public.set_user_rank_admin(
  p_user_id uuid,
  p_rank text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller uuid;
  v_caller_role text;
BEGIN
  v_caller := auth.uid();
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT role INTO v_caller_role FROM public.users WHERE id = v_caller;
  IF v_caller_role <> 'admin' THEN
    RAISE EXCEPTION 'Only admin can change rank of another user';
  END IF;

  UPDATE public.users
     SET current_rank = p_rank,
         rank_set_at = now()
   WHERE id = p_user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.set_user_rank_admin(uuid, text) TO authenticated;
