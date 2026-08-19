-- =============================================================================
-- Fermer une journée, ou changer ses horaires POUR CE JOUR-LÀ seulement.
--
-- Demande de Mélanie (19/08), arbitrée par Thomas :
--   • lundi 7 septembre  → aucune réservation (le club ouvre ce jour-là)
--   • mardi 8 septembre  → rien avant 11h, et on prolonge jusqu'à 15h
--
-- Fermer une journée entière existait DÉJÀ : `settings.discovery.holidays`.
-- Ce qui manquait, c'est de changer les HEURES d'une date précise : `hours`
-- est indexé par jour de la semaine (1 = lundi … 7 = dimanche), donc toucher
-- le mardi 8 aurait décalé TOUS les mardis de l'année.
--
-- D'où `hours_by_date`, lu en priorité sur `hours`. Une date qui y figure avec
-- un tableau vide `[]` ferme aussi la journée — deux façons d'écrire la même
-- chose, on garde `holidays` pour les jours fériés (plus lisible).
--
-- ⚠️ Le RDV de Céline (8/09 à 10h) tombe dans la tranche fermée et il est
-- CONSERVÉ : fermer un créneau empêche d'en prendre un nouveau, ça n'annule
-- jamais ce qui est déjà pris. Vérifié : c'est la seule réservation des deux
-- jours.
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
    select d.d, (r->>0) as t_start, (r->>1) as t_end
    from days d
    cross join lateral jsonb_array_elements(
      -- LA SEULE LIGNE QUI CHANGE : l'exception de la date passe avant
      -- l'horaire habituel du jour de la semaine.
      coalesce(
        v_disc->'hours_by_date'->to_char(d.d,'YYYY-MM-DD'),
        v_disc->'hours'->(d.dow::text),
        '[]'::jsonb)) as r
  ),
  local_slots as (
    select gs as ss_local from ranges rg
    cross join lateral generate_series(
      (rg.d::text||' '||rg.t_start)::timestamp,
      (rg.d::text||' '||rg.t_end)::timestamp,
      make_interval(mins => v_step)) as gs
  ),
  tz_slots as (select (ss_local at time zone v_tz) as ss from local_slots),
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
         greatest(0, v_cap - coalesce(bk.places,0) - coalesce(pr.n,0)), v_cap
  from tz_slots ts
  left join booked bk on bk.slot_start = ts.ss
  left join prises pr on pr.ss = ts.ss
  where public.club_slot_bookable(ts.ss)
  order by ts.ss;
end $function$;

-- ── Les deux dates demandées ────────────────────────────────────────────────
update public.clubs
   set settings = jsonb_set(
         jsonb_set(
           settings,
           '{discovery,holidays}',
           -- `- x` puis `||` : idempotent, la date n'entre jamais deux fois.
           ((coalesce(settings->'discovery'->'holidays','[]'::jsonb) - '2026-09-07')
             || '["2026-09-07"]'::jsonb)
         ),
         '{discovery,hours_by_date}',
         coalesce(settings->'discovery'->'hours_by_date','{}'::jsonb)
           || '{"2026-09-08": [["11:00","15:00"]]}'::jsonb
       )
 where slug = 'verdun';
