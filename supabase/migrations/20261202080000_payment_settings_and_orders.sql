-- =============================================================================
-- Paiement — Phase 2 page Résultat Bilan (chantier 2026-06-11).
--
-- 1. coach_payment_settings : configuration d'encaissement PAR COACH.
--    Multi-fournisseur (décision Thomas : « Square pour ma part, on verra pour
--    les distris si Stripe ou autre »). Les credentials appartiennent au coach,
--    qui gère SA ligne (RLS). Les edges lisent en service_role.
--
-- 2. bilan_orders : commandes initiées depuis la page premium /resultat-bilan
--    (« Je démarre »). Insert UNIQUEMENT via edge service_role (prix recalculé
--    serveur depuis pv_programs — jamais le prix envoyé par le client).
--    Le webhook Square passe status → paid.
-- =============================================================================

create table if not exists public.coach_payment_settings (
  coach_user_id uuid primary key references public.users (id) on delete cascade,
  provider text not null default 'square' check (provider in ('square', 'stripe')),
  active boolean not null default false,
  -- Square (credentials du compte Square DU coach)
  square_access_token text,
  square_location_id text,
  square_merchant_id text,
  square_webhook_signature_key text,
  square_env text not null default 'production' check (square_env in ('sandbox', 'production')),
  -- Stripe (futur — « on verra pour les distris »)
  stripe_secret_key text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.coach_payment_settings enable row level security;

-- Le coach gère SA configuration (ses propres credentials). Pas de policy
-- admin-tout : un admin n'a pas à lire les access tokens des autres comptes.
drop policy if exists "payment_settings_own_row" on public.coach_payment_settings;
create policy "payment_settings_own_row"
  on public.coach_payment_settings
  for all
  to authenticated
  using (coach_user_id = auth.uid())
  with check (coach_user_id = auth.uid());

create table if not exists public.bilan_orders (
  id uuid primary key default gen_random_uuid(),
  online_bilan_id uuid references public.online_bilans (id) on delete set null,
  coach_user_id uuid references public.users (id) on delete set null,
  prospect_first_name text not null default '',
  program_id text not null,
  program_name text not null,
  amount_cents integer not null check (amount_cents > 0),
  currency text not null default 'EUR',
  provider text not null check (provider in ('square', 'stripe')),
  provider_payment_link_id text,
  provider_order_id text,
  payment_url text,
  status text not null default 'pending' check (status in ('pending', 'paid', 'canceled', 'failed')),
  created_at timestamptz not null default now(),
  paid_at timestamptz
);

create index if not exists bilan_orders_provider_order_idx
  on public.bilan_orders (provider_order_id);
create index if not exists bilan_orders_bilan_idx
  on public.bilan_orders (online_bilan_id);

alter table public.bilan_orders enable row level security;

-- Lecture : le coach voit ses commandes, l'admin voit tout (pour le suivi).
-- Écriture : AUCUNE policy → insert/update uniquement via edges service_role.
drop policy if exists "bilan_orders_coach_select" on public.bilan_orders;
create policy "bilan_orders_coach_select"
  on public.bilan_orders
  for select
  to authenticated
  using (
    coach_user_id = auth.uid()
    or exists (
      select 1 from public.users u
      where u.id = auth.uid() and u.role = 'admin' and u.active = true
    )
  );
