-- =============================================================================
-- FIX VIP — caa.token est uuid, pas text (2026-04-29)
--
-- Erreur Supabase : "operator does not exist: uuid = text" sur les 3 RPC
-- by_token : get_client_vip_status_by_token, get_client_referral_tree_by_token,
-- record_client_referral_intention.
--
-- Cause : la table client_app_accounts.token est typee uuid, mais les RPC
-- recoivent p_token text et font where caa.token = p_token. Postgres ne
-- coerce pas implicitement uuid <-> text.
--
-- Fix : where caa.token::text = p_token (safer que p_token::uuid qui throw
-- si le token URL n'est pas un uuid valide — on prefere comparer en text).
-- =============================================================================

begin;

-- ─── 1. record_client_referral_intention ────────────────────────────────────
create or replace function public.record_client_referral_intention(
  p_token text,
  p_first_name text,
  p_relationship text default null,
  p_notes text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  v_client_id text;
  v_client_uuid uuid;
  v_intention_id uuid;
begin
  if p_first_name is null or length(trim(p_first_name)) < 1 then
    return jsonb_build_object('error', 'first_name_required');
  end if;

  select caa.client_id into v_client_id
  from public.client_app_accounts caa
  where caa.token::text = p_token limit 1;

  if v_client_id is null then
    return jsonb_build_object('error', 'invalid_token');
  end if;

  begin
    v_client_uuid := v_client_id::uuid;
  exception when invalid_text_representation then
    return jsonb_build_object('error', 'invalid_client_id_format');
  end;

  insert into public.client_referral_intentions
    (referrer_client_id, prospect_first_name, relationship, notes)
  values
    (v_client_uuid, trim(p_first_name), p_relationship, p_notes)
  returning id into v_intention_id;

  return jsonb_build_object(
    'success', true,
    'intention_id', v_intention_id
  );
end;
$function$;

grant execute on function public.record_client_referral_intention(text, text, text, text) to anon, authenticated;

-- ─── 2. get_client_vip_status_by_token ──────────────────────────────────────
create or replace function public.get_client_vip_status_by_token(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  v_client_id_text text;
  v_client_uuid uuid;
begin
  select caa.client_id into v_client_id_text
  from public.client_app_accounts caa
  where caa.token::text = p_token limit 1;

  if v_client_id_text is null then
    return jsonb_build_object('error', 'invalid_token');
  end if;

  begin
    v_client_uuid := v_client_id_text::uuid;
  exception when invalid_text_representation then
    return jsonb_build_object('error', 'invalid_client_id_format');
  end;

  return public.get_client_vip_status(v_client_uuid);
end;
$function$;

grant execute on function public.get_client_vip_status_by_token(text) to anon, authenticated;

-- ─── 3. get_client_referral_tree_by_token ──────────────────────────────────
create or replace function public.get_client_referral_tree_by_token(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  v_client_id_text text;
  v_client_uuid uuid;
begin
  select caa.client_id into v_client_id_text
  from public.client_app_accounts caa
  where caa.token::text = p_token limit 1;

  if v_client_id_text is null then
    return jsonb_build_object('error', 'invalid_token');
  end if;

  begin
    v_client_uuid := v_client_id_text::uuid;
  exception when invalid_text_representation then
    return jsonb_build_object('error', 'invalid_client_id_format');
  end;

  return public.get_client_referral_tree(v_client_uuid);
end;
$function$;

grant execute on function public.get_client_referral_tree_by_token(text) to anon, authenticated;

commit;
