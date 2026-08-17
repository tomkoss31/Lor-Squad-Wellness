-- =============================================================================
-- Cartes et visites : la portée devient le CLUB pour un admin
--
-- Suite de `20261215110000_users_club_id`. L'écran « Mes membres » montre
-- désormais les membres du club à un admin — mais deux fonctions serveur
-- continuaient de ne rendre que les lignes du coach connecté :
--
--   bbc_active_cards()  where c.coach_user_id = auth.uid()
--   bbc_visit_counts()  where coach_user_id  = auth.uid()
--
-- Thomas aurait donc vu Gwendoline (inscrite par Mélanie) SANS sa carte et
-- à zéro visite. Un membre affiché avec de faux compteurs est pire qu'un
-- membre absent : on ne sait pas qu'on lit une demi-vérité.
--
-- ⚠️ Ce n'est pas un élargissement de droits. La RLS de `clients` autorise
-- déjà un admin à lire les clients des autres (`clients select own or admin`),
-- et un coach NON admin garde exactement ce qu'il avait : ses propres lignes.
-- La portée est bornée par le club, pas ouverte à toute la base.
-- =============================================================================

-- Le club du coach connecté : celui qu'il possède, sinon celui où il travaille.
-- Isolée pour que les deux fonctions ne divergent jamais.
create or replace function public.bbc_mon_club()
returns uuid
language sql
stable
security definer
set search_path = public, extensions
as $$
  select coalesce(
    (select c.id from public.clubs c
      where c.owner_user_id = (select auth.uid()) and c.active
      order by c.created_at limit 1),
    (select u.club_id from public.users u where u.id = (select auth.uid()))
  );
$$;

grant execute on function public.bbc_mon_club() to authenticated;

-- ── Les cartes actives ──────────────────────────────────────────────────────
create or replace function public.bbc_active_cards()
returns table(client_id uuid, card_id uuid, card_type smallint, used bigint,
              expires_at timestamptz, expired boolean)
language sql
security definer
set search_path = public, extensions
as $$
  select c.client_id, c.id, c.card_type,
         (select count(*) from public.club_visits v where v.card_id = c.id) as used,
         c.expires_at,
         (c.expires_at is not null and c.expires_at <= now()) as expired
    from public.member_cards c
   where c.closed_at is null
     and (
       c.coach_user_id = (select auth.uid())
       or exists (
         select 1
           from public.clients cl
           join public.users u on u.id = (select auth.uid())
          where cl.id = c.client_id
            and u.role = 'admin'
            and cl.club_id is not null
            and cl.club_id = public.bbc_mon_club()
       )
     );
$$;

-- ── Le cumul de visites ─────────────────────────────────────────────────────
create or replace function public.bbc_visit_counts()
returns table(client_id uuid, cnt bigint)
language sql
security definer
set search_path = public, extensions
as $$
  select v.client_id, count(*) as cnt
    from public.club_visits v
   where v.coach_user_id = (select auth.uid())
      or exists (
        select 1
          from public.clients cl
          join public.users u on u.id = (select auth.uid())
         where cl.id = v.client_id
           and u.role = 'admin'
           and cl.club_id is not null
           and cl.club_id = public.bbc_mon_club()
      )
   group by v.client_id;
$$;
