-- =============================================================================
-- Chantier Lor'Squad Academy — Vue admin progression (2026-04-26)
--
-- RPC d acces admin a la progression d un tour pour un user donne. Necessaire
-- car les RLS de user_tour_progress (chantier 2026-04-26 foundation) sont
-- scopees self (`auth.uid() = user_id`) — un admin ne peut pas lire la ligne
-- d un autre user via une simple requete REST.
--
-- SECURITY DEFINER + verification `public.is_admin()` en tete : seuls les
-- admins peuvent invoquer cette RPC. Les non-admins recoivent une exception
-- "access denied".
--
-- Si l user n a pas encore de ligne user_tour_progress, la fonction retourne
-- 0 ligne — le hook front gere ce cas en affichant "pas commence".
--
-- Pattern aligne sur les autres SECURITY DEFINER du repo (cf. admin_settings
-- chantier 2026-04-23) : revoke public/anon + grant authenticated.
-- =============================================================================

begin;

create or replace function public.get_user_tour_progress_admin(
  p_user_id uuid,
  p_tour_key text default 'academy'
)
returns table (
  user_id uuid,
  tour_key text,
  last_step integer,
  started_at timestamptz,
  completed_at timestamptz,
  skipped_at timestamptz,
  updated_at timestamptz,
  last_access_at timestamptz
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.is_admin() then
    raise exception 'access denied: admin role required';
  end if;

  return query
  select
    p.user_id,
    p.tour_key,
    p.last_step,
    p.started_at,
    p.completed_at,
    p.skipped_at,
    p.updated_at,
    u.last_access_at
  from public.user_tour_progress p
  left join public.users u on u.id = p.user_id
  where p.user_id = p_user_id
    and p.tour_key = p_tour_key
  limit 1;
end;
$$;

revoke all on function public.get_user_tour_progress_admin(uuid, text) from public, anon;
grant execute on function public.get_user_tour_progress_admin(uuid, text) to authenticated;

comment on function public.get_user_tour_progress_admin is
  'Retourne la progression d''un tour pour un user donne. Reserve aux admins via is_admin(). Si aucune ligne en DB, retourne 0 ligne (le hook front gere ce cas).';

commit;
