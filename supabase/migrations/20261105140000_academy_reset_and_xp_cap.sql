-- =============================================================================
-- Reset Academy + bump cap XP de 8 à 12 sections (2026-05-04)
--
-- Pourquoi : on a ajouté 4 nouvelles sections Academy en mai 2026
-- (new-tools-2026, cahier-de-bord-tour, simulateur-ebe-tour,
-- liste-100-agenda-tour). On veut que tout le monde refasse le parcours
-- complet (12 sections au lieu de 8) pour découvrir les nouveaux outils
-- ET gagner les XP correspondants.
--
-- Actions :
--   1. Reset user_tour_progress.last_step = 0 pour tour_key='academy'
--   2. Vider user_tour_reminder_dismissals pour academy (ils peuvent
--      re-voir le popup auto demain)
--   3. Update get_user_xp() : cap academy_xp passe de 8*50=400 à 12*50=600
--
-- Sans toucher : Formation pyramide, bilans, RDV, messages, daily streak,
-- academy_section_feedback (trace utile pour stats admin).
-- =============================================================================

begin;

-- ─── 1. Reset progression Academy de tous les users ────────────────────────
update public.user_tour_progress
set last_step = 0,
    completed_at = null,
    skipped_at = null,
    started_at = now(),
    updated_at = now()
where tour_key = 'academy';

-- ─── 2. Vider les dismissals du popup "reprends ton Academy" ──────────────
-- (Ils pourront le revoir demain — pas de spam immédiat)
delete from public.user_tour_reminder_dismissals
where tour_key = 'academy';

-- ─── 3. Update get_user_xp() : cap passe de 8 à 12 sections ───────────────
-- DROP nécessaire car CREATE OR REPLACE refuse les changements de
-- signature OUT params (même si on touche pas la signature ici, Postgres
-- est strict sur la cohérence). Idempotent via IF EXISTS.
drop function if exists public.get_user_xp(uuid);

create function public.get_user_xp(p_user_id uuid)
returns table (
  total_xp int,
  current_level int,
  next_level_threshold int,
  academy_xp int,
  bilans_xp int,
  rdv_xp int,
  messages_xp int,
  formation_xp int,
  daily_xp int
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
  v_formation_xp int;
  v_daily_xp int;
  v_total int;
  v_level int;
  v_next_level_threshold int;
begin
  if not (auth.uid() = p_user_id or public.is_admin()) then
    raise exception 'access denied';
  end if;

  -- Academy : last_step * 50, plafonne a 600 (12 sections * 50)
  -- Mai 2026 : passé de 8 à 12 sections (4 nouvelles : Hub overview,
  -- Cahier de bord, Simulateur EBE, Liste 100 → Agenda).
  select coalesce(least(coalesce(p.last_step, 0), 12) * 50, 0)
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

  -- Formation : count modules validated * 10 + bonus 50 par auto-validated
  -- (validation_path = 'auto' = quiz QCM 100 % du premier coup)
  select coalesce(
    count(*) filter (where status = 'validated') * 10 +
    count(*) filter (where status = 'validated' and validation_path = 'auto') * 50,
    0
  )::int into v_formation_xp
  from public.formation_user_progress
  where user_id = p_user_id;

  -- Daily : lifetime_login_count * 5 (jamais reset)
  select coalesce(u.lifetime_login_count, 0) * 5
  into v_daily_xp
  from public.users u
  where u.id = p_user_id;
  v_daily_xp := coalesce(v_daily_xp, 0);

  v_total := v_academy_xp + v_bilans_xp + v_rdv_xp + v_messages_xp + v_formation_xp + v_daily_xp;

  -- Niveau : floor(sqrt(total / 100)) + 1
  v_level := floor(sqrt(v_total::float / 100)) + 1;

  -- Seuil prochain niveau : (v_level)^2 * 100 = XP requis pour atteindre le level v_level + 1
  v_next_level_threshold := (v_level * v_level) * 100;

  return query select
    v_total,
    v_level,
    v_next_level_threshold,
    v_academy_xp,
    v_bilans_xp,
    v_rdv_xp,
    v_messages_xp,
    v_formation_xp,
    v_daily_xp;
end;
$$;

commit;
