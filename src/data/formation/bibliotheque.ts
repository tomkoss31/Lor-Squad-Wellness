// =============================================================================
// Formation — bibliotheque par theme (2026-04-30)
//
// 4 categories transverses pour le distri experimente qui pioche selon
// son besoin du moment.
//
// Phase 2 : ressources vides (placeholder "Contenu a venir"). Le contenu
// Notion sera importe ici en Phase 3 (mapping ci-dessous selon decision
// validee par Thomas).
//
// Mapping prevu (Phase 3) :
//   🎯 Prospection & Recrutement
//      <- M1.2 (liste) + F2/F3/F5/F14 + Scripts EBE/Quick Start
//   📊 Bilan & Body Scan
//      <- M1.3 (bilan pro 10 points) + Etape 1-2 tunnel + Scripts bilan
//   💪 Suivi & Fidelisation
//      <- M1.4 (closing) + M1.5 (recos) + F4 (follow-up) + relance
//   🚀 Business & 100 clubs
//      <- F16 (8-4-1) + F10 + N3 complet + Pilotage P1-P6 + Engagement
// =============================================================================

import type { FormationCategory } from "./types";

export const FORMATION_CATEGORIES: FormationCategory[] = [
  {
    slug: "prospection",
    title: "Prospection & Recrutement",
    emoji: "🎯",
    accent: "gold",
    description: "Trouver des prospects, inviter sans presser, transformer un client en distri.",
    resources: [],
  },
  {
    slug: "bilan",
    title: "Bilan & Body Scan",
    emoji: "📊",
    accent: "teal",
    description: "Le bilan en 10 points clés. Ton format pro, scripts d'accroche, lecture body scan.",
    resources: [],
  },
  {
    slug: "suivi",
    title: "Suivi & Fidélisation",
    emoji: "💪",
    accent: "purple",
    description: "Ton 1er closing, demander des recos, réveiller un client dormant, follow-up J+3 / J+7.",
    resources: [],
  },
  {
    slug: "business",
    title: "Business & 100 clubs",
    emoji: "🚀",
    accent: "coral",
    description: "Méthode 8-4-1, pilotage quotidien, calculateur d'objectifs, vers les royalties.",
    resources: [],
  },
];

/** Helper : trouve une categorie par son slug d URL. */
export function getFormationCategoryBySlug(slug: string): FormationCategory | undefined {
  return FORMATION_CATEGORIES.find((c) => c.slug === slug);
}
