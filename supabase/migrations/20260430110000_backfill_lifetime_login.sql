-- =============================================================================
-- Backfill lifetime_login_count retroactif (2026-04-30)
--
-- Note Thomas : 'mes flammes streak existaient avant le push, mais lifetime
-- est a 0. Je voudrais que mon historique soit pris en compte (et celui des
-- distri aussi).'
--
-- Strategy : pour chaque user, lifetime = max de :
--   1. lifetime_login_count actuel (no-op si > 0)
--   2. streak_count actuel (au moins X jours consecutifs deja faits)
--   3. nombre de jours uniques ou il a fait une action significative
--      (assessments cree, follow_up cree, message envoye)
--
-- C'est une estimation lower-bound : on peut tracker plus en realite, mais
-- impossible de connaitre l'historique des connexions sans ouverture d'app.
-- =============================================================================

begin;

-- Pour chaque user, on agg le nombre de jours distincts d'activite
with activity_days as (
  -- Jours uniques ou un user a cree un assessment (via ses clients)
  select c.distributor_id as user_id, date(a.created_at) as d
  from public.assessments a
  join public.clients c on c.id = a.client_id
  where c.distributor_id is not null
  union
  -- Jours uniques ou un user a cree un follow_up (via ses clients)
  select c.distributor_id as user_id, date(f.created_at) as d
  from public.follow_ups f
  join public.clients c on c.id = f.client_id
  where c.distributor_id is not null
  union
  -- Jours uniques ou un user a envoye un message coach
  select m.sender_id as user_id, date(m.created_at) as d
  from public.client_messages m
  where m.sender = 'coach' and m.sender_id is not null
),
activity_count as (
  select user_id, count(distinct d)::int as days
  from activity_days
  where user_id is not null
  group by user_id
)
update public.users u
set lifetime_login_count = greatest(
  coalesce(u.lifetime_login_count, 0),
  coalesce(u.streak_count, 0),
  coalesce((select days from activity_count where user_id = u.id), 0)
)
where u.id in (select user_id from activity_count)
   or coalesce(u.streak_count, 0) > 0;

commit;
