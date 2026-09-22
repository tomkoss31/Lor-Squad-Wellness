-- =============================================================================
-- 22/09/2026 — deux choses dans UNE migration : chaque migration fait relire
-- toute la structure à l'API (227 fonctions, 128 tables), plusieurs secondes de
-- travail lourd sur le Nano. On les regroupe.
--
-- 1. L'APERÇU D'UN LIEN D'ESPACE MEMBRE
--    Thomas a envoyé à Gwen (membre du club) son lien /client/<jeton> sur
--    Telegram : l'aperçu montrait l'ancien logo La Base 360 et « Bilan bien-être
--    offert », la publicité de l'app. Les robots des messageries ne lisent pas le
--    JavaScript : ils reçoivent désormais une petite page (api/client-meta) dont
--    l'habillage suit celui de l'espace — le Breakfast Club pour une membre du
--    club (`clients.ebe_bbc`, la règle même de ClientAppPage), La Base 360 sinon.
--    Cette fonction ne rend QUE 'club', 'app' ou rien : aucun nom, aucune donnée.
--    Joignable par anon (un robot n'a pas de session), comme les autres fonctions
--    à jeton : un jeton est un UUID, rien ne s'énumère.
--
-- 2. LE MÉNAGE (Thomas : « fais au mieux », après le 3e gel du 22/09)
--    · 21 fonctions que plus rien n'appelle : ni l'app, ni les fonctions serveur,
--      ni les pages Vercel, ni la base (déclencheurs, autres fonctions, policies,
--      crons) — vérifié le 22/09, aucune dépendance. Restes de FLEX, de « Caler
--      chez un coach » (supprimé le 18/09), de l'ancien Club VIP, des expositions.
--      Leurs définitions restent dans leurs migrations d'origine (historique git).
--      Pas de CASCADE : si quelque chose en dépendait, la migration échouerait
--      en entier plutôt que d'emporter autre chose.
--    · L'historique des tâches automatiques : 7 jours au lieu de 14 (la plus
--      grosse table de la base, 9,6 Mo ; 30 h ont suffi au diagnostic du 22/09).
-- =============================================================================

-- ── 1. L'aperçu d'un lien d'espace membre ───────────────────────────────────
create or replace function public.apercu_espace_membre(p_token text)
returns text
language plpgsql
stable
security definer
set search_path = public, extensions
as $$
declare
  v_club boolean;
begin
  if p_token is null
     or p_token !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    return null;
  end if;

  select coalesce(c.ebe_bbc, false) into v_club
    from public.client_app_accounts a
    join public.clients c on c.id::text = a.client_id
   where a.token = p_token::uuid
     and (a.expires_at is null or a.expires_at > now())
   limit 1;

  if not found then
    return null;
  end if;
  return case when v_club then 'club' else 'app' end;
end;
$$;

revoke all on function public.apercu_espace_membre(text) from public;
grant execute on function public.apercu_espace_membre(text) to anon, authenticated, service_role;

-- ── 2. Les 21 fonctions que plus rien n'appelle ─────────────────────────────
drop function if exists public._rank_from_pv_windows(numeric, numeric, numeric, numeric);
drop function if exists public.archive_flex_plan(text);
drop function if exists public.award_formation_xp(uuid, text, text);
drop function if exists public.bbc_member_next_call(text);
drop function if exists public.coachs_joignables();
drop function if exists public.get_academy_feedback_summary();
drop function if exists public.get_client_assessment_by_token(text);
drop function if exists public.get_client_mood_history(uuid, integer);
drop function if exists public.get_client_onboarding_state_by_token(uuid);
drop function if exists public.get_client_referral_tree_by_token(text);
drop function if exists public.get_equipe_publique();
drop function if exists public.get_flex_weekly_recap(uuid, date);
drop function if exists public.get_team_exposures_weekly(uuid, date);
drop function if exists public.get_weekly_progress(uuid);
drop function if exists public.is_club_discovery_slot_free(uuid, timestamptz);
drop function if exists public.list_flex_drift_distri();
drop function if exists public.list_flex_drift_for_sponsor();
drop function if exists public.log_exposure(text, timestamptz, text, jsonb);
drop function if exists public.reserver_chez_un_coach(uuid, timestamptz, integer, text);
drop function if exists public.set_client_onboarding_state_by_token(uuid, boolean, boolean, integer);
drop function if exists public.set_payment_onboarding_declined(boolean);

-- ── 3. L'historique des tâches automatiques : 7 jours ───────────────────────
select cron.alter_job(
  j.jobid,
  command := $cmd$delete from cron.job_run_details where start_time < now() - interval '7 days'$cmd$
)
  from cron.job j
 where j.jobname = 'purge-journal-cron';
