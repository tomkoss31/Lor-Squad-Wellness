// =============================================================================
// Formation — barrel exports (2026-04-30)
//
// Point d entree unique pour tout consommateur de la data Formation.
// Phase 2 : TS statique. Phase 3 : sera remplace par des hooks DB qui
// gardent la meme signature pour un swap transparent.
// =============================================================================

export * from "./types";
export {
  FORMATION_LEVELS,
  getFormationLevelBySlug,
  getFormationLevelById,
} from "./parcours";
export {
  FORMATION_CATEGORIES,
  getFormationCategoryBySlug,
} from "./bibliotheque";
