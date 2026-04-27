-- =============================================================================
-- Gamification 2 - Challenge hebdo plus de bilans (2026-04-29)
--
-- RPC d agregation publique (admins uniquement) qui retourne le top des
-- distri par nombre de bilans initiaux crees cette semaine (depuis lundi
-- 00:00).
-- =============================================================================

begin;

create or replace function public.get_weekly_bilans_leaderboard()
returns table (
  user_id uuid,
  user_name text,
  bilan_count integer,
  rank integer
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  week_start date;
begin
  if not public.is_admin() then
    raise exception 'access denied: admin role required';
  end if;

  -- Lundi de la semaine courante (Postgres considere lundi comme jour 1
  -- via date_trunc('week', ...) en mode ISO).
  week_start := date_trunc('week', current_date)::date;

  return query
  with counts as (
    select
      c.distributor_id as user_id,
      count(*)::int as bilan_count
    from public.assessments a
    join public.clients c on c.id = a.client_id
    where a.type = 'initial'
      and a.created_at >= week_start
    group by c.distributor_id
  ),
  ranked as (
    select
      cnt.user_id,
      u.name::text as user_name,
      cnt.bilan_count,
      (row_number() over (order by cnt.bilan_count desc, u.name asc))::int as rank
    from counts cnt
    join public.users u on u.id = cnt.user_id
    where u.active = true
  )
  select * from ranked order by rank;
end;
$$;

revoke all on function public.get_weekly_bilans_leaderboard() from public, anon;
grant execute on function public.get_weekly_bilans_leaderboard() to authenticated;

comment on function public.get_weekly_bilans_leaderboard is
  'Top distri par nb bilans initiaux cette semaine. Reset auto chaque lundi 00h00. Admin only.';

commit;
