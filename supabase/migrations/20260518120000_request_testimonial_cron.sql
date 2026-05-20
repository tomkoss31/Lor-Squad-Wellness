-- =============================================================================
-- Chantier #11 Sprint 2 (2026-05-18) — Cron J+60 request-testimonial
-- =============================================================================
-- Cron daily 10:00 UTC : relance push aux admin pour demander temoignage aux
-- clients ayant un client_app_accounts cree il y a ~60 jours sans temoignage
-- existant.
--
-- PREREQUIS : app.settings.service_role_key + supabase_url deja set par
-- la migration 20260421080000_morning_suivis_cron.sql.
-- =============================================================================

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- RPC helper : liste les candidats. Utilise par l'edge fn.
-- Filtre : clients ayant un client_app_accounts cree dans la fenetre + sans
-- temoignage actif. Retourne client_id + first_name + token.
create or replace function public.get_testimonial_request_candidates(
  p_start timestamptz,
  p_end timestamptz
)
returns table (
  client_id uuid,
  first_name text,
  token text
)
language sql
security definer
set search_path = public
as $$
  -- client_app_accounts.client_id est text, clients.id est uuid : cast text safe
  -- (cf. regle RLS CLAUDE.md, leçon 25/04/2026).
  select
    c.id as client_id,
    c.first_name,
    caa.token::text as token
  from public.clients c
  join public.client_app_accounts caa on c.id::text = caa.client_id
  where caa.created_at >= p_start
    and caa.created_at < p_end
    and not exists (
      select 1 from public.client_testimonials t
      where t.client_id = c.id
        and t.status in ('pending', 'approved')
    );
$$;

-- Cron job : daily 10:00 UTC (= 11:00 ou 12:00 Paris selon saison).
select cron.unschedule('request-testimonial-daily') where exists (
  select 1 from cron.job where jobname = 'request-testimonial-daily'
);

select cron.schedule(
  'request-testimonial-daily',
  '0 10 * * *',
  $$
  select net.http_post(
    url := current_setting('app.settings.supabase_url', true) || '/functions/v1/request-testimonial',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key'),
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 60000
  );
  $$
);

comment on function public.get_testimonial_request_candidates(timestamptz, timestamptz) is
  'Chantier #11 (2026-05-18) : retourne les clients ayant un client_app_accounts
  cree dans la fenetre [p_start, p_end[ ET sans temoignage actif. Utilise par le
  cron daily request-testimonial pour pinger les admin J+60.';
