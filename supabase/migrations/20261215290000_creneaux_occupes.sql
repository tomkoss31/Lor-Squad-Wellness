-- =============================================================================
-- « Quand est-il pris ? » — sans jamais dire AVEC QUI (01/09/2026)
--
-- LA DEMANDE (Thomas) : « Maria veut caler des RDV avec Mélanie qui lui fait la
-- formation. Maria doit voir l'agenda et les dispos de Mélanie pour prendre les
-- RDV d'elle-même. » Et, dans la foulée : « les coachs voient bien les créneaux
-- libres, les créneaux avec RDV, mais PAS l'info du lead ! »
--
-- ── POURQUOI UNE FONCTION, ET PAS UN ÉLARGISSEMENT DE DROITS ───────────────
--
-- Mesuré le 01/09 en simulant le jeton de Maria (rôle « distributor ») :
--   utilisateurs lisibles ......... 1  (elle-même)
--   clients de Mélanie ............ 0
--   prospects de Mélanie .......... 0
--   rendez-vous de Mélanie ........ 0
-- Elle ne peut RIEN voir. Les policies en cause :
--   · `clients select own or admin` → is_admin() OR distributor_id = auth.uid()
--   · `prospects_coach_select`      → can_access_owner() = admin, soi, ou son
--                                     aval direct si l'on est référent
--   · `rdv_bookings_coach_read`     → coach_user_id = auth.uid()
--
-- On aurait pu élargir ces policies. Ce serait une FAUTE : ces tables portent
-- des noms, des motifs de rendez-vous, des objectifs de perte de poids — des
-- données de santé. Ouvrir l'agenda ne doit pas ouvrir les dossiers.
--
-- Cette fonction ne renvoie donc QUE des couples [début, fin]. Pas d'identifiant,
-- pas de nom, pas de motif, pas même le TYPE du rendez-vous : un créneau occupé
-- ne dit pas s'il s'agit d'un bilan, d'un suivi ou d'un appel du club. C'est
-- exactement ce qu'il faut pour proposer des créneaux, et rien de plus.
--
-- ⚠️ CE QU'ELLE DIVULGUE QUAND MÊME, ET C'EST ASSUMÉ : le rythme de travail
-- d'un collègue (« elle est prise tous les mardis matin »). C'est le prix d'un
-- agenda partagé, et c'est ce que fait n'importe quel agenda d'entreprise.
-- Ce qui ne sort pas, c'est l'identité des personnes reçues.
--
-- ── QUI PEUT L'APPELER ──────────────────────────────────────────────────────
-- Un utilisateur ACTIF, sur un autre utilisateur ACTIF. Pas plus restrictif :
-- Maria est distributrice et doit pouvoir interroger Mélanie, qui est son
-- amont — aucune relation hiérarchique ne décrit ce besoin. Pas moins non plus :
-- un compte désactivé ne sonde plus personne.
-- =============================================================================

create or replace function public.creneaux_occupes(
  p_coach uuid,
  p_du timestamptz,
  p_au timestamptz
)
returns table (debut timestamptz, fin timestamptz)
language plpgsql
stable
security definer
set search_path = public, extensions
as $$
declare
  -- Durée retenue quand le rendez-vous n'en porte pas. 60 min : c'est le pas de
  -- créneau du club (`discovery.slot_step_min`). Mieux vaut réserver un peu
  -- trop qu'afficher libre un moment qui ne l'est pas.
  v_defaut constant int := 60;
begin
  if p_coach is null or p_du is null or p_au is null then
    return;
  end if;

  -- Garde-fou de fenêtre : sans lui, un appel sur dix ans balaierait toute la
  -- base à chaque ouverture d'écran.
  if p_au <= p_du or p_au > p_du + interval '90 days' then
    raise exception 'fenetre invalide (90 jours maximum)';
  end if;

  if not public.is_active_user() then
    raise exception 'access denied';
  end if;

  if not exists (
    select 1 from public.users u where u.id = p_coach and coalesce(u.active, true)
  ) then
    return;
  end if;

  return query
  -- 1. Les suivis clients.
  select f.due_date,
         f.due_date + make_interval(mins => coalesce(f.duration_min, v_defaut))
    from public.follow_ups f
    join public.clients c on c.id = f.client_id
   where c.distributor_id = p_coach
     and f.status in ('scheduled', 'pending')
     and f.due_date >= p_du and f.due_date < p_au

  union all
  -- 2. Les rendez-vous prospects (bilans).
  select p.rdv_date,
         p.rdv_date + make_interval(mins => coalesce(p.duration_min, v_defaut))
    from public.prospects p
   where p.distributor_id = p_coach
     and coalesce(p.status, '') not in ('lost', 'no_show', 'cancelled', 'cold')
     and p.rdv_date >= p_du and p.rdv_date < p_au

  union all
  -- 3. Les réservations (club et tunnels publics). Elles portent leur fin.
  select b.slot_start, coalesce(b.slot_end, b.slot_start + make_interval(mins => v_defaut))
    from public.rdv_bookings b
   where b.coach_user_id = p_coach
     and b.status <> 'canceled'
     and b.slot_start >= p_du and b.slot_start < p_au

  union all
  -- 4. Les rituels du club. Ils occupent le coach autant que le reste — c'est
  --    déjà la règle appliquée par `get_club_discovery_availability`.
  select r.scheduled_at, r.scheduled_at + make_interval(mins => v_defaut)
    from public.club_call_registrations r
   where r.coach_user_id = p_coach
     and r.scheduled_at >= p_du and r.scheduled_at < p_au

  order by 1;
end;
$$;

comment on function public.creneaux_occupes(uuid, timestamptz, timestamptz) is
  'Les plages où ce coach est pris, entre deux dates. Ne renvoie QUE des couples [début, fin] : aucun nom, aucun motif, aucun identifiant, pas même le type du rendez-vous. Permet de proposer des créneaux à un collègue sans lui ouvrir les dossiers. Fenêtre bornée à 90 jours.';

-- `security definer` sans droits ouverts (règle 5 de l'audit du 29/07).
revoke all on function public.creneaux_occupes(uuid, timestamptz, timestamptz) from public;
grant execute on function public.creneaux_occupes(uuid, timestamptz, timestamptz) to authenticated;

-- ── Qui peut recevoir un rendez-vous d'un collègue ───────────────────────────
-- La liste des coachs joignables, avec leur PRÉNOM seulement. Elle existe parce
-- que `users` n'est pas lisible par un distributeur (mesuré : 1 ligne, la
-- sienne) : sans elle, l'écran de prise de rendez-vous serait vide.
create or replace function public.coachs_joignables()
returns table (id uuid, prenom text)
language sql
stable
security definer
set search_path = public, extensions
as $$
  select u.id,
         -- Le prénom, jamais l'adresse ni le téléphone : on répond à « avec
         -- qui ? », pas à « comment le joindre en dehors de l'app ? ».
         coalesce(nullif(split_part(coalesce(u.name, ''), ' ', 1), ''), 'Coach')
    from public.users u
   where coalesce(u.active, true)
     and u.role in ('admin', 'referent', 'distributor')
     and u.id <> (select auth.uid())
     and public.is_active_user()
   order by 2;
$$;

comment on function public.coachs_joignables() is
  'Les coachs actifs à qui l''on peut proposer un rendez-vous. Rend l''identifiant et le PRÉNOM, rien d''autre — `users` n''est pas lisible par un distributeur, et il n''a pas à le devenir pour caler un créneau.';

revoke all on function public.coachs_joignables() from public;
grant execute on function public.coachs_joignables() to authenticated;
