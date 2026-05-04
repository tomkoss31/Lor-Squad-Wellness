-- =============================================================================
-- Fix get_user_xp() : restaurer les noms de colonnes attendus par le front
-- (2026-05-04)
--
-- Bug introduit par la migration 20261105140000 : j'ai renommé les colonnes
-- de retour de la RPC :
--   - level         → current_level
--   - xp_for_next_level → next_level_threshold
--
-- Le frontend (XpProgressCard.tsx ligne 137-138) lit toujours `level` et
-- `xp_for_next_level`, donc il fallback sur `?? 1` et `?? 100` → niveau
-- toujours affiché à 1 et seuil à 100, ce qui donne "Niveau 2 dans -516 XP"
-- pour un user à 616 XP.
--
-- Fix : DROP+CREATE la RPC avec les anciens noms de colonnes pour restaurer
-- la compatibilité front. Tout le reste du calcul (cap academy 12 sections,
-- formule level, etc.) est conservé.
-- =============================================================================

begin;

drop function if exists public.get_user_xp(uuid);

create function public.get_user_xp(p_user_id uuid)
returns table (
  total_xp int,
  level int,
  xp_for_next_level int,
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

  -- Academy : last_step * 50, plafonne a 600 (12 sections * 50, mai 2026)
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

  -- Seuil prochain niveau : (v_level)^2 * 100 = XP requis pour atteindre v_level + 1
  v_next_level_threshold := (v_level * v_level) * 100;

  return query select
    v_total,
    v_level,
    v_next_level_threshold,         -- column "xp_for_next_level"
    v_academy_xp,
    v_bilans_xp,
    v_rdv_xp,
    v_messages_xp,
    v_formation_xp,
    v_daily_xp;
end;
$$;

commit;
