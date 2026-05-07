-- =============================================================================
-- get_client_xp_stats — RPC pour la fiche client coach (chantier 2026-05-08)
-- =============================================================================
--
-- Permet a un coach de visualiser les stats XP d un client depuis sa fiche
-- (/clients/:id). Le RPC existant get_client_xp(p_token) est cote app
-- client (auth via token UUID). Ici on cree une variante coach qui prend
-- directement un client_id (uuid) et qui retourne :
--   - total_xp, level, level_title (5 paliers Debutant.e → Legende)
--   - prev_threshold, next_threshold, xp_in_level, xp_to_next
--   - recent_events : 10 derniers events {action_key, xp_amount, created_at}
--
-- Auth :
--   - SECURITY DEFINER → on bypass RLS de client_xp_events
--   - check explicite : caller doit etre admin OU referent du client
--   - TODO V2 : extension role-based plus fine (ex. coach lead-only)
-- =============================================================================

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
begin
  -- 1. Auth : caller doit etre authentifie
  if v_caller_id is null then
    return jsonb_build_object('error', 'unauthenticated');
  end if;

  -- 2. Check role + referent : admin OK, sinon doit etre le referent
  --    du client (ou un coach a admin grants — on simplifie : admin OK
  --    sinon match referent_user_id).
  select role::text into v_caller_role from public.users where id = v_caller_id;
  select referent_user_id into v_client_referent from public.clients where id = p_client_id;

  if v_caller_role is null then
    return jsonb_build_object('error', 'caller_not_found');
  end if;

  if v_caller_role != 'admin' and v_client_referent != v_caller_id then
    return jsonb_build_object('error', 'forbidden');
  end if;

  -- 3. Total XP
  select coalesce(sum(xp_amount), 0)::int into v_total_xp
  from public.client_xp_events
  where client_id = p_client_id;

  -- 4. Determine level + thresholds (5 paliers — synchro avec
  --    CLIENT_XP_LEVELS dans actions.ts)
  if v_total_xp >= 1500 then
    v_level := 5; v_level_title := 'Légende';
    v_prev_threshold := 1500; v_next_threshold := 1500; -- max
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

  -- 5. Recent events (10 derniers)
  select coalesce(jsonb_agg(jsonb_build_object(
    'action_key', e.action_key,
    'xp_amount', e.xp_amount,
    'created_at', e.created_at
  ) order by e.created_at desc), '[]'::jsonb)
  into v_recent
  from (
    select action_key, xp_amount, created_at
    from public.client_xp_events
    where client_id = p_client_id
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

comment on function public.get_client_xp_stats is
  'Retourne les stats XP d un client + 10 derniers events. Reserve admin OU referent du client. Utilise par la card XP de la fiche client coach (/clients/:id).';

grant execute on function public.get_client_xp_stats(uuid) to authenticated;
