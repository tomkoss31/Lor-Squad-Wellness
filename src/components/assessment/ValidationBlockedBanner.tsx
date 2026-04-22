// Chantier Polish Vue complète + refonte bilan (2026-04-24).
// Bandeau rouge affiché à l'étape 13 si le coach tente de valider sans
// avoir planifié de RDV suivi. Bouton "Retour étape" ramène à l'étape 11.

interface Props {
  onBack: () => void;
}

export function ValidationBlockedBanner({ onBack }: Props) {
  return (
    <div
      role="alert"
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 12,
        padding: "14px 16px",
        background: "#FCEBEB",
        border: "1px solid #E24B4A",
        borderRadius: 12,
        marginBottom: 12,
      }}
    >
      <div
        aria-hidden="true"
        style={{
          width: 26,
          height: 26,
          borderRadius: "50%",
          background: "#E24B4A",
          color: "#FFFFFF",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontWeight: 800,
          fontSize: 14,
          flexShrink: 0,
        }}
      >
        !
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 14,
            color: "#501313",
            fontWeight: 600,
            marginBottom: 2,
            fontFamily: "DM Sans, sans-serif",
          }}
        >
          Tu ne peux pas valider le bilan sans RDV de suivi planifié.
        </div>
        <div style={{ fontSize: 12, color: "#501313", lineHeight: 1.4 }}>
          Planifie la prochaine rencontre pour garantir le suivi du client.
        </div>
        <button
          type="button"
          onClick={onBack}
          style={{
            marginTop: 10,
            padding: "7px 14px",
            borderRadius: 8,
            background: "#E24B4A",
            border: "none",
            color: "#FFFFFF",
            fontSize: 12,
            fontFamily: "DM Sans, sans-serif",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Retour étape « Suite du suivi »
        </button>
      </div>
    </div>
  );
}
