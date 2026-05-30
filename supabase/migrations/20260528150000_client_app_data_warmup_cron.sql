-- =============================================================================
-- Cron warmup edge client-app-data (2026-05-28)
-- =============================================================================
-- Problème remonté Thomas : 10-15s de latence quand un client ouvre l'app
-- pour la première fois en cabinet (installation directe en RDV). Cause :
-- cold start de l'edge function Supabase quand elle n'a pas tourné depuis
-- ~10 minutes (import esm.sh + boot Deno).
--
-- Scénario impacté : Thomas installe la PWA pour son client en cabinet,
-- ouvre la page → 1ère invocation = cold start. Mauvaise impression devant
-- un client tech qui regarde la perf.
--
-- Fix : pg_cron toutes les 5 minutes qui ping client-app-data avec un token
-- bidon. L'edge function rejette en 50ms (invalid_token, court-circuit
-- avant les SELECT), mais le runtime Deno reste warm → prochaine invocation
-- réelle = 1-2s au lieu de 10-15s.
--
-- Coût : 12 ping/h × 24h × 30j = ~8 600 invocations/mois, soit 1,7% du free
-- tier Supabase (500k). Négligeable.
--
-- Quand virer ce cron : quand l'app aura assez de trafic organique pour la
-- maintenir warm naturellement (estimé : 50+ users actifs/jour).
-- =============================================================================

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Drop existant si re-run idempotent
do $$
declare v_jobid bigint;
begin
  for v_jobid in
    select jobid from cron.job where jobname = 'client-app-data-warmup'
  loop
    perform cron.unschedule(v_jobid);
  end loop;
end $$;

select cron.schedule(
  'client-app-data-warmup',
  '*/5 * * * *',
  $$
  select net.http_post(
    url := current_setting('app.settings.supabase_url') || '/functions/v1/client-app-data?token=warmup-ping-no-real-client',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 5000
  ) as request_id;
  $$
);

comment on extension pg_cron is
  'Utilise pour le cron warmup client-app-data (2026-05-28) + autres notifs (daily-actions, flex, rdv-imminent, etc.).';
