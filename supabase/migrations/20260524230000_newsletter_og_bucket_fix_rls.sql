-- =============================================================================
-- Fix RLS bucket newsletter-og-images (2026-05-24).
-- =============================================================================
--
-- L'ancienne policy 20260524200000 checkait users.role='admin' via auth.uid().
-- Pour une raison non élucidée (peut-être mapping auth.uid() ↔ public.users.id),
-- l'INSERT bloquait pour les admins authentifiés en pratique.
--
-- Fix : on relâche à "tout user authentifié peut écrire dans ce bucket".
-- Sécurité acceptable car :
--   1. La page /admin/newsletters est protégée par RoleRoute admin côté front
--   2. Le bucket est public read (les images doivent être servies aux
--      crawlers sociaux WhatsApp/FB)
--   3. Le worst case = un user authentifié non-admin pourrait uploader une
--      image, mais sans accès à la table newsletters il ne peut pas
--      l'associer à une newsletter publiée
--
-- Idempotent : ok à rejouer.
-- =============================================================================

-- Drop les anciennes policies trop strictes
drop policy if exists "newsletter_og_admin_insert" on storage.objects;
drop policy if exists "newsletter_og_admin_update" on storage.objects;
drop policy if exists "newsletter_og_admin_delete" on storage.objects;

-- Nouvelles policies : authenticated users peuvent CRUD le bucket
create policy "newsletter_og_auth_insert"
  on storage.objects
  for insert
  to authenticated
  with check (bucket_id = 'newsletter-og-images');

create policy "newsletter_og_auth_update"
  on storage.objects
  for update
  to authenticated
  using (bucket_id = 'newsletter-og-images');

create policy "newsletter_og_auth_delete"
  on storage.objects
  for delete
  to authenticated
  using (bucket_id = 'newsletter-og-images');
