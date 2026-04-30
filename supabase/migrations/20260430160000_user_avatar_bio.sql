-- =============================================================================
-- User avatar + bio (2026-04-30)
--
-- Ajout :
--   - users.avatar_url : URL publique de l'avatar (Supabase Storage bucket)
--   - users.bio : courte presentation 200 chars max
--
-- Bucket Storage 'user-avatars' :
--   - Public read (avatars affiches partout dans l'app)
--   - Auth write : un user peut UPLOAD/UPDATE/DELETE son propre avatar
--     (path = <user_id>/avatar.webp)
-- =============================================================================

begin;

-- ─── 1. Colonnes users ──────────────────────────────────────────────────────
alter table public.users
  add column if not exists avatar_url text,
  add column if not exists bio text;

-- Contrainte longueur bio
alter table public.users
  drop constraint if exists users_bio_length;
alter table public.users
  add constraint users_bio_length check (bio is null or char_length(bio) <= 200);

comment on column public.users.avatar_url is
  'URL publique avatar (Supabase Storage bucket user-avatars). Carre 1:1 WebP recommande.';
comment on column public.users.bio is
  'Bio courte (max 200 chars). Affichee sur fiche team + popup distri.';

-- ─── 2. Bucket Storage user-avatars ─────────────────────────────────────────
-- Insert dans storage.buckets si pas deja la
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'user-avatars',
  'user-avatars',
  true, -- public read
  2 * 1024 * 1024, -- 2 MB max par fichier
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = true,
  file_size_limit = 2 * 1024 * 1024,
  allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp'];

-- ─── 3. RLS policies sur le bucket ──────────────────────────────────────────
-- Public READ : tout le monde peut voir les avatars
drop policy if exists "Public can read user avatars" on storage.objects;
create policy "Public can read user avatars"
  on storage.objects for select
  using (bucket_id = 'user-avatars');

-- Auth WRITE : un user peut upload son propre avatar (path = userId/...)
drop policy if exists "Users can upload own avatar" on storage.objects;
create policy "Users can upload own avatar"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'user-avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Users can update own avatar" on storage.objects;
create policy "Users can update own avatar"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'user-avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Users can delete own avatar" on storage.objects;
create policy "Users can delete own avatar"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'user-avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

commit;
