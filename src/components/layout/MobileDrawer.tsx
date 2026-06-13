// =============================================================================
// MobileDrawer — Chantier refonte mobile Onde 1 (2026-05-20)
//
// Drawer slide-left mobile-first basé sur le mockup Claude Design
// "La Base 360 - Mobile mockups" validé Thomas.
//
// - Slide depuis la gauche, 280ms cubic-bezier
// - Largeur 82% du viewport (laisse voir l'app derrière)
// - Scrim noir + blur 2px en background
// - Sections : Navigation / Équipe (admin) / Développement / Compte
// - Header avec avatar + nom + rôle
// - Footer : streak coaching + version app
// - Fermeture : tap scrim, ESC, ou tap item de nav (auto-close on navigate)
// - Touch targets ≥ 44px
//
// Styles : classes lb-drawer, lb-scrim, lb-drawer-* dans globals.css
// =============================================================================

import { useEffect, useState } from "react";
import { NavLink } from "react-router-dom";
import { useAppContext } from "../../context/AppContext";
import { getRoleLabel } from "../../lib/auth";
import { useFormationStreak } from "../../hooks/useFormationStreak";
import { useHaptic } from "../../hooks/useHaptic";
import { CoachInstallPwaButton } from "../pwa/CoachInstallPwaButton";
import { BUSINESS_SHORTCUTS, isBusinessRoute } from "./businessShortcuts";

interface MobileDrawerProps {
  open: boolean;
  onClose: () => void;
  onLogout: () => Promise<void> | void;
  navItems: Array<{
    label: string;
    path: string;
    emoji: string;
    badge: number;
    urgent?: boolean;
    adminChip?: boolean;
  }>;
  currentPath: string;
}

export function MobileDrawer({ open, onClose, onLogout, navItems, currentPath }: MobileDrawerProps) {
  const { currentUser } = useAppContext();
  const { count: streakDays, badge: streakBadge } = useFormationStreak();

  // ESC pour fermer
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  // Lock body scroll quand drawer ouvert
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!currentUser) return null;

  const initials = currentUser.name
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const isAdmin = currentUser.role === "admin";

  // Sépare la navigation en sections logiques :
  // - Équipe (Mon équipe, admin only) / Développement / Compte sont des
  //   buckets ciblés ; le reste tombe dans « Navigation » (catch-all, pour
  //   que tout nouvel item — ex. Outils — y apparaisse sans oubli).
  const navTeam = navItems.filter((item) => item.path === "/team");
  const navDev = navItems.filter((item) => item.path === "/developpement");
  const navAccount = navItems.filter((item) => item.path === "/parametres");
  const navMain = navItems.filter(
    (item) => !["/team", "/developpement", "/parametres"].includes(item.path),
  );

  const isItemActive = (path: string) =>
    currentPath === path ||
    (path === "/clients" && currentPath.startsWith("/clients/")) ||
    (path === "/pv" && currentPath.startsWith("/pv"));

  return (
    <>
      {open && <div className="lb-scrim" onClick={onClose} aria-hidden="true" />}
      <aside
        className="lb-drawer"
        role="dialog"
        aria-modal="true"
        aria-label="Menu de navigation"
        aria-hidden={!open}
        style={{
          transform: open ? "translateX(0)" : "translateX(-100%)",
          transition: "transform 280ms cubic-bezier(.2,.7,.2,1)",
        }}
      >
        {/* Header : avatar + nom + rôle + close */}
        <header className="lb-drawer-head">
          <div className="lb-avatar" aria-hidden="true">{initials || "?"}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="lb-drawer-name">{currentUser.name}</div>
            <div className="lb-drawer-role">
              {getRoleLabel(currentUser.role)}
              {isAdmin ? " · Admin" : ""}
            </div>
          </div>
          <button
            type="button"
            className="lb-icon-btn"
            onClick={onClose}
            aria-label="Fermer le menu"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </header>

        {/* Body : sections */}
        <div className="lb-drawer-body">
          <DrawerSection label="Navigation">
            {navMain.map((item) =>
              item.path === "/outils" ? (
                // « Mon business » dépliable, mêmes raccourcis que la sidebar PC
                // (décision Thomas 2026-06-13 : aligner PC/mobile).
                <DrawerBusinessGroup
                  key={item.path}
                  item={item}
                  currentPath={currentPath}
                  onSelect={onClose}
                />
              ) : (
                <DrawerItem
                  key={item.path}
                  item={item}
                  active={isItemActive(item.path)}
                  onSelect={onClose}
                />
              ),
            )}
          </DrawerSection>

          {isAdmin && navTeam.length > 0 ? (
            <DrawerSection label="Équipe">
              {navTeam.map((item) => (
                <DrawerItem
                  key={item.path}
                  item={item}
                  active={isItemActive(item.path)}
                  onSelect={onClose}
                />
              ))}
            </DrawerSection>
          ) : null}

          <DrawerSection label="Développement">
            {navDev.map((item) => (
              <DrawerItem
                key={item.path}
                item={item}
                active={isItemActive(item.path)}
                onSelect={onClose}
              />
            ))}
          </DrawerSection>

          <DrawerSection label="Compte">
            {navAccount.map((item) => (
              <DrawerItem
                key={item.path}
                item={item}
                active={isItemActive(item.path)}
                onSelect={onClose}
              />
            ))}
            <button
              type="button"
              className="lb-drawer-item danger"
              onClick={() => {
                onClose();
                void onLogout();
              }}
            >
              <span className="icon" aria-hidden="true">🚪</span>
              <span style={{ flex: 1, textAlign: "left" }}>Se déconnecter</span>
            </button>
          </DrawerSection>

          {/* Install PWA si pertinent */}
          <div style={{ padding: "8px 12px 0" }}>
            <CoachInstallPwaButton />
          </div>
        </div>

        {/* Footer : streak + version */}
        <footer className="lb-drawer-foot">
          {streakDays > 0 ? (
            <div className="lb-streak gold-keep">
              <div className="flame" aria-hidden="true">
                {streakBadge.emoji || "🔥"}
              </div>
              <div className="meta">
                <span className="t">
                  {streakDays} jour{streakDays > 1 ? "s" : ""} d'affilée
                  {streakBadge.level !== "none" ? ` · ${streakBadge.label}` : ""}
                </span>
                <span className="s">{streakBadge.hint || "Continue ton coaching quotidien"}</span>
              </div>
            </div>
          ) : null}
          <div className="lb-version">
            <span>La Base 360 · v1</span>
            <span>★ Since 2022 ★</span>
          </div>
        </footer>
      </aside>
    </>
  );
}

function DrawerSection({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section className="lb-drawer-section">
      <div className="lb-drawer-section-label">{label}</div>
      {children}
    </section>
  );
}

// « Mon business » dépliable dans le tiroir — miroir du sous-menu sidebar PC.
function DrawerBusinessGroup({
  item,
  currentPath,
  onSelect,
}: {
  item: { label: string; path: string; emoji: string };
  currentPath: string;
  onSelect: () => void;
}) {
  const haptic = useHaptic();
  const [expanded, setExpanded] = useState(() => isBusinessRoute(currentPath));
  const subActive = (p: string) => currentPath === p || currentPath.startsWith(p + "/");

  return (
    <div>
      <button
        type="button"
        className={`lb-drawer-item${currentPath === "/outils" ? " active" : ""}`}
        aria-expanded={expanded}
        onClick={() => {
          haptic("select");
          setExpanded((v) => !v);
        }}
      >
        <span className="icon" aria-hidden="true">{item.emoji}</span>
        <span style={{ flex: 1, textAlign: "left" }}>{item.label}</span>
        <span
          aria-hidden="true"
          style={{ fontSize: 11, opacity: 0.7, transition: "transform 0.2s ease", transform: expanded ? "rotate(180deg)" : "none" }}
        >
          ▾
        </span>
      </button>
      {expanded ? (
        <div style={{ paddingLeft: 14, display: "flex", flexDirection: "column", gap: 2, marginTop: 2 }}>
          {BUSINESS_SHORTCUTS.map((sub) => (
            <NavLink
              key={sub.path}
              to={sub.path}
              onClick={() => {
                haptic("select");
                onSelect();
              }}
              className={`lb-drawer-item${subActive(sub.path) ? " active" : ""}`}
              style={{ fontSize: 13 }}
            >
              <span className="icon" aria-hidden="true">{sub.emoji}</span>
              <span style={{ flex: 1 }}>{sub.label}</span>
            </NavLink>
          ))}
          <NavLink
            to="/outils"
            onClick={() => {
              haptic("select");
              onSelect();
            }}
            className={`lb-drawer-item${currentPath === "/outils" ? " active" : ""}`}
            style={{ fontSize: 13, opacity: 0.85 }}
          >
            <span className="icon" aria-hidden="true">⊞</span>
            <span style={{ flex: 1 }}>Tout voir</span>
          </NavLink>
        </div>
      ) : null}
    </div>
  );
}

function DrawerItem({
  item,
  active,
  onSelect,
}: {
  item: {
    label: string;
    path: string;
    emoji: string;
    badge: number;
    urgent?: boolean;
    adminChip?: boolean;
  };
  active: boolean;
  onSelect: () => void;
}) {
  const haptic = useHaptic();
  return (
    <NavLink
      to={item.path}
      onClick={() => {
        haptic("select");
        onSelect();
      }}
      className={`lb-drawer-item${active ? " active" : ""}`}
    >
      <span className="icon" aria-hidden="true">{item.emoji}</span>
      <span style={{ flex: 1 }}>{item.label}</span>
      {item.badge > 0 ? (
        <span className={`badge${item.urgent ? "" : " teal"}`}>{item.badge}</span>
      ) : null}
      {item.adminChip ? <span className="badge teal">Admin</span> : null}
    </NavLink>
  );
}
