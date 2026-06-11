-- =============================================================================
-- online_bilans.result_token — token public pour la page premium « Résultat
-- Bilan » que le coach envoie manuellement au prospect (chantier 2026-06-11).
--
-- Le coach copie un lien type /resultat-bilan/<result_token>. La page est
-- publique (prospect non authentifié) et résout le token côté serveur via
-- l'edge get-online-bilan-results (service_role). On NE réutilise PAS `id`
-- comme token public pour ne pas exposer l'identifiant interne dans les liens.
-- =============================================================================

alter table public.online_bilans
  add column if not exists result_token uuid not null default gen_random_uuid();

-- Unicité (sert aussi de lookup index pour l'edge).
create unique index if not exists online_bilans_result_token_key
  on public.online_bilans (result_token);
