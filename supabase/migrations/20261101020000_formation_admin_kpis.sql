-- =============================================================================
-- Phase D — RPC admin KPIs Formation (2026-11-01)
--
-- Retourne les stats globales du club Formation pour la page
-- /formation/admin. Admin only via check is_admin().
--
-- Output jsonb plat avec :
--   - active_distri_count : distri ayant au moins 1 progression
--     touched dans les 30 derniers jours
--   - pending_sponsor_count : modules en attente sponsor
--   - admin_relay_count : modules escaladés admin_relay
--   - validated_total : modules valides (lifetime)
--   - validated_today : modules valides aujourd hui
--   - sponsor_dropoffs : tableau des sponsors avec >=1 recrue en
--     admin_relay (= sponsors decrocheées)
-- =============================================================================

begin;

create or replace function public.get_formation_admin_kpis()
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_active_distri_count int;
  v_pending_sponsor_count int;
  v_admin_relay_count int;
  v_validated_total int;
  v_validated_today int;
  v_sponsor_dropoffs jsonb;
begin
  if not public.is_admin() then
    raise exception 'access denied : admin only';
  end if;

  -- Distri actifs (>=1 progression updated_at dans les 30 derniers jours)
  select count(distinct user_id)::int into v_active_distri_count
  from public.formation_user_progress
  where updated_at >= now() - interval '30 days';

  -- Modules en attente sponsor
  select count(*)::int into v_pending_sponsor_count
  from public.formation_user_progress
  where status = 'pending_review_sponsor';

  -- Modules escaladees admin_relay
  select count(*)::int into v_admin_relay_count
  from public.formation_user_progress
  where status = 'pending_review_admin';

  -- Total valides lifetime
  select count(*)::int into v_validated_total
  from public.formation_user_progress
  where status = 'validated';

  -- Valides aujourd hui (reviewed_at >= debut du jour UTC)
  select count(*)::int into v_validated_today
  from public.formation_user_progress
  where status = 'validated'
    and reviewed_at >= date_trunc('day', now() at time zone 'UTC') at time zone 'UTC';

  -- Sponsors decrocheees : ceux qui ont >=1 recrue en admin_relay
  with dropoffs as (
    select
      sponsor.id as sponsor_id,
      sponsor.name as sponsor_name,
      count(*)::int as stuck_count,
      min(p.submitted_at) as oldest_pending
    from public.formation_user_progress p
    inner join public.users distri on distri.id = p.user_id
    inner join public.users sponsor on sponsor.id = distri.parent_user_id
    where p.status = 'pending_review_admin'
    group by sponsor.id, sponsor.name
    order by min(p.submitted_at) asc
    limit 20
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'sponsor_id', sponsor_id,
    'sponsor_name', sponsor_name,
    'stuck_count', stuck_count,
    'oldest_pending', oldest_pending
  )), '[]'::jsonb) into v_sponsor_dropoffs
  from dropoffs;

  return jsonb_build_object(
    'active_distri_count', v_active_distri_count,
    'pending_sponsor_count', v_pending_sponsor_count,
    'admin_relay_count', v_admin_relay_count,
    'validated_total', v_validated_total,
    'validated_today', v_validated_today,
    'sponsor_dropoffs', v_sponsor_dropoffs,
    'computed_at', now()
  );
end;
$$;

comment on function public.get_formation_admin_kpis() is
  'KPIs Formation pour le dashboard admin /formation/admin. Admin only.';

grant execute on function public.get_formation_admin_kpis() to authenticated;

commit;
