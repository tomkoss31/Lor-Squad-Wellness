// =============================================================================
// useSalleOps — dérivation front du cockpit « La Base Académie ».
//
// Transforme la progression réelle (useStarterPlan : portes serveur +
// activated_at) en parcours pédagogique des 6 étapes Go Pro, chacune portant
// sa leçon (academyLessons). 100 % dérivé front, AUCUN appel DB en plus, AUCUNE
// modif des portes serveur (garde-fou §14).
// =============================================================================

import { useMemo } from "react";
import { useStarterPlan } from "../../../hooks/useStarterPlan";
import { ACADEMY_LESSONS, type AcademyLesson } from "./academyLessons";

export type OpsPhase = "allumage" | "acceleration" | "profondeur" | "levier";

export const OPS_PHASES: { key: OpsPhase; label: string; short: string }[] = [
  { key: "allumage", label: "Allumage", short: "Allumage" },
  { key: "acceleration", label: "Accélération", short: "Accél." },
  { key: "profondeur", label: "Profondeur", short: "Profond." },
  { key: "levier", label: "Levier", short: "Levier" },
];

// Les 6 étapes Go Pro = la colonne vertébrale du parcours (décision Thomas).
// Chaque étape « apprendre à faire » mappe une ou plusieurs portes serveur.
// Les étapes 5-6 (« faire faire ») arrivent en V2 → verrouillées pour l'instant.
interface GoProDef {
  n: number;
  key: string;
  label: string;
  gates: string[];
  /** Clé de leçon quand l'étape n'a pas de porte (ex. relancer). */
  lessonKey?: string;
  locked?: boolean;
}

const GOPRO: GoProDef[] = [
  { n: 1, key: "sequiper", label: "S'équiper", gates: ["commande_250pv"] },
  { n: 2, key: "trouver", label: "Trouver", gates: ["liste_50"] },
  { n: 3, key: "inviter", label: "Inviter", gates: ["premiere_story"] },
  { n: 4, key: "presenter", label: "Présenter", gates: ["premier_bilan", "premier_hom", "premier_pv_pack"] },
  { n: 5, key: "relancer", label: "Relancer", gates: [], lessonKey: "relancer" },
  { n: 6, key: "demarrer", label: "Démarrer ta recrue", gates: [], locked: true },
  { n: 7, key: "dupliquer", label: "Dupliquer", gates: [], locked: true },
];

export type StepState = "done" | "active" | "todo" | "locked";

export interface GoProStepView {
  n: number;
  label: string;
  state: StepState;
}

export interface SalleOpsView {
  loading: boolean;
  activated: boolean;
  /** Parcours 6 étapes Go Pro. */
  steps: GoProStepView[];
  totalSteps: number;
  /** Numéro (1-based) de l'étape active. */
  activeStepNumber: number;
  /** Leçon de l'étape/porte courante (apprendre→faire→preuve). */
  currentLesson: AcademyLesson | null;
  /** Porte serveur à cocher si l'action est auto-déclarée (pas de linkPath). */
  currentGateKey: string | null;
  phase: OpsPhase;
  phaseIndex: number;
  /** Jour X / 90 depuis l'ancre J0 (1 si non posée). */
  dayNumber: number;
  toggle: (taskKey: string) => Promise<void>;
}

const DAY_MS = 86_400_000;

export function useSalleOps(): SalleOpsView {
  const { tasks, activatedAt, starterStartedAt, loading, toggle } = useStarterPlan();

  return useMemo(() => {
    const doneByGate: Record<string, boolean> = {};
    for (const t of tasks) doneByGate[t.key] = t.status === "done";

    const activated = Boolean(activatedAt);
    const stepDone = (g: GoProDef) => g.gates.length > 0 && g.gates.every((k) => doneByGate[k]);

    // Étape active = 1ʳᵉ étape ni faite ni verrouillée (relancer n'est jamais
    // « done » → devient le focus une fois les portes 1-3 franchies).
    const activeIndex = GOPRO.findIndex((g) => !g.locked && !stepDone(g));
    const safeActiveIndex = activeIndex === -1 ? 3 : activeIndex; // fallback relancer

    const steps: GoProStepView[] = GOPRO.map((g, i) => ({
      n: g.n,
      label: g.label,
      state: g.locked
        ? "locked"
        : stepDone(g)
          ? "done"
          : i === safeActiveIndex
            ? "active"
            : "todo",
    }));

    // Porte + leçon courantes.
    const activeStep = GOPRO[safeActiveIndex];
    const currentGateKey = activeStep.gates.find((k) => !doneByGate[k]) ?? null;
    const lessonKey = currentGateKey ?? activeStep.lessonKey ?? null;
    const currentLesson = lessonKey ? ACADEMY_LESSONS[lessonKey] ?? null : null;

    // Phase 90j (tableau de marche) — dérivée simple sur les portes franchies.
    const bilanDone = Boolean(doneByGate["premier_bilan"]);
    const packDone = Boolean(doneByGate["premier_pv_pack"]);
    const phase: OpsPhase = activated || packDone ? "profondeur" : bilanDone ? "acceleration" : "allumage";
    const phaseIndex = OPS_PHASES.findIndex((p) => p.key === phase);

    // Jour X / 90 depuis l'ancre J0.
    let dayNumber = 1;
    if (starterStartedAt) {
      const start = new Date(starterStartedAt).getTime();
      if (!Number.isNaN(start)) {
        dayNumber = Math.min(90, Math.max(1, Math.floor((Date.now() - start) / DAY_MS) + 1));
      }
    }

    return {
      loading,
      activated,
      steps,
      totalSteps: GOPRO.length,
      activeStepNumber: safeActiveIndex + 1,
      currentLesson,
      currentGateKey,
      phase,
      phaseIndex,
      dayNumber,
      toggle,
    };
  }, [tasks, activatedAt, starterStartedAt, loading, toggle]);
}
