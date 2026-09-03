-- Un rendez-vous déplacé reste CONFIRMÉ, et son rappel SMS repart (03/09/2026).
--
-- Deux défauts corrigés en même temps, tous deux invisibles à la lecture :
--
-- 1. La procédure forçait `status = 'requested'` : déplacer son créneau
--    remettait le rendez-vous en attente de validation. Or le rappel de la
--    veille ne part QUE sur les `confirmed`. Quelqu'un qui déplaçait croyait
--    son créneau calé et n'était jamais rappelé — un no-show fabriqué par le
--    système. Décision de Thomas le 03/09 : elle a déjà été acceptée une fois,
--    et la capacité est revérifiée juste au-dessus. On garde donc le statut
--    tel quel (un RDV encore en « demande » le reste, lui).
--
-- 2. `reminder_email_sent_at` était bien remis à zéro pour que le rappel
--    reparte sur la nouvelle date — mais pas `reminder_sms_sent_at`, colonne
--    ajoutée le 02/09 avec le chantier SMS, après cette procédure. Résultat :
--    un rendez-vous déplacé ne recevait plus jamais son SMS.
create or replace function public.reschedule_club_booking(
  p_token uuid,
  p_slot_start timestamptz,
  p_slot_end timestamptz
)
returns text
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
         -- statut inchangé : voir la note 1 en tête de fichier
         reminder_email_sent_at = null,
         reminder_sms_sent_at = null
   where id = v_b.id;

  return 'ok';
end $function$;
