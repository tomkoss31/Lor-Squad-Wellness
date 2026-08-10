-- =============================================================================
-- Déplacer un RDV découverte DEPUIS L'APP (demande de Mélanie, 2026-08-09)
--
-- Jusqu'ici le coach ne pouvait que confirmer ou annuler : changer une heure
-- imposait d'annuler puis de rappeler. Or le conflit naît souvent APRÈS la
-- réservation — quelqu'un réserve mardi 9h, deux jours plus tard on pose un
-- suivi à 9h. Le créneau n'était pas proposé au moment de la résa, mais
-- l'agenda a bougé depuis.
--
-- Jumeau de reschedule_club_booking (côté prospect, autorisé par son jeton),
-- mais autorisé par le RÔLE : seul un admin actif peut déplacer.
--
-- DIFFÉRENCE VOULUE : le délai de réservation (club_slot_bookable) ne
-- s'applique PAS au coach. Il a le droit de caler quelqu'un demain matin s'il
-- l'a eu au téléphone — « midi la veille » protège des réservations surprises
-- venues du site, pas des décisions de l'équipe. Seuls la capacité et le passé
-- restent opposables.
-- =============================================================================

create or replace function public.coach_reschedule_club_booking(
  p_booking_id uuid,
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
  -- security definer contourne la RLS : ce contrôle est la SEULE barrière.
  if not exists (
    select 1 from public.users
     where id = auth.uid() and role = 'admin' and active
  ) then
    return 'forbidden';
  end if;

  select * into v_b
    from public.rdv_bookings
   where id = p_booking_id and status <> 'canceled'
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

  -- La résa déplacée s'exclut elle-même : sinon elle se verrait comme un
  -- obstacle à son propre déplacement.
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
         reminder_email_sent_at = null   -- le rappel J-1 doit repartir
   where id = v_b.id;

  return 'ok';
end $function$;

comment on function public.coach_reschedule_club_booking(uuid, timestamptz, timestamptz) is
  'Déplace un RDV découverte depuis l''app (admin actif uniquement). Même verrou et même contrôle de capacité que la version prospect ; le délai de réservation ne s''applique pas au coach.';

grant execute on function public.coach_reschedule_club_booking(uuid, timestamptz, timestamptz) to authenticated;
