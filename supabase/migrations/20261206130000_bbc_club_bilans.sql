-- =============================================================================
-- BBC — bilan des 10 visites (2026-07-24). Le rendez-vous charnière : à la
-- 10ᵉ visite, une checklist de 9 étapes (module Formation 04).
-- `steps` jsonb = { "<clé étape>": true } ; completed_at posé quand tout est
-- coché. 100 % additif — nouvelle table uniquement.
-- =============================================================================

create table if not exists public.club_bilans (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  coach_user_id uuid not null references public.users (id) on delete cascade,
  steps jsonb not null default '{}'::jsonb,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists club_bilans_client_idx on public.club_bilans (client_id);
create index if not exists club_bilans_coach_idx on public.club_bilans (coach_user_id);

alter table public.club_bilans enable row level security;
drop policy if exists "club_bilans_own" on public.club_bilans;
create policy "club_bilans_own"
  on public.club_bilans for all
  using (coach_user_id = auth.uid())
  with check (coach_user_id = auth.uid());
