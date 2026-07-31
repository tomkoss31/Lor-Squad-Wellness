-- MIGRATION 1c-db — Réservation atomique d'une séance découverte "club".
-- Insère dans rdv_bookings SOUS VERROU par créneau (pg_advisory_xact_lock),
-- après re-vérification de la capacité → jamais de surbooking même en cas de
-- réservations simultanées. Retourne l'id créé, ou NULL si le créneau est plein.
-- Appelée par l'edge book-club-discovery (qui gère ensuite email + notif admins).

-- NB p_people_count en `int` (et non smallint) : un nombre JSON envoyé par
-- PostgREST se résout en integer — avec smallint, l'appel RPC échouait en
-- « function does not exist ».
create or replace function public.book_club_discovery(
  p_club_id      uuid,
  p_slot_start   timestamptz,
  p_slot_end     timestamptz,
  p_first_name   text,
  p_contact      text,
  p_people_count int,
  p_partner      text,
  p_objectif     text
) returns uuid
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_cap int;
  v_cnt int;
  v_id  uuid;
begin
  -- Sérialise les réservations concurrentes sur le MÊME créneau du MÊME club.
  perform pg_advisory_xact_lock(hashtextextended(p_club_id::text || '|' || p_slot_start::text, 0));

  select coalesce((settings->'discovery'->>'capacity')::int, 3)
    into v_cap
    from public.clubs where id = p_club_id;
  if v_cap is null then
    return null; -- club inconnu
  end if;

  select count(*) into v_cnt
    from public.rdv_bookings
   where club_id = p_club_id and status <> 'canceled' and slot_start = p_slot_start;

  if v_cnt >= v_cap then
    return null; -- complet
  end if;

  insert into public.rdv_bookings(
    coach_user_id, coach_slug, club_id, first_name, contact, mode,
    slot_start, slot_end, status, people_count, partner_first_name, objectif
  ) values (
    null, null, p_club_id, p_first_name, nullif(p_contact,''), 'presentiel',
    p_slot_start, p_slot_end, 'requested',
    least(greatest(coalesce(p_people_count,1),1),2)::smallint, nullif(p_partner,''), nullif(p_objectif,'')
  )
  returning id into v_id;

  return v_id;
end $$;

grant execute on function public.book_club_discovery(uuid,timestamptz,timestamptz,text,text,int,text,text)
  to anon, authenticated;
