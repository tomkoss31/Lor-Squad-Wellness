-- =============================================================================
-- VIP — Ajustement manuel des PV lifetime (2026-04-29)
--
-- Permet au coach de saisir manuellement le cumul PV historique d un client
-- VIP (recupere depuis myherbalife.com) sans avoir a creer 56 mois de
-- pv_transactions fictives. Le pv_lifetime calcule = sum(pv_transactions)
--   + sum(vip_pv_manual_adjustment sur l arbre).
-- =============================================================================

begin;

-- ─── 1. Colonne ajustement manuel sur clients ────────────────────────────────
alter table public.clients
  add column if not exists vip_pv_manual_adjustment numeric not null default 0;

comment on column public.clients.vip_pv_manual_adjustment is
  'Ajustement manuel du cumul PV (saisi par le coach depuis myherbalife). S ajoute au sum(pv_transactions) dans get_client_vip_status. Default 0.';

-- ─── 2. RPC pour ajuster le solde PV manuel d un client (cote coach) ────────
create or replace function public.set_client_vip_pv_adjustment(
  p_client_id uuid,
  p_adjustment numeric
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  v_distri_id uuid;
  v_caller uuid := auth.uid();
  v_old_value numeric;
begin
  if p_adjustment < 0 then
    return jsonb_build_object('error', 'negative_value_not_allowed');
  end if;

  select cli.distributor_id, cli.vip_pv_manual_adjustment
  into v_distri_id, v_old_value
  from public.clients cli
  where cli."id" = p_client_id;

  if v_distri_id is null then
    return jsonb_build_object('error', 'client_not_found');
  end if;

  if v_distri_id <> v_caller and not exists (
    select 1 from public.users where "id" = v_caller and role = 'admin' and active = true
  ) then
    return jsonb_build_object('error', 'access_denied');
  end if;

  update public.clients
  set vip_pv_manual_adjustment = p_adjustment
  where "id" = p_client_id;

  -- Refresh vip_status cache pour ce client + ascendants (si trigger v2 deja installe)
  begin
    perform public.refresh_client_vip_status(p_client_id);
  exception when undefined_function then
    -- trigger V2 pas encore installe, on skip silencieusement
    null;
  end;

  return jsonb_build_object(
    'success', true,
    'client_id', p_client_id,
    'old_value', v_old_value,
    'new_value', p_adjustment
  );
end;
$function$;

grant execute on function public.set_client_vip_pv_adjustment(uuid, numeric) to authenticated;

-- ─── 3. Recree get_client_vip_status pour inclure l ajustement manuel ──────
create or replace function public.get_client_vip_status(p_client_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  v_3m_start date := (current_date - interval '3 months')::date;
  v_pv_lifetime numeric;
  v_pv_3m numeric;
  v_pv_manual numeric;
  v_has_first_order boolean;
  v_level text;
  v_discount int;
  v_next_threshold int;
  v_descendants_count int;
  v_branch_count int;
begin
  if not exists (select 1 from public.clients where "id" = p_client_id) then
    return jsonb_build_object('error', 'client_not_found');
  end if;

  with recursive tree as (
    select p_client_id::uuid as cid, 0 as depth
    union all
    select cli."id", t.depth + 1
    from public.clients cli
    join tree t on cli.vip_sponsor_client_id = t.cid
  ),
  pv_lifetime as (
    select coalesce(sum(tx.pv * coalesce(tx.quantity, 1)), 0)::numeric as pv
    from public.pv_transactions tx
    join tree t on t.cid = tx.client_id
  ),
  pv_3m as (
    select coalesce(sum(tx.pv * coalesce(tx.quantity, 1)), 0)::numeric as pv
    from public.pv_transactions tx
    join tree t on t.cid = tx.client_id
    where tx.date >= v_3m_start
  ),
  pv_manual as (
    select coalesce(sum(cli.vip_pv_manual_adjustment), 0)::numeric as pv
    from public.clients cli
    join tree t on t.cid = cli."id"
  ),
  first_order as (
    select (
      exists (select 1 from public.pv_transactions where client_id = p_client_id limit 1)
      or (select cli.vip_pv_manual_adjustment from public.clients cli where cli."id" = p_client_id) > 0
    ) as has_order
  ),
  branch_stats as (
    select
      (select count(*) from tree where depth > 0)::int as desc_count,
      (select count(*) from tree where depth = 1)::int as direct_count
  )
  select
    pv_lifetime.pv,
    pv_3m.pv,
    pv_manual.pv,
    first_order.has_order,
    branch_stats.desc_count,
    branch_stats.direct_count
  into v_pv_lifetime, v_pv_3m, v_pv_manual, v_has_first_order, v_descendants_count, v_branch_count
  from pv_lifetime, pv_3m, pv_manual, first_order, branch_stats;

  -- Ajustement manuel ajoute uniquement au lifetime (pas au 3m, qui reste un
  -- cumul reel commande par commande pour l Ambassadeur).
  v_pv_lifetime := v_pv_lifetime + v_pv_manual;

  if v_pv_3m >= 1000 then
    v_level := 'ambassador';
    v_discount := 42;
    v_next_threshold := 1000;
  elsif v_pv_lifetime >= 500 then
    v_level := 'gold';
    v_discount := 35;
    v_next_threshold := 1000;
  elsif v_pv_lifetime >= 100 then
    v_level := 'silver';
    v_discount := 25;
    v_next_threshold := 500;
  elsif v_has_first_order then
    v_level := 'bronze';
    v_discount := 15;
    v_next_threshold := 100;
  else
    v_level := 'none';
    v_discount := 0;
    v_next_threshold := 1;
  end if;

  return jsonb_build_object(
    'client_id', p_client_id,
    'pv_lifetime', round(v_pv_lifetime)::int,
    'pv_3m', round(v_pv_3m)::int,
    'pv_manual_adjustment', round(v_pv_manual)::int,
    'has_first_order', v_has_first_order,
    'level', v_level,
    'discount_pct', v_discount,
    'next_threshold', v_next_threshold,
    'descendants_count', v_descendants_count,
    'direct_referrals_count', v_branch_count,
    'is_ambassador_eligible', v_pv_3m >= 1000,
    'computed_at', now()
  );
end;
$function$;

revoke all on function public.get_client_vip_status(uuid) from public, anon;
grant execute on function public.get_client_vip_status(uuid) to authenticated, anon;

commit;
