// Chantier Refonte Navigation (2026-04-22) — commit 5/5.
// Refonte mobile 2026-06-13 (option A validée Thomas) : la barre du bas ne
// doublonne plus le menu hamburger. Elle ne porte QUE les 4 gestes du
// quotidien + le ➕ Bilan fixe au centre. Co-pilote est retiré de la barre
// (= tap sur le logo « La Base 360 » dans le header = retour accueil).
//
// Nav mobile bas à 5 items :
//   Clients · CRM · [+ Bilan] · Messagerie · Agenda
//
// Le reste (Co-pilote, Business & outils, Mon équipe, Mon développement,
// Paramètres, Sortir) → hamburger drawer principal en haut (MobileDrawer).
// Icônes redessinées, distinctes du style emoji de la sidebar/hamburger.

import { NavLink, useLocation } from "react-router-dom";
import { useAppContext } from "../../context/AppContext";
import { useCrmBadge } from "../../hooks/useCrmBadge";

export function BottomNav() {
  const location = useLocation();
  const { currentUser, unreadMessageCount } = useAppContext();
  const { count: crmBadgeCount } = useCrmBadge(currentUser?.isPassiveSupervisor !== true);

  // Masquer pendant le bilan (plein écran).
  if (location.pathname.includes("/assessments/new")) return null;

  const isActive = (path: string) =>
    location.pathname === path ||
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
    <nav
      className="bottom-nav fixed bottom-0 left-0 right-0 z-50 lg:hidden xl:hidden"
      style={{
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
      {/* 1 — Clients (carnet de contacts) */}
      {renderItem(
        "/clients",
        "Clients",
        (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
        ),
        isActive("/clients"),
        undefined,
        false,
        "nav-clients",
      )}

      {/* 2 — CRM (entonnoir / pipeline leads) */}
      {renderItem(
        "/crm",
        "CRM",
        (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 4h18l-7 8.5V20l-4-2v-5.5L3 4z" />
          </svg>
        ),
        isActive("/crm"),
        crmBadgeCount,
        false,
        "nav-crm",
      )}

      {/* 3 — Bilan = item gold central (toujours fixe) */}
      {renderItem(
        "/assessments/new",
        "Bilan",
        (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        ),
        location.pathname.includes("/assessments/new"),
        undefined,
        true, // highlight gold
        "nav-new-bilan",
      )}

      {/* 4 — Messagerie (bulle de chat) */}
      {renderItem(
        "/messages",
        "Messagerie",
        (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 11.5a8.4 8.4 0 0 1-9 8.4 8.7 8.7 0 0 1-3.8-.9L3 21l1.9-5.2A8.4 8.4 0 0 1 12 3a8.4 8.4 0 0 1 9 8.5z" />
          </svg>
        ),
        isActive("/messages"),
        unreadMessageCount,
        false,
        "nav-messagerie",
      )}

      {/* 5 — Agenda (calendrier) */}
      {renderItem(
        "/agenda",
        "Agenda",
        (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
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
  );
}
