// =============================================================================
// leadRouting — suggestion d'attribution pour les leads CRM non attribués.
//
// Chantier refonte CRM Liste/Pipeline/Fiche détail, Phase 5 (2026-07-16).
// Décision Thomas : SUGGESTION validée par le coach, jamais de réattribution
// automatique — le lead reste où il est tant que personne n'a cliqué
// « Assigner ». Réversible, zéro risque de faire disparaître un lead de la
// vue d'un coach par erreur d'algo.
//
// Seules `online_bilans` et `prospect_leads` ont une colonne `assigned_to_
// user_id` (confirmé en base) — les recos/intentions dérivent toujours leur
// propriétaire du distributeur du client parrain, non réassignable ici.
// =============================================================================

import type { CrmTable } from "../hooks/useCrmLeads";

export function tableSupportsAssignment(table: CrmTable): boolean {
  return table === "online_bilans" || table === "prospect_leads";
}

export interface OwnerCandidate {
  id: string;
  name: string;
  /** Nombre de leads actifs (pipeline ouvert) déjà attribués à ce candidat. */
  activeLeadCount: number;
}

/**
 * Suggère le candidat le moins chargé (équilibrage simple et transparent —
 * pas de géo/disponibilité en V1, faute de données fiables pour ça). Départage
 * alphabétique si égalité, pour un résultat déterministe et explicable.
 */
export function suggestOwner(candidates: OwnerCandidate[]): OwnerCandidate | null {
  if (candidates.length === 0) return null;
  return [...candidates].sort(
    (a, b) => a.activeLeadCount - b.activeLeadCount || a.name.localeCompare(b.name, "fr"),
  )[0];
}
