-- =============================================================================
-- FIX RLS : récursion infinie sur users (2026-07-12)
-- =============================================================================
-- Symptôme : « infinite recursion detected in policy for relation "users" » à
-- toute écriture sur users (ex. sauvegarde config boutique dans /ma-boutique).
--
-- Cause : la policy UPDATE `users_update_admin` contenait
--   EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role='admin')
-- → une sous-requête sur `users` DANS une policy de `users` = récursion (chaque
-- ligne relue re-déclenche la policy). Postgres évalue TOUTES les policies
-- permissives d'un UPDATE → même un update « self » plantait.
--
-- Fix : on supprime ce doublon récursif. La capacité admin reste via la policy
-- « users update admin » qui utilise is_admin() (SECURITY DEFINER → bypass RLS,
-- pas de récursion) ; l'auto-édition via users_update_self (id = auth.uid()).
-- Déjà appliqué en prod (base partagée). Idempotent.
-- =============================================================================

drop policy if exists "users_update_admin" on public.users;
