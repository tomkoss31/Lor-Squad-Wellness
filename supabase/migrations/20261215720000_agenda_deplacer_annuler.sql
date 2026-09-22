-- =============================================================================
-- L'agenda du club : déplacer ET annuler n'importe quel rendez-vous (22/09/2026).
--
-- Thomas : « on doit pouvoir décaler un RDV manuellement et supprimer un RDV
-- facilement si on contacte la personne par téléphone ». Vécu : Sandrine M.
-- avait réservé sur le site pour le 2/10 ; Mélanie l'a appelée, le rendez-vous
-- passait au 7/10 — l'agenda ne sachant pas déplacer une réservation, elle en a
-- CRÉÉ un deuxième, et le premier serait resté (avec son rappel la veille).
-- Maquette validée : https://claude.ai/artifact/E6bR9Sko1R4mGaDgFD2W9n
--
-- 1. annuler_rdv_club(source, id) — les trois sortes de rendez-vous, avec la
--    MÊME règle de droits que « Comment ça s'est passé ? » (qualifier_rdv_club) :
--    une coach du club de ce rendez-vous. Rien n'est envoyé (décision Thomas du
--    11/08 : « on décroche son téléphone, un mail automatique serait froid ») ;
--    les rappels ne lisent que les rendez-vous vivants, donc plus aucun ne part.
--      · prospect    → status 'cancelled'
--      · réservation → status 'canceled' (le créneau se libère aussi sur le site)
--      · suivi       → status 'dismissed' ; clients.next_follow_up étant NOT
--        NULL, on le ramène à son dernier bilan, sinon la fiche du club et la
--        fiche standard montreraient encore « sa pesée : mardi 14 h ».
--
-- 2. coach_reschedule_club_booking — déplacer une réservation du site. C'était
--    admin seulement et depuis le CRM seulement : elle s'ouvre aux coachs du club
--    (même règle), accepte un changement de coach, revérifie que LA COACH est
--    libre (`busy`) en plus de la capacité du club (`full`), et fait repartir les
--    DEUX rappels (mail ET SMS). Signature élargie d'un paramètre optionnel :
--    le CRM (3 arguments) marche sans changement.
-- =============================================================================

create or replace function public.annuler_rdv_club(p_source text, p_rdv_id uuid)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_owner  uuid;
  v_client uuid;
  v_n      int := 0;
begin
  if not public.is_active_user() then
    raise exception 'access denied';
  end if;

  if p_source = 'prospect' then
    select p.distributor_id into v_owner from public.prospects p where p.id = p_rdv_id;
    if v_owner is null or not public.est_coach_de_mon_club(v_owner) then
      raise exception 'rendez_vous_introuvable';
    end if;
    update public.prospects set status = 'cancelled', updated_at = now()
     where id = p_rdv_id and status = 'scheduled';
    get diagnostics v_n = row_count;

  elsif p_source = 'reservation' then
    select b.coach_user_id into v_owner from public.rdv_bookings b where b.id = p_rdv_id;
    if v_owner is null or not public.est_coach_de_mon_club(v_owner) then
      raise exception 'rendez_vous_introuvable';
    end if;
    update public.rdv_bookings set status = 'canceled'
     where id = p_rdv_id and status in ('requested', 'confirmed');
    get diagnostics v_n = row_count;

  elsif p_source = 'suivi' then
    select s.client_id, c.distributor_id into v_client, v_owner
      from public.follow_ups s join public.clients c on c.id = s.client_id
     where s.id = p_rdv_id;
    if v_owner is null or not public.est_coach_de_mon_club(v_owner) then
      raise exception 'rendez_vous_introuvable';
    end if;
    update public.follow_ups set status = 'dismissed'
     where id = p_rdv_id and status in ('scheduled', 'pending');
    get diagnostics v_n = row_count;
    if v_n > 0 then
      -- assessments.date est une DATE : son dernier bilan, à 9 h heure de Paris.
      update public.clients c
         set next_follow_up = coalesce(
               (select (max(a.date) + time '09:00') at time zone 'Europe/Paris'
                  from public.assessments a where a.client_id = c.id),
               c.created_at)
       where c.id = v_client;
    end if;

  else
    raise exception 'source_inconnue';
  end if;

  -- Déjà qualifié, déjà annulé, ou disparu : on le dit plutôt que de faire semblant.
  if v_n = 0 then
    raise exception 'rendez_vous_introuvable';
  end if;
end;
$$;

revoke all on function public.annuler_rdv_club(text, uuid) from public, anon;
grant execute on function public.annuler_rdv_club(text, uuid) to authenticated, service_role;

-- ── 2. Déplacer une réservation du site ─────────────────────────────────────
drop function if exists public.coach_reschedule_club_booking(uuid, timestamptz, timestamptz);

create function public.coach_reschedule_club_booking(
  p_booking_id uuid,
  p_slot_start timestamptz,
  p_slot_end   timestamptz,
  p_coach      uuid default null
)
returns text
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_b     public.rdv_bookings;
  v_coach uuid;
  v_cap   int;
  v_cnt   int;
  v_pris  int := 0;
begin
  select * into v_b
    from public.rdv_bookings
   where id = p_booking_id and status <> 'canceled'
   limit 1;
  if not found or v_b.club_id is null then return 'not_found'; end if;

  -- Autorisation : un admin actif, OU une coach du club de ce rendez-vous (la
  -- règle de l'agenda). security definer contourne la RLS : ce contrôle est la
  -- seule barrière — il ne doit pas sauter.
  if not (
    exists (select 1 from public.users where id = auth.uid() and role = 'admin' and active)
    or (v_b.coach_user_id is not null and public.est_coach_de_mon_club(v_b.coach_user_id))
  ) then
    return 'forbidden';
  end if;

  v_coach := coalesce(p_coach, v_b.coach_user_id);
  if p_coach is not null and p_coach is distinct from v_b.coach_user_id
     and not public.est_coach_de_mon_club(p_coach) then
    return 'forbidden';
  end if;

  if p_slot_start <= now() then return 'past'; end if;
  if p_slot_end is null or p_slot_end <= p_slot_start then return 'invalid'; end if;

  perform pg_advisory_xact_lock(
    hashtextextended(v_b.club_id::text || '|' || p_slot_start::text, 0));

  select coalesce((settings->'discovery'->>'capacity')::int, 3)
    into v_cap
    from public.clubs where id = v_b.club_id;
  if v_cap is null then return 'not_found'; end if;

  -- La résa déplacée s'exclut elle-même du comptage : sinon elle se verrait
  -- comme un obstacle à son propre déplacement.
  select count(*) into v_cnt
    from public.rdv_bookings
   where club_id = v_b.club_id
     and status <> 'canceled'
     and slot_start = p_slot_start
     and id <> v_b.id;
  if v_cnt >= v_cap then return 'full'; end if;

  -- La coach est-elle libre ? (une liste affichée est une photo : on revérifie
  -- en écrivant, comme caler_rdv_club). Son ancien créneau ne compte pas contre
  -- elle s'il chevauche le nouveau.
  if v_coach is not null then
    select count(*) into v_pris
      from public.creneaux_occupes(v_coach, p_slot_start - interval '1 day', p_slot_start + interval '2 days') o
     where o.debut < p_slot_end and o.fin > p_slot_start;
    -- (même durée par défaut que creneaux_occupes quand slot_end manque)
    if v_coach = v_b.coach_user_id and v_b.slot_start < p_slot_end
       and coalesce(v_b.slot_end, v_b.slot_start + interval '60 minutes') > p_slot_start then
      v_pris := v_pris - 1;
    end if;
    if v_pris > 0 then return 'busy'; end if;
  end if;

  update public.rdv_bookings
     set slot_start = p_slot_start,
         slot_end = p_slot_end,
         coach_user_id = v_coach,
         reminder_email_sent_at = null,   -- le rappel J-1 doit repartir
         reminder_sms_sent_at = null      -- et son SMS aussi
   where id = v_b.id;

  -- Le registre des expositions suit (sinon la statistique garde l'ancienne
  -- coach et l'ancienne date : son déclencheur ne réagit qu'au statut).
  update public.exposures
     set user_id = v_coach, occurred_at = p_slot_start
   where source_table = 'rdv_bookings' and source_id = v_b.id;

  return 'ok';
end;
$$;

revoke all on function public.coach_reschedule_club_booking(uuid, timestamptz, timestamptz, uuid) from public, anon;
grant execute on function public.coach_reschedule_club_booking(uuid, timestamptz, timestamptz, uuid) to authenticated, service_role;
