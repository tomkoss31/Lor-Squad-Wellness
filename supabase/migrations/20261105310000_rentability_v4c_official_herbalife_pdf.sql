-- =============================================================================
-- Rentabilité V4c — facteurs prix officiels Herbalife (PDF 2025-12-19, 2026-05-05)
--
-- Source : Liste de prix Clients Privilégiés Herbalife France
--          (PDF "PC_Sales_Conditions" rev 12/2020, prix au 19/12/2025)
--          fourni par Thomas.
--
-- Décryptage des colonnes "Prix total TTC après remise" du PDF :
--   - Tier "15% Bronze"  : effective discount -13.4 % TTC retail (factor 0.866)
--   - Tier "25% Silver"  : effective discount -22.4 % TTC retail (factor 0.776)
--   - Tier "35% Gold"    : effective discount -31.3 % TTC retail (factor 0.687)
--   - Tier "42% Ambass." : extrapolé linéaire (-40.5 % TTC, factor 0.595)
--
-- Note importante : le pourcentage marketing affiché par Herbalife
-- (15/25/35/42 %) ne correspond PAS au discount effectif appliqué sur
-- le prix TTC public. Le discount réel est ~12-15 % en-dessous (logique
-- comptable Herbalife : remise sur HT ajusté + TVA 5.5 % réintégrée).
--
-- Vérification math sur facture Virginie DAUTEL (mai 2026, Silver) :
--   - Total HT avant remise : 287,05 €
--   - Remise officielle :     -64,27 € (= 22,4 % de 287,05) ← match factor 0.776
--   - HT après remise :       222,78 €
--   - TVA 5,5 % :              12,26 €
--   - TTC payé :              235,04 € ✓
--
-- Formule de marge revue :
--   - Distri achète au wholesale : retail × (1 - rank_margin%/100)
--   - Client VIP paie : retail × paid_factor
--   - Marge nette distri = revenue - wholesale = retail × (paid_factor + rank%/100 - 1)
--   - Clamped >= 0 (si VIP haut tier + rank bas, peut être négatif théoriquement)
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
  current_products as (
    select pcp.id,
           pcp.client_id,
           pcp.product_name,
           pcp.quantity_start as qty,
           pcp.price_public_per_unit as price,
           pcp.start_date,
           c.first_name || ' ' || c.last_name as client_name,
           c.vip_status::text as vip_status,
           -- V4c : paid_factor décodé du PDF officiel Herbalife
           -- (TTC après remise / TTC public retail)
           case c.vip_status
             when 'ambassador' then 0.595
             when 'gold' then 0.687
             when 'silver' then 0.776
             when 'bronze' then 0.866
             else 1.000
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
             when 'ambassador' then 0.595
             when 'gold' then 0.687
             when 'silver' then 0.776
             when 'bronze' then 0.866
             else 1.000
           end::numeric as paid_factor
    from public.pv_client_products pcp
    join public.clients c on c.id = pcp.client_id
    where c.distributor_id = any(p_user_ids)
      and pcp.active = true
      and pcp.start_date >= v_prev_month_start
      and pcp.start_date <= v_prev_month_end
  ),
  -- V4c : marge = revenue - wholesale_cost
  --   revenue       = retail × paid_factor (TTC client)
  --   wholesale     = retail × (1 - rank_margin/100) (ce que distri paie à HBL)
  --   margin        = retail × (paid_factor + rank_margin/100 - 1)
  --   clamped to >= 0
  by_client as (
    select
      cp.client_id,
      cp.client_name,
      cp.vip_status,
      cp.paid_factor,
      sum(cp.price * cp.qty * cp.paid_factor) as revenue,
      sum(
        cp.price * cp.qty * greatest(0, (
          cp.paid_factor + (select margin_pct from margin_lookup) / 100.0 - 1
        ))
      ) as margin,
      sum(cp.qty)::int as items_count,
      array_agg(distinct cp.product_name) as products
    from current_products cp
    group by cp.client_id, cp.client_name, cp.vip_status, cp.paid_factor
  ),
  top_5_clients as (
    select jsonb_build_object(
      'client_id', client_id,
      'client_name', client_name,
      'vip_status', vip_status,
      'vip_discount_pct', round((1 - paid_factor) * 100, 1),
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
        cp.price * cp.qty * greatest(0, (cp.paid_factor + ml.margin_pct / 100.0 - 1))
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
        cp.price * cp.qty * greatest(0, (cp.paid_factor + ml.margin_pct / 100.0 - 1))
      ), 0)::numeric as margin_eur,
      count(distinct cp.client_id)::int as clients_count
    from current_products cp
    cross join margin_lookup ml
    where cp.vip_status is not null and cp.vip_status <> 'none'
  ),
  agg_prev as (
    select
      coalesce(sum(
        pp.price * pp.qty * greatest(0, (pp.paid_factor + ml.margin_pct / 100.0 - 1))
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
  'Rentabilité V4c (2026-05-05) : facteurs paid_factor décodés du PDF '
  'officiel Herbalife France (Bronze 0.866 / Silver 0.776 / Gold 0.687 / '
  'Amb. 0.595 extrapolé). Marge nette = retail * (paid_factor + rank/100 - 1) '
  'clamped >= 0. Vérifié sur facture Virginie DAUTEL : 287,05 HT × 0.776 = '
  '222,79 HT × 1,055 = 235,04 TTC (match exact).';

commit;
