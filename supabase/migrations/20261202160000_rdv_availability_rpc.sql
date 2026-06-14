-- =============================================================================
-- RDV V2 — Brique 2 : RPC publique des créneaux libres par slug coach.
--
-- get_coach_availability_by_slug(slug, days) → créneaux de 30 min sur les N
-- prochains jours, = plages déclarées (coach_rdv_availability) MOINS les RDV
-- déjà pris (rdv_bookings non annulés) → anti-doublon. Fuseau Europe/Paris.
-- Réutilise la résolution slug→coach de get_coach_credibility_by_slug.
--
-- ⚠️ INERTE jusqu'à `supabase db push`. Lecture seule, SECURITY DEFINER,
-- n'expose que des créneaux (aucune donnée perso coach/prospect).
-- =============================================================================

begin;

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
  v_days int := least(greatest(coalesce(p_days, 14), 1), 30);
begin
  v_slug := public.ls_normalize_slug(p_slug);
  if v_slug is null or length(v_slug) < 2 then
    return;
  end if;

  select id
    into v_user_id
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
    and not exists (
      select 1
      from public.rdv_bookings b
      where b.coach_user_id = v_user_id
        and b.status <> 'canceled'
        and b.slot_start < rs.s_end
        and b.slot_end > rs.s_start
    )
  order by rs.s_start;
end;
$$;

grant execute on function public.get_coach_availability_by_slug(text, int) to anon, authenticated;

commit;
