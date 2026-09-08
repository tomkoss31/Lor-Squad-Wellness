-- =============================================================================
-- « Une seule personne a partir de 16h » — la capacite devient reglable PAR
-- PLAGE, et les horaires du 08/09.
--
-- LA DEMANDE (Thomas, 08/09) : mardi ouvert jusqu'a 18h et vendredi jusqu'a
-- 17h, mais UNE SEULE personne a partir de 16h ; samedi ferme a 11h ; les
-- autres jours inchanges.
--
-- POURQUOI CE N'ETAIT PAS QU'UN REGLAGE. `discovery.capacity` est UN SEUL
-- nombre pour tout le club (2 = Thomas + Melanie, cf. la regle « 2 places =
-- 2 coachs »). Rien ne permettait de dire « 2 le matin, 1 le soir ».
--
-- LA FORME RETENUE : une plage accepte un TROISIEME element optionnel, sa
-- capacite.
--     "2": [ ["08:00","15:00"], ["16:00","18:00","1"] ]
-- Sans lui, la capacite globale du club s'applique — les journees existantes
-- ne changent donc pas de comportement.
--
-- Un creneau produit par DEUX plages garde la PLUS PETITE capacite
-- (`min(cap)` dans `tz_slots`). Sans ce garde-fou, une heure charniere
-- apparaitrait deux fois dans la liste, avec deux capacites differentes.
--
-- La borne de fin EST un creneau propose : `generate_series` inclut son
-- extremite quand elle tombe sur un pas. C'etait deja le cas avant (une
-- journee 08:00-15:00 propose bien un RDV a 15:00) — on garde la convention.
-- Consequence a connaitre : samedi 08:30-11:00 propose 08:30, 09:30 et 10:30,
-- et ce dernier finit a 11:15 (duree 45 min).
--
-- L'ECRITURE EST COUVERTE : `book_club_discovery` verifie `remaining > 0` en
-- appelant cette fonction, donc la limite n'est pas seulement d'affichage.
-- Le front n'a rien a changer : il affiche deja « 1 place » en orange a partir
-- de `remaining` (ReserverClubPage).
-- =============================================================================

create or replace function public.get_club_discovery_availability(p_slug text, p_days integer default 21)
 returns table(slot_start timestamp with time zone, slot_end timestamp with time zone, remaining integer, capacity integer)
 language plpgsql
 security definer
 set search_path to 'public', 'extensions'
as $function$
declare
  v_club public.clubs; v_disc jsonb;
  v_cap int; v_step int; v_open date; v_dur int;
  v_tz text := 'Europe/Paris';
  v_from date; v_to date; v_coachs uuid[];
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

  if v_disc ? 'coach_user_ids' then
    select coalesce(array_agg(x::uuid), '{}'::uuid[]) into v_coachs
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
    select d.d, (r->>0) as t_start, (r->>1) as t_end,
           coalesce((r->>2)::int, v_cap) as cap
    from days d
    cross join lateral jsonb_array_elements(
      coalesce(
        v_disc->'hours_by_date'->to_char(d.d,'YYYY-MM-DD'),
        v_disc->'hours'->(d.dow::text),
        '[]'::jsonb)) as r
  ),
  local_slots as (
    select gs as ss_local, rg.cap from ranges rg
    cross join lateral generate_series(
      (rg.d::text||' '||rg.t_start)::timestamp,
      (rg.d::text||' '||rg.t_end)::timestamp,
      make_interval(mins => v_step)) as gs
  ),
  tz_slots as (
    select (ss_local at time zone v_tz) as ss, min(cap)::int as cap
    from local_slots group by 1
  ),
  booked as (
    select rb.slot_start, sum(coalesce(rb.people_count, 1))::int as places
    from public.rdv_bookings rb
    where rb.club_id = v_club.id and rb.status <> 'canceled'
    group by rb.slot_start
  ),
  occupations as (
    select f.due_date as bs,
           f.due_date + make_interval(mins => coalesce(f.duration_min, 60)) as be, 1 as personnes
    from public.follow_ups f join public.clients c on c.id = f.client_id
    where c.distributor_id = any(v_coachs)
      and coalesce(f.status,'') in ('scheduled','pending')
      and f.due_date >= v_from::timestamp at time zone v_tz
    union all
    select pr.rdv_date, pr.rdv_date + make_interval(mins => coalesce(pr.duration_min, 60)), 1
    from public.prospects pr
    where pr.distributor_id = any(v_coachs)
      and coalesce(pr.status,'') = 'scheduled'
      and pr.rdv_date >= v_from::timestamp at time zone v_tz
    union all
    select rb2.slot_start, rb2.slot_end, coalesce(rb2.people_count, 1)
    from public.rdv_bookings rb2
    where rb2.coach_user_id = any(v_coachs) and rb2.club_id is null
      and rb2.status <> 'canceled'
      and rb2.slot_start >= v_from::timestamp at time zone v_tz
    union all
    select cr.scheduled_at, cr.scheduled_at + make_interval(mins => 60), 1
    from public.club_call_registrations cr
    where cr.coach_user_id = any(v_coachs) and cr.scheduled_at is not null
      and cr.scheduled_at >= v_from::timestamp at time zone v_tz
  ),
  prises as (
    select ts.ss, coalesce(sum(o.personnes), 0)::int as n
    from tz_slots ts
    left join occupations o on ts.ss < o.be and o.bs < ts.ss + make_interval(mins => v_dur)
    group by ts.ss
  )
  select ts.ss, ts.ss + make_interval(mins => v_step),
         greatest(0, ts.cap - coalesce(bk.places,0) - coalesce(pr.n,0)), ts.cap
  from tz_slots ts
  left join booked bk on bk.slot_start = ts.ss
  left join prises pr on pr.ss = ts.ss
  where public.club_slot_bookable(ts.ss)
  order by ts.ss;
end $function$;

update public.clubs
   set settings = jsonb_set(
         settings,
         '{discovery,hours}',
         jsonb_build_object(
           '1', jsonb_build_array(jsonb_build_array('08:00','15:00')),
           '2', jsonb_build_array(jsonb_build_array('08:00','15:00'),
                                  jsonb_build_array('16:00','18:00','1')),
           '3', jsonb_build_array(jsonb_build_array('08:00','15:00')),
           '4', jsonb_build_array(jsonb_build_array('08:00','15:00')),
           '5', jsonb_build_array(jsonb_build_array('08:00','15:00'),
                                  jsonb_build_array('16:00','17:00','1')),
           '6', jsonb_build_array(jsonb_build_array('08:30','11:00'))
         )
       )
 where slug = 'verdun';
