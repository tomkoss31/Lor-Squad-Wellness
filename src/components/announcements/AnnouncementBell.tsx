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

import { useEffect, useRef, useState } from "react";
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
  const ref = useRef<HTMLDivElement>(null);

  // Click outside fermeture
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  const handleAnnouncementClick = async (id: string, linkPath: string | null) => {
    await markRead(id);
    setOpen(false);
    if (linkPath) navigate(linkPath);
  };

  const top = announcements.slice(0, 5);

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={`Nouveautés ${unreadCount > 0 ? `(${unreadCount} non lues)` : ""}`}
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

      {open && (
        <div style={dropdownStyle}>
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
  position: "absolute",
  top: "calc(100% + 8px)",
  right: 0,
  width: "min(360px, 92vw)",
  background: "var(--ls-surface)",
  border: "0.5px solid var(--ls-border)",
  borderRadius: 14,
  boxShadow: "0 16px 48px color-mix(in srgb, var(--ls-text) 18%, transparent)",
  zIndex: 1000,
  overflow: "hidden",
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
