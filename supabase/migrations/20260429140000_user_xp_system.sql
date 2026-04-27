-- =============================================================================
-- Gamification 5 - Systeme XP global (2026-04-29)
--
-- RPC qui calcule l XP total d un user en agregeant ses actions lifetime :
--   +50 par section Academy completee (last_step * 50, plafonne a 8 sections)
--   +10 par bilan initial cree (assessments type=initial via clients)
--   +5 par RDV scheduled (follow_ups all time)
--   +2 par message coach envoye (client_messages sender=coach)
--
-- Niveau calcule : level = floor(sqrt(xp / 100)) + 1
-- Ex : 0 XP -> level 1, 100 XP -> level 2, 400 XP -> level 3, 900 XP -> 4...
--
-- Pas de stockage : recalcul a la demande. Pas de drift possible.
-- =============================================================================

begin;

create or replace function public.get_user_xp(p_user_id uuid)
returns table (
  total_xp integer,
  level integer,
  xp_for_next_level integer,
  academy_xp integer,
  bilans_xp integer,
  rdv_xp integer,
  messages_xp integer
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_academy_xp int;
  v_bilans_xp int;
  v_rdv_xp int;
  v_messages_xp int;
  v_total int;
  v_level int;
  v_next_level_threshold int;
begin
  if not (auth.uid() = p_user_id or public.is_admin()) then
    raise exception 'access denied';
  end if;

  -- Academy : last_step * 50, plafonne a 400 (8 * 50)
  select coalesce(least(coalesce(p.last_step, 0), 8) * 50, 0)
  into v_academy_xp
  from public.user_tour_progress p
  where p.user_id = p_user_id and p.tour_key = 'academy';
  v_academy_xp := coalesce(v_academy_xp, 0);

  -- Bilans : count assessments type=initial joint a clients distributor=user * 10
  select coalesce(count(*) * 10, 0)::int into v_bilans_xp
  from public.assessments a
  join public.clients c on c.id = a.client_id
  where c.distributor_id = p_user_id and a.type = 'initial';

  -- RDV : count follow_ups all-time des clients de ce distri * 5
  select coalesce(count(*) * 5, 0)::int into v_rdv_xp
  from public.follow_ups f
  join public.clients c on c.id = f.client_id
  where c.distributor_id = p_user_id;

  -- Messages : count client_messages sender=coach par sender_id * 2
  select coalesce(count(*) * 2, 0)::int into v_messages_xp
  from public.client_messages
  where sender = 'coach' and sender_id = p_user_id;

  v_total := v_academy_xp + v_bilans_xp + v_rdv_xp + v_messages_xp;
  v_level := floor(sqrt(v_total::float / 100))::int + 1;
  -- XP necessaire pour atteindre le niveau suivant
  v_next_level_threshold := (v_level * v_level) * 100;

  return query select
    v_total,
    v_level,
    v_next_level_threshold,
    v_academy_xp,
    v_bilans_xp,
    v_rdv_xp,
    v_messages_xp;
end;
$$;

revoke all on function public.get_user_xp(uuid) from public, anon;
grant execute on function public.get_user_xp(uuid) to authenticated;

comment on function public.get_user_xp is
  'XP global d un user agregé live (academy + bilans + rdv + messages). Self-only ou admin.';

commit;
