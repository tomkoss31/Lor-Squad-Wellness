-- Audit one-shot : cliente Melanie 4 mai 2026 + rentabilite
-- Migration RAISE NOTICE only, pas de DDL/UPDATE.

begin;

do $$
declare
  v_mel_id uuid;
  v_thomas_id uuid;
  r record;
begin
  -- Trouve Mel et Thomas
  select id into v_mel_id from public.users
   where lower(name) like '%mel%' or lower(name) like '%mélanie%' or lower(name) like '%melanie%'
   limit 1;
  select id into v_thomas_id from public.users
   where lower(name) like '%thomas%' or lower(name) like '%tomk%'
   limit 1;

  raise notice '=== USERS ===';
  raise notice 'Mel ID    : %', v_mel_id;
  raise notice 'Thomas ID : %', v_thomas_id;

  raise notice '=== CLIENTS CREES PAR MEL HIER (4 mai 2026) ===';
  for r in
    select c.id, c.first_name, c.last_name, c.current_program, c.pv_program_id,
           c.started, c.start_date, c.lifecycle_status, c.created_at,
           c.vip_status,
           (select count(*) from public.pv_client_products p
              where p.client_id = c.id and p.active = true) as nb_produits
    from public.clients c
    where c.distributor_id = v_mel_id
      and c.created_at::date = '2026-05-04'
    order by c.created_at desc
  loop
    raise notice '   - % % | program=% | started=% | start_date=% | nb_produits=%',
      r.first_name, r.last_name, r.current_program, r.started, r.start_date, r.nb_produits;
  end loop;

  raise notice '=== ASSESSMENTS DE CES CLIENTES ===';
  for r in
    select a.client_id, a.program_title, a.program_id, a.objective, a.type, a.date,
           c.first_name || ' ' || c.last_name as client_name
    from public.assessments a
    join public.clients c on c.id = a.client_id
    where c.distributor_id = v_mel_id
      and c.created_at::date = '2026-05-04'
  loop
    raise notice '   - % | type=% | program=% (%) | objective=% | date=%',
      r.client_name, r.type, r.program_title, r.program_id, r.objective, r.date;
  end loop;

  raise notice '=== PRODUITS ACTIFS DE CES CLIENTES ===';
  for r in
    select p.client_id, p.product_name, p.quantity_start, p.pv_per_unit,
           p.price_public_per_unit, p.start_date, p.active,
           c.first_name || ' ' || c.last_name as client_name
    from public.pv_client_products p
    join public.clients c on c.id = p.client_id
    where c.distributor_id = v_mel_id
      and c.created_at::date = '2026-05-04'
    order by p.client_id, p.product_name
  loop
    raise notice '   - % | % | qty=% pv=% prix=% | start=% active=%',
      r.client_name, r.product_name, r.quantity_start, r.pv_per_unit,
      r.price_public_per_unit, r.start_date, r.active;
  end loop;

  raise notice '=== HOUSEHOLD COUPLE THOMAS+MEL ? ===';
  for r in
    select uh.user_id, uh.household_id, u.name
    from public.user_households uh
    join public.users u on u.id = uh.user_id
    where uh.household_id in (
      select household_id from public.user_households where user_id = v_thomas_id
    )
       or uh.household_id in (
      select household_id from public.user_households where user_id = v_mel_id
    )
  loop
    raise notice '   - % (id=%, household=%)', r.name, r.user_id, r.household_id;
  end loop;
exception
  when undefined_table then
    raise notice 'Tables introuvables (user_households peut etre absent).';
end $$;

rollback;
