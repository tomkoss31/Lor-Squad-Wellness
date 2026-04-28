-- =============================================================================
-- VIP — Activation manuelle du programme (2026-04-29)
--
-- Probleme : actuellement get_client_vip_status compte TOUS les PV historiques
-- du client + descendants pour calculer le palier. Du coup, des qu'un client
-- commande un produit (meme avant inscription au programme VIP), le compteur
-- VIP s'incremente et le palier evolue tout seul.
--
-- Comportement voulu :
--   1. Le coach active manuellement le programme VIP (= clients.vip_started_at)
--      quand le client a paye le pack avantage 36 EUR et est inscrit sur
--      myherbalife.com.
--   2. Tant que vip_started_at est null -> level = 'none', pv = 0.
--   3. Une fois active -> on ne compte que les transactions a partir de
--      vip_started_at (les PV historiques anterieurs ne comptent pas, sauf
--      si le coach les a saisis via l'ajustement manuel).
-- =============================================================================

begin;

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
  v_vip_started_at timestamptz;
  v_vip_started_date date;
begin
  if not exists (select 1 from public.clients where "id" = p_client_id) then
    return jsonb_build_object('error', 'client_not_found');
  end if;

  -- Lecture vip_started_at (date d'activation manuelle par le coach)
  select cli.vip_started_at into v_vip_started_at
  from public.clients cli where cli."id" = p_client_id;

  -- Si VIP pas active -> retour direct level='none', pv=0
  if v_vip_started_at is null then
    return jsonb_build_object(
      'client_id', p_client_id,
      'pv_lifetime', 0,
      'pv_3m', 0,
      'pv_manual_adjustment', 0,
      'has_first_order', false,
      'level', 'none',
      'discount_pct', 0,
      'next_threshold', 1,
      'descendants_count', 0,
      'direct_referrals_count', 0,
      'is_ambassador_eligible', false,
      'vip_active', false,
      'vip_started_at', null,
      'computed_at', now()
    );
  end if;

  v_vip_started_date := v_vip_started_at::date;

  with recursive tree as (
    select p_client_id::uuid as cid, 0 as depth
    union all
    select cli."id", t.depth + 1
    from public.clients cli
    join tree t on cli.vip_sponsor_client_id = t.cid
  ),
  pv_lifetime as (
    -- Filtre : seules les transactions APRES l'activation VIP comptent
    select coalesce(sum(tx.pv * coalesce(tx.quantity, 1)), 0)::numeric as pv
    from public.pv_transactions tx
    join tree t on t.cid = tx.client_id
    where tx.date >= v_vip_started_date
  ),
  pv_3m as (
    select coalesce(sum(tx.pv * coalesce(tx.quantity, 1)), 0)::numeric as pv
    from public.pv_transactions tx
    join tree t on t.cid = tx.client_id
    where tx.date >= greatest(v_3m_start, v_vip_started_date)
  ),
  pv_manual as (
    -- Manual adjustments restent comptes (cumul historique myherbalife)
    select coalesce(sum(cli.vip_pv_manual_adjustment), 0)::numeric as pv
    from public.clients cli
    join tree t on t.cid = cli."id"
  ),
  first_order as (
    select (
      exists (
        select 1 from public.pv_transactions
        where client_id = p_client_id and date >= v_vip_started_date
        limit 1
      )
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

  v_pv_lifetime := v_pv_lifetime + v_pv_manual;

  if v_pv_3m >= 1000 then
    v_level := 'ambassador'; v_discount := 42; v_next_threshold := 1000;
  elsif v_pv_lifetime >= 500 then
    v_level := 'gold'; v_discount := 35; v_next_threshold := 1000;
  elsif v_pv_lifetime >= 100 then
    v_level := 'silver'; v_discount := 25; v_next_threshold := 500;
  elsif v_has_first_order then
    v_level := 'bronze'; v_discount := 15; v_next_threshold := 100;
  else
    v_level := 'none'; v_discount := 0; v_next_threshold := 1;
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
    'vip_active', true,
    'vip_started_at', v_vip_started_at,
    'computed_at', now()
  );
end;
$function$;

revoke all on function public.get_client_vip_status(uuid) from public, anon;
grant execute on function public.get_client_vip_status(uuid) to authenticated, anon;

commit;
