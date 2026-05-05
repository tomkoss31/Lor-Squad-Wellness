-- Audit Romane (consumption fails)
begin;

do $$
declare
  r record;
begin
  raise notice '=== CLIENTS ROMANE ===';
  for r in
    select id, first_name, last_name, email, distributor_id, created_at
    from public.clients
    where lower(first_name) like '%romane%' or lower(last_name) like '%romane%'
    order by created_at desc limit 5
  loop
    raise notice '   - % % | id=% | email=% | distri=% | cree=%',
      r.first_name, r.last_name, r.id, r.email, r.distributor_id, r.created_at;
  end loop;

  raise notice '=== CLIENT_INVITATION_TOKENS ROMANE ===';
  for r in
    select cit.id, cit.token, cit.client_id, cit.expires_at, cit.consumed_at, cit.created_at,
           c.first_name, c.last_name, c.email
    from public.client_invitation_tokens cit
    join public.clients c on c.id = cit.client_id
    where lower(c.first_name) like '%romane%'
    order by cit.created_at desc limit 5
  loop
    raise notice '   - % | token=% | expires=% | consumed=% | client_email=%',
      r.first_name, r.token, r.expires_at, r.consumed_at, r.email;
  end loop;

  raise notice '=== AUTH USERS AVEC EMAIL DE ROMANE ===';
  for r in
    select au.id, au.email, au.created_at
    from auth.users au
    where exists (
      select 1 from public.clients c
      where lower(c.first_name) like '%romane%'
      and lower(au.email) = lower(c.email)
    )
    limit 5
  loop
    raise notice '   - auth_user=% | email=% | cree=%', r.id, r.email, r.created_at;
  end loop;

  raise notice '=== CLIENT_APP_ACCOUNTS ROMANE ===';
  for r in
    select caa.id, caa.client_id, caa.token, caa.auth_user_id, caa.created_at,
           c.first_name
    from public.client_app_accounts caa
    join public.clients c on c.id::text = caa.client_id::text
    where lower(c.first_name) like '%romane%'
    limit 5
  loop
    raise notice '   - % | caa_token=% | auth_user=% | cree=%',
      r.first_name, r.token, r.auth_user_id, r.created_at;
  end loop;
exception
  when others then
    raise notice 'AUDIT ERROR: %', sqlerrm;
end $$;

rollback;
