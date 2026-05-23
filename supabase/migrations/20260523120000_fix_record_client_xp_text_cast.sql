-- =============================================================================
-- Fix record_client_xp : v_client_id repasse en TEXT (2026-05-23)
-- =============================================================================
-- Bug remonté Thomas : aucun client ne gagne d'XP depuis le 2026-05-08.
--
-- La migration 20260508120000_client_xp_caps_v2.sql a (par inadvertance)
-- changé la variable v_client_id de TEXT → UUID, alors que :
--   - client_app_accounts.client_id est TEXT
--   - client_xp_events.client_id est TEXT (cf. CLAUDE.md règle "jamais ::uuid
--     en policy permissive" : la colonne est TEXT depuis l'origine pour
--     éviter les casts foireux).
--
-- Conséquence : à chaque appel record_client_xp, soit le `::uuid` du SELECT
-- plantait sur un client_id non-uuid, soit le `where client_id = v_client_id`
-- de l'agrégation finale plantait avec "operator does not exist: text = uuid".
-- L'erreur remontait au front qui la swallow en console.warn → silence total
-- pendant 2 semaines.
--
-- Fix : v_client_id repasse en TEXT, on retire le ::uuid. Aligné sur le pattern
-- de la RPC V1 originelle (20260428200000) et conforme à CLAUDE.md.
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
  -- 1. Resolve client_id depuis le token. Pas de cast ::uuid : la colonne
  --    client_app_accounts.client_id est TEXT et peut contenir des valeurs
  --    non-UUID (cf. CLAUDE.md).
  select caa.client_id into v_client_id
  from public.client_app_accounts caa
  where caa.token = p_token
  limit 1;

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

comment on function public.record_client_xp is
  'Fix 2026-05-23 : v_client_id repasse en TEXT (bug v2 silencieux depuis 2026-05-08). +ajout branche happy_birthday yearly.';
