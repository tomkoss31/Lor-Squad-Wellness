// =============================================================================
// useSalleOps — dérivation front du cockpit « Salle des Opérations ».
//
// Slice 4 : transforme la progression réelle (useStarterPlan : les 5 étapes-
// portes + activated_at) en vue cockpit : étapes, phase, action dominante.
// 100 % dérivé front, AUCUN appel DB en plus, AUCUNE modif des 5 portes serveur
// (garde-fou §14). Les sources non encore branchées (qui inviter, script,
// expositions) restent statiques côté composant — slices suivantes.
// =============================================================================

import { useMemo } from "react";
import { useStarterPlan } from "../../../hooks/useStarterPlan";

export type OpsPhase = "setup" | "allumage" | "acceleration" | "profondeur" | "levier";

export const OPS_PHASES: { key: OpsPhase; label: string; short: string }[] = [
  { key: "setup", label: "Setup", short: "Setup" },
  { key: "allumage", label: "Allumage", short: "Allumage" },
  { key: "acceleration", label: "Accélération", short: "Accél." },
  { key: "profondeur", label: "Profondeur", short: "Profond." },
  { key: "levier", label: "Levier", short: "Levier" },
];

export interface OpsAction {
  title: string;
  sub: string;
  cta: string;
  linkPath?: string;
}

// Ordre conseillé (§8) — les clés sont FIGÉES (garde-fou). Le libellé/sous-texte
// est l'habillage cockpit « langage simple ».
const OPS_STEPS: { key: string; label: string; action: OpsAction }[] = [
  {
    key: "liste_50",
    label: "Ta Liste 100",
    action: { title: "Fais ta Liste 100", sub: "100 noms : ta matière première. Sans liste, pas d'activité.", cta: "Ouvrir ma Liste 100", linkPath: "/cahier-de-bord?tab=liste" },
  },
  {
    key: "premiere_story",
    label: "Ta 1ʳᵉ story",
    action: { title: "Publie ta 1ʳᵉ story", sub: "Tu annonces ton démarrage, tu crées la curiosité.", cta: "C'est publié" },
  },
  {
    key: "premier_bilan",
    label: "Ton 1ᵉʳ bilan",
    action: { title: "Décroche ton 1ᵉʳ bilan", sub: "Le cœur du métier. Un bilan = une porte qui s'ouvre.", cta: "Démarrer un bilan", linkPath: "/clients" },
  },
  {
    key: "premier_hom",
    label: "Ton 1ᵉʳ HOM",
    action: { title: "Amène 1 invité au HOM", sub: "Vois comment on présente l'opportunité, tu dupliqueras ça.", cta: "Marquer une présence HOM" },
  },
  {
    key: "premier_pv_pack",
    label: "Ton 1ᵉʳ pack",
    action: { title: "Signe ton 1ᵉʳ pack", sub: "Ta première vente : tes 1ers PV, ton déclic.", cta: "Ouvrir le panier", linkPath: "/panier" },
  },
];

export interface OpsStepView {
  key: string;
  label: string;
  done: boolean;
  active: boolean;
}

export interface SalleOpsView {
  loading: boolean;
  activated: boolean;
  doneCount: number;
  total: number;
  steps: OpsStepView[];
  /** Action dominante = 1ʳᵉ étape non fermée (ou null si tout est fait). */
  nextAction: OpsAction | null;
  /** Index de l'étape active (0-based) ou -1 si activé. */
  activeIndex: number;
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
    const doneByKey: Record<string, boolean> = {};
    for (const t of tasks) doneByKey[t.key] = t.status === "done";

    const activated = Boolean(activatedAt);
    const activeIndex = activated ? -1 : OPS_STEPS.findIndex((s) => !doneByKey[s.key]);

    const steps: OpsStepView[] = OPS_STEPS.map((s, i) => ({
      key: s.key,
      label: s.label,
      done: Boolean(doneByKey[s.key]),
      active: i === activeIndex,
    }));

    const doneCount = steps.filter((s) => s.done).length;
    const nextAction = activeIndex >= 0 ? OPS_STEPS[activeIndex].action : null;

    // Phase (dérivée simplifiée §7a — setup omis tant que les clés setup
    // n'existent pas ; profondeur/levier nécessitent la downline → 'profondeur'
    // par défaut une fois activé, affiné plus tard).
    const bilanDone = Boolean(doneByKey["premier_bilan"]);
    const phase: OpsPhase = activated ? "profondeur" : bilanDone ? "acceleration" : "allumage";
    const phaseIndex = OPS_PHASES.findIndex((p) => p.key === phase);

    // Jour X / 90 depuis l'ancre J0. Non posée → Jour 1. Clampé [1, 90].
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
      doneCount,
      total: OPS_STEPS.length,
      steps,
      nextAction,
      activeIndex,
      phase,
      phaseIndex,
      dayNumber,
      toggle,
    };
  }, [tasks, activatedAt, starterStartedAt, loading, toggle]);
}
