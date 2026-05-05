// =============================================================================
// useNextAction — Phase C Co-pilote V5 (2026-05-05)
//
// Wrapper du `useCopiloteData.nextAction` existant, augmenté du mode
// "idle proactive" : si pas de RDV/follow-up, on retourne une suggestion
// contextuelle basée sur la plage horaire (matin → préparer invitations,
// soir → check-in FLEX, etc.).
//
// Cascade :
//   1. nextAction.kind === 'rdv'      → RDV imminent (priorité max)
//   2. nextAction.kind === 'followup' → Suivi à faire aujourd'hui
//   3. ~~Prochaine reco du backlog~~  → V2 future, pas dans le scope V5 MVP
//   4. nextAction.kind === 'none'     → mode idle proactive (suggestion)
//
// Retourne un type unifié pour HeroEditorial qui ne se soucie pas de la
// source.
// =============================================================================

import { useMemo } from "react";
import { useCopiloteData } from "../../../../hooks/useCopiloteData";
import { useGlobalView } from "../../../../hooks/useGlobalView";
import { useTimeContext } from "./useTimeContext";
import {
  getProactiveSuggestion,
  type TimeContext,
} from "../../../../lib/time-context";

export type NextActionKind = "rdv" | "followup" | "idle";

export interface NextActionRdv {
  kind: "rdv";
  clientId: string;
  clientName: string;
  title: string;
  subtitle?: string;
  location?: string;
  time?: Date;
  isProspect?: boolean;
}

export interface NextActionFollowup {
  kind: "followup";
  clientId: string;
  clientName: string;
  title: string;
  subtitle?: string;
  protocolDay?: number;
}

export interface NextActionIdle {
  kind: "idle";
  /** Titre proactif (ex. "Profite-en pour préparer 3 invitations…") */
  title: string;
  /** Label CTA */
  ctaLabel: string;
  /** Route interne */
  ctaRoute: string;
  /** Catégorie de plage horaire (debug) */
  timeFocus: TimeContext["heroFocus"];
}

export type NextAction = NextActionRdv | NextActionFollowup | NextActionIdle;

interface UseNextActionResult {
  action: NextAction;
  loading: boolean;
}

export function useNextAction(now: Date = new Date()): UseNextActionResult {
  const [globalView] = useGlobalView();
  const data = useCopiloteData(now, globalView);
  const timeContext = useTimeContext();

  const action = useMemo<NextAction>(() => {
    const next = data?.nextAction;

    // Cas 1 : RDV imminent
    if (next && next.kind === "rdv") {
      return {
        kind: "rdv",
        clientId: next.clientId,
        clientName: next.clientName,
        title: next.title,
        subtitle: next.subtitle,
        location: next.location,
        time: next.time,
        isProspect: next.isProspect,
      };
    }

    // Cas 2 : Follow-up à faire
    if (next && next.kind === "followup") {
      return {
        kind: "followup",
        clientId: next.clientId,
        clientName: next.clientName,
        title: next.title,
        subtitle: next.subtitle,
        protocolDay: next.protocolDay,
      };
    }

    // Cas 3 : idle proactive — suggestion selon la plage horaire
    const suggestion = getProactiveSuggestion(timeContext.heroFocus);
    return {
      kind: "idle",
      title: suggestion.title,
      ctaLabel: suggestion.ctaLabel,
      ctaRoute: suggestion.ctaRoute,
      timeFocus: timeContext.heroFocus,
    };
  }, [data?.nextAction, timeContext.heroFocus]);

  return { action, loading: false };
}
