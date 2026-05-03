-- =============================================================================
-- FLEX V2.2 (2026-11-05) — drift list scoped au sponsor
--
-- Nouvelle RPC list_flex_drift_for_sponsor() qui renvoie la liste des distri
-- DIRECTEMENT sponsorisés par le caller (users.parent_user_id = caller) qui
-- n'ont pas fait de check-in depuis >2 semaines.
--
-- Réutilise la même logique que list_flex_drift_distri() mais sans le gate
-- admin et avec un filtre WHERE u.parent_user_id = auth.uid().
-- =============================================================================

begin;

create or replace function public.list_flex_drift_for_sponsor()
returns table (
  user_id uuid,
  user_name text,
  weeks_drift integer,
  last_checkin_date date
)
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  v_caller uuid := auth.uid();
begin
  if v_caller is null then
    raise exception 'auth_required';
  end if;

  return query
  select
    p.user_id,
    u.name as user_name,
    extract(week from age(current_date, coalesce(max(c.date), p.created_at::date)))::integer as weeks_drift,
    max(c.date) as last_checkin_date
  from public.distributor_action_plan p
  join public.users u on u.id = p.user_id
  left join public.daily_action_checkin c on c.user_id = p.user_id
  where p.is_paused = false
    and u.parent_user_id = v_caller
  group by p.user_id, u.name, p.created_at
  having (current_date - coalesce(max(c.date), p.created_at::date)) > 14
  order by weeks_drift desc;
end;
$function$;

comment on function public.list_flex_drift_for_sponsor() is
  'Liste les distri sous mon parrainage direct sans check-in depuis >2 semaines.';

grant execute on function public.list_flex_drift_for_sponsor() to authenticated;

commit;
