-- =============================================================================
-- Fix RPC XP : referent_user_id → distributor_id, lifecycle → lifecycle_status
-- 2026-05-18
-- =============================================================================
-- Bug remonté Thomas : la card XP de la fiche client affiche
-- "XP indisponibles (column "referent_user_id" does not exist)".
--
-- Les migrations 20260508130000 (get_client_xp_stats) et 20260508140000
-- (get_today_celebrations) référençaient `clients.referent_user_id` et
-- `clients.lifecycle` — 2 colonnes qui n'existent PAS. La table utilise :
--   - distributor_id  (FK vers users.id, coach responsable)
--   - lifecycle_status (enum active / paused / not_started / stopped / lost)
--
-- Ces 2 RPCs plantaient silencieusement depuis 2026-05-08. Personne n'avait
-- vu jusqu'à ce que la fiche client affiche le message d'erreur.
-- =============================================================================

begin;

-- ─── Fix 1 : get_client_xp_stats ────────────────────────────────────────────
create or replace function public.get_client_xp_stats(p_client_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller_id uuid := auth.uid();
  v_caller_role text;
  v_client_referent uuid;
  v_total_xp int := 0;
  v_level int := 1;
  v_level_title text := 'Débutant.e';
  v_prev_threshold int := 0;
  v_next_threshold int := 100;
  v_recent jsonb;
begin
  if v_caller_id is null then
    return jsonb_build_object('error', 'unauthenticated');
  end if;

  select role::text into v_caller_role from public.users where id = v_caller_id;
  -- Fix 2026-05-18 : la colonne réelle est `distributor_id`, pas `referent_user_id`.
  select distributor_id into v_client_referent from public.clients where id = p_client_id;

  if v_caller_role is null then
    return jsonb_build_object('error', 'caller_not_found');
  end if;

  if v_caller_role != 'admin' and v_client_referent != v_caller_id then
    return jsonb_build_object('error', 'forbidden');
  end if;

  select coalesce(sum(xp_amount), 0)::int into v_total_xp
  from public.client_xp_events
  where client_id = p_client_id;

  if v_total_xp >= 1500 then
    v_level := 5; v_level_title := 'Légende';
    v_prev_threshold := 1500; v_next_threshold := 1500;
  elsif v_total_xp >= 700 then
    v_level := 4; v_level_title := 'Champion.ne';
    v_prev_threshold := 700;  v_next_threshold := 1500;
  elsif v_total_xp >= 300 then
    v_level := 3; v_level_title := 'Engagé.e';
    v_prev_threshold := 300;  v_next_threshold := 700;
  elsif v_total_xp >= 100 then
    v_level := 2; v_level_title := 'En route';
    v_prev_threshold := 100;  v_next_threshold := 300;
  else
    v_level := 1; v_level_title := 'Débutant.e';
    v_prev_threshold := 0;    v_next_threshold := 100;
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'action_key', e.action_key,
    'xp_amount', e.xp_amount,
    'created_at', e.created_at
  ) order by e.created_at desc), '[]'::jsonb)
  into v_recent
  from (
    select action_key, xp_amount, created_at
    from public.client_xp_events
    where client_id = p_client_id
    order by created_at desc
    limit 10
  ) e;

  return jsonb_build_object(
    'total_xp', v_total_xp,
    'level', v_level,
    'level_title', v_level_title,
    'prev_threshold', v_prev_threshold,
    'next_threshold', v_next_threshold,
    'xp_in_level', v_total_xp - v_prev_threshold,
    'xp_to_next', greatest(0, v_next_threshold - v_total_xp),
    'recent_events', v_recent
  );
end;
$$;

grant execute on function public.get_client_xp_stats(uuid) to authenticated;

-- ─── Fix 2 : get_today_celebrations ─────────────────────────────────────────
create or replace function public.get_today_celebrations(p_coach_user_id uuid default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller_id uuid := auth.uid();
  v_target_coach uuid;
  v_today date := (now() at time zone 'Europe/Paris')::date;
  v_today_md text := to_char(v_today, 'MM-DD');
  v_celebrations jsonb := '[]'::jsonb;
  v_caller_role text;
begin
  if v_caller_id is null then
    return jsonb_build_object('error', 'unauthenticated', 'celebrations', '[]'::jsonb);
  end if;

  select role::text into v_caller_role from public.users where id = v_caller_id;

  if v_caller_role = 'admin' and p_coach_user_id is not null then
    v_target_coach := p_coach_user_id;
  else
    v_target_coach := v_caller_id;
  end if;

  -- Fix 2026-05-18 : `distributor_id` (pas referent_user_id) + `lifecycle_status` (pas lifecycle)
  select coalesce(jsonb_agg(row_data), '[]'::jsonb) into v_celebrations
  from (
    select jsonb_build_object(
      'client_id', c.id,
      'first_name', c.first_name,
      'last_name', c.last_name,
      'kind', 'birthday',
      'age_now', extract(year from age(c.birth_date))::int,
      'birth_date', c.birth_date
    ) as row_data
    from public.clients c
    where c.distributor_id = v_target_coach
      and c.lifecycle_status = 'active'
      and c.birth_date is not null
      and to_char(c.birth_date, 'MM-DD') = v_today_md

    union all

    select jsonb_build_object(
      'client_id', c.id,
      'first_name', c.first_name,
      'last_name', c.last_name,
      'kind', 'program_1m',
      'since_days', 30,
      'started_at', a.first_date
    ) as row_data
    from public.clients c
    join (
      select client_id, min(date) as first_date
      from public.assessments
      where type = 'initial'
      group by client_id
    ) a on a.client_id = c.id
    where c.distributor_id = v_target_coach
      and c.lifecycle_status = 'active'
      and a.first_date::date + 30 = v_today

    union all

    select jsonb_build_object(
      'client_id', c.id,
      'first_name', c.first_name,
      'last_name', c.last_name,
      'kind', 'program_3m',
      'since_days', 90,
      'started_at', a.first_date
    ) as row_data
    from public.clients c
    join (
      select client_id, min(date) as first_date
      from public.assessments
      where type = 'initial'
      group by client_id
    ) a on a.client_id = c.id
    where c.distributor_id = v_target_coach
      and c.lifecycle_status = 'active'
      and a.first_date::date + 90 = v_today

    union all

    select jsonb_build_object(
      'client_id', c.id,
      'first_name', c.first_name,
      'last_name', c.last_name,
      'kind', 'program_6m',
      'since_days', 180,
      'started_at', a.first_date
    ) as row_data
    from public.clients c
    join (
      select client_id, min(date) as first_date
      from public.assessments
      where type = 'initial'
      group by client_id
    ) a on a.client_id = c.id
    where c.distributor_id = v_target_coach
      and c.lifecycle_status = 'active'
      and a.first_date::date + 180 = v_today
  ) sub;

  return jsonb_build_object('celebrations', v_celebrations, 'date', v_today);
end;
$$;

grant execute on function public.get_today_celebrations(uuid) to authenticated;

commit;
