-- =============================================================================
-- Liste privée « à relancer » du coach (2026-06-30).
--
-- BUT : permettre à Mélanie de noter « penser à recontacter X » SANS que le
-- client/prospect reçoive quoi que ce soit. In-app uniquement.
--
-- GARANTIE anti-notification (le point clé) : cette table vit VOLONTAIREMENT
-- HORS de `follow_ups`. Or :
--   • l'email de confirmation client = trigger sur `follow_ups`,
--   • le push + email de rappel J-1/J-2h = cron qui lit `follow_ups`.
-- → ni le trigger ni le cron ne lisent `coach_reminders`. Donc un rappel ici
--   ne peut PAS déclencher d'email ni de push. Aucun trigger/cron branché.
-- Les vrais RDV (et la stratégie email rdv-confirm-client) restent intacts.
-- =============================================================================

create table if not exists public.coach_reminders (
  id         uuid primary key default gen_random_uuid(),
  coach_id   uuid not null references public.users(id) on delete cascade,
  client_id  uuid references public.clients(id) on delete set null,  -- optionnel (client existant)
  label      text,        -- nom libre (prospect / hors-fiche) si pas de client_id
  note       text,        -- pourquoi le relancer
  remind_on  date,        -- optionnel : ressort en haut ce jour-là (in-app)
  status     text not null default 'pending' check (status in ('pending','done')),
  created_at timestamptz not null default now(),
  done_at    timestamptz
);

create index if not exists idx_coach_reminders_coach
  on public.coach_reminders(coach_id, status);

comment on table public.coach_reminders is
  'Liste privée « à relancer » du coach. In-app uniquement. AUCUN trigger/cron → jamais d''email ni de push. Distinct de follow_ups (vrais RDV).';

-- RLS : le coach gère SES rappels ; admin voit tout. Écriture directe autorisée
-- (with check coach_id = auth.uid()) — pas de RPC nécessaire, et surtout aucun
-- effet de bord notification possible.
alter table public.coach_reminders enable row level security;

drop policy if exists coach_reminders_select on public.coach_reminders;
create policy coach_reminders_select on public.coach_reminders
  for select using (
    coach_id = auth.uid()
    or exists (select 1 from public.users u where u.id = auth.uid() and u.role = 'admin')
  );

drop policy if exists coach_reminders_insert on public.coach_reminders;
create policy coach_reminders_insert on public.coach_reminders
  for insert with check (coach_id = auth.uid());

drop policy if exists coach_reminders_update on public.coach_reminders;
create policy coach_reminders_update on public.coach_reminders
  for update using (coach_id = auth.uid()) with check (coach_id = auth.uid());

drop policy if exists coach_reminders_delete on public.coach_reminders;
create policy coach_reminders_delete on public.coach_reminders
  for delete using (coach_id = auth.uid());
