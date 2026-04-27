-- =============================================================================
-- Gamification 4 - Saisons mensuelles (2026-04-29)
--
-- RPC qui retourne le classement live des distri pour la saison en cours
-- (mois calendaire). Compteurs mixtes pour la valeur business :
--   - bilans_count : nb d assessments type=initial crees ce mois
--   - clients_count : nb de clients actifs (lifecycle=active) attribues
--     a ce distributeur
--   - score : bilans_count * 10 + clients_count (poids arbitraire pour V1)
--
-- V1 sans freeze : retourne le classement live recalcule a chaque appel.
-- Le freeze automatique en fin de mois (table seasons_history) sera ajoute
-- en V2 si Thomas valide la formule.
-- =============================================================================

begin;

create or replace function public.get_monthly_seasons_leaderboard()
returns table (
  user_id uuid,
  user_name text,
  bilans_count integer,
  clients_count integer,
  score integer,
  rank integer
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  month_start date;
begin
  if not public.is_admin() then
    raise exception 'access denied: admin role required';
  end if;

  month_start := date_trunc('month', current_date)::date;

  return query
  with bilans as (
    select c.distributor_id as user_id, count(*)::int as bilans_count
    from public.assessments a
    join public.clients c on c.id = a.client_id
    where a.type = 'initial' and a.created_at >= month_start
    group by c.distributor_id
  ),
  active_clients as (
    select distributor_id as user_id, count(*)::int as clients_count
    from public.clients
    where lifecycle_status = 'active'
    group by distributor_id
  ),
  combined as (
    select
      u.id as user_id,
      u.name::text as user_name,
      coalesce(b.bilans_count, 0) as bilans_count,
      coalesce(ac.clients_count, 0) as clients_count
    from public.users u
    left join bilans b on b.user_id = u.id
    left join active_clients ac on ac.user_id = u.id
    where u.active = true
  ),
  scored as (
    select
      user_id,
      user_name,
      bilans_count,
      clients_count,
      (bilans_count * 10 + clients_count)::int as score
    from combined
    where bilans_count > 0 or clients_count > 0
  ),
  ranked as (
    select
      user_id,
      user_name,
      bilans_count,
      clients_count,
      score,
      (row_number() over (order by score desc, user_name asc))::int as rank
    from scored
  )
  select * from ranked order by rank;
end;
$$;

revoke all on function public.get_monthly_seasons_leaderboard() from public, anon;
grant execute on function public.get_monthly_seasons_leaderboard() to authenticated;

comment on function public.get_monthly_seasons_leaderboard is
  'Classement live de la saison mensuelle (bilans*10 + active_clients). Reset chaque 1er du mois via date_trunc month. Admin only.';

commit;
