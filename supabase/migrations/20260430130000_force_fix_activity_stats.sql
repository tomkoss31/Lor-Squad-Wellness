-- =============================================================================
-- Force fix get_user_activity_stats — re-deploiement complet (2026-04-30)
--
-- Le fix de hier (20260429230000) n'a peut-etre pas ete bien applique.
-- On force un drop + create propre. Le bug : SELECT INTO sur la colonne
-- users.streak_last_active conflictait avec la colonne du return type.
-- Fix : variables temp v_streak_count, v_streak_last_active, v_lifetime.
-- =============================================================================

begin;

drop function if exists public.get_user_activity_stats(uuid);

create function public.get_user_activity_stats(p_user_id uuid)
returns table (
  last_active_at timestamptz,
  today_seconds integer,
  last_7d_seconds integer,
  last_30d_seconds integer,
  daily_breakdown jsonb,
  lifetime_login_count integer,
  streak_count integer,
  streak_last_active date,
  total_sessions integer
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_now timestamptz := now();
  v_today_start timestamptz := date_trunc('day', v_now at time zone 'UTC') at time zone 'UTC';
  v_7d_start timestamptz := v_today_start - interval '6 days';
  v_30d_start timestamptz := v_today_start - interval '29 days';
  v_streak_count int;
  v_streak_last_active date;
  v_lifetime int;
  v_last_active_session timestamptz;
  v_last_active_streak timestamptz;
  v_last_active timestamptz;
begin
  if not (auth.uid() = p_user_id or public.is_admin()) then
    raise exception 'access denied';
  end if;

  -- last_active_at via vars temp (evite tout conflit)
  select max(coalesce(s.ended_at, s.started_at))
  into v_last_active_session
  from public.user_sessions s
  where s.user_id = p_user_id;

  select u.streak_last_active::timestamptz
  into v_last_active_streak
  from public.users u
  where u.id = p_user_id;

  v_last_active := greatest(
    coalesce(v_last_active_session, '-infinity'::timestamptz),
    coalesce(v_last_active_streak, '-infinity'::timestamptz)
  );

  if v_last_active = '-infinity'::timestamptz then
    last_active_at := null;
  else
    last_active_at := v_last_active;
  end if;

  -- today_seconds
  select coalesce(sum(
    extract(epoch from (
      least(coalesce(s.ended_at, v_now), v_now)
      - greatest(s.started_at, v_today_start)
    ))::int
  ), 0)::int
  into today_seconds
  from public.user_sessions s
  where s.user_id = p_user_id
    and coalesce(s.ended_at, v_now) >= v_today_start;

  -- last_7d_seconds
  select coalesce(sum(
    extract(epoch from (
      least(coalesce(s.ended_at, v_now), v_now)
      - greatest(s.started_at, v_7d_start)
    ))::int
  ), 0)::int
  into last_7d_seconds
  from public.user_sessions s
  where s.user_id = p_user_id
    and coalesce(s.ended_at, v_now) >= v_7d_start;

  -- last_30d_seconds
  select coalesce(sum(
    extract(epoch from (
      least(coalesce(s.ended_at, v_now), v_now)
      - greatest(s.started_at, v_30d_start)
    ))::int
  ), 0)::int
  into last_30d_seconds
  from public.user_sessions s
  where s.user_id = p_user_id
    and coalesce(s.ended_at, v_now) >= v_30d_start;

  -- daily_breakdown
  with days as (
    select generate_series(v_7d_start, v_today_start, interval '1 day')::date as d
  ),
  totals as (
    select
      date_trunc('day', s.started_at at time zone 'UTC')::date as d,
      sum(coalesce(s.duration_seconds, extract(epoch from (coalesce(s.ended_at, v_now) - s.started_at))::int))::int as secs
    from public.user_sessions s
    where s.user_id = p_user_id
      and s.started_at >= v_7d_start
    group by 1
  )
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'date', to_char(d.d, 'YYYY-MM-DD'),
        'seconds', coalesce(t.secs, 0)
      ) order by d.d
    ),
    '[]'::jsonb
  )
  into daily_breakdown
  from days d
  left join totals t on t.d = d.d;

  -- Streak + lifetime — vars temp v_*
  select u.streak_count, u.streak_last_active, u.lifetime_login_count
  into v_streak_count, v_streak_last_active, v_lifetime
  from public.users u
  where u.id = p_user_id;

  streak_count := coalesce(v_streak_count, 0);
  streak_last_active := v_streak_last_active;
  lifetime_login_count := coalesce(v_lifetime, 0);

  -- Total sessions
  select coalesce(count(*), 0)::int into total_sessions
  from public.user_sessions
  where user_id = p_user_id;

  return next;
end;
$$;

grant execute on function public.get_user_activity_stats(uuid) to authenticated;

commit;
