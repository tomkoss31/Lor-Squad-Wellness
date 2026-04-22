-- =============================================================================
-- Chantier Centre de Formation V1 (2026-04-23)
--
--   1. Table training_categories (3 niveaux : débutant / intermédiaire /
--      avancé).
--   2. Table training_resources (video | pdf | guide | external).
--   3. Table training_progress (upsert par user_id + resource_id).
--   4. RLS : lecture publique pour authentifiés sur categories/resources,
--      chaque user CRUD ses propres lignes progress.
--   5. Seed data : 3 catégories + 9 ressources V1.
--
-- À EXÉCUTER DANS SUPABASE STUDIO → SQL EDITOR.
-- =============================================================================

begin;

-- ─── 1. Tables ───────────────────────────────────────────────────────────────
create table if not exists public.training_categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  description text,
  icon_name text,
  color_ramp text not null,
  level text not null check (level in ('debutant', 'intermediaire', 'avance')),
  display_order int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.training_resources (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.training_categories(id) on delete cascade,
  slug text not null unique,
  title text not null,
  subtitle text,
  resource_type text not null check (resource_type in ('video', 'pdf', 'guide', 'external')),
  content_url text,
  internal_route text,
  duration_minutes int,
  display_order int not null default 0,
  is_new boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_training_resources_category
  on public.training_resources(category_id);

create table if not exists public.training_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  resource_id uuid not null references public.training_resources(id) on delete cascade,
  completed_at timestamptz not null default now(),
  unique (user_id, resource_id)
);

create index if not exists idx_training_progress_user
  on public.training_progress(user_id);

-- ─── 2. RLS ─────────────────────────────────────────────────────────────────
alter table public.training_categories enable row level security;
alter table public.training_resources enable row level security;
alter table public.training_progress enable row level security;

-- Lecture publique pour tous les authentifiés
drop policy if exists "training_categories_read" on public.training_categories;
create policy "training_categories_read"
  on public.training_categories for select
  to authenticated using (true);

drop policy if exists "training_resources_read" on public.training_resources;
create policy "training_resources_read"
  on public.training_resources for select
  to authenticated using (true);

-- Admin uniquement pour écriture (insert/update/delete) sur catégories et ressources
drop policy if exists "training_categories_admin_write" on public.training_categories;
create policy "training_categories_admin_write"
  on public.training_categories for all
  to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "training_resources_admin_write" on public.training_resources;
create policy "training_resources_admin_write"
  on public.training_resources for all
  to authenticated using (public.is_admin()) with check (public.is_admin());

-- Progression : chaque user gère uniquement ses propres lignes.
drop policy if exists "training_progress_own_select" on public.training_progress;
create policy "training_progress_own_select"
  on public.training_progress for select
  to authenticated using (auth.uid() = user_id);

drop policy if exists "training_progress_own_insert" on public.training_progress;
create policy "training_progress_own_insert"
  on public.training_progress for insert
  to authenticated with check (auth.uid() = user_id);

drop policy if exists "training_progress_own_update" on public.training_progress;
create policy "training_progress_own_update"
  on public.training_progress for update
  to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "training_progress_own_delete" on public.training_progress;
create policy "training_progress_own_delete"
  on public.training_progress for delete
  to authenticated using (auth.uid() = user_id);

-- ─── 3. Seed catégories ─────────────────────────────────────────────────────
insert into public.training_categories (slug, title, description, icon_name, color_ramp, level, display_order)
values
  ('basics', 'Les bases', 'Les fondamentaux pour démarrer ton activité distributeur.', 'circle', 'teal', 'debutant', 1),
  ('scripts', 'Scripts & approche', 'Les bons mots pour aborder, convaincre, fidéliser.', 'quote', 'amber', 'intermediaire', 2),
  ('line-dev', 'Développer ta ligne', 'Recruter, animer, dupliquer. Le chemin vers 100 clubs.', 'chart', 'purple', 'avance', 3)
on conflict (slug) do update set
  title = excluded.title,
  description = excluded.description,
  icon_name = excluded.icon_name,
  color_ramp = excluded.color_ramp,
  level = excluded.level,
  display_order = excluded.display_order;

-- ─── 4. Seed ressources (9) ─────────────────────────────────────────────────
-- Note : les content_url YouTube et chemins PDF sont des placeholders.
-- Thomas pourra les éditer en SQL direct ou via l'interface admin d'une
-- phase future. Les ressources de type 'guide' pointent vers les routes
-- existantes (/guide et /guide-suivi, conservées).

-- ── Bases
insert into public.training_resources (category_id, slug, title, subtitle, resource_type, content_url, internal_route, duration_minutes, display_order, is_new)
select
  c.id, v.slug, v.title, v.subtitle, v.resource_type, v.content_url, v.internal_route, v.duration_minutes, v.display_order, v.is_new
from public.training_categories c,
(values
  ('guide-rdv', 'Guide du rendez-vous', 'Repères simples pour conduire le premier bilan', 'guide', null::text, '/guide'::text, 10, 1, false),
  ('guide-suivi', 'Guide du suivi client', 'Le protocole J+1 → J+10 pas à pas', 'guide', null::text, '/guide-suivi'::text, 12, 2, false),
  ('regles-or-distri', '5 règles d''or du distributeur', 'Les principes fondamentaux expliqués par Eric Worre', 'video', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'::text, null::text, 12, 3, false)
) as v(slug, title, subtitle, resource_type, content_url, internal_route, duration_minutes, display_order, is_new)
where c.slug = 'basics'
on conflict (slug) do update set
  title = excluded.title,
  subtitle = excluded.subtitle,
  resource_type = excluded.resource_type,
  content_url = excluded.content_url,
  internal_route = excluded.internal_route,
  duration_minutes = excluded.duration_minutes,
  display_order = excluded.display_order,
  is_new = excluded.is_new;

-- ── Scripts & approche
insert into public.training_resources (category_id, slug, title, subtitle, resource_type, content_url, internal_route, duration_minutes, display_order, is_new)
select
  c.id, v.slug, v.title, v.subtitle, v.resource_type, v.content_url, v.internal_route, v.duration_minutes, v.display_order, v.is_new
from public.training_categories c,
(values
  ('regles-or-video', 'Les 5 règles d''or du distributeur (par Eric Worre)', 'Vidéo inspiration · 12 minutes', 'video', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'::text, null::text, 12, 1, true),
  ('script-go-pro-indirect', 'Script Go Pro — approche indirecte', 'Le framework éprouvé pour aborder sans effrayer', 'pdf', '/pdfs/script-go-pro-indirect.pdf'::text, null::text, 5, 2, false),
  ('script-curiosite', 'Approche curiosité', 'Provoquer la conversation sans pitcher', 'guide', null::text, '/formation/scripts/curiosite'::text, 8, 3, false)
) as v(slug, title, subtitle, resource_type, content_url, internal_route, duration_minutes, display_order, is_new)
where c.slug = 'scripts'
on conflict (slug) do update set
  title = excluded.title,
  subtitle = excluded.subtitle,
  resource_type = excluded.resource_type,
  content_url = excluded.content_url,
  internal_route = excluded.internal_route,
  duration_minutes = excluded.duration_minutes,
  display_order = excluded.display_order,
  is_new = excluded.is_new;

-- ── Développer ta ligne
insert into public.training_resources (category_id, slug, title, subtitle, resource_type, content_url, internal_route, duration_minutes, display_order, is_new)
select
  c.id, v.slug, v.title, v.subtitle, v.resource_type, v.content_url, v.internal_route, v.duration_minutes, v.display_order, v.is_new
from public.training_categories c,
(values
  ('after-work', 'Organiser un After Work', 'Format, invités, déroulé minute par minute', 'guide', null::text, '/formation/line-dev/after-work'::text, 15, 1, false),
  ('tiktok-manychat', 'Recruter via TikTok + ManyChat', 'Système de prospection automatisé', 'video', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'::text, null::text, 20, 2, false),
  ('100-clubs', 'Modèle business 100 clubs', 'La carte de route pour dupliquer sans te cramer', 'guide', null::text, '/formation/line-dev/100-clubs'::text, 18, 3, false)
) as v(slug, title, subtitle, resource_type, content_url, internal_route, duration_minutes, display_order, is_new)
where c.slug = 'line-dev'
on conflict (slug) do update set
  title = excluded.title,
  subtitle = excluded.subtitle,
  resource_type = excluded.resource_type,
  content_url = excluded.content_url,
  internal_route = excluded.internal_route,
  duration_minutes = excluded.duration_minutes,
  display_order = excluded.display_order,
  is_new = excluded.is_new;

commit;
