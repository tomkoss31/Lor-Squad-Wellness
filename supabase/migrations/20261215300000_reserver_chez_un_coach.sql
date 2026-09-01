-- =============================================================================
-- Poser un rendez-vous dans l'agenda d'un COLLÈGUE — et bloquer le créneau
--
-- LA DEMANDE (Thomas, 01/09) : « Maria veut caler des RDV avec Mélanie qui lui
-- fait la formation. Maria doit voir l'agenda et les dispos de Mélanie pour
-- prendre les RDV d'elle-même. Et la prise de RDV doit aussi bloquer la prise
-- de RDV en automatique sur l'agenda. »
--
-- ── POURQUOI UNE FONCTION ───────────────────────────────────────────────────
-- `prospects_coach_insert` exige `can_access_owner(distributor_id)` = admin,
-- soi-même, ou son aval direct si l'on est référent. Maria est distributrice :
-- elle ne peut écrire QUE chez elle. Élargir cette policy ouvrirait aussi la
-- lecture et la modification de toute la table — bien au-delà du besoin.
--
-- ── LE BLOCAGE, ENFIN RÉEL ──────────────────────────────────────────────────
-- Le contrôle de collision existant (`checkAgendaConflict`, côté navigateur)
-- est un simple `confirm()` qu'on peut ignorer, il ne regarde QUE son propre
-- agenda, et il est aveugle aux réservations du club. Ici, la vérification est
-- SERVEUR et refuse : entre le moment où l'écran dessine les créneaux et celui
-- où l'on tape « Réserver », quelqu'un a pu prendre la place — c'est
-- exactement la situation qu'on crée en ouvrant l'agenda à plusieurs.
--
-- Le verrou consultatif porte sur le COACH VISÉ : deux personnes qui réservent
-- au même instant chez Mélanie sont sérialisées, sans bloquer le reste de
-- l'app. Même motif que `book_club_discovery`.
--
-- ── POURQUOI LA TABLE `prospects` ET PAS UNE NOUVELLE ───────────────────────
-- Un rendez-vous interne n'est pas un prospect, et c'est un abus de vocabulaire
-- assumé. La contrepartie serait pire : une table de plus, à recâbler dans la
-- liste, la semaine, le mois, la semaine BBC et la RPC de disponibilité — donc
-- une SIXIÈME source de rendez-vous dans une app qui souffre déjà d'avoir la
-- même donnée à plusieurs endroits. En réutilisant `prospects`, le rendez-vous
-- apparaît partout, tout de suite, et bloque le créneau partout, y compris pour
-- le tunnel public du club (`get_club_discovery_availability` lit cette table).
-- Il se reconnaît à `source_detail`.
-- =============================================================================

create or replace function public.reserver_chez_un_coach(
  p_coach uuid,
  p_debut timestamptz,
  p_duree_min int default 60,
  p_motif text default null
)
returns uuid
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_moi        uuid := (select auth.uid());
  v_fin        timestamptz;
  v_prenom     text;
  v_occupe     boolean;
  v_id         uuid;
begin
  if v_moi is null or not public.is_active_user() then
    raise exception 'access denied';
  end if;
  if p_coach is null or p_debut is null then
    raise exception 'coach et creneau obligatoires';
  end if;
  if p_duree_min < 5 or p_duree_min > 480 then
    raise exception 'duree invalide';
  end if;
  -- On ne réserve pas dans le passé, et pas au-delà de l'horizon de lecture.
  if p_debut <= now() or p_debut > now() + interval '90 days' then
    raise exception 'creneau hors fenetre';
  end if;
  if not exists (
    select 1 from public.users u where u.id = p_coach and coalesce(u.active, true)
  ) then
    raise exception 'coach inconnu';
  end if;

  v_fin := p_debut + make_interval(mins => p_duree_min);

  -- Sérialise les réservations VISANT CE COACH. Deux demandes simultanées sur
  -- le même créneau ne peuvent plus passer toutes les deux.
  perform pg_advisory_xact_lock(hashtextextended(p_coach::text, 0));

  -- LA VÉRIFICATION QUI BLOQUE. Mêmes sources que `creneaux_occupes` — si les
  -- deux divergeaient, l'écran proposerait des créneaux que le serveur refuse.
  -- Bornes ouvertes à droite : un RDV 14 h–15 h ne bloque pas 15 h.
  select exists (
    select 1
      from public.creneaux_occupes(p_coach, p_debut - interval '1 day', v_fin + interval '1 day') o
     where o.debut < v_fin and p_debut < o.fin
  ) into v_occupe;

  if v_occupe then
    raise exception 'creneau deja pris';
  end if;

  select coalesce(nullif(split_part(coalesce(u.name, ''), ' ', 1), ''), 'Un coach')
    into v_prenom
    from public.users u where u.id = v_moi;

  insert into public.prospects (
    first_name, rdv_date, duration_min, distributor_id, status, source, source_detail, note
  )
  values (
    v_prenom,
    p_debut,
    p_duree_min,
    p_coach,
    'scheduled',
    -- « Autre » est déjà une valeur en usage : on n'invente pas un vocabulaire
    -- que le CRM ne saurait pas afficher.
    'Autre',
    'Rendez-vous interne · demandé par ' || v_prenom,
    nullif(btrim(coalesce(p_motif, '')), '')
  )
  returning id into v_id;

  return v_id;
end;
$$;

comment on function public.reserver_chez_un_coach(uuid, timestamptz, int, text) is
  'Pose un rendez-vous dans l''agenda d''un autre coach. Revérifie SERVEUR que le créneau est libre (mêmes sources que creneaux_occupes) sous verrou consultatif : deux demandes simultanées ne peuvent pas passer toutes les deux. Lève « creneau deja pris » sinon. Écrit dans `prospects` — voir l''en-tête de la migration pour ce choix.';

revoke all on function public.reserver_chez_un_coach(uuid, timestamptz, int, text) from public;
grant execute on function public.reserver_chez_un_coach(uuid, timestamptz, int, text) to authenticated;
