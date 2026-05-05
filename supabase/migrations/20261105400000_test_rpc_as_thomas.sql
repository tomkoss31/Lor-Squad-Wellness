-- Test get_team_engagement en spoofant Thomas (auth.uid)
begin;

set local "request.jwt.claims" = '{"sub": "656dcf35-4859-4a70-9d20-990104813423", "role": "authenticated"}';

do $$
declare
  r record;
  v_count int := 0;
begin
  raise notice '=== TEST get_team_engagement(thomas) avec auth.uid spoofe ===';
  for r in
    select user_id, name, role, xp_total, xp_level, xp_academy, xp_formation
    from public.get_team_engagement('656dcf35-4859-4a70-9d20-990104813423'::uuid)
  loop
    v_count := v_count + 1;
    raise notice '   [%] % | role=% | xp=% (level %) | academy=% | formation=%',
      v_count, r.name, r.role, r.xp_total, r.xp_level, r.xp_academy, r.xp_formation;
  end loop;
  raise notice 'TOTAL : % membres retournes', v_count;
exception when others then
  raise notice 'ERROR : %', sqlerrm;
end $$;

rollback;
