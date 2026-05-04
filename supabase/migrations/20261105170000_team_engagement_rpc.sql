-- =============================================================================
-- RPC get_team_engagement(root_user_id) — agrégation pilotage équipe (2026-05-04)
--
-- Retourne, pour chaque membre du sous-arbre sponsorisé (direct ou indirect)
-- par root_user_id, l'ensemble des métriques nécessaires au tableau de bord
-- équipe :
--   - Identité (id, name, role, avatar_url, current_rank)
--   - XP totaux + level + breakdown
--   - Progression Academy (last_step, percent)
--   - Progression Formation (modules validés N1/N2/N3)
--   - Activité récente (bilans 30j, RDV 30j, messages 7j)
--   - Engagement (last_seen, lifetime_login, streak)
--   - Statut dérivé (active / idle / stuck / decroche)
--
-- Scope : admin voit toute l'équipe (récursif via sponsor_id), un référent
-- voit ses recrues directes + indirectes, un distri ne voit que lui-même
-- (mais l'app gate déjà l'accès, on est cohérent avec la règle ≤3 niveaux
-- vers le bas via team_tree).
--
-- Le tri par défaut est xp_total DESC (utile pour le podium top 3).
-- =============================================================================

begin;

drop function if exists public.get_team_engagement(uuid);

create function public.get_team_engagement(p_root_user_id uuid)
returns table (
  user_id uuid,
  name text,
  role text,
  current_rank text,
  parent_id uuid,
  depth int,
  -- XP
  xp_total int,
  xp_level int,
  xp_academy int,
  xp_bilans int,
  xp_rdv int,
  xp_messages int,
  xp_formation int,
  xp_daily int,
  -- Academy
  academy_step int,
  academy_total_sections int,
  academy_percent int,
  academy_completed_at timestamptz,
  -- Formation pyramide
  formation_validated_n1 int,
  formation_validated_n2 int,
  formation_validated_n3 int,
  formation_pending int,
  formation_total_validated int,
  -- Activité (compteurs sur period rolling)
  bilans_30d int,
  rdv_30d int,
  messages_7d int,
  -- Engagement
  last_seen_at timestamptz,
  lifetime_login_count int,
  -- Statut dérivé
  status text  -- 'active' | 'idle' | 'stuck' | 'never_started'
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_caller uuid := auth.uid();
  v_is_admin boolean := false;
begin
  if v_caller is null then
    raise exception 'access denied';
  end if;

  -- Admin bypass
  select exists (select 1 from public.users where id = v_caller and role = 'admin')
  into v_is_admin;

  -- Sécurité : un caller non-admin ne peut requêter que son propre sous-arbre
  -- (lui-même ou un descendant dans la lignée Lor'Squad — on s'aligne sur
  -- le scope de get_team_tree qui valide déjà cette règle).
  if not v_is_admin and v_caller <> p_root_user_id then
    -- Vérifier que p_root_user_id est dans le sous-arbre du caller
    -- (= le caller est ancêtre direct ou indirect)
    if not exists (
      with recursive ancestors as (
        select u.id, u.sponsor_id from public.users u where u.id = p_root_user_id
        union all
        select u.id, u.sponsor_id
        from public.users u
        join ancestors a on u.id = a.sponsor_id
      )
      select 1 from ancestors where id = v_caller
    ) then
      raise exception 'access denied: not your sub-tree';
    end if;
  end if;

  -- ─── Récursive sub-tree depuis p_root_user_id ──────────────────────────
  return query
  with recursive sub_tree as (
    select u.id, u.name, u.role::text as role, u.current_rank::text as current_rank,
           null::uuid as parent_id, 0 as depth
    from public.users u
    where u.id = p_root_user_id
    union all
    select u.id, u.name, u.role::text, u.current_rank::text,
           u.sponsor_id, st.depth + 1
    from public.users u
    join sub_tree st on u.sponsor_id = st.id
    where st.depth < 5  -- safety limit anti-cycle
  ),
  -- ─── XP par membre via get_user_xp() ──────────────────────────────────
  xp_per_user as (
    select
      st.id as user_id,
      x.total_xp,
      x.level,
      x.academy_xp,
      x.bilans_xp,
      x.rdv_xp,
      x.messages_xp,
      x.formation_xp,
      x.daily_xp
    from sub_tree st
    cross join lateral (
      -- get_user_xp est SECURITY DEFINER avec check auth.uid() = p_user_id
      -- ou is_admin(). Comme on est SECURITY DEFINER ici aussi avec check
      -- d'ancestry au-dessus, on peut le lateral-join.
      select coalesce(u_xp.total_xp, 0) as total_xp,
             coalesce(u_xp.level, 1) as level,
             coalesce(u_xp.academy_xp, 0) as academy_xp,
             coalesce(u_xp.bilans_xp, 0) as bilans_xp,
             coalesce(u_xp.rdv_xp, 0) as rdv_xp,
             coalesce(u_xp.messages_xp, 0) as messages_xp,
             coalesce(u_xp.formation_xp, 0) as formation_xp,
             coalesce(u_xp.daily_xp, 0) as daily_xp
      from (
        -- Inline calcul comme dans get_user_xp (12 sections cap, formation, etc.)
        select
          coalesce(least(coalesce(p.last_step, 0), 12) * 50, 0)::int as academy_xp,
          (select coalesce(count(*) * 10, 0)::int from public.assessments a
            join public.clients c on c.id = a.client_id
            where c.distributor_id = st.id and a.type = 'initial') as bilans_xp,
          (select coalesce(count(*) * 5, 0)::int from public.follow_ups f
            join public.clients c on c.id = f.client_id
            where c.distributor_id = st.id) as rdv_xp,
          (select coalesce(count(*) * 2, 0)::int from public.client_messages
            where sender = 'coach' and sender_id = st.id) as messages_xp,
          (select coalesce(
              count(*) filter (where status = 'validated') * 10 +
              count(*) filter (where status = 'validated' and validation_path = 'auto') * 50,
              0)::int
            from public.formation_user_progress where user_id = st.id) as formation_xp,
          (select coalesce(u.lifetime_login_count, 0) * 5 from public.users u where u.id = st.id) as daily_xp
        from public.user_tour_progress p
        where p.user_id = st.id and p.tour_key = 'academy'
        union all
        select 0, 0, 0, 0, 0, 0  -- fallback if no tour_progress row
        where not exists (
          select 1 from public.user_tour_progress
          where user_id = st.id and tour_key = 'academy'
        )
        limit 1
      ) raw,
      lateral (
        select
          (raw.academy_xp + raw.bilans_xp + raw.rdv_xp + raw.messages_xp + raw.formation_xp + raw.daily_xp) as total_xp,
          floor(sqrt((raw.academy_xp + raw.bilans_xp + raw.rdv_xp + raw.messages_xp + raw.formation_xp + raw.daily_xp)::float / 100))::int + 1 as level,
          raw.academy_xp,
          raw.bilans_xp,
          raw.rdv_xp,
          raw.messages_xp,
          raw.formation_xp,
          raw.daily_xp
      ) u_xp
    ) x
  ),
  -- ─── Academy progression ───────────────────────────────────────────────
  academy_per_user as (
    select
      st.id as user_id,
      coalesce(p.last_step, 0) as step,
      p.completed_at
    from sub_tree st
    left join public.user_tour_progress p
      on p.user_id = st.id and p.tour_key = 'academy'
  ),
  -- ─── Formation progression (par niveau via module_id prefix) ──────────
  formation_per_user as (
    select
      st.id as user_id,
      coalesce(count(*) filter (where status = 'validated' and module_id like 'M1%'), 0)::int as v_n1,
      coalesce(count(*) filter (where status = 'validated' and module_id like 'M2%'), 0)::int as v_n2,
      coalesce(count(*) filter (where status = 'validated' and module_id like 'M3%'), 0)::int as v_n3,
      coalesce(count(*) filter (where status in ('pending_review_sponsor', 'pending_review_admin')), 0)::int as pending,
      coalesce(count(*) filter (where status = 'validated'), 0)::int as total_validated
    from sub_tree st
    left join public.formation_user_progress fp on fp.user_id = st.id
    group by st.id
  ),
  -- ─── Activité 7j / 30j ─────────────────────────────────────────────────
  activity_per_user as (
    select
      st.id as user_id,
      (select count(*)::int from public.assessments a
        join public.clients c on c.id = a.client_id
        where c.distributor_id = st.id and a.type = 'initial'
          and a.created_at >= now() - interval '30 days') as bilans_30d,
      (select count(*)::int from public.follow_ups f
        join public.clients c on c.id = f.client_id
        where c.distributor_id = st.id
          and f.created_at >= now() - interval '30 days') as rdv_30d,
      (select count(*)::int from public.client_messages
        where sender = 'coach' and sender_id = st.id
          and created_at >= now() - interval '7 days') as messages_7d
    from sub_tree st
  ),
  -- ─── Engagement (last_seen, lifetime_login) ───────────────────────────
  engagement_per_user as (
    select
      u.id as user_id,
      u.last_seen_at,
      coalesce(u.lifetime_login_count, 0) as lifetime_login_count
    from public.users u
    where u.id in (select id from sub_tree)
  )
  -- ─── Assemblage final ─────────────────────────────────────────────────
  select
    st.id,
    st.name,
    st.role,
    st.current_rank,
    st.parent_id,
    st.depth,
    -- XP
    xp.total_xp,
    xp.level,
    xp.academy_xp,
    xp.bilans_xp,
    xp.rdv_xp,
    xp.messages_xp,
    xp.formation_xp,
    xp.daily_xp,
    -- Academy
    ac.step,
    12 as academy_total_sections,  -- 12 sections après mai 2026
    case when ac.step >= 12 then 100 else round((ac.step::numeric / 12) * 100)::int end,
    ac.completed_at,
    -- Formation
    f.v_n1,
    f.v_n2,
    f.v_n3,
    f.pending,
    f.total_validated,
    -- Activité
    a.bilans_30d,
    a.rdv_30d,
    a.messages_7d,
    -- Engagement
    e.last_seen_at,
    e.lifetime_login_count,
    -- Statut dérivé
    case
      when e.lifetime_login_count = 0 then 'never_started'
      when e.last_seen_at is null then 'never_started'
      when e.last_seen_at < now() - interval '14 days' then 'decroche'
      when f.pending > 0 and a.bilans_30d = 0 and a.rdv_30d = 0 then 'stuck'
      when e.last_seen_at < now() - interval '7 days' then 'idle'
      else 'active'
    end as status
  from sub_tree st
  left join xp_per_user xp on xp.user_id = st.id
  left join academy_per_user ac on ac.user_id = st.id
  left join formation_per_user f on f.user_id = st.id
  left join activity_per_user a on a.user_id = st.id
  left join engagement_per_user e on e.user_id = st.id
  order by xp.total_xp desc nulls last, st.depth asc;
end;
$$;

grant execute on function public.get_team_engagement(uuid) to authenticated;

commit;
