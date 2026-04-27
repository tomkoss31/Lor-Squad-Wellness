-- =============================================================================
-- Chantier D — Analytics admin (2026-04-29)
--
-- RPC qui retourne en 1 appel toutes les metriques business pour la page
-- /analytics : KPI principaux, funnel conversion, top produits, top distri,
-- tendance bilans 12 mois, alertes operationnelles.
--
-- SECURITY DEFINER + check is_admin() en tete. Reservee aux admins
-- (Thomas, Mel) — les distri ne voient pas les metriques globales.
-- =============================================================================

begin;

drop function if exists public.get_admin_analytics();

create or replace function public.get_admin_analytics()
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_month_start date := date_trunc('month', current_date)::date;
  v_prev_month_start date := (date_trunc('month', current_date) - interval '1 month')::date;
  v_prev_month_end date := (date_trunc('month', current_date) - interval '1 day')::date;

  v_kpi_bilans_mois int;
  v_kpi_bilans_prev int;
  v_kpi_clients_actifs int;
  v_kpi_clients_actifs_prev int;
  v_kpi_pv_mois numeric;
  v_kpi_conversion_pct numeric;

  v_funnel_bilans int;
  v_funnel_inscrits int;
  v_funnel_actifs int;
  v_funnel_actifs_30d int;

  v_top_produits jsonb;
  v_top_distri jsonb;
  v_tendance_12_mois jsonb;
  v_alertes jsonb;
begin
  if not public.is_admin() then
    raise exception 'access denied: admin role required';
  end if;

  -- ─── KPI 1 : nb bilans ce mois (initiaux) ─────────────────────────────
  select count(*)::int into v_kpi_bilans_mois
  from public.assessments
  where type = 'initial' and created_at >= v_month_start;

  select count(*)::int into v_kpi_bilans_prev
  from public.assessments
  where type = 'initial'
    and created_at >= v_prev_month_start
    and created_at < v_month_start;

  -- ─── KPI 2 : clients actifs (lifecycle=active) ────────────────────────
  select count(*)::int into v_kpi_clients_actifs
  from public.clients
  where lifecycle_status = 'active';

  -- Snapshot M-1 : approximation = clients crees avant debut mois
  -- ET pas marques 'lost'/'stopped' avant fin M-1 (heuristique simple).
  select count(*)::int into v_kpi_clients_actifs_prev
  from public.clients
  where created_at < v_month_start
    and (lifecycle_updated_at is null or lifecycle_updated_at >= v_prev_month_end);

  -- ─── KPI 3 : PV mois (total tous distri) ──────────────────────────────
  -- pv_client_products.active = true ET created_at >= debut mois
  select coalesce(sum(p.pv_value * coalesce(p.quantity, 1)), 0)::numeric into v_kpi_pv_mois
  from public.pv_client_products p
  where p.active = true
    and p.created_at >= v_month_start;

  -- ─── KPI 4 : conversion (prospects -> clients ce mois) ────────────────
  -- Approximation : nb clients crees ce mois / nb prospects crees ce mois
  with prospects_mois as (
    select count(*)::int as cnt from public.prospects where created_at >= v_month_start
  ),
  clients_mois as (
    select count(*)::int as cnt from public.clients where created_at >= v_month_start
  )
  select case
    when (select cnt from prospects_mois) = 0 then 0
    else round(((select cnt from clients_mois)::numeric / (select cnt from prospects_mois)::numeric) * 100, 1)
  end into v_kpi_conversion_pct;

  -- ─── Funnel conversion ────────────────────────────────────────────────
  select count(*)::int into v_funnel_bilans
  from public.assessments
  where type = 'initial' and created_at >= v_month_start;

  select count(distinct c.id)::int into v_funnel_inscrits
  from public.clients c
  where c.created_at >= v_month_start;

  select count(*)::int into v_funnel_actifs
  from public.clients
  where lifecycle_status = 'active'
    and created_at >= v_month_start;

  select count(*)::int into v_funnel_actifs_30d
  from public.clients
  where lifecycle_status = 'active'
    and created_at >= v_month_start
    and created_at <= current_date - interval '30 days';

  -- ─── Top 5 produits du mois (par PV) ──────────────────────────────────
  select coalesce(jsonb_agg(row_to_json(t)), '[]'::jsonb) into v_top_produits
  from (
    select
      product_name as name,
      sum(quantity)::int as quantity,
      round(sum(pv_value * coalesce(quantity, 1))::numeric, 1) as total_pv
    from public.pv_client_products
    where active = true
      and created_at >= v_month_start
    group by product_name
    order by total_pv desc
    limit 5
  ) t;

  -- ─── Top 3 distri par bilans ce mois ──────────────────────────────────
  select coalesce(jsonb_agg(row_to_json(t)), '[]'::jsonb) into v_top_distri
  from (
    select
      u.name,
      count(*)::int as bilans
    from public.assessments a
    join public.clients c on c.id = a.client_id
    join public.users u on u.id = c.distributor_id
    where a.type = 'initial'
      and a.created_at >= v_month_start
    group by u.id, u.name
    order by bilans desc
    limit 3
  ) t;

  -- ─── Tendance 12 mois (bilans / mois) ─────────────────────────────────
  select coalesce(jsonb_agg(row_to_json(t) order by t.month_start), '[]'::jsonb) into v_tendance_12_mois
  from (
    with months as (
      select generate_series(
        date_trunc('month', current_date) - interval '11 months',
        date_trunc('month', current_date),
        interval '1 month'
      )::date as month_start
    )
    select
      m.month_start,
      coalesce(count(a.id)::int, 0) as bilans
    from months m
    left join public.assessments a
      on date_trunc('month', a.created_at) = m.month_start
      and a.type = 'initial'
    group by m.month_start
    order by m.month_start
  ) t;

  -- ─── Alertes operationnelles ──────────────────────────────────────────
  with distri_inactifs as (
    select count(distinct u.id)::int as cnt
    from public.users u
    where u.role = 'distributor'
      and u.active = true
      and not exists (
        select 1 from public.assessments a
        join public.clients c on c.id = a.client_id
        where c.distributor_id = u.id
          and a.created_at >= current_date - interval '14 days'
      )
  ),
  clients_pause_long as (
    select count(*)::int as cnt
    from public.clients
    where lifecycle_status = 'paused'
      and lifecycle_updated_at <= current_date - interval '60 days'
  )
  select jsonb_build_object(
    'distri_sans_bilan_14j', (select cnt from distri_inactifs),
    'clients_pause_60j', (select cnt from clients_pause_long)
  ) into v_alertes;

  -- ─── Assemblage final ─────────────────────────────────────────────────
  return jsonb_build_object(
    'kpi', jsonb_build_object(
      'bilans_mois', v_kpi_bilans_mois,
      'bilans_prev_mois', v_kpi_bilans_prev,
      'bilans_delta_pct', case
        when v_kpi_bilans_prev = 0 then null
        else round(((v_kpi_bilans_mois - v_kpi_bilans_prev)::numeric / v_kpi_bilans_prev::numeric) * 100, 1)
      end,
      'clients_actifs', v_kpi_clients_actifs,
      'clients_actifs_prev', v_kpi_clients_actifs_prev,
      'pv_mois', v_kpi_pv_mois,
      'conversion_pct', v_kpi_conversion_pct
    ),
    'funnel', jsonb_build_object(
      'bilans', v_funnel_bilans,
      'inscrits', v_funnel_inscrits,
      'actifs', v_funnel_actifs,
      'actifs_30d', v_funnel_actifs_30d
    ),
    'top_produits', v_top_produits,
    'top_distri', v_top_distri,
    'tendance_12_mois', v_tendance_12_mois,
    'alertes', v_alertes,
    'computed_at', now()
  );
end;
$$;

revoke all on function public.get_admin_analytics() from public, anon;
grant execute on function public.get_admin_analytics() to authenticated;

comment on function public.get_admin_analytics is
  'Chantier D (2026-04-29) : tous les KPI admin en 1 appel JSON. Admin only.';

commit;
