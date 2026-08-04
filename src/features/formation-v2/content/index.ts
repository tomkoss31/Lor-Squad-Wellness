// =============================================================================
// Registre des chapitres Formation V2 (2026-08-04).
//
// UN SEUL endroit pour la liste des chapitres — c'est le hub que Thomas veut
// « facile à retrouver ». On ajoute un chapitre ICI et il apparaît dans le
// parcours. Lot 1 : un chapitre de démonstration, rempli de contenu réel.
// =============================================================================

import type { Chapter } from "../types";
import { CHAPITRE_TROUVER } from "./chapitreTrouver";

export const FORMATION_V2_CHAPTERS: Chapter[] = [
  CHAPITRE_TROUVER,
];

/** Toutes les leçons à plat, dans l'ordre du parcours. */
export const FORMATION_V2_LESSONS = FORMATION_V2_CHAPTERS.flatMap((c) => c.lessons);

export const FORMATION_V2_TOTAL = FORMATION_V2_LESSONS.length;
