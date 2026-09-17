-- =============================================================================
-- « Pas dispo » — une coach bloque un matin, un apres-midi ou une journee
-- (agenda partage du club, etape 8 — 18/09/2026).
--
-- DECISION DE THOMAS (17/09) : « Pas dispo » se pose depuis le ＋ de L'agenda.
-- Sur TimeTree, l'equipe ecrit « Romane absente » dans le calendrier commun :
-- tout le monde le voit, personne ne cale rien dessus. Il faut la meme chose.
--
-- POURQUOI UNE TABLE, ET PAS UN FAUX RENDEZ-VOUS : un « pas dispo » range dans
-- `prospects` serait compte comme un lead (entonnoir, relances, rappel mail de
-- la veille). Ce n'est pas un rendez-vous, c'est une ABSENCE de creneau.
--
-- CE QUI LA LIT — et c'est tout l'interet :
--   · `agenda_du_club()`                  → elle s'affiche, hachuree, chez la coach ;
--   · `creneaux_occupes()`                → « Caler un RDV » ne propose plus ces
--                                           heures, et `caler_rdv_club()` les refuse ;
--   · `get_club_discovery_availability()` → le site retire une place par coach
--                                           absente (meme regle que ses rendez-vous).
--
-- DROITS = ceux de l'agenda (Thomas, 17/09 : « comme TimeTree ») : dans le club,
-- chacune peut poser ou liberer un « pas dispo », pour elle ou pour une autre.
-- Pas d'UPDATE : on libere et on repose — un geste de moins a securiser.
-- =============================================================================

create table if not exists public.coach_unavailabilities (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.users(id) on delete cascade,
  starts_at   timestamptz not null,
  ends_at     timestamptz not null,
  note        text,
  created_by  uuid default auth.uid(),
  created_at  timestamptz not null default now(),
  constraint coach_unavailabilities_plage_valide
    check (ends_at > starts_at and ends_at <= starts_at + interval '24 hours')
);

comment on table public.coach_unavailabilities is
  'Les « pas dispo » des coachs : une plage ou l''on ne cale rien. Lue par agenda_du_club, creneaux_occupes et get_club_discovery_availability.';

create index if not exists coach_unavailabilities_user_debut
  on public.coach_unavailabilities (user_id, starts_at);

alter table public.coach_unavailabilities enable row level security;

-- Regle 3 de l'audit du 29/07 : le RLS n'est pas la seule barriere.
revoke all on table public.coach_unavailabilities from public, anon, authenticated;
grant select, insert, delete on table public.coach_unavailabilities to authenticated;

drop policy if exists coach_unavailabilities_club_read on public.coach_unavailabilities;
create policy coach_unavailabilities_club_read on public.coach_unavailabilities
  for select to authenticated
  using (
    public.is_active_user()
    and (user_id = (select auth.uid()) or public.est_coach_de_mon_club(user_id))
  );

drop policy if exists coach_unavailabilities_club_insert on public.coach_unavailabilities;
create policy coach_unavailabilities_club_insert on public.coach_unavailabilities
  for insert to authenticated
  with check (
    public.is_active_user()
    and (user_id = (select auth.uid()) or public.est_coach_de_mon_club(user_id))
  );

drop policy if exists coach_unavailabilities_club_delete on public.coach_unavailabilities;
create policy coach_unavailabilities_club_delete on public.coach_unavailabilities
  for delete to authenticated
  using (
    public.is_active_user()
    and (user_id = (select auth.uid()) or public.est_coach_de_mon_club(user_id))
  );

-- ── 1. « Quand est-il pris ? » compte aussi les « pas dispo » ────────────────
-- Recopie EXACTE de la version en base (verifiee le 18/09), plus la source 5.
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
  v_defaut constant int := 60;
begin
  if p_coach is null or p_du is null or p_au is null then
    return;
  end if;
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
  -- 3. Les reservations (club et tunnels publics).
  select b.slot_start, coalesce(b.slot_end, b.slot_start + make_interval(mins => v_defaut))
    from public.rdv_bookings b
   where b.coach_user_id = p_coach
     and b.status <> 'canceled'
     and b.slot_start >= p_du and b.slot_start < p_au
  union all
  -- 4. Les rituels du club.
  select r.scheduled_at, r.scheduled_at + make_interval(mins => v_defaut)
    from public.club_call_registrations r
   where r.coach_user_id = p_coach
     and r.scheduled_at >= p_du and r.scheduled_at < p_au
  union all
  -- 5. Les « pas dispo ». On teste le CHEVAUCHEMENT, pas le debut : une journee
  --    bloquee depuis 8 h doit encore compter quand on regarde a partir de midi.
  select i.starts_at, i.ends_at
    from public.coach_unavailabilities i
   where i.user_id = p_coach
     and i.ends_at > p_du and i.starts_at < p_au
  order by 1;
end;
$$;

revoke all on function public.creneaux_occupes(uuid, timestamptz, timestamptz) from public, anon;
grant execute on function public.creneaux_occupes(uuid, timestamptz, timestamptz) to authenticated;

-- ── 2. L'agenda du club les affiche ─────────────────────────────────────────
-- Meme signature : les vues n'ont rien a reapprendre, une quatrieme `source`.
create or replace function public.agenda_du_club(du timestamptz, au timestamptz)
returns table (
  source        text,
  id            uuid,
  coach_user_id uuid,
  debut         timestamptz,
  fin           timestamptz,
  prenom        text,
  nom           text,
  telephone     text,
  statut        text,
  nature        text
)
language sql
stable
security definer
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
         p.status, 'bilan'::text
    from public.prospects p, fenetre f
   where p.rdv_date >= f.d and p.rdv_date < f.a
     and p.distributor_id in (select id from coachs)
     and p.status is distinct from 'cancelled'

  union all

  select 'reservation', b.id, b.coach_user_id,
         b.slot_start, b.slot_end,
         b.first_name, b.last_name, b.contact,
         b.status, coalesce(b.booking_type, 'decouverte')
    from public.rdv_bookings b, fenetre f
   where b.slot_start >= f.d and b.slot_start < f.a
     and (b.club_id = public.bbc_mon_club() or b.coach_user_id in (select id from coachs))
     and b.status is distinct from 'canceled'

  union all

  select 'suivi', s.id, c.distributor_id,
         s.due_date,
         s.due_date + make_interval(mins => coalesce(s.duration_min, 30)),
         c.first_name, c.last_name, c.phone,
         s.status, coalesce(s.type, 'suivi')
    from public.follow_ups s
    join public.clients c on c.id = s.client_id, fenetre f
   where s.due_date >= f.d and s.due_date < f.a
     and c.distributor_id in (select id from coachs)
     and s.status = 'scheduled'

  union all

  -- Les « pas dispo ». `prenom` porte le libelle, `nom` la note eventuelle :
  -- aucune colonne de plus, donc aucun ecran a casser.
  select 'indispo', i.id, i.user_id,
         i.starts_at, i.ends_at,
         'Pas dispo'::text, nullif(btrim(coalesce(i.note, '')), ''), null::text,
         'indispo'::text, 'indispo'::text
    from public.coach_unavailabilities i, fenetre f
   where i.starts_at >= f.d and i.starts_at < f.a
     and i.user_id in (select id from coachs)

  order by 4;
$$;

revoke all on function public.agenda_du_club(timestamptz, timestamptz) from public, anon;
grant execute on function public.agenda_du_club(timestamptz, timestamptz) to authenticated;

-- ── 3. Le site retire une place par coach absente ───────────────────────────
-- Recopie EXACTE de la version en base (relue le 18/09 via pg_get_functiondef),
-- avec UNE source de plus dans `occupations`. Rien d'autre ne change : sans
-- aucun « pas dispo » en base, la sortie est identique (verifie par empreinte).
-- Les droits existants (le tunnel public l'appelle) sont conserves par le
-- `create or replace` : on n'y touche pas.
create or replace function public.get_club_discovery_availability(p_slug text, p_days integer default 21)
returns table (slot_start timestamptz, slot_end timestamptz, remaining integer, capacity integer)
language plpgsql
security definer
set search_path = public, extensions
as $function$
declare
  v_club public.clubs; v_disc jsonb;
  v_cap int; v_step int; v_open date; v_dur int;
  v_tz text := 'Europe/Paris';
  v_from date; v_to date; v_coachs uuid[];
begin
  select * into v_club from public.clubs where slug = p_slug and active limit 1;
  if not found then return; end if;

  v_disc := coalesce(v_club.settings->'discovery', '{}'::jsonb);
  v_cap  := coalesce((v_disc->>'capacity')::int, 3);
  v_step := coalesce((v_disc->>'slot_step_min')::int, 30);
  v_dur  := coalesce((v_disc->>'duration_min')::int, v_step);
  v_open := coalesce((v_disc->>'opening_date')::date, current_date);
  v_from := greatest(current_date, v_open);
  v_to   := v_from + make_interval(days => p_days);

  if v_disc ? 'coach_user_ids' then
    select coalesce(array_agg(x::uuid), '{}'::uuid[]) into v_coachs
      from jsonb_array_elements_text(v_disc->'coach_user_ids') x;
  else
    v_coachs := array[v_club.owner_user_id];
  end if;

  return query
  with days as (
    select gd::date as d, extract(isodow from gd)::int as dow
    from generate_series(v_from::timestamp, v_to::timestamp, interval '1 day') gd
    where not (coalesce(v_disc->'holidays','[]'::jsonb) ? to_char(gd::date,'YYYY-MM-DD'))
  ),
  ranges as (
    select d.d, (r->>0) as t_start, (r->>1) as t_end,
           coalesce((r->>2)::int, v_cap) as cap
    from days d
    cross join lateral jsonb_array_elements(
      coalesce(
        v_disc->'hours_by_date'->to_char(d.d,'YYYY-MM-DD'),
        v_disc->'hours'->(d.dow::text),
        '[]'::jsonb)) as r
  ),
  local_slots as (
    select gs as ss_local, rg.cap from ranges rg
    cross join lateral generate_series(
      (rg.d::text||' '||rg.t_start)::timestamp,
      (rg.d::text||' '||rg.t_end)::timestamp,
      make_interval(mins => v_step)) as gs
  ),
  tz_slots as (
    select (ss_local at time zone v_tz) as ss, min(cap)::int as cap
    from local_slots group by 1
  ),
  booked as (
    select rb.slot_start, sum(coalesce(rb.people_count, 1))::int as places
    from public.rdv_bookings rb
    where rb.club_id = v_club.id and rb.status <> 'canceled'
    group by rb.slot_start
  ),
  occupations as (
    select f.due_date as bs,
           f.due_date + make_interval(mins => coalesce(f.duration_min, 60)) as be, 1 as personnes
    from public.follow_ups f join public.clients c on c.id = f.client_id
    where c.distributor_id = any(v_coachs)
      and coalesce(f.status,'') in ('scheduled','pending')
      and f.due_date >= v_from::timestamp at time zone v_tz
    union all
    select pr.rdv_date, pr.rdv_date + make_interval(mins => coalesce(pr.duration_min, 60)), 1
    from public.prospects pr
    where pr.distributor_id = any(v_coachs)
      and coalesce(pr.status,'') = 'scheduled'
      and pr.rdv_date >= v_from::timestamp at time zone v_tz
    union all
    select rb2.slot_start, rb2.slot_end, coalesce(rb2.people_count, 1)
    from public.rdv_bookings rb2
    where rb2.coach_user_id = any(v_coachs) and rb2.club_id is null
      and rb2.status <> 'canceled'
      and rb2.slot_start >= v_from::timestamp at time zone v_tz
    union all
    select cr.scheduled_at, cr.scheduled_at + make_interval(mins => 60), 1
    from public.club_call_registrations cr
    where cr.coach_user_id = any(v_coachs) and cr.scheduled_at is not null
      and cr.scheduled_at >= v_from::timestamp at time zone v_tz
    union all
    -- Les « pas dispo » (18/09) : une coach absente = une place de moins.
    select iu.starts_at, iu.ends_at, 1
    from public.coach_unavailabilities iu
    where iu.user_id = any(v_coachs)
      and iu.ends_at >= v_from::timestamp at time zone v_tz
  ),
  prises as (
    select ts.ss, coalesce(sum(o.personnes), 0)::int as n
    from tz_slots ts
    left join occupations o on ts.ss < o.be and o.bs < ts.ss + make_interval(mins => v_dur)
    group by ts.ss
  )
  select ts.ss, ts.ss + make_interval(mins => v_step),
         greatest(0, ts.cap - coalesce(bk.places,0) - coalesce(pr.n,0)), ts.cap
  from tz_slots ts
  left join booked bk on bk.slot_start = ts.ss
  left join prises pr on pr.ss = ts.ss
  where public.club_slot_bookable(ts.ss)
  order by ts.ss;
end $function$;
