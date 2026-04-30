-- =============================================================================
-- Phase 1 RGPD — Table client_consents (2026-04-30)
--
-- Tracabilite des consentements art. 9 (donnees de sante) attestes par le coach
-- pour le client lors du 1er bilan. Immutable apres insertion.
--
-- Workflow :
--   1. Coach ouvre le 1er bilan d'un client (type=initial)
--   2. Modale ConsentDialog s'affiche (texte legal + case a cocher)
--   3. Coach coche + clique 'Continuer' -> INSERT dans cette table
--   4. Re-ouverture du bilan / autres bilans : pas de modale (deja consenti)
--
-- 1 row par client (UNIQUE constraint). UPDATE/DELETE bloques (immutabilite art. 7).
-- =============================================================================

begin;

create table if not exists public.client_consents (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  coach_id uuid not null references public.users(id) on delete restrict,
  consented_at timestamptz not null default now(),
  consent_version text not null default 'v1',
  ip_hash text,
  user_agent text,
  unique(client_id)
);

create index if not exists client_consents_client_id_idx
  on public.client_consents(client_id);
create index if not exists client_consents_coach_id_idx
  on public.client_consents(coach_id);

-- RLS
alter table public.client_consents enable row level security;

drop policy if exists "client_consents_select_authenticated" on public.client_consents;
create policy "client_consents_select_authenticated"
  on public.client_consents for select
  to authenticated
  using (true);

drop policy if exists "client_consents_insert_self" on public.client_consents;
create policy "client_consents_insert_self"
  on public.client_consents for insert
  to authenticated
  with check (auth.uid() = coach_id);

-- Pas de policy UPDATE/DELETE = bloque par defaut avec RLS enabled

comment on table public.client_consents is
  'Phase 1 RGPD — Tracabilite des consentements art. 9 (donnees de sante) '
  'attestes par le coach pour le client. 1 row par client, immutable.';

commit;
