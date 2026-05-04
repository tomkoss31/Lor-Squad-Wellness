// =============================================================================
// AnnouncementSpotlight — popup auto-affichée à la 1ère ouverture (2026-05-04)
//
// Logique :
//   - À chaque mount AppLayout, charge les announcements + reads
//   - Si au moins 1 annonce non lue qui n'a JAMAIS été spotlightée localement,
//     on affiche un popup festif (skippable, dismissable)
//   - "Découvrir" → mark read + navigate
//   - "Plus tard" → ferme sans mark (réapparaîtra demain MAX 1 fois/jour)
//
// localStorage clé : `ls-spotlight-shown-${announcementId}` = ymd
// → empêche d'afficher 2× dans la même journée. La cloche reste, elle, le
// vrai canal persistant.
// =============================================================================

import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAppContext } from "../../context/AppContext";
import { useAnnouncements } from "../../hooks/useAnnouncements";
import { ACCENT_TO_TOKEN, type AppAnnouncement } from "../../types/announcement";

function ymdToday(): string {
  const fmt = new Intl.DateTimeFormat("fr-CA", {
    timeZone: "Europe/Paris",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return fmt.format(new Date());
}

function spotlightShownToday(announcementId: string): boolean {
  try {
    return localStorage.getItem(`ls-spotlight-shown-${announcementId}`) === ymdToday();
  } catch {
    return false;
  }
}

function markSpotlightShown(announcementId: string): void {
  try {
    localStorage.setItem(`ls-spotlight-shown-${announcementId}`, ymdToday());
  } catch {
    // ignore
  }
}

export function AnnouncementSpotlight() {
  const navigate = useNavigate();
  const { currentUser } = useAppContext();
  const { announcements, readIds, markRead, loading } = useAnnouncements(
    currentUser?.id ?? null,
  );

  const candidate: AppAnnouncement | null = useMemo(() => {
    if (loading) return null;
    // 1ère annonce non lue ET pas déjà spotlightée aujourd'hui
    return (
      announcements.find((a) => !readIds.has(a.id) && !spotlightShownToday(a.id)) ?? null
    );
  }, [announcements, readIds, loading]);

  const [open, setOpen] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);

  // Déclenche l'ouverture quand un candidat apparaît
  useEffect(() => {
    if (candidate && !open) {
      setActiveId(candidate.id);
      setOpen(true);
      markSpotlightShown(candidate.id);
    }
  }, [candidate, open]);

  if (!open || !activeId) return null;
  const ann = announcements.find((a) => a.id === activeId);
  if (!ann) return null;

  const accent = ACCENT_TO_TOKEN[ann.accent];

  const handleDiscover = async () => {
    await markRead(ann.id);
    setOpen(false);
    if (ann.link_path) navigate(ann.link_path);
  };

  const handleLater = () => {
    setOpen(false);
  };

  const handleDismiss = async () => {
    await markRead(ann.id);
    setOpen(false);
  };

  return (
    <div style={overlayStyle} onClick={handleLater} role="dialog" aria-modal="true">
      <div
        style={modalStyle(accent)}
        onClick={(e) => e.stopPropagation()}
        className="ls-spotlight-modal"
      >
        <button type="button" onClick={handleDismiss} style={closeBtn} aria-label="Fermer">
          ×
        </button>

        <div style={emojiBig(accent)}>{ann.emoji}</div>

        <div style={tagStyle(accent)}>✨ Nouveauté</div>

        <h2 style={titleStyle}>{ann.title}</h2>
        <p style={bodyStyle}>{ann.body}</p>

        <div style={{ display: "flex", gap: 10, marginTop: 18, flexWrap: "wrap", justifyContent: "center" }}>
          {ann.link_path && (
            <button type="button" onClick={handleDiscover} style={primaryBtn(accent)}>
              {ann.link_label ?? "Découvrir"} →
            </button>
          )}
          <button type="button" onClick={handleLater} style={ghostBtn}>
            Plus tard
          </button>
        </div>
      </div>

      <style>{`
        .ls-spotlight-modal {
          animation: ls-spotlight-pop 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) both;
        }
        @keyframes ls-spotlight-pop {
          from { opacity: 0; transform: translateY(20px) scale(0.94); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @media (prefers-reduced-motion: reduce) {
          .ls-spotlight-modal { animation: none; }
        }
      `}</style>
    </div>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────

const overlayStyle: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "color-mix(in srgb, var(--ls-bg) 80%, transparent)",
  backdropFilter: "blur(6px)",
  WebkitBackdropFilter: "blur(6px)",
  zIndex: 9999,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 20,
};

const modalStyle = (accent: string): React.CSSProperties => ({
  position: "relative",
  width: "100%",
  maxWidth: 460,
  background: "var(--ls-surface)",
  border: `1px solid ${accent}`,
  borderRadius: 22,
  padding: "30px 26px 26px",
  textAlign: "center",
  boxShadow: `0 24px 72px color-mix(in srgb, ${accent} 30%, transparent)`,
});

const closeBtn: React.CSSProperties = {
  position: "absolute",
  top: 10,
  right: 12,
  width: 32,
  height: 32,
  borderRadius: 10,
  background: "transparent",
  border: "none",
  color: "var(--ls-text-muted)",
  fontSize: 22,
  cursor: "pointer",
  lineHeight: 1,
};

const emojiBig = (accent: string): React.CSSProperties => ({
  width: 80,
  height: 80,
  margin: "0 auto 14px",
  borderRadius: 22,
  background: `color-mix(in srgb, ${accent} 14%, var(--ls-surface2))`,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: 44,
});

const tagStyle = (accent: string): React.CSSProperties => ({
  display: "inline-block",
  fontSize: 10,
  fontFamily: "DM Sans, sans-serif",
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: 1.2,
  padding: "4px 10px",
  borderRadius: 8,
  background: `color-mix(in srgb, ${accent} 14%, transparent)`,
  color: accent,
  marginBottom: 12,
});

const titleStyle: React.CSSProperties = {
  margin: "0 0 10px",
  fontFamily: "Syne, sans-serif",
  fontSize: 22,
  fontWeight: 800,
  color: "var(--ls-text)",
  lineHeight: 1.2,
};

const bodyStyle: React.CSSProperties = {
  margin: 0,
  fontSize: 14,
  lineHeight: 1.6,
  color: "var(--ls-text-muted)",
};

const primaryBtn = (accent: string): React.CSSProperties => ({
  padding: "12px 22px",
  borderRadius: 12,
  border: "none",
  background: `linear-gradient(135deg, ${accent}, color-mix(in srgb, ${accent} 75%, var(--ls-coral)))`,
  color: "var(--ls-bg)",
  fontFamily: "Syne, sans-serif",
  fontSize: 13,
  fontWeight: 700,
  cursor: "pointer",
});

const ghostBtn: React.CSSProperties = {
  padding: "12px 18px",
  borderRadius: 12,
  border: "0.5px solid var(--ls-border)",
  background: "transparent",
  color: "var(--ls-text)",
  fontFamily: "DM Sans, sans-serif",
  fontSize: 13,
  fontWeight: 600,
  cursor: "pointer",
};
