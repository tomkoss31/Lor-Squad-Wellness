-- ⚠️ CORRIGÉE DANS LA FOULÉE PAR 20261211130000 — ne pas rejouer seule.
--    Le 4e test ajouté ici comparait le créneau COACH (30 min) à une capacité
--    pensée pour le créneau CLUB (60 min). Mesuré en simulation : le club
--    affichait 0/2 et la fonction répondait encore « libre ». La 130000 aligne
--    la fenêtre de comptage sur le pas du club. Le fichier est conservé tel
--    quel : le registre porte les deux versions, l'ordre garantit le résultat.
--
-- =============================================================================
-- Le compteur de places était à sens unique (2026-08-11)
--
-- LE CONSTAT, PROUVÉ EN BASE
--
-- Le 2026-08-11, Fatiha est CONFIRMÉE au Breakfast Club le 13 août à 9 h.
-- Capacité du créneau : 2 personnes. Le club affiche donc « 1 place ».
-- Et pourtant :
--
--   select public.is_coach_slot_free(<Mélanie>, '2026-08-13 09:00+02', '…09:30+02');
--   → true
--
-- La page /rdv proposait ce créneau comme s'il était vierge. Deux personnes de
-- plus pouvaient le prendre : la 2e via le club (qui aurait alors affiché
-- « Complet ») et la 3e via /rdv, qui ne regarde pas le club du tout.
--
-- POURQUOI
--
-- Le lot du 2026-08-11 (20261211090000) a rendu le CLUB complet : il compte les
-- réservations club ET les occupations des coachs. Mais il n'a rien changé du
-- côté COACH. Or `is_coach_slot_free` ne filtre que sur `coach_user_id`, et une
-- réservation club porte `coach_user_id = NULL` — les 3 en base aujourd'hui.
-- Le club voyait le coach ; le coach ne voyait pas le club.
--
-- CE QU'ON CHANGE
--
-- Un 4e test dans `is_coach_slot_free` : si le coach figure dans les
-- `discovery.coach_user_ids` d'un club actif, son créneau n'est libre que s'il
-- reste au moins une place sur le créneau club qui le chevauche.
--
-- On recompte comme le lot précédent — réservations club PLUS occupations de
-- TOUS les coachs du club — et pas seulement les réservations club. Sinon on
-- raterait le cas où c'est l'AUTRE coach qui occupe la dernière place : Mélanie
-- serait libre côté agenda, le club serait plein, et /rdv ouvrirait quand même.
--
-- Volontairement généreux, comme le lot précédent : tant qu'il reste une place,
-- le créneau reste ouvert. Ça ne ferme que ce qui est réellement complet.
--
-- Un coach hors club (13 des 15 distributeurs actifs) n'est pas concerné : le
-- test ne se déclenche que s'il est nommé dans `coach_user_ids`.
--
-- `is_coach_slot_free` sert AUSSI à `book_coach_rdv` : le correctif protège
-- donc l'écriture, pas seulement l'affichage.
--
-- Pas de récursion : `get_club_discovery_availability` a sa propre logique et
-- n'appelle pas cette fonction.
-- =============================================================================

create or replace function public.is_coach_slot_free(
  p_coach_user_id uuid,
  p_start timestamptz,
  p_end timestamptz
)
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $function$
  select
    -- ── 1. Un autre rendez-vous du coach ────────────────────────────────────
    not exists (
      select 1 from public.rdv_bookings b
      where b.coach_user_id = p_coach_user_id
        and b.status <> 'canceled'
        and b.slot_start < p_end
        and b.slot_end > p_start
    )
    -- ── 2. Un rendez-vous posé à la main dans l'agenda ──────────────────────
    and not exists (
      select 1 from public.prospects p
      where p.distributor_id = p_coach_user_id
        and p.status = 'scheduled'
        and p.rdv_date < p_end
        and p.rdv_date + make_interval(mins => coalesce(
              p.duration_min,
              (select coalesce(u.default_rdv_minutes, 45) from public.users u where u.id = p_coach_user_id),
              45)) > p_start
    )
    -- ── 3. Un suivi client ──────────────────────────────────────────────────
    and not exists (
      select 1
      from public.follow_ups f
      join public.clients c on c.id = f.client_id
      where c.distributor_id = p_coach_user_id
        and f.status in ('scheduled', 'pending')
        and coalesce(c.lifecycle_status, 'active') not in ('stopped', 'lost', 'paused')
        and coalesce(c.free_follow_up, false) = false
        and f.due_date < p_end
        and f.due_date + make_interval(mins => coalesce(
              f.duration_min,
              (select coalesce(u.default_rdv_minutes, 45) from public.users u where u.id = p_coach_user_id),
              45)) > p_start
    )
    -- ── 4. Le club est complet sur ce créneau (ajouté le 2026-08-11) ────────
    and not exists (
      select 1
      from public.clubs cl
      where cl.active
        and (cl.settings->'discovery'->'coach_user_ids') ? p_coach_user_id::text
        and (
          -- réservations du club, en PERSONNES (un couple prend 2 places)
          coalesce((
            select sum(coalesce(rb.people_count, 1))
            from public.rdv_bookings rb
            where rb.club_id = cl.id
              and rb.status <> 'canceled'
              and rb.slot_start < p_end
              and rb.slot_end > p_start
          ), 0)
          -- + tout ce qui occupe un coach du club sur le même créneau
          + coalesce((
            select sum(o.personnes)
            from (
              select coalesce(rb2.people_count, 1) as personnes
              from public.rdv_bookings rb2
              where rb2.club_id is null
                and rb2.status <> 'canceled'
                and (cl.settings->'discovery'->'coach_user_ids') ? rb2.coach_user_id::text
                and rb2.slot_start < p_end
                and rb2.slot_end > p_start
              union all
              select 1
              from public.follow_ups f2
              join public.clients c2 on c2.id = f2.client_id
              where (cl.settings->'discovery'->'coach_user_ids') ? c2.distributor_id::text
                and f2.status in ('scheduled', 'pending')
                and coalesce(c2.lifecycle_status, 'active') not in ('stopped', 'lost', 'paused')
                and coalesce(c2.free_follow_up, false) = false
                and f2.due_date < p_end
                and f2.due_date + make_interval(mins => coalesce(f2.duration_min, 60)) > p_start
              union all
              select 1
              from public.prospects p2
              where (cl.settings->'discovery'->'coach_user_ids') ? p2.distributor_id::text
                and p2.status = 'scheduled'
                and p2.rdv_date < p_end
                and p2.rdv_date + make_interval(mins => coalesce(p2.duration_min, 60)) > p_start
            ) o
          ), 0)
          >= coalesce((cl.settings->'discovery'->>'capacity')::int, 3)
        )
    );
$function$;

comment on function public.is_coach_slot_free(uuid, timestamptz, timestamptz) is
  'Créneau libre pour un coach : aucun rendez-vous, suivi ou prospect qui chevauche, ET — s''il tient un club — au moins une place restante sur le créneau du club. Sert à get_coach_availability_by_slug et à book_coach_rdv.';
