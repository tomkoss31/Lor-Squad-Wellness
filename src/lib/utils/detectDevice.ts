// Hotfix client-login + PWA install (2026-04-24).
// Détection device pour afficher les bonnes instructions d'installation PWA.

export type DeviceKind = "ios" | "android" | "desktop";

export function detectDevice(): DeviceKind {
  if (typeof navigator === "undefined") return "desktop";
  const ua = navigator.userAgent || "";
  // iPadOS 13+ se déguise en desktop Safari → on vérifie la touch + Mac
  const isIpadOS = /Mac/i.test(ua) && typeof navigator.maxTouchPoints === "number" && navigator.maxTouchPoints > 1;
  if (/iPhone|iPod|iPad/i.test(ua) || isIpadOS) return "ios";
  if (/Android/i.test(ua)) return "android";
  return "desktop";
}

/**
 * Retourne true si la PWA est actuellement installée et lancée en mode
 * standalone (pas dans un onglet navigateur). Sert à décider d'afficher
 * ou non la bannière d'installation.
 */
export function isStandalonePwa(): boolean {
  if (typeof window === "undefined") return false;
  if (window.matchMedia && window.matchMedia("(display-mode: standalone)").matches) {
    return true;
  }
  // Safari iOS expose navigator.standalone au lieu du display-mode.
  const navAny = window.navigator as unknown as { standalone?: boolean };
  return navAny.standalone === true;
}
