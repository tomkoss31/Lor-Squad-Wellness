-- =============================================================================
-- Rentabilité V4 — revenue = montant réellement payé par le client (2026-05-05)
--
-- Bug remonté Thomas : la cliente Virginie DAUTEL (VIP Silver -25%) a
-- commandé pour 287,05 € HT et payé 235,04 € TTC après remise. L'app
-- affichait 324 € (= prix retail brut, sans remise VIP appliquée).
--
-- Cause : dans get_users_rentability V3, on calculait
--    revenue = sum(price_public_per_unit × qty)
-- ce qui correspond au RETAIL PUBLIC, pas à ce que le client a payé.
--
-- Fix V4 : revenue = sum(price × qty × (1 - vip_discount_pct/100)).
-- Pour le client Silver -25% : revenue = retail × 0,75.
-- Pour le client none (public sans tier) : revenue = retail (×1.0).
-- La marge € reste identique (elle dépendait déjà du delta rank%-vip%).
--
-- Impact UI :
--   - "Top clients ce mois" : montants alignés sur le réel (~235 €)
--   - revenue_public / revenue_vip / revenue_brut : tous net de remise VIP
--   - "Mois précédent" recalculé pareil pour cohérence des comparaisons
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

  return query
  with target_users as (
    select u.id, u.name, u.current_rank::text as rank
    from public.users u
    where u.id = any(p_user_ids)
  ),
  margin_lookup as (
    select coalesce(m.margin_pct, 25) as margin_pct,
           coalesce(m.label, 'Distributeur') as rank_label,
           tu.rank
    from target_users tu
    left join public.herbalife_margins m on m.rank = tu.rank
    where tu.id = v_first_user
  ),
  -- V4 : on capture aussi le facteur (1 - vip%/100) pour le revenue net.
  current_products as (
    select pcp.id,
           pcp.client_id,
           pcp.product_name,
           pcp.quantity_start as qty,
           pcp.price_public_per_unit as price,
           pcp.start_date,
           c.first_name || ' ' || c.last_name as client_name,
           c.vip_status::text as vip_status,
           case c.vip_status
             when 'ambassador' then 42
             when 'gold' then 35
             when 'silver' then 25
             when 'bronze' then 15
             else 0
           end::numeric as vip_discount_pct,
           -- Facteur prix payé par le client : 1.0 si non-VIP, 0.75 si silver, etc.
           case c.vip_status
             when 'ambassador' then 0.58
             when 'gold' then 0.65
             when 'silver' then 0.75
             when 'bronze' then 0.85
             else 1.0
           end::numeric as paid_factor
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
           c.vip_status::text as vip_status,
           case c.vip_status
             when 'ambassador' then 42
             when 'gold' then 35
             when 'silver' then 25
             when 'bronze' then 15
             else 0
           end::numeric as vip_discount_pct,
           case c.vip_status
             when 'ambassador' then 0.58
             when 'gold' then 0.65
             when 'silver' then 0.75
             when 'bronze' then 0.85
             else 1.0
           end::numeric as paid_factor
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
      cp.vip_status,
      cp.vip_discount_pct,
      -- V4 : revenue = montant payé par le client (après remise VIP)
      sum(cp.price * cp.qty * cp.paid_factor) as revenue,
      sum(
        cp.price * cp.qty * greatest(0, (
          (select margin_pct from margin_lookup) - cp.vip_discount_pct
        )) / 100
      ) as margin,
      sum(cp.qty)::int as items_count,
      array_agg(distinct cp.product_name) as products
    from current_products cp
    group by cp.client_id, cp.client_name, cp.vip_status, cp.vip_discount_pct
  ),
  top_5_clients as (
    select jsonb_build_object(
      'client_id', client_id,
      'client_name', client_name,
      'vip_status', vip_status,
      'vip_discount_pct', vip_discount_pct,
      'is_vip', vip_status is not null and vip_status <> 'none',
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
      coalesce(sum(cp.price * cp.qty * cp.paid_factor), 0)::numeric as revenue,
      coalesce(sum(
        cp.price * cp.qty * greatest(0, (ml.margin_pct - cp.vip_discount_pct)) / 100
      ), 0)::numeric as margin_eur,
      count(distinct cp.client_id)::int as clients_count
    from current_products cp
    cross join margin_lookup ml
    where cp.vip_status is null or cp.vip_status = 'none'
  ),
  agg_vip as (
    select
      coalesce(sum(cp.price * cp.qty * cp.paid_factor), 0)::numeric as revenue,
      coalesce(sum(
        cp.price * cp.qty * greatest(0, (ml.margin_pct - cp.vip_discount_pct)) / 100
      ), 0)::numeric as margin_eur,
      count(distinct cp.client_id)::int as clients_count
    from current_products cp
    cross join margin_lookup ml
    where cp.vip_status is not null and cp.vip_status <> 'none'
  ),
  agg_prev as (
    select
      coalesce(sum(
        pp.price * pp.qty * greatest(0, (ml.margin_pct - pp.vip_discount_pct)) / 100
      ), 0)::numeric as eur
    from prev_products pp
    cross join margin_lookup ml
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
    (ap.revenue + av.revenue)::numeric as revenue_brut,
    (ap.margin_eur + av.margin_eur)::numeric as margin_eur,
    ap.revenue,
    ap.margin_eur,
    ap.clients_count,
    av.revenue,
    av.margin_eur,
    av.clients_count,
    t5.items as top_clients,
    tc.cnt as products_count,
    aprev.eur as prev_month_eur,
    case
      when v_days_elapsed > 0 and v_days_elapsed < v_days_in_month then
        round((ap.margin_eur + av.margin_eur) * v_days_in_month::numeric / v_days_elapsed::numeric, 2)
      else
        round(ap.margin_eur + av.margin_eur, 2)
    end as projection_eur,
    v_month_start,
    v_month_end,
    v_days_elapsed,
    v_days_in_month
  from margin_lookup ml
  cross join agg_public ap
  cross join agg_vip av
  cross join agg_prev aprev
  cross join top_5_agg t5
  cross join total_count tc;
end;
$$;

grant execute on function public.get_users_rentability(uuid[], date) to authenticated;

comment on function public.get_users_rentability is
  'Rentabilité V4 (2026-05-05) : revenue = montant réellement payé par le client '
  '(retail × (1 - vip_discount%)). Top clients affichent désormais les vrais montants. '
  'La marge € reste calculée sur retail × (rank% - vip%) (formule mathématiquement '
  'équivalente, inchangée depuis V3).';

commit;
