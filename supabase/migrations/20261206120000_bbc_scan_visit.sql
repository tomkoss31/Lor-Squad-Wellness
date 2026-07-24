-- =============================================================================
-- BBC — scan QR d'une visite (2026-07-24). Le membre montre son QR (= son
-- token PWA), le coach scanne → cette RPC valide la visite.
--   - résout token → client_id (client_app_accounts)
--   - vérifie que le client appartient au coach appelant
--   - insère une visite + renvoie le nom + le nouveau compteur
-- INERTE tant que non poussé. 1 RPC — aucun impact existant.
-- =============================================================================

create or replace function public.bbc_scan_visit(p_token text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_coach uuid := auth.uid();
  v_client_id uuid;
  v_owner uuid;
  v_name text;
  v_cnt integer;
begin
  select (client_id)::uuid into v_client_id
  from public.client_app_accounts
  where token = p_token::uuid
  limit 1;
  if v_client_id is null then
    raise exception 'token inconnu';
  end if;
  select distributor_id, first_name into v_owner, v_name
  from public.clients where id = v_client_id;
  if v_owner is distinct from v_coach then
    raise exception 'non autorise';
  end if;
  insert into public.club_visits (client_id, coach_user_id) values (v_client_id, v_coach);
  select count(*) into v_cnt from public.club_visits
  where client_id = v_client_id and coach_user_id = v_coach;
  return json_build_object('client_name', coalesce(v_name, 'membre'), 'visits', v_cnt);
end;
$$;
revoke all on function public.bbc_scan_visit(text) from public;
grant execute on function public.bbc_scan_visit(text) to authenticated;
