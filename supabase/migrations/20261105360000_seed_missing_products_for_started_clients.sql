-- =============================================================================
-- Repair clients started avec 0 produits actifs (2026-05-05)
--
-- Bug : la migration 20261105330000 ne seedait que des produits Premium par
-- defaut. Si Mel a edite le bilan via le nouveau dropdown ProgramSelectField
-- pour passer en "Booster 1" (avec multifibres), le programme se met a jour
-- mais les pv_client_products correspondants ne sont JAMAIS seedes
-- (le seed se fait uniquement a la creation via createClientWithInitialAssessment).
--
-- Cette migration audite + seed les produits manquants pour TOUS les clients
-- qui ont :
--   - started = true
--   - current_program reconnu (Premium / Booster 1 / Booster 2 / Decouverte
--     ou variantes Sport)
--   - 0 pv_client_products actifs
--
-- Mapping programme -> produits routine (aligne sur pvProgramOptions) :
--   Decouverte / Starter -> aloe-vera, the-51g, formula-1
--   Premium              -> aloe-vera, the-51g, formula-1, pdm
--   Booster 1            -> aloe-vera, the-51g, formula-1, pdm, multifibres
--   Booster 2            -> aloe-vera, the-51g, formula-1, pdm, phyto-brule-graisse
--   Decouverte Sport     -> formula-1, barres-proteinees-achieve
--   Premium Sport        -> formula-1, barres-proteinees-achieve, rebuild-strength, cr7-drive
-- =============================================================================

begin;

do $$
declare
  v_clients_to_seed int;
  v_products_seeded int;
begin
  select count(*) into v_clients_to_seed
  from public.clients c
  where c.started = true
    and c.current_program is not null
    and c.current_program <> ''
    and c.current_program not ilike '%confirmer%'
    and not exists (
      select 1 from public.pv_client_products p
      where p.client_id = c.id and p.active = true
    );

  raise notice '====== AUDIT REPAIR PRODUITS MANQUANTS ======';
  raise notice 'Clients started=true avec 0 produits actifs : %', v_clients_to_seed;
end $$;

-- INSERT idempotent (skip si meme produit deja actif pour le client)
with target_clients as (
  select c.id as client_id,
         c.distributor_id,
         u.name as distributor_name,
         coalesce(c.start_date::date, c.created_at::date, current_date) as start_date,
         lower(coalesce(c.current_program, '')) as program_lower
  from public.clients c
  left join public.users u on u.id = c.distributor_id
  where c.started = true
    and c.current_program is not null
    and c.current_program <> ''
    and c.current_program not ilike '%confirmer%'
    and not exists (
      select 1 from public.pv_client_products p
      where p.client_id = c.id and p.active = true
    )
),
program_products as (
  select tc.*,
         case
           when tc.program_lower like '%booster%2%' or tc.program_lower like '%booster 2%'
             then array['aloe-vera', 'the-51g', 'formula-1', 'pdm', 'phyto-brule-graisse']
           when tc.program_lower like '%booster%' or tc.program_lower like '%fibres%'
             then array['aloe-vera', 'the-51g', 'formula-1', 'pdm', 'multifibres']
           when tc.program_lower like '%premium sport%' or tc.program_lower like '%sport-premium%'
             then array['formula-1', 'barres-proteinees-achieve', 'rebuild-strength', 'cr7-drive']
           when tc.program_lower like '%decouverte sport%'
             or tc.program_lower like '%découverte sport%'
             or tc.program_lower like '%sport-decouverte%'
             then array['formula-1', 'barres-proteinees-achieve']
           when tc.program_lower like '%premium%'
             then array['aloe-vera', 'the-51g', 'formula-1', 'pdm']
           when tc.program_lower like '%starter%'
             or tc.program_lower like '%decouverte%'
             or tc.program_lower like '%découverte%'
             then array['aloe-vera', 'the-51g', 'formula-1']
           else array['aloe-vera', 'the-51g', 'formula-1', 'pdm']  -- fallback Premium
         end as product_ids
  from target_clients tc
),
products_to_insert as (
  select pp.client_id, pp.distributor_id, pp.distributor_name,
         pp.start_date, unnest(pp.product_ids) as product_id
  from program_products pp
)
insert into public.pv_client_products (
  client_id,
  responsible_id,
  responsible_name,
  program_id,
  product_id,
  product_name,
  quantity_start,
  start_date,
  duration_reference_days,
  pv_per_unit,
  price_public_per_unit,
  quantite_label,
  active
)
select
  pti.client_id,
  pti.distributor_id,
  coalesce(pti.distributor_name, 'Lor''Squad Wellness'),
  case pti.product_id
    when 'multifibres'        then 'booster-1'
    when 'phyto-brule-graisse' then 'booster-2'
    when 'barres-proteinees-achieve' then 'sport-discovery'
    when 'rebuild-strength'   then 'sport-premium'
    when 'cr7-drive'          then 'sport-premium'
    else 'premium'
  end,
  pti.product_id,
  case pti.product_id
    when 'aloe-vera'                 then 'Boisson Aloe Vera'
    when 'the-51g'                   then 'Boisson instantanee a base de the 51 g'
    when 'formula-1'                 then 'Formula 1'
    when 'pdm'                       then 'Melange pour boisson proteinee'
    when 'multifibres'               then 'Boisson multi-fibres'
    when 'phyto-brule-graisse'       then 'Phyto Complete'
    when 'barres-proteinees-achieve' then 'Barres proteinees Achieve H24'
    when 'rebuild-strength'          then 'Rebuild Strength'
    when 'cr7-drive'                 then 'CR7 Drive'
    else pti.product_id
  end,
  1,
  pti.start_date,
  21,
  case pti.product_id
    when 'aloe-vera'                 then 24.95
    when 'the-51g'                   then 19.95
    when 'formula-1'                 then 23.95
    when 'pdm'                       then 33.00
    when 'multifibres'               then 22.95
    when 'phyto-brule-graisse'       then 38.15
    when 'barres-proteinees-achieve' then 11.30
    when 'rebuild-strength'          then 33.55
    when 'cr7-drive'                 then 12.50
    else 0
  end,
  case pti.product_id
    when 'aloe-vera'                 then 54.50
    when 'the-51g'                   then 41.00
    when 'formula-1'                 then 63.50
    when 'pdm'                       then 75.00
    when 'multifibres'               then 43.50
    when 'phyto-brule-graisse'       then 90.00
    when 'barres-proteinees-achieve' then 27.50
    when 'rebuild-strength'          then 83.50
    when 'cr7-drive'                 then 27.50
    else 0
  end,
  '1 boite',
  true
from products_to_insert pti
on conflict do nothing;

do $$
declare
  v_remaining int;
  v_total_inserted int;
begin
  select count(*) into v_remaining
  from public.clients c
  where c.started = true
    and c.current_program is not null
    and c.current_program <> ''
    and c.current_program not ilike '%confirmer%'
    and not exists (
      select 1 from public.pv_client_products p
      where p.client_id = c.id and p.active = true
    );

  select count(*) into v_total_inserted
  from public.pv_client_products
  where created_at > now() - interval '1 minute';

  raise notice '====== APRES REPAIR ======';
  raise notice 'Clients restants sans produits : %', v_remaining;
  raise notice 'pv_client_products inseres (last 1 min) : %', v_total_inserted;
  raise notice '==========================';
end $$;

commit;
