-- =============================================================================
-- BBC — Lot 1 : connecteur + socle objet club (2026-07-24)
--
-- Chantier "mode BBC" (Breakfast Budget Club). 100 % ADDITIF :
--   - un compte classic garde club_model='classic' → aucun changement
--   - un client standard garde ebe_bbc=false → sa PWA reste la PWA actuelle
--
-- ⚠️ INERTE tant que `supabase db push --linked` n'est pas lancé. Nouvelles
-- colonnes/tables uniquement — AUCUN impact sur la logique existante (PV,
-- bilans, RDV, messagerie…). Base Supabase partagée dev/prod : coordonner
-- avant le push (cf. CLAUDE.md).
-- =============================================================================

begin;

-- 1. Drapeau de modèle de club sur le coach. 'classic' = app actuelle,
--    'bbc' = environnement dédié Breakfast Budget Club.
alter table public.users
  add column if not exists club_model text not null default 'classic'
  check (club_model in ('classic', 'bbc'));

-- 2. Objet club (multi-club dès le schéma ; usage mono au départ).
--    settings jsonb = TOUTES les valeurs de config métier, jamais en dur :
--    horaires des appels (non tranchés — décision orga), barème des cœurs,
--    créneau d'ouverture. Les défauts sont indicatifs et modifiables par club.
create table if not exists public.clubs (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references public.users (id) on delete cascade,
  name text not null,
  city text,
  slug text unique,
  active boolean not null default true,
  settings jsonb not null default '{
    "open_hours": "7h-11h",
    "calls": {
      "appel_ambassadeur": {"days": ["lundi", "jeudi"], "time": "20:00"},
      "atelier_coeurs":    {"days": ["mardi", "samedi"], "time": "20:00"},
      "coach_academy":     {"days": ["mercredi"], "time": "19:00"}
    },
    "hearts_bareme": {
      "2": "25% de remise",
      "3": "10 visites offertes",
      "5": "30 visites offertes"
    }
  }'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists clubs_owner_idx on public.clubs (owner_user_id);

alter table public.clubs enable row level security;

-- Le propriétaire gère ses clubs ; les admins gèrent tout.
drop policy if exists "clubs_owner_manage" on public.clubs;
create policy "clubs_owner_manage"
  on public.clubs for all
  using (
    owner_user_id = auth.uid()
    or exists (select 1 from public.users u where u.id = auth.uid() and u.role = 'admin')
  )
  with check (
    owner_user_id = auth.uid()
    or exists (select 1 from public.users u where u.id = auth.uid() and u.role = 'admin')
  );

-- 3. Aiguillage par client : EBE BBC → app membre BBC. + rattachement au club.
alter table public.clients
  add column if not exists ebe_bbc boolean not null default false;
alter table public.clients
  add column if not exists club_id uuid references public.clubs (id) on delete set null;

commit;
