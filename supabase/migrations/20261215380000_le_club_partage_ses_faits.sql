-- =============================================================================
-- Les faits du comptoir appartiennent au CLUB, pas a celui qui a tenu la
-- tablette.
--
-- LE TEST QUI L'A TROUVE (Thomas, 08/09, avec Romane) : « elle voit bien ses 3,
-- mais les visites ne sont pas visibles, c'est inscrit 0 pour ses deux
-- membres ». Mesure : Audrey et Anais ont chacune 1 visite et une carte de 10 —
-- toutes posees par THOMAS le jour de l'ouverture. Romane, qui les suit
-- desormais, voyait 0 visite et AUCUNE carte.
--
-- LA CAUSE, ET ELLE EST DE MOI. L'elargissement ecrit le 07/09 exigeait le role
-- ADMIN :
--     v.coach_user_id = auth.uid()
--     OR (u.role = 'admin' AND cl.club_id = bbc_mon_club())
-- Romane est `distributor`. Aucune des deux branches ne mordait.
--
-- LA REGLE CORRIGEE : une visite, une carte, une inscription a un rituel
-- appartiennent au MEMBRE. Quiconque travaille dans le club les voit — c'est
-- deja la regle de l'ecran « Les visites », ou celui qui tient la tablette
-- pointe les gens des autres coachs. Le role admin disparait donc de la
-- condition, et le join sur `users` avec lui : `bbc_mon_club()` suffit, il
-- renvoie deja le club possede OU celui ou l'on travaille.
--
-- CE QUI RESTE RESERVE. Les COEURS ne deviennent PAS lisibles par tout le
-- club : c'est de la gestion, pas un fait du comptoir. On y ajoute seulement
-- « les coeurs de MES membres », pour qu'un coach voie les recommandations de
-- ses personnes meme si un autre les a saisies — le cas exact d'Audrey, dont le
-- coeur pour Anais avait ete tape par Thomas.
--
-- CE QUI N'EST PAS TOUCHE : `club_visits_own` (l'ecriture reste au coach qui
-- pointe) et la liste des membres (`limiterAuxMiens` : un coach voit les
-- siens). Romane voit 3 membres, et les faits du club sur ces 3 membres.
-- =============================================================================

create or replace function public.bbc_visit_counts()
 returns table(client_id uuid, cnt bigint)
 language sql
 security definer
 set search_path to 'public', 'extensions'
as $function$
  select v.client_id, count(*) as cnt
    from public.club_visits v
   where v.coach_user_id = (select auth.uid())
      or exists (
        select 1 from public.clients cl
         where cl.id = v.client_id
           and cl.club_id is not null
           and cl.club_id = public.bbc_mon_club()
      )
   group by v.client_id;
$function$;

comment on function public.bbc_visit_counts is
  'Cumul de visites par membre, pour QUICONQUE travaille dans le club. Elargi le 08/09 : la condition exigeait le role admin, donc Romane voyait 0 visite sur Audrey et Anais, pointees par Thomas. Une visite appartient au MEMBRE, pas a celui qui a tenu la tablette.';

create or replace function public.bbc_visits_today()
 returns table(client_id uuid)
 language sql
 stable security definer
 set search_path to 'public', 'extensions'
as $function$
  select distinct v.client_id
    from public.club_visits v
   where v.visited_at >= date_trunc('day', now() at time zone 'Europe/Paris') at time zone 'Europe/Paris'
     and (
       v.coach_user_id = (select auth.uid())
       or exists (
         select 1 from public.clients cl
          where cl.id = v.client_id
            and cl.club_id is not null
            and cl.club_id = public.bbc_mon_club()
       )
     );
$function$;

create or replace function public.bbc_active_cards()
 returns table(client_id uuid, card_id uuid, card_type smallint, used bigint, expires_at timestamp with time zone, expired boolean)
 language sql
 security definer
 set search_path to 'public', 'extensions'
as $function$
  select c.client_id, c.id, c.card_type,
         (select count(*) from public.club_visits v where v.card_id = c.id) as used,
         c.expires_at,
         (c.expires_at is not null and c.expires_at <= now()) as expired
    from public.member_cards c
   where c.closed_at is null
     and (
       c.coach_user_id = (select auth.uid())
       or exists (
         select 1 from public.clients cl
          where cl.id = c.client_id
            and cl.club_id is not null
            and cl.club_id = public.bbc_mon_club()
       )
     );
$function$;

comment on function public.bbc_active_cards is
  'Carte active d''un membre, pour QUICONQUE travaille dans le club. Elargi le 08/09 avec bbc_visit_counts : la carte d''Audrey, creee par Thomas, etait invisible pour Romane qui la suit.';

drop policy if exists club_visits_club_admin_read on public.club_visits;
create policy club_visits_club_read on public.club_visits
  for select
  using (
    coach_user_id = (select auth.uid())
    or exists (
      select 1 from public.clients cl
       where cl.id = club_visits.client_id
         and cl.club_id is not null
         and cl.club_id = public.bbc_mon_club()
    )
  );

drop policy if exists club_call_reg_club on public.club_call_registrations;
create policy club_call_reg_club on public.club_call_registrations
  for all
  using (
    coach_user_id = (select auth.uid())
    or exists (
      select 1 from public.clients cl
       where cl.id = club_call_registrations.client_id
         and cl.club_id is not null
         and cl.club_id = public.bbc_mon_club()
    )
  )
  with check (
    coach_user_id = (select auth.uid())
    or exists (
      select 1 from public.clients cl
       where cl.id = club_call_registrations.client_id
         and cl.club_id is not null
         and cl.club_id = public.bbc_mon_club()
    )
  );

drop policy if exists referral_coach_read on public.client_referrals;
create policy referral_coach_read on public.client_referrals
  for select
  using (
    (select auth.uid())::text = coach_id
    or exists (
      select 1 from public.clients cl
       where cl.id::text = client_referrals.from_client_id
         and cl.distributor_id = (select auth.uid())
    )
    or exists (
      select 1
        from public.clients cl
        join public.users u on u.id = (select auth.uid())
       where cl.id::text = client_referrals.from_client_id
         and u.role = 'admin'
         and cl.club_id is not null
         and cl.club_id = public.bbc_mon_club()
    )
  );

drop policy if exists referral_coach_update on public.client_referrals;
create policy referral_coach_update on public.client_referrals
  for update
  using (
    (select auth.uid())::text = coach_id
    or exists (
      select 1 from public.clients cl
       where cl.id::text = client_referrals.from_client_id
         and cl.distributor_id = (select auth.uid())
    )
    or exists (
      select 1
        from public.clients cl
        join public.users u on u.id = (select auth.uid())
       where cl.id::text = client_referrals.from_client_id
         and u.role = 'admin'
         and cl.club_id is not null
         and cl.club_id = public.bbc_mon_club()
    )
  );
