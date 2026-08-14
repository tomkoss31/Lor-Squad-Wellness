-- =============================================================================
-- Réservation atomique d'un créneau coach (2026-08-11)
--
-- LE TROU
--
-- `book-rdv` appelait `is_coach_slot_free`, puis faisait un INSERT séparé.
-- Entre les deux, une autre demande peut passer le même contrôle : les deux le
-- réussissent, les deux écrivent, et deux personnes se présentent au même
-- rendez-vous. La fenêtre est courte mais réelle — deux prospects qui
-- consultent la même page et tapent « Confirmer » à la même seconde.
--
-- Le Breakfast Club ne connaît pas ce problème : sa RPC `book_club_discovery`
-- prend un verrou consultatif puis recompte dans la MÊME transaction. On
-- remonte ici la même mécanique côté coach.
--
-- ─── PREMIÈRE BRIQUE DE LA CONVERGENCE DES DEUX TUNNELS ──────────────────────
-- Décision Thomas du 2026-08-11 : plutôt qu'une fusion d'un bloc — qui
-- toucherait les deux tunnels de production en même temps, dont celui qui
-- ramène les leads du colis — on remonte vers /rdv, une par une, les briques
-- que le Breakfast Club fait mieux :
--   1. le verrou anti-collision        <- CE FICHIER
--   2. le délai de réservation (midi la veille)
--   3. le .ics et l'agenda Google
--   4. le socle commun, une fois les trois premiers en place
--
-- Le verrou porte sur (coach, créneau) : deux réservations sur des créneaux
-- différents ne s'attendent pas. Il se relâche à la fin de la transaction —
-- pas de risque de verrou oublié.
-- =============================================================================

create or replace function public.book_coach_rdv(
  p_coach_user_id  uuid,
  p_slot_start     timestamptz,
  p_slot_end       timestamptz,
  p_first_name     text,
  p_contact        text,
  p_mode           text,
  p_coach_slug     text default null,
  p_online_bilan_id uuid default null,
  p_booking_type   text default null,
  p_metadata       jsonb default null
) returns uuid
language plpgsql
security definer
set search_path to 'public', 'extensions'
as $function$
declare
  v_id uuid;
begin
  -- Deux demandes sur le même créneau du même coach se sérialisent ici.
  perform pg_advisory_xact_lock(
    hashtext(p_coach_user_id::text),
    hashtext(p_slot_start::text)
  );

  -- Recontrôle SOUS le verrou : c'est ce qui rend l'ensemble atomique.
  -- Même fonction que l'affichage — une seule définition de « libre ».
  if not public.is_coach_slot_free(p_coach_user_id, p_slot_start, p_slot_end) then
    return null;  -- l'appelant traduit en 409 « créneau pris »
  end if;

  insert into public.rdv_bookings (
    coach_user_id, coach_slug, first_name, contact, mode,
    slot_start, slot_end, status, online_bilan_id,
    booking_type, metadata
  ) values (
    p_coach_user_id, p_coach_slug, p_first_name, p_contact, p_mode,
    p_slot_start, p_slot_end, 'requested', p_online_bilan_id,
    coalesce(p_booking_type, 'bilan'), p_metadata
  )
  returning id into v_id;

  return v_id;
end $function$;

revoke all on function public.book_coach_rdv(uuid, timestamptz, timestamptz, text, text, text, text, uuid, text, jsonb) from public;
grant execute on function public.book_coach_rdv(uuid, timestamptz, timestamptz, text, text, text, text, uuid, text, jsonb) to service_role;
