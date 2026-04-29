-- =============================================================================
-- Fix get_user_xp : 2 bugs (2026-04-30)
--
-- 1. Bug column "sender_user_id does not exist"
--    Le bon nom est "sender_id" sur public.client_messages.
--
-- 2. Bug Academy XP = 0 alors que terminee
--    last_step seul ne suffit pas (peut rester a 7 ou 0 meme si completed).
--    Si completed_at IS NOT NULL → forcer 8 * 50 = 400 XP (max academy).
-- =============================================================================

begin;

drop function if exists public.get_user_xp(uuid);

create or replace function public.get_user_xp(p_user_id uuid)
returns table (
  total_xp integer,
  level integer,
  xp_for_next_level integer,
  academy_xp integer,
  bilans_xp integer,
  rdv_xp integer,
  messages_xp integer,
  daily_xp integer
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
  v_daily_xp int;
  v_total int;
  v_level int;
  v_next_level_threshold int;
  v_completed_at timestamptz;
  v_last_step int;
begin
  if not (auth.uid() = p_user_id or public.is_admin()) then
    raise exception 'access denied';
  end if;

  -- Academy : si completed → 400 XP max, sinon last_step * 50
  select p.completed_at, coalesce(p.last_step, 0)
  into v_completed_at, v_last_step
  from public.user_tour_progress p
  where p.user_id = p_user_id and p.tour_key = 'academy';

  if v_completed_at is not null then
    v_academy_xp := 400; -- 8 sections * 50
  else
    v_academy_xp := least(coalesce(v_last_step, 0), 8) * 50;
  end if;
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

  -- Messages : count client_messages sender=coach * 2
  -- Fix 30/04/2026 : bonne colonne = sender_id (pas sender_user_id)
  select coalesce(count(*) * 2, 0)::int into v_messages_xp
  from public.client_messages m
  where m.sender_id = p_user_id and m.sender = 'coach';

  -- Daily login : lifetime_login_count * 5 (V2 — 2026-04-29)
  select coalesce(u.lifetime_login_count * 5, 0)::int
  into v_daily_xp
  from public.users u
  where u.id = p_user_id;
  v_daily_xp := coalesce(v_daily_xp, 0);

  v_total := v_academy_xp + v_bilans_xp + v_rdv_xp + v_messages_xp + v_daily_xp;
  v_level := floor(sqrt(v_total::float / 100.0))::int + 1;
  v_next_level_threshold := (v_level * v_level) * 100;

  total_xp := v_total;
  level := v_level;
  xp_for_next_level := v_next_level_threshold;
  academy_xp := v_academy_xp;
  bilans_xp := v_bilans_xp;
  rdv_xp := v_rdv_xp;
  messages_xp := v_messages_xp;
  daily_xp := v_daily_xp;

  return next;
end;
$$;

grant execute on function public.get_user_xp(uuid) to authenticated;

commit;
