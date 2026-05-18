-- =============================================================================
-- Auto-promotion users.current_rank — UPGRADE ONLY (jamais downgrade)
-- 2026-05-18 (chantier feat/jauge-fenetre-glissante, suite migration RPC)
-- =============================================================================
--
-- Quand un distri saisit (ou un admin lui saisit) des PV qui le qualifient
-- à un palier supérieur d'après la fenêtre glissante, son rang Herbalife
-- doit changer automatiquement.
--
-- Décision produit Thomas (2026-05-18) : on NE descend JAMAIS automatiquement.
-- Si la fenêtre glissante repasse sous le seuil, le pin reste — re-qualif
-- manuelle par admin via RangHerbalifeBlock pour redescendre.
--
-- Périmètre du trigger :
--   - Calcule le rang max d'après les fenêtres 2m / 3m / 12m via
--     `_rank_from_pv_windows` (migration 20261118000000).
--   - Compare avec users.current_rank actuel via `_rank_order`.
--   - Si nouveau rang > actuel ET nouveau rang ≤ supervisor_50, UPDATE.
--   - Les paliers structurels (world_team_50+) ne sont JAMAIS touchés ici
--     (ils dépendent de la structure downline, pas des PV perso).
--
-- Le trigger est AFTER INSERT OR UPDATE sur pv_monthly_breakdown — fire
-- après que la nouvelle row est dispo pour le calcul `_pv_window_personal_total`.
-- =============================================================================

-- ─── Helper : ordre numérique des rangs (1=distri → 8=presidents) ────────────
CREATE OR REPLACE FUNCTION public._rank_order(p_rank text)
RETURNS int
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  RETURN CASE p_rank
    WHEN 'distributor_25'       THEN 1
    WHEN 'senior_consultant_35' THEN 2
    WHEN 'success_builder_42'   THEN 3
    WHEN 'supervisor_50'        THEN 4
    WHEN 'world_team_50'        THEN 5
    WHEN 'get_team_50'          THEN 6
    WHEN 'millionaire_50'       THEN 7
    WHEN 'presidents_50'        THEN 8
    ELSE 1
  END;
END;
$$;

-- ─── Trigger function : promote si fenêtre glissante qualifie un palier sup ─
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
  v_pv_12m numeric;
BEGIN
  v_user_id := NEW.user_id;
  v_month   := NEW.month;

  -- 1) Rang actuel du distri
  SELECT current_rank INTO v_current_rank
    FROM public.users
   WHERE id = v_user_id;
  IF v_current_rank IS NULL THEN
    v_current_rank := 'distributor_25';
  END IF;

  -- 2) Si déjà Supervisor ou plus haut, on ne touche jamais (les paliers
  --    structurels world_team+ ne se calculent pas depuis les PV).
  IF public._rank_order(v_current_rank) >= 4 THEN
    RETURN NEW;
  END IF;

  -- 3) Calcule les 3 fenêtres pertinentes au mois de la row modifiée.
  v_pv_2m  := public._pv_window_personal_total(v_user_id, 2,  v_month);
  v_pv_3m  := public._pv_window_personal_total(v_user_id, 3,  v_month);
  v_pv_12m := public._pv_window_personal_total(v_user_id, 12, v_month);

  v_calculated_rank := public._rank_from_pv_windows(v_pv_2m, v_pv_3m, v_pv_12m);

  -- 4) Promotion uniquement (upgrade only — règle Thomas 2026-05-18).
  IF public._rank_order(v_calculated_rank) > public._rank_order(v_current_rank) THEN
    UPDATE public.users
       SET current_rank = v_calculated_rank,
           rank_set_at  = now()
     WHERE id = v_user_id;
  END IF;

  RETURN NEW;
END;
$$;

-- ─── Wire le trigger ─────────────────────────────────────────────────────────
DROP TRIGGER IF EXISTS tg_auto_promote_current_rank ON public.pv_monthly_breakdown;
CREATE TRIGGER tg_auto_promote_current_rank
  AFTER INSERT OR UPDATE ON public.pv_monthly_breakdown
  FOR EACH ROW
  EXECUTE FUNCTION public._tg_auto_promote_current_rank();

COMMENT ON FUNCTION public._tg_auto_promote_current_rank() IS
  'Trigger upgrade-only : promote users.current_rank si la fenêtre glissante PV qualifie un palier supérieur (jamais au-dessus de supervisor_50). Jamais de downgrade auto (règle Thomas 2026-05-18).';
