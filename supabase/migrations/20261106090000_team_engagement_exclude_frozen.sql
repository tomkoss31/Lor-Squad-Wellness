-- =============================================================================
-- get_team_engagement : exclure les users geles du sub_tree (2026-05-06)
--
-- Suite au chantier freeze_user (migration 20261106080000), les users dont
-- frozen_at IS NOT NULL ne doivent pas apparaitre dans :
--    - Le podium XP
--    - Les stats agregees equipe
--    - Le drilldown engagement
--
-- Fix : ajouter clause WHERE u.frozen_at IS NULL dans le sub_tree recursif.
-- Les ancetres sont gardes (un manager gele garderait quand meme son sub-tree
-- visible pour les autres admins, mais en pratique on ne gele que des leaves).
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
language sql
security definer
set search_path = public, pg_temp
as $$
  with recursive caller_check as (
    select
      auth.uid() as caller_id,
      exists (select 1 from public.users where id = auth.uid() and public.users.role = 'admin') as is_admin
  ),
  authz as (
    select
      cc.is_admin
      or cc.caller_id = p_root_user_id
      or exists (
        with recursive ancestors as (
          select u.id, u.sponsor_id from public.users u where u.id = p_root_user_id
          union all
          select u.id, u.sponsor_id
          from public.users u
          join ancestors a on u.id = a.sponsor_id
        )
        select 1 from ancestors where ancestors.id = cc.caller_id
      ) as authorized
    from caller_check cc
  ),
  -- Sub-tree recursif : EXCLURE les users geles (frozen_at IS NOT NULL)
  -- Le root est inclus meme s'il est gele (admin se voit toujours), mais
  -- les descendants geles sont coupes du tree.
  sub_tree as (
    select u.id as st_id, u.name as st_name, u.role::text as st_role,
           u.current_rank::text as st_current_rank,
           null::uuid as st_parent_id, 0 as st_depth
    from public.users u
    where u.id = p_root_user_id
    union all
    select u.id, u.name, u.role::text, u.current_rank::text,
           u.sponsor_id, st.st_depth + 1
    from public.users u
    join sub_tree st on u.sponsor_id = st.st_id
    where st.st_depth < 5
      and u.frozen_at is null  -- <-- exclusion freeze (descendants seulement)
  ),
  xp_calc as (
    select
      st.st_id as u_id,
      coalesce(least(coalesce(p.last_step, 0), 12) * 50, 0)::int as ax,
      (select coalesce(count(*) * 10, 0)::int from public.assessments a
        join public.clients c on c.id = a.client_id
        where c.distributor_id = st.st_id and a.type = 'initial') as bx,
      (select coalesce(count(*) * 5, 0)::int from public.follow_ups f
        join public.clients c on c.id = f.client_id
        where c.distributor_id = st.st_id) as rx,
      (select coalesce(count(*) * 2, 0)::int from public.client_messages cm
        where cm.sender = 'coach' and cm.sender_id = st.st_id) as mx,
      (select coalesce(
          count(*) filter (where fup.status = 'validated') * 10
          + count(*) filter (where fup.status = 'validated' and fup.validation_path = 'auto') * 50,
          0)::int
        from public.formation_user_progress fup where fup.user_id = st.st_id) as fx,
      (select coalesce(uu.lifetime_login_count, 0) * 5
        from public.users uu where uu.id = st.st_id) as dx
    from sub_tree st
    left join public.user_tour_progress p
      on p.user_id = st.st_id and p.tour_key = 'academy'
  ),
  academy_calc as (
    select
      st.st_id as u_id,
      coalesce(p.last_step, 0) as ac_step,
      p.completed_at as ac_completed
    from sub_tree st
    left join public.user_tour_progress p
      on p.user_id = st.st_id and p.tour_key = 'academy'
  ),
  formation_calc as (
    select
      st.st_id as u_id,
      coalesce(count(*) filter (where fp.status = 'validated' and fp.module_id like 'M1%'), 0)::int as f_n1,
      coalesce(count(*) filter (where fp.status = 'validated' and fp.module_id like 'M2%'), 0)::int as f_n2,
      coalesce(count(*) filter (where fp.status = 'validated' and fp.module_id like 'M3%'), 0)::int as f_n3,
      coalesce(count(*) filter (where fp.status in ('pending_review_sponsor', 'pending_review_admin')), 0)::int as f_pending,
      coalesce(count(*) filter (where fp.status = 'validated'), 0)::int as f_total
    from sub_tree st
    left join public.formation_user_progress fp on fp.user_id = st.st_id
    group by st.st_id
  ),
  activity_calc as (
    select
      st.st_id as u_id,
      (select count(*)::int from public.assessments a
        join public.clients c on c.id = a.client_id
        where c.distributor_id = st.st_id and a.type = 'initial'
          and a.created_at >= now() - interval '30 days') as ac_b30,
      (select count(*)::int from public.follow_ups f
        join public.clients c on c.id = f.client_id
        where c.distributor_id = st.st_id
          and f.created_at >= now() - interval '30 days') as ac_r30,
      (select count(*)::int from public.client_messages cm
        where cm.sender = 'coach' and cm.sender_id = st.st_id
          and cm.created_at >= now() - interval '7 days') as ac_m7
    from sub_tree st
  ),
  engagement_calc as (
    select
      uu.id as u_id,
      uu.last_access_at as ls_at,
      coalesce(uu.lifetime_login_count, 0) as ll_count
    from public.users uu
    where uu.id in (select st_id from sub_tree)
  )
  select
    st.st_id,
    st.st_name,
    st.st_role,
    st.st_current_rank,
    st.st_parent_id,
    st.st_depth,
    (xp.ax + xp.bx + xp.rx + xp.mx + xp.fx + xp.dx)::int,
    (floor(sqrt((xp.ax + xp.bx + xp.rx + xp.mx + xp.fx + xp.dx)::float / 100))::int + 1),
    xp.ax,
    xp.bx,
    xp.rx,
    xp.mx,
    xp.fx,
    xp.dx,
    ac.ac_step,
    12,
    case when ac.ac_step >= 12 then 100 else round((ac.ac_step::numeric / 12) * 100)::int end,
    ac.ac_completed,
    f.f_n1,
    f.f_n2,
    f.f_n3,
    f.f_pending,
    f.f_total,
    a.ac_b30,
    a.ac_r30,
    a.ac_m7,
    e.ls_at,
    e.ll_count,
    case
      when e.ll_count = 0 then 'never_started'
      when e.ls_at is null then 'never_started'
      when e.ls_at < now() - interval '14 days' then 'decroche'
      when f.f_pending > 0 and a.ac_b30 = 0 and a.ac_r30 = 0 then 'stuck'
      when e.ls_at < now() - interval '7 days' then 'idle'
      else 'active'
    end::text
  from sub_tree st
  cross join authz
  left join xp_calc xp on xp.u_id = st.st_id
  left join academy_calc ac on ac.u_id = st.st_id
  left join formation_calc f on f.u_id = st.st_id
  left join activity_calc a on a.u_id = st.st_id
  left join engagement_calc e on e.u_id = st.st_id
  where authz.authorized = true
  order by (xp.ax + xp.bx + xp.rx + xp.mx + xp.fx + xp.dx) desc nulls last, st.st_depth asc;
$$;

grant execute on function public.get_team_engagement(uuid) to authenticated;

comment on function public.get_team_engagement is
  'V4 (2026-05-06) : exclut les descendants geles (frozen_at NOT NULL) du sub-tree recursif. Le root est toujours visible meme s''il est gele (cas admin self).';

commit;
