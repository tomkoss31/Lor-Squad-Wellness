-- =============================================================================
-- Chantier Onboarding distributeur complet (2026-04-24)
--
-- Étend `users` avec les champs profil distributeur remplis au premier
-- login via /bienvenue-distri : phone, city, herbalife_id, avatar_url.
-- Crée le bucket `avatars` + policies RLS minimales (upload authentifié,
-- lecture publique — comme un CDN d'images de profil).
--
-- À EXÉCUTER DANS SUPABASE STUDIO → SQL EDITOR.
-- =============================================================================

begin;

-- ─── 1. Champs profil users ─────────────────────────────────────────────────
alter table public.users
  add column if not exists phone text;

alter table public.users
  add column if not exists city text;

alter table public.users
  add column if not exists herbalife_id text;

alter table public.users
  add column if not exists avatar_url text;

create index if not exists idx_users_herbalife_id
  on public.users(herbalife_id)
  where herbalife_id is not null;

comment on column public.users.phone is
  'Chantier Onboarding distri (2026-04-24) : rempli au /bienvenue-distri.';
comment on column public.users.city is
  'Chantier Onboarding distri (2026-04-24).';
comment on column public.users.herbalife_id is
  'Chantier Onboarding distri (2026-04-24) : ID distributeur Herbalife, '
  'format libre pour V1 (sera exploité en V2 pour matching PV/commandes).';
comment on column public.users.avatar_url is
  'Chantier Onboarding distri (2026-04-24) : URL publique Supabase Storage '
  'bucket avatars. Null si pas de photo uploadée.';

-- ─── 2. Bucket storage avatars ──────────────────────────────────────────────
-- Supabase storage.buckets existe déjà (schéma système). On l'ajoute si
-- pas encore créé.
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- ─── 3. Policies RLS storage.objects ────────────────────────────────────────
-- Upload : tout user authentifié peut uploader dans le bucket avatars.
-- Contrainte de path (ex: avatars/<user_id>/...) peut être ajoutée en V2
-- pour éviter qu'un user upload dans le dossier d'un autre — pour l'instant
-- on fait confiance au front pour construire la clé avec auth.uid().

drop policy if exists "avatars_upload_authenticated" on storage.objects;
create policy "avatars_upload_authenticated"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'avatars');

drop policy if exists "avatars_update_authenticated" on storage.objects;
create policy "avatars_update_authenticated"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'avatars')
  with check (bucket_id = 'avatars');

drop policy if exists "avatars_public_read" on storage.objects;
create policy "avatars_public_read"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'avatars');

commit;
