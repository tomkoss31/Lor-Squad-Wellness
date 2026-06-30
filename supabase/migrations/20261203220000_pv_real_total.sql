-- =============================================================================
-- PV réel Bizworks par mois (2026-06-30) — « fini le sous-comptage »
-- =============================================================================
-- Problème : la qualif (jauge Sup/SB/SC) somme `pv_monthly_breakdown` par tier.
-- Si le sponsor ne saisit pas le détail par tier, le total est sous-évalué vs
-- Bizworks. On ajoute une saisie SIMPLE : `pv_real_total` = le PV total réel du
-- mois copié depuis Bizworks. Quand il est renseigné, il REMPLACE la somme des
-- tiers dans TOUTES les fenêtres glissantes (perso ET étendu). Les colonnes par
-- tier restent pour le calcul de commission/override (inchangé).
--
-- À lire AVANT : docs/HERBALIFE_PALIERS_REGLES.md. Changement conservateur :
-- COALESCE(real, tiers) → ne baisse jamais en-dessous de ce qui est saisi.
-- Les helpers étant appelés par get_distributor_qualifications ET le trigger
-- d'auto-promotion, les deux héritent automatiquement de cette logique.
-- =============================================================================

ALTER TABLE public.pv_monthly_breakdown
  ADD COLUMN IF NOT EXISTS pv_real_total numeric;

COMMENT ON COLUMN public.pv_monthly_breakdown.pv_real_total IS
  'PV total réel du mois (copié de Bizworks). Si renseigné (>0), remplace la somme des tiers dans les fenêtres de qualification. NULL = on somme les tiers.';

-- ─── Helper PERSO : COALESCE(real, somme tiers) ──────────────────────────────
CREATE OR REPLACE FUNCTION public._pv_window_personal_total(
  p_user_id uuid,
  p_window_months int,
  p_as_of_month text
)
RETURNS numeric
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_as_of date;
  v_start date;
  v_total numeric;
BEGIN
  IF p_as_of_month !~ '^[0-9]{4}-[0-9]{2}$' THEN
    RAISE EXCEPTION 'p_as_of_month must be YYYY-MM';
  END IF;
  IF p_window_months < 1 OR p_window_months > 24 THEN
    RAISE EXCEPTION 'p_window_months must be between 1 and 24';
  END IF;

  v_as_of := to_date(p_as_of_month || '-01', 'YYYY-MM-DD');
  v_start := v_as_of - ((p_window_months - 1) || ' month')::interval;

  SELECT COALESCE(SUM(
           COALESCE(NULLIF(pv_real_total, 0),
                    pv_15 + pv_25 + pv_35 + pv_42 + pv_royalty)
         ), 0)
    INTO v_total
    FROM public.pv_monthly_breakdown
   WHERE user_id = p_user_id
     AND to_date(month || '-01', 'YYYY-MM-DD') >= v_start
     AND to_date(month || '-01', 'YYYY-MM-DD') <= v_as_of;

  RETURN v_total;
END;
$$;

-- ─── Helper ÉTENDU (self + downline non-Sup) : même COALESCE ─────────────────
CREATE OR REPLACE FUNCTION public._pv_window_extended_total(
  p_user_id uuid,
  p_window_months int,
  p_as_of_month text
)
RETURNS numeric
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_as_of date;
  v_start date;
  v_total numeric;
BEGIN
  IF p_as_of_month !~ '^[0-9]{4}-[0-9]{2}$' THEN
    RAISE EXCEPTION 'p_as_of_month must be YYYY-MM';
  END IF;
  IF p_window_months < 1 OR p_window_months > 24 THEN
    RAISE EXCEPTION 'p_window_months must be between 1 and 24';
  END IF;

  v_as_of := to_date(p_as_of_month || '-01', 'YYYY-MM-DD');
  v_start := v_as_of - ((p_window_months - 1) || ' month')::interval;

  WITH RECURSIVE scope AS (
    SELECT u.id, u.current_rank, u.frozen_at
      FROM public.users u
     WHERE u.id = p_user_id
    UNION ALL
    SELECT u.id, u.current_rank, u.frozen_at
      FROM public.users u
      JOIN scope s ON u.sponsor_id = s.id
     WHERE public._rank_order(COALESCE(u.current_rank, 'distributor_25')) < 4
       AND u.frozen_at IS NULL
  )
  SELECT COALESCE(SUM(
           COALESCE(NULLIF(b.pv_real_total, 0),
                    b.pv_15 + b.pv_25 + b.pv_35 + b.pv_42 + b.pv_royalty)
         ), 0)
    INTO v_total
    FROM public.pv_monthly_breakdown b
    JOIN scope s ON b.user_id = s.id
   WHERE to_date(b.month || '-01', 'YYYY-MM-DD') >= v_start
     AND to_date(b.month || '-01', 'YYYY-MM-DD') <= v_as_of;

  RETURN v_total;
END;
$$;

-- ─── RPC de saisie (admin) : pose / retire le PV réel d'un mois ──────────────
CREATE OR REPLACE FUNCTION public.set_user_pv_real_total(
  p_user_id uuid,
  p_month text,
  p_value numeric
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller uuid := auth.uid();
  v_caller_role text;
BEGIN
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  SELECT role INTO v_caller_role FROM public.users WHERE id = v_caller;
  IF v_caller_role <> 'admin' THEN
    RAISE EXCEPTION 'Only admin can set PV';
  END IF;
  IF p_month !~ '^[0-9]{4}-[0-9]{2}$' THEN
    RAISE EXCEPTION 'p_month must be YYYY-MM';
  END IF;

  -- Valeur nulle / 0 → on efface le PV réel (la qualif repasse aux tiers).
  IF COALESCE(p_value, 0) <= 0 THEN
    UPDATE public.pv_monthly_breakdown
       SET pv_real_total = NULL
     WHERE user_id = p_user_id AND month = p_month;
    RETURN;
  END IF;

  INSERT INTO public.pv_monthly_breakdown (
    user_id, month, pv_15, pv_25, pv_35, pv_42, pv_royalty,
    pv_real_total, declared_by, declared_at
  ) VALUES (
    p_user_id, p_month, 0, 0, 0, 0, 0,
    p_value, v_caller, now()
  )
  ON CONFLICT (user_id, month) DO UPDATE SET
    pv_real_total = EXCLUDED.pv_real_total,
    declared_by = EXCLUDED.declared_by,
    declared_at = EXCLUDED.declared_at;
END;
$$;

GRANT EXECUTE ON FUNCTION public.set_user_pv_real_total(uuid, text, numeric)
  TO authenticated;

COMMENT ON FUNCTION public.set_user_pv_real_total(uuid, text, numeric) IS
  'Pose le PV réel Bizworks d''un distri pour un mois (admin). Pilote les fenêtres de qualification. 0/NULL = efface.';
