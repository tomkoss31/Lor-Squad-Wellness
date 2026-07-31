-- MIGRATION 1a — Dispo découverte "club" (Breakfast Club Verdun / La Base Nutrition).
-- Chantier : tunnel de réservation public "séance découverte" (site www.labase-nutrition.com).
-- Additive & réversible. N'affecte pas le funnel /rdv coach existant
-- (les résas club ont coach_user_id = null ; is_coach_slot_free compte par coach, is_club par club_id).

-- 1) Colonnes club sur la table de réservation existante (rdv_bookings)
alter table public.rdv_bookings
  add column if not exists club_id            uuid references public.clubs(id) on delete set null,
  add column if not exists people_count       smallint not null default 1,
  add column if not exists partner_first_name text,
  add column if not exists objectif           text;

alter table public.rdv_bookings
  drop constraint if exists rdv_bookings_people_count_chk;
alter table public.rdv_bookings
  add  constraint rdv_bookings_people_count_chk check (people_count between 1 and 2);

create index if not exists rdv_bookings_club_slot_idx
  on public.rdv_bookings(club_id, slot_start) where club_id is not null;

-- 2) Slug du club + unicité
update public.clubs set slug = 'verdun'
  where id = '4e10ba5e-aae0-4772-90eb-a2742dc4ad87' and slug is null;
create unique index if not exists clubs_slug_uidx on public.clubs(slug) where slug is not null;

-- 3) Config "séance découverte" dans settings.discovery (fusion, ne casse pas l'existant)
update public.clubs
set settings = settings || jsonb_build_object('discovery', jsonb_build_object(
  'capacity',      3,
  'opening_date',  '2026-09-07',
  'duration_min',  20,
  'slot_step_min', 30,
  'hours', jsonb_build_object(
    '1', jsonb_build_array(jsonb_build_array('07:30','10:30')),
    '2', jsonb_build_array(jsonb_build_array('07:30','10:30')),
    '3', jsonb_build_array(jsonb_build_array('07:30','10:30')),
    '4', jsonb_build_array(jsonb_build_array('07:30','10:30')),
    '5', jsonb_build_array(jsonb_build_array('07:30','10:30')),
    '6', jsonb_build_array(jsonb_build_array('08:00','10:30'))
  ),
  'holidays', jsonb_build_array(
    '2026-11-01','2026-11-11','2026-12-25',
    '2027-01-01','2027-03-29','2027-05-01','2027-05-06','2027-05-08',
    '2027-05-17','2027-07-14','2027-08-15','2027-11-01','2027-11-11','2027-12-25'
  )
))
where id = '4e10ba5e-aae0-4772-90eb-a2742dc4ad87';

-- 4) Fonction : vrais créneaux libres (horaires club − réservations, capacité-aware)
create or replace function public.get_club_discovery_availability(p_slug text, p_days int default 21)
returns table(slot_start timestamptz, slot_end timestamptz, remaining int, capacity int)
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_club public.clubs;
  v_disc jsonb;
  v_cap int; v_step int; v_open date;
  v_tz text := 'Europe/Paris';
  v_from date; v_to date;
begin
  select * into v_club from public.clubs where slug = p_slug and active limit 1;
  if not found then return; end if;

  v_disc := coalesce(v_club.settings->'discovery', '{}'::jsonb);
  v_cap  := coalesce((v_disc->>'capacity')::int, 3);
  v_step := coalesce((v_disc->>'slot_step_min')::int, 30);
  v_open := coalesce((v_disc->>'opening_date')::date, current_date);
  v_from := greatest(current_date, v_open);
  v_to   := v_from + make_interval(days => p_days);

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
  booked as (
    select rb.slot_start, count(*)::int as cnt
    from public.rdv_bookings rb
    where rb.club_id = v_club.id and rb.status <> 'canceled'
    group by rb.slot_start
  )
  select ts.ss, ts.ss + make_interval(mins => v_step),
         v_cap - coalesce(bk.cnt,0), v_cap
  from tz_slots ts
  left join booked bk on bk.slot_start = ts.ss
  where ts.ss >= now()
  order by ts.ss;
end $$;

-- 5) Fonction : un créneau est-il encore libre ? (garde-fou capacité, utilisée à la réservation)
create or replace function public.is_club_discovery_slot_free(p_club_id uuid, p_slot_start timestamptz)
returns boolean
language sql stable
security definer
set search_path = public, extensions
as $$
  select (
    coalesce((select (settings->'discovery'->>'capacity')::int from public.clubs where id = p_club_id), 3)
    - (select count(*) from public.rdv_bookings
        where club_id = p_club_id and status <> 'canceled' and slot_start = p_slot_start)
  ) > 0;
$$;

grant execute on function public.get_club_discovery_availability(text,int) to anon, authenticated;
grant execute on function public.is_club_discovery_slot_free(uuid, timestamptz) to anon, authenticated;
