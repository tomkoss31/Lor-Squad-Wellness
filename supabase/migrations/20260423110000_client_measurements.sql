-- Chantier Module Mensurations (2026-04-24).
-- Table client_measurements : 10 points de mesure cm par session.
-- Saisissable par le coach propriétaire du dossier OU par le client
-- lui-même via son compte app (client_app_accounts.auth_user_id).
--
-- Idempotent : ok à rejouer.

create table if not exists public.client_measurements (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,

  -- Mesures (en cm, numeric 5,2 → jusqu'à 999.99)
  neck numeric(5,2),
  chest numeric(5,2),
  waist numeric(5,2),
  hips numeric(5,2),
  thigh_left numeric(5,2),
  thigh_right numeric(5,2),
  arm_left numeric(5,2),
  arm_right numeric(5,2),
  calf_left numeric(5,2),
  calf_right numeric(5,2),

  -- Meta
  measured_at timestamptz not null default now(),
  measured_by_type text not null check (measured_by_type in ('coach', 'client')),
  measured_by_user_id uuid references public.users(id) on delete set null,
  notes text,

  created_at timestamptz not null default now()
);

create index if not exists idx_client_measurements_client_date
  on public.client_measurements(client_id, measured_at desc);

alter table public.client_measurements enable row level security;

-- ─── RLS : coach propriétaire OU admin ──────────────────────────────────
drop policy if exists "measurements_owner_admin_select" on public.client_measurements;
create policy "measurements_owner_admin_select"
  on public.client_measurements
  for select
  to authenticated
  using (
    exists (
      select 1 from public.clients c
      where c.id = client_measurements.client_id
        and (
          c.distributor_id = auth.uid()
          or exists (
            select 1 from public.users u
            where u.id = auth.uid() and u.role = 'admin' and u.active = true
          )
        )
    )
  );

drop policy if exists "measurements_owner_admin_insert" on public.client_measurements;
create policy "measurements_owner_admin_insert"
  on public.client_measurements
  for insert
  to authenticated
  with check (
    exists (
      select 1 from public.clients c
      where c.id = client_measurements.client_id
        and (
          c.distributor_id = auth.uid()
          or exists (
            select 1 from public.users u
            where u.id = auth.uid() and u.role = 'admin' and u.active = true
          )
        )
    )
  );

drop policy if exists "measurements_owner_admin_update" on public.client_measurements;
create policy "measurements_owner_admin_update"
  on public.client_measurements
  for update
  to authenticated
  using (
    exists (
      select 1 from public.clients c
      where c.id = client_measurements.client_id
        and (
          c.distributor_id = auth.uid()
          or exists (
            select 1 from public.users u
            where u.id = auth.uid() and u.role = 'admin' and u.active = true
          )
        )
    )
  );

drop policy if exists "measurements_owner_admin_delete" on public.client_measurements;
create policy "measurements_owner_admin_delete"
  on public.client_measurements
  for delete
  to authenticated
  using (
    exists (
      select 1 from public.clients c
      where c.id = client_measurements.client_id
        and (
          c.distributor_id = auth.uid()
          or exists (
            select 1 from public.users u
            where u.id = auth.uid() and u.role = 'admin' and u.active = true
          )
        )
    )
  );

-- ─── RLS : client voit ses propres mesures (via app PWA) ────────────────
drop policy if exists "measurements_client_self_select" on public.client_measurements;
create policy "measurements_client_self_select"
  on public.client_measurements
  for select
  to authenticated
  using (
    exists (
      select 1 from public.client_app_accounts caa
      where caa.client_id = client_measurements.client_id
        and caa.auth_user_id = auth.uid()
    )
  );

drop policy if exists "measurements_client_self_insert" on public.client_measurements;
create policy "measurements_client_self_insert"
  on public.client_measurements
  for insert
  to authenticated
  with check (
    measured_by_type = 'client'
    and exists (
      select 1 from public.client_app_accounts caa
      where caa.client_id = client_measurements.client_id
        and caa.auth_user_id = auth.uid()
    )
  );

comment on table public.client_measurements is
  'Chantier Mensurations (2026-04-24) : 10 points de mesure par session, saisissable coach ou client.';
