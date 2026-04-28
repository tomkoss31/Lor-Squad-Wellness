-- =============================================================================
-- Analytics : top_distri avec id (D V2 — 2026-04-28)
--
-- La RPC get_admin_analytics() renvoyait uniquement {name, bilans} dans
-- top_distri. Pour permettre le drill-down par distri (modale detail
-- cote front avec PV historique + lifecycle clients), on ajoute l id.
--
-- Idempotent : DROP + CREATE OR REPLACE.
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
  v_kpi_pv_prev_mois numeric;
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

  -- ─── KPI 2 : clients actifs (lifecycle = active) ──────────────────────
  select count(*)::int into v_kpi_clients_actifs
  from public.clients
  where coalesce(lifecycle_status, 'active') = 'active';

  -- Approximation prev : clients actifs creees il y a 30+j et toujours active.
  select count(*)::int into v_kpi_clients_actifs_prev
  from public.clients
  where coalesce(lifecycle_status, 'active') = 'active'
    and created_at < v_prev_month_end;

  -- ─── KPI 3 : PV ce mois ────────────────────────────────────────────────
  select coalesce(sum(pv * coalesce(quantity, 1)), 0)::numeric into v_kpi_pv_mois
  from public.pv_transactions
  where date >= v_month_start;

  -- D V2 (2026-04-28) : PV mois precedent pour delta vs M-1.
  select coalesce(sum(pv * coalesce(quantity, 1)), 0)::numeric into v_kpi_pv_prev_mois
  from public.pv_transactions
  where date >= v_prev_month_start and date < v_month_start;

  -- ─── KPI 4 : conversion prospects → clients (cumul, all-time) ─────────
  select case
    when count(*) = 0 then 0
    else round(100.0 * count(*) filter (where status = 'converted') / count(*), 1)
  end into v_kpi_conversion_pct
  from public.prospects;

  -- ─── Funnel ce mois ────────────────────────────────────────────────────
  select count(*)::int into v_funnel_bilans
  from public.assessments
  where type = 'initial' and created_at >= v_month_start;

  select count(*)::int into v_funnel_inscrits
  from public.client_app_accounts
  where created_at >= v_month_start;

  select count(*)::int into v_funnel_actifs
  from public.clients
  where created_at >= v_month_start
    and coalesce(lifecycle_status, 'active') = 'active';

  select count(*)::int into v_funnel_actifs_30d
  from public.clients
  where created_at >= (current_date - interval '30 days')
    and coalesce(lifecycle_status, 'active') = 'active';

  -- ─── Top 5 produits du mois (par PV) ──────────────────────────────────
  select coalesce(jsonb_agg(row_to_json(t)), '[]'::jsonb) into v_top_produits
  from (
    select
      product_name as name,
      sum(coalesce(quantity, 1))::int as quantity,
      sum(pv * coalesce(quantity, 1))::numeric as total_pv
    from public.pv_transactions
    where date >= v_month_start
    group by product_name
    order by total_pv desc
    limit 5
  ) t;

  -- ─── Top 3 distri par bilans ce mois (avec id pour drill-down) ────────
  select coalesce(jsonb_agg(row_to_json(t)), '[]'::jsonb) into v_top_distri
  from (
    select
      u.id::text as id,
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

  -- ─── Tendance bilans 12 derniers mois ──────────────────────────────────
  select coalesce(jsonb_agg(row_to_json(t) order by t.month_start), '[]'::jsonb) into v_tendance_12_mois
  from (
    select
      to_char(date_trunc('month', a.created_at), 'YYYY-MM-DD') as month_start,
      count(*)::int as bilans
    from public.assessments a
    where a.type = 'initial'
      and a.created_at >= (current_date - interval '12 months')
    group by date_trunc('month', a.created_at)
  ) t;

  -- ─── Alertes operationnelles ──────────────────────────────────────────
  -- Distri sans bilan depuis 14j (parmi ceux ayant deja fait au moins 1 bilan).
  select jsonb_build_object(
    'distri_sans_bilan_14j',
    (
      select count(*)::int
      from public.users u
      where u.role in ('distributor', 'referent')
        and u.active = true
        and exists (
          select 1 from public.assessments a
          join public.clients c on c.id = a.client_id
          where c.distributor_id = u.id
            and a.type = 'initial'
        )
        and not exists (
          select 1 from public.assessments a
          join public.clients c on c.id = a.client_id
          where c.distributor_id = u.id
            and a.type = 'initial'
            and a.created_at >= (current_date - interval '14 days')
        )
    ),
    'clients_pause_60j',
    (
      select count(*)::int
      from public.clients
      where lifecycle_status = 'paused'
        and coalesce(lifecycle_updated_at, created_at) < (current_date - interval '60 days')
    )
  ) into v_alertes;

  -- ─── Compose le payload final ─────────────────────────────────────────
  return jsonb_build_object(
    'kpi', jsonb_build_object(
      'bilans_mois', v_kpi_bilans_mois,
      'bilans_prev_mois', v_kpi_bilans_prev,
      'bilans_delta_pct', case
        when v_kpi_bilans_prev = 0 then null
        else round(100.0 * (v_kpi_bilans_mois - v_kpi_bilans_prev) / v_kpi_bilans_prev, 1)
      end,
      'clients_actifs', v_kpi_clients_actifs,
      'clients_actifs_prev', v_kpi_clients_actifs_prev,
      'pv_mois', v_kpi_pv_mois,
      'pv_prev_mois', v_kpi_pv_prev_mois,
      'pv_delta_pct', case
        when v_kpi_pv_prev_mois = 0 then null
        else round(100.0 * (v_kpi_pv_mois - v_kpi_pv_prev_mois) / v_kpi_pv_prev_mois, 1)
      end,
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

grant execute on function public.get_admin_analytics() to authenticated;

comment on function public.get_admin_analytics is
  'D V2 (2026-04-28) — top_distri inclut maintenant id pour drill-down + pv_delta_pct vs M-1.';

commit;
