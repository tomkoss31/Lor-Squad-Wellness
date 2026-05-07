-- =============================================================================
-- Client XP — caps V2 (chantier 2026-05-08)
-- =============================================================================
--
-- Retour Thomas : la presence quotidienne (5 actions tab_* + message_sent +
-- measurement_added) etait imposee comme obligation 1x/jour. Refonte :
--
--   - tab_agenda      : 1x/jour → 1x lifetime (decouverte)
--   - tab_evolution   : 1x/jour → 1x lifetime (decouverte)
--   - tab_conseils    : 1x/jour → 1x lifetime (decouverte)
--   - tab_pv          : 1x/jour → 1x lifetime (decouverte)
--   - message_sent    : 1x/jour → 1x lifetime (1ere prise de contact)
--   - measurement_added : 1x/jour → 1x/semaine
--   - mood_checkin    : reste 1x/jour (check-in volontaire)
--   - weekly_weigh_in : retire du tableau front (onglet pesee supprime)
--                       → on garde la branche SQL pour compat anciens
--                          appels mais elle n est plus declenchee.
--
-- Migration : on DROP + recreate la function record_client_xp avec les
-- nouveaux dedup_keys. Aucune perte de donnees (la table client_xp_events
-- reste intacte). Les anciens dedup_keys (ex. "tab_agenda_2026-04-28")
-- ne se chevauchent pas avec les nouveaux (ex. "tab_agenda" simple) →
-- les anciens utilisateurs gagneront +5 XP la 1ere fois apres migration,
-- ce qui est OK (effet cadeau de migration).
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
  v_client_id uuid;
  v_xp int := 0;
  v_dedup_key text;
  v_today text := to_char(now() at time zone 'Europe/Paris', 'YYYY-MM-DD');
  v_week  text := to_char(now() at time zone 'Europe/Paris', 'IYYY-"W"IW');
  v_inserted_id uuid;
  v_total_xp int := 0;
begin
  -- 1. Resolve client_id depuis le token
  select caa.client_id::uuid into v_client_id
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
    -- V2 (2026-05-08) : passes en lifetime (avant : daily)
    when 'tab_agenda'          then v_xp := 5;   v_dedup_key := 'tab_agenda';
    when 'tab_pv'              then v_xp := 5;   v_dedup_key := 'tab_pv';
    when 'tab_evolution'       then v_xp := 5;   v_dedup_key := 'tab_evolution';
    when 'tab_conseils'        then v_xp := 5;   v_dedup_key := 'tab_conseils';
    when 'message_sent'        then v_xp := 15;  v_dedup_key := 'message_sent';
    -- Caps "1x/jour" (mood_checkin reste daily — c est un check-in volontaire)
    when 'mood_checkin'        then v_xp := 5;   v_dedup_key := 'mood_checkin_' || v_today;
    -- V2 (2026-05-08) : measurement_added passe en weekly (avant : daily)
    when 'measurement_added'   then v_xp := 10;  v_dedup_key := 'measurement_added_' || v_week;
    -- Cap "1x/semaine" (legacy — onglet pesee retire mais branche conservee)
    when 'weekly_weigh_in'     then v_xp := 20;  v_dedup_key := 'weigh_in_' || v_week;
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
  'V2 caps (2026-05-08) : tab_*/message_sent passent en lifetime, measurement_added en weekly. mood_checkin reste daily. weekly_weigh_in conserve pour compat (onglet retire).';
