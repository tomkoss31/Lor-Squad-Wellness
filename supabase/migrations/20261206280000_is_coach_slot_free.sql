-- =============================================================================
-- « Ce créneau est-il libre ? » — une seule définition (2026-07-27).
--
-- La question se pose à DEUX moments : quand on affiche les disponibilités
-- (get_coach_availability_by_slug) et quand on enregistre la réservation
-- (edge book-rdv). Les deux avaient leur propre réponse, et book-rdv ne
-- regardait que `rdv_bookings` : même une fois l'affichage corrigé, un
-- prospect resté sur une page ouverte pouvait encore réserver par-dessus un
-- rendez-vous de l'agenda.
--
-- On sort donc la règle dans une fonction unique. Les deux appelants la
-- partagent : ils ne peuvent plus diverger, et la prochaine source de RDV ne
-- sera à brancher qu'ici.
-- =============================================================================

create or replace function public.is_coach_slot_free(
  p_coach_user_id uuid,
  p_start timestamptz,
  p_end timestamptz
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    -- (1) réservations déjà prises par le funnel public
    not exists (
      select 1 from public.rdv_bookings b
      where b.coach_user_id = p_coach_user_id
        and b.status <> 'canceled'
        and b.slot_start < p_end
        and b.slot_end > p_start
    )
    -- (2) RDV prospects posés dans l'agenda du coach
    and not exists (
      select 1 from public.prospects p
      where p.distributor_id = p_coach_user_id
        and p.status = 'scheduled'
        and p.rdv_date < p_end
        and p.rdv_date + make_interval(mins => coalesce(
              p.duration_min,
              (select coalesce(u.default_rdv_minutes, 45) from public.users u where u.id = p_coach_user_id),
              45)) > p_start
    )
    -- (3) RDV clients, hors clients « hors agenda » (arrêté, perdu, en pause,
    --     suivi libre) — même définition que getClientActiveFollowUp côté app.
    and not exists (
      select 1
      from public.follow_ups f
      join public.clients c on c.id = f.client_id
      where c.distributor_id = p_coach_user_id
        and f.status in ('scheduled', 'pending')
        and coalesce(c.lifecycle_status, 'active') not in ('stopped', 'lost', 'paused')
        and coalesce(c.free_follow_up, false) = false
        and f.due_date < p_end
        and f.due_date + make_interval(mins => coalesce(
              f.duration_min,
              (select coalesce(u.default_rdv_minutes, 45) from public.users u where u.id = p_coach_user_id),
              45)) > p_start
    );
$$;

comment on function public.is_coach_slot_free(uuid, timestamptz, timestamptz) is
  'Source unique de verite : un creneau est libre s il ne chevauche ni une reservation du funnel, ni un RDV prospect, ni un RDV client actif. Utilisee par get_coach_availability_by_slug (affichage) ET par l edge book-rdv (ecriture).';

grant execute on function public.is_coach_slot_free(uuid, timestamptz, timestamptz) to anon, authenticated;

-- La RPC d'affichage délègue désormais à cette fonction.
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

  select id into v_user_id
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
    from generate_series(1, v_days) as d
  ),
  avail as (
    select dd.day_date, a.start_min, a.end_min
    from days dd
    join public.coach_rdv_availability a
      on a.coach_user_id = v_user_id
     and a.weekday = extract(dow from dd.day_date)::int
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
    and public.is_coach_slot_free(v_user_id, rs.s_start, rs.s_end)
  order by rs.s_start;
end;
$$;

grant execute on function public.get_coach_availability_by_slug(text, int) to anon, authenticated;
