-- =============================================================================
-- Le créneau coach se juge contre le créneau CLUB qui le contient (2026-08-11)
--
-- Correction de 20261211120000, écrite quelques minutes plus tôt le même jour.
--
-- CE QUI N'ALLAIT PAS
--
-- Le 4e test comparait le créneau COACH (30 min) à une capacité pensée pour le
-- créneau CLUB (60 min à Verdun). Mesuré en simulation, jeudi 13/08 à 11 h :
--
--   places club : 0/2        →  is_coach_slot_free(Mélanie, 11:00–11:30) : true
--
-- L'occupation qui remplissait l'heure — un suivi à 11 h 30 — ne chevauchait pas
-- la fenêtre 11 h 00 – 11 h 30 que je testais. Pire : les deux demi-heures de
-- 11 h auraient chacune vu « une place libre » pour la même et unique place.
--
-- CE QU'ON CHANGE
--
-- On borne la fenêtre de comptage sur `slot_step_min`, en heure de Paris : un
-- créneau coach est jugé contre l'heure de club qui le contient. C'est la même
-- unité que celle qu'un membre voit sur la page du Breakfast Club — les deux
-- côtés parlent enfin de la même chose.
--
-- VÉRIFIÉ, simulation dans une transaction annulée (aucune ligne laissée) :
--   club 0/2  →  11 h 00 fermé, 11 h 30 fermé, 13 h 00 (club non plein) ouvert.
--
-- Effet réel mesuré ce jour-là : Mélanie passe de 76 à 73 créneaux sur 14 jours,
-- soit exactement les demi-heures des deux créneaux club affichés « Complet ».
-- Coût : 217 ms pour 14 jours (73 créneaux). Acceptable pour une page publique
-- consultée ponctuellement — à re-mesurer si la capacité ou le trafic montent.
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
    -- ── 4. Le club qui contient ce moment est-il complet ? ──────────────────
    and not exists (
      select 1
      from public.clubs cl
      cross join lateral (
        -- La fenêtre du club qui CONTIENT p_start, bornée sur son pas.
        select
          d.debut,
          d.debut + make_interval(mins => coalesce((cl.settings->'discovery'->>'slot_step_min')::int, 30)) as fin
        from (
          select (
            date_trunc('hour', p_start at time zone 'Europe/Paris')
            + make_interval(mins => (
                floor(
                  extract(minute from p_start at time zone 'Europe/Paris')
                  / coalesce((cl.settings->'discovery'->>'slot_step_min')::int, 30)
                ) * coalesce((cl.settings->'discovery'->>'slot_step_min')::int, 30)
              )::int)
          ) at time zone 'Europe/Paris' as debut
        ) d
      ) w
      where cl.active
        and (cl.settings->'discovery'->'coach_user_ids') ? p_coach_user_id::text
        and (
          -- réservations du club, en PERSONNES (un couple prend 2 places)
          coalesce((
            select sum(coalesce(rb.people_count, 1))
            from public.rdv_bookings rb
            where rb.club_id = cl.id
              and rb.status <> 'canceled'
              and rb.slot_start < w.fin
              and rb.slot_end > w.debut
          ), 0)
          -- + tout ce qui occupe un coach du club sur la même fenêtre. On
          -- compte TOUS les coachs, pas seulement celui qu'on interroge :
          -- sinon on raterait le cas où c'est l'AUTRE qui prend la dernière
          -- place — il serait libre côté agenda, le club serait plein, et
          -- /rdv ouvrirait quand même.
          + coalesce((
            select sum(o.personnes)
            from (
              select coalesce(rb2.people_count, 1) as personnes
              from public.rdv_bookings rb2
              where rb2.club_id is null
                and rb2.status <> 'canceled'
                and (cl.settings->'discovery'->'coach_user_ids') ? rb2.coach_user_id::text
                and rb2.slot_start < w.fin
                and rb2.slot_end > w.debut
              union all
              select 1
              from public.follow_ups f2
              join public.clients c2 on c2.id = f2.client_id
              where (cl.settings->'discovery'->'coach_user_ids') ? c2.distributor_id::text
                and f2.status in ('scheduled', 'pending')
                and coalesce(c2.lifecycle_status, 'active') not in ('stopped', 'lost', 'paused')
                and coalesce(c2.free_follow_up, false) = false
                and f2.due_date < w.fin
                and f2.due_date + make_interval(mins => coalesce(f2.duration_min, 60)) > w.debut
              union all
              select 1
              from public.prospects p2
              where (cl.settings->'discovery'->'coach_user_ids') ? p2.distributor_id::text
                and p2.status = 'scheduled'
                and p2.rdv_date < w.fin
                and p2.rdv_date + make_interval(mins => coalesce(p2.duration_min, 60)) > w.debut
            ) o
          ), 0)
          >= coalesce((cl.settings->'discovery'->>'capacity')::int, 3)
        )
    );
$function$;

comment on function public.is_coach_slot_free(uuid, timestamptz, timestamptz) is
  'Créneau libre pour un coach : rien qui chevauche dans son agenda, ET — s''il tient un club — au moins une place restante sur le CRÉNEAU CLUB qui contient ce moment (borné sur slot_step_min). Sert à get_coach_availability_by_slug et à book_coach_rdv.';
