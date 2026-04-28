-- =============================================================================
-- FIX VIP — cascade lookup token sur 3 tables (2026-04-29)
--
-- Le edge function client-app-data fait deja un fallback en cascade sur :
--   1. client_app_accounts.token (canonique)
--   2. client_recaps.token (post-bilan, partage RDV)
--   3. client_evolution_reports.token (rapport evolution)
--
-- Les RPC VIP by_token ne regardaient que la table 1 → renvoyaient
-- "invalid_token" pour les ~85% de clients qui ouvrent l'app via un
-- lien recap/evolution. L'app chargeait quand meme (greeting, XP) mais
-- la section VIP restait invisible.
--
-- Fix : meme cascade dans les 3 RPC.
-- =============================================================================

begin;

-- ─── Helper interne : resolve token → client_id (cascade 3 tables) ─────────
create or replace function public._resolve_client_id_from_token(p_token text)
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  v_client_id text;
begin
  -- 1) client_app_accounts (canonique)
  select caa.client_id into v_client_id
  from public.client_app_accounts caa
  where caa.token::text = p_token limit 1;
  if v_client_id is not null then return v_client_id; end if;

  -- 2) client_recaps (post-bilan)
  begin
    select cr.client_id::text into v_client_id
    from public.client_recaps cr
    where cr.token::text = p_token limit 1;
    if v_client_id is not null then return v_client_id; end if;
  exception when undefined_table then null;
  end;

  -- 3) client_evolution_reports (rapport evolution)
  begin
    select cer.client_id::text into v_client_id
    from public.client_evolution_reports cer
    where cer.token::text = p_token limit 1;
    if v_client_id is not null then return v_client_id; end if;
  exception when undefined_table then null;
  end;

  return null;
end;
$function$;

revoke all on function public._resolve_client_id_from_token(text) from public;
grant execute on function public._resolve_client_id_from_token(text) to anon, authenticated;

-- ─── 1. record_client_referral_intention ──────────────────────────────────
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

  v_client_id := public._resolve_client_id_from_token(p_token);
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

  return jsonb_build_object('success', true, 'intention_id', v_intention_id);
end;
$function$;

grant execute on function public.record_client_referral_intention(text, text, text, text) to anon, authenticated;

-- ─── 2. get_client_vip_status_by_token ───────────────────────────────────
create or replace function public.get_client_vip_status_by_token(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  v_client_id text;
  v_client_uuid uuid;
begin
  v_client_id := public._resolve_client_id_from_token(p_token);
  if v_client_id is null then
    return jsonb_build_object('error', 'invalid_token');
  end if;

  begin
    v_client_uuid := v_client_id::uuid;
  exception when invalid_text_representation then
    return jsonb_build_object('error', 'invalid_client_id_format');
  end;

  return public.get_client_vip_status(v_client_uuid);
end;
$function$;

grant execute on function public.get_client_vip_status_by_token(text) to anon, authenticated;

-- ─── 3. get_client_referral_tree_by_token ────────────────────────────────
create or replace function public.get_client_referral_tree_by_token(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  v_client_id text;
  v_client_uuid uuid;
begin
  v_client_id := public._resolve_client_id_from_token(p_token);
  if v_client_id is null then
    return jsonb_build_object('error', 'invalid_token');
  end if;

  begin
    v_client_uuid := v_client_id::uuid;
  exception when invalid_text_representation then
    return jsonb_build_object('error', 'invalid_client_id_format');
  end;

  return public.get_client_referral_tree(v_client_uuid);
end;
$function$;

grant execute on function public.get_client_referral_tree_by_token(text) to anon, authenticated;

commit;
