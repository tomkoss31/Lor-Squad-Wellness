-- =============================================================================
-- Délai de réservation — RÈGLE FINALE (Thomas, 2026-08-09)
--
--   • Tous les jours   → avant MIDI LA VEILLE.
--   • Créneau du LUNDI → avant le VENDREDI précédent 21h00.
--
-- Pourquoi 21h le vendredi et non midi : le club ouvre le SAMEDI matin. Une
-- réservation tombée vendredi soir est donc vue le samedi, et l'équipe peut
-- rappeler pour décaler si le lundi ne convient pas. Midi fermait la porte une
-- demi-journée trop tôt sans contrepartie.
--
-- Le lundi reste malgré tout un cas à part : le dimanche est fermé, on ne peut
-- pas laisser réserver le dimanche soir pour le lundi matin.
--
-- Une seule définition, consommée par l'AFFICHAGE (get_club_discovery_-
-- availability) ET par l'ÉCRITURE (book_club_discovery). Europe/Paris.
--
-- Vérifié après application, butoirs calculés à l'appui :
--   samedi 15/08 09:00 → vendredi 14 à 12:00
--   LUNDI  17/08 09:00 → vendredi 14 à 21:00
--   mardi  18/08 09:00 → lundi    17 à 12:00
--   LUNDI  24/08 09:00 → vendredi 21 à 21:00
-- =============================================================================

create or replace function public.club_slot_bookable(p_slot_start timestamptz)
returns boolean
language sql
stable
set search_path to 'public'
as $$
  select
    p_slot_start > now()
    and now() < (
      case
        -- isodow 1 = lundi → vendredi précédent (J-3) 21h00.
        when extract(isodow from (p_slot_start at time zone 'Europe/Paris')) = 1
          then ((p_slot_start at time zone 'Europe/Paris')::date - 3) + time '21:00'
        -- tous les autres jours → midi la veille (J-1).
        else ((p_slot_start at time zone 'Europe/Paris')::date - 1) + time '12:00'
      end
    ) at time zone 'Europe/Paris'
$$;

comment on function public.club_slot_bookable(timestamptz) is
  'RDV découverte du club : créneau encore réservable ? Midi la veille pour tous les jours ; lundi = avant le vendredi précédent 21h00 (le club ouvre le samedi, on peut rappeler pour décaler). Europe/Paris. Source unique — utilisée par get_club_discovery_availability et book_club_discovery.';
