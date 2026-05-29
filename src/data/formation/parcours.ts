// =============================================================================
// Formation — parcours guide (2026-04-30, contenu importe Phase F 2026-05-02)
//
// 3 niveaux empiles : Démarrer (0->500 PV) / Construire (500->4000 PV) /
// Dupliquer (Leader & royalties).
//
// Phase F (2026-05-02) : modules importes depuis parcours-content.ts (livre
// par l atelier Notion Thomas). Format : 5 N1 + 4 N2 + 4 N3 modules avec
// idee_force / ancrage / action + lecons text + quiz QCM/free_text.
//
// Hierarchie de deblocage :
//   - N1 toujours debloque
//   - N2 debloque quand N1 a 100 % de modules valides
//   - N3 debloque quand N2 a 100 % de modules valides
// =============================================================================

import type { FormationLevel } from "./types";
import { N1_MODULES, N2_MODULES, N3_MODULES } from "./parcours-content";

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
    modules: N1_MODULES,
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
    modules: N2_MODULES,
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
    modules: N3_MODULES,
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

// =============================================================================
// Helper navigation post-quiz (chantier récap quiz 2026-05-28)
//
// À partir du module courant (qui vient d'être terminé), détermine où aller
// quand l'utilisateur clique "Passer à l'étape suivante" sur la page récap.
//
// 4 cas :
//   1. Module suivant dispo dans le même niveau (cas le plus fréquent)
//   2. Dernier module du niveau → emmène à la page du niveau suivant
//   3. Dernier module du dernier niveau → "tu as tout fini" → /formation
//   4. levelSlug / moduleSlug invalide → fallback /formation
// =============================================================================

export type NextFormationStepKind = "next-module" | "next-level" | "all-complete" | "fallback";

export interface NextFormationStep {
  kind: NextFormationStepKind;
  /** Chemin de navigation pour le bouton "Passer à l'étape suivante". */
  path: string;
  /** Label court pour le bouton (ex: "🚀 Construire" ou "Module suivant"). */
  label: string;
  /** Sous-label optionnel (ex: titre du module suivant). */
  subLabel?: string;
}

export function getNextFormationStep(
  currentLevelSlug: string,
  currentModuleSlug: string,
): NextFormationStep {
  const levelIdx = FORMATION_LEVELS.findIndex((l) => l.slug === currentLevelSlug);
  if (levelIdx === -1) {
    return { kind: "fallback", path: "/formation", label: "Retour à la formation" };
  }
  const level = FORMATION_LEVELS[levelIdx];
  const moduleIdx = level.modules.findIndex((m) => m.slug === currentModuleSlug);
  if (moduleIdx === -1) {
    return { kind: "fallback", path: "/formation", label: "Retour à la formation" };
  }

  // Cas 1 : module suivant dans le même niveau
  if (moduleIdx + 1 < level.modules.length) {
    const next = level.modules[moduleIdx + 1];
    return {
      kind: "next-module",
      path: `/formation/parcours/${level.slug}/${next.slug}`,
      label: "Passer au module suivant",
      subLabel: `${next.icon} ${next.title}`,
    };
  }

  // Cas 2 : dernier module du niveau → niveau suivant
  if (levelIdx + 1 < FORMATION_LEVELS.length) {
    const nextLevel = FORMATION_LEVELS[levelIdx + 1];
    return {
      kind: "next-level",
      path: `/formation/parcours/${nextLevel.slug}`,
      label: `Découvrir le niveau ${nextLevel.order}`,
      subLabel: `${nextLevel.icon} ${nextLevel.title}`,
    };
  }

  // Cas 3 : dernier module du dernier niveau → /formation
  return {
    kind: "all-complete",
    path: "/formation",
    label: "🎉 Retour à l'accueil",
    subLabel: "Tu as terminé tout le parcours guidé",
  };
}
