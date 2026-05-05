-- =============================================================================
-- Fix get_team_engagement : "column reference 'role' is ambiguous" (2026-05-05)
--
-- Bug remonte Thomas : podium "Mon equipe" affichait "Aucun membre" alors que
-- le sub-tree de Thomas contient 4 distri (Lea, Mandy, Prisca, Victoire).
--
-- Cause SQL : la RETURNS TABLE declare `role text` comme OUT parameter.
-- Dans le body, ligne `where id = v_caller and role = 'admin'` -> Postgres
-- ne sait pas si `role` est l'OUT param ou la colonne de public.users
-- -> ERROR "column reference 'role' is ambiguous" -> RPC throw -> front
-- recoit data=null -> 0 membres affiches.
--
-- Fix : qualifier `users.role` dans le check d'admin du caller. C'est
-- la seule occurence de `role` non-qualifiee dans le body.
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
  xp_total int,
  xp_level int,
  xp_academy int,
  xp_bilans int,
  xp_rdv int,
  xp_messages int,
  xp_formation int,
  xp_daily int,
  academy_step int,
  academy_total_sections int,
  academy_percent int,
  academy_completed_at timestamptz,
  formation_validated_n1 int,
  formation_validated_n2 int,
  formation_validated_n3 int,
  formation_pending int,
  formation_total_validated int,
  bilans_30d int,
  rdv_30d int,
  messages_7d int,
  last_seen_at timestamptz,
  lifetime_login_count int,
  status text
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

  -- Fix : qualifier users.role pour eviter l'ambiguite avec OUT param `role`
  select exists (
    select 1 from public.users u
    where u.id = v_caller and u.role = 'admin'
  ) into v_is_admin;

  if not v_is_admin and v_caller <> p_root_user_id then
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
    where st.depth < 5
  ),
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
      select coalesce(u_xp.total_xp, 0) as total_xp,
             coalesce(u_xp.level, 1) as level,
             coalesce(u_xp.academy_xp, 0) as academy_xp,
             coalesce(u_xp.bilans_xp, 0) as bilans_xp,
             coalesce(u_xp.rdv_xp, 0) as rdv_xp,
             coalesce(u_xp.messages_xp, 0) as messages_xp,
             coalesce(u_xp.formation_xp, 0) as formation_xp,
             coalesce(u_xp.daily_xp, 0) as daily_xp
      from (
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
              count(*) filter (where fup.status = 'validated') * 10 +
              count(*) filter (where fup.status = 'validated' and fup.validation_path = 'auto') * 50,
              0)::int
            from public.formation_user_progress fup where fup.user_id = st.id) as formation_xp,
          (select coalesce(u.lifetime_login_count, 0) * 5 from public.users u where u.id = st.id) as daily_xp
        from public.user_tour_progress p
        where p.user_id = st.id and p.tour_key = 'academy'
        union all
        select 0, 0, 0, 0, 0, 0
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
  academy_per_user as (
    select
      st.id as user_id,
      coalesce(p.last_step, 0) as step,
      p.completed_at
    from sub_tree st
    left join public.user_tour_progress p
      on p.user_id = st.id and p.tour_key = 'academy'
  ),
  formation_per_user as (
    select
      st.id as user_id,
      coalesce(count(*) filter (where fp.status = 'validated' and fp.module_id like 'M1%'), 0)::int as v_n1,
      coalesce(count(*) filter (where fp.status = 'validated' and fp.module_id like 'M2%'), 0)::int as v_n2,
      coalesce(count(*) filter (where fp.status = 'validated' and fp.module_id like 'M3%'), 0)::int as v_n3,
      coalesce(count(*) filter (where fp.status in ('pending_review_sponsor', 'pending_review_admin')), 0)::int as pending,
      coalesce(count(*) filter (where fp.status = 'validated'), 0)::int as total_validated
    from sub_tree st
    left join public.formation_user_progress fp on fp.user_id = st.id
    group by st.id
  ),
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
  engagement_per_user as (
    select
      u.id as user_id,
      u.last_seen_at,
      coalesce(u.lifetime_login_count, 0) as lifetime_login_count
    from public.users u
    where u.id in (select id from sub_tree)
  )
  select
    st.id,
    st.name,
    st.role,
    st.current_rank,
    st.parent_id,
    st.depth,
    xp.total_xp,
    xp.level,
    xp.academy_xp,
    xp.bilans_xp,
    xp.rdv_xp,
    xp.messages_xp,
    xp.formation_xp,
    xp.daily_xp,
    ac.step,
    12 as academy_total_sections,
    case when ac.step >= 12 then 100 else round((ac.step::numeric / 12) * 100)::int end,
    ac.completed_at,
    f.v_n1,
    f.v_n2,
    f.v_n3,
    f.pending,
    f.total_validated,
    a.bilans_30d,
    a.rdv_30d,
    a.messages_7d,
    e.last_seen_at,
    e.lifetime_login_count,
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

comment on function public.get_team_engagement is
  'RPC team engagement (2026-05-04, fix role ambiguous 2026-05-05). '
  'Retourne XP + activite + statut pour chaque membre du sub-tree. '
  'Fix : `users.role` qualifie dans le check is_admin pour eviter conflit '
  'avec OUT parameter `role text` de la RETURNS TABLE.';

commit;
