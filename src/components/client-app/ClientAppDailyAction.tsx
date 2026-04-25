// Chantier MEGA app client v2 (2026-04-25).
// Action du jour Accueil — bandeau coral border-left, icône ronde,
// titre+sous-titre, bouton "Faire". Spec figée, code chirurgical.

interface Props {
  onAction: () => void;
}

export function ClientAppDailyAction({ onAction }: Props) {
  return (
    <div
      style={{
        background: "#FFFFFF",
        borderRadius: "12px",
        padding: "14px",
        marginBottom: "12px",
        borderLeft: "4px solid #D85A30",
      }}
    >
      <div
        style={{
          fontSize: "10px",
          color: "#D85A30",
          letterSpacing: "1.5px",
          fontWeight: 500,
          marginBottom: "8px",
        }}
      >
        ⚡ TON ACTION DU JOUR
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        <div
          style={{
            width: "40px",
            height: "40px",
            borderRadius: "50%",
            background: "#FAECE7",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "20px",
            flexShrink: 0,
          }}
        >
          ⚖️
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: "14px", color: "#444", fontWeight: 500 }}>
            Fais ta pesée du jour
          </div>
          <div style={{ fontSize: "11px", color: "#888", marginTop: "2px" }}>
            Note ton poids pour suivre ta courbe
          </div>
        </div>
        <button
          type="button"
          onClick={onAction}
          style={{
            background: "#D85A30",
            color: "white",
            border: "none",
            padding: "8px 14px",
            borderRadius: "8px",
            fontSize: "12px",
            fontWeight: 500,
            cursor: "pointer",
            flexShrink: 0,
          }}
        >
          Faire
        </button>
      </div>
    </div>
  );
}
