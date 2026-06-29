// =============================================================================
// QuiInviterLive — section « Qui inviter » du cockpit, données réelles.
// Monté uniquement en mode live (le hook ne fetch donc qu'à ce moment).
// =============================================================================

import { useNavigate } from "react-router-dom";
import { useQuiInviter, type InviteCandidate } from "./useQuiInviter";

const MONO: React.CSSProperties = { fontFamily: "var(--ls-ops-font-mono)" };

export function QuiInviterLive() {
  const navigate = useNavigate();
  const { candidates, loading } = useQuiInviter(4);

  if (loading) return null;

  return (
    <div style={{ marginTop: 30 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <span style={{ ...MONO, fontSize: 11, letterSpacing: ".16em", textTransform: "uppercase", color: "var(--ls-ops-muted)" }}>
          Qui inviter · maintenant
        </span>
        <button type="button" onClick={() => navigate("/crm")} style={linkBtn}>
          tout voir →
        </button>
      </div>

      {candidates.length === 0 ? (
        <div style={emptyCard}>
          <div style={{ fontSize: 14, color: "var(--ls-ops-text3)", lineHeight: 1.5 }}>
            Personne à relancer pour l'instant. Commence par écrire ta Liste 100 — tes 100 premiers contacts.
          </div>
          <button type="button" onClick={() => navigate("/cahier-de-bord?tab=liste")} style={emptyCta}>
            Ouvrir ma Liste 100 →
          </button>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {candidates.map((c) => (
            <Row key={c.id} c={c} onOpen={() => (c.waLink ? window.open(c.waLink, "_blank") : navigate(c.path))} />
          ))}
        </div>
      )}
    </div>
  );
}

function Row({ c, onOpen }: { c: InviteCandidate; onOpen: () => void }) {
  const tone =
    c.tone === "hot" ? "var(--ls-ops-hot)" : c.tone === "warm" ? "var(--ls-ops-warm)" : "var(--ls-ops-muted)";
  const initial = (c.name || "?").trim().charAt(0).toUpperCase() || "?";
  return (
    <button type="button" onClick={onOpen} style={rowBtn}>
      <span style={{ ...avatar, color: tone }}>{initial}</span>
      <span style={{ flex: 1, textAlign: "left", minWidth: 0 }}>
        <span style={{ display: "block", fontSize: 15, color: "var(--ls-ops-ink)", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {c.name}
        </span>
        <span style={{ ...MONO, fontSize: 10.5, letterSpacing: ".06em", textTransform: "uppercase", color: tone }}>
          ● {c.statusLabel}
        </span>
      </span>
      <span style={{ ...MONO, fontSize: 12, color: c.waLink ? "var(--ls-ops-accent-text)" : "var(--ls-ops-faint)", flex: "none" }}>
        {c.waLink ? "WhatsApp →" : "→"}
      </span>
    </button>
  );
}

const rowBtn: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 13,
  width: "100%",
  background: "var(--ls-ops-surface)",
  border: "1px solid var(--ls-ops-border)",
  borderRadius: 16,
  padding: "13px 16px",
  cursor: "pointer",
  fontFamily: "inherit",
};

const avatar: React.CSSProperties = {
  width: 38,
  height: 38,
  borderRadius: "50%",
  background: "linear-gradient(135deg, var(--ls-ops-border-active), var(--ls-ops-surface2))",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontFamily: "var(--ls-ops-font-display)",
  fontSize: 16,
  flex: "none",
};

const linkBtn: React.CSSProperties = {
  ...MONO,
  fontSize: 10.5,
  letterSpacing: ".06em",
  textTransform: "uppercase",
  color: "var(--ls-ops-faint)",
  background: "transparent",
  border: "none",
  cursor: "pointer",
};

const emptyCard: React.CSSProperties = {
  background: "var(--ls-ops-surface)",
  border: "1px dashed var(--ls-ops-border-active)",
  borderRadius: 16,
  padding: 18,
};

const emptyCta: React.CSSProperties = {
  marginTop: 12,
  background: "var(--ls-ops-cta-bg)",
  border: "1px solid var(--ls-ops-border-active)",
  color: "var(--ls-ops-accent-text)",
  borderRadius: 12,
  padding: "11px 14px",
  fontSize: 14,
  fontWeight: 600,
  cursor: "pointer",
  fontFamily: "inherit",
};
