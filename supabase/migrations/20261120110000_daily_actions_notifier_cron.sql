-- =============================================================================
-- Chantier #2 — Check-list quotidienne (étape 2.5)
-- Date : 2026-05-20
--
-- 1. Ajoute colonne users.notif_daily_actions (default true)
-- 2. Schedule cron pg_cron à 19h + 20h UTC (= 20h Paris hiver + été DST)
--    L'edge function gate elle-même sur l'heure Paris exacte (cf. function).
-- =============================================================================

-- 1. Pref colonne (default true = opt-out plutôt que opt-in)
alter table public.users
  add column if not exists notif_daily_actions boolean not null default true;

comment on column public.users.notif_daily_actions is
  'Active la push notif 20h si check-list quotidienne incomplète (chantier #2 2026-05-20).';

-- 2. Cron schedule (réutilise pattern flex-notifier)
create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Drop existant si re-run idempotent
do $$
declare v_jobid bigint;
begin
  for v_jobid in
    select jobid from cron.job
    where jobname in ('daily-actions-notifier-19', 'daily-actions-notifier-20')
  loop
    perform cron.unschedule(v_jobid);
  end loop;
end $$;

-- Tire 2× pour couvrir DST (19h UTC = 20h Paris hiver, 18h UTC = 20h Paris été).
-- L'edge function vérifie l'heure Paris exacte et skip si != 20h.
select cron.schedule(
  'daily-actions-notifier-18',
  '0 18 * * *',
  $$
  select net.http_post(
    url := current_setting('app.settings.supabase_url') || '/functions/v1/daily-actions-notifier',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
    ),
    body := '{}'::jsonb
  ) as request_id;
  $$
);

select cron.schedule(
  'daily-actions-notifier-19',
  '0 19 * * *',
  $$
  select net.http_post(
    url := current_setting('app.settings.supabase_url') || '/functions/v1/daily-actions-notifier',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
    ),
    body := '{}'::jsonb
  ) as request_id;
  $$
);
