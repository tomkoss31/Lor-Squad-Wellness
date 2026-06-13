-- =============================================================================
-- Rentabilité — top_clients : limite 5 → 50 (demande Thomas 2026-06-13)
--
-- L'analyse détaillée a maintenant une flèche « Voir tout » sur la liste
-- clients. La RPG plafonnait à 5 → on passe à 50 pour remonter (quasi) tous
-- les clients du mois, triés par revenu. Recréation VERBATIM de
-- get_users_rentability depuis 20261121130000, seul `limit 5` → `limit 50`.
--
-- ⚠️ INERTE tant que `supabase db push --linked` n'est pas lancé. Modifie une
-- RPC partagée (prod + dev) une fois poussée.
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
  v_distri_factor numeric;
  v_first_rank text;
  v_first_rank_label text;
  v_first_margin_pct numeric;
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

  select
    u.current_rank::text,
    coalesce(m.label, 'Distributeur'),
    coalesce(m.margin_pct, 25),
    case u.current_rank
      when 'distributor_25'        then 0.7258
      when 'senior_consultant_35'  then 0.6421
      when 'success_builder_42'    then 0.5835
      when 'supervisor_50'         then 0.5165
      when 'active_supervisor_50'  then 0.5165
      when 'world_team_50'         then 0.5165
      when 'active_world_team_50'  then 0.5165
      when 'get_team_50'           then 0.5165
      when 'get_team_2500_50'      then 0.5165
      when 'millionaire_50'        then 0.5165
      when 'millionaire_7500_50'   then 0.5165
      when 'presidents_50'         then 0.5165
      else 0.7258
    end::numeric
  into v_first_rank, v_first_rank_label, v_first_margin_pct, v_distri_factor
  from public.users u
  left join public.herbalife_margins m on m.rank = u.current_rank::text
  where u.id = v_first_user;

  return query
  with current_products as (
    select pcp.id,
           pcp.client_id,
           pcp.product_name,
           pcp.quantity_start as qty,
           pcp.price_public_per_unit as price,
           pcp.start_date,
           c.first_name || ' ' || c.last_name as client_name,
           c.vip_status::text as vip_status,
           case c.vip_status
             when 'ambassador' then 0.5835
             when 'gold'       then 0.6360
             when 'silver'     then 0.7189
             when 'bronze'     then 0.8018
             else 1.0000
           end::numeric as vip_factor,
           -- V6b (2026-05-21) : 3-tier fallback distri_factor
           -- 1. uplink_user_id présent → rang du user pointé
           -- 2. uplink_rank présent → rang direct
           -- 3. fallback viewer
           coalesce(
             case (select uplink.current_rank::text from public.users uplink
                   where uplink.id = c.herbalife_uplink_user_id)
               when 'distributor_25'        then 0.7258
               when 'senior_consultant_35'  then 0.6421
               when 'success_builder_42'    then 0.5835
               when 'supervisor_50'         then 0.5165
               when 'active_supervisor_50'  then 0.5165
               when 'world_team_50'         then 0.5165
               when 'active_world_team_50'  then 0.5165
               when 'get_team_50'           then 0.5165
               when 'get_team_2500_50'      then 0.5165
               when 'millionaire_50'        then 0.5165
               when 'millionaire_7500_50'   then 0.5165
               when 'presidents_50'         then 0.5165
             end,
             case c.herbalife_uplink_rank
               when 'distributor_25'        then 0.7258
               when 'senior_consultant_35'  then 0.6421
               when 'success_builder_42'    then 0.5835
               when 'supervisor_50'         then 0.5165
               when 'active_supervisor_50'  then 0.5165
               when 'world_team_50'         then 0.5165
               when 'active_world_team_50'  then 0.5165
               when 'get_team_50'           then 0.5165
               when 'get_team_2500_50'      then 0.5165
               when 'millionaire_50'        then 0.5165
               when 'millionaire_7500_50'   then 0.5165
               when 'presidents_50'         then 0.5165
             end,
             v_distri_factor
           )::numeric as effective_distri_factor
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
           case c.vip_status
             when 'ambassador' then 0.5835
             when 'gold'       then 0.6360
             when 'silver'     then 0.7189
             when 'bronze'     then 0.8018
             else 1.0000
           end::numeric as vip_factor,
           coalesce(
             case (select uplink.current_rank::text from public.users uplink
                   where uplink.id = c.herbalife_uplink_user_id)
               when 'distributor_25'        then 0.7258
               when 'senior_consultant_35'  then 0.6421
               when 'success_builder_42'    then 0.5835
               when 'supervisor_50'         then 0.5165
               when 'active_supervisor_50'  then 0.5165
               when 'world_team_50'         then 0.5165
               when 'active_world_team_50'  then 0.5165
               when 'get_team_50'           then 0.5165
               when 'get_team_2500_50'      then 0.5165
               when 'millionaire_50'        then 0.5165
               when 'millionaire_7500_50'   then 0.5165
               when 'presidents_50'         then 0.5165
             end,
             case c.herbalife_uplink_rank
               when 'distributor_25'        then 0.7258
               when 'senior_consultant_35'  then 0.6421
               when 'success_builder_42'    then 0.5835
               when 'supervisor_50'         then 0.5165
               when 'active_supervisor_50'  then 0.5165
               when 'world_team_50'         then 0.5165
               when 'active_world_team_50'  then 0.5165
               when 'get_team_50'           then 0.5165
               when 'get_team_2500_50'      then 0.5165
               when 'millionaire_50'        then 0.5165
               when 'millionaire_7500_50'   then 0.5165
               when 'presidents_50'         then 0.5165
             end,
             v_distri_factor
           )::numeric as effective_distri_factor
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
      cp.vip_factor,
      sum(cp.price * cp.qty * cp.vip_factor) as revenue,
      sum(cp.price * cp.qty * greatest(0, cp.vip_factor - cp.effective_distri_factor)) as margin,
      sum(cp.qty)::int as items_count,
      array_agg(distinct cp.product_name) as products
    from current_products cp
    group by cp.client_id, cp.client_name, cp.vip_status, cp.vip_factor
  ),
  top_5_clients as (
    select jsonb_build_object(
      'client_id', client_id,
      'client_name', client_name,
      'vip_status', vip_status,
      'vip_discount_pct', round((1 - vip_factor) * 100, 1),
      'is_vip', vip_status is not null and vip_status <> 'none',
      'revenue', round(revenue, 2),
      'margin', round(margin, 2),
      'items_count', items_count,
      'products', products
    ) as item
    from by_client
    order by revenue desc
    limit 50
  ),
  top_5_agg as (
    select coalesce(jsonb_agg(item), '[]'::jsonb) as items from top_5_clients
  ),
  agg_public as (
    select
      coalesce(sum(cp.price * cp.qty * cp.vip_factor), 0)::numeric as revenue,
      coalesce(sum(cp.price * cp.qty * greatest(0, cp.vip_factor - cp.effective_distri_factor)), 0)::numeric as margin_eur,
      count(distinct cp.client_id)::int as clients_count
    from current_products cp
    where cp.vip_status is null or cp.vip_status = 'none'
  ),
  agg_vip as (
    select
      coalesce(sum(cp.price * cp.qty * cp.vip_factor), 0)::numeric as revenue,
      coalesce(sum(cp.price * cp.qty * greatest(0, cp.vip_factor - cp.effective_distri_factor)), 0)::numeric as margin_eur,
      count(distinct cp.client_id)::int as clients_count
    from current_products cp
    where cp.vip_status is not null and cp.vip_status <> 'none'
  ),
  agg_prev as (
    select
      coalesce(sum(pp.price * pp.qty * greatest(0, pp.vip_factor - pp.effective_distri_factor)), 0)::numeric as eur
    from prev_products pp
  ),
  total_count as (
    select count(*)::int as cnt from current_products
  )
  select
    p_user_ids as scope_user_ids,
    case
      when v_user_count = 1 then (select name from public.users where id = v_first_user limit 1)
      else 'Couple (' || v_user_count || ' admins)'
    end as scope_label,
    v_first_rank,
    v_first_rank_label,
    v_first_margin_pct,
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
  from agg_public ap
  cross join agg_vip av
  cross join agg_prev aprev
  cross join total_count tc
  cross join top_5_agg t5;
end;
$$;

grant execute on function public.get_users_rentability(uuid[], date) to authenticated;

commit;
