-- =============================================================================
-- Moteur d'équipe PR2 — EXPOSITIONS (métrique-reine) + pilotage_level dérivé.
-- (2026-06-27). Additif pur. Décisions Thomas validées.
--
--  1. Table exposures (append-only) : registre unifié des expositions étage 2.
--     Types : bilan | rdv_decouverte | hom | video_outil. AUCUNE pondération.
--  2. Triggers idempotents : assessments→bilan, rdv_bookings(confirmed)→rdv.
--  3. RPC log_exposure (self-only) pour hom + video_outil (par prospect).
--  4. RPC get_team_exposures_weekly : compte réel sur le subtree + activations.
--  5. users.pilotage_level_override + get_pilotage_level() dérivé des règles.
--
-- INVITATION (étage 1, daily_action_checkin.invitations_sent) ≠ EXPOSITION
-- (étage 2, cette table). Distinction volontaire — on ne mélange pas.
-- =============================================================================

-- 1) Table exposures ---------------------------------------------------------
create table if not exists public.exposures (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.users(id) on delete cascade,
  type         text not null check (type in ('bilan','rdv_decouverte','hom','video_outil')),
  occurred_at  timestamptz not null default now(),
  source_table text,                 -- 'assessments' | 'rdv_bookings' | null (manuel)
  source_id    uuid,                 -- id dans la table source (nullable hom/video)
  meta         jsonb not null default '{}'::jsonb,
  created_at   timestamptz not null default now(),
  -- Idempotence des auto-logs (un bilan / un RDV = au plus une exposition).
  unique (source_table, source_id)
);

comment on table public.exposures is
  'Registre append-only des expositions (étage 2 du funnel équipe). bilan/rdv auto-loggés par trigger (référence, pas copie) ; hom/video via RPC log_exposure.';

create index if not exists idx_exposures_user_time
  on public.exposures(user_id, occurred_at desc);
create index if not exists idx_exposures_time
  on public.exposures(occurred_at);

-- 2) RLS : lecture self + downline + admin ; écriture interdite en direct ----
alter table public.exposures enable row level security;

drop policy if exists exposures_select on public.exposures;
create policy exposures_select on public.exposures
  for select using (
    user_id = auth.uid()
    or public.is_in_user_subtree(user_id, auth.uid())
    or exists (select 1 from public.users u where u.id = auth.uid() and u.role = 'admin')
  );

grant select on public.exposures to authenticated;
revoke insert, update, delete on public.exposures from anon, authenticated;

-- 3) Triggers idempotents ----------------------------------------------------

-- 3a. assessments AFTER INSERT → exposure 'bilan'.
--     user_id résolu via clients.distributor_id (FK users), occurred_at = date du bilan.
create or replace function public.tg_exposure_from_assessment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_distributor uuid;
begin
  select distributor_id into v_distributor from public.clients where id = new.client_id;
  if v_distributor is null then
    return new; -- pas de distri rattaché → on ne loggue rien
  end if;

  insert into public.exposures (user_id, type, occurred_at, source_table, source_id)
  values (v_distributor, 'bilan', new.date::timestamptz, 'assessments', new.id)
  on conflict (source_table, source_id) do nothing;

  return new;
end;
$$;

drop trigger if exists trg_exposure_from_assessment on public.assessments;
create trigger trg_exposure_from_assessment
  after insert on public.assessments
  for each row execute function public.tg_exposure_from_assessment();

-- 3b. rdv_bookings AFTER INSERT OR UPDATE → exposure 'rdv_decouverte'.
--     status 'confirmed' = upsert ; 'canceled' = delete par (source_table, source_id).
create or replace function public.tg_exposure_from_rdv()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'confirmed' and new.coach_user_id is not null then
    insert into public.exposures (user_id, type, occurred_at, source_table, source_id)
    values (new.coach_user_id, 'rdv_decouverte', new.slot_start, 'rdv_bookings', new.id)
    on conflict (source_table, source_id) do update
      set occurred_at = excluded.occurred_at,
          user_id     = excluded.user_id;
  elsif new.status = 'canceled' then
    delete from public.exposures
      where source_table = 'rdv_bookings' and source_id = new.id;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_exposure_from_rdv on public.rdv_bookings;
create trigger trg_exposure_from_rdv
  after insert or update of status on public.rdv_bookings
  for each row execute function public.tg_exposure_from_rdv();

-- 3c. log_exposure : hom + video_outil, self-only, par prospect (pas par présence).
create or replace function public.log_exposure(
  p_type text,
  p_occurred_at timestamptz default null,
  p_prospect_label text default null,
  p_meta jsonb default '{}'::jsonb
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_id uuid;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  -- Seuls hom/video passent par cette RPC (bilan/rdv = triggers).
  if p_type not in ('hom','video_outil') then
    raise exception 'log_exposure: type % interdit ici (bilan/rdv = triggers)', p_type;
  end if;

  insert into public.exposures (user_id, type, occurred_at, source_table, source_id, meta)
  values (
    v_uid,
    p_type,
    coalesce(p_occurred_at, now()),
    null,
    null,
    coalesce(p_meta, '{}'::jsonb) || case
      when p_prospect_label is not null then jsonb_build_object('prospect_label', p_prospect_label)
      else '{}'::jsonb end
  )
  returning id into v_id;

  return v_id;
end;
$$;

grant execute on function public.log_exposure(text, timestamptz, text, jsonb) to authenticated;

-- 4) get_team_exposures_weekly : compte réel (plus de retour 0) --------------
create or replace function public.get_team_exposures_weekly(
  p_root uuid,
  p_week_start date
)
returns table (
  user_id uuid,
  name text,
  exposures int,
  exp_bilan int,
  exp_rdv int,
  exp_hom int,
  exp_video int,
  recruits_activated int
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_ws date := date_trunc('week', p_week_start)::date;
  v_we date := (date_trunc('week', p_week_start)::date) + 7;
begin
  -- Guard : le caller doit pouvoir voir p_root (lui-même, sa downline, ou admin).
  if not (
    p_root = v_uid
    or public.is_in_user_subtree(p_root, v_uid)
    or exists (select 1 from public.users where id = v_uid and role = 'admin')
  ) then
    raise exception 'forbidden';
  end if;

  return query
  select
    m.user_id,
    m.name,
    coalesce(e.total, 0)::int,
    coalesce(e.bilan, 0)::int,
    coalesce(e.rdv, 0)::int,
    coalesce(e.hom, 0)::int,
    coalesce(e.video, 0)::int,
    (
      select count(*) from public.users c
      where c.parent_user_id = m.user_id
        and c.activated_at >= v_ws and c.activated_at < v_we
    )::int
  from public.get_team_tree(p_root) m
  left join lateral (
    select
      count(*) as total,
      count(*) filter (where x.type = 'bilan') as bilan,
      count(*) filter (where x.type = 'rdv_decouverte') as rdv,
      count(*) filter (where x.type = 'hom') as hom,
      count(*) filter (where x.type = 'video_outil') as video
    from public.exposures x
    where x.user_id = m.user_id
      and x.occurred_at >= v_ws and x.occurred_at < v_we
  ) e on true;
end;
$$;

grant execute on function public.get_team_exposures_weekly(uuid, date) to authenticated;

-- 5) pilotage_level : dérivé des règles + override manuel --------------------
alter table public.users
  add column if not exists pilotage_level_override text
    check (pilotage_level_override in ('nouveau','actif','ambassadeur','leader','dort'));

comment on column public.users.pilotage_level_override is
  'Override manuel du niveau de pilotage. NULL = calcul automatique via get_pilotage_level().';

-- Helper interne (base, sans le tier leader → casse la récursion).
-- nouveau / actif / ambassadeur / dort uniquement.
create or replace function public._pilotage_base_level(p_user_id uuid)
returns text
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_activated timestamptz;
  v_exp21 int; v_exp14 int; v_bilan7 int;
  v_recrues int; v_pv numeric;
  v_month text := to_char((now() at time zone 'Europe/Paris'), 'YYYY-MM');
begin
  select activated_at into v_activated from public.users where id = p_user_id;
  if v_activated is null then return 'nouveau'; end if;

  select count(*) into v_exp21 from public.exposures
    where user_id = p_user_id and occurred_at >= now() - interval '21 days';
  if v_exp21 = 0 then return 'dort'; end if;

  select count(*) into v_exp14 from public.exposures
    where user_id = p_user_id and occurred_at >= now() - interval '14 days';
  select count(*) into v_bilan7 from public.exposures
    where user_id = p_user_id and type = 'bilan' and occurred_at >= now() - interval '7 days';

  -- actif = moyenne >=5 expo/sem sur 2 sem (>=10 sur 14j) ET >=1 bilan sur 7j
  if not (v_exp14 >= 10 and v_bilan7 >= 1) then
    return 'nouveau';
  end if;

  -- ambassadeur = actif + >=1 recrue directe activée + PV mois >= 1000
  select count(*) into v_recrues from public.users c
    where c.parent_user_id = p_user_id and c.activated_at is not null;
  select coalesce(sum(pv_15 + pv_25 + pv_35 + pv_42 + pv_royalty), 0) into v_pv
    from public.pv_monthly_breakdown
    where user_id = p_user_id and month = v_month;

  if v_recrues >= 1 and v_pv >= 1000 then
    return 'ambassadeur';
  end if;

  return 'actif';
end;
$$;

-- Niveau public : override prioritaire, sinon base + tier leader.
create or replace function public.get_pilotage_level(p_user_id uuid)
returns text
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_override text;
  v_base text;
begin
  -- Guard lecture : self + downline + admin.
  if not (
    p_user_id = v_uid
    or public.is_in_user_subtree(p_user_id, v_uid)
    or exists (select 1 from public.users where id = v_uid and role = 'admin')
  ) then
    raise exception 'forbidden';
  end if;

  select pilotage_level_override into v_override from public.users where id = p_user_id;
  if v_override is not null then
    return v_override;
  end if;

  v_base := public._pilotage_base_level(p_user_id);

  -- leader = ambassadeur ET >=1 filleul direct de niveau >= 'actif'
  -- (pas de gate PV perso sur leader — volontaire.)
  if v_base = 'ambassadeur' then
    if exists (
      select 1 from public.users c
      where c.parent_user_id = p_user_id
        and c.activated_at is not null
        and public._pilotage_base_level(c.id) in ('actif','ambassadeur')
    ) then
      return 'leader';
    end if;
  end if;

  return v_base;
end;
$$;

grant execute on function public.get_pilotage_level(uuid) to authenticated;
