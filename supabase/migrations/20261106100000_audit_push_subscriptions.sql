begin;
do $$
declare r record; v_thomas uuid; v_mel uuid;
begin
  select id into v_thomas from public.users where lower(name) like '%thomas%' or lower(name) like '%tomk%' limit 1;
  select id into v_mel from public.users where lower(name) like '%mel%' or lower(name) like '%mélanie%' or lower(name) like '%melanie%' limit 1;
  raise notice 'Thomas : % | Mel : %', v_thomas, v_mel;

  raise notice '=== COLONNES push_subscriptions ===';
  for r in
    select column_name, data_type, is_nullable
    from information_schema.columns
    where table_schema = 'public' and table_name = 'push_subscriptions'
    order by ordinal_position
  loop
    raise notice '   % (%, nullable=%)', r.column_name, r.data_type, r.is_nullable;
  end loop;

  raise notice '=== PUSH_SUBSCRIPTIONS THOMAS ===';
  for r in
    select id, user_id, endpoint
    from public.push_subscriptions
    where user_id = v_thomas::text
  loop
    raise notice '   - id=% | endpoint=%...',
      r.id, substring(r.endpoint from 1 for 50);
  end loop;

  raise notice '=== PUSH_SUBSCRIPTIONS MEL ===';
  for r in
    select id, user_id, endpoint
    from public.push_subscriptions
    where user_id = v_mel::text
  loop
    raise notice '   - id=% | endpoint=%...',
      r.id, substring(r.endpoint from 1 for 50);
  end loop;

  raise notice '=== STATS GLOBALES ===';
  raise notice 'Total push_subscriptions : %', (select count(*) from public.push_subscriptions);
  raise notice 'Distinct users avec sub : %', (select count(distinct user_id) from public.push_subscriptions);
exception when others then
  raise notice 'ERROR : %', sqlerrm;
end $$;
rollback;
