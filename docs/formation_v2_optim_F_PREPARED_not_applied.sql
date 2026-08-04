-- =============================================================================
-- Formation V2 — Optim F : MIGRATIONS PRÉPARÉES, **PAS ENCORE APPLIQUÉES**.
--
-- ⚠️ Ce fichier n'est PAS dans supabase/migrations exprès : il ne doit PAS
-- partir tout seul au prochain `db push`. On l'applique À LA MAIN, AVEC Thomas,
-- au moment de « mettre en place direct sur l'app » (dev + prod = base partagée).
--
-- Deux changements, tous deux sûrs et additifs (aucune donnée touchée) :
--   1) L'XP des micro-leçons Formation V2 compte enfin dans l'XP GLOBAL
--      (niveau + podium équipe). Replié dans le terme `formation_xp` existant
--      → AUCUN changement de signature du RPC, le front reste inchangé.
--   2) Un RPC admin pour MESURER qui avance dans la Formation V2 (vue usage).
--
-- Barème : 1 leçon V2 = 15 XP (aligné sur XP_PER_LESSON dans
-- src/features/formation-v2/types.ts). Source de progression : la ligne
-- user_tour_progress(tour_key='formation_v2').last_step posée au lot 4.
--
-- APPLICATION (avec Thomas) :
--   - via MCP execute_sql / apply_migration, ou l'éditeur SQL du dashboard ;
--   - après application, PENSER au registre migrations (cf. CLAUDE.md « vérifier
--     schema_migrations ») si on en fait une vraie migration numérotée.
-- =============================================================================


-- ─────────────────────────────────────────────────────────────────────────────
-- 1) get_user_xp : ajoute l'XP Formation V2 (last_step * 15) au terme formation.
--    Copie conforme de la fonction actuelle + 4 lignes marquées « V2 ».
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.get_user_xp(p_user_id uuid)
returns table(
  total_xp integer, current_level integer, next_level_threshold integer,
  academy_xp integer, bilans_xp integer, rdv_xp integer, messages_xp integer,
  formation_xp integer, daily_xp integer
)
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
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

  select coalesce(least(coalesce(p.last_step, 0), 7) * 50, 0)
  into v_academy_xp
  from public.user_tour_progress p
  where p.user_id = p_user_id and p.tour_key = 'academy';
  v_academy_xp := coalesce(v_academy_xp, 0);

  select coalesce(count(*) * 10, 0)::int into v_bilans_xp
  from public.assessments a
  join public.clients c on c.id = a.client_id
  where c.distributor_id = p_user_id and a.type = 'initial';

  select coalesce(count(*) * 5, 0)::int into v_rdv_xp
  from public.follow_ups f
  join public.clients c on c.id = f.client_id
  where c.distributor_id = p_user_id;

  select coalesce(count(*) * 2, 0)::int into v_messages_xp
  from public.client_messages
  where sender = 'coach' and sender_id = p_user_id;

  select coalesce(
    count(*) filter (where status = 'validated') * 10 +
    count(*) filter (where status = 'validated' and validation_path = 'auto') * 50,
    0
  )::int into v_formation_xp
  from public.formation_user_progress
  where user_id = p_user_id;

  -- ▼▼▼ V2 : les micro-leçons Duolingo comptent (last_step * 15). ▼▼▼
  v_formation_xp := v_formation_xp + coalesce((
    select p.last_step * 15
    from public.user_tour_progress p
    where p.user_id = p_user_id and p.tour_key = 'formation_v2'
  ), 0);
  -- ▲▲▲ V2 ▲▲▲

  select coalesce(u.lifetime_login_count, 0) * 5
  into v_daily_xp
  from public.users u
  where u.id = p_user_id;
  v_daily_xp := coalesce(v_daily_xp, 0);

  v_total := v_academy_xp + v_bilans_xp + v_rdv_xp + v_messages_xp + v_formation_xp + v_daily_xp;
  v_level := floor(sqrt(v_total::float / 100)) + 1;
  v_next_level_threshold := (v_level * v_level) * 100;

  return query select
    v_total, v_level, v_next_level_threshold,
    v_academy_xp, v_bilans_xp, v_rdv_xp, v_messages_xp, v_formation_xp, v_daily_xp;
end;
$function$;


-- ─────────────────────────────────────────────────────────────────────────────
-- 2) get_formation_v2_leaderboard : vue admin « qui avance dans la Formation V2 ».
--    Modèle calqué sur get_academy_leaderboard (admin-only, security definer,
--    search_path figé). Renvoie last_step brut ; le front calcule le % contre
--    FORMATION_V2_TOTAL (constante app).
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.get_formation_v2_leaderboard()
returns table(
  user_id uuid, user_name text, user_role text,
  last_step integer, completed_at timestamptz, last_active_at timestamptz
)
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
begin
  if not public.is_admin() then
    raise exception 'access denied: admin role required';
  end if;

  return query
  select
    u.id, u.name, u.role::text,
    coalesce(p.last_step, 0)::int,
    p.completed_at,
    coalesce(p.updated_at, u.last_access_at)
  from public.users u
  left join public.user_tour_progress p
    on p.user_id = u.id and p.tour_key = 'formation_v2'
  where u.active = true
  order by
    case when p.completed_at is not null then 0 else 1 end,
    coalesce(p.last_step, 0) desc,
    u.name asc;
end;
$function$;

revoke all on function public.get_formation_v2_leaderboard() from public, anon;
grant execute on function public.get_formation_v2_leaderboard() to authenticated;
