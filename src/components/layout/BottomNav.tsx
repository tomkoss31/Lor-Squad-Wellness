// Chantier Refonte Navigation (2026-04-22) — commit 5/5.
// Refonte mobile 2026-05-20 (post-MobileDrawer hamburger) : remplacement
// du bouton "Plus" + drawer bottom sheet (doublon avec le drawer hamburger
// en haut) par un accès direct "Agenda" — route très utilisée au quotidien.
//
// Nav mobile bas à 5 items :
//   Co-pilote · Messagerie · [+ Bilan] · Clients · Agenda
//
// Pour Suivi PV, Mon équipe, Formation, Paramètres, Sortir → hamburger
// drawer principal en haut de l'écran (MobileDrawer).

import { NavLink, useLocation } from "react-router-dom";
import { useAppContext } from "../../context/AppContext";

const PRIMARY_ITEMS = [
  {
    key: "co-pilote",
    path: "/co-pilote",
    label: "Co-pilote",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <rect x="3" y="3" width="7" height="7" rx="1.5" />
        <rect x="14" y="3" width="7" height="7" rx="1.5" />
        <rect x="3" y="14" width="7" height="7" rx="1.5" />
        <rect x="14" y="14" width="7" height="7" rx="1.5" />
      </svg>
    ),
  },
  {
    key: "messages",
    path: "/messages",
    label: "Messagerie",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
        <polyline points="22,6 12,13 2,6" />
      </svg>
    ),
  },
  // Bilan = FAB central — géré séparément dans le render
  {
    key: "clients",
    path: "/clients",
    label: "Clients",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
      </svg>
    ),
  },
];

export function BottomNav() {
  const location = useLocation();
  const { unreadMessageCount } = useAppContext();

  // Masquer pendant le bilan (plein écran).
  if (location.pathname.includes("/assessments/new")) return null;

  const isActive = (path: string) =>
    location.pathname === path ||
    (path === "/co-pilote" && location.pathname === "/dashboard") ||
    (path !== "/co-pilote" && location.pathname.startsWith(path));

  function renderItem(
    path: string,
    label: string,
    icon: React.ReactNode,
    active: boolean,
    badge?: number,
    highlight?: boolean,
    tourId?: string,
  ) {
    const color = active
      ? highlight ? "#BA7517" : "var(--ls-gold)"
      : highlight ? "#BA7517" : "var(--ls-text-hint)";
    return (
      <NavLink
        key={path}
        to={path}
        data-tour-id={tourId}
        style={{
          flex: 1,
          maxWidth: 80,
          minHeight: 44,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 2,
          textDecoration: "none",
          color,
          padding: "6px 4px",
          position: "relative",
        }}
      >
        <span style={{ display: "inline-flex", position: "relative" }}>
          {icon}
          {badge && badge > 0 ? (
            <span
              style={{
                position: "absolute",
                top: -3,
                right: -7,
                minWidth: 12,
                height: 12,
                padding: "0 3px",
                borderRadius: 6,
                background: "#E24B4A",
                color: "#FFFFFF",
                fontSize: 8,
                fontWeight: 700,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                lineHeight: 1,
              }}
            >
              {badge}
            </span>
          ) : null}
        </span>
        <span
          style={{
            fontSize: 9,
            fontFamily: "DM Sans, sans-serif",
            fontWeight: active ? 600 : 500,
            letterSpacing: "0.04em",
          }}
        >
          {label}
        </span>
        {/* Indicateur actif : petite barre gold en bas */}
        {active ? (
          <span
            aria-hidden="true"
            style={{
              position: "absolute",
              bottom: 2,
              width: 16,
              height: 2,
              borderRadius: 2,
              background: highlight ? "#BA7517" : "var(--ls-gold)",
            }}
          />
        ) : null}
      </NavLink>
    );
  }

  return (
    <>
      <nav
        className="bottom-nav fixed bottom-0 left-0 right-0 z-50 lg:hidden xl:hidden"
        style={{
          // Modernisation 2026-04-24 : barre plus fine (44px au lieu
          // de 56), flat (pas de FAB qui déborde), alignement propre,
          // badge messagerie plus discret.
          background: "var(--ls-sidebar-bg)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          borderTop: "1px solid var(--ls-border)",
          display: "flex",
          alignItems: "stretch",
          justifyContent: "space-around",
          padding: "0 4px env(safe-area-inset-bottom, 0px)",
        }}
      >
        {/* 5 items identiques, compact tab bar — inspiration iOS native.
            Patch 1 mobile (2026-04-26) : data-tour-id propages depuis la
            sidebar desktop pour que TourRunner trouve une cible visible
            sur mobile (findVisibleTarget filtre l element rect-zero de
            la sidebar cachee). */}
        {renderItem(PRIMARY_ITEMS[0].path, PRIMARY_ITEMS[0].label, PRIMARY_ITEMS[0].icon, isActive(PRIMARY_ITEMS[0].path), undefined, false, "nav-copilote")}
        {renderItem(
          PRIMARY_ITEMS[1].path,
          PRIMARY_ITEMS[1].label,
          PRIMARY_ITEMS[1].icon,
          isActive(PRIMARY_ITEMS[1].path),
          unreadMessageCount,
          false,
          "nav-messagerie",
        )}
        {/* Bilan = item gold mais SANS FAB qui dépasse */}
        {renderItem(
          "/assessments/new",
          "Bilan",
          (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          ),
          location.pathname.includes("/assessments/new"),
          undefined,
          true, // highlight gold
          "nav-new-bilan",
        )}
        {renderItem(PRIMARY_ITEMS[2].path, PRIMARY_ITEMS[2].label, PRIMARY_ITEMS[2].icon, isActive(PRIMARY_ITEMS[2].path), undefined, false, "nav-clients")}

        {/* Agenda — remplace l'ancien bouton "Plus" (drawer bottom sheet
            retiré 2026-05-20, doublon avec le drawer hamburger principal). */}
        {renderItem(
          "/agenda",
          "Agenda",
          (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <rect x="3" y="4" width="18" height="18" rx="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
          ),
          isActive("/agenda"),
          undefined,
          false,
          "nav-agenda",
        )}
      </nav>
    </>
  );
}
