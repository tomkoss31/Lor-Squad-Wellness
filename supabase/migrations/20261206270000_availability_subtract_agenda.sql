-- =============================================================================
-- Réservation publique : ne plus proposer des créneaux déjà pris (2026-07-27).
--
-- `get_coach_availability_by_slug` ne soustrayait que `rdv_bookings` — les
-- réservations venues du funnel lui-même. Elle ignorait complètement l'agenda
-- réel du coach : ni les RDV prospects (`prospects`), ni les RDV clients
-- (`follow_ups`). Un prospect pouvait donc réserver pile sur un rendez-vous
-- existant, et le coach le découvrait après coup.
--
-- Mesuré en prod avant correctif, sur les 14 prochains jours :
--   Mélanie  18 créneaux occupés proposés comme libres (sur 29 RDV futurs)
--   Thomas    8 (sur 10)
-- Soit 26 doubles réservations possibles.
--
-- Deux règles de cohérence appliquées ici :
--
--  1. LA DURÉE COMPTE. Un RDV d'une heure bloque une heure. On lit
--     `duration_min` du RDV, sinon le réglage « mes RDV durent X » du coach
--     (`users.default_rdv_minutes`), sinon 45 min — exactement la cascade du
--     front (resolveDuration).
--
--  2. MÊME DÉFINITION DE « HORS AGENDA » QUE L'APP. Un client arrêté, perdu,
--     en pause ou en suivi libre n'apparaît pas dans l'agenda (cf.
--     getClientActiveFollowUp et la migration dormant_exclude_paused_free) :
--     son RDV ne doit donc pas bloquer un créneau non plus. Sinon on aurait un
--     créneau refusé au public sans que rien ne s'affiche côté coach.
-- =============================================================================

create or replace function public.get_coach_availability_by_slug(
  p_slug text,
  p_days int default 14
)
returns table (slot_start timestamptz, slot_end timestamptz)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_slug text;
  v_user_id uuid;
  v_slot_min int := 30;
  v_default_min int := 45;
  v_days int := least(greatest(coalesce(p_days, 14), 1), 30);
begin
  v_slug := public.ls_normalize_slug(p_slug);
  if v_slug is null or length(v_slug) < 2 then
    return;
  end if;

  select id, coalesce(default_rdv_minutes, 45)
    into v_user_id, v_default_min
    from public.users
    where active = true
      and role in ('distributor', 'admin', 'referent')
      and public.ls_normalize_slug(split_part(coalesce(name, ''), ' ', 1)) = v_slug
    order by created_at asc
    limit 1;

  if v_user_id is null then
    return;
  end if;

  return query
  with days as (
    select (current_date + d)::date as day_date
    from generate_series(1, v_days) as d     -- dès demain
  ),
  avail as (
    select dd.day_date, a.start_min, a.end_min
    from days dd
    join public.coach_rdv_availability a
      on a.coach_user_id = v_user_id
     and a.weekday = extract(dow from dd.day_date)::int   -- 0=dim … 6=sam
  ),
  raw_slots as (
    select
      ((av.day_date + make_interval(mins => gs)) at time zone 'Europe/Paris') as s_start,
      ((av.day_date + make_interval(mins => gs + v_slot_min)) at time zone 'Europe/Paris') as s_end
    from avail av
    cross join lateral generate_series(av.start_min, av.end_min - v_slot_min, v_slot_min) as gs
  )
  select rs.s_start, rs.s_end
  from raw_slots rs
  where rs.s_start > now()
    -- (1) réservations déjà prises par le funnel public
    and not exists (
      select 1
      from public.rdv_bookings b
      where b.coach_user_id = v_user_id
        and b.status <> 'canceled'
        and b.slot_start < rs.s_end
        and b.slot_end > rs.s_start
    )
    -- (2) RDV prospects posés dans l'agenda du coach
    and not exists (
      select 1
      from public.prospects p
      where p.distributor_id = v_user_id
        and p.status = 'scheduled'
        and p.rdv_date < rs.s_end
        and p.rdv_date
            + make_interval(mins => coalesce(p.duration_min, v_default_min))
            > rs.s_start
    )
    -- (3) RDV clients (suivis programmés), hors clients « hors agenda »
    and not exists (
      select 1
      from public.follow_ups f
      join public.clients c on c.id = f.client_id
      where c.distributor_id = v_user_id
        and f.status in ('scheduled', 'pending')
        and coalesce(c.lifecycle_status, 'active') not in ('stopped', 'lost', 'paused')
        and coalesce(c.free_follow_up, false) = false
        and f.due_date < rs.s_end
        and f.due_date
            + make_interval(mins => coalesce(f.duration_min, v_default_min))
            > rs.s_start
    )
  order by rs.s_start;
end;
$$;

grant execute on function public.get_coach_availability_by_slug(text, int) to anon, authenticated;
