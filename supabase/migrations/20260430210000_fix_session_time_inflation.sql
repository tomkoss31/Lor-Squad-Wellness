-- =============================================================================
-- Fix inflation temps de session (2026-04-30)
--
-- Bug observe : Thomas voit "103h43 aujourd'hui" et "104h52 cette semaine"
-- → impossible (un jour fait 24h max). Cause :
--
-- 1. Sessions sans ended_at : quand le navigateur est ferme brutalement
--    (mobile swipe close, force quit, crash), beforeunload ne se declenche
--    pas, ended_at reste null → la SQL calcule duration jusqu a NOW pour
--    chacune, et les sessions PARALLELES (multi-onglet, PC+mobile en meme
--    temps) se cumulent.
--
-- 2. Pas de cap : une session qui dure "officiellement" 5 jours sans
--    ended_at se voit attribuer 5 × 24h pour today (12h depuis minuit
--    × N sessions stale).
--
-- Fix en 3 etapes :
--
-- A. Cleanup retroactif : on backfill ended_at = started_at + 4h pour
--    toutes les sessions stale (pas de heartbeat depuis > 4h sans
--    ended_at). Hypothese : la session reelle ne durait pas plus que
--    le dernier heartbeat connu.
--
-- B. RPC v3 : cap chaque session a 4h max (filet de securite final).
--    Une session active de plus de 4h sans heartbeat est un bug, pas
--    un usage normal. On cap a 4h pour la stat affichee.
--
-- C. Cleanup automatique : RPC publique qui ferme les sessions stale
--    (heartbeat > 30 min) en mettant ended_at = max(started_at,
--    last_heartbeat_at). Appellable depuis le front au mount.
-- =============================================================================

begin;

-- ─── A. Cleanup retroactif des sessions stale ─────────────────────────────
-- Pour chaque session sans ended_at avec started_at > 4h dans le passe :
-- on assume que la duration reelle = duration_seconds (le dernier heartbeat
-- connu) ou 4h max si pas de heartbeat.
update public.user_sessions
set ended_at = greatest(
  started_at + (least(coalesce(duration_seconds, 0), 14400) || ' seconds')::interval,
  started_at + interval '1 minute'
)
where ended_at is null
  and started_at < now() - interval '4 hours';

-- ─── B. RPC v3 avec cap 4h par session ────────────────────────────────────
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
  v_session_cap_seconds int := 14400; -- 4h max par session (filet de securite)
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

  -- today_seconds : intersect [today_start, now] avec [started, ended] CAP a 4h
  select coalesce(sum(
    least(
      v_session_cap_seconds,
      greatest(0, extract(epoch from (
        least(coalesce(s.ended_at, v_now), v_now)
        - greatest(s.started_at, v_today_start)
      ))::int)
    )
  ), 0)::int
  into today_seconds
  from public.user_sessions s
  where s.user_id = p_user_id
    and coalesce(s.ended_at, v_now) >= v_today_start;

  -- last_7d_seconds : pareil avec cap
  select coalesce(sum(
    least(
      v_session_cap_seconds,
      greatest(0, extract(epoch from (
        least(coalesce(s.ended_at, v_now), v_now)
        - greatest(s.started_at, v_7d_start)
      ))::int)
    )
  ), 0)::int
  into last_7d_seconds
  from public.user_sessions s
  where s.user_id = p_user_id
    and coalesce(s.ended_at, v_now) >= v_7d_start;

  -- last_30d_seconds : pareil
  select coalesce(sum(
    least(
      v_session_cap_seconds,
      greatest(0, extract(epoch from (
        least(coalesce(s.ended_at, v_now), v_now)
        - greatest(s.started_at, v_30d_start)
      ))::int)
    )
  ), 0)::int
  into last_30d_seconds
  from public.user_sessions s
  where s.user_id = p_user_id
    and coalesce(s.ended_at, v_now) >= v_30d_start;

  -- daily_breakdown (7 jours)
  with days as (
    select generate_series(v_7d_start, v_today_start, interval '1 day')::date as d
  ),
  totals as (
    select
      date_trunc('day', s.started_at at time zone 'UTC')::date as d,
      sum(least(
        v_session_cap_seconds,
        coalesce(s.duration_seconds, extract(epoch from (coalesce(s.ended_at, v_now) - s.started_at))::int)
      ))::int as secs
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

  -- device_breakdown : agg par device avec cap 4h
  with by_device as (
    select
      coalesce(s.device_type, 'desktop') as dev,
      coalesce(sum(least(v_session_cap_seconds, case
        when coalesce(s.ended_at, v_now) >= v_today_start
        then greatest(0, extract(epoch from (least(coalesce(s.ended_at, v_now), v_now) - greatest(s.started_at, v_today_start)))::int)
        else 0
      end)), 0)::int as today_s,
      coalesce(sum(least(v_session_cap_seconds, case
        when coalesce(s.ended_at, v_now) >= v_7d_start
        then greatest(0, extract(epoch from (least(coalesce(s.ended_at, v_now), v_now) - greatest(s.started_at, v_7d_start)))::int)
        else 0
      end)), 0)::int as last_7d_s,
      coalesce(sum(least(v_session_cap_seconds, case
        when coalesce(s.ended_at, v_now) >= v_30d_start
        then greatest(0, extract(epoch from (least(coalesce(s.ended_at, v_now), v_now) - greatest(s.started_at, v_30d_start)))::int)
        else 0
      end)), 0)::int as last_30d_s,
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

-- ─── C. RPC publique pour cleanup auto (appelle depuis front au mount) ────
create or replace function public.cleanup_stale_sessions(p_user_id uuid)
returns int
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_count int := 0;
begin
  if not (auth.uid() = p_user_id or public.is_admin()) then
    raise exception 'access denied';
  end if;

  -- Ferme les sessions sans ended_at dont le dernier heartbeat
  -- (duration_seconds) date de plus de 30 min → considere comme stale.
  -- ended_at = started_at + duration_seconds (filet 4h max).
  with stale as (
    select id, started_at,
      least(coalesce(duration_seconds, 0), 14400) as cap_seconds
    from public.user_sessions
    where user_id = p_user_id
      and ended_at is null
      and started_at < now() - interval '30 minutes'
  )
  update public.user_sessions s
  set ended_at = stale.started_at + (stale.cap_seconds || ' seconds')::interval,
      duration_seconds = stale.cap_seconds
  from stale
  where s.id = stale.id;

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

grant execute on function public.cleanup_stale_sessions(uuid) to authenticated;

commit;
