// =============================================================================
// NouveautesPage — journal complet des annonces (2026-05-04)
//
// Liste TOUTES les annonces visibles pour l'utilisateur (pas juste les 5
// dernières comme la cloche). Affichage chronologique, badge Nouveau pour
// non lues, CTA si link_path.
// =============================================================================

import { useNavigate } from "react-router-dom";
import { useAppContext } from "../context/AppContext";
import { useAnnouncements } from "../hooks/useAnnouncements";
import { ACCENT_TO_TOKEN } from "../types/announcement";

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return new Intl.DateTimeFormat("fr-FR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    }).format(d);
  } catch {
    return "";
  }
}

export function NouveautesPage() {
  const navigate = useNavigate();
  const { currentUser } = useAppContext();
  const { announcements, readIds, unreadCount, markRead, markAllRead, loading } =
    useAnnouncements(currentUser?.id ?? null);

  const handleClick = async (id: string, linkPath: string | null) => {
    await markRead(id);
    if (linkPath) navigate(linkPath);
  };

  return (
    <div style={pageWrap}>
      <button type="button" onClick={() => navigate("/developpement")} style={backBtn}>
        ← Mon développement
      </button>

      <div style={heroBox}>
        <div style={heroEyebrow}>🆕 Journal app</div>
        <h1 style={heroTitle}>Toutes les nouveautés</h1>
        <p style={heroSubtitle}>
          Le suivi complet des features ajoutées à l'app. Reste au courant pour ne rien
          rater.
        </p>
        {unreadCount > 0 && (
          <button type="button" onClick={() => markAllRead()} style={markAllBtn}>
            ✓ Tout marquer comme lu ({unreadCount})
          </button>
        )}
      </div>

      {loading ? (
        <div style={emptyState}>Chargement…</div>
      ) : announcements.length === 0 ? (
        <div style={emptyState}>Aucune nouveauté pour l'instant.</div>
      ) : (
        <div style={{ display: "grid", gap: 12, marginTop: 22 }}>
          {announcements.map((a) => {
            const isRead = readIds.has(a.id);
            const accent = ACCENT_TO_TOKEN[a.accent];
            return (
              <article key={a.id} style={cardStyle(accent, isRead)}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
                  <div style={emojiCircle(accent)}>{a.emoji}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
                      <h3 style={cardTitle}>{a.title}</h3>
                      {!isRead && <span style={newBadge(accent)}>Nouveau</span>}
                    </div>
                    <div style={cardDate}>{formatDate(a.published_at)}</div>
                    <p style={cardBody}>{a.body}</p>
                    <div style={{ display: "flex", gap: 10, marginTop: 12, flexWrap: "wrap" }}>
                      {a.link_path && (
                        <button
                          type="button"
                          onClick={() => handleClick(a.id, a.link_path)}
                          style={ctaPrimary(accent)}
                        >
                          {a.link_label ?? "Découvrir"} →
                        </button>
                      )}
                      {!isRead && (
                        <button
                          type="button"
                          onClick={() => markRead(a.id)}
                          style={ctaGhost}
                        >
                          Marquer lu
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────

const pageWrap: React.CSSProperties = {
  maxWidth: 760,
  margin: "0 auto",
  padding: "20px 18px 60px",
};

const backBtn: React.CSSProperties = {
  background: "transparent",
  border: "none",
  color: "var(--ls-text-muted)",
  fontFamily: "DM Sans, sans-serif",
  fontSize: 13,
  cursor: "pointer",
  marginBottom: 14,
  padding: 0,
};

const heroBox: React.CSSProperties = {
  background:
    "linear-gradient(135deg, color-mix(in srgb, var(--ls-teal) 12%, var(--ls-surface)), var(--ls-surface))",
  border: "0.5px solid color-mix(in srgb, var(--ls-teal) 30%, var(--ls-border))",
  borderRadius: 18,
  padding: "24px 20px",
};

const heroEyebrow: React.CSSProperties = {
  fontFamily: "DM Sans, sans-serif",
  fontSize: 11,
  fontWeight: 600,
  textTransform: "uppercase",
  letterSpacing: 1.4,
  color: "var(--ls-teal)",
  marginBottom: 8,
};

const heroTitle: React.CSSProperties = {
  margin: 0,
  fontFamily: "Syne, sans-serif",
  fontSize: 26,
  fontWeight: 800,
  color: "var(--ls-text)",
  lineHeight: 1.15,
};

const heroSubtitle: React.CSSProperties = {
  margin: "10px 0 0",
  fontSize: 14,
  lineHeight: 1.55,
  color: "var(--ls-text-muted)",
};

const markAllBtn: React.CSSProperties = {
  marginTop: 14,
  padding: "8px 14px",
  borderRadius: 10,
  background: "transparent",
  border: "0.5px solid var(--ls-border)",
  color: "var(--ls-text)",
  fontFamily: "DM Sans, sans-serif",
  fontSize: 12,
  cursor: "pointer",
};

const emptyState: React.CSSProperties = {
  marginTop: 30,
  padding: "30px 20px",
  textAlign: "center",
  color: "var(--ls-text-muted)",
  fontFamily: "DM Sans, sans-serif",
  fontSize: 14,
};

const cardStyle = (accent: string, isRead: boolean): React.CSSProperties => ({
  background: isRead ? "var(--ls-surface)" : `color-mix(in srgb, ${accent} 5%, var(--ls-surface))`,
  border: "0.5px solid var(--ls-border)",
  borderLeft: `3px solid ${accent}`,
  borderRadius: 14,
  padding: "16px 18px",
});

const emojiCircle = (accent: string): React.CSSProperties => ({
  width: 44,
  height: 44,
  borderRadius: 12,
  background: `color-mix(in srgb, ${accent} 14%, var(--ls-surface2))`,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: 24,
  flexShrink: 0,
});

const cardTitle: React.CSSProperties = {
  margin: 0,
  fontFamily: "Syne, sans-serif",
  fontSize: 16,
  fontWeight: 700,
  color: "var(--ls-text)",
};

const newBadge = (accent: string): React.CSSProperties => ({
  fontSize: 9,
  fontFamily: "DM Sans, sans-serif",
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: 0.8,
  padding: "2px 8px",
  borderRadius: 7,
  background: `color-mix(in srgb, ${accent} 14%, transparent)`,
  color: accent,
  border: `0.5px solid ${accent}`,
});

const cardDate: React.CSSProperties = {
  fontSize: 11,
  color: "var(--ls-text-muted)",
  fontFamily: "DM Sans, sans-serif",
  marginTop: 2,
  marginBottom: 8,
};

const cardBody: React.CSSProperties = {
  margin: 0,
  fontSize: 13,
  lineHeight: 1.55,
  color: "var(--ls-text)",
};

const ctaPrimary = (accent: string): React.CSSProperties => ({
  padding: "8px 14px",
  borderRadius: 10,
  border: "none",
  background: `linear-gradient(135deg, ${accent}, color-mix(in srgb, ${accent} 75%, var(--ls-coral)))`,
  color: "var(--ls-bg)",
  fontFamily: "Syne, sans-serif",
  fontSize: 12,
  fontWeight: 700,
  cursor: "pointer",
});

const ctaGhost: React.CSSProperties = {
  padding: "8px 14px",
  borderRadius: 10,
  border: "0.5px solid var(--ls-border)",
  background: "transparent",
  color: "var(--ls-text-muted)",
  fontFamily: "DM Sans, sans-serif",
  fontSize: 12,
  cursor: "pointer",
};
