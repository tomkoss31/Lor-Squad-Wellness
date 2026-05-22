-- =============================================================================
-- Passive Supervisor (chantier Aurélie 2026-05-22)
--
-- Distri Supervisor 50% qui ne fait pas le business mais a une downline qui
-- génère. Veut juste voir ses gains en lecture seule, SANS accès aux fiches
-- clients sous elle (confidentialité).
--
-- Approche : extension users.is_passive_supervisor + table token magic link.
-- L'accès passe par /distri-passif?token=... (pas de session Supabase).
-- Toutes les données sont récupérées via edge function service_role qui
-- agrège (montant gagné, downline anonymisée).
-- =============================================================================

begin;

alter table public.users
  add column if not exists is_passive_supervisor boolean not null default false;

create index if not exists idx_users_passive_supervisor
  on public.users(is_passive_supervisor)
  where is_passive_supervisor = true;

comment on column public.users.is_passive_supervisor is
  'Chantier 2026-05-22 : distri Supervisor passif (ne fait pas le business). Accès via magic link uniquement, page /distri-passif rentabilité read-only. Pas d''accès clients/agenda/etc.';

-- Table tokens magic link pour login passif
create table if not exists public.passive_supervisor_accounts (
  id uuid not null default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  token text not null unique,
  created_at timestamptz not null default now(),
  created_by uuid null references public.users(id) on delete set null,
  last_seen_at timestamptz null,
  revoked_at timestamptz null,
  primary key (id),
  unique (user_id)
);

create index if not exists idx_passive_supervisor_token
  on public.passive_supervisor_accounts(token)
  where revoked_at is null;

comment on table public.passive_supervisor_accounts is
  'Tokens magic link pour les distri passifs. 1 token / user. Lookup via /distri-passif?token=X dans edge function passive-supervisor-data.';

-- RLS lock : aucune écriture/lecture côté authenticated (tout via service_role)
alter table public.passive_supervisor_accounts enable row level security;

drop policy if exists passive_acc_admin_read on public.passive_supervisor_accounts;
create policy passive_acc_admin_read on public.passive_supervisor_accounts
  for select to authenticated
  using (
    exists (select 1 from public.users u where u.id = auth.uid() and u.role = 'admin' and u.active = true)
  );

drop policy if exists passive_acc_no_write on public.passive_supervisor_accounts;
create policy passive_acc_no_write on public.passive_supervisor_accounts
  for all to authenticated
  using (false)
  with check (false);

commit;
