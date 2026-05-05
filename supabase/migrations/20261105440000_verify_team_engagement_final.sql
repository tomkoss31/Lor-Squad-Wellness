begin;
set local "request.jwt.claims" = '{"sub": "656dcf35-4859-4a70-9d20-990104813423", "role": "authenticated"}';
do $$
declare r record; v_count int := 0;
begin
  for r in
    select user_id, name, role, xp_total, xp_academy, xp_formation, status
    from public.get_team_engagement('656dcf35-4859-4a70-9d20-990104813423'::uuid)
  loop
    v_count := v_count + 1;
    raise notice '[%] % | role=% | xp=% | acad=% | form=% | %',
      v_count, r.name, r.role, r.xp_total, r.xp_academy, r.xp_formation, r.status;
  end loop;
  raise notice 'TOTAL = % membres', v_count;
exception when others then raise notice 'ERROR : %', sqlerrm;
end $$;
rollback;
