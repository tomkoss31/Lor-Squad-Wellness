-- =============================================================================
-- Un rendez-vous de coach retire une place du club (2026-08-11)
--
-- LE CONSTAT
--
-- Mylène a réservé un bilan avec Mélanie le 18 août à 10 h, depuis le tunnel
-- colis. Côté Breakfast Club, ce créneau affichait toujours « 2 places ».
--
-- Deux raisons :
--   1. `booked` ne comptait que `where club_id = v_club.id`. Un RDV pris sur
--      /rdv ou /colis porte `club_id = NULL` — invisible.
--   2. Les occupations d'un coach vivaient dans `busy`, qui FAIT DISPARAÎTRE le
--      créneau au lieu d'en retirer une place. Et `busy` ne regardait que le
--      propriétaire du club (Thomas), jamais Mélanie — or c'est elle qui reçoit
--      tous les leads du colis (`DEFAULT_COACH_SLUG = "melanie"`).
--
-- CE QU'ON CHANGE
--
-- Les occupations d'un coach passent de « ça cache le créneau » à « ça prend
-- une place ». C'est plus juste ET plus généreux : si Thomas est en suivi à
-- 10 h et que Mélanie est libre, le créneau reste ouvert avec 1 place, au lieu
-- de disparaître pour tout le monde. Quand les deux sont pris, il tombe à 0 et
-- s'affiche « Complet » tout seul.
--
-- L'UNITÉ DE COMPTE : LA PERSONNE
--
-- Deux décisions de Thomas se tendaient :
--   • « on prend deux places » pour un couple  → une place = un siège ;
--   • « visio, c'est du temps pris »           → une place = du temps de coach.
-- On tranche : TOUT CE QUI OCCUPE LE CRÉNEAU CONSOMME SON NOMBRE DE PERSONNES.
-- Une réservation club à deux prend 2 places ; un RDV coach en prend autant que
-- de personnes attendues (1 par défaut) ; un suivi ou un rituel en prend 1.
-- Ça satisfait les deux réponses, et ça reste explicable en une phrase.
--
-- ⚠️ Ceci ANNULE la décision de 20261210160000 (« comptage en réservations, pas
--    en personnes »). C'est voulu, sur retour Thomas du 2026-08-11.
--
-- QUELS COACHS
--
-- Nouveau réglage `settings.discovery.coach_user_ids`. Explicite plutôt que
-- déduit du rôle : un futur admin nommé pour une autre raison ne doit pas se
-- mettre à consommer des places du club sans qu'on l'ait décidé.
-- À défaut, on retombe sur le propriétaire seul — le comportement d'avant.
-- =============================================================================

-- 1. Les deux coachs du club de Verdun : Thomas (propriétaire) et Mélanie.
--    L'agenda partagé viendra quand il y aura du monde sur le BBC ; d'ici là
--    ces deux-là tiennent le club.
update public.clubs
set settings = jsonb_set(
      settings,
      '{discovery,coach_user_ids}',
      '["656dcf35-4859-4a70-9d20-990104813423","6e552738-3fe5-4cdb-a4c8-15c5d7dca036"]'::jsonb,
      true)
where slug is not null
  and settings->'discovery' is not null;

-- 2. La disponibilité publique.
create or replace function public.get_club_discovery_availability(p_slug text, p_days integer default 21)
returns table(slot_start timestamptz, slot_end timestamptz, remaining integer, capacity integer)
language plpgsql
security definer
set search_path to 'public', 'extensions'
as $function$
declare
  v_club public.clubs;
  v_disc jsonb;
  v_cap int; v_step int; v_open date; v_dur int;
  v_tz text := 'Europe/Paris';
  v_from date; v_to date;
  v_coachs uuid[];
begin
  select * into v_club from public.clubs where slug = p_slug and active limit 1;
  if not found then return; end if;

  v_disc := coalesce(v_club.settings->'discovery', '{}'::jsonb);
  v_cap  := coalesce((v_disc->>'capacity')::int, 3);
  v_step := coalesce((v_disc->>'slot_step_min')::int, 30);
  v_dur  := coalesce((v_disc->>'duration_min')::int, v_step);
  v_open := coalesce((v_disc->>'opening_date')::date, current_date);
  v_from := greatest(current_date, v_open);
  v_to   := v_from + make_interval(days => p_days);

  -- Les coachs dont l'agenda pèse sur les places du club.
  if v_disc ? 'coach_user_ids' then
    select coalesce(array_agg(x::uuid), '{}'::uuid[])
      into v_coachs
      from jsonb_array_elements_text(v_disc->'coach_user_ids') x;
  else
    v_coachs := array[v_club.owner_user_id];
  end if;

  return query
  with days as (
    select gd::date as d, extract(isodow from gd)::int as dow
    from generate_series(v_from::timestamp, v_to::timestamp, interval '1 day') gd
    where not (coalesce(v_disc->'holidays','[]'::jsonb) ? to_char(gd::date,'YYYY-MM-DD'))
  ),
  ranges as (
    select d.d, (r->>0) as t_start, (r->>1) as t_end
    from days d
    cross join lateral jsonb_array_elements(
      coalesce(v_disc->'hours'->(d.dow::text), '[]'::jsonb)) as r
  ),
  local_slots as (
    select gs as ss_local
    from ranges rg
    cross join lateral generate_series(
      (rg.d::text||' '||rg.t_start)::timestamp,
      (rg.d::text||' '||rg.t_end)::timestamp,
      make_interval(mins => v_step)) as gs
  ),
  tz_slots as (select (ss_local at time zone v_tz) as ss from local_slots),

  -- Les réservations du club, calées sur le créneau. On somme les PERSONNES :
  -- un couple prend deux places (retour Thomas 2026-08-11).
  booked as (
    select rb.slot_start, sum(coalesce(rb.people_count, 1))::int as places
    from public.rdv_bookings rb
    where rb.club_id = v_club.id and rb.status <> 'canceled'
    group by rb.slot_start
  ),

  -- Tout ce qui occupe un coach du club. Chaque ligne porte son nombre de
  -- personnes ; le test est un CHEVAUCHEMENT, pas une égalité d'horaire — un
  -- rendez-vous de 10 h 30 mord sur le créneau de 10 h.
  occupations as (
    -- suivis clients
    select f.due_date as bs,
           f.due_date + make_interval(mins => coalesce(f.duration_min, 60)) as be,
           1 as personnes
    from public.follow_ups f
    join public.clients c on c.id = f.client_id
    where c.distributor_id = any(v_coachs)
      and coalesce(f.status,'') in ('scheduled','pending')
      and f.due_date >= v_from::timestamp at time zone v_tz
    union all
    -- rendez-vous posés à la main dans l'agenda
    select pr.rdv_date,
           pr.rdv_date + make_interval(mins => coalesce(pr.duration_min, 60)),
           1
    from public.prospects pr
    where pr.distributor_id = any(v_coachs)
      and coalesce(pr.status,'') = 'scheduled'
      and pr.rdv_date >= v_from::timestamp at time zone v_tz
    union all
    -- RDV pris sur /rdv ou /colis : c'est LE cas qui manquait.
    -- La visio compte aussi : c'est du temps de coach pris (retour Thomas).
    select rb2.slot_start, rb2.slot_end, coalesce(rb2.people_count, 1)
    from public.rdv_bookings rb2
    where rb2.coach_user_id = any(v_coachs)
      and rb2.club_id is null
      and rb2.status <> 'canceled'
      and rb2.slot_start >= v_from::timestamp at time zone v_tz
    union all
    -- rituels BBC animés par un coach
    select cr.scheduled_at,
           cr.scheduled_at + make_interval(mins => 60),
           1
    from public.club_call_registrations cr
    where cr.coach_user_id = any(v_coachs)
      and cr.scheduled_at is not null
      and cr.scheduled_at >= v_from::timestamp at time zone v_tz
  ),
  prises as (
    select ts.ss, coalesce(sum(o.personnes), 0)::int as n
    from tz_slots ts
    left join occupations o
      on ts.ss < o.be and o.bs < ts.ss + make_interval(mins => v_dur)
    group by ts.ss
  )
  select ts.ss,
         ts.ss + make_interval(mins => v_step),
         greatest(0, v_cap - coalesce(bk.places,0) - coalesce(pr.n,0)),
         v_cap
  from tz_slots ts
  left join booked bk on bk.slot_start = ts.ss
  left join prises pr on pr.ss = ts.ss
  -- Délai de réservation : même source que l'écriture.
  where public.club_slot_bookable(ts.ss)
  order by ts.ss;
end $function$;

-- 3. Le contrôle à l'ÉCRITURE. Il doit compter exactement comme l'affichage,
--    sinon on propose un créneau que la réservation refuse — l'app a déjà vécu
--    ce bug une fois sur /rdv (26 créneaux proposés puis rejetés).
create or replace function public.is_club_discovery_slot_free(p_club_id uuid, p_slot_start timestamptz)
returns boolean
language plpgsql
stable
security definer
set search_path to 'public', 'extensions'
as $function$
declare
  v_club public.clubs;
  v_disc jsonb;
  v_cap int; v_dur int;
  v_coachs uuid[];
  v_prises int;
begin
  select * into v_club from public.clubs where id = p_club_id limit 1;
  if not found then return false; end if;

  v_disc := coalesce(v_club.settings->'discovery', '{}'::jsonb);
  v_cap  := coalesce((v_disc->>'capacity')::int, 3);
  v_dur  := coalesce((v_disc->>'duration_min')::int,
                     coalesce((v_disc->>'slot_step_min')::int, 30));

  if v_disc ? 'coach_user_ids' then
    select coalesce(array_agg(x::uuid), '{}'::uuid[])
      into v_coachs
      from jsonb_array_elements_text(v_disc->'coach_user_ids') x;
  else
    v_coachs := array[v_club.owner_user_id];
  end if;

  select
    -- les réservations du club sur ce créneau, en personnes
    coalesce((select sum(coalesce(rb.people_count, 1))::int
              from public.rdv_bookings rb
              where rb.club_id = p_club_id
                and rb.status <> 'canceled'
                and rb.slot_start = p_slot_start), 0)
    -- + tout ce qui occupe un coach du club et chevauche le créneau
    + coalesce((select sum(o.personnes)::int from (
        select f.due_date as bs,
               f.due_date + make_interval(mins => coalesce(f.duration_min, 60)) as be,
               1 as personnes
        from public.follow_ups f
        join public.clients c on c.id = f.client_id
        where c.distributor_id = any(v_coachs)
          and coalesce(f.status,'') in ('scheduled','pending')
        union all
        select pr.rdv_date,
               pr.rdv_date + make_interval(mins => coalesce(pr.duration_min, 60)),
               1
        from public.prospects pr
        where pr.distributor_id = any(v_coachs)
          and coalesce(pr.status,'') = 'scheduled'
        union all
        select rb2.slot_start, rb2.slot_end, coalesce(rb2.people_count, 1)
        from public.rdv_bookings rb2
        where rb2.coach_user_id = any(v_coachs)
          and rb2.club_id is null
          and rb2.status <> 'canceled'
        union all
        select cr.scheduled_at,
               cr.scheduled_at + make_interval(mins => 60),
               1
        from public.club_call_registrations cr
        where cr.coach_user_id = any(v_coachs)
          and cr.scheduled_at is not null
      ) o
      where p_slot_start < o.be
        and o.bs < p_slot_start + make_interval(mins => v_dur)), 0)
  into v_prises;

  return (v_cap - v_prises) > 0;
end $function$;
