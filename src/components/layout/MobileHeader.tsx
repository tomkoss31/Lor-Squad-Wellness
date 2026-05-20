// =============================================================================
// MobileHeader — Chantier refonte mobile Onde 1 (2026-05-20)
//
// Header compact 64px mobile-first basé sur le mockup Claude Design
// "La Base 360 - Mobile mockups".
//
// Composition (gauche → droite) :
//   - Bouton hamburger (44×44) → ouvre MobileDrawer
//   - Logo mark + texte "La Base 360" + crumb (page courante)
//   - Pill cloche (AnnouncementBell existant, masqué texte)
//   - Avatar coach (32×32, click = toggle theme)
//
// Sticky en haut, backdrop blur, border-bottom subtile.
// Le panel mobile précédent (logo + theme + install) est remplacé.
//
// Styles : globals.css classes lb-header, lb-logo-*, lb-pill, lb-avatar
// =============================================================================

import { useState } from "react";
import { useAppContext } from "../../context/AppContext";
import { useTheme } from "../../hooks/useTheme";
import { AnnouncementBell } from "../announcements/AnnouncementBell";
import { MobileDrawer } from "./MobileDrawer";

interface MobileHeaderProps {
  crumb: string;
  navItems: Array<{
    label: string;
    path: string;
    emoji: string;
    badge: number;
    urgent?: boolean;
    adminChip?: boolean;
  }>;
  currentPath: string;
  onLogout: () => Promise<void> | void;
}

export function MobileHeader({ crumb, navItems, currentPath, onLogout }: MobileHeaderProps) {
  const { currentUser } = useAppContext();
  const { isDark, toggleTheme } = useTheme();
  const [drawerOpen, setDrawerOpen] = useState(false);

  if (!currentUser) return null;

  const initials = currentUser.name
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <>
      <header className="lb-header xl:hidden">
        {/* Hamburger */}
        <button
          type="button"
          className="lb-icon-btn"
          onClick={() => setDrawerOpen(true)}
          aria-label="Ouvrir le menu"
        >
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M4 7h16M4 12h16M4 17h10" />
          </svg>
        </button>

        {/* Logo + crumb */}
        <div className="lb-logo-wrap">
          <div className="lb-logo-mark" aria-hidden="true">B</div>
          <div style={{ display: "flex", flexDirection: "column", minWidth: 0, gap: 1 }}>
            <span className="lb-logo-text">La Base 360</span>
            {crumb ? <span className="lb-crumb">{crumb}</span> : null}
          </div>
        </div>

        {/* Cloche annonces */}
        <AnnouncementBell />

        {/* Avatar = theme toggle */}
        <button
          type="button"
          className="lb-avatar"
          onClick={toggleTheme}
          aria-label={isDark ? "Passer au mode clair" : "Passer au mode sombre"}
          title={`${currentUser.name} — ${isDark ? "Mode clair" : "Mode sombre"}`}
        >
          {initials || "?"}
        </button>
      </header>

      <MobileDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        navItems={navItems}
        currentPath={currentPath}
        onLogout={onLogout}
      />
    </>
  );
}
