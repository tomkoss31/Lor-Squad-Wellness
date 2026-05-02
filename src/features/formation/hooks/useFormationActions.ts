// =============================================================================
// useFormationActions — mutations Formation (Phase B)
//
// Wrap autour des mutations service.ts avec etats loading/error et toasts
// pour UX cote front. UI gere le rendu (confettis, modals, etc.).
// =============================================================================

import { useState } from "react";
import { useToast } from "../../../context/ToastContext";
import {
  addThreadMessage as svcAddThreadMessage,
  rejectModule as svcRejectModule,
  requestComplement as svcRequestComplement,
  startModule as svcStartModule,
  submitModule as svcSubmitModule,
  validateModule as svcValidateModule,
  type FormationFreeTextAnswer,
} from "../service";
import type {
  FormationProgressRow,
  FormationThreadKind,
  FormationThreadRow,
  SubmitModuleResult,
} from "../types-db";

export interface UseFormationActionsResult {
  /** Marque le module comme commence (idempotent). */
  startModule: (moduleId: string) => Promise<FormationProgressRow | null>;
  /**
   * Soumet un quiz. Si score 100 → auto-validated + retour autoValidated=true
   * (l UI peut declencher confetti + felicitations).
   *
   * Phase F : quizScore = % QCM uniquement. Les freeTextAnswers sont
   * postees automatiquement dans le thread sponsor par le service.
   */
  submitModule: (params: {
    moduleId: string;
    quizScore: number;
    quizAnswers?: unknown[];
    freeTextAnswers?: FormationFreeTextAnswer[];
  }) => Promise<SubmitModuleResult | null>;
  /** Sponsor / admin valide un module en attente. */
  validateModule: (params: { progressId: string; feedback?: string }) => Promise<boolean>;
  /** Sponsor demande complement (status revient en in_progress). */
  requestComplement: (params: { progressId: string; message: string }) => Promise<boolean>;
  /** Sponsor / admin rejette (status='rejected', distri peut refaire). */
  rejectModule: (params: { progressId: string; feedback: string }) => Promise<boolean>;
  /** Ajoute un message libre dans le thread. */
  addThreadMessage: (params: {
    progressId: string;
    content: string;
    kind?: FormationThreadKind;
  }) => Promise<FormationThreadRow | null>;
  /** Pour bloquer les boutons quand une action est en cours. */
  busy: boolean;
}

export function useFormationActions(): UseFormationActionsResult {
  const { push: pushToast } = useToast();
  const [busy, setBusy] = useState(false);

  function reportError(scope: string, err: unknown) {
    const msg = err instanceof Error ? err.message : "Erreur inconnue";
    console.warn(`[useFormationActions:${scope}]`, err);
    pushToast({ tone: "error", title: "Action impossible", message: msg });
  }

  async function startModule(moduleId: string) {
    setBusy(true);
    try {
      const row = await svcStartModule(moduleId);
      return row;
    } catch (err) {
      reportError("startModule", err);
      return null;
    } finally {
      setBusy(false);
    }
  }

  async function submitModule(params: {
    moduleId: string;
    quizScore: number;
    quizAnswers?: unknown[];
    freeTextAnswers?: FormationFreeTextAnswer[];
  }) {
    setBusy(true);
    try {
      const result = await svcSubmitModule(params);
      if (result.autoValidated) {
        pushToast({
          tone: "success",
          title: "🎉 Module validé !",
          message: `Quiz parfait — +${result.xpAwarded} XP. Bravo.`,
        });
      } else {
        pushToast({
          tone: "info",
          title: "Soumis pour validation",
          message: "Ton sponsor va relire et te valider sous 48h.",
        });
      }
      return result;
    } catch (err) {
      reportError("submitModule", err);
      return null;
    } finally {
      setBusy(false);
    }
  }

  async function validateModule(params: { progressId: string; feedback?: string }) {
    setBusy(true);
    try {
      await svcValidateModule(params);
      pushToast({ tone: "success", title: "Validé", message: "Module marqué validé." });
      return true;
    } catch (err) {
      reportError("validateModule", err);
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function requestComplement(params: { progressId: string; message: string }) {
    setBusy(true);
    try {
      await svcRequestComplement(params);
      pushToast({
        tone: "info",
        title: "Demande envoyée",
        message: "Le distri pourra refaire le module avec ton feedback.",
      });
      return true;
    } catch (err) {
      reportError("requestComplement", err);
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function rejectModule(params: { progressId: string; feedback: string }) {
    setBusy(true);
    try {
      await svcRejectModule(params);
      pushToast({
        tone: "info",
        title: "Module rejeté",
        message: "Le distri peut le refaire avec ton feedback.",
      });
      return true;
    } catch (err) {
      reportError("rejectModule", err);
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function addThreadMessage(params: {
    progressId: string;
    content: string;
    kind?: FormationThreadKind;
  }) {
    setBusy(true);
    try {
      const row = await svcAddThreadMessage(params);
      return row;
    } catch (err) {
      reportError("addThreadMessage", err);
      return null;
    } finally {
      setBusy(false);
    }
  }

  return {
    startModule,
    submitModule,
    validateModule,
    requestComplement,
    rejectModule,
    addThreadMessage,
    busy,
  };
}
