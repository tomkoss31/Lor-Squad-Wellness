-- =============================================================================
-- Chantier Protocole de suivi (2026-04-20)
-- Log des messages envoyés par le coach dans le cadre du protocole 5 étapes
-- (J+1, J+3, J+7, J+10, J+14). Le contenu éditorial vit dans le code
-- (src/data/followUpProtocol.ts). Seul le tracking "envoyé / pas envoyé"
-- atterrit ici.
--
-- À EXÉCUTER DANS SUPABASE STUDIO → SQL EDITOR.
-- =============================================================================

create table if not exists public.follow_up_protocol_log (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  coach_id uuid not null references public.users(id) on delete cascade,
  step_id text not null check (step_id in ('j1', 'j3', 'j7', 'j10', 'j14')),
  sent_at timestamptz not null default now(),
  notes text,
  unique (client_id, step_id)
);

create index if not exists idx_follow_up_protocol_log_client
  on public.follow_up_protocol_log(client_id);

create index if not exists idx_follow_up_protocol_log_coach
  on public.follow_up_protocol_log(coach_id);

comment on table public.follow_up_protocol_log is
  'Chantier Protocole de suivi (2026-04-20) : log des messages envoyés au client '
  'dans le cadre du protocole 5 étapes. Unique(client_id, step_id) : un seul log '
  'par étape et par client. Le contenu du message reste dans le code.';

-- ─── RLS ────────────────────────────────────────────────────────────────────
alter table public.follow_up_protocol_log enable row level security;

-- Lecture : le coach lit les logs de son périmètre (admin / référent / owner),
-- même règle que pour les autres tables via can_access_owner(distributor_id).
-- Ici on filtre via le coach_id du log : cohérent avec "je vois ce que mon
-- équipe a envoyé".
create policy "follow_up_protocol_log_select"
  on public.follow_up_protocol_log for select
  using (public.can_access_owner(coach_id));

-- Insert : seul le user connecté peut logger en son propre nom.
create policy "follow_up_protocol_log_insert"
  on public.follow_up_protocol_log for insert
  with check (coach_id = (select auth.uid()));

-- Update : le coach (et son périmètre) peut éditer les notes.
create policy "follow_up_protocol_log_update"
  on public.follow_up_protocol_log for update
  using (public.can_access_owner(coach_id));

-- Delete : idem.
create policy "follow_up_protocol_log_delete"
  on public.follow_up_protocol_log for delete
  using (public.can_access_owner(coach_id));
