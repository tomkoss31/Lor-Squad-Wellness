-- =============================================================================
-- Règles Herbalife 2026 — mise à jour des seuils de qualification (2026-06-09)
-- Rétroactif depuis février 2026 (calcul fenêtre glissante en live + trigger).
-- Validé Thomas. Voir docs/HERBALIFE_PALIERS_REGLES.md (changelog 2026-06-09).
--
-- CHANGEMENTS :
--   - Senior Consultant 35% : 500 → 250 PV / 2 mois glissants
--   - Success Builder 42%   : 1000 PV / 3 mois (inchangé) OU via QP 2500 PV /
--                             6 mois (le QP donne aussi le 42%)
--   - Supervisor 50%        : 4000 PV (PV étendu) / 3-12 mois (inchangé)
--
-- S'appuie sur la V2 (20261118200000) : on conserve pv_12m_extended (self +
-- downline non-Sup) pour la borne Supervisor. On met à jour : la RPC
-- get_distributor_qualifications ET le trigger d'auto-promotion (qui hardcodait
-- aussi 500). Pas de migration de données : recalcul à l'affichage + trigger
-- sur prochaine saisie PV.
-- =============================================================================

-- ─── Helper legacy _rank_from_pv_windows : MAJ seuils (peu/pas utilisé en V2,
--     mais on le garde cohérent : 250 + voie QP via un 4e arg pv_6m). ──────────
DROP FUNCTION IF EXISTS public._rank_from_pv_windows(numeric, numeric, numeric);
CREATE OR REPLACE FUNCTION public._rank_from_pv_windows(
  p_pv_2m  numeric,
  p_pv_3m  numeric,
  p_pv_6m  numeric,
  p_pv_12m numeric
)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  IF p_pv_12m >= 4000 THEN RETURN 'supervisor_50'; END IF;
  IF p_pv_3m >= 1000 OR p_pv_6m >= 2500 THEN RETURN 'success_builder_42'; END IF;
  IF p_pv_2m >= 250 THEN RETURN 'senior_consultant_35'; END IF;
  RETURN 'distributor_25';
END;
$$;

-- ─── RPC principale (signature V2 avec pv_12m_extended) ─────────────────────
DROP FUNCTION IF EXISTS public.get_distributor_qualifications(uuid, text);
CREATE OR REPLACE FUNCTION public.get_distributor_qualifications(
  p_user_id uuid,
  p_as_of_month text DEFAULT to_char(now() AT TIME ZONE 'Europe/Paris', 'YYYY-MM')
)
RETURNS TABLE (
  pv_2m  numeric,
  pv_3m  numeric,
  pv_6m  numeric,
  pv_12m numeric,
  pv_12m_extended numeric,
  qualified_senior_consultant boolean,  -- 250  / 2m   (MAJ : était 500)
  qualified_success_builder   boolean,  -- 1000 / 3m
  qualified_qp                boolean,  -- 2500 / 6m   → donne aussi le 42%
  qualified_supervisor        boolean,  -- 4000 / 12m EXTENDED
  rank_calculated text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_2m  numeric;
  v_3m  numeric;
  v_6m  numeric;
  v_12m numeric;
  v_12m_extended numeric;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF p_as_of_month !~ '^[0-9]{4}-[0-9]{2}$' THEN
    RAISE EXCEPTION 'p_as_of_month must be YYYY-MM';
  END IF;

  v_2m  := public._pv_window_personal_total(p_user_id, 2,  p_as_of_month);
  v_3m  := public._pv_window_personal_total(p_user_id, 3,  p_as_of_month);
  v_6m  := public._pv_window_personal_total(p_user_id, 6,  p_as_of_month);
  v_12m := public._pv_window_personal_total(p_user_id, 12, p_as_of_month);
  v_12m_extended := public._pv_window_extended_total(p_user_id, 12, p_as_of_month);

  pv_2m  := v_2m;
  pv_3m  := v_3m;
  pv_6m  := v_6m;
  pv_12m := v_12m;
  pv_12m_extended := v_12m_extended;
  qualified_senior_consultant := (v_2m  >= 250);          -- MAJ 2026-06-09 (était 500)
  qualified_success_builder   := (v_3m  >= 1000);
  qualified_qp                := (v_6m  >= 2500);
  qualified_supervisor        := (v_12m_extended >= 4000);

  IF v_12m_extended >= 4000 THEN
    rank_calculated := 'supervisor_50';
  ELSIF v_3m >= 1000 OR v_6m >= 2500 THEN                  -- + voie QP → 42%
    rank_calculated := 'success_builder_42';
  ELSIF v_2m >= 250 THEN                                   -- 500 → 250
    rank_calculated := 'senior_consultant_35';
  ELSE
    rank_calculated := 'distributor_25';
  END IF;

  RETURN NEXT;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_distributor_qualifications(uuid, text)
  TO authenticated;

COMMENT ON FUNCTION public.get_distributor_qualifications(uuid, text) IS
  'Qualifications Herbalife — seuils MAJ 2026-06-09 : SC 35% = 250 PV/2m (était 500) ; QP 2500/6m donne le 42% ; Sup 50% = 4000 PV étendu. pv_12m_extended = self + downline non-Sup (V2).';

-- ─── Trigger d'auto-promotion : mêmes nouveaux seuils + voie QP ─────────────
CREATE OR REPLACE FUNCTION public._tg_auto_promote_current_rank()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_month text;
  v_current_rank text;
  v_calculated_rank text;
  v_pv_2m numeric;
  v_pv_3m numeric;
  v_pv_6m numeric;
  v_pv_12m_extended numeric;
BEGIN
  v_user_id := NEW.user_id;
  v_month   := NEW.month;

  SELECT current_rank INTO v_current_rank
    FROM public.users
   WHERE id = v_user_id;
  IF v_current_rank IS NULL THEN
    v_current_rank := 'distributor_25';
  END IF;

  IF public._rank_order(v_current_rank) >= 4 THEN
    RETURN NEW;
  END IF;

  v_pv_2m := public._pv_window_personal_total(v_user_id, 2, v_month);
  v_pv_3m := public._pv_window_personal_total(v_user_id, 3, v_month);
  v_pv_6m := public._pv_window_personal_total(v_user_id, 6, v_month);
  v_pv_12m_extended := public._pv_window_extended_total(v_user_id, 12, v_month);

  IF v_pv_12m_extended >= 4000 THEN
    v_calculated_rank := 'supervisor_50';
  ELSIF v_pv_3m >= 1000 OR v_pv_6m >= 2500 THEN          -- + voie QP → 42%
    v_calculated_rank := 'success_builder_42';
  ELSIF v_pv_2m >= 250 THEN                              -- 500 → 250
    v_calculated_rank := 'senior_consultant_35';
  ELSE
    v_calculated_rank := 'distributor_25';
  END IF;

  IF public._rank_order(v_calculated_rank) > public._rank_order(v_current_rank) THEN
    UPDATE public.users
       SET current_rank = v_calculated_rank,
           rank_set_at  = now()
     WHERE id = v_user_id;
  END IF;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'auto-promote skipped for user % : %', v_user_id, SQLERRM;
    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public._tg_auto_promote_current_rank() IS
  'Trigger upgrade-only — seuils MAJ 2026-06-09 (SC 250, QP 2500/6m → 42%, Sup 4000 étendu). UPGRADE ONLY. Catch tout exception pour ne jamais bloquer la saisie PV.';
