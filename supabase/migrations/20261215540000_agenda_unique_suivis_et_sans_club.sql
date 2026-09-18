-- L'agenda unique (maquette validée par Thomas le 18/09/2026) — la base.
--
-- 1. coachs_du_club() : une coach SANS club est son propre « club ». Quand
--    « Mon agenda » disparaît (lot 4), l'agenda du club doit servir toute
--    l'équipe — sinon une coach hors club n'a plus d'agenda du tout.
-- 2. est_coach_de_mon_club(uid) : soi-même, toujours (même raison).
-- 3. agenda_du_club() rend client_id pour un SUIVI : la question unique doit
--    ouvrir SA fiche et SON bilan. Type de retour changé → drop + create.
-- 4. qualifier_rdv_club() accepte un suivi : fait (terminé), pas_venue /
--    relance (replanifié dans N jours, même heure).
-- 5. caler_rdv_club(p_source) déplace aussi un suivi — chez SA coach seulement
--    (changer de coach = changer la fiche, pas le rendez-vous). Signature
--    changée (paramètre ajouté) → drop + create, pour ne pas laisser deux
--    surcharges que PostgREST ne saurait départager.

-- 1 ────────────────────────────────────────────────────────────────────────
create or replace function public.coachs_du_club()
returns table(id uuid, prenom text, nom text, proprietaire boolean, couleur text)
language sql stable security definer
set search_path = public, extensions
as $$
  select * from (
    select u.id,
           coalesce(nullif(split_part(coalesce(u.name, ''), ' ', 1), ''), 'Coach') as prenom,
           coalesce(nullif(trim(u.name), ''), 'Coach')                            as nom,
           (u.id = cl.owner_user_id)                                             as proprietaire,
           u.calendar_color                                                      as couleur
      from public.clubs cl
      join public.users u on (u.club_id = cl.id or u.id = cl.owner_user_id)
     where cl.id = public.bbc_mon_club()
       and coalesce(u.active, true)
       and u.role in ('admin', 'referent', 'distributor')
       and public.is_active_user()
    union all
    select u.id,
           coalesce(nullif(split_part(coalesce(u.name, ''), ' ', 1), ''), 'Coach'),
           coalesce(nullif(trim(u.name), ''), 'Coach'),
           false,
           u.calendar_color
      from public.users u
     where u.id = (select auth.uid())
       and public.bbc_mon_club() is null
       and coalesce(u.active, true)
       and public.is_active_user()
  ) c
  order by c.proprietaire desc, c.prenom;
$$;

-- 2 ────────────────────────────────────────────────────────────────────────
create or replace function public.est_coach_de_mon_club(uid uuid)
returns boolean
language sql stable security definer
set search_path = public, extensions
as $$
  select uid is not null and (
    uid = (select auth.uid())
    or exists (
      select 1
        from public.clubs cl
        join public.users u on (u.club_id = cl.id or u.id = cl.owner_user_id)
       where cl.id = public.bbc_mon_club()
         and u.id = uid
         and coalesce(u.active, true)
    )
  );
$$;

-- 3 ────────────────────────────────────────────────────────────────────────
drop function if exists public.agenda_du_club(timestamptz, timestamptz);
create function public.agenda_du_club(du timestamptz, au timestamptz)
returns table(source text, id uuid, coach_user_id uuid, debut timestamptz, fin timestamptz,
              prenom text, nom text, telephone text, statut text, nature text, client_id uuid)
language sql stable security definer
set search_path = public, extensions
as $$
  with fenetre as (
    select du as d, au as a where au > du and au - du <= interval '92 days'
  ),
  coachs as (select c.id from public.coachs_du_club() c)

  select 'prospect'::text, p.id, p.distributor_id,
         p.rdv_date,
         p.rdv_date + make_interval(mins => coalesce(p.duration_min, 60)),
         p.first_name, p.last_name, p.phone,
         p.status, 'bilan'::text, null::uuid
    from public.prospects p, fenetre f
   where p.rdv_date >= f.d and p.rdv_date < f.a
     and p.distributor_id in (select id from coachs)
     and p.status is distinct from 'cancelled'

  union all

  select 'reservation', b.id, b.coach_user_id,
         b.slot_start, b.slot_end,
         b.first_name, b.last_name, b.contact,
         b.status, coalesce(b.booking_type, 'decouverte'), null::uuid
    from public.rdv_bookings b, fenetre f
   where b.slot_start >= f.d and b.slot_start < f.a
     and (b.club_id = public.bbc_mon_club() or b.coach_user_id in (select id from coachs))
     and b.status is distinct from 'canceled'

  union all

  select 'suivi', s.id, c.distributor_id,
         s.due_date,
         s.due_date + make_interval(mins => coalesce(s.duration_min, 30)),
         c.first_name, c.last_name, c.phone,
         s.status, coalesce(s.type, 'suivi'), s.client_id
    from public.follow_ups s
    join public.clients c on c.id = s.client_id, fenetre f
   where s.due_date >= f.d and s.due_date < f.a
     and c.distributor_id in (select id from coachs)
     and s.status = 'scheduled'

  union all

  select 'indispo', i.id, i.user_id,
         i.starts_at, i.ends_at,
         'Pas dispo'::text, nullif(btrim(coalesce(i.note, '')), ''), null::text,
         'indispo'::text, 'indispo'::text, null::uuid
    from public.coach_unavailabilities i, fenetre f
   where i.starts_at >= f.d and i.starts_at < f.a
     and i.user_id in (select id from coachs)

  order by 4;
$$;
revoke all on function public.agenda_du_club(timestamptz, timestamptz) from public;
grant execute on function public.agenda_du_club(timestamptz, timestamptz) to authenticated, service_role;

-- 4 ────────────────────────────────────────────────────────────────────────
create or replace function public.qualifier_rdv_club(p_source text, p_rdv_id uuid, p_issue text, p_jours integer default null, p_raison text default null, p_client_id uuid default null)
returns void
language plpgsql security definer
set search_path = public, extensions
as $$
declare
  v_owner uuid;
  v_n     int;
begin
  if not public.is_active_user() then
    raise exception 'access denied';
  end if;
  if p_issue not in ('membre', 'fait', 'relance', 'pas_venue', 'perdue') then
    raise exception 'issue_inconnue';
  end if;

  if p_source = 'prospect' then
    select p.distributor_id into v_owner from public.prospects p where p.id = p_rdv_id;
    if v_owner is null or not public.est_coach_de_mon_club(v_owner) then
      raise exception 'rendez_vous_introuvable';
    end if;

    if p_issue = 'membre' then
      update public.prospects
         set status = 'converted',
             converted_client_id = coalesce(p_client_id::text, converted_client_id),
             updated_at = now()
       where id = p_rdv_id;
    elsif p_issue = 'fait' then
      update public.prospects set status = 'done', updated_at = now() where id = p_rdv_id;
    elsif p_issue in ('relance', 'pas_venue') then
      update public.prospects
         set status = 'cold',
             cold_until = now() + make_interval(days => coalesce(p_jours, case when p_issue = 'pas_venue' then 2 else 7 end)),
             cold_reason = coalesce(nullif(trim(p_raison), ''),
                                    case when p_issue = 'pas_venue' then 'Pas venue au RDV' else 'Venue au RDV, réfléchit' end),
             updated_at = now()
       where id = p_rdv_id;
    else
      update public.prospects set status = 'lost', updated_at = now() where id = p_rdv_id;
    end if;
    get diagnostics v_n = row_count;

  elsif p_source = 'reservation' then
    select b.coach_user_id into v_owner from public.rdv_bookings b where b.id = p_rdv_id;
    if v_owner is null or not public.est_coach_de_mon_club(v_owner) then
      raise exception 'rendez_vous_introuvable';
    end if;
    update public.rdv_bookings
       set status = case when p_issue in ('membre', 'fait') then 'honored' else 'no_show' end
     where id = p_rdv_id;
    get diagnostics v_n = row_count;

  elsif p_source = 'suivi' then
    -- Un suivi de cliente (18/09) : la coach de la fiche, ou une coach de son club.
    select c.distributor_id into v_owner
      from public.follow_ups s join public.clients c on c.id = s.client_id
     where s.id = p_rdv_id;
    if v_owner is null or not public.est_coach_de_mon_club(v_owner) then
      raise exception 'rendez_vous_introuvable';
    end if;
    if p_issue = 'fait' then
      update public.follow_ups set status = 'completed' where id = p_rdv_id;
    elsif p_issue in ('pas_venue', 'relance') then
      -- Replanifié dans N jours, à la même heure. Pas de SMS (règle de Thomas).
      update public.follow_ups
         set due_date = date_trunc('day', now()) + make_interval(days => coalesce(p_jours, 3)) + (due_date::time),
             status = 'scheduled'
       where id = p_rdv_id;
    else
      raise exception 'issue_inconnue';
    end if;
    get diagnostics v_n = row_count;

  else
    raise exception 'source_inconnue';
  end if;

  if v_n = 0 then
    raise exception 'rendez_vous_introuvable';
  end if;
end;
$$;

-- 5 ────────────────────────────────────────────────────────────────────────
drop function if exists public.caler_rdv_club(uuid, timestamptz, integer, text, text, text, text, text, text, text, uuid);
create function public.caler_rdv_club(p_coach uuid, p_debut timestamptz, p_duree_min integer, p_prenom text, p_nom text default null, p_telephone text default null, p_email text default null, p_source text default 'Autre', p_source_detail text default null, p_note text default null, p_rdv_id uuid default null, p_table text default 'prospect')
returns uuid
language plpgsql security definer
set search_path = public, extensions
as $$
declare
  v_fin        timestamptz;
  v_id         uuid;
  v_pris       int := 0;
  v_old_debut  timestamptz;
  v_old_fin    timestamptz;
  v_old_coach  uuid;
  v_old_statut text;
begin
  if not public.is_active_user() then
    raise exception 'access denied';
  end if;
  if p_coach is null or not public.est_coach_de_mon_club(p_coach) then
    raise exception 'coach_hors_club';
  end if;
  if p_debut is null or coalesce(p_duree_min, 0) <= 0 or p_duree_min > 480 then
    raise exception 'creneau_invalide';
  end if;
  if p_rdv_id is null and coalesce(trim(p_prenom), '') = '' then
    raise exception 'prenom_requis';
  end if;
  v_fin := p_debut + make_interval(mins => p_duree_min);

  -- Un SUIVI de cliente qu'on déplace (18/09) : même coach, follow_ups.due_date.
  if p_table = 'suivi' then
    if p_rdv_id is null then
      raise exception 'rendez_vous_introuvable';
    end if;
    select s.due_date, s.due_date + make_interval(mins => coalesce(s.duration_min, 30)), c.distributor_id, 'scheduled'
      into v_old_debut, v_old_fin, v_old_coach, v_old_statut
      from public.follow_ups s join public.clients c on c.id = s.client_id
     where s.id = p_rdv_id and public.est_coach_de_mon_club(c.distributor_id);
    if v_old_debut is null then
      raise exception 'rendez_vous_introuvable';
    end if;
    if v_old_coach <> p_coach then
      raise exception 'suivi_reste_avec_sa_coach';
    end if;
    select count(*) into v_pris
      from public.creneaux_occupes(p_coach, p_debut - interval '1 day', p_debut + interval '2 days') o
     where o.debut < v_fin and o.fin > p_debut;
    if v_old_debut < v_fin and v_old_fin > p_debut then
      v_pris := v_pris - 1;
    end if;
    if v_pris > 0 then
      raise exception 'creneau_pris';
    end if;
    update public.follow_ups
       set due_date = p_debut, duration_min = p_duree_min
     where id = p_rdv_id
    returning id into v_id;
    return v_id;
  end if;

  if p_rdv_id is not null then
    select p.rdv_date,
           p.rdv_date + make_interval(mins => coalesce(p.duration_min, 60)),
           p.distributor_id,
           coalesce(p.status, '')
      into v_old_debut, v_old_fin, v_old_coach, v_old_statut
      from public.prospects p
     where p.id = p_rdv_id
       and public.est_coach_de_mon_club(p.distributor_id);
    if v_old_debut is null then
      raise exception 'rendez_vous_introuvable';
    end if;
  end if;

  select count(*)
    into v_pris
    from public.creneaux_occupes(p_coach, p_debut - interval '1 day', p_debut + interval '2 days') o
   where o.debut < v_fin and o.fin > p_debut;

  if p_rdv_id is not null
     and v_old_coach = p_coach
     and v_old_statut not in ('lost', 'no_show', 'cancelled', 'cold')
     and v_old_debut < v_fin and v_old_fin > p_debut then
    v_pris := v_pris - 1;
  end if;

  if v_pris > 0 then
    raise exception 'creneau_pris';
  end if;

  if p_rdv_id is null then
    insert into public.prospects
      (first_name, last_name, phone, email, rdv_date, duration_min,
       source, source_detail, note, distributor_id, status)
    values
      (trim(p_prenom),
       coalesce(nullif(trim(p_nom), ''), ''),
       nullif(trim(p_telephone), ''),
       nullif(trim(p_email), ''),
       p_debut, p_duree_min,
       coalesce(nullif(trim(p_source), ''), 'Autre'),
       p_source_detail, p_note, p_coach, 'scheduled')
    returning id into v_id;
  else
    update public.prospects
       set rdv_date = p_debut,
           duration_min = p_duree_min,
           distributor_id = p_coach,
           status = case when status in ('cancelled', 'no_show', 'cold') then 'scheduled' else status end,
           reminder_email_sent_at = null,
           updated_at = now()
     where id = p_rdv_id
    returning id into v_id;
  end if;

  return v_id;
end;
$$;
revoke all on function public.caler_rdv_club(uuid, timestamptz, integer, text, text, text, text, text, text, text, uuid, text) from public;
grant execute on function public.caler_rdv_club(uuid, timestamptz, integer, text, text, text, text, text, text, text, uuid, text) to authenticated, service_role;
