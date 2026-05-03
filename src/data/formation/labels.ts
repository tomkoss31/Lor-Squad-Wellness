// =============================================================================
// Formation labels — helpers de formatage user-friendly (2026-11-04)
//
// Convertit les references Notion internes (ex: "1.4", "M1.4") en labels
// pedagogiques pour l UI. Les distri ne devraient jamais voir "M1.4" en
// raw — toujours "Module 4".
//
// La data garde `module.number = "1.4"` (utile pour Thomas + Mel qui
// referencent Notion). L UI utilise ces helpers.
// =============================================================================

/**
 * Convertit un module.number "1.4" en label user-friendly "Module 4".
 *
 * @example
 * formatModuleShort("1.4") // "Module 4"
 * formatModuleShort("2.2") // "Module 2"
 */
export function formatModuleShort(moduleNumber: string): string {
  const parts = moduleNumber.split(".");
  if (parts.length === 2 && parts[1]) {
    return `Module ${parts[1]}`;
  }
  return `Module ${moduleNumber}`;
}

/**
 * Convertit un module.number en label long pedagogique.
 *
 * @example
 * formatModuleLong("1.4", "Démarrer") // "Niveau 1 · Démarrer · Module 4"
 */
export function formatModuleLong(moduleNumber: string, levelTitle?: string): string {
  const parts = moduleNumber.split(".");
  if (parts.length === 2 && parts[1]) {
    const levelPart = levelTitle ? `Niveau ${parts[0]} · ${levelTitle}` : `Niveau ${parts[0]}`;
    return `${levelPart} · Module ${parts[1]}`;
  }
  return moduleNumber;
}

/**
 * Position du module dans son niveau, format "X sur N".
 *
 * @example
 * formatModulePosition("1.4", 5) // "Module 4 sur 5"
 */
export function formatModulePosition(moduleNumber: string, totalInLevel: number): string {
  const parts = moduleNumber.split(".");
  const idx = parts[1] ?? "?";
  return `Module ${idx} sur ${totalInLevel}`;
}

/**
 * Reference Notion interne (ex: "Réf. 1.4"). A utiliser en text-hint
 * discret quand on veut garder la trace pour Thomas/Mel sans encombrer.
 */
export function formatModuleRefInternal(moduleNumber: string): string {
  return `Réf. ${moduleNumber}`;
}
