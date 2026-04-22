-- =============================================================================
-- Chantier Notif in-app temps réel (2026-04-23)
--
-- Active la publication Realtime Supabase sur client_messages pour que le
-- frontend puisse s'abonner aux INSERTs et afficher un toast dès qu'un
-- nouveau message client arrive — sans rafraîchir la page.
--
-- À EXÉCUTER DANS SUPABASE STUDIO → SQL EDITOR.
--
-- Notes :
--   - Supabase crée `supabase_realtime` par défaut. La commande est
--     idempotente : si la table est déjà dedans, la 2e exécution est no-op.
--   - Les RLS existantes de client_messages (lecture coach via
--     can_access_owner) continuent de s'appliquer côté Realtime — un
--     coach ne recevra que les INSERTs pour SES propres clients.
-- =============================================================================

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'client_messages'
  ) then
    alter publication supabase_realtime add table public.client_messages;
    raise notice 'client_messages ajoutée à supabase_realtime.';
  else
    raise notice 'client_messages déjà présente dans supabase_realtime.';
  end if;
end $$;
