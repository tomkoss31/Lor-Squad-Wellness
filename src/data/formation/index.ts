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
  getNextFormationStep,
  type NextFormationStep,
  type NextFormationStepKind,
} from "./parcours";
export {
  formatModuleShort,
  formatModuleLong,
  formatModulePosition,
  formatModuleRefInternal,
} from "./labels";
export {
  FORMATION_TOOLKIT,
  TOOLKIT_PROSPECTION,
  TOOLKIT_BILAN,
  TOOLKIT_SUIVI,
  TOOLKIT_BUSINESS,
  getToolkitItemBySlug,
} from "./boite-a-outils-content";
