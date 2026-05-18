-- =============================================================================
-- Distributor qualifications : fenêtres glissantes 2 / 3 / 6 / 12 mois
-- 2026-05-18 (chantier feat/jauge-fenetre-glissante)
-- =============================================================================
--
-- Contexte : la jauge Progression utilisait jusqu'ici `pv_monthly_breakdown`
-- du MOIS COURANT uniquement. Or les règles Herbalife exigent une qualification
-- sur FENÊTRE GLISSANTE :
--   - Senior Consultant 35%   : 500  PV sur 2  mois glissants
--   - Success Builder 42%     : 1000 PV sur 3  mois glissants
--   - Qualified Producer (QP) : 2500 PV sur 6  mois glissants  (waypoint)
--   - Supervisor 50%          : 4000 PV sur 1-12 mois glissants
--
-- Cette migration apporte 2 RPC + 1 helper SQL :
--   1) _pv_window_personal_total(user, window_months, as_of_month)
--      → somme PV perso (pv_15+pv_25+pv_35+pv_42+pv_royalty) sur N mois
--        glissants finissant à `as_of_month` (inclus).
--   2) get_distributor_qualifications(user, as_of_month)
--      → retourne 1 row : pv_2m / pv_3m / pv_6m / pv_12m + booleans qualif
--        + rank_calculated (rang max atteint d'après ces fenêtres, scope PV
--        perso seulement — l'extension downline non-Sup reste calculée côté
--        front via computeQualifyingPersonalPv pour la prochaine étape).
--   3) _rank_from_pv_windows(pv_2m, pv_3m, pv_12m)
--      → utilitaire pur de calcul du rang max, partagé par RPC + futur trigger.
--
-- Sécurité : SECURITY DEFINER + GRANT EXECUTE TO authenticated. Aucun side
-- effect : lecture seule sur pv_monthly_breakdown.
--
-- Périmètre Étape 1 : RPC + helpers seulement. L'auto-update de
-- users.current_rank arrive en Étape 3 (trigger upgrade-only).
-- =============================================================================

-- ─── Helper : somme PV perso sur N mois glissants ────────────────────────────
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

  SELECT COALESCE(SUM(pv_15 + pv_25 + pv_35 + pv_42 + pv_royalty), 0)
    INTO v_total
    FROM public.pv_monthly_breakdown
   WHERE user_id = p_user_id
     AND to_date(month || '-01', 'YYYY-MM-DD') >= v_start
     AND to_date(month || '-01', 'YYYY-MM-DD') <= v_as_of;

  RETURN v_total;
END;
$$;

GRANT EXECUTE ON FUNCTION public._pv_window_personal_total(uuid, int, text)
  TO authenticated;

-- ─── Helper pur : rang max atteint d'après les fenêtres PV ───────────────────
-- IMMUTABLE car sans I/O, partagé entre RPC et trigger Étape 3.
-- N.B. : ne considère que les paliers basés PV (distributor_25 →
-- supervisor_50). Les paliers structurels (world_team_50+) restent gérés
-- manuellement par admin via RangHerbalifeBlock.
CREATE OR REPLACE FUNCTION public._rank_from_pv_windows(
  p_pv_2m  numeric,
  p_pv_3m  numeric,
  p_pv_12m numeric
)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  -- Ordre du plus haut au plus bas (premier match gagne).
  IF p_pv_12m >= 4000 THEN RETURN 'supervisor_50';        END IF;
  IF p_pv_3m  >= 1000 THEN RETURN 'success_builder_42';   END IF;
  IF p_pv_2m  >= 500  THEN RETURN 'senior_consultant_35'; END IF;
  RETURN 'distributor_25';
END;
$$;

-- ─── RPC principale : qualifications d'un distri à un mois donné ─────────────
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
  qualified_senior_consultant boolean,  -- 500  / 2m
  qualified_success_builder   boolean,  -- 1000 / 3m
  qualified_qp                boolean,  -- 2500 / 6m  (waypoint)
  qualified_supervisor        boolean,  -- 4000 / 12m
  rank_calculated text                  -- rang max parmi {distri, SC, SB, Sup}
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

  pv_2m  := v_2m;
  pv_3m  := v_3m;
  pv_6m  := v_6m;
  pv_12m := v_12m;
  qualified_senior_consultant := (v_2m  >= 500);
  qualified_success_builder   := (v_3m  >= 1000);
  qualified_qp                := (v_6m  >= 2500);
  qualified_supervisor        := (v_12m >= 4000);
  rank_calculated := public._rank_from_pv_windows(v_2m, v_3m, v_12m);

  RETURN NEXT;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_distributor_qualifications(uuid, text)
  TO authenticated;

COMMENT ON FUNCTION public.get_distributor_qualifications(uuid, text) IS
  'Qualifications Herbalife d''un distri sur fenêtres glissantes 2/3/6/12 mois. Source PV perso uniquement (downline non-Sup ajouté côté front via computeQualifyingPersonalPv). Règles 2026-05-18.';
