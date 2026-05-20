// =============================================================================
// useHaptic — Chantier mobile Onde 5 (2026-05-20)
//
// Hook utilitaire qui wrap navigator.vibrate de manière sûre :
// - Silent fail si l'API n'est pas dispo (desktop, vieux Safari iOS)
// - Pattern court (10ms) par défaut = "tap léger"
// - Respect prefers-reduced-motion (pas de vibration si réduit)
// - Pas d'effet sur les utilisateurs qui ont désactivé la vibration OS
//
// Note iOS : navigator.vibrate est supporté depuis Safari 17.4+. Sur iOS
// plus ancien, silent fail propre. Aucun crash, juste pas de feedback.
// =============================================================================

import { useCallback } from "react";

type HapticPattern = "tap" | "select" | "warning" | "success";

const PATTERNS: Record<HapticPattern, number | number[]> = {
  tap: 10,
  select: 15,
  warning: [20, 40, 20],
  success: [10, 30, 10],
};

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  try {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
}

export function useHaptic() {
  return useCallback((pattern: HapticPattern = "tap") => {
    if (prefersReducedMotion()) return;
    if (typeof navigator === "undefined" || typeof navigator.vibrate !== "function") return;
    try {
      navigator.vibrate(PATTERNS[pattern]);
    } catch {
      // Silent fail (Safari peut throw sur certains contextes)
    }
  }, []);
}
