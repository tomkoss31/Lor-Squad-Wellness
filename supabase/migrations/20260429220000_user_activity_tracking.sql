-- =============================================================================
-- Activite utilisateur — tracking temps + XP daily login (2026-04-29)
--
-- 3 ajouts :
--   1. users.lifetime_login_count : compteur cumule des jours connectes
--      (incremente cote client via useStreak quand un nouveau jour est detecte).
--      Utilise pour calculer le XP daily_login (+5 XP par jour).
--   2. user_sessions : table pour tracker la duree des sessions.
--      Une row par session avec started_at, ended_at, duration_seconds.
--   3. RPC get_user_activity_stats : agreget jour/semaine pour fiche distri admin.
--
-- Note : RPC get_user_xp etendu pour inclure le daily_xp (lifetime_login_count * 5).
-- =============================================================================

begin;

-- ─── 1. Compteur lifetime login pour XP ──────────────────────────────────────
alter table public.users
  add column if not exists lifetime_login_count integer not null default 0;

comment on column public.users.lifetime_login_count is
  'Compteur cumule des jours ou le user a ouvert l app au moins une fois. '
  'Source pour calculer XP daily_login (+5 XP par jour, never resets).';

-- ─── 2. Table user_sessions ──────────────────────────────────────────────────
create table if not exists public.user_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  duration_seconds integer,
  -- Note : on ne calcule pas duration_seconds en GENERATED car ended_at
  -- peut etre null pendant une session active. On le set manuellement
  -- au moment de la fermeture (cote client via useSessionTracker).
  created_at timestamptz not null default now()
);

create index if not exists idx_user_sessions_user_started
  on public.user_sessions(user_id, started_at desc);

comment on table public.user_sessions is
  'Tracking des sessions utilisateur (start/end + duree). Permet stats temps passe par jour/semaine.';

-- RLS : un user voit uniquement ses propres sessions, l admin voit tout.
alter table public.user_sessions enable row level security;

drop policy if exists "user_sessions select self or admin" on public.user_sessions;
create policy "user_sessions select self or admin"
  on public.user_sessions for select
  using (auth.uid() = user_id or public.is_admin());

drop policy if exists "user_sessions insert self" on public.user_sessions;
create policy "user_sessions insert self"
  on public.user_sessions for insert
  with check (auth.uid() = user_id);

drop policy if exists "user_sessions update self" on public.user_sessions;
create policy "user_sessions update self"
  on public.user_sessions for update
  using (auth.uid() = user_id);

-- ─── 3. RPC get_user_activity_stats ──────────────────────────────────────────
-- Retourne pour un user :
--   - last_active_at : timestamp de la derniere activite (max started_at + last_active.now)
--   - today_seconds : total seconds aujourd hui (UTC)
--   - last_7d_seconds : total seconds 7 derniers jours
--   - last_30d_seconds : total seconds 30 derniers jours
--   - daily_breakdown : array de 7 entrees [{date, seconds}] pour le mini-graph
--   - lifetime_login_count : nombre cumule jours connectes
--   - streak_count : streak actuel
--   - streak_last_active : derniere date streak

create or replace function public.get_user_activity_stats(p_user_id uuid)
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
begin
  -- Acces : user voit ses stats, admin voit tout le monde
  if not (auth.uid() = p_user_id or public.is_admin()) then
    raise exception 'access denied';
  end if;

  -- last_active_at : derniere session OU streak_last_active
  select greatest(
    coalesce((select max(coalesce(s.ended_at, s.started_at)) from public.user_sessions s where s.user_id = p_user_id), '-infinity'::timestamptz),
    coalesce((select streak_last_active::timestamptz from public.users where id = p_user_id), '-infinity'::timestamptz)
  )
  into last_active_at;

  if last_active_at = '-infinity'::timestamptz then
    last_active_at := null;
  end if;

  -- today_seconds : sum des durations qui chevauchent today (clamped au today)
  select coalesce(sum(
    extract(epoch from (
      least(coalesce(s.ended_at, v_now), v_now)
      - greatest(s.started_at, v_today_start)
    ))::int
  ), 0)
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
  ), 0)
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
  ), 0)
  into last_30d_seconds
  from public.user_sessions s
  where s.user_id = p_user_id
    and coalesce(s.ended_at, v_now) >= v_30d_start;

  -- daily_breakdown : 7 jours, chaque day avec son total seconds
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

  -- Streak + lifetime (utilise vars temp pour eviter ambiguite avec
  -- les colonnes du return type qui ont les memes noms).
  declare
    v_streak_count int;
    v_streak_last_active date;
    v_lifetime int;
  begin
    select u.streak_count, u.streak_last_active, u.lifetime_login_count
    into v_streak_count, v_streak_last_active, v_lifetime
    from public.users u
    where u.id = p_user_id;

    streak_count := coalesce(v_streak_count, 0);
    streak_last_active := v_streak_last_active;
    lifetime_login_count := coalesce(v_lifetime, 0);
  end;

  -- Total sessions
  select coalesce(count(*), 0)::int into total_sessions
  from public.user_sessions
  where user_id = p_user_id;

  return next;
end;
$$;

grant execute on function public.get_user_activity_stats(uuid) to authenticated;

-- ─── 4. Update RPC get_user_xp pour inclure daily_xp ─────────────────────────
-- (recree avec la 5e source : daily_xp = lifetime_login_count * 5)
-- Drop d'abord car on change le return type (5 → 6 colonnes).

drop function if exists public.get_user_xp(uuid);

create or replace function public.get_user_xp(p_user_id uuid)
returns table (
  total_xp integer,
  level integer,
  xp_for_next_level integer,
  academy_xp integer,
  bilans_xp integer,
  rdv_xp integer,
  messages_xp integer,
  daily_xp integer
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_academy_xp int;
  v_bilans_xp int;
  v_rdv_xp int;
  v_messages_xp int;
  v_daily_xp int;
  v_total int;
  v_level int;
  v_next_level_threshold int;
begin
  if not (auth.uid() = p_user_id or public.is_admin()) then
    raise exception 'access denied';
  end if;

  -- Academy : last_step * 50, plafonne a 400 (8 * 50)
  select coalesce(least(coalesce(p.last_step, 0), 8) * 50, 0)
  into v_academy_xp
  from public.user_tour_progress p
  where p.user_id = p_user_id and p.tour_key = 'academy';
  v_academy_xp := coalesce(v_academy_xp, 0);

  -- Bilans : count assessments type=initial joint a clients distributor=user * 10
  select coalesce(count(*) * 10, 0)::int into v_bilans_xp
  from public.assessments a
  join public.clients c on c.id = a.client_id
  where c.distributor_id = p_user_id and a.type = 'initial';

  -- RDV : count follow_ups all-time des clients de ce distri * 5
  select coalesce(count(*) * 5, 0)::int into v_rdv_xp
  from public.follow_ups f
  join public.clients c on c.id = f.client_id
  where c.distributor_id = p_user_id;

  -- Messages : count client_messages sender=coach * 2
  select coalesce(count(*) * 2, 0)::int into v_messages_xp
  from public.client_messages m
  where m.sender_user_id = p_user_id and m.sender = 'coach';

  -- Daily login (V2 — 2026-04-29) : lifetime_login_count * 5
  select coalesce(u.lifetime_login_count * 5, 0)::int
  into v_daily_xp
  from public.users u
  where u.id = p_user_id;
  v_daily_xp := coalesce(v_daily_xp, 0);

  v_total := v_academy_xp + v_bilans_xp + v_rdv_xp + v_messages_xp + v_daily_xp;
  v_level := floor(sqrt(v_total::float / 100.0))::int + 1;
  v_next_level_threshold := (v_level * v_level) * 100;

  total_xp := v_total;
  level := v_level;
  xp_for_next_level := v_next_level_threshold;
  academy_xp := v_academy_xp;
  bilans_xp := v_bilans_xp;
  rdv_xp := v_rdv_xp;
  messages_xp := v_messages_xp;
  daily_xp := v_daily_xp;

  return next;
end;
$$;

grant execute on function public.get_user_xp(uuid) to authenticated;

commit;
