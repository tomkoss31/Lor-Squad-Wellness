-- =============================================================================
-- Chantier Free PV Tracking (2026-04-20)
-- Ajoute un flag client.free_pv_tracking : quand true, ce client est sous
-- un autre superviseur, le coach n'a pas accès à ses commandes → on l'exclut
-- des listes de réassort et des alertes PV. Bilans + suivi + messages restent
-- normaux.
--
-- À EXÉCUTER DANS SUPABASE STUDIO → SQL EDITOR.
-- =============================================================================

alter table public.clients
  add column if not exists free_pv_tracking boolean not null default false;

comment on column public.clients.free_pv_tracking is
  'Chantier Free PV Tracking (2026-04-20) : quand true, le client est sous '
  'un autre superviseur. On l exclut des listes de réassort (Dashboard, '
  'Suivi PV, priorités du jour) et des alertes PV. Le reste (bilans, RDV, '
  'messages, body scan) reste normal.';

-- Index partiel : n indexe que les clients avec le flag actif (minoritaires)
-- pour accélérer les exclusions côté listes.
create index if not exists idx_clients_free_pv_tracking
  on public.clients(id)
  where free_pv_tracking = true;
