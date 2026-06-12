-- =============================================================================
-- Rappel RDV au CLIENT (PWA) — 2 timings : la veille à 18h + 2h avant.
-- (décision Thomas 2026-06-12)
--
-- L'infra push client existe déjà (client_push_subscriptions + sendPushToClient
-- + opt-in PWA). Il manquait : un envoi côté CLIENT (le cron rdv-imminent
-- existant ne notifie que le COACH) + un anti-doublon entre ticks de cron.
--
-- Marqueur idempotent : 1 ligne par (follow_up, kind). Insert au moment de
-- l'envoi → le tick suivant skippe. Pas de re-notif si le client a déjà reçu.
-- =============================================================================

create table if not exists public.client_rdv_reminders_sent (
  follow_up_id uuid not null references public.follow_ups (id) on delete cascade,
  kind text not null check (kind in ('eve', 'imminent2h')),
  sent_at timestamptz not null default now(),
  primary key (follow_up_id, kind)
);

alter table public.client_rdv_reminders_sent enable row level security;
-- Aucune policy : écriture/lecture via edge service_role uniquement.

-- ─── Cron : toutes les 30 min, l'edge décide quoi envoyer ───────────────────
-- L'edge gère les 2 timings :
--   • « 2h avant »  : fenêtre [+105min, +150min] (couvre les ticks 30 min).
--   • « veille 18h »: ne s'active que si l'heure de Paris est 18h (garde
--     interne, gère le DST via Intl), pour les RDV du lendemain.
-- pg_cron tourne en UTC ; */30 couvre 18h Paris été (16h UTC) comme hiver.

create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.unschedule('client-rdv-reminder')
where exists (select 1 from cron.job where jobname = 'client-rdv-reminder');

select cron.schedule('client-rdv-reminder', '*/30 * * * *', $job$
  select net.http_post(
    url := 'https://gqxnndwrdbghxflwmfxy.supabase.co/functions/v1/client-rdv-reminder',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 30000
  );
$job$);
