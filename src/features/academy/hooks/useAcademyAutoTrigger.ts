// Chantier Academy Phase 1 — popup auto-trigger (2026-04-26).
// Hook qui decide si le popup AcademyReminderDialog doit s afficher au mount
// du layout principal.
//
// Regles d affichage :
//   - User charge (currentUser !== null)
//   - Academy pas encore terminee ni skippee globalement
//   - Pas dismissed aujourd hui (rate-limit 1×/jour via la table
//     user_tour_reminder_dismissals + flag optimistic dans useTourProgress)
//   - User n est PAS deja sur /academy ou /academy/* (sinon parasite)
//   - Delai de 1500ms apres mount pour ne pas flasher au login
//
// ⚠️ AUCUN filtre par role : admins, referents et distributors voient tous
// le popup. L Academy est concue pour tous les users de l app, et on veut
// que les admins puissent la tester sans bidouiller leur role en DB.

import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { useAcademyProgress } from "./useAcademyProgress";
import { useAppContext } from "../../../context/AppContext";

const TRIGGER_DELAY_MS = 1500;

export function useAcademyAutoTrigger() {
  const { currentUser } = useAppContext();
  const { view } = useAcademyProgress();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const hasFiredThisSession = useRef(false);

  useEffect(() => {
    if (!view.loaded || !currentUser) return;
    if (hasFiredThisSession.current) return;

    // Filtres state Academy
    if (view.isCompleted || view.isSkipped) return;
    if (view.hasDismissedToday) return;

    // Filtre route : ne pas pop si on est deja sur Academy
    if (location.pathname.startsWith("/academy")) return;

    const timer = setTimeout(() => {
      hasFiredThisSession.current = true;
      setIsOpen(true);
    }, TRIGGER_DELAY_MS);

    return () => clearTimeout(timer);
  }, [
    view.loaded,
    view.isCompleted,
    view.isSkipped,
    view.hasDismissedToday,
    currentUser,
    location.pathname,
  ]);

  return {
    isOpen,
    close: () => setIsOpen(false),
  };
}
