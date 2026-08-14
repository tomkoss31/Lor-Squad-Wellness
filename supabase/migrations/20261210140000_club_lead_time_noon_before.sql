-- =============================================================================
-- Délai de réservation — VERSION RETENUE (Thomas, 2026-08-09)
--
--   • Tous les jours   → réservable jusqu'à MIDI LA VEILLE.
--   • Créneau du LUNDI → jusqu'au VENDREDI précédent 12h00 : le club est fermé
--     le dimanche, une résa tombée samedi soir ne serait vue par personne
--     avant l'ouverture du lundi matin.
--
-- Remplace le préavis de 4 h de 20261210130000. Thomas veut une règle UNIQUE et
-- facile à annoncer (« avant midi la veille ») plutôt qu'un délai glissant que
-- personne ne peut dire simplement au téléphone.
--
-- Toujours UNE SEULE définition, consommée par l'AFFICHAGE
-- (get_club_discovery_availability) ET par l'ÉCRITURE (book_club_discovery) :
-- un créneau qu'on ne voit plus ne peut pas être réservé par une page restée
-- ouverte. Calcul en Europe/Paris — « midi » = midi à Verdun.
--
-- Vérifié après application (lundi 10/08, 11h51) :
--   créneau                butoir calculé        état
--   lundi   10/08 14:00    vendredi 07 à 12:00   trop tard
--   mardi   11/08 09:00    lundi    10 à 12:00   réservable (butoir dans 9 min)
--   samedi  15/08 09:00    vendredi 14 à 12:00   réservable
--   LUNDI   17/08 10:00    vendredi 14 à 12:00   réservable
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
        -- isodow 1 = lundi → butoir au vendredi précédent (J-3) midi.
        when extract(isodow from (p_slot_start at time zone 'Europe/Paris')) = 1
          then ((p_slot_start at time zone 'Europe/Paris')::date - 3) + time '12:00'
        -- tous les autres jours → midi la veille (J-1).
        else ((p_slot_start at time zone 'Europe/Paris')::date - 1) + time '12:00'
      end
    ) at time zone 'Europe/Paris'
$$;

comment on function public.club_slot_bookable(timestamptz) is
  'RDV découverte du club : créneau encore réservable ? Midi la veille pour tous les jours ; lundi = avant le vendredi précédent 12h00 (dimanche fermé). Europe/Paris. Source unique — utilisée par get_club_discovery_availability et book_club_discovery.';
