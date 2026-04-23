-- Chantier RGPD partage public (2026-04-24).
-- Nouvelle table dédiée pour les tokens /partage/:token — séparée de
-- client_recaps pour ne pas polluer le flow /client/:token (app) ni
-- /recap/:token (récap bilan).
--
-- Tokens expirables (30 jours par défaut), révocables en cascade
-- quand le client révoque son consentement.
--
-- RLS stricte :
--   - SELECT public → INTERDIT (seule l'Edge Function service_role lit)
--   - SELECT/INSERT/UPDATE/DELETE pour coach propriétaire ou admin
--
-- Idempotent.

create table if not exists public.client_public_share_tokens (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  token uuid unique not null default gen_random_uuid(),
  created_by_user_id uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '30 days'),
  revoked_at timestamptz,
  view_count int not null default 0
);

create index if not exists idx_public_share_tokens_lookup
  on public.client_public_share_tokens(token)
  where revoked_at is null;

create index if not exists idx_public_share_tokens_client
  on public.client_public_share_tokens(client_id, created_at desc);

alter table public.client_public_share_tokens enable row level security;

-- ─── Coach propriétaire ou admin : tout accès ───────────────────────────
drop policy if exists "public_share_tokens_coach_admin_select" on public.client_public_share_tokens;
create policy "public_share_tokens_coach_admin_select"
  on public.client_public_share_tokens
  for select
  to authenticated
  using (
    exists (
      select 1 from public.clients c
      where c.id = client_public_share_tokens.client_id
        and (
          c.distributor_id = auth.uid()
          or exists (
            select 1 from public.users u
            where u.id = auth.uid() and u.role = 'admin' and u.active = true
          )
        )
    )
  );

drop policy if exists "public_share_tokens_coach_admin_insert" on public.client_public_share_tokens;
create policy "public_share_tokens_coach_admin_insert"
  on public.client_public_share_tokens
  for insert
  to authenticated
  with check (
    exists (
      select 1 from public.clients c
      where c.id = client_public_share_tokens.client_id
        and (
          c.distributor_id = auth.uid()
          or exists (
            select 1 from public.users u
            where u.id = auth.uid() and u.role = 'admin' and u.active = true
          )
        )
    )
  );

drop policy if exists "public_share_tokens_coach_admin_update" on public.client_public_share_tokens;
create policy "public_share_tokens_coach_admin_update"
  on public.client_public_share_tokens
  for update
  to authenticated
  using (
    exists (
      select 1 from public.clients c
      where c.id = client_public_share_tokens.client_id
        and (
          c.distributor_id = auth.uid()
          or exists (
            select 1 from public.users u
            where u.id = auth.uid() and u.role = 'admin' and u.active = true
          )
        )
    )
  );

drop policy if exists "public_share_tokens_coach_admin_delete" on public.client_public_share_tokens;
create policy "public_share_tokens_coach_admin_delete"
  on public.client_public_share_tokens
  for delete
  to authenticated
  using (
    exists (
      select 1 from public.clients c
      where c.id = client_public_share_tokens.client_id
        and (
          c.distributor_id = auth.uid()
          or exists (
            select 1 from public.users u
            where u.id = auth.uid() and u.role = 'admin' and u.active = true
          )
        )
    )
  );

-- PAS de policy pour anon/public → aucun accès direct. La résolution
-- passe OBLIGATOIREMENT par l'Edge Function resolve-public-share
-- (service_role).

-- ─── Client app : autoriser lecture/delete ses propres tokens ──────────
-- Permet au client de voir/révoquer les tokens actifs depuis son app.
drop policy if exists "public_share_tokens_client_self_select" on public.client_public_share_tokens;
create policy "public_share_tokens_client_self_select"
  on public.client_public_share_tokens
  for select
  to authenticated
  using (
    exists (
      select 1 from public.client_app_accounts caa
      where caa.client_id = client_public_share_tokens.client_id
        and caa.auth_user_id = auth.uid()
    )
  );

drop policy if exists "public_share_tokens_client_self_delete" on public.client_public_share_tokens;
create policy "public_share_tokens_client_self_delete"
  on public.client_public_share_tokens
  for delete
  to authenticated
  using (
    exists (
      select 1 from public.client_app_accounts caa
      where caa.client_id = client_public_share_tokens.client_id
        and caa.auth_user_id = auth.uid()
    )
  );

comment on table public.client_public_share_tokens is
  'Chantier RGPD partage (2026-04-24) : tokens /partage/:token expirables + révocables. Aucun accès anon — Edge Function only.';
