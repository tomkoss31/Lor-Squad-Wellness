// =============================================================================
// businessShortcuts — source UNIQUE des raccourcis du hub « Mon business ».
//
// Partagé par la sidebar PC (AppLayout) et le tiroir mobile (MobileDrawer) pour
// que les deux restent toujours synchro (B9 : une feature = un endroit, le menu
// n'est qu'un raccourci). Doit refléter OutilsPage.
//
// Chantier Simplification (2026-07-27) :
//   - chaque raccourci porte sa `feature` → filtré par useAppLevel().can()
//   - Encaissement AJOUTÉ et remonté en tête : c'est l'outil qui fait rentrer
//     l'argent, il était absent du menu (seulement une carte perdue en 3e
//     section de /outils). Ordre = vendre/encaisser → partager → mesurer.
//   - FLEX passe en niveau « complet » (0 check-in en base depuis le lancement)
// =============================================================================

import type { FeatureKey } from "../../config/appVisibility";

export interface BusinessShortcut {
  label: string;
  path: string;
  emoji: string;
  soon?: boolean;
  /** Clé de visibilité — cf. src/config/appVisibility.ts */
  feature: FeatureKey;
}

export const BUSINESS_SHORTCUTS: BusinessShortcut[] = [
  // ── Encaisser / vendre ────────────────────────────────────────────────
  { label: "Encaissement", path: "/encaissement", emoji: "💳", feature: "business.encaissement" },
  { label: "Panier", path: "/panier", emoji: "🛒", feature: "business.panier" },
  { label: "Ventes comptoir", path: "/ventes-comptoir", emoji: "🏪", feature: "business.ventes-comptoir" },
  // ── Partager / prospecter ─────────────────────────────────────────────
  { label: "Mes liens", path: "/mes-liens", emoji: "🔗", feature: "business.mes-liens" },
  { label: "Prospecter", path: "/outils-prospection", emoji: "🎯", feature: "business.prospecter" },
  { label: "Ma boutique HL Skin", path: "/ma-boutique", emoji: "🌿", feature: "business.boutique" },
  // ── Mesurer ───────────────────────────────────────────────────────────
  { label: "Rentabilité", path: "/rentabilite", emoji: "💎", feature: "business.rentabilite" },
  { label: "Suivi PV", path: "/pv", emoji: "💰", feature: "business.pv" },
  { label: "Plan Marketing", path: "/plan-marketing", emoji: "🪜", feature: "business.plan-marketing" },
  { label: "FLEX", path: "/flex", emoji: "⚡", feature: "business.flex" },
];

// Vrai si la route courante appartient au hub « Mon business » (pour auto-ouvrir
// le sous-menu). Inclut la page hub /outils + chaque raccourci — y compris ceux
// masqués par le niveau d'app : la route reste ouverte, donc le sous-menu doit
// savoir se mettre en surbrillance si on y arrive par un lien direct.
export function isBusinessRoute(pathname: string): boolean {
  if (pathname === "/outils" || pathname.startsWith("/outils-prospection")) return true;
  return BUSINESS_SHORTCUTS.some(
    (s) => pathname === s.path || pathname.startsWith(s.path + "/"),
  );
}
