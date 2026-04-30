-- =============================================================================
-- Audit 2026-04-30 : ajout des index manquants sur les Foreign Keys
--
-- Postgres ne cree PAS d index automatique pour une FK (contrairement a la PK).
-- Sans index sur la colonne enfant, les jointures LEFT JOIN sur cette FK font
-- un sequential scan, et les DELETE/UPDATE sur le parent sont lents (Postgres
-- doit verifier l integrite referentielle en seq scan).
--
-- V2 corrigee : seulement les FK qui existent vraiment dans le schema.
-- Tous les index sont CREATE INDEX IF NOT EXISTS = idempotent.
-- =============================================================================

begin;

-- ─── assessments.client_id (FK clients) ────────────────────────────────────
create index if not exists idx_assessments_client_id
  on public.assessments(client_id);

-- ─── pv_transactions ───────────────────────────────────────────────────────
create index if not exists idx_pv_transactions_client_id
  on public.pv_transactions(client_id);
create index if not exists idx_pv_transactions_responsible_id
  on public.pv_transactions(responsible_id);
create index if not exists idx_pv_transactions_date
  on public.pv_transactions(date);

-- ─── pv_client_products ────────────────────────────────────────────────────
-- Note : (client_id, product_id) est deja unique → couvre lookups composites.
-- On ajoute index solo sur responsible_id pour les queries "produits du distri".
create index if not exists idx_pv_client_products_responsible_id
  on public.pv_client_products(responsible_id);

-- ─── client_messages (client_id et distributor_id sont en text) ───────────
create index if not exists idx_client_messages_client_id
  on public.client_messages(client_id);
create index if not exists idx_client_messages_distributor_id
  on public.client_messages(distributor_id);
create index if not exists idx_client_messages_created_at
  on public.client_messages(created_at desc);

-- ─── clients.distributor_id (FK users) ─────────────────────────────────────
create index if not exists idx_clients_distributor_id
  on public.clients(distributor_id);

-- ─── push_subscriptions.user_id ────────────────────────────────────────────
create index if not exists idx_push_subscriptions_user_id
  on public.push_subscriptions(user_id);

commit;
