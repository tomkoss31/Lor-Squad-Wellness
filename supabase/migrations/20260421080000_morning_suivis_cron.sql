-- =============================================================================
-- Chantier Notifications push (2026-04-21)
-- 1. Cron matinal 8h Paris → push digest "X suivis à faire aujourd'hui"
--
-- Déclenche chaque jour à 07:00 UTC (= 09:00 Paris été / 08:00 Paris hiver)
-- l'Edge Function morning-suivis-digest qui itère sur les distributeurs et
-- envoie une notif push quand il y a au moins 1 suivi du protocole à faire.
--
-- Table push_notifications_sent : log de déduplication (on ne re-notifie pas
-- la même entité deux fois dans la même journée).
--
-- À EXÉCUTER DANS SUPABASE STUDIO → SQL EDITOR.
--
-- PRÉREQUIS : setter la clé service role dans postgres config pour que
-- pg_cron puisse appeler les Edge Functions :
--
--   ALTER DATABASE postgres SET "app.settings.service_role_key" = '<SERVICE_ROLE_KEY>';
--   ALTER DATABASE postgres SET "app.settings.supabase_url" = 'https://gqxnndwrdbghxflwmfxy.supabase.co';
--
-- Récupérer la clé dans Dashboard → Settings → API → service_role secret.
-- =============================================================================

-- ─── Extensions requises ────────────────────────────────────────────────────
create extension if not exists pg_cron;
create extension if not exists pg_net;

-- ─── Table de log des notifs envoyées (déduplication) ──────────────────────
create table if not exists public.push_notifications_sent (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  entity_id text not null,
  entity_type text not null check (entity_type in (
    'followup', 'prospect_meeting', 'client_message', 'morning_digest'
  )),
  sent_at timestamptz not null default now()
);

create index if not exists idx_push_notif_sent_user_entity
  on public.push_notifications_sent(user_id, entity_id, entity_type);

create index if not exists idx_push_notif_sent_recent
  on public.push_notifications_sent(sent_at desc);

comment on table public.push_notifications_sent is
  'Chantier Notifs push (2026-04-21) : log de déduplication. Évite d''envoyer '
  'deux fois la même notif pour la même entité (RDV imminent, message client, '
  'digest matinal). Les Edge Functions checkent ce log avant push.';

alter table public.push_notifications_sent enable row level security;

-- Lecture réservée au service role + l'utilisateur concerné (debug page).
drop policy if exists "push_sent_own_read" on public.push_notifications_sent;
create policy "push_sent_own_read"
  on public.push_notifications_sent
  for select
  to authenticated
  using (auth.uid() = user_id);

-- Insert réservé au service role (les Edge Functions tournent avec cette clé).
-- Aucune policy insert pour les users normaux → service role bypass RLS.

-- ─── Cron job : digest matinal ─────────────────────────────────────────────
-- Schedule: 07:00 UTC tous les jours.
-- NB : pg_cron travaille en UTC. En été Paris = UTC+2 donc 07:00 UTC = 09:00
-- heure locale ; en hiver UTC+1 donc 08:00 heure locale. On accepte ce shift
-- 1h : c'est un digest matinal, le créneau 08-09h est idéal dans les deux cas.

select cron.unschedule('morning-suivis-digest') where exists (
  select 1 from cron.job where jobname = 'morning-suivis-digest'
);

select cron.schedule(
  'morning-suivis-digest',
  '0 7 * * *',
  $$
  select net.http_post(
    url := current_setting('app.settings.supabase_url', true) || '/functions/v1/morning-suivis-digest',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key'),
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 30000
  );
  $$
);
