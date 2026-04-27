-- =============================================================================
-- Chantier Academy direction 7 (2026-04-28)
--
-- RPC d acces admin au leaderboard Academy : liste de tous les users
-- actifs avec leur progression Academy (% complete, derniere activite,
-- timestamps started/completed/skipped).
--
-- SECURITY DEFINER + check is_admin() en tete. Utilise sur /team par
-- les admins (Thomas, Mel) pour identifier qui decroche, qui pousse.
-- =============================================================================

begin;

create or replace function public.get_academy_leaderboard()
returns table (
  user_id uuid,
  user_name text,
  user_role text,
  last_step integer,
  total_sections integer,
  percent_complete integer,
  started_at timestamptz,
  completed_at timestamptz,
  skipped_at timestamptz,
  last_active_at timestamptz
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
    u.id as user_id,
    u.name as user_name,
    u.role::text as user_role,
    coalesce(p.last_step, 0)::int as last_step,
    8::int as total_sections,
    case
      when p.completed_at is not null then 100
      else round((coalesce(p.last_step, 0) * 100.0) / 8)::int
    end as percent_complete,
    p.started_at,
    p.completed_at,
    p.skipped_at,
    coalesce(p.updated_at, u.last_access_at) as last_active_at
  from public.users u
  left join public.user_tour_progress p
    on p.user_id = u.id and p.tour_key = 'academy'
  where u.active = true
  order by
    case when p.completed_at is not null then 0 else 1 end,
    p.completed_at desc nulls last,
    coalesce(p.last_step, 0) desc,
    u.name asc;
end;
$$;

revoke all on function public.get_academy_leaderboard() from public, anon;
grant execute on function public.get_academy_leaderboard() to authenticated;

comment on function public.get_academy_leaderboard is
  'Leaderboard Academy admin-only. Liste users actifs + progression. Direction 7 (2026-04-28).';

commit;
