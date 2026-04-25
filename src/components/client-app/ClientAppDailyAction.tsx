// Action du jour (Chantier Refonte Accueil + Évolution v2, 2026-04-25).

interface Props {
  done?: boolean;
  onDo?: () => void;
}

const CORAL = "#D85A30";
const TEAL = "#1D9E75";
const TEXT = "#444";
const MUTED = "#888";

export function ClientAppDailyAction({ done = false, onDo }: Props) {
  if (done) {
    return (
      <div
        style={{
          background: "#FFFFFF",
          borderLeft: `4px solid ${CORAL}`,
          padding: 16,
          borderRadius: 12,
          fontFamily: '"DM Sans", sans-serif',
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        <div style={{ fontSize: 13, fontWeight: 600, color: TEAL }}>
          ✅ Action du jour terminée
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        background: "#FFFFFF",
        borderLeft: `4px solid ${CORAL}`,
        padding: 16,
        borderRadius: 12,
        fontFamily: '"DM Sans", sans-serif',
      }}
    >
      <div
        style={{
          fontSize: 10,
          color: CORAL,
          letterSpacing: 1.5,
          fontWeight: 500,
          textTransform: "uppercase",
          marginBottom: 10,
        }}
      >
        ⚡ TON ACTION DU JOUR
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div
          aria-hidden="true"
          style={{
            width: 40,
            height: 40,
            borderRadius: 999,
            background: "rgba(216,90,48,0.10)",
            color: CORAL,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 18,
            flexShrink: 0,
          }}
        >
          📊
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: TEXT }}>
            Fais ta pesée du jour
          </div>
          <div style={{ fontSize: 12, color: MUTED, marginTop: 2 }}>
            Note ton poids pour suivre ta courbe
          </div>
        </div>
        <button
          type="button"
          onClick={onDo}
          style={{
            background: CORAL,
            color: "#FFFFFF",
            padding: "8px 14px",
            borderRadius: 8,
            border: "none",
            fontWeight: 600,
            fontSize: 12,
            cursor: "pointer",
            fontFamily: '"DM Sans", sans-serif',
            flexShrink: 0,
          }}
        >
          Faire
        </button>
      </div>
    </div>
  );
}
