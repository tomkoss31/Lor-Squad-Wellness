// =============================================================================
// Registre des chapitres Formation V2 (2026-08-04).
//
// UN SEUL endroit pour la liste des chapitres — c'est le hub que Thomas veut
// « facile à retrouver ». On ajoute un chapitre ICI et il apparaît dans le
// parcours.
//
// Parcours du débutant, dans l'ordre : Comprendre → Trouver → Le bilan →
// Vendre & suivre → Dupliquer. Tout le contenu est PIOCHÉ dans l'existant
// (Boîte à outils, scripts BBC, cockpit Go Pro) — on relie, on ne réécrit pas.
// =============================================================================

import type { Chapter } from "../types";
import { CHAPITRE_COMPRENDRE } from "./chapitreComprendre";
import { CHAPITRE_TROUVER } from "./chapitreTrouver";
import { CHAPITRE_BILAN } from "./chapitreBilan";
import { CHAPITRE_VENDRE_SUIVRE } from "./chapitreVendreSuivre";
import { CHAPITRE_DUPLIQUER } from "./chapitreDupliquer";

export const FORMATION_V2_CHAPTERS: Chapter[] = [
  CHAPITRE_COMPRENDRE,
  CHAPITRE_TROUVER,
  CHAPITRE_BILAN,
  CHAPITRE_VENDRE_SUIVRE,
  CHAPITRE_DUPLIQUER,
];

/** Toutes les leçons à plat, dans l'ordre du parcours. */
export const FORMATION_V2_LESSONS = FORMATION_V2_CHAPTERS.flatMap((c) => c.lessons);

export const FORMATION_V2_TOTAL = FORMATION_V2_LESSONS.length;
