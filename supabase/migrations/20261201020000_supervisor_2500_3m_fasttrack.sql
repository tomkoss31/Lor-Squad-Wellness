-- =============================================================================
-- Supervisor 50% — voie rapide 2500 PV / 3 mois (2026-06-09, correctif)
-- =============================================================================
-- Complète la migration 20261201000000 : le 50% a DEUX voies (vélocité) :
--   - 2500 PV PERSO / 3 mois glissants   → voie rapide  (NEW)
--   - 4000 PV étendu / 3-12 mois          → voie standard (déjà en place)
-- Cohérence : 2500 perso en 3 mois = 50% ; 2500 perso en 6 mois = 42% (QP).
-- C'est la VITESSE qui distingue les deux (même base PV perso).
--
-- Met à jour : _rank_from_pv_windows, get_distributor_qualifications, le trigger
-- _tg_auto_promote_current_rank, puis re-backfill (upgrade-only).
-- =============================================================================

-- ─── Helper legacy : Supervisor = 4000/12m OU 2500/3m ────────────────────────
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
  -- 50% : 4000 (étendu/12m, passé en p_pv_12m) OU voie rapide 2500 perso / 3 mois.
  IF p_pv_12m >= 4000 OR p_pv_3m >= 2500 THEN RETURN 'supervisor_50'; END IF;
  -- 42% : Success Builder 1000/3m OU QP 2500/6m.
  IF p_pv_3m >= 1000 OR p_pv_6m >= 2500 THEN RETURN 'success_builder_42'; END IF;
  -- 35% : Senior Consultant 250/2m.
  IF p_pv_2m >= 250 THEN RETURN 'senior_consultant_35'; END IF;
  RETURN 'distributor_25';
END;
$$;

-- ─── RPC principale ─────────────────────────────────────────────────────────
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
  qualified_senior_consultant boolean,
  qualified_success_builder   boolean,
  qualified_qp                boolean,
  qualified_supervisor        boolean,
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
  qualified_senior_consultant := (v_2m  >= 250);
  qualified_success_builder   := (v_3m  >= 1000);
  qualified_qp                := (v_6m  >= 2500);
  -- 50% : voie standard (4000 étendu) OU voie rapide (2500 perso / 3 mois)
  qualified_supervisor        := (v_12m_extended >= 4000 OR v_3m >= 2500);

  IF v_12m_extended >= 4000 OR v_3m >= 2500 THEN
    rank_calculated := 'supervisor_50';
  ELSIF v_3m >= 1000 OR v_6m >= 2500 THEN
    rank_calculated := 'success_builder_42';
  ELSIF v_2m >= 250 THEN
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
  'Qualif Herbalife MAJ 2026-06-09 : SC 250/2m ; SB 1000/3m ou QP 2500/6m → 42% ; Sup 50% = 4000 étendu/12m OU voie rapide 2500 perso/3m.';

-- ─── Trigger auto-promotion ─────────────────────────────────────────────────
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

  SELECT current_rank INTO v_current_rank FROM public.users WHERE id = v_user_id;
  IF v_current_rank IS NULL THEN v_current_rank := 'distributor_25'; END IF;
  IF public._rank_order(v_current_rank) >= 4 THEN RETURN NEW; END IF;

  v_pv_2m := public._pv_window_personal_total(v_user_id, 2, v_month);
  v_pv_3m := public._pv_window_personal_total(v_user_id, 3, v_month);
  v_pv_6m := public._pv_window_personal_total(v_user_id, 6, v_month);
  v_pv_12m_extended := public._pv_window_extended_total(v_user_id, 12, v_month);

  IF v_pv_12m_extended >= 4000 OR v_pv_3m >= 2500 THEN
    v_calculated_rank := 'supervisor_50';
  ELSIF v_pv_3m >= 1000 OR v_pv_6m >= 2500 THEN
    v_calculated_rank := 'success_builder_42';
  ELSIF v_pv_2m >= 250 THEN
    v_calculated_rank := 'senior_consultant_35';
  ELSE
    v_calculated_rank := 'distributor_25';
  END IF;

  IF public._rank_order(v_calculated_rank) > public._rank_order(v_current_rank) THEN
    UPDATE public.users SET current_rank = v_calculated_rank, rank_set_at = now()
     WHERE id = v_user_id;
  END IF;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'auto-promote skipped for user % : %', v_user_id, SQLERRM;
  RETURN NEW;
END;
$$;

-- ─── Re-backfill avec la voie rapide 2500/3m (upgrade-only) ─────────────────
DO $$
DECLARE
  r record;
  m text := to_char(now() AT TIME ZONE 'Europe/Paris', 'YYYY-MM');
  v_rank text; cur text; n int := 0;
BEGIN
  FOR r IN SELECT id, current_rank FROM public.users
            WHERE active = true AND role IN ('distributor','referent','admin') LOOP
    cur := COALESCE(r.current_rank, 'distributor_25');
    IF public._rank_order(cur) >= 4 THEN CONTINUE; END IF;
    BEGIN
      v_rank := public._rank_from_pv_windows(
        public._pv_window_personal_total(r.id, 2,  m),
        public._pv_window_personal_total(r.id, 3,  m),
        public._pv_window_personal_total(r.id, 6,  m),
        public._pv_window_extended_total(r.id, 12, m)
      );
      IF public._rank_order(v_rank) > public._rank_order(cur) THEN
        UPDATE public.users SET current_rank = v_rank, rank_set_at = now() WHERE id = r.id;
        n := n + 1;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'backfill skip % : %', r.id, SQLERRM;
    END;
  END LOOP;
  RAISE NOTICE 'Re-backfill (voie rapide 2500/3m) : % promu(s).', n;
END $$;
