-- Chantier RGPD partage public (2026-04-24).
-- Table logs de consultation des liens /partage/:token.
-- Chaque vue → 1 row (token_id, ip_hash SHA256, user_agent, viewed_at).
-- Permet au coach de voir le compteur de vues + analytics.
--
-- RLS :
--   - INSERT : service_role uniquement (via Edge Function)
--   - SELECT : coach propriétaire ou admin
--   - UPDATE/DELETE : personne (logs immutables)
--
-- Idempotent.

create table if not exists public.client_public_share_views (
  id uuid primary key default gen_random_uuid(),
  token_id uuid not null references public.client_public_share_tokens(id) on delete cascade,
  viewed_at timestamptz not null default now(),
  ip_hash text,
  user_agent text
);

create index if not exists idx_public_share_views_token
  on public.client_public_share_views(token_id, viewed_at desc);

alter table public.client_public_share_views enable row level security;

-- ─── SELECT : coach propriétaire ou admin ──────────────────────────────
drop policy if exists "public_share_views_coach_admin_select" on public.client_public_share_views;
create policy "public_share_views_coach_admin_select"
  on public.client_public_share_views
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.client_public_share_tokens t
      join public.clients c on c.id = t.client_id
      where t.id = client_public_share_views.token_id
        and (
          c.distributor_id = auth.uid()
          or exists (
            select 1 from public.users u
            where u.id = auth.uid() and u.role = 'admin' and u.active = true
          )
        )
    )
  );

-- PAS de policies INSERT/UPDATE/DELETE → seul service_role (Edge
-- Function resolve-public-share) peut insérer. Logs immutables.

comment on table public.client_public_share_views is
  'RGPD : logs de consultation /partage/:token — ip_hash SHA256, user_agent. Insert via Edge Function service_role uniquement.';
