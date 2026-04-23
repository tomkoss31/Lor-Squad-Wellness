// Chantier Refonte Navigation (2026-04-22) — commit 5/5.
//
// Nav mobile bas à 5 items avec FAB central "+ Bilan" :
//   Co-pilote · Messagerie · [+ Bilan] · Clients · Plus
//
// Clic "Plus" → drawer bottom sheet avec : Agenda, Suivi PV, Mon équipe
// (admin), Centre de formation, Paramètres, Sortir (bouton rouge en bas).
// Ce drawer rend le bouton Sortir toujours accessible côté mobile.

import { useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
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
  const navigate = useNavigate();
  const { currentUser, logout, unreadMessageCount } = useAppContext();
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Masquer pendant le bilan (plein écran).
  if (location.pathname.includes("/assessments/new")) return null;

  const isActive = (path: string) =>
    location.pathname === path ||
    (path === "/co-pilote" && location.pathname === "/dashboard") ||
    (path !== "/co-pilote" && location.pathname.startsWith(path));

  async function handleLogout() {
    setDrawerOpen(false);
    await logout();
    navigate("/login", { replace: true });
  }

  function renderItem(
    path: string,
    label: string,
    icon: React.ReactNode,
    active: boolean,
    badge?: number,
    highlight?: boolean,
  ) {
    const color = active
      ? highlight ? "#BA7517" : "var(--ls-gold)"
      : highlight ? "#BA7517" : "var(--ls-text-hint)";
    return (
      <NavLink
        key={path}
        to={path}
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

  function goTo(path: string) {
    setDrawerOpen(false);
    navigate(path);
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
        {/* 5 items identiques, compact tab bar — inspiration iOS native */}
        {renderItem(PRIMARY_ITEMS[0].path, PRIMARY_ITEMS[0].label, PRIMARY_ITEMS[0].icon, isActive(PRIMARY_ITEMS[0].path))}
        {renderItem(
          PRIMARY_ITEMS[1].path,
          PRIMARY_ITEMS[1].label,
          PRIMARY_ITEMS[1].icon,
          isActive(PRIMARY_ITEMS[1].path),
          unreadMessageCount,
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
        )}
        {renderItem(PRIMARY_ITEMS[2].path, PRIMARY_ITEMS[2].label, PRIMARY_ITEMS[2].icon, isActive(PRIMARY_ITEMS[2].path))}

        {/* Plus — même format */}
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          style={{
            flex: 1,
            maxWidth: 80,
            minHeight: 44,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 2,
            background: "transparent",
            border: "none",
            cursor: "pointer",
            color: "var(--ls-text-hint)",
            fontFamily: "DM Sans, sans-serif",
            padding: "6px 4px",
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <circle cx="5" cy="12" r="1.3" />
            <circle cx="12" cy="12" r="1.3" />
            <circle cx="19" cy="12" r="1.3" />
          </svg>
          <span style={{ fontSize: 9, letterSpacing: "0.04em", fontWeight: 500 }}>Plus</span>
        </button>
      </nav>

      {/* Drawer "Plus" */}
      {drawerOpen ? (
        <div
          role="button"
          tabIndex={0}
          aria-label="Fermer le menu"
          onClick={() => setDrawerOpen(false)}
          onKeyDown={(e) => {
            if (e.key === "Escape") setDrawerOpen(false);
          }}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            zIndex: 9000,
            display: "flex",
            alignItems: "flex-end",
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Menu supplémentaire"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
            style={{
              width: "100%",
              background: "var(--ls-sidebar-bg)",
              borderRadius: "18px 18px 0 0",
              padding: "16px 16px calc(16px + env(safe-area-inset-bottom, 0px))",
              borderTop: "1px solid var(--ls-border)",
              boxShadow: "0 -8px 30px rgba(0,0,0,0.3)",
              fontFamily: "DM Sans, sans-serif",
            }}
          >
            <div
              style={{
                width: 36,
                height: 4,
                background: "rgba(255,255,255,0.2)",
                borderRadius: 2,
                margin: "0 auto 16px",
              }}
            />
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <DrawerItem label="Agenda" icon="📅" onClick={() => goTo("/agenda")} />
              <DrawerItem label="Suivi PV" icon="📊" onClick={() => goTo("/pv")} />
              {currentUser?.role === "admin" ? (
                <DrawerItem label="Mon équipe" icon="👥" onClick={() => goTo("/team")} />
              ) : null}
              <DrawerItem label="Centre de formation" icon="📚" onClick={() => goTo("/formation")} />
              <DrawerItem
                label="Paramètres"
                icon="⚙️"
                onClick={() => goTo(currentUser?.role === "admin" ? "/parametres" : "/settings")}
              />
            </div>

            <div style={{ height: 1, background: "var(--ls-border)", margin: "14px 0" }} />

            <button
              type="button"
              onClick={() => void handleLogout()}
              style={{
                width: "100%",
                padding: "14px 16px",
                borderRadius: 12,
                background: "#FCEBEB",
                color: "#A32D2D",
                border: "none",
                fontFamily: "DM Sans, sans-serif",
                fontWeight: 500,
                fontSize: 14,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
              }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
              Sortir
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}

function DrawerItem({
  label,
  icon,
  onClick,
}: {
  label: string;
  icon: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        width: "100%",
        display: "flex",
        alignItems: "center",
        gap: 14,
        padding: "14px 12px",
        background: "transparent",
        border: "none",
        color: "var(--ls-text)",
        fontSize: 14,
        fontFamily: "DM Sans, sans-serif",
        cursor: "pointer",
        textAlign: "left",
        borderRadius: 10,
      }}
    >
      <span aria-hidden="true" style={{ fontSize: 18, width: 28, textAlign: "center" }}>
        {icon}
      </span>
      <span>{label}</span>
    </button>
  );
}
