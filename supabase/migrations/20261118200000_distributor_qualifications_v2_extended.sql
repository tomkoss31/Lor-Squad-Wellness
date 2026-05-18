-- =============================================================================
-- Distributor qualifications V2 : PV étendu glissant 12 mois (self + downline)
-- 2026-05-18 (suite chantier feat/jauge-fenetre-glissante)
-- =============================================================================
--
-- V1 (migration 20261118000000) ne calculait que les PV PERSO du distri sur
-- les fenêtres glissantes. Pour la qualification Supervisor, la règle
-- Herbalife exige le PV PERSONNEL ÉTENDU = perso + downline NON-Supervisor
-- (chaque branche s'arrête au premier Supervisor rencontré, ses PV basculent
-- en Royalty Override pour les paliers supérieurs).
--
-- Le compromis V1 côté front (MAX(pv_12m_perso, extended_mois_courant)) rate
-- les cas où la downline accumule sur plusieurs mois sans rien faire le mois
-- courant — ex. 8 distri à 500 PV/mois pendant 12 mois = 4000 PV cumul mais
-- 0 ce mois → V1 affichait 0/4000.
--
-- Cette V2 ajoute :
--   1) `_pv_window_extended_total(user_id, window_months, as_of_month)`
--      → somme PV (5 colonnes pv_*) sur fenêtre glissante, sur self + tous
--        descendants NON-Supervisor (BFS récursif via sponsor_id).
--   2) Étend `get_distributor_qualifications` avec `pv_12m_extended`.
--
-- Simplification métier : la condition "non-Sup" est évaluée sur le rang
-- ACTUEL (users.current_rank), pas mois par mois. L'historique de rang
-- mensuel n'existe pas dans le schéma — précision suffisante en pratique.
--
-- Self est inclus inconditionnellement (même si le distri est Supervisor,
-- on calcule quand même son extended — la jauge UI ne s'affiche plus à ce
-- niveau de toute façon).
-- =============================================================================

-- ─── Helper : PV étendu glissant (self + descendants non-Sup) ────────────────
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

  -- CTE récursive : self inclus + tous descendants non-Supervisor.
  -- On s'arrête à chaque Supervisor rencontré (sa branche "casse" pour ce
  -- calcul — règle breakaway Herbalife).
  WITH RECURSIVE scope AS (
    -- Self (inclus inconditionnellement)
    SELECT u.id, u.current_rank, u.frozen_at
      FROM public.users u
     WHERE u.id = p_user_id
    UNION ALL
    -- Descendants non-Sup (rank_order < 4 = en-dessous de supervisor_50)
    SELECT u.id, u.current_rank, u.frozen_at
      FROM public.users u
      JOIN scope s ON u.sponsor_id = s.id
     WHERE public._rank_order(COALESCE(u.current_rank, 'distributor_25')) < 4
       AND u.frozen_at IS NULL
  )
  SELECT COALESCE(SUM(b.pv_15 + b.pv_25 + b.pv_35 + b.pv_42 + b.pv_royalty), 0)
    INTO v_total
    FROM public.pv_monthly_breakdown b
    JOIN scope s ON b.user_id = s.id
   WHERE to_date(b.month || '-01', 'YYYY-MM-DD') >= v_start
     AND to_date(b.month || '-01', 'YYYY-MM-DD') <= v_as_of;

  RETURN v_total;
END;
$$;

GRANT EXECUTE ON FUNCTION public._pv_window_extended_total(uuid, int, text)
  TO authenticated;

COMMENT ON FUNCTION public._pv_window_extended_total(uuid, int, text) IS
  'Somme PV (5 colonnes) sur fenêtre glissante, sur self + descendants NON-Supervisor (règle breakaway Herbalife). Utilisé pour qualif Supervisor 4000 PV / 12 mois.';

-- ─── Drop et recrée get_distributor_qualifications avec pv_12m_extended ──────
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
  pv_12m_extended numeric,             -- NEW V2 : self + downline non-Sup, 12m glissants
  qualified_senior_consultant boolean, -- 500  / 2m
  qualified_success_builder   boolean, -- 1000 / 3m
  qualified_qp                boolean, -- 2500 / 6m   (waypoint)
  qualified_supervisor        boolean, -- 4000 / 12m EXTENDED (V2)
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
  qualified_senior_consultant := (v_2m  >= 500);
  qualified_success_builder   := (v_3m  >= 1000);
  qualified_qp                := (v_6m  >= 2500);
  -- V2 : on utilise le PV ÉTENDU pour la qualif Supervisor (règle officielle)
  qualified_supervisor        := (v_12m_extended >= 4000);
  -- rank_calculated : utilise extended pour le seuil Supervisor (cohérent UI)
  IF v_12m_extended >= 4000 THEN
    rank_calculated := 'supervisor_50';
  ELSIF v_3m >= 1000 THEN
    rank_calculated := 'success_builder_42';
  ELSIF v_2m >= 500 THEN
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
  'Qualifications Herbalife V2 : ajoute pv_12m_extended (self + downline non-Sup) pour la qualif Supervisor sur fenêtre 12 mois glissants. Règles 2026-05-18.';

-- ─── Et le trigger d'auto-promotion : il doit aussi utiliser extended ────────
-- Le trigger 20261118100000 lit `_rank_from_pv_windows(pv_2m, pv_3m, pv_12m)`
-- qui ne connaît pas pv_12m_extended. Pour rester cohérent avec la jauge UI,
-- on patch le trigger pour qu'il calcule pv_12m_extended et l'utilise pour
-- la borne Supervisor. On garde `_rank_from_pv_windows` legacy pour
-- compatibilité (utile si un autre caller).
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
  v_pv_12m_extended := public._pv_window_extended_total(v_user_id, 12, v_month);

  -- V2 : utilise pv_12m_extended pour la borne Supervisor
  IF v_pv_12m_extended >= 4000 THEN
    v_calculated_rank := 'supervisor_50';
  ELSIF v_pv_3m >= 1000 THEN
    v_calculated_rank := 'success_builder_42';
  ELSIF v_pv_2m >= 500 THEN
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
  -- Sécurité : un trigger qui plante ne doit JAMAIS bloquer la saisie PV.
  -- Si le calcul extended échoue (cas dégénéré BFS), on laisse passer.
  WHEN OTHERS THEN
    RAISE NOTICE 'auto-promote skipped for user % : %', v_user_id, SQLERRM;
    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public._tg_auto_promote_current_rank() IS
  'Trigger upgrade-only V2 : utilise pv_12m_extended pour qualif Supervisor (self + downline non-Sup). UPGRADE ONLY, jamais downgrade. Catch tout exception pour ne jamais bloquer la saisie PV.';
