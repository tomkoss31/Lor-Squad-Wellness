// =============================================================================
// Formation — parcours guide (2026-04-30)
//
// 3 niveaux empiles : Démarrer (0->500 PV) / Construire (500->4000 PV) /
// Dupliquer (Leader & royalties).
//
// Phase 2 : modules a vide (shells). Le contenu Notion est en cours de
// rangement par Thomas — sera importe en Phase 3 dans des tables
// formation_modules / formation_lessons.
//
// Hierarchie de deblocage :
//   - N1 toujours debloque
//   - N2 debloque quand N1 a 100 % de modules valides
//   - N3 debloque quand N2 a 100 % de modules valides
// =============================================================================

import type { FormationLevel } from "./types";

export const FORMATION_LEVELS: FormationLevel[] = [
  {
    id: "demarrer",
    slug: "demarrer",
    order: 1,
    title: "Démarrer",
    subtitle: "0 → 500 PV",
    description: "Tes 30 premiers jours. Comprendre l'opportunité, faire ton 1er bilan, signer ton 1er client.",
    icon: "🌱",
    accent: "gold",
    modules: [
      // Phase 3 : sera rempli avec M1.1 → M1.5 (Notion)
    ],
    unlockedBy: undefined,
  },
  {
    id: "construire",
    slug: "construire",
    order: 2,
    title: "Construire",
    subtitle: "500 → 4 000 PV",
    description: "Passer du loisir au business. Tunnel marketing 7 étapes, plan d'action quotidien, recrutement.",
    icon: "🚀",
    accent: "teal",
    modules: [
      // Phase 3 : sera rempli avec M2.1 → M2.4 (Notion)
    ],
    unlockedBy: "demarrer",
  },
  {
    id: "dupliquer",
    slug: "dupliquer",
    order: 3,
    title: "Dupliquer",
    subtitle: "Leader & royalties",
    description: "Devenir leader. Coacher tes distri, animer les events, atteindre les royalties.",
    icon: "👑",
    accent: "purple",
    modules: [
      // Phase 3 : sera rempli avec M3.1 → M3.4 (Notion)
    ],
    unlockedBy: "construire",
  },
];

/** Helper : trouve un niveau par son slug d URL. */
export function getFormationLevelBySlug(slug: string): FormationLevel | undefined {
  return FORMATION_LEVELS.find((l) => l.slug === slug);
}

/** Helper : trouve un niveau par son ID. */
export function getFormationLevelById(id: string): FormationLevel | undefined {
  return FORMATION_LEVELS.find((l) => l.id === id);
}
