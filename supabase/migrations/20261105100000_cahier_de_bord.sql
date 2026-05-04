-- =============================================================================
-- Cahier de bord du distri (2026-05-04)
--
-- Trois sections persistées en DB :
--   1. cobaye_tracker_entries : journal 21j cobaye (1 row par jour)
--   2. cobaye_photos : photos uploadées par jour (J0/J7/J14/J21)
--   3. liste_100_contacts : ma liste 100 connaissances (formulaire)
--   4. ebe_journal_entries : notes perso post-bilan (journal,
--      complément des assessments DB principaux)
--
-- 1 row par user pour cobaye_tracker (singleton via unique).
-- Plusieurs rows pour les 3 autres tables (1-N).
-- =============================================================================

begin;

-- ─── 1. Cobaye tracker entries (1 row par user × jour) ────────────────────
create table if not exists public.cobaye_tracker_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  /** Jour de l'expérience (J0, J1, …, J21+). */
  day_number integer not null check (day_number >= 0 and day_number <= 90),
  /** Note libre du jour. */
  note text,
  /** Energie ressentie 0-10. */
  energy_level integer check (energy_level is null or (energy_level between 0 and 10)),
  /** Sommeil ressenti 0-10. */
  sleep_quality integer check (sleep_quality is null or (sleep_quality between 0 and 10)),
  /** Poids du jour (kg, optionnel). */
  weight_kg numeric(5, 2),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, day_number)
);

comment on table public.cobaye_tracker_entries is
  'Journal quotidien du protocole 21 jours cobaye. 1 row par user × day_number.';

create index if not exists idx_cobaye_tracker_user_day
  on public.cobaye_tracker_entries(user_id, day_number);

-- ─── 2. Cobaye photos ─────────────────────────────────────────────────────
create table if not exists public.cobaye_photos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  day_number integer not null check (day_number >= 0 and day_number <= 90),
  /** URL Supabase storage (bucket cobaye-photos). */
  photo_url text not null,
  /** Pose : "face" / "profil" / "autre". */
  pose text not null default 'face' check (pose in ('face', 'profil', 'autre')),
  uploaded_at timestamptz not null default now()
);

comment on table public.cobaye_photos is
  'Photos avant/après du protocole 21j cobaye. Multi-photos par day_number autorisé.';

create index if not exists idx_cobaye_photos_user_day
  on public.cobaye_photos(user_id, day_number desc);

-- ─── 3. Liste 100 contacts ────────────────────────────────────────────────
create table if not exists public.liste_100_contacts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  full_name text not null,
  /** Catégorie FRANK : Famille / Réseau / Amis / Nouveaux / Konnaissances. */
  frank_category text check (frank_category is null or frank_category in (
    'famille', 'reseau', 'amis', 'nouveaux', 'connaissances'
  )),
  /** Statut chaud / tiède / froid. */
  temperature text not null default 'froid' check (temperature in ('chaud', 'tiede', 'froid')),
  /** Statut tunnel : non-contacté / contacté / RDV calé / EBE fait / client / refus. */
  status text not null default 'non_contacte' check (status in (
    'non_contacte', 'contacte', 'rdv_cale', 'ebe_fait', 'client', 'refus'
  )),
  /** Note libre. */
  note text,
  contact_phone text,
  contact_email text,
  added_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.liste_100_contacts is
  'Liste 100 connaissances du distri. Méthode FRANK + tags chaud/tiède/froid + statut tunnel.';

create index if not exists idx_liste_100_user
  on public.liste_100_contacts(user_id, temperature, status);

-- ─── 4. Journal EBE perso (notes post-bilan, séparé des assessments) ─────
create table if not exists public.ebe_journal_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  /** Date du bilan (JJ-MM-AAAA), pas un timestamp précis. */
  ebe_date date not null,
  /** Lien optionnel vers l'assessment DB si le bilan a été enregistré.
      assessments.id est text (pas uuid), donc text ici aussi. */
  assessment_id text references public.assessments(id) on delete set null,
  /** Prénom du prospect (pour journal personnel). */
  prospect_name text,
  /** Score subjectif du distri sur la qualité de son EBE 0-10. */
  self_score integer check (self_score is null or (self_score between 0 and 10)),
  /** Ce qui a bien marché. */
  what_went_well text,
  /** Ce que je dois ajuster pour le prochain. */
  what_to_improve text,
  /** Décision client : signed / pending / refused. */
  outcome text check (outcome is null or outcome in ('signed', 'pending', 'refused')),
  recos_count integer default 0 check (recos_count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.ebe_journal_entries is
  'Journal EBE perso du distri : ressenti, leçons, recos. Complément des assessments (qui sont les bilans DB officiels).';

create index if not exists idx_ebe_journal_user
  on public.ebe_journal_entries(user_id, ebe_date desc);

-- ─── Triggers updated_at ────────────────────────────────────────────────
create or replace function public.touch_updated_at_generic() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists tg_cobaye_tracker_updated on public.cobaye_tracker_entries;
create trigger tg_cobaye_tracker_updated
  before update on public.cobaye_tracker_entries
  for each row execute function public.touch_updated_at_generic();

drop trigger if exists tg_liste_100_updated on public.liste_100_contacts;
create trigger tg_liste_100_updated
  before update on public.liste_100_contacts
  for each row execute function public.touch_updated_at_generic();

drop trigger if exists tg_ebe_journal_updated on public.ebe_journal_entries;
create trigger tg_ebe_journal_updated
  before update on public.ebe_journal_entries
  for each row execute function public.touch_updated_at_generic();

-- ─── RLS policies ──────────────────────────────────────────────────────
-- Pattern : own all (le user gère son propre cahier de bord, pas de
-- sponsor visibility — c'est strictement perso).
alter table public.cobaye_tracker_entries enable row level security;
alter table public.cobaye_photos enable row level security;
alter table public.liste_100_contacts enable row level security;
alter table public.ebe_journal_entries enable row level security;

drop policy if exists "cobaye_tracker_own" on public.cobaye_tracker_entries;
create policy "cobaye_tracker_own" on public.cobaye_tracker_entries
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "cobaye_photos_own" on public.cobaye_photos;
create policy "cobaye_photos_own" on public.cobaye_photos
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "liste_100_own" on public.liste_100_contacts;
create policy "liste_100_own" on public.liste_100_contacts
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "ebe_journal_own" on public.ebe_journal_entries;
create policy "ebe_journal_own" on public.ebe_journal_entries
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Admin peut tout voir (pour debug + accompagnement)
drop policy if exists "cobaye_tracker_admin" on public.cobaye_tracker_entries;
create policy "cobaye_tracker_admin" on public.cobaye_tracker_entries
  for all using (
    exists (select 1 from public.users where id = auth.uid() and role = 'admin')
  );

drop policy if exists "cobaye_photos_admin" on public.cobaye_photos;
create policy "cobaye_photos_admin" on public.cobaye_photos
  for all using (
    exists (select 1 from public.users where id = auth.uid() and role = 'admin')
  );

drop policy if exists "liste_100_admin" on public.liste_100_contacts;
create policy "liste_100_admin" on public.liste_100_contacts
  for all using (
    exists (select 1 from public.users where id = auth.uid() and role = 'admin')
  );

drop policy if exists "ebe_journal_admin" on public.ebe_journal_entries;
create policy "ebe_journal_admin" on public.ebe_journal_entries
  for all using (
    exists (select 1 from public.users where id = auth.uid() and role = 'admin')
  );

commit;
