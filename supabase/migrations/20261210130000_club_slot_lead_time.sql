-- =============================================================================
-- Délai de réservation des RDV découverte (règle Thomas, 2026-08-09)
--
--   • Créneau du LUNDI  → réservable jusqu'au VENDREDI précédent 12h00.
--     Le club est fermé le dimanche : sans ce verrou, une réservation tombée
--     samedi soir pour lundi matin ne serait vue par personne avant l'ouverture.
--   • Tous les autres jours → au moins 4 HEURES à l'avance.
--
-- UNE SEULE définition de la règle, dans club_slot_bookable(), consommée par
-- l'AFFICHAGE (get_club_discovery_availability) ET par l'ÉCRITURE
-- (book_club_discovery). Les deux ne peuvent donc pas diverger : un créneau
-- qu'on ne voit plus ne peut pas être réservé par une page restée ouverte.
--
-- Tout est calculé en Europe/Paris : « vendredi midi » = midi à Verdun.
--
-- Vérifié après application (10/08, un lundi) :
--   lundi 10/08  → refusé (butoir vendredi 07/08 12h00 dépassé)
--   lundi 17/08  → accepté (butoir vendredi 15/08 12h00 à venir)
--   mardi 11/08  → accepté ; maintenant +1 h → refusé ; hier → refusé
-- =============================================================================

create or replace function public.club_slot_bookable(p_slot_start timestamptz)
returns boolean
language sql
stable
set search_path to 'public'
as $$
  select
    p_slot_start > now()
    and case
      -- isodow 1 = lundi. Butoir : vendredi précédent (J-3) à 12h00 locales.
      when extract(isodow from (p_slot_start at time zone 'Europe/Paris')) = 1
        then now() < (
          ((p_slot_start at time zone 'Europe/Paris')::date - 3) + time '12:00'
        ) at time zone 'Europe/Paris'
      else p_slot_start >= now() + interval '4 hours'
    end
$$;

comment on function public.club_slot_bookable(timestamptz) is
  'RDV découverte du club : un créneau est-il encore réservable ? Lundi = avant le vendredi précédent 12h00 (Europe/Paris) ; sinon 4 h de préavis. Source unique de la règle.';

grant execute on function public.club_slot_bookable(timestamptz) to anon, authenticated, service_role;

-- ─── L'AFFICHAGE applique la règle ───────────────────────────────────────────
-- Seul changement vs 20261210120000 : le `where ts.ss >= now()` devient
-- `where public.club_slot_bookable(ts.ss)`. Le corps est repris à l'identique.

create or replace function public.get_club_discovery_availability(p_slug text, p_days integer default 21)
returns table(slot_start timestamptz, slot_end timestamptz, remaining integer, capacity integer)
language plpgsql security definer set search_path to 'public', 'extensions'
as $function$
declare
  v_club public.clubs; v_disc jsonb;
  v_cap int; v_step int; v_open date; v_dur int;
  v_tz text := 'Europe/Paris'; v_from date; v_to date; v_block uuid[];
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

  if v_disc ? 'agenda_block_user_ids' then
    select coalesce(array_agg(x::uuid), '{}'::uuid[]) into v_block
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
    from days d cross join lateral jsonb_array_elements(
      coalesce(v_disc->'hours'->(d.dow::text), '[]'::jsonb)) as r
  ),
  local_slots as (
    select gs as ss_local from ranges rg cross join lateral generate_series(
      (rg.d::text||' '||rg.t_start)::timestamp,
      (rg.d::text||' '||rg.t_end)::timestamp,
      make_interval(mins => v_step)) as gs
  ),
  tz_slots as (select (ss_local at time zone v_tz) as ss from local_slots),
  booked as (
    select rb.slot_start, count(*)::int as cnt from public.rdv_bookings rb
    where rb.club_id = v_club.id and rb.status <> 'canceled' group by rb.slot_start
  ),
  busy as (
    select f.due_date as bs, f.due_date + make_interval(mins => coalesce(f.duration_min, 60)) as be
    from public.follow_ups f join public.clients c on c.id = f.client_id
    where c.distributor_id = any(v_block) and coalesce(f.status,'') in ('scheduled','pending')
      and f.due_date >= v_from::timestamp at time zone v_tz
    union all
    select pr.rdv_date, pr.rdv_date + make_interval(mins => coalesce(pr.duration_min, 60))
    from public.prospects pr
    where pr.distributor_id = any(v_block) and coalesce(pr.status,'') = 'scheduled'
      and pr.rdv_date >= v_from::timestamp at time zone v_tz
    union all
    select rb2.slot_start, rb2.slot_end from public.rdv_bookings rb2
    where rb2.coach_user_id = any(v_block) and rb2.status <> 'canceled'
      and rb2.slot_start >= v_from::timestamp at time zone v_tz
    union all
    select cr.scheduled_at, cr.scheduled_at + make_interval(mins => 60)
    from public.club_call_registrations cr
    where cr.coach_user_id = any(v_block) and cr.scheduled_at is not null
      and cr.scheduled_at >= v_from::timestamp at time zone v_tz
  )
  select ts.ss, ts.ss + make_interval(mins => v_step), v_cap - coalesce(bk.cnt,0), v_cap
  from tz_slots ts left join booked bk on bk.slot_start = ts.ss
  where public.club_slot_bookable(ts.ss)
    and not exists (
      select 1 from busy b where ts.ss < b.be and b.bs < ts.ss + make_interval(mins => v_dur)
    )
  order by ts.ss;
end $function$;

-- ─── L'ÉCRITURE applique la MÊME règle ───────────────────────────────────────
-- Sans ce garde-fou, une page laissée ouverte le vendredi après-midi pourrait
-- encore réserver un lundi : le créneau n'est plus à l'écran, mais rien
-- n'empêchait l'insert. Retourne null comme pour un créneau complet.
create or replace function public.book_club_discovery(
  p_club_id uuid, p_slot_start timestamptz, p_slot_end timestamptz,
  p_first_name text, p_contact text, p_people_count integer,
  p_partner text, p_objectif text
) returns uuid
language plpgsql security definer set search_path to 'public', 'extensions'
as $function$
declare v_cap int; v_cnt int; v_id uuid;
begin
  -- Vérifié AVANT le verrou : inutile de sérialiser des demandes déjà refusées.
  if not public.club_slot_bookable(p_slot_start) then
    return null;
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_club_id::text || '|' || p_slot_start::text, 0));

  select coalesce((settings->'discovery'->>'capacity')::int, 3) into v_cap
    from public.clubs where id = p_club_id;
  if v_cap is null then return null; end if;

  select count(*) into v_cnt from public.rdv_bookings
   where club_id = p_club_id and status <> 'canceled' and slot_start = p_slot_start;
  if v_cnt >= v_cap then return null; end if;

  insert into public.rdv_bookings(
    coach_user_id, coach_slug, club_id, first_name, contact, mode,
    slot_start, slot_end, status, people_count, partner_first_name, objectif
  ) values (
    null, null, p_club_id, p_first_name, nullif(p_contact,''), 'presentiel',
    p_slot_start, p_slot_end, 'requested',
    least(greatest(coalesce(p_people_count,1),1),2)::smallint, nullif(p_partner,''), nullif(p_objectif,'')
  ) returning id into v_id;

  return v_id;
end $function$;
