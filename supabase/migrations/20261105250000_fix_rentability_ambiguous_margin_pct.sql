-- =============================================================================
-- Fix bug "column reference margin_pct is ambiguous" (2026-05-05)
--
-- Erreur PostgreSQL remontée par Thomas en console :
--   "column reference 'margin_pct' is ambiguous"
--
-- Cause : dans la CTE `by_client` de la migration V3, j'utilise une
-- subquery scalaire `(select margin_pct from margin_lookup)` non
-- qualifiée. Postgres confond avec la colonne `margin_pct` du return
-- type de la fonction.
--
-- Fix : qualifier explicitement avec un alias dans la subquery :
--   `(select ml2.margin_pct from margin_lookup ml2 limit 1)`
-- =============================================================================

begin;

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
  revenue_brut numeric,
  margin_eur numeric,
  revenue_public numeric,
  margin_public_eur numeric,
  clients_public_count int,
  revenue_vip numeric,
  margin_vip_eur numeric,
  clients_vip_count int,
  top_clients jsonb,
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
  -- Capture le margin_pct résolu en variable PL/pgSQL pour éviter
  -- toute ambiguïté SQL avec la colonne du return type.
  v_margin_pct numeric;
  v_rank_label text;
  v_rank text;
begin
  if v_caller is null or p_user_ids is null or array_length(p_user_ids, 1) is null then
    raise exception 'access denied or empty user_ids';
  end if;

  v_user_count := array_length(p_user_ids, 1);
  v_first_user := p_user_ids[1];

  select exists (select 1 from public.users where id = v_caller and role = 'admin')
  into v_is_admin;

  if not v_is_admin then
    if not (v_caller = any(p_user_ids)) then
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

  -- Lookup margin_pct + rank dans des variables PL/pgSQL une bonne fois pour
  -- toutes. Évite toute référence SQL à `margin_pct` dans les CTE qui
  -- pourrait collisionner avec le return type column.
  select
    u.current_rank::text,
    coalesce(m.margin_pct, 25),
    coalesce(m.label, u.current_rank::text)
  into v_rank, v_margin_pct, v_rank_label
  from public.users u
  left join public.herbalife_margins m on m.rank = u.current_rank::text
  where u.id = v_first_user;

  -- Si le first_user n'existe pas (improbable mais safe)
  if v_margin_pct is null then
    v_margin_pct := 25;
    v_rank_label := 'Distributeur';
    v_rank := 'distributor_25';
  end if;

  return query
  with current_products as (
    select pcp.id,
           pcp.client_id,
           pcp.product_name,
           pcp.quantity_start as qty,
           pcp.price_public_per_unit as price,
           pcp.start_date,
           c.first_name || ' ' || c.last_name as client_name,
           c.vip_status::text as vip_status_text,
           case c.vip_status
             when 'ambassador' then 42
             when 'gold' then 35
             when 'silver' then 25
             when 'bronze' then 15
             else 0
           end::numeric as vip_discount_pct
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
           c.vip_status::text as vip_status_text,
           case c.vip_status
             when 'ambassador' then 42
             when 'gold' then 35
             when 'silver' then 25
             when 'bronze' then 15
             else 0
           end::numeric as vip_discount_pct
    from public.pv_client_products pcp
    join public.clients c on c.id = pcp.client_id
    where c.distributor_id = any(p_user_ids)
      and pcp.active = true
      and pcp.start_date >= v_prev_month_start
      and pcp.start_date <= v_prev_month_end
  ),
  by_client as (
    select
      cp.client_id,
      cp.client_name,
      cp.vip_status_text,
      cp.vip_discount_pct,
      sum(cp.price * cp.qty) as revenue,
      sum(
        cp.price * cp.qty * greatest(0::numeric, v_margin_pct - cp.vip_discount_pct) / 100
      ) as margin,
      sum(cp.qty)::int as items_count,
      array_agg(distinct cp.product_name) as products
    from current_products cp
    group by cp.client_id, cp.client_name, cp.vip_status_text, cp.vip_discount_pct
  ),
  top_5_clients as (
    select jsonb_build_object(
      'client_id', client_id,
      'client_name', client_name,
      'vip_status', vip_status_text,
      'vip_discount_pct', vip_discount_pct,
      'is_vip', vip_status_text is not null and vip_status_text <> 'none',
      'revenue', round(revenue, 2),
      'margin', round(margin, 2),
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
  agg_public as (
    select
      coalesce(sum(cp.price * cp.qty), 0)::numeric as revenue,
      coalesce(sum(
        cp.price * cp.qty * greatest(0::numeric, v_margin_pct - cp.vip_discount_pct) / 100
      ), 0)::numeric as margin_eur,
      count(distinct cp.client_id)::int as clients_count
    from current_products cp
    where cp.vip_status_text is null or cp.vip_status_text = 'none'
  ),
  agg_vip as (
    select
      coalesce(sum(cp.price * cp.qty), 0)::numeric as revenue,
      coalesce(sum(
        cp.price * cp.qty * greatest(0::numeric, v_margin_pct - cp.vip_discount_pct) / 100
      ), 0)::numeric as margin_eur,
      count(distinct cp.client_id)::int as clients_count
    from current_products cp
    where cp.vip_status_text is not null and cp.vip_status_text <> 'none'
  ),
  agg_prev as (
    select
      coalesce(sum(
        pp.price * pp.qty * greatest(0::numeric, v_margin_pct - pp.vip_discount_pct) / 100
      ), 0)::numeric as eur
    from prev_products pp
  ),
  total_count as (
    select count(*)::int as cnt from current_products
  ),
  -- Wrapper aliases pour les colonnes finales — évite tout conflit avec
  -- le return type
  scope_meta as (
    select
      p_user_ids as out_scope_user_ids,
      case
        when v_user_count = 1 then (select u.name from public.users u where u.id = v_first_user)
        else 'Couple (' || v_user_count || ' admins)'
      end as out_scope_label
  )
  select
    sm.out_scope_user_ids,
    sm.out_scope_label,
    v_rank,
    v_rank_label,
    v_margin_pct,
    -- Total
    (ap.revenue + av.revenue)::numeric,
    (ap.margin_eur + av.margin_eur)::numeric,
    -- Public split
    ap.revenue,
    ap.margin_eur,
    ap.clients_count,
    -- VIP split
    av.revenue,
    av.margin_eur,
    av.clients_count,
    -- Top clients
    t5.items,
    -- Counters
    tc.cnt,
    -- Prev month
    aprev.eur,
    -- Projection
    case
      when v_days_elapsed > 0 and v_days_elapsed < v_days_in_month then
        round((ap.margin_eur + av.margin_eur) * v_days_in_month::numeric / v_days_elapsed::numeric, 2)
      else
        round(ap.margin_eur + av.margin_eur, 2)
    end,
    v_month_start,
    v_month_end,
    v_days_elapsed,
    v_days_in_month
  from scope_meta sm
  cross join agg_public ap
  cross join agg_vip av
  cross join agg_prev aprev
  cross join top_5_agg t5
  cross join total_count tc;
end;
$$;

grant execute on function public.get_users_rentability(uuid[], date) to authenticated;

commit;
