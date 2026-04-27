-- =============================================================================
-- Gamification 3 - Quetes hebdo (2026-04-29)
--
-- RPC qui agrege les compteurs hebdo d un user pour alimenter les quetes
-- affichees sur le Co-pilote :
--   - bilans_count : nb d assessments type=initial crees cette semaine
--     pour des clients dont distributor_id = user
--   - messages_count : nb de client_messages avec sender='coach' et
--     sender_id=user envoyes cette semaine
--   - academy_sections_done_this_week : nb de sections Academy completees
--     cette semaine. V1 simple : 1 si user_tour_progress.updated_at >= week_start
--     ET last_step > 0, sinon 0. Ne distingue pas plusieurs sections faites
--     dans la meme semaine (compteur unitaire).
--
-- Auth : le user peut lire ses propres compteurs uniquement (auth.uid() ou admin).
-- =============================================================================

begin;

create or replace function public.get_weekly_progress(p_user_id uuid)
returns table (
  bilans_count integer,
  messages_count integer,
  academy_sections_done_this_week integer
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  week_start date;
begin
  if not (auth.uid() = p_user_id or public.is_admin()) then
    raise exception 'access denied';
  end if;

  week_start := date_trunc('week', current_date)::date;

  return query
  select
    coalesce((
      select count(*)::int
      from public.assessments a
      join public.clients c on c.id = a.client_id
      where c.distributor_id = p_user_id
        and a.type = 'initial'
        and a.created_at >= week_start
    ), 0),
    coalesce((
      select count(*)::int
      from public.client_messages
      where sender = 'coach'
        and sender_id = p_user_id
        and created_at >= week_start
    ), 0),
    coalesce((
      select case
        when p.updated_at >= week_start and coalesce(p.last_step, 0) > 0 then 1
        else 0
      end
      from public.user_tour_progress p
      where p.user_id = p_user_id
        and p.tour_key = 'academy'
      limit 1
    ), 0);
end;
$$;

revoke all on function public.get_weekly_progress(uuid) from public, anon;
grant execute on function public.get_weekly_progress(uuid) to authenticated;

comment on function public.get_weekly_progress is
  'Compteurs hebdo (bilans, messages, academy) pour les quetes du user. Self-only sauf admin.';

commit;
