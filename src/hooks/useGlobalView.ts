// Chantier Fix 5 bugs (2026-04-24).
// Hook partagé pour le toggle "Vue globale" admin — utilisé sur
// Co-pilote, Messagerie, Dossiers clients, Suivi PV. Persistence
// localStorage unique cross-pages.

import { useCallback, useEffect, useState } from "react";

const LS_KEY = "lorsquad-global-view";

/**
 * Hook d'état partagé pour le toggle "Vue globale" admin.
 * Par défaut : false (vue perso). Persisté en localStorage cross-pages.
 */
export function useGlobalView(): [boolean, (v: boolean) => void] {
  const [value, setValue] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    try {
      return window.localStorage.getItem(LS_KEY) === "true";
    } catch {
      return false;
    }
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(LS_KEY, value ? "true" : "false");
    } catch {
      // quota
    }
  }, [value]);

  // Sync entre tabs via storage event
  useEffect(() => {
    if (typeof window === "undefined") return;
    const onStorage = (e: StorageEvent) => {
      if (e.key === LS_KEY) {
        setValue(e.newValue === "true");
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const update = useCallback((v: boolean) => setValue(v), []);

  return [value, update];
}
