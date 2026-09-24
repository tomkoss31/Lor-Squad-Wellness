-- =============================================================================
-- Le pont vers le bar : les XP d'une cliente SANS compte au bar l'attendent (24/09/2026).
--
-- Le mail d'invitation (maquette 6ehdsG5tjjnQkao4pTMERr, validée) promet « tes points
-- t'attendent ». Jusqu'ici, une semaine sans compte était notée `sans_compte` avec
-- 0 XP et n'était jamais rejouée : perdue. Désormais la ligne garde le montant
-- (XP coaching × 5) et `xp_a_verser_bar` la reprend, comme un bonus de niveau, tant
-- qu'elle a moins de 60 jours — toujours dans le plafond de 750 XP bar par mois.
-- `xp_bar_resume_membre` rend `en_attente` : ce qui l'attend si elle crée son compte
-- (les semaines gardées + la semaine en cours × 5, plafonné à 750).
-- =============================================================================

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
  -- Ce qui attend : les bonus de niveau, et les semaines gardées faute de compte (60 jours au plus).
  bonus as (
    select v.client_id, array_agg(v.id) as ids, sum(v.xp_bar)::int as xp
      from public.xp_versements_bar v
     where (v.statut = 'a_verser' and v.motif like 'niveau_%')
        or (v.statut = 'sans_compte' and v.xp_bar > 0 and v.cree_le > now() - interval '60 days')
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

create or replace function public.xp_bar_resume_membre(p_token text)
returns jsonb
language sql
stable
security definer
set search_path = public, extensions
as $$
  with moi as (select public._resolve_client_id_from_token(p_token) as cid),
  semaine as (
    select coalesce(sum(e.xp_amount), 0)::int as xp
      from public.client_xp_events e, moi
     where e.client_id = moi.cid
       and (e.created_at at time zone 'Europe/Paris')::date >= date_trunc('week', (now() at time zone 'Europe/Paris')::date)::date
  ),
  garde as (
    select coalesce(sum(v.xp_bar), 0)::int as xp
      from public.xp_versements_bar v, moi
     where v.client_id = moi.cid
       and ((v.statut = 'sans_compte' and v.cree_le > now() - interval '60 days')
            or (v.statut = 'a_verser' and v.motif like 'niveau_%'))
  )
  select jsonb_build_object(
    'dernier', (select jsonb_build_object('xp_bar', v.xp_bar, 'le', v.verse_le, 'motif', v.motif)
                  from public.xp_versements_bar v, moi where v.client_id = moi.cid and v.statut = 'verse'
                 order by v.verse_le desc limit 1),
    'ce_mois', (select coalesce(sum(v.xp_bar), 0) from public.xp_versements_bar v, moi
                 where v.client_id = moi.cid and v.statut = 'verse'
                   and date_trunc('month', v.verse_le at time zone 'Europe/Paris') = date_trunc('month', now() at time zone 'Europe/Paris')),
    'plafond', 750,
    'en_attente', least(750, (select xp from garde) + (select xp from semaine) * 5),
    'sans_compte', exists (select 1 from public.xp_versements_bar v, moi where v.client_id = moi.cid and v.statut = 'sans_compte' and v.cree_le > now() - interval '35 days')
  ) from moi where moi.cid is not null
$$;
