-- =============================================================================
-- Gamification 6 - Recap semaine derniere a partager (2026-04-29)
--
-- RPC qui retourne les chiffres de la semaine PASSEE (lundi-dimanche
-- precedent, figes). Utilisee pour generer le visuel de partage
-- equipe/groupes WhatsApp chaque debut de semaine.
--
-- Periode : du lundi de la semaine precedente 00:00:00 au dimanche
-- 23:59:59. Calcul ISO standard via date_trunc('week') - 7 days.
--
-- Format de retour :
--   - week_start, week_end : bornes de la semaine
--   - total_bilans, total_messages, total_new_clients : aggregats globaux
--   - top_bilans : top 3 distri par bilans (json array)
--   - top_messages : top 3 distri par messages (json array)
-- =============================================================================

begin;

create or replace function public.get_last_week_recap()
returns table (
  week_start date,
  week_end date,
  total_bilans integer,
  total_messages integer,
  total_new_clients integer,
  top_bilans jsonb,
  top_messages jsonb
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_week_start date;
  v_week_end date;
begin
  if not public.is_admin() then
    raise exception 'access denied: admin role required';
  end if;

  v_week_start := (date_trunc('week', current_date) - interval '7 days')::date;
  v_week_end := (date_trunc('week', current_date) - interval '1 day')::date;

  return query
  with bilans_tot as (
    select count(*)::int as cnt
    from public.assessments a
    where a.type = 'initial'
      and a.created_at >= v_week_start
      and a.created_at < v_week_start + interval '7 days'
  ),
  messages_tot as (
    select count(*)::int as cnt
    from public.client_messages
    where sender = 'coach'
      and created_at >= v_week_start
      and created_at < v_week_start + interval '7 days'
  ),
  new_clients_tot as (
    select count(*)::int as cnt
    from public.clients
    where created_at >= v_week_start
      and created_at < v_week_start + interval '7 days'
  ),
  bilans_by_user as (
    select c.distributor_id as user_id, count(*)::int as bilans
    from public.assessments a
    join public.clients c on c.id = a.client_id
    where a.type = 'initial'
      and a.created_at >= v_week_start
      and a.created_at < v_week_start + interval '7 days'
    group by c.distributor_id
  ),
  messages_by_user as (
    select sender_id as user_id, count(*)::int as messages
    from public.client_messages
    where sender = 'coach'
      and sender_id is not null
      and created_at >= v_week_start
      and created_at < v_week_start + interval '7 days'
    group by sender_id
  ),
  top_b as (
    select coalesce(jsonb_agg(jsonb_build_object('name', u.name, 'count', bb.bilans) order by bb.bilans desc), '[]'::jsonb) as data
    from (
      select bb.user_id, bb.bilans
      from bilans_by_user bb
      order by bb.bilans desc
      limit 3
    ) bb
    join public.users u on u.id = bb.user_id
  ),
  top_m as (
    select coalesce(jsonb_agg(jsonb_build_object('name', u.name, 'count', mb.messages) order by mb.messages desc), '[]'::jsonb) as data
    from (
      select mb.user_id, mb.messages
      from messages_by_user mb
      order by mb.messages desc
      limit 3
    ) mb
    join public.users u on u.id = mb.user_id
  )
  select
    v_week_start,
    v_week_end,
    (select cnt from bilans_tot),
    (select cnt from messages_tot),
    (select cnt from new_clients_tot),
    (select data from top_b),
    (select data from top_m);
end;
$$;

revoke all on function public.get_last_week_recap() from public, anon;
grant execute on function public.get_last_week_recap() to authenticated;

comment on function public.get_last_week_recap is
  'Recap fige de la semaine ecoulee (lundi-dimanche dernier). Top 3 bilans + top 3 messages + totaux equipe. Pour partage groupes/Whatsapp.';

commit;
