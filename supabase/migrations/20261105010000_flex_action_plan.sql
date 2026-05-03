-- =============================================================================
-- FLEX Lor'Squad — Phase A (2026-11-05)
--
-- Le moteur de pilotage quotidien du distri : plan personnel + check-in
-- quotidien KPI + récap hebdo. Naming hommage FLEX 45 Herbalife.
--
-- Structure :
--   1. distributor_action_plan : 1 plan par distri (cibles + meta onboarding)
--   2. daily_action_checkin : 1 row par distri par jour (KPI saisis)
--   3. distributor_action_plan_history : archive si reset
--   4. RLS : own + sponsor N+1 lecture seule + admin all
--   5. Helpers SQL : get_flex_weekly_recap + list_flex_drift_distri
--   6. Notif prefs users : notif_flex_evening + notif_flex_weekly_recap
--   7. push_notifications_sent.entity_type : ajoute 4 types FLEX
--
-- Timezone : toutes les operations "par jour" utilisent Europe/Paris
-- via `(now() at time zone 'Europe/Paris')::date` pour gérer auto
-- changement été/hiver.
-- =============================================================================

begin;

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Table distributor_action_plan (le plan d'action du distri)
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.distributor_action_plan (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,

  -- Onboarding inputs (Phase 1)
  monthly_revenue_target integer not null check (monthly_revenue_target between 100 and 50000),
  daily_time_minutes integer not null check (daily_time_minutes in (15, 30, 45, 60, 90, -1)), -- -1 = variable
  starting_clients_count integer not null default 0 check (starting_clients_count >= 0),
  available_slots jsonb not null default '[]'::jsonb,
  target_deadline_date date not null,

  -- Cibles calculées auto (Phase 1, depuis le calculateur Strategy Plan)
  daily_invitations_target integer not null check (daily_invitations_target >= 0),
  daily_conversations_target integer not null check (daily_conversations_target >= 0),
  weekly_bilans_target integer not null check (weekly_bilans_target >= 0),
  weekly_closings_target integer not null check (weekly_closings_target >= 0),
  monthly_active_clients_target integer not null check (monthly_active_clients_target >= 0),

  -- Recalcul mid-parcours (Phase 5 — auto)
  midpoint_recalculated_at timestamptz,
  midpoint_revenue_target_adjusted integer,

  -- Pause (vacances, etc.)
  is_paused boolean not null default false,
  paused_at timestamptz,

  -- Meta
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- 1 plan actif par distri
  unique (user_id)
);

comment on table public.distributor_action_plan is
  'FLEX Lor''Squad : plan d''action personnel du distri. 1 row par user, créé à l''onboarding. Cibles recalculables à mi-parcours.';

create index if not exists idx_action_plan_user on public.distributor_action_plan(user_id);
create index if not exists idx_action_plan_deadline on public.distributor_action_plan(target_deadline_date) where is_paused = false;

-- Trigger updated_at
create or replace function public.touch_action_plan_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists tg_action_plan_updated on public.distributor_action_plan;
create trigger tg_action_plan_updated
  before update on public.distributor_action_plan
  for each row execute function public.touch_action_plan_updated_at();

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Table daily_action_checkin (KPI saisis chaque soir)
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.daily_action_checkin (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  date date not null, -- jour Paris (calculé front au moment de l'insert)

  -- 4 KPI (Phase 2 soir)
  invitations_sent integer not null default 0 check (invitations_sent >= 0 and invitations_sent <= 200),
  new_conversations integer not null default 0 check (new_conversations >= 0 and new_conversations <= 100),
  bilans_scheduled integer not null default 0 check (bilans_scheduled >= 0 and bilans_scheduled <= 50),
  closings_count integer not null default 0 check (closings_count >= 0 and closings_count <= 50),

  -- Réflexions (textareas optionnelles, max 500 chars)
  daily_win text check (daily_win is null or char_length(daily_win) <= 500),
  improvement_note text check (improvement_note is null or char_length(improvement_note) <= 500),

  -- Meta
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (user_id, date)
);

comment on table public.daily_action_checkin is
  'FLEX Lor''Squad : KPI saisis chaque soir par le distri. 1 row par user par jour Paris.';

create index if not exists idx_daily_checkin_user_date on public.daily_action_checkin(user_id, date desc);
create index if not exists idx_daily_checkin_date on public.daily_action_checkin(date);

drop trigger if exists tg_daily_checkin_updated on public.daily_action_checkin;
create trigger tg_daily_checkin_updated
  before update on public.daily_action_checkin
  for each row execute function public.touch_action_plan_updated_at();

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Table distributor_action_plan_history (archive si reset)
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.distributor_action_plan_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  archived_at timestamptz not null default now(),
  -- Snapshot complet du plan avant reset (jsonb)
  plan_snapshot jsonb not null,
  -- Stats finales du plan : nb checkins remplis, % atteint des cibles
  final_stats jsonb,
  -- Raison du reset : 'deadline_reached' / 'manual_reset' / 'goal_changed'
  reset_reason text not null check (reset_reason in ('deadline_reached', 'manual_reset', 'goal_changed'))
);

comment on table public.distributor_action_plan_history is
  'Archive des plans précédents quand le distri reset son plan ou que la deadline est atteinte. Permet de garder la trace.';

create index if not exists idx_action_plan_history_user on public.distributor_action_plan_history(user_id, archived_at desc);

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. RLS policies (own + sponsor N+1 lecture seule + admin all)
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.distributor_action_plan enable row level security;
alter table public.daily_action_checkin enable row level security;
alter table public.distributor_action_plan_history enable row level security;

-- ── distributor_action_plan ──
drop policy if exists "flex_plan_own_select" on public.distributor_action_plan;
create policy "flex_plan_own_select" on public.distributor_action_plan
  for select using (user_id = auth.uid());

drop policy if exists "flex_plan_sponsor_n1_select" on public.distributor_action_plan;
create policy "flex_plan_sponsor_n1_select" on public.distributor_action_plan
  for select using (
    exists (
      select 1 from public.users u
      where u.id = distributor_action_plan.user_id
        and u.parent_user_id = auth.uid()
    )
  );

drop policy if exists "flex_plan_admin_all" on public.distributor_action_plan;
create policy "flex_plan_admin_all" on public.distributor_action_plan
  for all using (
    exists (select 1 from public.users where id = auth.uid() and role = 'admin')
  );

drop policy if exists "flex_plan_own_insert" on public.distributor_action_plan;
create policy "flex_plan_own_insert" on public.distributor_action_plan
  for insert with check (user_id = auth.uid());

drop policy if exists "flex_plan_own_update" on public.distributor_action_plan;
create policy "flex_plan_own_update" on public.distributor_action_plan
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "flex_plan_own_delete" on public.distributor_action_plan;
create policy "flex_plan_own_delete" on public.distributor_action_plan
  for delete using (user_id = auth.uid());

-- ── daily_action_checkin ──
drop policy if exists "flex_checkin_own_select" on public.daily_action_checkin;
create policy "flex_checkin_own_select" on public.daily_action_checkin
  for select using (user_id = auth.uid());

drop policy if exists "flex_checkin_sponsor_n1_select" on public.daily_action_checkin;
create policy "flex_checkin_sponsor_n1_select" on public.daily_action_checkin
  for select using (
    exists (
      select 1 from public.users u
      where u.id = daily_action_checkin.user_id
        and u.parent_user_id = auth.uid()
    )
  );

drop policy if exists "flex_checkin_admin_all" on public.daily_action_checkin;
create policy "flex_checkin_admin_all" on public.daily_action_checkin
  for all using (
    exists (select 1 from public.users where id = auth.uid() and role = 'admin')
  );

drop policy if exists "flex_checkin_own_insert" on public.daily_action_checkin;
create policy "flex_checkin_own_insert" on public.daily_action_checkin
  for insert with check (user_id = auth.uid());

drop policy if exists "flex_checkin_own_update" on public.daily_action_checkin;
create policy "flex_checkin_own_update" on public.daily_action_checkin
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ── distributor_action_plan_history (read-only sauf admin) ──
drop policy if exists "flex_history_own_select" on public.distributor_action_plan_history;
create policy "flex_history_own_select" on public.distributor_action_plan_history
  for select using (user_id = auth.uid());

drop policy if exists "flex_history_admin_all" on public.distributor_action_plan_history;
create policy "flex_history_admin_all" on public.distributor_action_plan_history
  for all using (
    exists (select 1 from public.users where id = auth.uid() and role = 'admin')
  );

-- L'archive se fait via une fonction security definer (pas d'INSERT direct user)

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. Helpers SQL
-- ─────────────────────────────────────────────────────────────────────────────

-- ── get_flex_weekly_recap : récap d'une semaine pour 1 distri ──
create or replace function public.get_flex_weekly_recap(
  p_user_id uuid,
  p_week_start date default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  v_caller uuid := auth.uid();
  v_is_admin boolean;
  v_is_sponsor boolean;
  v_week_start date;
  v_week_end date;
  v_plan record;
  v_kpi record;
  v_result jsonb;
begin
  -- Auth check : owner OR sponsor N+1 OR admin
  select role = 'admin' into v_is_admin from public.users where id = v_caller;
  select exists (
    select 1 from public.users
    where id = p_user_id and parent_user_id = v_caller
  ) into v_is_sponsor;

  if not (v_caller = p_user_id or v_is_admin or v_is_sponsor) then
    raise exception 'forbidden';
  end if;

  -- Default week_start = lundi de la semaine en cours (Paris)
  v_week_start := coalesce(
    p_week_start,
    (date_trunc('week', (now() at time zone 'Europe/Paris')::date))::date
  );
  v_week_end := v_week_start + 6;

  -- Plan
  select * into v_plan from public.distributor_action_plan where user_id = p_user_id;
  if not found then
    return jsonb_build_object('error', 'no_plan', 'user_id', p_user_id);
  end if;

  -- Aggregate KPI sur la semaine
  select
    coalesce(sum(invitations_sent), 0) as inv_total,
    coalesce(sum(new_conversations), 0) as conv_total,
    coalesce(sum(bilans_scheduled), 0) as bilans_total,
    coalesce(sum(closings_count), 0) as closings_total,
    count(*) as days_filled
  into v_kpi
  from public.daily_action_checkin
  where user_id = p_user_id
    and date >= v_week_start
    and date <= v_week_end;

  v_result := jsonb_build_object(
    'user_id', p_user_id,
    'week_start', v_week_start,
    'week_end', v_week_end,
    'days_filled', v_kpi.days_filled,
    'targets', jsonb_build_object(
      'invitations', v_plan.daily_invitations_target * 7,
      'conversations', v_plan.daily_conversations_target * 7,
      'bilans', v_plan.weekly_bilans_target,
      'closings', v_plan.weekly_closings_target
    ),
    'actuals', jsonb_build_object(
      'invitations', v_kpi.inv_total,
      'conversations', v_kpi.conv_total,
      'bilans', v_kpi.bilans_total,
      'closings', v_kpi.closings_total
    ),
    'ratios', jsonb_build_object(
      'invitations', case when v_plan.daily_invitations_target * 7 > 0
        then round(v_kpi.inv_total::numeric / (v_plan.daily_invitations_target * 7) * 100, 0) else 0 end,
      'conversations', case when v_plan.daily_conversations_target * 7 > 0
        then round(v_kpi.conv_total::numeric / (v_plan.daily_conversations_target * 7) * 100, 0) else 0 end,
      'bilans', case when v_plan.weekly_bilans_target > 0
        then round(v_kpi.bilans_total::numeric / v_plan.weekly_bilans_target * 100, 0) else 0 end,
      'closings', case when v_plan.weekly_closings_target > 0
        then round(v_kpi.closings_total::numeric / v_plan.weekly_closings_target * 100, 0) else 0 end
    )
  );

  return v_result;
end;
$function$;

comment on function public.get_flex_weekly_recap(uuid, date) is
  'Récap hebdo FLEX : compare KPI saisis vs cibles. Auth : owner OR sponsor N+1 OR admin.';

grant execute on function public.get_flex_weekly_recap(uuid, date) to authenticated;

-- ── list_flex_drift_distri : liste des distri en dérive >2 sem (admin) ──
create or replace function public.list_flex_drift_distri()
returns table (
  user_id uuid,
  user_name text,
  weeks_drift integer,
  last_checkin_date date
)
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  v_is_admin boolean;
begin
  select role = 'admin' into v_is_admin from public.users where id = auth.uid();
  if not v_is_admin then
    raise exception 'admin_only';
  end if;

  return query
  select
    p.user_id,
    u.name as user_name,
    extract(week from age(current_date, coalesce(max(c.date), p.created_at::date)))::integer as weeks_drift,
    max(c.date) as last_checkin_date
  from public.distributor_action_plan p
  join public.users u on u.id = p.user_id
  left join public.daily_action_checkin c on c.user_id = p.user_id
  where p.is_paused = false
  group by p.user_id, u.name, p.created_at
  having (current_date - coalesce(max(c.date), p.created_at::date)) > 14
  order by weeks_drift desc;
end;
$function$;

comment on function public.list_flex_drift_distri() is
  'Liste les distri sans check-in depuis >2 semaines. Admin only.';

grant execute on function public.list_flex_drift_distri() to authenticated;

-- ── archive_flex_plan : archive le plan courant et le supprime ──
create or replace function public.archive_flex_plan(
  p_reset_reason text
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  v_caller uuid := auth.uid();
  v_plan_id uuid;
  v_archive_id uuid;
  v_snapshot jsonb;
  v_stats jsonb;
begin
  -- Snapshot du plan actuel
  select id, to_jsonb(p.*) into v_plan_id, v_snapshot
  from public.distributor_action_plan p
  where user_id = v_caller;

  if v_plan_id is null then
    raise exception 'no_active_plan';
  end if;

  -- Calcul stats finales : nb checkins + ratios
  with sums as (
    select
      count(*) as days,
      coalesce(sum(invitations_sent), 0) as inv,
      coalesce(sum(bilans_scheduled), 0) as bilans,
      coalesce(sum(closings_count), 0) as closings
    from public.daily_action_checkin
    where user_id = v_caller
  )
  select jsonb_build_object(
    'days_filled', days,
    'total_invitations', inv,
    'total_bilans', bilans,
    'total_closings', closings
  ) into v_stats from sums;

  -- Insert dans history
  insert into public.distributor_action_plan_history (
    user_id, plan_snapshot, final_stats, reset_reason
  )
  values (v_caller, v_snapshot, v_stats, p_reset_reason)
  returning id into v_archive_id;

  -- Delete le plan courant (le user pourra en créer un nouveau via l'onboarding)
  delete from public.distributor_action_plan where id = v_plan_id;

  -- Note : on ne supprime PAS daily_action_checkin (historique conservé)

  return v_archive_id;
end;
$function$;

comment on function public.archive_flex_plan(text) is
  'Archive le plan FLEX courant du caller dans plan_history et le supprime. Permet de relancer un onboarding.';

grant execute on function public.archive_flex_plan(text) to authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. Notif preferences (étendre users)
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.users
  add column if not exists notif_flex_evening boolean not null default true,
  add column if not exists notif_flex_weekly_recap boolean not null default true;

comment on column public.users.notif_flex_evening is
  'Recevoir push FLEX du soir 20h (rappel check-in du jour). Default true.';
comment on column public.users.notif_flex_weekly_recap is
  'Recevoir push FLEX dimanche 20h (récap semaine + plan lundi). Default true.';

-- ─────────────────────────────────────────────────────────────────────────────
-- 7. push_notifications_sent : extension entity_type pour FLEX
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.push_notifications_sent
  drop constraint if exists push_notifications_sent_entity_type_check;

alter table public.push_notifications_sent
  add constraint push_notifications_sent_entity_type_check
  check (entity_type in (
    'followup',
    'prospect_meeting',
    'client_message',
    'morning_digest',
    'coach_tip',
    -- Nouveaux pour FLEX (Phase A 2026-11-05)
    'flex_evening_reminder',
    'flex_evening_late',
    'flex_weekly_recap',
    'flex_drift_alert'
  ));

commit;
