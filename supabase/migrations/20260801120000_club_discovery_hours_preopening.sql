-- Horaires "séance découverte" — période PRÉ-OUVERTURE (maintenant → 7 sept 2026).
-- Décision Thomas (2026-08-01) : bilans découverte 9h→14h, créneaux d'1h
-- (dernier créneau 14h occupé jusqu'à 15h), RDV de 45 min.
-- À RE-ADAPTER à l'ouverture du club (7 sept) pour coller aux horaires club.
--
-- Idempotent : merge jsonb (`||`) sur settings.discovery — préserve capacity,
-- opening_date (2026-08-01, déjà ouvert pour août) et holidays.
-- Cf. get_club_discovery_availability : slot_step_min = pas ET durée du créneau.

update public.clubs
set settings = jsonb_set(
  settings,
  '{discovery}',
  coalesce(settings->'discovery', '{}'::jsonb)
    || jsonb_build_object(
         'duration_min',  45,   -- RDV 45 min
         'slot_step_min', 60,   -- créneaux d'1h (pas de chevauchement)
         'hours', jsonb_build_object(
           '1', jsonb_build_array(jsonb_build_array('09:00','14:00')),
           '2', jsonb_build_array(jsonb_build_array('09:00','14:00')),
           '3', jsonb_build_array(jsonb_build_array('09:00','14:00')),
           '4', jsonb_build_array(jsonb_build_array('09:00','14:00')),
           '5', jsonb_build_array(jsonb_build_array('09:00','14:00')),
           '6', jsonb_build_array(jsonb_build_array('09:00','14:00'))
         )
       )
)
where slug = 'verdun';
