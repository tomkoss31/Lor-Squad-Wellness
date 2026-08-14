-- =============================================================================
-- RDV du club — brique 5 : replanification atomique par le prospect lui-même.
-- (chantier « RDV du club », 2026-08-09)
-- =============================================================================
--
-- Même garde-fou que book_club_discovery : verrou consultatif sur (club, créneau)
-- puis recomptage de la capacité, pour que deux personnes qui déplacent leur RDV
-- au même moment ne puissent pas dépasser le nombre de places.
--
-- La réservation déplacée est exclue du comptage (sinon elle se bloquerait
-- elle-même sur un créneau complet où elle figure déjà).
--
-- Retourne un code lisible plutôt qu'une exception : 'ok' | 'not_found' |
-- 'past' | 'full'. Appelée uniquement par l'edge manage-club-booking.
-- =============================================================================

create or replace function public.reschedule_club_booking(
  p_token uuid,
  p_slot_start timestamptz,
  p_slot_end timestamptz
) returns text
language plpgsql
security definer
set search_path to 'public', 'extensions'
as $function$
declare
  v_b public.rdv_bookings;
  v_cap int;
  v_cnt int;
begin
  select * into v_b
    from public.rdv_bookings
   where manage_token = p_token and status <> 'canceled'
   limit 1;
  if not found then return 'not_found'; end if;
  if v_b.club_id is null then return 'not_found'; end if;
  if p_slot_start <= now() then return 'past'; end if;

  perform pg_advisory_xact_lock(
    hashtextextended(v_b.club_id::text || '|' || p_slot_start::text, 0));

  select coalesce((settings->'discovery'->>'capacity')::int, 3)
    into v_cap
    from public.clubs where id = v_b.club_id;
  if v_cap is null then return 'not_found'; end if;

  select count(*) into v_cnt
    from public.rdv_bookings
   where club_id = v_b.club_id
     and status <> 'canceled'
     and slot_start = p_slot_start
     and id <> v_b.id;

  if v_cnt >= v_cap then return 'full'; end if;

  update public.rdv_bookings
     set slot_start = p_slot_start,
         slot_end = p_slot_end,
         status = 'requested',
         reminder_email_sent_at = null
   where id = v_b.id;

  return 'ok';
end $function$;
