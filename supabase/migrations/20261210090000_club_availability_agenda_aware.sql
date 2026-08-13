-- =============================================================================
-- RDV du club — brique 2 : les créneaux publics tiennent compte de l'agenda coach
-- (chantier « RDV du club », 2026-08-09).
-- =============================================================================
--
-- Avant : get_club_discovery_availability ne retirait QUE les réservations club
-- déjà prises. Un suivi client ou un bilan déjà posé dans l'agenda La Base 360
-- ne bloquait rien → un prospect pouvait réserver une séance découverte pile
-- pendant un RDV existant.
--
-- Après : un créneau qui chevauche un rendez-vous du/des coach(s) du club
-- disparaît de la disponibilité publique. Trois sources d'occupation :
--   • follow_ups (suivis clients)     → via clients.distributor_id
--   • prospects.rdv_date (RDV agenda) → via prospects.distributor_id
--   • rdv_bookings du coach           → via coach_user_id
--
-- QUI bloque : par défaut le PROPRIÉTAIRE du club. Configurable sans redéploiement
-- via settings.discovery.agenda_block_user_ids (tableau d'uuid) — mettre [] pour
-- désactiver complètement le mécanisme.
--
-- Signature et colonnes de retour INCHANGÉES : le tunnel public /reserver (en
-- prod) et l'écran /rdv-club continuent d'appeler la fonction à l'identique.
--
-- Mesuré avant application sur le club de Verdun (fenêtre 14 jours) :
-- 66 créneaux → 61, soit 5 créneaux retirés correspondant à de vrais suivis.
-- =============================================================================

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
  v_block uuid[];
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

  -- Agendas qui bloquent : la clé explicite si elle existe (même vide), sinon
  -- le propriétaire du club.
  if v_disc ? 'agenda_block_user_ids' then
    select coalesce(array_agg(x::uuid), '{}'::uuid[])
      into v_block
      from jsonb_array_elements_text(v_disc->'agenda_block_user_ids') x;
  else
    v_block := array[v_club.owner_user_id];
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
  booked as (
    select rb.slot_start, count(*)::int as cnt
    from public.rdv_bookings rb
    where rb.club_id = v_club.id and rb.status <> 'canceled'
    group by rb.slot_start
  ),
  -- Occupations réelles du/des coach(s) du club, toutes sources confondues.
  busy as (
    select f.due_date as bs,
           f.due_date + make_interval(mins => coalesce(f.duration_min, 60)) as be
    from public.follow_ups f
    join public.clients c on c.id = f.client_id
    where c.distributor_id = any(v_block)
      and coalesce(f.status,'') in ('scheduled','pending')
      and f.due_date >= v_from::timestamp at time zone v_tz
    union all
    select pr.rdv_date,
           pr.rdv_date + make_interval(mins => coalesce(pr.duration_min, 60))
    from public.prospects pr
    where pr.distributor_id = any(v_block)
      and coalesce(pr.status,'') = 'scheduled'
      and pr.rdv_date >= v_from::timestamp at time zone v_tz
    union all
    select rb2.slot_start, rb2.slot_end
    from public.rdv_bookings rb2
    where rb2.coach_user_id = any(v_block)
      and rb2.status <> 'canceled'
      and rb2.slot_start >= v_from::timestamp at time zone v_tz
  )
  select ts.ss, ts.ss + make_interval(mins => v_step),
         v_cap - coalesce(bk.cnt,0), v_cap
  from tz_slots ts
  left join booked bk on bk.slot_start = ts.ss
  where ts.ss >= now()
    and not exists (
      select 1 from busy b
      where ts.ss < b.be
        and b.bs < ts.ss + make_interval(mins => v_dur)
    )
  order by ts.ss;
end $function$;
