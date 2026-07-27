-- =============================================================================
-- BBC — visites au club (2026-07-24). 100% additif.
--   - club_visits : chaque passage d'un membre (pointage 1 tap / scan QR)
--   - bbc_visit_counts() : compteur par membre pour le coach courant
--
-- INERTE tant que non poussé. Nouvelle table + 1 RPC — aucun impact existant.
-- =============================================================================

begin;

create table if not exists public.club_visits (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  coach_user_id uuid not null references public.users (id) on delete cascade,
  visited_at timestamptz not null default now()
);
create index if not exists club_visits_coach_idx on public.club_visits (coach_user_id);
create index if not exists club_visits_client_idx on public.club_visits (client_id);

alter table public.club_visits enable row level security;
drop policy if exists "club_visits_own" on public.club_visits;
create policy "club_visits_own"
  on public.club_visits for all
  using (coach_user_id = auth.uid())
  with check (coach_user_id = auth.uid());

-- Compteur de visites par membre, pour le coach appelant.
create or replace function public.bbc_visit_counts()
returns table (client_id uuid, cnt bigint)
language sql
security definer
set search_path = public
as $$
  select client_id, count(*) as cnt
  from public.club_visits
  where coach_user_id = auth.uid()
  group by client_id;
$$;
revoke all on function public.bbc_visit_counts() from public;
grant execute on function public.bbc_visit_counts() to authenticated;

commit;
