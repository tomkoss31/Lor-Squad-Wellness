// =============================================================================
// useSalleOps — dérivation front du cockpit « La Base Académie ».
//
// Transforme la progression réelle (useStarterPlan : portes serveur +
// activated_at) en parcours pédagogique des 7 étapes Go Pro, chacune portant
// sa leçon (academyLessons). 100 % dérivé front, AUCUN appel DB en plus, AUCUNE
// modif des portes serveur (garde-fou §14).
//
// ── CE QUI A CHANGÉ LE 12/08/2026, ET POURQUOI ──────────────────────────────
//
// L'étape en cours était « la première non cochée ». Sur le papier, logique.
// En pratique, mesuré sur les 12 coachs vivants :
//
//   Maria .......... 41 bilans, ouvre l'app ......... « Étape 1 : S'équiper »
//   Mandy .......... 27 bilans ....................... « Étape 1 : S'équiper »
//   Victoria ....... 13 bilans, connectée ce matin ... « Étape 1 : S'équiper »
//
// DIX sur onze étaient figés à l'étape 1. Le parcours ne guidait personne : il
// leur mentait.
//
// La cause : l'étape 1 se valide en cochant « j'ai commandé 250 PV » — un lien
// vers myHerbalife, que l'app ne peut PAS constater. Personne n'y pense. Et une
// case jamais cochée gèle le fil pour toujours.
//
// Vérifié en base : AUCUN coach n'a jamais coché une porte déclarative, sauf
// les trois qui les ont toutes. Les seules portes cochées sont celles que le
// serveur détecte lui-même — le 1er bilan et le 1er pack.
//
// ── LA RÈGLE MAINTENANT ─────────────────────────────────────────────────────
//
//   Une étape ne retient le fil que si l'app peut CONSTATER sa preuve.
//   Ce qu'elle ne peut pas mesurer, elle le propose — elle ne le bloque pas.
//
// C'est exactement ce que Thomas a fait le 04/08 en retirant `premier_hom` des
// portes d'activation (une réunion physique, invérifiable, cochée par 2
// personnes sur 19, qui bloquait tout le monde). On applique la même règle aux
// trois autres portes déclaratives.
//
// Les 7 étapes et les 9 leçons sont INTACTES : rien n'est retiré du parcours,
// seul l'ordre de priorité change.
// =============================================================================

import { useMemo } from "react";
import { useStarterPlan } from "../../../hooks/useStarterPlan";
import { ACADEMY_LESSONS, type AcademyLesson } from "./academyLessons";
import {
  GO_PRO_STEPS,
  OPS_PHASES,
  choisirEtapeActive,
  retientLeFil,
  type GoProStepDef,
  type OpsPhase,
} from "./goProSteps";

// Ré-export : les composants importaient déjà OPS_PHASES depuis ce module.
export { OPS_PHASES };
export type { OpsPhase };

// Le parcours vient désormais de goProSteps.ts — LA définition unique, partagée
// avec la grille Apprentissage de l'équipe. Avant, chacun avait sa copie et les
// deux divergeaient (lot 1 du chantier « l'app d'un débutant », 2026-08-04).
const GOPRO = GO_PRO_STEPS;

export type StepState = "done" | "active" | "todo" | "locked";

export interface GoProStepView {
  n: number;
  label: string;
  state: StepState;
  /** Leçon de l'étape (pour pouvoir revisiter n'importe quelle étape). */
  lesson: AcademyLesson | null;
  /** Porte serveur représentative de l'étape (active = 1ʳᵉ non faite). */
  gateKey: string | null;
  /**
   * L'étape peut-elle retenir le fil ?
   *
   * VRAI seulement si elle porte une preuve que l'app sait CONSTATER : un vrai
   * bilan, un vrai pack, un compteur de gestes. FAUX si tout se coche à la main
   * — ces étapes sont proposées, jamais imposées. Cf. l'en-tête du fichier.
   */
  bloquante: boolean;
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
  /** Jalon J30-45 : prêt pour le plan marketing (≥ J30 + 1er bilan réalisé). */
  jalonPlanMarketing: boolean;
  toggle: (taskKey: string) => Promise<void>;
  /** Gestes accomplis par étape à preuve chiffrée (« 2/3 relances »). */
  counts: Record<string, number>;
  /** Incrémente la preuve chiffrée de l'étape en cours. */
  bump: (taskKey: string, target: number) => Promise<void>;
}

const DAY_MS = 86_400_000;

export function useSalleOps(): SalleOpsView {
  const { statuses, activatedAt, starterStartedAt, loading, toggle, counts, bump } = useStarterPlan();

  return useMemo(() => {
    // État LU SUR LES CLÉS BRUTES (statuses) — inclut les clés hors
    // STARTER_TASKS comme le setup `commande_250pv`. Sinon une étape dont la
    // clé n'est pas dans les 15 tâches ne se validerait jamais (bug 2026-06-30).
    const doneByGate = (k: string) => statuses[k] === "done";

    const activated = Boolean(activatedAt);
    const stepDone = (g: GoProStepDef) => g.gates.length > 0 && g.gates.every((k) => doneByGate(k));

    // ── Quelles preuves l'app sait-elle CONSTATER ? ──────────────────────────
    // `autoOnly` = validée par un acte réel côté serveur (un vrai bilan, un
    // vrai pack). `proofCounter` = comptée geste par geste, donc elle se
    // termine. Tout le reste se coche à la main — et n'est jamais coché.
    // ⚠️ On accepte une clé de leçon de secours : la porte de « Relancer »
    // s'appelle `relances_3` alors que sa leçon — celle qui porte le compteur
    // de 3 gestes — s'appelle `relancer`. Sans ce repli, l'étape passerait pour
    // non mesurable et Victoria sauterait direct à « Démarrer ta recrue ».
    const estMesurable = (k: string, secours?: string) => {
      const lecon = ACADEMY_LESSONS[k] ?? (secours ? ACADEMY_LESSONS[secours] : undefined);
      return Boolean(lecon?.autoOnly) || Boolean(lecon?.proofCounter);
    };

    // La règle vit dans goProSteps.ts, en fonctions pures : c'est là qu'elle est
    // testée sur les vrais profils des coachs, et nulle part en double.
    const safeActiveIndex = choisirEtapeActive(doneByGate, estMesurable);

    const steps: GoProStepView[] = GOPRO.map((g, i) => {
      const active = i === safeActiveIndex;
      // Porte mise en avant : pour l'étape active = 1ʳᵉ porte non faite ; pour
      // une étape revisitée = sa 1ʳᵉ porte (lecture).
      const gateKey = active
        ? g.gates.find((k) => !doneByGate(k)) ?? null
        : g.gates[0] ?? null;
      // `lessonKey` explicite d'abord : depuis que « Relancer » a une clé de
      // SUIVI (`relances_3`) qui n'est pas une clé de leçon, se fier au gateKey
      // faisait disparaître tout le contenu de l'étape.
      const lessonKey = g.lessonKey ?? gateKey ?? null;
      return {
        n: g.n,
        label: g.label,
        state: g.locked ? "locked" : stepDone(g) ? "done" : active ? "active" : "todo",
        lesson: lessonKey ? ACADEMY_LESSONS[lessonKey] ?? null : null,
        gateKey,
        bloquante: retientLeFil(g, doneByGate, estMesurable),
      };
    });

    // Étape active (rétro-compat).
    const currentGateKey = steps[safeActiveIndex]?.gateKey ?? null;
    const currentLesson = steps[safeActiveIndex]?.lesson ?? null;

    // Phase 90j (tableau de marche) — dérivée simple sur les portes franchies.
    const bilanDone = doneByGate("premier_bilan");
    const packDone = doneByGate("premier_pv_pack");
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

    // Jalon J30-45 : autour de J30, une fois un vrai bilan posé, on pousse le
    // plan marketing (palier suivant). Borne basse J30 ; pas de borne haute pour
    // ne pas faire disparaître le rappel.
    const jalonPlanMarketing = dayNumber >= 30 && doneByGate("premier_bilan");

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
      jalonPlanMarketing,
      toggle,
      counts,
      bump,
    };
  }, [statuses, activatedAt, starterStartedAt, loading, toggle, counts, bump]);
}
