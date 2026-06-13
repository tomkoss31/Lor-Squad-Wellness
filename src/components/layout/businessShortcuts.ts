// =============================================================================
// businessShortcuts — source UNIQUE des raccourcis du hub « Mon business ».
//
// Partagé par la sidebar PC (AppLayout) et le tiroir mobile (MobileDrawer) pour
// que les deux restent toujours synchro (B9 : une feature = un endroit, le menu
// n'est qu'un raccourci). Doit refléter OutilsPage.
// =============================================================================

export interface BusinessShortcut {
  label: string;
  path: string;
  emoji: string;
  soon?: boolean;
}

export const BUSINESS_SHORTCUTS: BusinessShortcut[] = [
  { label: "Prospecter", path: "/outils-prospection", emoji: "🎯" },
  { label: "Mes liens", path: "/mes-liens", emoji: "🔗" },
  { label: "Panier", path: "/panier", emoji: "🛒" },
  { label: "Rentabilité", path: "/rentabilite", emoji: "💎" },
  { label: "FLEX", path: "/flex", emoji: "⚡" },
  { label: "Suivi PV", path: "/pv", emoji: "💰" },
];

// Vrai si la route courante appartient au hub « Mon business » (pour auto-ouvrir
// le sous-menu). Inclut la page hub /outils + chaque raccourci.
export function isBusinessRoute(pathname: string): boolean {
  if (pathname === "/outils" || pathname.startsWith("/outils-prospection")) return true;
  return BUSINESS_SHORTCUTS.some(
    (s) => pathname === s.path || pathname.startsWith(s.path + "/"),
  );
}
