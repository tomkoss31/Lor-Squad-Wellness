-- =============================================================================
-- Chantier #2 — Check-list quotidienne Co-pilote (étape 2.1)
-- Date : 2026-05-20
--
-- Table coach_daily_actions : persistance de la check-list matinale du
-- coach (5 actions/jour : F1/F21, Leads, dormants, RDV, liste 100).
--
-- Pattern : 1 ligne par (coach_id, action_key, date). Au matin du jour
-- suivant, les `skipped` et `pending` repartent en `pending` (logique
-- côté hook, pas en SQL).
-- =============================================================================

create table if not exists public.coach_daily_actions (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references public.users(id) on delete cascade,
  action_key text not null,
  action_date date not null default current_date,
  status text not null default 'pending' check (status in ('pending', 'done', 'skipped')),
  done_at timestamptz null,
  skipped_at timestamptz null,
  meta jsonb null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (coach_id, action_key, action_date)
);

create index if not exists idx_coach_daily_actions_coach_date
  on public.coach_daily_actions (coach_id, action_date desc);

create index if not exists idx_coach_daily_actions_status
  on public.coach_daily_actions (status) where status = 'pending';

-- Trigger updated_at
create or replace function public.coach_daily_actions_set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists trg_coach_daily_actions_updated_at on public.coach_daily_actions;
create trigger trg_coach_daily_actions_updated_at
  before update on public.coach_daily_actions
  for each row execute function public.coach_daily_actions_set_updated_at();

-- RLS : un coach voit/modifie uniquement ses propres lignes.
-- Admin voit tout (cohérent avec autres tables coach).
alter table public.coach_daily_actions enable row level security;

drop policy if exists "coach_daily_actions_select_own" on public.coach_daily_actions;
create policy "coach_daily_actions_select_own"
  on public.coach_daily_actions
  for select
  using (
    coach_id = auth.uid()
    or exists (
      select 1 from public.users u
      where u.id = auth.uid() and u.role = 'admin'
    )
  );

drop policy if exists "coach_daily_actions_insert_own" on public.coach_daily_actions;
create policy "coach_daily_actions_insert_own"
  on public.coach_daily_actions
  for insert
  with check (coach_id = auth.uid());

drop policy if exists "coach_daily_actions_update_own" on public.coach_daily_actions;
create policy "coach_daily_actions_update_own"
  on public.coach_daily_actions
  for update
  using (coach_id = auth.uid())
  with check (coach_id = auth.uid());

drop policy if exists "coach_daily_actions_delete_own" on public.coach_daily_actions;
create policy "coach_daily_actions_delete_own"
  on public.coach_daily_actions
  for delete
  using (coach_id = auth.uid());

comment on table public.coach_daily_actions is
  'Check-list quotidienne Co-pilote (chantier #2 2026-05-20). 1 row par (coach, action_key, date). action_key : f1_f21 | leads | dormants | rdv_today | liste_100 | grow_network (fallback).';
