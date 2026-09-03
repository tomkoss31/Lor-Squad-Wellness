-- =============================================================================
-- Une journée fermée doit REFUSER, pas seulement disparaître de l'écran.
--
-- ── LE TROU (mesuré le 03/09) ───────────────────────────────────────────────
-- Trois fonctions décident du tunnel de réservation du club. UNE SEULE lit les
-- horaires :
--
--   get_club_discovery_availability  → lit hours, hours_by_date, holidays  ✅
--   book_club_discovery              → ne lit RIEN de tout ça              ❌
--   is_club_discovery_slot_free      → ne lit RIEN de tout ça              ❌
--
-- `book_club_discovery` ne vérifiait que deux choses : le délai de préavis
-- (`club_slot_bookable`) et la capacité. Autrement dit, fermer une journée
-- retirait le créneau de l'AFFICHAGE, mais le serveur continuait de l'accepter.
-- Une page restée ouverte, un retour arrière, un lien partagé — et quelqu'un se
-- présente devant un club fermé. Thomas a fermé l'agenda pour de vrai
-- aujourd'hui : c'est exactement le jour où ce trou se paie.
--
-- ── LE CORRECTIF : UNE SEULE SOURCE, PAS DEUX ───────────────────────────────
-- On ne réécrit PAS la règle des horaires dans la fonction d'écriture. Deux
-- copies d'une même règle divergent toujours — et divergeraient précisément
-- ici, où l'une dit « ce créneau n'existe pas » et l'autre « c'est enregistré ».
-- On demande donc à la fonction qui fait autorité si ce créneau précis est
-- proposé, et on refuse sinon. Elle couvre d'un coup : jours fériés, journées
-- fermées, horaires de la semaine, horaires exceptionnels par date, capacité,
-- ET les créneaux mangés par les rendez-vous déjà posés dans les agendas des
-- coachs du club.
--
-- ── LE VÉRIFIER APRÈS LE VERROU, PAS AVANT ──────────────────────────────────
-- `remaining` compte les places restantes. Le lire hors du verrou laisserait
-- deux demandes simultanées passer toutes les deux sur la dernière place. Le
-- contrôle de capacité d'origine est conservé en plus : il ne coûte rien et
-- reste vrai si la fonction d'affichage change un jour de forme.
--
-- Aucun changement de signature : le front et l'edge appellent la même chose.
-- =============================================================================

create or replace function public.book_club_discovery(
  p_club_id uuid,
  p_slot_start timestamptz,
  p_slot_end timestamptz,
  p_first_name text,
  p_contact text,
  p_people_count integer,
  p_partner text,
  p_objectif text
)
returns uuid
language plpgsql
security definer
set search_path = public, extensions
as $function$
declare
  v_cap int;
  v_cnt int;
  v_id  uuid;
  v_slug text;
  v_jours int;
begin
  -- Délai de réservation (lundi = avant vendredi 12h, sinon 4 h de préavis).
  -- Vérifié AVANT le verrou : inutile de sérialiser des demandes déjà refusées.
  if not public.club_slot_bookable(p_slot_start) then
    return null;
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_club_id::text || '|' || p_slot_start::text, 0));

  select slug, coalesce((settings->'discovery'->>'capacity')::int, 3)
    into v_slug, v_cap
    from public.clubs where id = p_club_id and active;
  if v_slug is null or v_cap is null then
    return null;
  end if;

  -- ── LE CRÉNEAU EST-IL RÉELLEMENT PROPOSÉ ? ────────────────────────────────
  -- Fenêtre juste assez large pour contenir la date demandée : la fonction
  -- d'affichage part d'aujourd'hui (ou de l'ouverture du club) et déroule les
  -- jours un par un. Une demande trop lointaine est refusée sans calculer.
  v_jours := ((p_slot_start at time zone 'Europe/Paris')::date - current_date) + 1;
  if v_jours < 0 or v_jours > 400 then
    return null;
  end if;

  if not exists (
    select 1
      from public.get_club_discovery_availability(v_slug, greatest(v_jours, 1)) a
     where a.slot_start = p_slot_start
       and a.remaining > 0
  ) then
    return null;
  end if;

  select count(*) into v_cnt
    from public.rdv_bookings
   where club_id = p_club_id and status <> 'canceled' and slot_start = p_slot_start;

  if v_cnt >= v_cap then
    return null;
  end if;

  insert into public.rdv_bookings(
    coach_user_id, coach_slug, club_id, first_name, contact, mode,
    slot_start, slot_end, status, people_count, partner_first_name, objectif
  ) values (
    null, null, p_club_id, p_first_name, nullif(p_contact,''), 'presentiel',
    p_slot_start, p_slot_end, 'requested',
    least(greatest(coalesce(p_people_count,1),1),2)::smallint, nullif(p_partner,''), nullif(p_objectif,'')
  )
  returning id into v_id;

  return v_id;
end $function$;

comment on function public.book_club_discovery(uuid, timestamptz, timestamptz, text, text, integer, text, text) is
  'Réserve un créneau découverte. Depuis le 03/09, REFUSE un créneau qui n''est pas réellement proposé : la fonction demande à get_club_discovery_availability (la seule qui fasse autorité sur les horaires) au lieu de recopier la règle. Couvre fériés, journées fermées, horaires de la semaine, horaires exceptionnels par date, capacité, et créneaux occupés par les agendas des coachs.';
