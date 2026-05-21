-- =============================================================================
-- Rentabilité — Historique 12 mois (chantier Rentabilité Premium V2 2026-05-20)
--
-- Nouvelle RPC `get_user_rentability_history(p_user_ids, p_months)` qui
-- renvoie un tableau `{ month_start, margin_eur }` pour les `p_months`
-- derniers mois (inclus le mois courant).
--
-- Utilise les mêmes facteurs de marge que `get_users_rentability` :
--   - distri_factor selon le rang Herbalife (Distributor 25% → Supervisor+ 50%)
--   - vip_factor selon le statut client (none/bronze/silver/gold/ambassador)
-- =============================================================================

begin;

drop function if exists public.get_user_rentability_history(uuid[], int);

create function public.get_user_rentability_history(
  p_user_ids uuid[],
  p_months int default 12
)
returns table (
  month_start date,
  margin_eur numeric
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_caller uuid := auth.uid();
  v_is_admin boolean := false;
  v_first_user uuid;
  v_distri_factor numeric;
  v_today date := current_date;
  v_n int := least(greatest(p_months, 1), 36);
begin
  if v_caller is null or p_user_ids is null or array_length(p_user_ids, 1) is null then
    raise exception 'access denied or empty user_ids';
  end if;
  v_first_user := p_user_ids[1];

  select exists (select 1 from public.users where id = v_caller and role = 'admin')
  into v_is_admin;

  -- Auth check : même logique que get_users_rentability
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

  -- Distri factor du user principal selon son rang
  select case u.current_rank
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
  into v_distri_factor
  from public.users u
  where u.id = v_first_user;

  return query
  with months as (
    select date_trunc('month', v_today - (gs * interval '1 month'))::date as m
    from generate_series(v_n - 1, 0, -1) as gs
  ),
  per_product as (
    select
      date_trunc('month', pcp.start_date)::date as m,
      pcp.quantity_start as qty,
      pcp.price_public_per_unit as price,
      case c.vip_status
        when 'ambassador' then 0.5835
        when 'gold'       then 0.6360
        when 'silver'     then 0.7189
        when 'bronze'     then 0.8018
        else 1.0000
      end::numeric as vip_factor
    from public.pv_client_products pcp
    join public.clients c on c.id = pcp.client_id
    where c.distributor_id = any(p_user_ids)
      and pcp.active = true
      and pcp.start_date >= (select min(m) from months)
      and pcp.start_date < (select max(m) from months) + interval '1 month'
  ),
  per_month as (
    select pp.m, sum(pp.price * pp.qty * greatest(0, pp.vip_factor - v_distri_factor))::numeric as eur
    from per_product pp
    group by pp.m
  )
  select
    months.m as month_start,
    coalesce(round(per_month.eur, 2), 0)::numeric as margin_eur
  from months
  left join per_month on per_month.m = months.m
  order by months.m asc;
end;
$$;

grant execute on function public.get_user_rentability_history(uuid[], int) to authenticated;

comment on function public.get_user_rentability_history(uuid[], int) is
  'Chantier Rentabilité Premium V2 (2026-05-20) : historique mensuel des marges sur les N derniers mois pour un viewer (ou couple).';

commit;
