-- =============================================================================
-- Chantier 0 « connecteur » (2026-06-13) — relances PROPRES.
--
-- Problème (retour Thomas, captures Suivi PV) : le plan de relance / les
-- dormants remontaient des clients qu'il ne veut PAS relancer :
--   - clients EN PAUSE (l'ancienne RPC les incluait via in ('active','paused'))
--   - clients « Suivi libre » (free_follow_up) — ex : Lydie, Joël : achètent
--     hors-app sans suivi balance, on saisit juste leurs produits.
--   - clients « PV libre » (free_pv_tracking).
--
-- Fix : la RPC ne remonte plus QUE les clients lifecycle 'active' ET ni
-- free_follow_up ni free_pv_tracking. Les arrêtés/perdus étaient déjà exclus.
--
-- ⚠️ N'impacte PAS la rentabilité (calcul sur pv_client_products sans filtre
-- lifecycle/free — cf. 20261105200000_rentability_system.sql). Exclure un
-- client des relances ne le sort donc PAS de la rentabilité. Voulu.
-- =============================================================================

begin;

drop function if exists public.get_dormant_clients(uuid, int);

create function public.get_dormant_clients(
  p_distributor_id uuid,
  p_threshold_days int default 60
)
returns table (
  client_id uuid,
  client_name text,
  client_phone text,
  client_email text,
  lifecycle_status text,
  last_order_date date,
  days_since_last_order int,
  urgency text,  -- 'recent' | 'medium' | 'high' | 'never'
  pv_potential int,
  last_program_name text
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_caller uuid := auth.uid();
  v_is_admin boolean := false;
begin
  if v_caller is null then
    raise exception 'access denied';
  end if;

  select exists (select 1 from public.users where id = v_caller and role = 'admin')
  into v_is_admin;

  if not v_is_admin and v_caller <> p_distributor_id then
    if not exists (
      with recursive ancestors as (
        select u.id, u.sponsor_id from public.users u where u.id = p_distributor_id
        union all
        select u.id, u.sponsor_id
        from public.users u
        join ancestors a on u.id = a.sponsor_id
      )
      select 1 from ancestors where id = v_caller
    ) then
      raise exception 'access denied: not your sub-tree';
    end if;
  end if;

  return query
  with client_last_order as (
    select
      pcp.client_id,
      max(pcp.start_date)::date as last_order_date,
      (
        array_agg(pcp.pv_per_unit * pcp.quantity_start order by pcp.start_date desc)
      )[1]::int as last_pv,
      (
        array_agg(pcp.product_name order by pcp.start_date desc)
      )[1] as last_program
    from public.pv_client_products pcp
    join public.clients c on c.id = pcp.client_id
    where c.distributor_id = p_distributor_id
    group by pcp.client_id
  ),
  classified as (
    select
      c.id,
      (c.first_name || ' ' || c.last_name) as full_name,
      c.phone,
      c.email,
      c.lifecycle_status::text as lifecycle,
      clo.last_order_date,
      clo.last_pv,
      clo.last_program,
      case
        when clo.last_order_date is null then null
        else (current_date - clo.last_order_date)
      end as days_since
    from public.clients c
    left join client_last_order clo on clo.client_id = c.id
    where c.distributor_id = p_distributor_id
      -- Chantier 0 : seuls les clients réellement ACTIFS sur programme.
      -- Exclut arrêtés/perdus (déjà), EN PAUSE (nouveau), et les clients
      -- en « suivi libre » / « PV libre » (achats hors-suivi, à ne pas relancer).
      and c.lifecycle_status::text = 'active'
      and coalesce(c.free_follow_up, false) = false
      and coalesce(c.free_pv_tracking, false) = false
  )
  select
    cl.id as client_id,
    cl.full_name as client_name,
    cl.phone as client_phone,
    cl.email as client_email,
    cl.lifecycle as lifecycle_status,
    cl.last_order_date,
    coalesce(cl.days_since, 9999)::int as days_since_last_order,
    case
      when cl.last_order_date is null then 'never'
      when cl.days_since >= 150 then 'high'
      when cl.days_since >= 90 then 'medium'
      when cl.days_since >= p_threshold_days then 'recent'
      else 'active'
    end as urgency,
    coalesce(cl.last_pv, 50) as pv_potential,
    cl.last_program as last_program_name
  from classified cl
  where cl.last_order_date is null
     or cl.days_since >= p_threshold_days
  order by
    case
      when cl.last_order_date is null then 0
      when cl.days_since >= 150 then 1
      when cl.days_since >= 90 then 2
      else 3
    end,
    cl.days_since desc nulls last;
end;
$$;

grant execute on function public.get_dormant_clients(uuid, int) to authenticated;

comment on function public.get_dormant_clients is
  'Chantier 0 (2026-06-13) : clients dormants d''un distri — UNIQUEMENT lifecycle '
  'active, hors free_follow_up / free_pv_tracking. Exclut pause/arrêtés/perdus et '
  'les clients en suivi libre. N''impacte pas la rentabilité.';

commit;
