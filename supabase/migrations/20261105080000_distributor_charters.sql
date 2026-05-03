-- =============================================================================
-- Charte du Distributeur (2026-05-03)
--
-- Migration de la charte localStorage → DB. Une row par user.
-- Permet :
--   - Sync cross-device de la charte signée
--   - Visibilité admin via /distributeurs/:id/charte (V2)
--   - Workflow co-signature sponsor direct (parent_user_id) ou admin
--
-- 3 signatures visibles dans le doc :
--   1. distri lui-même (signature_data_url + signed_at)
--   2. cosigner = sponsor direct OU admin (cosigner_*)
--   3. Co-fondateurs Mélanie & Thomas (statique, pas en DB)
-- =============================================================================

begin;

create table if not exists public.distributor_charters (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,

  -- Champs remplis par le distri
  pourquoi_text text,
  objectif_12_mois text,

  -- Signature distri (canvas → base64 PNG dataURL)
  signature_data_url text,
  signed_at timestamptz,

  -- Co-signature (sponsor direct N+1 OU admin)
  cosigner_id uuid references public.users(id) on delete set null,
  cosigner_name text,
  cosigner_role text,
  cosigner_signature_data_url text,
  cosigned_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (user_id)
);

comment on table public.distributor_charters is
  'Charte du Distributeur Lor''Squad — version persistée en DB. 1 row par user. Co-signée par sponsor direct ou admin.';

create index if not exists idx_charters_user on public.distributor_charters(user_id);
create index if not exists idx_charters_cosigner on public.distributor_charters(cosigner_id) where cosigner_id is not null;

-- Trigger updated_at
create or replace function public.touch_charter_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists tg_charter_updated on public.distributor_charters;
create trigger tg_charter_updated
  before update on public.distributor_charters
  for each row execute function public.touch_charter_updated_at();

-- ─── RLS ────────────────────────────────────────────────────────────────────
alter table public.distributor_charters enable row level security;

-- Own (distri lit/écrit sa propre charte)
drop policy if exists "charters_own_select" on public.distributor_charters;
create policy "charters_own_select" on public.distributor_charters
  for select using (user_id = auth.uid());

drop policy if exists "charters_own_insert" on public.distributor_charters;
create policy "charters_own_insert" on public.distributor_charters
  for insert with check (user_id = auth.uid());

drop policy if exists "charters_own_update" on public.distributor_charters;
create policy "charters_own_update" on public.distributor_charters
  for update using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Sponsor N+1 direct : peut lire + co-signer (update cosigner_*)
drop policy if exists "charters_sponsor_select" on public.distributor_charters;
create policy "charters_sponsor_select" on public.distributor_charters
  for select using (
    exists (
      select 1 from public.users u
      where u.id = distributor_charters.user_id
        and u.parent_user_id = auth.uid()
    )
  );

drop policy if exists "charters_sponsor_update" on public.distributor_charters;
create policy "charters_sponsor_update" on public.distributor_charters
  for update using (
    exists (
      select 1 from public.users u
      where u.id = distributor_charters.user_id
        and u.parent_user_id = auth.uid()
    )
  );

-- Admin : all
drop policy if exists "charters_admin_all" on public.distributor_charters;
create policy "charters_admin_all" on public.distributor_charters
  for all using (
    exists (select 1 from public.users where id = auth.uid() and role = 'admin')
  );

commit;
