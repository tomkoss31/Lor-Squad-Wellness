-- Chantier Welcome Page + Magic Links (2026-04-24).
-- Table auto_login_tokens : magic link 24h max 3 usages pour client/
-- distri qui a créé son compte dans le navigateur et installe la PWA
-- ensuite. Evite de refaire le login manuel dans la PWA.
--
-- RLS : service_role only (les Edge Functions gèrent la génération +
-- consommation). Aucun accès direct depuis le front.
--
-- Idempotent : ok à rejouer.

create table if not exists public.auto_login_tokens (
  id uuid primary key default gen_random_uuid(),
  token uuid not null default gen_random_uuid() unique,
  user_auth_id uuid not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '24 hours'),
  consumed_at timestamptz,
  usage_count int not null default 0,
  max_usage int not null default 3
);

create index if not exists idx_auto_login_token_lookup
  on public.auto_login_tokens(token)
  where consumed_at is null;

create index if not exists idx_auto_login_user
  on public.auto_login_tokens(user_auth_id, created_at desc);

alter table public.auto_login_tokens enable row level security;

-- service_role only : les Edge Functions (generate + consume) accèdent
-- via la service_role key. Aucun accès direct anon ou authenticated.
drop policy if exists "auto_login_tokens_service_role_only" on public.auto_login_tokens;
create policy "auto_login_tokens_service_role_only"
  on public.auto_login_tokens
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

comment on table public.auto_login_tokens is
  'Chantier Welcome Page (2026-04-24) : magic link 24h max 3 usages pour auto-login cross-device (navigateur → PWA).';
