-- =============================================================================
-- Chantier Agenda Prospects (2026-04-19)
--
-- Table prospects : CRM pré-bilan pour tracker les RDV de prospection
-- (Meta Ads / Instagram / Bouche à oreille / etc.) AVANT la création du bilan.
--
-- Flow métier :
--   1. Distributeur crée un prospect depuis Agenda → status 'scheduled'
--   2. Le jour du RDV, widget dashboard lui rappelle
--   3. Clic "Commencer son bilan" → crée un bilan pré-rempli (prénom/nom/phone/email/note)
--   4. À la sauvegarde du bilan → prospect passe en 'converted' + convertedClientId
--
-- RLS : admin voit tout, distri voit ses prospects uniquement. Pattern aligné
-- avec assessments / follow_ups via les helpers is_active_user() + can_access_owner().
--
-- À EXÉCUTER DANS SUPABASE STUDIO → SQL EDITOR.
-- =============================================================================

create table if not exists public.prospects (
  id uuid primary key default gen_random_uuid(),
  first_name text not null,
  last_name text not null,
  phone text,
  email text,

  rdv_date timestamptz not null,

  source text not null default 'Autre',
  source_detail text,

  note text,

  distributor_id uuid not null references public.users(id) on delete cascade,

  status text not null default 'scheduled'
    check (status in ('scheduled', 'done', 'converted', 'lost', 'no_show', 'cancelled')),

  converted_client_id text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_prospects_distributor_id on public.prospects(distributor_id);
create index if not exists idx_prospects_rdv_date on public.prospects(rdv_date);
create index if not exists idx_prospects_status on public.prospects(status);

-- ─── RLS ─────────────────────────────────────────────────────────────────────
alter table public.prospects enable row level security;

drop policy if exists "prospects_coach_select" on public.prospects;
create policy "prospects_coach_select"
  on public.prospects
  for select
  to authenticated
  using (public.is_active_user() and public.can_access_owner(distributor_id));

drop policy if exists "prospects_coach_insert" on public.prospects;
create policy "prospects_coach_insert"
  on public.prospects
  for insert
  to authenticated
  with check (public.is_active_user() and public.can_access_owner(distributor_id));

drop policy if exists "prospects_coach_update" on public.prospects;
create policy "prospects_coach_update"
  on public.prospects
  for update
  to authenticated
  using (public.is_active_user() and public.can_access_owner(distributor_id))
  with check (public.is_active_user() and public.can_access_owner(distributor_id));

drop policy if exists "prospects_coach_delete" on public.prospects;
create policy "prospects_coach_delete"
  on public.prospects
  for delete
  to authenticated
  using (public.is_active_user() and public.can_access_owner(distributor_id));

comment on table public.prospects is
  'Chantier Agenda (2026-04-19) : RDV prospection avant bilan initial. Source Meta Ads/Instagram/etc. Clic → crée une fiche client pré-remplie + lien convertedClientId.';
