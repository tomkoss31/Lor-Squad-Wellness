// =============================================================================
// multiChoice — helpers de rétro-compatibilité pour les champs du bilan passés
// de choix unique (string) à choix multiple (string[]) le 2026-07-16.
//
// Concernés : questionnaire.snackingTrigger, snackingMoment, mainBlocker.
//
// POURQUOI : ces champs vivent dans `assessments.questionnaire` (jsonb), donc
// AUCUNE migration SQL n'est possible/nécessaire — les bilans déjà enregistrés
// contiennent encore une string ("Stress"), les nouveaux une liste
// (["Faim","Stress"]). Tout code qui LIT ces champs doit donc accepter les deux
// formes, sinon les anciens bilans s'affichent vides (perte d'info silencieuse).
//
// Règle : normaliser à la LECTURE, écrire toujours en tableau.
// =============================================================================

/** Valeur brute possible d'un champ multi : nouvelle liste, ancienne string, ou rien. */
export type MultiChoiceValue = string[] | string | null | undefined;

/**
 * Normalise en `string[]`, quelle que soit la forme stockée.
 * - `["Faim","Stress"]` → `["Faim","Stress"]`
 * - `"Stress"`          → `["Stress"]`   (ancien bilan mono)
 * - `""` / null / undefined → `[]`
 */
export function normalizeMultiValue(value: MultiChoiceValue): string[] {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed ? [trimmed] : [];
  }
  return [];
}

/** Rendu lisible pour un résumé / prompt / PDF : "Faim, Stress" (ou "" si vide). */
export function formatMultiValue(value: MultiChoiceValue, separator = ", "): string {
  return normalizeMultiValue(value).join(separator);
}

/** Test tolérant : la valeur contient-elle cette option (accepte l'ancien format) ? */
export function multiValueIncludes(value: MultiChoiceValue, option: string): boolean {
  return normalizeMultiValue(value).includes(option);
}

/**
 * Inverse de formatMultiValue : "Faim, Stress" → ["Faim","Stress"].
 * Utilisé par les écrans en saisie texte libre (EditInitialAssessmentPage), qui
 * éditent ces champs sous forme de liste séparée par des virgules.
 */
export function parseMultiInput(input: string): string[] {
  return input
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}
