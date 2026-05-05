-- Audit team tree Thomas
begin;

do $$
declare
  v_thomas uuid;
  v_mel uuid;
  r record;
begin
  select id into v_thomas from public.users
   where lower(name) like '%thomas%' or lower(name) like '%tomk%' limit 1;
  select id into v_mel from public.users
   where lower(name) like '%mel%' or lower(name) like '%mélanie%' or lower(name) like '%melanie%' limit 1;

  raise notice 'Thomas : % | Mel : %', v_thomas, v_mel;

  raise notice '=== USERS PRINCIPAUX ===';
  for r in select id, name, role, sponsor_id, parent_user_id from public.users order by name limit 20
  loop
    raise notice '   - % | role=% | sponsor=% | parent=%', r.name, r.role, r.sponsor_id, r.parent_user_id;
  end loop;

  raise notice '=== SUB-TREE DE THOMAS (recursif) ===';
  for r in
    with recursive sub_tree as (
      select u.id, u.name, u.sponsor_id, 0 as depth
      from public.users u where u.id = v_thomas
      union all
      select u.id, u.name, u.sponsor_id, st.depth + 1
      from public.users u
      join sub_tree st on u.sponsor_id = st.id
      where st.depth < 5
    )
    select id, name, depth from sub_tree
  loop
    raise notice '   - % (depth=%)', r.name, r.depth;
  end loop;

  raise notice '=== SUB-TREE DE MEL (recursif) ===';
  for r in
    with recursive sub_tree as (
      select u.id, u.name, u.sponsor_id, 0 as depth
      from public.users u where u.id = v_mel
      union all
      select u.id, u.name, u.sponsor_id, st.depth + 1
      from public.users u
      join sub_tree st on u.sponsor_id = st.id
      where st.depth < 5
    )
    select id, name, depth from sub_tree
  loop
    raise notice '   - % (depth=%)', r.name, r.depth;
  end loop;
end $$;

rollback;
