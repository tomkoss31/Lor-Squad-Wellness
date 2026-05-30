-- =============================================================================
-- Fix XP RPCs : utilise le helper _resolve_client_id_from_token (2026-05-28)
-- =============================================================================
-- Suite migration 20260528120000 : la cascade que j'ai écrite à la main
-- plantait sur `operator does not exist: uuid = text` parce que
-- client_recaps.token et/ou client_evolution_reports.token sont en UUID
-- alors que p_token arrive en text.
--
-- Résultat : à chaque appel record_client_xp / get_client_xp via un token
-- NON-trouvé dans client_app_accounts, l'erreur SQL remontait au Postgrest
-- et le front swallow en console.warn → 0 XP éternel.
--
-- Fix propre : remplacer la cascade manuelle par le helper canonique
-- public._resolve_client_id_from_token(text) déjà battle-tested depuis le
-- 2026-04-29 (chantier VIP). Il fait :
--   1. client_app_accounts (caa.token::text = p_token)
--   2. client_recaps       (cr.token::text  = p_token, exception undefined_table)
--   3. client_evolution_reports (cer.token::text = p_token, exception undefined_table)
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
  -- 1. Resolve client_id via le helper canonique (cascade 3 tables, casts text-safe).
  v_client_id := public._resolve_client_id_from_token(p_token);

  if v_client_id is null then
    return jsonb_build_object('error', 'invalid_token');
  end if;

  -- 2. Map action_key → xp + dedup strategy.
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
    -- Cap "yearly"
    when 'happy_birthday'      then v_xp := 100; v_dedup_key := 'happy_birthday_' || to_char(now() at time zone 'Europe/Paris', 'YYYY');
    -- Cap "no_cap"
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

  insert into public.client_xp_events (client_id, action_key, xp_amount, dedup_key)
  values (v_client_id, p_action_key, v_xp, v_dedup_key)
  on conflict (client_id, dedup_key) do nothing
  returning id into v_inserted_id;

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
  v_client_id := public._resolve_client_id_from_token(p_token);

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
  'Fix 2026-05-28 #2 : utilise _resolve_client_id_from_token (cascade text-safe). Avant : ma cascade manuelle plantait sur uuid = text → invalid_token silencieux → 0 XP eternel.';

comment on function public.get_client_xp is
  'Fix 2026-05-28 #2 : utilise _resolve_client_id_from_token. Voir record_client_xp.';
