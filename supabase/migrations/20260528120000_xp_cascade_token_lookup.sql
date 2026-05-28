-- =============================================================================
-- Fix XP RPCs : token lookup en cascade 3 tables (2026-05-28)
-- =============================================================================
-- Bug remonté Thomas : Isabelle Tondeur (et tout client qui ouvre l'app via un
-- lien recap/évolution post-bilan) se connecte, mais le bandeau XP reste à 0
-- ad vitam.
--
-- Cause : record_client_xp et get_client_xp ne validaient le token QUE contre
-- client_app_accounts.token. Or l'edge function client-app-data (fix
-- 2026-04-25 Angélique) résout déjà en cascade sur 3 tables :
--   1. client_app_accounts  (canonique, "Envoyer l'accès")
--   2. client_recaps        (snapshot post-bilan)
--   3. client_evolution_reports (rapport évolution legacy)
--
-- Conséquence : si le client ouvre via le lien recap, l'edge fonctionne (page
-- charge), mais les RPC XP retournent silencieusement {error: invalid_token},
-- le front swallow en console.warn, et le total reste figé à 0.
--
-- Fix : aligner les 2 RPC sur le même cascade que l'edge. Aucune migration
-- de données nécessaire — les events déjà enregistrés (client_id en text)
-- restent valides.
-- =============================================================================

create or replace function public.record_client_xp(
  p_token text,
  p_action_key text
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_client_id text;
  v_xp int := 0;
  v_dedup_key text;
  v_today text := to_char(now() at time zone 'Europe/Paris', 'YYYY-MM-DD');
  v_week  text := to_char(now() at time zone 'Europe/Paris', 'IYYY-"W"IW');
  v_inserted_id uuid;
  v_total_xp int := 0;
begin
  -- 1. Resolve client_id depuis le token (cascade 3 tables, aligné edge).
  --    Pas de cast ::uuid : client_id est TEXT partout (CLAUDE.md).
  select caa.client_id into v_client_id
  from public.client_app_accounts caa
  where caa.token = p_token
  limit 1;

  if v_client_id is null then
    select cr.client_id into v_client_id
    from public.client_recaps cr
    where cr.token = p_token
    limit 1;
  end if;

  if v_client_id is null then
    select cer.client_id into v_client_id
    from public.client_evolution_reports cer
    where cer.token = p_token
    limit 1;
  end if;

  if v_client_id is null then
    return jsonb_build_object('error', 'invalid_token');
  end if;

  -- 2. Map action_key → xp + dedup strategy.
  -- Synchro avec CLIENT_XP_ACTIONS dans src/features/client-xp/actions.ts
  case p_action_key
    -- Caps "1x lifetime"
    when 'first_login'         then v_xp := 50;  v_dedup_key := 'first_login';
    when 'install_pwa'         then v_xp := 50;  v_dedup_key := 'install_pwa';
    when 'sandbox_completed'   then v_xp := 100; v_dedup_key := 'sandbox_completed';
    when 'tutorial_completed'  then v_xp := 30;  v_dedup_key := 'tutorial_completed';
    when 'silhouette_complete' then v_xp := 50;  v_dedup_key := 'silhouette_complete';
    when 'telegram_joined'     then v_xp := 30;  v_dedup_key := 'telegram_joined';
    when 'anniversary_1m'      then v_xp := 200; v_dedup_key := 'anniversary_1m';
    when 'anniversary_3m'      then v_xp := 500; v_dedup_key := 'anniversary_3m';
    when 'anniversary_6m'      then v_xp := 800; v_dedup_key := 'anniversary_6m';
    when 'google_review'       then v_xp := 200; v_dedup_key := 'google_review';
    when 'tab_agenda'          then v_xp := 5;   v_dedup_key := 'tab_agenda';
    when 'tab_pv'              then v_xp := 5;   v_dedup_key := 'tab_pv';
    when 'tab_evolution'       then v_xp := 5;   v_dedup_key := 'tab_evolution';
    when 'tab_conseils'        then v_xp := 5;   v_dedup_key := 'tab_conseils';
    when 'message_sent'        then v_xp := 15;  v_dedup_key := 'message_sent';
    -- Cap "1x/jour"
    when 'mood_checkin'        then v_xp := 5;   v_dedup_key := 'mood_checkin_' || v_today;
    -- Cap "1x/semaine"
    when 'measurement_added'   then v_xp := 10;  v_dedup_key := 'measurement_added_' || v_week;
    when 'weekly_weigh_in'     then v_xp := 20;  v_dedup_key := 'weigh_in_' || v_week;
    -- Cap "yearly" (happy_birthday revient chaque annee)
    when 'happy_birthday'      then v_xp := 100; v_dedup_key := 'happy_birthday_' || to_char(now() at time zone 'Europe/Paris', 'YYYY');
    -- Cap "no_cap" (un par occurrence)
    when 'photo_uploaded'      then v_xp := 50;  v_dedup_key := 'photo_' || extract(epoch from now())::text;
    -- VIP V2 (2026-04-28)
    when 'vip_sandbox_completed'  then v_xp := 20;   v_dedup_key := 'vip_sandbox_completed';
    when 'vip_intentions_filled'  then v_xp := 30;   v_dedup_key := 'vip_intentions_filled';
    when 'vip_first_referral'     then v_xp := 100;  v_dedup_key := 'vip_first_referral';
    when 'vip_silver_reached'     then v_xp := 200;  v_dedup_key := 'vip_silver_reached';
    when 'vip_gold_reached'       then v_xp := 500;  v_dedup_key := 'vip_gold_reached';
    when 'vip_ambassador_reached' then v_xp := 1000; v_dedup_key := 'vip_ambassador_reached';
    else
      return jsonb_build_object('error', 'unknown_action', 'action_key', p_action_key);
  end case;

  -- 3. Insert with conflict ignore
  insert into public.client_xp_events (client_id, action_key, xp_amount, dedup_key)
  values (v_client_id, p_action_key, v_xp, v_dedup_key)
  on conflict (client_id, dedup_key) do nothing
  returning id into v_inserted_id;

  -- 4. Recompute total
  select coalesce(sum(xp_amount), 0)::int into v_total_xp
  from public.client_xp_events
  where client_id = v_client_id;

  if v_inserted_id is null then
    return jsonb_build_object(
      'gained_xp', 0,
      'total_xp', v_total_xp,
      'action_key', p_action_key,
      'already_gained', true
    );
  end if;

  return jsonb_build_object(
    'gained_xp', v_xp,
    'total_xp', v_total_xp,
    'action_key', p_action_key,
    'already_gained', false
  );
end;
$$;

create or replace function public.get_client_xp(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_client_id text;
  v_total_xp integer;
  v_level integer;
  v_level_title text;
  v_next_threshold integer;
  v_prev_threshold integer;
begin
  -- Cascade 3 tables, aligné record_client_xp + edge function client-app-data.
  select caa.client_id into v_client_id
  from public.client_app_accounts caa
  where caa.token = p_token
  limit 1;

  if v_client_id is null then
    select cr.client_id into v_client_id
    from public.client_recaps cr
    where cr.token = p_token
    limit 1;
  end if;

  if v_client_id is null then
    select cer.client_id into v_client_id
    from public.client_evolution_reports cer
    where cer.token = p_token
    limit 1;
  end if;

  if v_client_id is null then
    return jsonb_build_object('error', 'invalid_token');
  end if;

  select coalesce(sum(xp_amount), 0)::int into v_total_xp
  from public.client_xp_events
  where client_id = v_client_id;

  if v_total_xp >= 1500 then
    v_level := 5; v_level_title := 'Légende';
    v_prev_threshold := 1500; v_next_threshold := 1500;
  elsif v_total_xp >= 700 then
    v_level := 4; v_level_title := 'Champion.ne';
    v_prev_threshold := 700; v_next_threshold := 1500;
  elsif v_total_xp >= 300 then
    v_level := 3; v_level_title := 'Engagé.e';
    v_prev_threshold := 300; v_next_threshold := 700;
  elsif v_total_xp >= 100 then
    v_level := 2; v_level_title := 'En route';
    v_prev_threshold := 100; v_next_threshold := 300;
  else
    v_level := 1; v_level_title := 'Débutant.e';
    v_prev_threshold := 0; v_next_threshold := 100;
  end if;

  return jsonb_build_object(
    'total_xp', v_total_xp,
    'level', v_level,
    'level_title', v_level_title,
    'prev_threshold', v_prev_threshold,
    'next_threshold', v_next_threshold,
    'xp_in_level', v_total_xp - v_prev_threshold,
    'xp_to_next', greatest(0, v_next_threshold - v_total_xp)
  );
end;
$$;

comment on function public.record_client_xp is
  'Fix 2026-05-28 : token lookup en cascade 3 tables (client_app_accounts / client_recaps / client_evolution_reports) aligné edge client-app-data. Avant : 0 XP pour les clients qui ouvrent via lien recap/évolution.';

comment on function public.get_client_xp is
  'Fix 2026-05-28 : token lookup en cascade 3 tables. Voir record_client_xp.';
