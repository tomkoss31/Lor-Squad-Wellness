-- =============================================================================
-- Client anniversaries XP + RPC celebrations (chantier 2026-05-08)
-- =============================================================================
--
-- Ajoute :
--   1. Action XP `happy_birthday` dans record_client_xp() avec cap "yearly"
--      (dedup_key = 'happy_birthday_' || YYYY → revient chaque annee)
--   2. RPC get_today_celebrations(p_coach_user_id) qui retourne les events
--      anniversaires du jour pour les clients d un coach donne :
--      - 1m / 3m / 6m sur le programme (depuis 1er bilan = type 'initial')
--      - anniversaire de naissance (depuis clients.birth_date)
--      Utilise par la CelebrationCard cote Co-pilote coach.
--
-- Le cron client-anniversary-check (edge function) appellera record_client_xp
-- avec les actionKey appropriees → trigger XP cote client + dedup automatique.
-- =============================================================================

-- ─── Etend record_client_xp() avec happy_birthday ───────────────────────────
create or replace function public.record_client_xp(
  p_token text,
  p_action_key text
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_client_id uuid;
  v_xp int := 0;
  v_dedup_key text;
  v_today text := to_char(now() at time zone 'Europe/Paris', 'YYYY-MM-DD');
  v_week  text := to_char(now() at time zone 'Europe/Paris', 'IYYY-"W"IW');
  v_year  text := to_char(now() at time zone 'Europe/Paris', 'YYYY');
  v_inserted_id uuid;
  v_total_xp int := 0;
begin
  select caa.client_id::uuid into v_client_id
  from public.client_app_accounts caa
  where caa.token = p_token
  limit 1;

  if v_client_id is null then
    return jsonb_build_object('error', 'invalid_token');
  end if;

  case p_action_key
    -- 1x lifetime
    when 'first_login'         then v_xp := 50;  v_dedup_key := 'first_login';
    when 'install_pwa'         then v_xp := 50;  v_dedup_key := 'install_pwa';
    when 'sandbox_completed'   then v_xp := 100; v_dedup_key := 'sandbox_completed';
    when 'tutorial_completed'  then v_xp := 30;  v_dedup_key := 'tutorial_completed';
    when 'silhouette_complete' then v_xp := 50;  v_dedup_key := 'silhouette_complete';
    when 'telegram_joined'     then v_xp := 30;  v_dedup_key := 'telegram_joined';
    when 'anniversary_1m'      then v_xp := 200; v_dedup_key := 'anniversary_1m';
    when 'anniversary_3m'      then v_xp := 500; v_dedup_key := 'anniversary_3m';
    when 'anniversary_6m'      then v_xp := 800; v_dedup_key := 'anniversary_6m';
    when 'google_review'       then v_xp := 200; v_dedup_key := 'google_review';
    when 'tab_agenda'          then v_xp := 5;   v_dedup_key := 'tab_agenda';
    when 'tab_pv'              then v_xp := 5;   v_dedup_key := 'tab_pv';
    when 'tab_evolution'       then v_xp := 5;   v_dedup_key := 'tab_evolution';
    when 'tab_conseils'        then v_xp := 5;   v_dedup_key := 'tab_conseils';
    when 'message_sent'        then v_xp := 15;  v_dedup_key := 'message_sent';
    -- Daily
    when 'mood_checkin'        then v_xp := 5;   v_dedup_key := 'mood_checkin_' || v_today;
    -- Weekly
    when 'measurement_added'   then v_xp := 10;  v_dedup_key := 'measurement_added_' || v_week;
    -- Yearly (NOUVEAU 2026-05-08) — happy birthday revient chaque annee
    when 'happy_birthday'      then v_xp := 100; v_dedup_key := 'happy_birthday_' || v_year;
    -- Legacy compat
    when 'weekly_weigh_in'     then v_xp := 20;  v_dedup_key := 'weigh_in_' || v_week;
    -- No cap
    when 'photo_uploaded'      then v_xp := 50;  v_dedup_key := 'photo_' || extract(epoch from now())::text;
    -- VIP V2
    when 'vip_sandbox_completed'  then v_xp := 20;   v_dedup_key := 'vip_sandbox_completed';
    when 'vip_intentions_filled'  then v_xp := 30;   v_dedup_key := 'vip_intentions_filled';
    when 'vip_first_referral'     then v_xp := 100;  v_dedup_key := 'vip_first_referral';
    when 'vip_silver_reached'     then v_xp := 200;  v_dedup_key := 'vip_silver_reached';
    when 'vip_gold_reached'       then v_xp := 500;  v_dedup_key := 'vip_gold_reached';
    when 'vip_ambassador_reached' then v_xp := 1000; v_dedup_key := 'vip_ambassador_reached';
    else
      return jsonb_build_object('error', 'unknown_action', 'action_key', p_action_key);
  end case;

  insert into public.client_xp_events (client_id, action_key, xp_amount, dedup_key)
  values (v_client_id, p_action_key, v_xp, v_dedup_key)
  on conflict (client_id, dedup_key) do nothing
  returning id into v_inserted_id;

  select coalesce(sum(xp_amount), 0)::int into v_total_xp
  from public.client_xp_events
  where client_id = v_client_id;

  if v_inserted_id is null then
    return jsonb_build_object(
      'gained_xp', 0,
      'total_xp', v_total_xp,
      'action_key', p_action_key,
      'already_gained', true
    );
  end if;

  return jsonb_build_object(
    'gained_xp', v_xp,
    'total_xp', v_total_xp,
    'action_key', p_action_key,
    'already_gained', false
  );
end;
$$;

comment on function public.record_client_xp is
  'V3 caps (2026-05-08) : ajout happy_birthday yearly. Synchro avec CLIENT_XP_ACTIONS dans actions.ts.';

-- ─── RPC get_today_celebrations pour CelebrationCard cote coach ────────────
--
-- Retourne pour un coach donne (referent_user_id) la liste des clients qui
-- ont un evenement anniversaire aujourd hui (jour/mois pour bday, +30/+90/
-- +180j depuis 1er bilan pour milestones programme).
--
-- Format de retour : array d objets {client_id, first_name, last_name, kind,
-- since_days?, age?, age_now?}
--   kind ∈ ('birthday', 'program_1m', 'program_3m', 'program_6m')
--
-- Auth : doit etre admin OU le coach proprietaire (= referent_user_id).
-- Mais on simplifie ici : on retourne juste les clients ou referent = caller.
-- =============================================================================

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

  -- Si admin et p_coach_user_id specifie, on lit les clients de ce coach.
  -- Sinon on lit ceux du caller (referent_user_id = caller).
  if v_caller_role = 'admin' and p_coach_user_id is not null then
    v_target_coach := p_coach_user_id;
  else
    v_target_coach := v_caller_id;
  end if;

  -- Aggrege les 4 types d evenements en un seul JSON array.
  select coalesce(jsonb_agg(row_data), '[]'::jsonb) into v_celebrations
  from (
    -- 1. Anniversaires de naissance (jour/mois match)
    select jsonb_build_object(
      'client_id', c.id,
      'first_name', c.first_name,
      'last_name', c.last_name,
      'kind', 'birthday',
      'age_now', extract(year from age(c.birth_date))::int,
      'birth_date', c.birth_date
    ) as row_data
    from public.clients c
    where c.referent_user_id = v_target_coach
      and c.lifecycle = 'active'
      and c.birth_date is not null
      and to_char(c.birth_date, 'MM-DD') = v_today_md

    union all

    -- 2. Milestones programme : +30j depuis 1er bilan
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
    where c.referent_user_id = v_target_coach
      and c.lifecycle = 'active'
      and a.first_date::date + 30 = v_today

    union all

    -- 3. Milestones programme : +90j
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
    where c.referent_user_id = v_target_coach
      and c.lifecycle = 'active'
      and a.first_date::date + 90 = v_today

    union all

    -- 4. Milestones programme : +180j
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
    where c.referent_user_id = v_target_coach
      and c.lifecycle = 'active'
      and a.first_date::date + 180 = v_today
  ) sub;

  return jsonb_build_object('celebrations', v_celebrations, 'date', v_today);
end;
$$;

comment on function public.get_today_celebrations is
  'Retourne les clients du coach qui ont un anniversaire aujourd hui (naissance ou +30/+90/+180j programme). Utilise par CelebrationCard Co-pilote.';

grant execute on function public.get_today_celebrations(uuid) to authenticated;
