-- =============================================================================
-- RDV V2 — déclaration des disponibilités coach + réservations funnel (2026-06-14)
--
-- Décisions Thomas : le COACH déclare ses créneaux (hebdo récurrents) ; le
-- prospect réserve sur l'agenda du COACH DU LIEN. Ici : le socle data.
--   - coach_rdv_availability : plages hebdo récurrentes par coach
--   - rdv_bookings           : réservations issues du funnel public
--
-- ⚠️ INERTE tant que `supabase db push --linked` n'est pas lancé. Nouvelles
-- tables uniquement — AUCUN impact sur les tables/logique existantes (PV, etc.).
-- =============================================================================

begin;

-- 1. Disponibilités RDV déclarées par le coach (créneaux hebdo récurrents).
create table if not exists public.coach_rdv_availability (
  id uuid primary key default gen_random_uuid(),
  coach_user_id uuid not null references public.users (id) on delete cascade,
  weekday smallint not null check (weekday between 0 and 6), -- 0=dimanche … 6=samedi (JS getDay)
  start_min smallint not null check (start_min between 0 and 1439),
  end_min smallint not null check (end_min between 1 and 1440),
  created_at timestamptz not null default now(),
  constraint coach_rdv_availability_range check (end_min > start_min)
);
create index if not exists coach_rdv_availability_coach_idx
  on public.coach_rdv_availability (coach_user_id);

alter table public.coach_rdv_availability enable row level security;

drop policy if exists "rdv_availability_own_row" on public.coach_rdv_availability;
create policy "rdv_availability_own_row"
  on public.coach_rdv_availability for all
  using (coach_user_id = auth.uid())
  with check (coach_user_id = auth.uid());

-- 2. Réservations RDV issues du funnel public (insert via edge service_role).
create table if not exists public.rdv_bookings (
  id uuid primary key default gen_random_uuid(),
  coach_user_id uuid references public.users (id) on delete set null,
  coach_slug text,
  first_name text,
  contact text,            -- tél ou email saisi (optionnel)
  mode text not null check (mode in ('presentiel', 'visio')),
  slot_start timestamptz not null,
  slot_end timestamptz not null,
  status text not null default 'requested' check (status in ('requested', 'confirmed', 'canceled')),
  online_bilan_id uuid references public.online_bilans (id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists rdv_bookings_coach_slot_idx
  on public.rdv_bookings (coach_user_id, slot_start);

alter table public.rdv_bookings enable row level security;

-- Le coach voit + gère SES réservations. L'insert public passe par l'edge
-- book-rdv en service_role (bypass RLS) — pas de policy insert anon ici.
drop policy if exists "rdv_bookings_coach_read" on public.rdv_bookings;
create policy "rdv_bookings_coach_read"
  on public.rdv_bookings for select
  using (coach_user_id = auth.uid());

drop policy if exists "rdv_bookings_coach_update" on public.rdv_bookings;
create policy "rdv_bookings_coach_update"
  on public.rdv_bookings for update
  using (coach_user_id = auth.uid())
  with check (coach_user_id = auth.uid());

commit;
