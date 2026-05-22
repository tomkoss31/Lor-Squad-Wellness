-- =============================================================================
-- RPC upgrade_passive_to_active (chantier Light V2 2026-05-22)
--
-- Convertit un Supervisor passif en distri actif normal. Admin only.
-- Effets :
--   - is_passive_supervisor = false
--   - is_external = false (devient un vrai distri sur l'app)
--   - active = true
--   - title remplacé par "Distributeur"
-- =============================================================================

create or replace function public.upgrade_passive_to_active(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller uuid;
  v_caller_role text;
  v_target_is_passive boolean;
begin
  v_caller := auth.uid();
  if v_caller is null then
    raise exception 'Not authenticated';
  end if;

  select role into v_caller_role from public.users where id = v_caller;
  if v_caller_role <> 'admin' then
    raise exception 'Only admin can upgrade a passive supervisor';
  end if;

  select is_passive_supervisor into v_target_is_passive
    from public.users where id = p_user_id;
  if v_target_is_passive is null then
    raise exception 'User not found';
  end if;
  if v_target_is_passive is not true then
    raise exception 'User is not a passive supervisor';
  end if;

  update public.users
    set is_passive_supervisor = false,
        is_external = false,
        active = true,
        title = 'Distributeur'
    where id = p_user_id;
end;
$$;

grant execute on function public.upgrade_passive_to_active(uuid) to authenticated;
