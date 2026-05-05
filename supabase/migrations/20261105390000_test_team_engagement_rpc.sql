-- Test direct de get_team_engagement(thomas) sans front
begin;

do $$
declare
  v_thomas uuid := '656dcf35-4859-4a70-9d20-990104813423';
  r record;
  v_count int;
begin
  raise notice '=== TEST get_team_engagement(thomas) ===';

  -- Set auth.uid() to thomas via session_replication_role workaround
  -- Note: SECURITY DEFINER ne nous laisse pas mocker auth.uid() facilement.
  -- On va plutot tester get_user_xp directement et verifier is_admin.

  raise notice '=== TEST is_admin() existence ===';
  begin
    perform public.is_admin();
    raise notice 'is_admin() OK';
  exception
    when undefined_function then
      raise notice 'ERROR : public.is_admin() does NOT exist !';
    when others then
      raise notice 'is_admin() error: % (sqlstate %)', sqlerrm, sqlstate;
  end;

  raise notice '=== TEST appel direct get_user_xp(thomas) ===';
  begin
    for r in select * from public.get_user_xp(v_thomas)
    loop
      raise notice '   total=% level=% academy=% formation=%',
        r.total_xp, r.level, r.academy_xp, r.formation_xp;
    end loop;
  exception when others then
    raise notice 'get_user_xp(thomas) error: %', sqlerrm;
  end;

  raise notice '=== USERS DANS LE SUB-TREE THOMAS ===';
  with recursive sub_tree as (
    select u.id, u.name from public.users u where u.id = v_thomas
    union all
    select u.id, u.name from public.users u join sub_tree st on u.sponsor_id = st.id
  )
  select count(*) into v_count from sub_tree;
  raise notice 'Sub-tree count = %', v_count;
end $$;

rollback;
