-- =============================================================================
-- L'agenda du club rend les MÊMES coordonnées que le CRM (22/09/2026).
--
-- Thomas : « Mélanie avait RDV à 9 h, le RDV n'est pas venu, mais sur son app BBC,
-- sur l'agenda, elle ne voit pas son numéro pour l'appeler et doit retourner vers
-- le CRM sur la version standard ; il faut standardiser… voir les bonnes valeurs
-- partout ».
--
-- La cause : une réservation du site n'a qu'UN champ libre, `rdv_bookings.contact`,
-- et Sandrine y avait mis son MAIL. L'agenda le rendait comme « téléphone » → pas
-- de bouton Appeler (« Pas de téléphone sur ce rendez-vous »). Son numéro était
-- pourtant dans sa fiche du CRM (`prospect_leads`) — c'est même lui qui a reçu le
-- SMS de rappel de la veille.
--
-- Désormais `agenda_du_club` rend le téléphone ET le mail (nouvelle colonne `email`,
-- en dernier) :
--   • réservation : chacun à sa place depuis `contact` (mail ou numéro), et ce qui
--     manque depuis la fiche du CRM au même mail (ou au même numéro, 9 derniers
--     chiffres) ;
--   • rendez-vous de l'agenda (`prospects`) : phone + email ;
--   • suivi d'une cliente : phone + email de sa fiche.
-- Le changement de colonnes impose drop + create (même transaction). Aucune autre
-- fonction ne l'appelle ; le front lit les colonnes par leur nom. Réservée aux
-- comptes connectés : elle rend maintenant des numéros (anon n'en recevait rien).
-- =============================================================================

drop function if exists public.agenda_du_club(timestamptz, timestamptz);

create function public.agenda_du_club(du timestamptz, au timestamptz)
returns table (source text, id uuid, coach_user_id uuid, debut timestamptz, fin timestamptz, prenom text, nom text,
               telephone text, statut text, nature text, client_id uuid, email text)
language sql stable security definer set search_path = public, extensions as $$
  with fenetre as (
    select du as d, au as a where au > du and au - du <= interval '92 days'
  ),
  coachs as (select c.id from public.coachs_du_club() c)
  select 'prospect'::text, p.id, p.distributor_id,
         p.rdv_date,
         p.rdv_date + make_interval(mins => coalesce(p.duration_min, 60)),
         p.first_name, p.last_name, p.phone,
         p.status, 'bilan'::text, null::uuid,
         nullif(btrim(p.email), '')
    from public.prospects p, fenetre f
   where p.rdv_date >= f.d and p.rdv_date < f.a
     and p.distributor_id in (select id from coachs)
     and p.status is distinct from 'cancelled'
  union all
  select 'reservation', b.id, b.coach_user_id,
         b.slot_start, b.slot_end,
         b.first_name, b.last_name,
         coalesce(case when b.contact !~ '@' then nullif(btrim(b.contact), '') end, nullif(btrim(l.phone), '')),
         b.status, coalesce(b.booking_type, 'decouverte'), null::uuid,
         coalesce(case when b.contact ~ '@' then lower(btrim(b.contact)) end, nullif(btrim(l.email), ''))
    from public.rdv_bookings b
    left join lateral (
      select pl.phone, pl.email
        from public.prospect_leads pl
       where (b.contact ~ '@' and lower(btrim(pl.email)) = lower(btrim(b.contact)))
          or (b.contact !~ '@'
              and length(regexp_replace(coalesce(b.contact, ''), '\D', '', 'g')) >= 9
              and right(regexp_replace(coalesce(pl.phone, ''), '\D', '', 'g'), 9) = right(regexp_replace(b.contact, '\D', '', 'g'), 9))
       order by pl.created_at desc
       limit 1
    ) l on true,
    fenetre f
   where b.slot_start >= f.d and b.slot_start < f.a
     and (b.club_id = public.bbc_mon_club() or b.coach_user_id in (select id from coachs))
     and b.status is distinct from 'canceled'
  union all
  select 'suivi', s.id, c.distributor_id,
         s.due_date,
         s.due_date + make_interval(mins => coalesce(s.duration_min, 30)),
         c.first_name, c.last_name, c.phone,
         s.status, coalesce(s.type, 'suivi'), s.client_id,
         nullif(btrim(c.email), '')
    from public.follow_ups s
    join public.clients c on c.id = s.client_id, fenetre f
   where s.due_date >= f.d and s.due_date < f.a
     and c.distributor_id in (select id from coachs)
     and s.status = 'scheduled'
  union all
  select 'indispo', i.id, i.user_id,
         i.starts_at, i.ends_at,
         'Pas dispo'::text, nullif(btrim(coalesce(i.note, '')), ''), null::text,
         'indispo'::text, 'indispo'::text, null::uuid, null::text
    from public.coach_unavailabilities i, fenetre f
   where i.starts_at >= f.d and i.starts_at < f.a
     and i.user_id in (select id from coachs)
  order by 4;
$$;

revoke all on function public.agenda_du_club(timestamptz, timestamptz) from public, anon;
grant execute on function public.agenda_du_club(timestamptz, timestamptz) to authenticated, service_role;
