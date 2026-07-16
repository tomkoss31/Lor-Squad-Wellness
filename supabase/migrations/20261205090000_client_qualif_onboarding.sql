-- =============================================================================
-- client_qualif_onboarding — chantier Qualif (2026-07-16).
--
-- Parcours d'onboarding post-paiement sur /qualif/:token (règlement/RGPD →
-- saveur → scan app → pesée/mensurations → Telegram). 1 ligne par client créé
-- par ce flow — sert aussi de state pour reprendre le parcours si la page est
-- rechargée en cours de route (le front relit cette ligne au montage via
-- l'edge qualif-bootstrap).
--
-- Écriture : AUCUNE policy insert/update → edges service_role uniquement
-- (qualif-bootstrap crée la ligne, qualif-update la fait avancer). Même
-- discipline que bilan_orders : jamais un client anonyme n'écrit directement
-- via RLS sur une table qui matérialise une fiche client réelle.
-- =============================================================================

create table if not exists public.client_qualif_onboarding (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null unique references public.clients (id) on delete cascade,
  online_bilan_id uuid references public.online_bilans (id) on delete set null,
  coach_user_id uuid references public.users (id) on delete set null,
  consent_at timestamptz,
  flavor_product_id text,
  flavor_skipped boolean not null default false,
  app_opened_at timestamptz,
  telegram_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists client_qualif_onboarding_bilan_idx
  on public.client_qualif_onboarding (online_bilan_id);

alter table public.client_qualif_onboarding enable row level security;

-- Lecture : le coach voit ses propres onboardings, l'admin voit tout.
-- Écriture : aucune policy → service_role uniquement (edges qualif-*).
drop policy if exists "client_qualif_onboarding_coach_select" on public.client_qualif_onboarding;
create policy "client_qualif_onboarding_coach_select"
  on public.client_qualif_onboarding
  for select
  to authenticated
  using (
    coach_user_id = auth.uid()
    or exists (
      select 1 from public.users u
      where u.id = auth.uid() and u.role = 'admin' and u.active = true
    )
  );
