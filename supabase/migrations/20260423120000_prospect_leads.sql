-- Chantier Welcome Page + Magic Links (2026-04-24).
-- Table prospect_leads : formulaire public "Je veux rejoindre
-- l'aventure" de la page Welcome → insert sans auth (RLS policy
-- public_insert). Admin/distri lisent pour suivi commercial.
--
-- Idempotent : ok à rejouer.

create table if not exists public.prospect_leads (
  id uuid primary key default gen_random_uuid(),
  first_name text not null,
  phone text not null,
  city text,
  source text default 'welcome_page',
  status text not null default 'new' check (status in ('new', 'contacted', 'converted', 'lost')),
  assigned_to_user_id uuid references public.users(id) on delete set null,
  notes text,
  created_at timestamptz not null default now(),
  contacted_at timestamptz
);

create index if not exists idx_prospect_leads_status
  on public.prospect_leads(status, created_at desc);

alter table public.prospect_leads enable row level security;

-- ─── Insertion publique (formulaire sans auth) ──────────────────────────
drop policy if exists "prospect_leads_public_insert" on public.prospect_leads;
create policy "prospect_leads_public_insert"
  on public.prospect_leads
  for insert
  with check (true);

-- ─── Lecture distributeur / admin ───────────────────────────────────────
drop policy if exists "prospect_leads_coach_admin_select" on public.prospect_leads;
create policy "prospect_leads_coach_admin_select"
  on public.prospect_leads
  for select
  to authenticated
  using (
    exists (
      select 1 from public.users u
      where u.id = auth.uid()
        and u.active = true
        and u.role in ('distributor', 'admin', 'referent')
    )
  );

-- ─── Update (changement statut) distributeur / admin ────────────────────
drop policy if exists "prospect_leads_coach_admin_update" on public.prospect_leads;
create policy "prospect_leads_coach_admin_update"
  on public.prospect_leads
  for update
  to authenticated
  using (
    exists (
      select 1 from public.users u
      where u.id = auth.uid()
        and u.role in ('distributor', 'admin', 'referent')
    )
  );

comment on table public.prospect_leads is
  'Chantier Welcome Page (2026-04-24) : leads entrants depuis la page Welcome publique — insert anonyme, read distri/admin.';
