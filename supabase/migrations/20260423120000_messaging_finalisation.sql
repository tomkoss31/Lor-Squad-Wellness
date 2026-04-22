-- =============================================================================
-- Chantier Messagerie finalisée (2026-04-23)
--
-- Ajout de 2 colonnes sur client_messages pour gérer les workflows
-- "archivé" et "marqué comme traité" côté coach :
--   - archived_at : quand le coach archive le message (sort de l'inbox).
--   - resolved_at : quand le coach marque comme traité (différent de
--     "répondu" — le coach peut résoudre sans répondre : décision
--     externe, appel téléphonique, etc.).
--
-- read_at existait déjà depuis le chantier 1 (messagerie bidirectionnelle)
-- et garde sa sémantique — accusé de lecture côté coach.
--
-- À EXÉCUTER DANS SUPABASE STUDIO → SQL EDITOR.
-- =============================================================================

begin;

alter table public.client_messages
  add column if not exists archived_at timestamptz;

alter table public.client_messages
  add column if not exists resolved_at timestamptz;

-- Index partiels pour accélérer les queries "non archivé" / "non traité".
-- Les clauses WHERE x IS NULL sont les plus fréquentes (onglet inbox).
create index if not exists idx_client_messages_archived_null
  on public.client_messages(archived_at) where archived_at is null;

create index if not exists idx_client_messages_resolved_null
  on public.client_messages(resolved_at) where resolved_at is null;

create index if not exists idx_client_messages_read_null
  on public.client_messages(read_at) where read_at is null;

-- Les RLS de client_messages existantes (chantier 1) autorisent déjà le
-- coach à UPDATE ses propres messages via can_access_owner(distributor_id).
-- Rien à ajouter côté policies.

commit;
