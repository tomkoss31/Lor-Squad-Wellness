-- =============================================================================
-- Session device_type — split PC vs Mobile (2026-04-30)
--
-- Ajout colonne user_sessions.device_type ('desktop' | 'mobile' | 'tablet').
-- Detecte cote client via navigator.userAgent et display-mode.
--
-- RPC get_user_activity_stats etendue pour retourner aussi un breakdown
-- par device (jsonb : { desktop: { today, 7d, 30d }, mobile: { ... } }).
-- =============================================================================

begin;

-- ─── 1. Colonne device_type ──────────────────────────────────────────────────
alter table public.user_sessions
  add column if not exists device_type text default 'desktop'
    check (device_type in ('desktop', 'mobile', 'tablet'));

create index if not exists idx_user_sessions_user_device
  on public.user_sessions(user_id, device_type);

comment on column public.user_sessions.device_type is
  'Type d''appareil utilise pour la session (desktop / mobile / tablet). '
  'Detecte cote client via navigator.userAgent.';

-- ─── 2. RPC get_user_activity_stats v2 — breakdown by device ─────────────────
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
  total_sessions integer,
  -- V2 : breakdown par device
  device_breakdown jsonb
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

  -- last_active_at
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

  -- today_seconds (total all devices)
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

  -- daily_breakdown (7 jours, all devices)
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

  -- device_breakdown : agg par device pour today / 7d / 30d
  with by_device as (
    select
      coalesce(s.device_type, 'desktop') as dev,
      coalesce(sum(case
        when coalesce(s.ended_at, v_now) >= v_today_start
        then extract(epoch from (least(coalesce(s.ended_at, v_now), v_now) - greatest(s.started_at, v_today_start)))::int
        else 0
      end), 0)::int as today_s,
      coalesce(sum(case
        when coalesce(s.ended_at, v_now) >= v_7d_start
        then extract(epoch from (least(coalesce(s.ended_at, v_now), v_now) - greatest(s.started_at, v_7d_start)))::int
        else 0
      end), 0)::int as last_7d_s,
      coalesce(sum(case
        when coalesce(s.ended_at, v_now) >= v_30d_start
        then extract(epoch from (least(coalesce(s.ended_at, v_now), v_now) - greatest(s.started_at, v_30d_start)))::int
        else 0
      end), 0)::int as last_30d_s,
      count(*)::int as sessions
    from public.user_sessions s
    where s.user_id = p_user_id
    group by coalesce(s.device_type, 'desktop')
  )
  select coalesce(
    jsonb_object_agg(
      bd.dev,
      jsonb_build_object(
        'today_seconds', bd.today_s,
        'last_7d_seconds', bd.last_7d_s,
        'last_30d_seconds', bd.last_30d_s,
        'sessions', bd.sessions
      )
    ),
    '{}'::jsonb
  )
  into device_breakdown
  from by_device bd;

  -- Streak + lifetime
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
