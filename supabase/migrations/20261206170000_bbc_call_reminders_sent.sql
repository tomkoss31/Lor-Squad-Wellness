-- =============================================================================
-- BBC — anti-doublon des rappels d'appels (2026-07-24).
-- 1 ligne par (inscription, type de rappel) : midi / m30 / m15 / after.
-- Écrit par l'edge `bbc-call-reminder` en service_role ; lisible par le coach
-- concerné. 100 % additif.
-- =============================================================================

create table if not exists public.club_call_reminders_sent (
  registration_id uuid not null references public.club_call_registrations (id) on delete cascade,
  kind text not null,
  sent_at timestamptz not null default now(),
  primary key (registration_id, kind)
);

alter table public.club_call_reminders_sent enable row level security;

drop policy if exists "call_reminders_read_own" on public.club_call_reminders_sent;
create policy "call_reminders_read_own"
  on public.club_call_reminders_sent for select
  using (exists (
    select 1 from public.club_call_registrations r
    where r.id = registration_id and r.coach_user_id = auth.uid()
  ));
