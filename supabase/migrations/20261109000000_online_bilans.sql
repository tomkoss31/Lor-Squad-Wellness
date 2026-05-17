-- Chantier #1 — Bilan Online + Lead pipeline (étape 1.1, 2026-05-17).
--
-- Nouvelle table `online_bilans` : Leads issus du bilan online publique
-- (formulaire 5 étapes sur sous-domaine/path coach). Soumission anonyme
-- via edge function `submit-online-bilan` (étape 1.2). Lus par le coach
-- assigné (coach_user_id) + admin/referent via `/clients` V2 onglet Leads.
--
-- Modèle : nouvelle entité dédiée (cf. décision Thomas 2026-05-10). À la
-- qualification, l'edge function (à venir) créera un `clients` row et
-- remplira `converted_to_client_id` + `converted_at`.
--
-- Idempotent : ok à rejouer.

create table if not exists public.online_bilans (
  id uuid primary key default gen_random_uuid(),

  -- Identification coach (URL slug au moment de la soumission)
  coach_user_id uuid references public.users(id) on delete set null,
  coach_slug text,

  -- Identité du Lead (étape 1/5 du formulaire)
  first_name text not null,
  age integer check (age between 16 and 99),
  height_cm integer check (height_cm between 100 and 220),
  city text,

  -- Objectifs + motivation (étape 2/5)
  objectives text[] not null default '{}',
  weight_loss_target_kg integer check (weight_loss_target_kg between 1 and 50),
  motivation_score smallint check (motivation_score between 1 and 10),

  -- Payload complet du formulaire (vécu, habitudes, budget, activité)
  -- Évolutif : le détail (étapes 3-5) reste en jsonb pour ne pas
  -- multiplier les colonnes au moindre changement de form.
  payload jsonb not null default '{}'::jsonb,

  -- Consentement RGPD (case obligatoire étape 5/5)
  consent_at timestamptz not null default now(),

  -- Métadonnées soumission
  user_agent text,
  ip_country text,

  -- Pipeline Lead (champ séparé pour ne pas polluer LifecycleStatus)
  lead_status text not null default 'new'
    check (lead_status in (
      'new',          -- vient d'être soumis, à qualifier
      'contact',      -- message coach envoyé
      'qualified',    -- converti en Client (cf. converted_to_client_id)
      'to_recontact', -- pas de réponse, à retenter
      'relance',      -- relance J+3 envoyée
      'lost'          -- jamais répondu / perdu
    )),

  -- Conversion vers client (renseigné quand lead_status = 'qualified')
  converted_to_client_id uuid references public.clients(id) on delete set null,
  converted_at timestamptz,

  -- Assignation (par défaut = coach_user_id ; admin peut réassigner)
  assigned_to_user_id uuid references public.users(id) on delete set null,

  -- Trace
  notes text,
  contacted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ─── Index ──────────────────────────────────────────────────────────────
create index if not exists idx_online_bilans_coach_status
  on public.online_bilans(coach_user_id, lead_status, created_at desc);

create index if not exists idx_online_bilans_assigned_status
  on public.online_bilans(assigned_to_user_id, lead_status, created_at desc);

create index if not exists idx_online_bilans_status_created
  on public.online_bilans(lead_status, created_at desc);

create index if not exists idx_online_bilans_coach_slug
  on public.online_bilans(coach_slug)
  where coach_slug is not null;

-- ─── Trigger updated_at ─────────────────────────────────────────────────
create or replace function public.online_bilans_touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_online_bilans_updated_at on public.online_bilans;
create trigger trg_online_bilans_updated_at
  before update on public.online_bilans
  for each row
  execute function public.online_bilans_touch_updated_at();

-- ─── RLS ────────────────────────────────────────────────────────────────
alter table public.online_bilans enable row level security;

-- Insertion publique (formulaire anonyme via edge function en service_role
-- normalement, mais on garde insert public au cas où on POST direct
-- depuis le front anon avec captcha plus tard).
drop policy if exists "online_bilans_public_insert" on public.online_bilans;
create policy "online_bilans_public_insert"
  on public.online_bilans
  for insert
  with check (true);

-- Lecture : admin/referent voient tout ; distributor voit ses propres
-- Leads (coach_user_id = auth.uid() OU assigned_to_user_id = auth.uid()).
drop policy if exists "online_bilans_coach_admin_select" on public.online_bilans;
create policy "online_bilans_coach_admin_select"
  on public.online_bilans
  for select
  to authenticated
  using (
    exists (
      select 1 from public.users u
      where u.id = auth.uid()
        and u.active = true
        and (
          u.role in ('admin', 'referent')
          or (
            u.role = 'distributor'
            and (
              online_bilans.coach_user_id = auth.uid()
              or online_bilans.assigned_to_user_id = auth.uid()
            )
          )
        )
    )
  );

-- Update : admin/referent partout ; distributor sur ses Leads.
drop policy if exists "online_bilans_coach_admin_update" on public.online_bilans;
create policy "online_bilans_coach_admin_update"
  on public.online_bilans
  for update
  to authenticated
  using (
    exists (
      select 1 from public.users u
      where u.id = auth.uid()
        and u.active = true
        and (
          u.role in ('admin', 'referent')
          or (
            u.role = 'distributor'
            and (
              online_bilans.coach_user_id = auth.uid()
              or online_bilans.assigned_to_user_id = auth.uid()
            )
          )
        )
    )
  );

-- Delete : admin only (garde-fou — un distributor ne supprime pas un Lead).
drop policy if exists "online_bilans_admin_delete" on public.online_bilans;
create policy "online_bilans_admin_delete"
  on public.online_bilans
  for delete
  to authenticated
  using (
    exists (
      select 1 from public.users u
      where u.id = auth.uid()
        and u.active = true
        and u.role = 'admin'
    )
  );

comment on table public.online_bilans is
  'Chantier #1 Bilan Online (2026-05-17) : Leads entrants depuis le formulaire bilan online publique. Insert anonyme (edge function submit-online-bilan), read coach assigné + admin/referent. Conversion vers clients via converted_to_client_id.';

comment on column public.online_bilans.payload is
  'Form complet étapes 3-5 (vécu, habitudes, budget, activité). Champs top-level réservés à ce qui sert au kanban/listing.';

comment on column public.online_bilans.lead_status is
  'Pipeline Lead séparé de LifecycleStatus client. Valeurs : new → contact → qualified (puis converted_to_client_id) ; ou to_recontact → relance → lost.';
