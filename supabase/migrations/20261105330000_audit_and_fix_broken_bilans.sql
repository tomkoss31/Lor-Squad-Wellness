-- =============================================================================
-- Audit + Fix bilans cassés "Programme à confirmer" (2026-05-05)
--
-- Contexte : avant le fix front du 2026-05-05 (commit 4e42fad), tout
-- nouveau bilan se sauvegardait avec :
--   - assessments.program_title = "Programme a confirmer"
--   - assessments.program_id = NULL
--   - clients.current_program = "Programme a confirmer" (ou "")
--   - clients.pv_program_id = NULL
--   - 0 row dans pv_client_products → 0 PV → rentabilité fausse
--
-- Cette migration :
--   1. AUDIT : compte les bilans concernés (RAISE NOTICE pour log Supabase)
--   2. FIX bilans : remap "Programme a confirmer" → "Premium" (default
--      raisonnable, le coach peut ré-éditer via le nouveau dropdown
--      EditInitialAssessmentPage si besoin)
--   3. FIX clients : aligne current_program + pv_program_id
--   4. SEED pv_client_products manquants : pour chaque client cassé qui
--      avait `started = true`, on insère les 4 produits Premium
--      (aloe-vera, the-51g, formula-1, pdm) avec start_date = date du bilan
--
-- Idempotent : peut être rejoué sans casse (les UPDATE filtrent sur la
-- valeur "Programme a confirmer", les INSERT pv_client_products sont
-- guardés par ON CONFLICT DO NOTHING).
-- =============================================================================

begin;

do $$
declare
  v_bilans_casses int;
  v_clients_concernes int;
  v_clients_started int;
  v_pv_to_seed int;
begin
  -- 1. AUDIT
  select count(*) into v_bilans_casses
  from public.assessments a
  where a.type = 'initial'
    and (a.program_title ilike '%confirmer%' or a.program_id is null);

  select count(distinct a.client_id) into v_clients_concernes
  from public.assessments a
  where a.type = 'initial'
    and (a.program_title ilike '%confirmer%' or a.program_id is null);

  select count(distinct a.client_id) into v_clients_started
  from public.assessments a
  join public.clients c on c.id = a.client_id
  where a.type = 'initial'
    and (a.program_title ilike '%confirmer%' or a.program_id is null)
    and c.started = true;

  select count(*) into v_pv_to_seed
  from public.assessments a
  join public.clients c on c.id = a.client_id
  where a.type = 'initial'
    and (a.program_title ilike '%confirmer%' or a.program_id is null)
    and c.started = true
    and not exists (
      select 1 from public.pv_client_products p
      where p.client_id = c.id and p.active = true
    );

  raise notice '====== AUDIT BILANS CASSÉS ======';
  raise notice 'Bilans avec "Programme à confirmer" ou program_id NULL : %', v_bilans_casses;
  raise notice 'Clients distincts concernés : %', v_clients_concernes;
  raise notice 'Clients started=true (= devraient avoir des produits) : %', v_clients_started;
  raise notice 'Clients sans aucun pv_client_products actif (à seeder) : %', v_pv_to_seed;
  raise notice '=================================';
end $$;

-- 2. FIX bilans : remap title + id par défaut Premium
update public.assessments
set
  program_title = 'Premium',
  program_id = 'p-premium'
where type = 'initial'
  and (program_title ilike '%confirmer%' or program_id is null);

-- 3. FIX clients : align current_program + pv_program_id quand
-- l'assessment vient d'être réparé.
update public.clients c
set
  current_program = 'Premium',
  pv_program_id = coalesce(pv_program_id, 'p-premium')
where exists (
  select 1 from public.assessments a
  where a.client_id = c.id
    and a.type = 'initial'
    and a.program_title = 'Premium'
    and a.program_id = 'p-premium'
)
and (c.current_program is null
     or c.current_program = ''
     or c.current_program ilike '%confirmer%');

-- 4. SEED pv_client_products manquants
-- Pour chaque client started=true sans aucun produit actif, on insère
-- les 4 produits Premium (alignés sur le programme par défaut).
--
-- Note : on ne touche PAS aux clients qui ont déjà au moins 1 produit
-- actif (le coach a peut-être configuré un truc custom, on ne casse pas).
with broken_clients as (
  select distinct c.id as client_id, c.distributor_id, a.date as bilan_date
  from public.assessments a
  join public.clients c on c.id = a.client_id
  where a.type = 'initial'
    and a.program_title = 'Premium'  -- post-update
    and c.started = true
    and not exists (
      select 1 from public.pv_client_products p
      where p.client_id = c.id and p.active = true
    )
),
products_to_seed as (
  -- 4 produits Premium hardcodés (aligne sur pvProgramOptions['premium'])
  select bc.client_id, bc.distributor_id, bc.bilan_date,
         unnest(array['aloe-vera', 'the-51g', 'formula-1', 'pdm']) as product_id
  from broken_clients bc
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
  pts.client_id,
  pts.distributor_id,
  coalesce(u.name, 'Lor''Squad Wellness'),
  'premium',
  pts.product_id,
  case pts.product_id
    when 'aloe-vera'  then 'Boisson Aloe Vera'
    when 'the-51g'    then 'Boisson instantanee a base de the 51 g'
    when 'formula-1'  then 'Formula 1'
    when 'pdm'        then 'Melange pour boisson proteinee'
  end,
  1,
  pts.bilan_date::date,
  case pts.product_id
    when 'aloe-vera'  then 21
    when 'the-51g'    then 21
    when 'formula-1'  then 21
    when 'pdm'        then 21
  end,
  case pts.product_id
    when 'aloe-vera'  then 24.95
    when 'the-51g'    then 19.95
    when 'formula-1'  then 23.95
    when 'pdm'        then 33.00
  end,
  case pts.product_id
    when 'aloe-vera'  then 54.50
    when 'the-51g'    then 41.00
    when 'formula-1'  then 63.50
    when 'pdm'        then 75.00
  end,
  '1 boite',
  true
from products_to_seed pts
left join public.users u on u.id = pts.distributor_id
on conflict do nothing;

-- Compteur final
do $$
declare
  v_remaining int;
  v_seeded int;
begin
  select count(*) into v_remaining
  from public.assessments a
  where a.type = 'initial'
    and (a.program_title ilike '%confirmer%' or a.program_id is null);

  select count(*) into v_seeded
  from public.pv_client_products p
  where p.product_name in (
    'Boisson Aloe Vera',
    'Boisson instantanee a base de the 51 g',
    'Formula 1',
    'Melange pour boisson proteinee'
  )
  and p.created_at > now() - interval '1 minute';

  raise notice '====== APRÈS FIX ======';
  raise notice 'Bilans encore avec "Programme à confirmer" : %', v_remaining;
  raise notice 'pv_client_products créés (last 1 min) : %', v_seeded;
  raise notice '========================';
end $$;

commit;
