-- =============================================================================
-- L'agenda du club se lit par toute l'equipe du club (agenda partage, etape 2).
--
-- DECISION DE THOMAS (17/09/2026) : « oui, noms visibles ». L'equipe met tous
-- ses rendez-vous sur TimeTree, ou chacune voit les rendez-vous — et les noms —
-- des autres. Pour que l'app remplace TimeTree, il faut la meme chose ici.
--
-- ⚠️ CECI RENVERSE LA REGLE DU 01/09 (« on ouvre les horaires, pas les
-- dossiers ») pour les RENDEZ-VOUS seulement. Ce qui s'ouvre, et a qui :
--   · `prospects`     (rendez-vous poses a la main, depuis l'agenda ou le CRM)
--                     → lisibles par les coachs du MEME club ;
--   · `rdv_bookings`  (reservations du site)
--                     → lisibles par les coachs du club auquel elles sont liees.
-- Ce qui NE s'ouvre PAS : `clients`. Ouvrir sa lecture au club donnerait a
-- Romane les 74 dossiers complets de Melanie (notes, poids, objectifs) — bien
-- plus que l'agenda. Les suivis clients passent donc par la fonction ci-dessous,
-- qui ne rend que les champs d'un agenda : quand, avec qui, pour qui, statut.
--
-- `agenda_du_club(du, au)` est LA source unique des vues Jour / Semaine / Mois.
-- Trois tables, trois vocabulaires de statut, un seul resultat. Fenetre bornee
-- a 92 jours : au-dela, la fonction ne rend rien plutot que de vider la base.
-- =============================================================================

-- ── Est-ce un coach de MON club ? ───────────────────────────────────────────
-- Security definer : une policy ne peut pas lire `users` (RLS : une
-- distributrice ne s'y voit qu'elle-meme), la fonction si.
create or replace function public.est_coach_de_mon_club(uid uuid)
returns boolean
language sql
stable
security definer
set search_path = public, extensions
as $$
  select uid is not null and exists (
    select 1
      from public.clubs cl
      join public.users u on (u.club_id = cl.id or u.id = cl.owner_user_id)
     where cl.id = public.bbc_mon_club()
       and u.id = uid
       and coalesce(u.active, true)
  );
$$;

revoke all on function public.est_coach_de_mon_club(uuid) from public;
grant execute on function public.est_coach_de_mon_club(uuid) to authenticated;

-- ── Lecture des rendez-vous par le club ─────────────────────────────────────
drop policy if exists prospects_club_read on public.prospects;
create policy prospects_club_read on public.prospects
  for select to authenticated
  using (public.is_active_user() and public.est_coach_de_mon_club(distributor_id));

drop policy if exists rdv_bookings_club_read on public.rdv_bookings;
create policy rdv_bookings_club_read on public.rdv_bookings
  for select to authenticated
  using (public.is_active_user() and club_id is not null and club_id = public.bbc_mon_club());

-- ── L'agenda du club, trois sources, un seul resultat ───────────────────────
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

  -- Les rendez-vous poses a la main (agenda, CRM « Caler un RDV »).
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

  -- Les reservations du site du club.
  select 'reservation', b.id, b.coach_user_id,
         b.slot_start, b.slot_end,
         b.first_name, b.last_name, b.contact,
         b.status, coalesce(b.booking_type, 'decouverte')
    from public.rdv_bookings b, fenetre f
   where b.slot_start >= f.d and b.slot_start < f.a
     and (b.club_id = public.bbc_mon_club() or b.coach_user_id in (select id from coachs))
     and b.status is distinct from 'canceled'

  union all

  -- Les suivis des membres et clients — SANS ouvrir `clients` au club.
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

  order by 4;
$$;

comment on function public.agenda_du_club(timestamptz, timestamptz) is
  'L''agenda partage du club : rendez-vous poses a la main, reservations du site et suivis clients, pour tous les coachs de MON club, avec les seuls champs d''un agenda. Fenetre de 92 jours maximum. C''est la source unique des vues Jour / Semaine / Mois.';

revoke all on function public.agenda_du_club(timestamptz, timestamptz) from public;
grant execute on function public.agenda_du_club(timestamptz, timestamptz) to authenticated;
