-- =============================================================================
-- Système Spotlights / Changelog distri (2026-05-04)
--
-- Permet d'annoncer les nouvelles features de l'app aux distri (et admin) :
--   - Cloche dans le header avec compteur unread
--   - Popup auto à la 1ère ouverture après publication (skippable)
--   - Page /developpement/nouveautes qui liste l'historique
--
-- Règle dev associée (mémo CLAUDE.md) : à chaque feature livrée, créer une
-- entrée app_announcements avec un titre clair et un lien vers la fonctionnalité.
-- =============================================================================

begin;

-- ─── 1. app_announcements ──────────────────────────────────────────────────
create table if not exists public.app_announcements (
  id uuid primary key default gen_random_uuid(),
  /** Titre court et clair (ex. "Cahier de bord disponible !"). */
  title text not null,
  /** Corps du message (markdown autorisé : **gras**, *italique*, listes). */
  body text not null,
  /** Emoji affiché en header (ex. "📔", "🎯", "⚡"). */
  emoji text default '✨',
  /** Couleur d'accent token CSS (ex. "var(--ls-gold)"). Pour l'instant
      simple text qu'on map côté front. */
  accent text default 'gold' check (accent in ('gold', 'teal', 'coral', 'purple')),
  /** Lien optionnel vers une page de l'app (ex. "/cahier-de-bord"). */
  link_path text,
  /** Label du bouton CTA (ex. "Découvrir"). Null = pas de CTA. */
  link_label text,
  /** Audience cible. */
  audience text not null default 'all' check (audience in ('all', 'distri', 'admin')),
  /** Date de publication (date à laquelle l'annonce devient visible). */
  published_at timestamptz not null default now(),
  /** Optionnel : date d'expiration (ex. annonce promo limitée). */
  expires_at timestamptz,
  /** Auteur (admin qui a publié, traçabilité). */
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now()
);

comment on table public.app_announcements is
  'Changelog distri : annonces de nouvelles features ou messages importants. Affichées via cloche header + popup + page /developpement/nouveautes.';

create index if not exists idx_announcements_published
  on public.app_announcements(published_at desc);

-- ─── 2. user_announcement_reads ─────────────────────────────────────────
-- 1 row par (user, announcement) que l'utilisateur a lue/dismissée.
create table if not exists public.user_announcement_reads (
  user_id uuid not null references public.users(id) on delete cascade,
  announcement_id uuid not null references public.app_announcements(id) on delete cascade,
  /** Quand l'utilisateur a fermé/dismissé l'annonce. */
  read_at timestamptz not null default now(),
  primary key (user_id, announcement_id)
);

comment on table public.user_announcement_reads is
  'Tracking des annonces lues par chaque user. Pour calculer le compteur unread + masquer le popup au 2ème passage.';

create index if not exists idx_announcement_reads_user
  on public.user_announcement_reads(user_id);

-- ─── 3. RLS ────────────────────────────────────────────────────────────────
alter table public.app_announcements enable row level security;
alter table public.user_announcement_reads enable row level security;

-- Tout le monde peut lire les annonces qui le concernent (audience match
-- + published_at <= now() + (expires_at null ou expires_at > now())).
drop policy if exists "announcements_read_by_audience" on public.app_announcements;
create policy "announcements_read_by_audience" on public.app_announcements
  for select using (
    published_at <= now()
    and (expires_at is null or expires_at > now())
    and (
      audience = 'all'
      or (audience = 'admin' and exists (select 1 from public.users where id = auth.uid() and role = 'admin'))
      or (audience = 'distri' and auth.uid() is not null)
    )
  );

-- Seul un admin peut créer / modifier / supprimer.
drop policy if exists "announcements_admin_write" on public.app_announcements;
create policy "announcements_admin_write" on public.app_announcements
  for all using (
    exists (select 1 from public.users where id = auth.uid() and role = 'admin')
  ) with check (
    exists (select 1 from public.users where id = auth.uid() and role = 'admin')
  );

-- Reads : chaque user gère ses propres reads.
drop policy if exists "announcement_reads_own" on public.user_announcement_reads;
create policy "announcement_reads_own" on public.user_announcement_reads
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ─── 4. Seed initial : les 4 dernières features livrées ───────────────────
-- Insérées par admin (Mélanie ou Thomas), avec created_by null pour le seed.
-- On fait des INSERT IF NOT EXISTS pour ne pas dupliquer si on relance la migration.

insert into public.app_announcements (id, title, body, emoji, accent, link_path, link_label, audience, published_at)
select
  gen_random_uuid(),
  'Mon développement : ton nouveau hub',
  'Tous tes outils d''apprentissage en un seul endroit : Academy, modules formation, boîte à outils, cahier de bord, simulateur EBE et le tuto FLEX. Plus besoin de chercher, c''est centralisé.',
  '🎓',
  'gold',
  '/developpement',
  'Découvrir le hub',
  'all',
  now()
where not exists (
  select 1 from public.app_announcements where title = 'Mon développement : ton nouveau hub'
);

insert into public.app_announcements (id, title, body, emoji, accent, link_path, link_label, audience, published_at)
select
  gen_random_uuid(),
  'Cahier de bord interactif',
  'Trace ton protocole 21 jours cobaye, gère ta liste 100 connaissances et tiens un journal EBE perso. Tout reste privé et te suit dans le temps.',
  '📔',
  'coral',
  '/cahier-de-bord',
  'Ouvrir mon cahier',
  'all',
  now() - interval '1 minute'
where not exists (
  select 1 from public.app_announcements where title = 'Cahier de bord interactif'
);

insert into public.app_announcements (id, title, body, emoji, accent, link_path, link_label, audience, published_at)
select
  gen_random_uuid(),
  'Simulateur EBE : entraîne-toi sans risque',
  'Mène un EBE complet face à un faux prospect scripté. 6 étapes, 3 choix par étape, scoring sur 60 et debrief pédagogique. Idéal avant un vrai RDV.',
  '🎯',
  'purple',
  '/simulateur-ebe',
  'Démarrer un EBE',
  'all',
  now() - interval '2 minutes'
where not exists (
  select 1 from public.app_announcements where title = 'Simulateur EBE : entraîne-toi sans risque'
);

insert into public.app_announcements (id, title, body, emoji, accent, link_path, link_label, audience, published_at)
select
  gen_random_uuid(),
  'Comment marche FLEX : le guide',
  'Le moteur 5-3-1 expliqué pas à pas : pourquoi des cibles, comment lire le check-in, que veulent dire les couleurs, exemple concret jour par jour.',
  '⚡',
  'teal',
  '/developpement/flex-explique',
  'Lire le guide',
  'all',
  now() - interval '3 minutes'
where not exists (
  select 1 from public.app_announcements where title = 'Comment marche FLEX : le guide'
);

commit;
