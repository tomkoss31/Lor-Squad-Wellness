-- =============================================================================
-- Chantier #8 étape 8.8b (2026-05-24) — Bucket Supabase Storage pour OG images.
-- =============================================================================
--
-- Stockage des images OG 1200×630 PNG générées côté admin via html2canvas.
-- URL publique : <supabase>/storage/v1/object/public/newsletter-og-images/<slug>.png
-- Utilisée en meta og:image sur /news/:slug.
--
-- Idempotent : ok à rejouer.
-- =============================================================================

-- Création du bucket public (lecture anon, upload admin only via RLS)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'newsletter-og-images',
  'newsletter-og-images',
  true,                          -- public read = OG image accessible aux crawlers
  3 * 1024 * 1024,               -- 3 MB max (un PNG 1200×630 fait ~200-500 KB)
  array['image/png', 'image/jpeg', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- RLS : upload + update + delete admin only.
-- Read public déjà géré par le flag bucket.public=true.

drop policy if exists "newsletter_og_admin_insert" on storage.objects;
create policy "newsletter_og_admin_insert"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'newsletter-og-images'
    and exists (
      select 1 from public.users u
      where u.id = auth.uid()
        and u.role = 'admin'
    )
  );

drop policy if exists "newsletter_og_admin_update" on storage.objects;
create policy "newsletter_og_admin_update"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'newsletter-og-images'
    and exists (
      select 1 from public.users u
      where u.id = auth.uid()
        and u.role = 'admin'
    )
  );

drop policy if exists "newsletter_og_admin_delete" on storage.objects;
create policy "newsletter_og_admin_delete"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'newsletter-og-images'
    and exists (
      select 1 from public.users u
      where u.id = auth.uid()
        and u.role = 'admin'
    )
  );

-- Note : pas de COMMENT ON POLICY car requiert superuser sur storage.objects
-- en Supabase managed. Les policies parlent d'elles-mêmes via leur nom.
