-- =============================================================================
-- Alignement aggressif clients.current_program (2026-05-05)
--
-- La migration 20261105330000 avait une clause WHERE trop restrictive sur
-- la table clients : elle ne mettait à jour que les clients dont l'EXISTS
-- assessments matchait exactement program_title='Premium' + program_id='p-premium'.
-- Pour les clients avec started=false (28 sur 77) ou les cas où l'UPDATE
-- assessments avait déjà passé mais clients pas suivi, current_program restait
-- en "" ou "Programme a confirmer".
--
-- Cette migration aligne TOUS les clients avec leur dernier bilan initial :
--   clients.current_program = assessments.program_title (du dernier initial)
-- pour tous les clients dont current_program est vide / null / "confirmer".
--
-- Idempotent + filtre safe : on ne touche pas les clients qui ont déjà
-- un current_program valide (autre que "confirmer").
-- =============================================================================

begin;

do $$
declare
  v_avant int;
  v_apres int;
begin
  select count(*) into v_avant
  from public.clients
  where current_program is null
     or current_program = ''
     or current_program ilike '%confirmer%';

  raise notice 'AVANT : % clients avec current_program vide ou "confirmer"', v_avant;

  -- Align current_program avec le program_title du dernier bilan initial
  with latest_initial as (
    select distinct on (a.client_id)
      a.client_id,
      a.program_title,
      a.program_id
    from public.assessments a
    where a.type = 'initial'
    order by a.client_id, a.date desc
  )
  update public.clients c
  set
    current_program = li.program_title,
    pv_program_id = coalesce(c.pv_program_id, li.program_id)
  from latest_initial li
  where li.client_id = c.id
    and (c.current_program is null
         or c.current_program = ''
         or c.current_program ilike '%confirmer%')
    and li.program_title is not null
    and li.program_title <> ''
    and li.program_title not ilike '%confirmer%';

  select count(*) into v_apres
  from public.clients
  where current_program is null
     or current_program = ''
     or current_program ilike '%confirmer%';

  raise notice 'APRÈS : % clients restants avec current_program vide ou "confirmer"', v_apres;
  raise notice '   -> %  clients alignés', v_avant - v_apres;
end $$;

-- Refresh client_recaps (cast text=text car client_id peut etre text vs uuid)
do $$
declare
  v_recaps int;
begin
  update public.client_recaps cr
  set program_title = c.current_program
  from public.clients c
  where cr.client_id::text = c.id::text
    and (cr.program_title is null
         or cr.program_title = ''
         or cr.program_title ilike '%confirmer%')
    and c.current_program is not null
    and c.current_program <> ''
    and c.current_program not ilike '%confirmer%';

  get diagnostics v_recaps = row_count;
  raise notice 'client_recaps mis à jour : %', v_recaps;
exception
  when undefined_table then
    raise notice 'Table client_recaps absente, skip.';
  when undefined_column then
    raise notice 'Colonne program_title absente sur client_recaps, skip.';
end $$;

-- Refresh client_app_accounts.program_title (snapshot pour PWA client)
do $$
declare
  v_apps int;
begin
  update public.client_app_accounts caa
  set program_title = c.current_program
  from public.clients c
  where caa.client_id::text = c.id::text
    and (caa.program_title is null
         or caa.program_title = ''
         or caa.program_title ilike '%confirmer%')
    and c.current_program is not null
    and c.current_program <> ''
    and c.current_program not ilike '%confirmer%';

  get diagnostics v_apps = row_count;
  raise notice 'client_app_accounts mis à jour : %', v_apps;
exception
  when undefined_table then
    raise notice 'Table client_app_accounts absente, skip.';
  when undefined_column then
    raise notice 'Colonne program_title absente sur client_app_accounts, skip.';
end $$;

commit;
