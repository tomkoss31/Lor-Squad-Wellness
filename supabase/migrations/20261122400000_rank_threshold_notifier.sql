-- =============================================================================
-- Rank threshold notifier — table dedup + cron (2026-05-22)
--
-- Extension chantier Aurélie #3 : push quand un distri franchit un palier PV
-- dans le mois (500/1000/2500/4000/7500). 1 push max par (user, month, palier).
--
-- Edge function : supabase/functions/rank-threshold-notifier/index.ts
-- Cron : 8h Paris (6h ou 7h UTC selon DST → 2× cron pour couvrir).
-- =============================================================================

-- ─── Table dedup ─────────────────────────────────────────────────────────────
create table if not exists public.rank_threshold_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  month text not null,
  threshold integer not null,
  total_pv numeric not null default 0,
  sent_at timestamptz not null default now(),
  constraint rtn_month_format check (month ~ '^[0-9]{4}-[0-9]{2}$'),
  constraint rtn_threshold_known check (threshold in (500, 1000, 2500, 4000, 7500)),
  unique (user_id, month, threshold)
);

comment on table public.rank_threshold_notifications is
  'Dedup palier PV franchi (chantier Aurélie #3). 1 push max par user/month/palier.';

create index if not exists rtn_month_idx
  on public.rank_threshold_notifications (month);

alter table public.rank_threshold_notifications enable row level security;

-- Lecture : user voit ses propres notifs (debug / historique futur)
drop policy if exists rtn_select_self on public.rank_threshold_notifications;
create policy rtn_select_self on public.rank_threshold_notifications
  for select to authenticated
  using (user_id = auth.uid());

-- Lecture admin = all
drop policy if exists rtn_select_admin on public.rank_threshold_notifications;
create policy rtn_select_admin on public.rank_threshold_notifications
  for select to authenticated
  using (
    exists (select 1 from public.users u where u.id = auth.uid() and u.role = 'admin')
  );

-- Write bloqué côté authenticated (edge function = service_role)
drop policy if exists rtn_no_direct_write on public.rank_threshold_notifications;
create policy rtn_no_direct_write on public.rank_threshold_notifications
  for all to authenticated
  using (false) with check (false);

-- ─── Cron ────────────────────────────────────────────────────────────────────
create extension if not exists pg_cron;
create extension if not exists pg_net;

do $$
declare v_jobid bigint;
begin
  for v_jobid in
    select jobid from cron.job
    where jobname in ('rank-threshold-notifier-06', 'rank-threshold-notifier-07')
  loop
    perform cron.unschedule(v_jobid);
  end loop;
end $$;

-- 6h UTC = 8h Paris (été DST)
select cron.schedule(
  'rank-threshold-notifier-06',
  '0 6 * * *',
  $$
  select net.http_post(
    url := current_setting('app.settings.supabase_url') || '/functions/v1/rank-threshold-notifier',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
    ),
    body := '{}'::jsonb
  ) as request_id;
  $$
);

-- 7h UTC = 8h Paris (hiver standard)
select cron.schedule(
  'rank-threshold-notifier-07',
  '0 7 * * *',
  $$
  select net.http_post(
    url := current_setting('app.settings.supabase_url') || '/functions/v1/rank-threshold-notifier',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
    ),
    body := '{}'::jsonb
  ) as request_id;
  $$
);
