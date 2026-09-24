-- =============================================================================
-- Hotfix 24/09/2026 : le journal côté coach ne s'ouvrait plus.
--
-- `journal_semaine_coach` est SECURITY INVOKER (le RLS de la coach décide).
-- La migration 20261215780000 lui a fait calculer les kcal de chaque ligne
-- avec `_journal_kcal_ligne`, fermée à `authenticated` comme toutes les
-- `_journal_*` internes → « permission denied for function _journal_kcal_ligne »,
-- et TOUT le journal coach tombait (« Ça n'a pas marché »), fiche comprise.
--
-- `_journal_kcal_ligne` ne fait qu'un calcul sur le catalogue `journal_aliments`
-- (public, aucune donnée de cliente) : l'ouvrir aux comptes connectés ne
-- découvre rien. `anon` reste fermé.
-- =============================================================================

grant execute on function public._journal_kcal_ligne(text, numeric, integer, numeric) to authenticated;
