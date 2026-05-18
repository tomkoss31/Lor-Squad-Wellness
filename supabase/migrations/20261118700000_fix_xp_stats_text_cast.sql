-- =============================================================================
-- Fix RPC get_client_xp_stats : cast p_client_id::text (2026-05-18)
-- =============================================================================
-- Bug "operator does not exist: text = uuid" : client_xp_events.client_id
-- est de type TEXT (pour matcher client_app_accounts.client_id, cf. CLAUDE.md
-- règle "jamais ::uuid en policy permissive"). Or la RPC reçoit p_client_id
-- en uuid → comparaison text = uuid plante. Fix : cast ::text dans les 2
-- SELECT qui lisent client_xp_events.
-- =============================================================================

begin;

create or replace function public.get_client_xp_stats(p_client_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller_id uuid := auth.uid();
  v_caller_role text;
  v_client_referent uuid;
  v_total_xp int := 0;
  v_level int := 1;
  v_level_title text := 'Débutant.e';
  v_prev_threshold int := 0;
  v_next_threshold int := 100;
  v_recent jsonb;
  v_client_text text := p_client_id::text;
begin
  if v_caller_id is null then
    return jsonb_build_object('error', 'unauthenticated');
  end if;

  select role::text into v_caller_role from public.users where id = v_caller_id;
  select distributor_id into v_client_referent from public.clients where id = p_client_id;

  if v_caller_role is null then
    return jsonb_build_object('error', 'caller_not_found');
  end if;

  if v_caller_role != 'admin' and v_client_referent != v_caller_id then
    return jsonb_build_object('error', 'forbidden');
  end if;

  -- Fix 2026-05-18 : client_xp_events.client_id est TEXT, on cast l'uuid.
  select coalesce(sum(xp_amount), 0)::int into v_total_xp
  from public.client_xp_events
  where client_id = v_client_text;

  if v_total_xp >= 1500 then
    v_level := 5; v_level_title := 'Légende';
    v_prev_threshold := 1500; v_next_threshold := 1500;
  elsif v_total_xp >= 700 then
    v_level := 4; v_level_title := 'Champion.ne';
    v_prev_threshold := 700;  v_next_threshold := 1500;
  elsif v_total_xp >= 300 then
    v_level := 3; v_level_title := 'Engagé.e';
    v_prev_threshold := 300;  v_next_threshold := 700;
  elsif v_total_xp >= 100 then
    v_level := 2; v_level_title := 'En route';
    v_prev_threshold := 100;  v_next_threshold := 300;
  else
    v_level := 1; v_level_title := 'Débutant.e';
    v_prev_threshold := 0;    v_next_threshold := 100;
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'action_key', e.action_key,
    'xp_amount', e.xp_amount,
    'created_at', e.created_at
  ) order by e.created_at desc), '[]'::jsonb)
  into v_recent
  from (
    select action_key, xp_amount, created_at
    from public.client_xp_events
    where client_id = v_client_text
    order by created_at desc
    limit 10
  ) e;

  return jsonb_build_object(
    'total_xp', v_total_xp,
    'level', v_level,
    'level_title', v_level_title,
    'prev_threshold', v_prev_threshold,
    'next_threshold', v_next_threshold,
    'xp_in_level', v_total_xp - v_prev_threshold,
    'xp_to_next', greatest(0, v_next_threshold - v_total_xp),
    'recent_events', v_recent
  );
end;
$$;

grant execute on function public.get_client_xp_stats(uuid) to authenticated;

commit;
