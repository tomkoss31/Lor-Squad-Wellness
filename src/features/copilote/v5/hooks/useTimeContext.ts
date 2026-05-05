// =============================================================================
// useTimeContext — Phase A Co-pilote V5 (2026-05-05)
//
// Hook React qui expose le TimeContext courant et le rafraîchit toutes
// les 60 sec (assez fin pour ne pas rater la transition d'une plage,
// assez doux pour ne pas spam le re-render).
// =============================================================================

import { useEffect, useState } from "react";
import { getTimeContext, type TimeContext } from "../../../../lib/time-context";

export function useTimeContext(): TimeContext {
  const [tc, setTc] = useState<TimeContext>(() => getTimeContext(new Date()));

  useEffect(() => {
    // Refresh toutes les 60 secondes : si le user reste sur Co-pilote
    // longtemps, le context bascule automatiquement (ex. 17:59 → 18:00
    // = "afternoon-action" → "evening-recap").
    const interval = setInterval(() => {
      const next = getTimeContext(new Date());
      setTc((current) => {
        // Évite le re-render si la plage n'a pas changé (heure n'a pas
        // franchi de seuil). La comparaison sur heroFocus est robuste.
        if (current.heroFocus === next.heroFocus && current.hour === next.hour) {
          return current;
        }
        return next;
      });
    }, 60_000);
    return () => clearInterval(interval);
  }, []);

  return tc;
}
