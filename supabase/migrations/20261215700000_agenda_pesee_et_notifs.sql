-- =============================================================================
-- L'agenda du club, deux demandes de Thomas (22/09/2026).
--
-- 1 · « Comment je prends RDV pour sa prochaine pesée ? Elles n'ont pas repris de
--     carte ! » — `caler_suivi_membre` : un SUIVI de SA fiche (follow_ups), chez SA
--     coach. Jamais un rendez-vous de prospect (`caler_rdv_club`, table prospects) :
--     à la venue, l'app aurait proposé de créer une nouvelle fiche — un doublon.
--     Le créneau est revérifié ici comme dans `caler_rdv_club` ; la cliente reçoit
--     sa confirmation par le trigger `notify_rdv_confirm_client`, puis ses rappels.
--
-- 2 · « Notification RDV agenda partagé : le choix si on veut la recevoir… le
--     client lead, lui, reçoit, mais le choix est au coach ! » — `users.notif_agenda` :
--       'miens'  (défaut = ce qui se passait) : quand une autre cale, déplace ou met
--                un « pas dispo » dans MON agenda ; les admins, en plus, les
--                réservations du site ;
--       'club'   : tout ce qui se cale dans le club, et les réservations du site ;
--       'aucun'  : rien de tout ça (la personne, elle, a toujours sa confirmation).
--     `agenda_a_prevenir(p_coach)` rend les comptes à prévenir pour un rendez-vous
--     posé dans l'agenda de `p_coach` par la personne connectée (jamais elle-même).
-- =============================================================================

-- ─── 1 · La prochaine pesée d'une membre ────────────────────────────────────
create or replace function public.caler_suivi_membre(p_client uuid, p_debut timestamptz, p_duree_min integer default 30)
returns uuid
language plpgsql security definer set search_path = public, extensions as $$
declare
  v_coach uuid;
  v_nom text;
  v_programme text;
  v_dernier date;
  v_fin timestamptz;
  v_pris int := 0;
  v_id uuid;
  v_ancien_debut timestamptz;
  v_ancien_fin timestamptz;
begin
  if not public.is_active_user() then raise exception 'access denied'; end if;
  select c.distributor_id, btrim(coalesce(c.first_name, '') || ' ' || coalesce(c.last_name, '')), coalesce(c.current_program, '')
    into v_coach, v_nom, v_programme
    from public.clients c where c.id = p_client;
  if v_coach is null or not public.est_coach_de_mon_club(v_coach) then raise exception 'coach_hors_club'; end if;
  if p_debut is null or coalesce(p_duree_min, 0) <= 0 or p_duree_min > 480 then raise exception 'creneau_invalide'; end if;

  -- Une cliente a UN prochain suivi (`follow_ups.client_id` est unique) : caler sa
  -- pesée le REPLACE. Son ancien créneau ne bloque donc pas le nouveau.
  select s.due_date, s.due_date + make_interval(mins => coalesce(s.duration_min, 30))
    into v_ancien_debut, v_ancien_fin
    from public.follow_ups s where s.client_id = p_client and s.status = 'scheduled';
  v_fin := p_debut + make_interval(mins => p_duree_min);
  select count(*) into v_pris
    from public.creneaux_occupes(v_coach, p_debut - interval '1 day', p_debut + interval '2 days') o
   where o.debut < v_fin and o.fin > p_debut;
  if v_ancien_debut is not null and v_ancien_debut < v_fin and v_ancien_fin > p_debut then v_pris := v_pris - 1; end if;
  if v_pris > 0 then raise exception 'creneau_pris'; end if;

  select coalesce(max(a.date)::date, current_date) into v_dernier from public.assessments a where a.client_id = p_client;
  update public.follow_ups
     set due_date = p_debut, duration_min = p_duree_min, type = 'Pesée', status = 'scheduled',
         client_name = v_nom, program_title = v_programme, last_assessment_date = v_dernier, notify_client = true
   where client_id = p_client
  returning id into v_id;
  if v_id is null then
    insert into public.follow_ups (client_id, client_name, due_date, type, status, program_title, last_assessment_date, duration_min, notify_client)
    values (p_client, v_nom, p_debut, 'Pesée', 'scheduled', v_programme, v_dernier, p_duree_min, true)
    returning id into v_id;
  end if;
  -- Le « Prochain RDV » de sa fiche suit (la fiche standard et le bilan des 10 le lisent).
  update public.clients set next_follow_up = p_debut where id = p_client;
  return v_id;
end;
$$;
revoke all on function public.caler_suivi_membre(uuid, timestamptz, integer) from public, anon;
grant execute on function public.caler_suivi_membre(uuid, timestamptz, integer) to authenticated;

-- ─── 2 · Qui prévenir quand un rendez-vous se cale ──────────────────────────
alter table public.users add column if not exists notif_agenda text not null default 'miens';
do $c$
begin
  if not exists (select 1 from pg_constraint where conname = 'users_notif_agenda_check') then
    alter table public.users add constraint users_notif_agenda_check check (notif_agenda in ('miens', 'club', 'aucun'));
  end if;
end
$c$;
comment on column public.users.notif_agenda is
  'Notifications de l''agenda du club : miens (défaut) · club (tout le club + réservations du site) · aucun. La personne a toujours sa confirmation.';

create or replace function public.agenda_a_prevenir(p_coach uuid)
returns table (user_id uuid, est_son_agenda boolean)
language sql stable security definer set search_path = public, extensions as $$
  select u.id, u.id = p_coach
    from public.users u
   where public.is_active_user()
     and u.active
     and u.id <> auth.uid()
     and ((u.id = p_coach and u.notif_agenda in ('miens', 'club'))
          or (u.id <> p_coach and u.notif_agenda = 'club' and public.est_coach_de_mon_club(u.id)));
$$;
revoke all on function public.agenda_a_prevenir(uuid) from public, anon;
grant execute on function public.agenda_a_prevenir(uuid) to authenticated;
