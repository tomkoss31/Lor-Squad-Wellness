-- =============================================================================
-- Phase B Relances clients dormants (2026-05-05)
--
-- Détecte les clients dormants d'un distri avec scoring + PV potentiel
-- de relance. Affichage : widget Co-pilote "🔥 X clients dormants =
-- ~Y PV à reconquérir".
--
-- Définition "dormant" :
--   - Client en lifecycle 'active' ou 'paused' (pas perdus / arrêtés)
--   - ET pas de pv_client_products actif OU dernière commande > 60j
--
-- Scoring d'urgence :
--   - 'recent'  : 60-89 jours depuis dernière commande
--   - 'medium'  : 90-149 jours
--   - 'high'    : 150+ jours
--   - 'never'   : jamais de commande mais lifecycle 'active'
--
-- PV potentiel = PV moyen de la dernière cure du client × 1 (estimation
-- conservative que le client refera la même cure). Si jamais commandé,
-- on prend une moyenne par défaut de 50 PV (à ajuster).
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

  -- Sécurité : un caller non-admin ne peut requêter que ses propres
  -- dormants (= ses propres clients) ou ceux de son sous-arbre.
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
    -- Dernière commande active OU passée de chaque client (max start_date)
    select
      pcp.client_id,
      max(pcp.start_date)::date as last_order_date,
      -- PV de la dernière cure (lookup la row max start_date)
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
      and c.lifecycle_status::text in ('active', 'paused')
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
      else 'active'  -- pas dormant, à filtrer
    end as urgency,
    coalesce(cl.last_pv, 50) as pv_potential,
    cl.last_program as last_program_name
  from classified cl
  where cl.last_order_date is null
     or cl.days_since >= p_threshold_days
  order by
    -- Tri : never_started d'abord, puis high → medium → recent
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
  'Phase B (2026-05-05) : retourne les clients dormants d''un distri (active/paused '
  'sans commande depuis > threshold_days, default 60) avec PV potentiel de relance.';

commit;
