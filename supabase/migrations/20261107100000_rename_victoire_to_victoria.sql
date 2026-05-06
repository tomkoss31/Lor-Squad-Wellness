-- =============================================================================
-- Rename Victoire -> Victoria (note Thomas 2026-11-07)
--
-- Le user a ete enregistre sous "Victoire" alors que son vrai prenom est
-- "Victoria". Migration safe : on rename uniquement si EXACTEMENT 1 match
-- (sinon on raise notice et on ne touche rien).
-- =============================================================================

DO $$
DECLARE
  v_count int;
  v_matched_id uuid;
  v_old_name text;
BEGIN
  SELECT count(*) INTO v_count
    FROM public.users
    WHERE name ILIKE 'Victoire %' OR name ILIKE '% Victoire' OR name ILIKE 'Victoire';

  IF v_count = 1 THEN
    SELECT id, name INTO v_matched_id, v_old_name
      FROM public.users
      WHERE name ILIKE 'Victoire %' OR name ILIKE '% Victoire' OR name ILIKE 'Victoire'
      LIMIT 1;

    UPDATE public.users
       SET name = REPLACE(REPLACE(name, 'Victoire ', 'Victoria '), ' Victoire', ' Victoria')
     WHERE id = v_matched_id;

    -- Edge case : prenom seul "Victoire" sans nom de famille
    UPDATE public.users SET name = 'Victoria' WHERE id = v_matched_id AND name = 'Victoire';

    RAISE NOTICE 'Renamed user % from "%" to new name', v_matched_id, v_old_name;
  ELSIF v_count = 0 THEN
    RAISE NOTICE 'No user with "Victoire" found - skip';
  ELSE
    RAISE NOTICE 'Found % matches with "Victoire" - skip rename to avoid mass update', v_count;
  END IF;
END $$;
