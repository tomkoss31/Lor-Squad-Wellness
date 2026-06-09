-- =============================================================================
-- Backfill current_rank avec les NOUVELLES règles 2026 (2026-06-09)
-- =============================================================================
-- Rétroactif depuis février : on recalcule le rang de chaque distri actif sur
-- les fenêtres glissantes (seuils MAJ : SC 250, QP 2500/6m → 42%, Sup 4000
-- étendu) et on met à jour users.current_rank.
--
-- UPGRADE-ONLY : on ne promeut que si le rang calculé > rang actuel. Jamais de
-- rétrogradation (cohérent avec le trigger _tg_auto_promote_current_rank).
-- Idempotent : ré-exécutable sans effet de bord (re-promeut au même rang max).
-- Best-effort par distri (un échec de calcul n'interrompt pas la boucle).
-- =============================================================================

DO $$
DECLARE
  r record;
  m text := to_char(now() AT TIME ZONE 'Europe/Paris', 'YYYY-MM');
  v_rank text;
  cur text;
  n_promoted int := 0;
BEGIN
  FOR r IN
    SELECT id, current_rank
      FROM public.users
     WHERE active = true
       AND role IN ('distributor', 'referent', 'admin')
  LOOP
    cur := COALESCE(r.current_rank, 'distributor_25');
    -- Déjà Supervisor+ → rien à faire (upgrade-only, paliers structurels gérés à part)
    IF public._rank_order(cur) >= 4 THEN
      CONTINUE;
    END IF;

    BEGIN
      v_rank := public._rank_from_pv_windows(
        public._pv_window_personal_total(r.id, 2,  m),
        public._pv_window_personal_total(r.id, 3,  m),
        public._pv_window_personal_total(r.id, 6,  m),
        public._pv_window_extended_total(r.id, 12, m)  -- borne Supervisor = PV étendu
      );

      IF public._rank_order(v_rank) > public._rank_order(cur) THEN
        UPDATE public.users
           SET current_rank = v_rank,
               rank_set_at  = now()
         WHERE id = r.id;
        n_promoted := n_promoted + 1;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'backfill rank skip user % : %', r.id, SQLERRM;
    END;
  END LOOP;

  RAISE NOTICE 'Backfill current_rank terminé : % distri promu(s).', n_promoted;
END $$;
