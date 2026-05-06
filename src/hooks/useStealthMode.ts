// =============================================================================
// useStealthMode — mode "privacy" pour rentabilite (chantier 2026-11-07)
// =============================================================================
//
// Toggle qui floute les montants EUR sur /rentabilite et le widget Co-pilote.
// Utile quand Thomas est en RDV avec un client/team et qu'il ne veut pas que
// ses revenus soient visibles. Hover-to-reveal pour qu'il puisse les voir
// temporairement sans desactiver le mode.
//
// Persistance localStorage. Active une classe "ls-stealth-active" sur body
// que les conteneurs avec data-stealth captent via CSS.
// =============================================================================

import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "lor-squad:stealth-mode";
const BODY_CLASS = "ls-stealth-active";

export function useStealthMode() {
  const [enabled, setEnabled] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    try {
      return window.localStorage.getItem(STORAGE_KEY) === "true";
    } catch {
      return false;
    }
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(STORAGE_KEY, String(enabled));
    } catch {
      /* quota / mode privé : on ignore */
    }
    if (typeof document !== "undefined") {
      if (enabled) document.body.classList.add(BODY_CLASS);
      else document.body.classList.remove(BODY_CLASS);
    }
  }, [enabled]);

  // Cleanup en quittant la page : retire la classe pour ne pas affecter
  // d autres pages si le user navigue.
  useEffect(() => {
    return () => {
      if (typeof document !== "undefined") {
        document.body.classList.remove(BODY_CLASS);
      }
    };
  }, []);

  const toggle = useCallback(() => {
    setEnabled((v) => !v);
  }, []);

  return { stealthOn: enabled, toggle };
}
