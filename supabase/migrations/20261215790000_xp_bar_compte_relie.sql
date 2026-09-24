-- =============================================================================
-- Le pont vers le bar : relier un compte à la main (24/09/2026).
--
-- Le rapprochement se fait par e-mail. Premier dry_run : Virgile et Océane ont
-- bien un compte au bar, mais sous une AUTRE adresse que celle de leur fiche
-- coaching (vi…@gmail.com vs famibelle.virgile971@…). Le prénom ne suffit pas
-- (trois Océane au bar). D'où `clients.bar_user_id` : l'identifiant de son
-- compte au bar, posé une fois ; l'edge `xp-vers-le-bar` le lit d'abord, puis
-- retombe sur l'e-mail. Renseigné à la main (SQL) pour l'instant.
-- =============================================================================

alter table public.clients add column if not exists bar_user_id uuid;
comment on column public.clients.bar_user_id is
  'Son compte au Shake Bar (profiles.id du projet Shakes&drinks) quand l''e-mail ne suffit pas à le retrouver. Lu par xp-vers-le-bar avant l''e-mail.';

-- Une colonne de plus en sortie : Postgres exige de la recréer.
drop function if exists public.xp_a_verser_bar(date);
create or replace function public.xp_a_verser_bar(p_lundi date default null)
returns table (
  client_id     text,
  email         text,
  prenom        text,
  semaine       date,
  xp_coaching   integer,
  bonus_ids     uuid[],
  bonus_xp      integer,
  deja_ce_mois  integer,
  a_verser      integer,
  bar_user_id   uuid
)
language sql
stable
security definer
set search_path = public, extensions
as $$
  with params as (
    select coalesce(p_lundi, date_trunc('week', (now() at time zone 'Europe/Paris')::date - 7)::date) as lundi
  ),
  gains as (
    select e.client_id, sum(e.xp_amount)::int as xp
      from public.client_xp_events e, params p
     where (e.created_at at time zone 'Europe/Paris')::date between p.lundi and p.lundi + 6
     group by e.client_id
  ),
  bonus as (
    select v.client_id, array_agg(v.id) as ids, sum(v.xp_bar)::int as xp
      from public.xp_versements_bar v
     where v.statut = 'a_verser' and v.motif like 'niveau_%'
     group by v.client_id
  ),
  deja as (
    select v.client_id, sum(v.xp_bar)::int as xp
      from public.xp_versements_bar v
     where v.statut = 'verse'
       and date_trunc('month', v.verse_le at time zone 'Europe/Paris') = date_trunc('month', now() at time zone 'Europe/Paris')
     group by v.client_id
  ),
  tout as (
    select coalesce(g.client_id, b.client_id) as client_id,
           coalesce(g.xp, 0) as xp, b.ids, coalesce(b.xp, 0) as bxp
      from gains g full join bonus b on b.client_id = g.client_id
  )
  select t.client_id, c.email, c.first_name, p.lundi, t.xp, t.ids, t.bxp,
         coalesce(d.xp, 0),
         greatest(0, least(t.xp * 5 + t.bxp, 750 - coalesce(d.xp, 0))),
         c.bar_user_id
    from tout t
    cross join params p
    join public.clients c on c.id::text = t.client_id
    left join deja d on d.client_id = t.client_id
   where not exists (select 1 from public.xp_versements_bar v where v.client_id = t.client_id and v.motif = 'semaine' and v.semaine = p.lundi)
     and (t.xp > 0 or t.bxp > 0)
$$;
revoke all on function public.xp_a_verser_bar(date) from anon, authenticated;

-- Les deux comptes retrouvés au bar le 24/09 (dry_run) — ids des profils du bar.
update public.clients set bar_user_id = '27fcdadf-9ed8-497b-a783-69a5c8dfe4d6'
 where first_name = 'Virgile' and email = 'famibelle.virgile971@gmail.com' and bar_user_id is null;
update public.clients set bar_user_id = '18b62e53-c0c5-499e-9e7a-ab2fc69426d4'
 where first_name = 'Océane' and email = 'ayco.lovecat@gmail.com' and bar_user_id is null;
