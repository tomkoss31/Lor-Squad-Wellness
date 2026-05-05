-- =============================================================================
-- Rentabilité V2 — couple + top clients + VIP split (2026-05-05)
--
-- Fixes après feedback Thomas (5 mai matin) :
--   1. Multi-user : on passe un array d'IDs (1 = distri seul, 2 = couple
--      Thomas+Mélanie agrégé). Évite la duplication front + RPC.
--   2. Top CLIENTS au lieu de top produits (les noms produits internes
--      "Phyto Complete" / "Mélange pour boisson protéinée" ne parlaient
--      pas à Thomas — un nom client c'est concret).
--   3. VIP split : on calcule séparément la marge publique (50%) et la
--      marge VIP (25 % = différence entre 50% et la remise client 25%).
--      Logique : client VIP paie prix×0.75, distri achète à prix×0.50,
--      donc marge nette distri = prix×0.25 sur ces clients-là.
-- =============================================================================

begin;

drop function if exists public.get_user_rentability(uuid, date);
drop function if exists public.get_users_rentability(uuid[], date);

create function public.get_users_rentability(
  p_user_ids uuid[],
  p_month date default null
)
returns table (
  scope_user_ids uuid[],
  scope_label text,
  rank text,
  rank_label text,
  margin_pct numeric,
  -- Total agrégé (toutes catégories clients)
  revenue_brut numeric,
  margin_eur numeric,
  -- Split public / VIP
  revenue_public numeric,
  margin_public_eur numeric,
  clients_public_count int,
  revenue_vip numeric,
  margin_vip_eur numeric,
  clients_vip_count int,
  -- Top 5 clients
  top_clients jsonb,
  -- Compteurs / projection / mois précédent
  products_count int,
  prev_month_eur numeric,
  projection_eur numeric,
  month_start date,
  month_end date,
  days_elapsed int,
  days_in_month int
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_caller uuid := auth.uid();
  v_is_admin boolean := false;
  v_month date;
  v_month_start date;
  v_month_end date;
  v_prev_month_start date;
  v_prev_month_end date;
  v_now timestamptz := now();
  v_days_elapsed int;
  v_days_in_month int;
  v_first_user uuid;
  v_user_count int;
  -- Remise standard client VIP Herbalife (25 % off prix public)
  v_vip_discount numeric := 0.25;
begin
  if v_caller is null or p_user_ids is null or array_length(p_user_ids, 1) is null then
    raise exception 'access denied or empty user_ids';
  end if;

  v_user_count := array_length(p_user_ids, 1);
  v_first_user := p_user_ids[1];

  select exists (select 1 from public.users where id = v_caller and role = 'admin')
  into v_is_admin;

  -- Sécurité : non-admin ne peut requêter que ses propres ID(s) ou son sous-arbre
  if not v_is_admin then
    -- Allowed = caller IS one of p_user_ids OR caller is ancestor of all of them
    if not (v_caller = any(p_user_ids)) then
      -- Vérifier que TOUS les targets sont dans le sous-arbre du caller
      if exists (
        select 1 from unnest(p_user_ids) target_id
        where not exists (
          with recursive ancestors as (
            select u.id, u.sponsor_id from public.users u where u.id = target_id
            union all
            select u.id, u.sponsor_id
            from public.users u
            join ancestors a on u.id = a.sponsor_id
          )
          select 1 from ancestors where id = v_caller
        )
      ) then
        raise exception 'access denied: not all targets are in your sub-tree';
      end if;
    end if;
  end if;

  v_month := coalesce(p_month, date_trunc('month', v_now)::date);
  v_month_start := date_trunc('month', v_month)::date;
  v_month_end := (v_month_start + interval '1 month' - interval '1 day')::date;
  v_prev_month_start := (v_month_start - interval '1 month')::date;
  v_prev_month_end := (v_month_start - interval '1 day')::date;

  v_days_in_month := extract(day from v_month_end)::int;
  if v_month_start = date_trunc('month', v_now)::date then
    v_days_elapsed := extract(day from v_now)::int;
  else
    v_days_elapsed := v_days_in_month;
  end if;

  return query
  with target_users as (
    select u.id, u.name, u.current_rank::text as rank
    from public.users u
    where u.id = any(p_user_ids)
  ),
  -- Marge selon le rang du PREMIER user (Thomas typically). Si couple,
  -- ils ont le même rang dans la pratique (admins).
  margin_lookup as (
    select coalesce(m.margin_pct, 25) as margin_pct,
           coalesce(m.label, 'Distributeur') as rank_label,
           tu.rank
    from target_users tu
    left join public.herbalife_margins m on m.rank = tu.rank
    where tu.id = v_first_user
  ),
  -- Tous les pv_client_products actifs ce mois pour TOUS les distri du scope
  current_products as (
    select pcp.id,
           pcp.client_id,
           pcp.product_name,
           pcp.quantity_start as qty,
           pcp.price_public_per_unit as price,
           pcp.start_date,
           c.first_name || ' ' || c.last_name as client_name,
           c.vip_status::text as vip_status
    from public.pv_client_products pcp
    join public.clients c on c.id = pcp.client_id
    where c.distributor_id = any(p_user_ids)
      and pcp.active = true
      and pcp.start_date >= v_month_start
      and pcp.start_date <= v_month_end
  ),
  prev_products as (
    select pcp.quantity_start as qty,
           pcp.price_public_per_unit as price,
           c.vip_status::text as vip_status
    from public.pv_client_products pcp
    join public.clients c on c.id = pcp.client_id
    where c.distributor_id = any(p_user_ids)
      and pcp.active = true
      and pcp.start_date >= v_prev_month_start
      and pcp.start_date <= v_prev_month_end
  ),
  -- Aggregé par client (pour le top 5)
  by_client as (
    select
      cp.client_id,
      cp.client_name,
      cp.vip_status,
      sum(cp.price * cp.qty) as revenue,
      sum(cp.qty)::int as items_count,
      array_agg(distinct cp.product_name) as products
    from current_products cp
    group by cp.client_id, cp.client_name, cp.vip_status
  ),
  top_5_clients as (
    select jsonb_build_object(
      'client_id', client_id,
      'client_name', client_name,
      'vip_status', vip_status,
      'is_vip', vip_status is not null and vip_status <> 'none',
      'revenue', revenue,
      'items_count', items_count,
      'products', products
    ) as item
    from by_client
    order by revenue desc
    limit 5
  ),
  top_5_agg as (
    select coalesce(jsonb_agg(item), '[]'::jsonb) as items from top_5_clients
  ),
  -- Split public vs VIP
  agg_public as (
    select
      coalesce(sum(cp.price * cp.qty), 0)::numeric as revenue,
      count(distinct cp.client_id)::int as clients_count
    from current_products cp
    where cp.vip_status is null or cp.vip_status = 'none'
  ),
  agg_vip as (
    select
      coalesce(sum(cp.price * cp.qty), 0)::numeric as revenue,
      count(distinct cp.client_id)::int as clients_count
    from current_products cp
    where cp.vip_status is not null and cp.vip_status <> 'none'
  ),
  -- Mois précédent (split aussi pour comparaison juste)
  agg_prev as (
    select
      coalesce(sum(case
        when pp.vip_status is null or pp.vip_status = 'none'
          then pp.price * pp.qty * (ml.margin_pct / 100)
        else
          -- VIP : marge nette = (prix × (1 - vip_discount)) - (prix × cost) = prix × (margin_pct/100 - vip_discount)
          pp.price * pp.qty * greatest(0, (ml.margin_pct / 100) - v_vip_discount)
      end), 0)::numeric as eur
    from prev_products pp
    cross join margin_lookup ml
  ),
  agg_total as (
    select
      ap.revenue + av.revenue as revenue_brut,
      ap.clients_count as public_count,
      av.clients_count as vip_count,
      (ap.revenue + av.revenue) * 1 as items_total
    from agg_public ap, agg_vip av
  ),
  total_count as (
    select count(*)::int as cnt from current_products
  )
  select
    p_user_ids as scope_user_ids,
    case
      when v_user_count = 1 then (select name from target_users limit 1)
      else 'Couple (' || v_user_count || ' admins)'
    end as scope_label,
    ml.rank,
    ml.rank_label,
    ml.margin_pct,
    -- Total revenue
    at.revenue_brut::numeric as revenue_brut,
    -- Total marge = marge publique + marge VIP
    (
      ap.revenue * (ml.margin_pct / 100)
      + av.revenue * greatest(0, (ml.margin_pct / 100) - v_vip_discount)
    )::numeric as margin_eur,
    -- Public split
    ap.revenue::numeric as revenue_public,
    (ap.revenue * (ml.margin_pct / 100))::numeric as margin_public_eur,
    ap.clients_count as clients_public_count,
    -- VIP split
    av.revenue::numeric as revenue_vip,
    (av.revenue * greatest(0, (ml.margin_pct / 100) - v_vip_discount))::numeric as margin_vip_eur,
    av.clients_count as clients_vip_count,
    -- Top clients
    t5.items as top_clients,
    -- Counters
    tc.cnt as products_count,
    -- Prev month total margin
    aprev.eur as prev_month_eur,
    -- Projection
    case
      when v_days_elapsed > 0 and v_days_elapsed < v_days_in_month then
        round((
          ap.revenue * (ml.margin_pct / 100)
          + av.revenue * greatest(0, (ml.margin_pct / 100) - v_vip_discount)
        ) * v_days_in_month::numeric / v_days_elapsed::numeric, 2)
      else
        round(
          ap.revenue * (ml.margin_pct / 100)
          + av.revenue * greatest(0, (ml.margin_pct / 100) - v_vip_discount),
          2
        )
    end as projection_eur,
    v_month_start,
    v_month_end,
    v_days_elapsed,
    v_days_in_month
  from margin_lookup ml
  cross join agg_public ap
  cross join agg_vip av
  cross join agg_total at
  cross join agg_prev aprev
  cross join top_5_agg t5
  cross join total_count tc;
end;
$$;

grant execute on function public.get_users_rentability(uuid[], date) to authenticated;

comment on function public.get_users_rentability is
  'Rentabilité V2 (2026-05-05) : agrégation multi-user (1 distri seul OU '
  'couple admins fusionnés) avec split public/VIP et top 5 clients.';

commit;
