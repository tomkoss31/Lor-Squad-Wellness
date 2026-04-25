// Motivation message (Chantier Refonte Accueil + Évolution v2, 2026-04-25).

interface Props {
  nextRdvDays: number | null;
}

export function ClientAppMotivationMessage({ nextRdvDays }: Props) {
  const subtitle =
    nextRdvDays != null && nextRdvDays >= 0
      ? `Tu es en route vers ton objectif. Prochain RDV dans ${nextRdvDays} jour${nextRdvDays > 1 ? "s" : ""}.`
      : "Tu es en route vers ton objectif. Continue ce que tu fais déjà bien.";

  return (
    <div
      style={{
        background: "#E1F5EE",
        borderRadius: 12,
        padding: 16,
        marginTop: 12,
        textAlign: "center",
        fontFamily: '"DM Sans", sans-serif',
      }}
    >
      <div style={{ fontSize: 13, fontWeight: 600, color: "#0F6E56" }}>
        🎯 Continue comme ça !
      </div>
      <div
        style={{
          fontSize: 12,
          color: "#0F6E56",
          opacity: 0.85,
          marginTop: 4,
        }}
      >
        {subtitle}
      </div>
    </div>
  );
}
