-- =============================================================================
-- Chantier #3 — Module Prospection cold mobile-first (2026-05-17)
--
-- Catalogue partagé public (lecture par tous les distri) :
--   - prospection_markets   : marchés cibles (drapeau + label)
--   - prospection_profiles  : profils cibles (perte de poids / sport / business)
--   - prospection_hashtags  : hashtags par (marché × profil)
--   - prospection_scripts   : scripts de premier contact par
--                             (marché × profil × plateforme)
--
-- Toutes ces tables sont du catalogue (configuration produit). Lecture
-- publique anon + auth, écriture admin uniquement.
--
-- Le tracking des sessions distri (`prospection_targets`) sera ajouté
-- en V2 (étape 3.7 du brainstorm) — pas nécessaire au lancement V1.
-- =============================================================================

begin;

-- ─── 1. Markets ─────────────────────────────────────────────────────────────
create table if not exists public.prospection_markets (
  code        text primary key,
  flag        text not null,
  label       text not null,
  description text,
  position    integer not null default 0,
  active      boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

comment on table public.prospection_markets is
  'Chantier #3 — Marchés cibles pour la prospection cold (drapeau pays + label affichage). Code court (fr/en/es/pt/tr/hi).';

-- ─── 2. Profiles ────────────────────────────────────────────────────────────
create table if not exists public.prospection_profiles (
  slug        text primary key,
  emoji       text not null,
  label       text not null,
  description text,
  position    integer not null default 0,
  active      boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

comment on table public.prospection_profiles is
  'Chantier #3 — Profils cibles (weight/sport/business). Source affichée step 2 du module.';

-- ─── 3. Hashtags ────────────────────────────────────────────────────────────
create table if not exists public.prospection_hashtags (
  id            uuid primary key default gen_random_uuid(),
  market_code   text not null references public.prospection_markets(code) on delete cascade,
  profile_slug  text not null references public.prospection_profiles(slug) on delete cascade,
  hashtag       text not null,
  position      integer not null default 0,
  active        boolean not null default true,
  created_at    timestamptz not null default now(),
  unique (market_code, profile_slug, hashtag)
);

create index if not exists idx_prospection_hashtags_lookup
  on public.prospection_hashtags(market_code, profile_slug, position)
  where active = true;

comment on table public.prospection_hashtags is
  'Chantier #3 — Hashtags Insta/FB à utiliser pour cibler, par (marché × profil).';

-- ─── 4. Scripts ─────────────────────────────────────────────────────────────
create table if not exists public.prospection_scripts (
  id            uuid primary key default gen_random_uuid(),
  market_code   text not null references public.prospection_markets(code) on delete cascade,
  profile_slug  text not null references public.prospection_profiles(slug) on delete cascade,
  platform      text not null check (platform in ('insta', 'fb', 'whatsapp', 'telegram', 'linkedin', 'sms')),
  body          text not null,
  tip           text,
  position      integer not null default 0,
  active        boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists idx_prospection_scripts_lookup
  on public.prospection_scripts(market_code, profile_slug, platform, position)
  where active = true;

comment on table public.prospection_scripts is
  'Chantier #3 — Scripts de premier contact par (marché × profil × plateforme). Body contient variables [prénom]/[name] etc., interpolées par le front.';

-- ─── 5. RLS : lecture publique, écriture admin only ─────────────────────────
alter table public.prospection_markets   enable row level security;
alter table public.prospection_profiles  enable row level security;
alter table public.prospection_hashtags  enable row level security;
alter table public.prospection_scripts   enable row level security;

drop policy if exists "prospection_markets_select_public"  on public.prospection_markets;
drop policy if exists "prospection_profiles_select_public" on public.prospection_profiles;
drop policy if exists "prospection_hashtags_select_public" on public.prospection_hashtags;
drop policy if exists "prospection_scripts_select_public"  on public.prospection_scripts;

create policy "prospection_markets_select_public"
  on public.prospection_markets  for select to anon, authenticated using (active = true);
create policy "prospection_profiles_select_public"
  on public.prospection_profiles for select to anon, authenticated using (active = true);
create policy "prospection_hashtags_select_public"
  on public.prospection_hashtags for select to anon, authenticated using (active = true);
create policy "prospection_scripts_select_public"
  on public.prospection_scripts  for select to anon, authenticated using (active = true);

drop policy if exists "prospection_markets_admin_write"  on public.prospection_markets;
drop policy if exists "prospection_profiles_admin_write" on public.prospection_profiles;
drop policy if exists "prospection_hashtags_admin_write" on public.prospection_hashtags;
drop policy if exists "prospection_scripts_admin_write"  on public.prospection_scripts;

create policy "prospection_markets_admin_write"
  on public.prospection_markets  for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "prospection_profiles_admin_write"
  on public.prospection_profiles for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "prospection_hashtags_admin_write"
  on public.prospection_hashtags for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "prospection_scripts_admin_write"
  on public.prospection_scripts  for all to authenticated using (public.is_admin()) with check (public.is_admin());

commit;
