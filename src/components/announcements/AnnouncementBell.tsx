// =============================================================================
// AnnouncementBell — cloche header + dropdown des nouveautés (2026-05-04)
//
// Click cloche → dropdown qui liste les annonces (max 5 récentes), avec
// badges Nouveau pour les non lues. Clic sur une annonce :
//   - mark as read
//   - navigate vers link_path si défini
//
// "Voir tout" → /developpement/nouveautes
// =============================================================================

import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { useAppContext } from "../../context/AppContext";
import { useAnnouncements } from "../../hooks/useAnnouncements";
import { ACCENT_TO_TOKEN } from "../../types/announcement";

export function AnnouncementBell() {
  const navigate = useNavigate();
  const { currentUser } = useAppContext();
  const { announcements, readIds, unreadCount, markRead, markAllRead } = useAnnouncements(
    currentUser?.id ?? null,
  );
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  // Ancre de positionnement du dropdown — portalé vers <body> pour échapper au
  // contexte d'empilement du header mobile (backdrop-filter) qui le rendait
  // illisible sous la topbar sur iPhone (fix 2026-06-12).
  const [anchor, setAnchor] = useState<{ top: number; right: number }>({ top: 64, right: 8 });

  const toggleOpen = () => {
    const r = btnRef.current?.getBoundingClientRect();
    if (r) setAnchor({ top: r.bottom + 8, right: Math.max(8, window.innerWidth - r.right) });
    setOpen((o) => !o);
  };

  const handleAnnouncementClick = async (id: string, linkPath: string | null) => {
    await markRead(id);
    setOpen(false);
    if (linkPath) navigate(linkPath);
  };

  const top = announcements.slice(0, 5);

  return (
    <div style={{ position: "relative", display: "inline-flex" }}>
      {/* 2026-06-10 (retour Thomas) : la cloche s'illumine et se balance tant
          qu'il y a des nouveautés non lues — remplace la grosse card
          "Nouveautés app" retirée du hub Développement. */}
      <style>{`
        @keyframes ls-bell-glow {
          0%, 100% { box-shadow: 0 0 0 0 color-mix(in srgb, var(--ls-gold) 40%, transparent); }
          50% { box-shadow: 0 0 14px 3px color-mix(in srgb, var(--ls-gold) 38%, transparent); }
        }
        @keyframes ls-bell-swing {
          0%, 55%, 100% { transform: rotate(0); }
          10% { transform: rotate(14deg); }
          25% { transform: rotate(-10deg); }
          40% { transform: rotate(5deg); }
        }
        .ls-bell-unread {
          animation: ls-bell-glow 2.4s ease-in-out infinite;
          border-color: color-mix(in srgb, var(--ls-gold) 55%, var(--ls-border)) !important;
          color: var(--ls-gold) !important;
        }
        .ls-bell-unread svg {
          animation: ls-bell-swing 2.4s ease-in-out infinite;
          transform-origin: 50% 2px;
        }
        @media (prefers-reduced-motion: reduce) {
          .ls-bell-unread, .ls-bell-unread svg { animation: none; }
        }
      `}</style>
      <button
        ref={btnRef}
        type="button"
        onClick={toggleOpen}
        aria-label={`Nouveautés ${unreadCount > 0 ? `(${unreadCount} non lues)` : ""}`}
        className={unreadCount > 0 ? "ls-bell-unread" : undefined}
        style={bellBtn}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unreadCount > 0 && (
          <span style={badgeStyle}>{unreadCount > 9 ? "9+" : unreadCount}</span>
        )}
      </button>

      {open && createPortal(
        <>
          <div onClick={() => setOpen(false)} aria-hidden="true" style={scrimStyle} />
          <div style={{ ...dropdownStyle, top: anchor.top, right: anchor.right }}>
          <div style={dropdownHeader}>
            <span style={{ fontFamily: "Syne, sans-serif", fontWeight: 700, fontSize: 14, color: "var(--ls-text)" }}>
              ✨ Nouveautés
            </span>
            {unreadCount > 0 && (
              <button type="button" onClick={() => markAllRead()} style={markAllBtn}>
                Tout marquer lu
              </button>
            )}
          </div>

          {top.length === 0 ? (
            <div style={emptyState}>Aucune nouveauté pour l'instant.</div>
          ) : (
            <ul style={listStyle}>
              {top.map((a) => {
                const isRead = readIds.has(a.id);
                const accentColor = ACCENT_TO_TOKEN[a.accent];
                return (
                  <li key={a.id}>
                    <button
                      type="button"
                      onClick={() => handleAnnouncementClick(a.id, a.link_path)}
                      style={itemBtn(isRead, accentColor)}
                    >
                      <div style={itemEmoji(accentColor)}>{a.emoji}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
                          <span
                            style={{
                              fontFamily: "Syne, sans-serif",
                              fontWeight: isRead ? 500 : 700,
                              fontSize: 13,
                              color: "var(--ls-text)",
                            }}
                          >
                            {a.title}
                          </span>
                          {!isRead && <span style={dotUnread(accentColor)} />}
                        </div>
                        <div style={itemBody}>{a.body.slice(0, 90)}{a.body.length > 90 ? "…" : ""}</div>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          <button
            type="button"
            onClick={() => {
              setOpen(false);
              navigate("/developpement/nouveautes");
            }}
            style={seeAllBtn}
          >
            Voir tout le journal →
          </button>
          </div>
        </>,
        document.body,
      )}
    </div>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────

const bellBtn: React.CSSProperties = {
  position: "relative",
  width: 36,
  height: 36,
  borderRadius: 10,
  background: "transparent",
  border: "0.5px solid var(--ls-border)",
  color: "var(--ls-text)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
};

const badgeStyle: React.CSSProperties = {
  position: "absolute",
  top: -4,
  right: -4,
  minWidth: 18,
  height: 18,
  padding: "0 5px",
  borderRadius: 9,
  background: "var(--ls-coral)",
  color: "var(--ls-bg)",
  fontFamily: "DM Sans, sans-serif",
  fontSize: 10,
  fontWeight: 700,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  lineHeight: 1,
};

const dropdownStyle: React.CSSProperties = {
  position: "fixed",
  // top/right injectés dynamiquement depuis l'ancre de la cloche (portal body).
  width: "min(360px, 92vw)",
  background: "var(--ls-surface)",
  border: "0.5px solid var(--ls-border)",
  borderRadius: 14,
  boxShadow: "0 16px 48px color-mix(in srgb, var(--ls-text) 30%, transparent)",
  zIndex: 4000,
  overflow: "hidden",
};

// Scrim transparent plein écran : capte le clic-dehors pour fermer (remplace
// l'ancien listener mousedown, cassé par le portal).
const scrimStyle: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 3999,
  background: "transparent",
};

const dropdownHeader: React.CSSProperties = {
  padding: "12px 14px",
  borderBottom: "0.5px solid var(--ls-border)",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
};

const markAllBtn: React.CSSProperties = {
  background: "transparent",
  border: "none",
  color: "var(--ls-text-muted)",
  fontFamily: "DM Sans, sans-serif",
  fontSize: 11,
  cursor: "pointer",
  textDecoration: "underline",
  padding: 0,
};

const emptyState: React.CSSProperties = {
  padding: "24px 16px",
  textAlign: "center",
  color: "var(--ls-text-muted)",
  fontSize: 13,
  fontFamily: "DM Sans, sans-serif",
};

const listStyle: React.CSSProperties = {
  margin: 0,
  padding: 0,
  listStyle: "none",
  maxHeight: 360,
  overflowY: "auto",
};

const itemBtn = (isRead: boolean, accent: string): React.CSSProperties => ({
  width: "100%",
  padding: "12px 14px",
  background: isRead ? "transparent" : `color-mix(in srgb, ${accent} 6%, transparent)`,
  border: "none",
  borderBottom: "0.5px solid var(--ls-border)",
  display: "flex",
  alignItems: "flex-start",
  gap: 10,
  cursor: "pointer",
  textAlign: "left",
});

const itemEmoji = (accent: string): React.CSSProperties => ({
  width: 32,
  height: 32,
  borderRadius: 10,
  background: `color-mix(in srgb, ${accent} 14%, var(--ls-surface2))`,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: 18,
  flexShrink: 0,
});

const itemBody: React.CSSProperties = {
  marginTop: 2,
  fontSize: 12,
  lineHeight: 1.5,
  color: "var(--ls-text-muted)",
};

const dotUnread = (accent: string): React.CSSProperties => ({
  width: 7,
  height: 7,
  borderRadius: "50%",
  background: accent,
  flexShrink: 0,
});

const seeAllBtn: React.CSSProperties = {
  width: "100%",
  padding: "12px 14px",
  background: "var(--ls-surface2)",
  border: "none",
  borderTop: "0.5px solid var(--ls-border)",
  color: "var(--ls-gold)",
  fontFamily: "DM Sans, sans-serif",
  fontSize: 12,
  fontWeight: 700,
  cursor: "pointer",
  textAlign: "center",
};
