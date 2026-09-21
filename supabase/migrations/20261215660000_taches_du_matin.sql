-- =============================================================================
-- Les tâches du matin (21/09/2026, Thomas : « répare 9h anniversaire et
-- supprime les deux suivantes ! urgent, trop de fonctions inutiles »).
--
-- Mesuré avant de toucher (21/09) :
--   • 9 h Paris — `client-anniversary-check-daily` : en ERREUR 500 chaque matin
--     depuis sa création (mai 2026), 0 point jamais donné. Cause : l'edge appelle
--     la RPC `exec_anniversary_query`, qui n'existait pas, puis retombe sur une
--     jointure PostgREST impossible (`client_app_accounts.client_id` est en
--     texte). RÉPARÉE : la RPC existe (jointure texte sûre, jeton valide le plus
--     récent), points adoucis — anniversaire +50 (au lieu de 100), 1 mois +50
--     (200), 3 mois +100 (500), 6 mois +150 (800) : la Légende est à 1 500 et une
--     journée de journal complète vaut ~25 — et passage à 7 h 04 UTC (jamais la
--     minute 0, incident Nano du 29/07). Pas de rattrapage : un jalon se fête le
--     jour même (l'edge compare la date du jour).
--   • 10 h Paris — `request-testimonial-daily` : ~12 relances « témoignage » par
--     mois aux admins, 0 témoignage reçu en 2 mois (7 en tout) → SUPPRIMÉE, avec
--     sa RPC ; l'edge `request-testimonial` (utilisée par cette seule tâche) est
--     supprimée à part. La fiche cliente garde son lien /temoignage/coach/<slug>.
--   • 11 h Paris — `business-plan-reminder` : 0 plan business jamais envoyé
--     (aucune fiche avec business_plan_sent_at) → SUPPRIMÉE, avec sa fonction SQL.
-- Pour remettre l'une des deux : leurs commandes d'origine sont en bas.
-- =============================================================================

-- ─── Les deux tâches supprimées ──────────────────────────────────────────────
select cron.unschedule(jobid) from cron.job where jobname in ('request-testimonial-daily', 'business-plan-reminder');
drop function if exists public.cron_business_plan_reminder();
drop function if exists public.get_testimonial_request_candidates(timestamptz, timestamptz);

-- ─── Les anniversaires, réparés ──────────────────────────────────────────────
-- Ce que l'edge client-anniversary-check attend : les clientes actives qui ont un
-- espace membre (jeton valide), leur date de naissance et la date de leur 1er bilan.
create or replace function public.exec_anniversary_query()
returns table (id uuid, birth_date date, caa_token text, first_assessment_date date)
language sql stable security definer set search_path = public, extensions as $$
  select c.id, c.birth_date, acc.token::text, fa.premier
    from public.clients c
    join lateral (
      select a.token
        from public.client_app_accounts a
       where a.client_id = c.id::text              -- text vs uuid : le cast sûr (CLAUDE.md)
         and (a.expires_at is null or a.expires_at > now())
       order by a.created_at desc
       limit 1) acc on true
    left join lateral (
      select min(b.date) as premier from public.assessments b where b.client_id = c.id) fa on true
   where c.lifecycle_status = 'active';
$$;
revoke all on function public.exec_anniversary_query() from public, anon, authenticated;
grant execute on function public.exec_anniversary_query() to service_role;

-- Les points, adoucis DANS la définition en ligne (rien d'autre ne bouge) ; une
-- ligne introuvable arrête tout plutôt que de laisser une fonction à moitié changée.
do $m$
declare
  def text := pg_get_functiondef('public.record_client_xp(text, text)'::regprocedure);
  avant text;
  r record;
begin
  for r in select * from (values
    ($x$when 'anniversary_1m'      then v_xp := 200;$x$, $x$when 'anniversary_1m'      then v_xp := 50; $x$),
    ($x$when 'anniversary_3m'      then v_xp := 500;$x$, $x$when 'anniversary_3m'      then v_xp := 100;$x$),
    ($x$when 'anniversary_6m'      then v_xp := 800;$x$, $x$when 'anniversary_6m'      then v_xp := 150;$x$),
    ($x$when 'happy_birthday'      then v_xp := 100;$x$, $x$when 'happy_birthday'      then v_xp := 50; $x$)
  ) as t(ancien, nouveau) loop
    avant := def;
    def := replace(def, r.ancien, r.nouveau);
    if def = avant then
      raise exception 'record_client_xp : ligne introuvable « % »', r.ancien;
    end if;
  end loop;
  execute def;
end
$m$;

-- 7 h 04 UTC (9 h 04 à Paris l'été) : la minute 4 est libre à 7 h.
select cron.alter_job(jobid, schedule := '4 7 * * *') from cron.job where jobname = 'client-anniversary-check-daily';

-- ─── Pour remettre une tâche supprimée (commandes d'origine) ─────────────────
-- select cron.schedule('request-testimonial-daily', '0 8 * * *', $$ select net.http_post(
--   url := 'https://gqxnndwrdbghxflwmfxy.supabase.co/functions/v1/request-testimonial',
--   headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' ||
--     (select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key')),
--   body := '{}'::jsonb, timeout_milliseconds := 60000); $$);
--   (+ la RPC get_testimonial_request_candidates et l'edge request-testimonial : historique git)
-- select cron.schedule('business-plan-reminder', '0 9 * * *', $$ SELECT public.cron_business_plan_reminder(); $$);
--   (+ la fonction cron_business_plan_reminder : migrations 20261107140000 et 20261205130000)
