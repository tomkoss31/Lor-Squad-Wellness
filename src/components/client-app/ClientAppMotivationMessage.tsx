// Chantier MEGA app client v2 (2026-04-25).
// Message coach motivant Évolution — fond teal clair #E1F5EE, texte teal
// foncé #0F6E56 centré. Inclut compteur "Prochain RDV dans X jour(s)" si
// daysUntilRdv >= 0. Spec figée Thomas, code chirurgical.

interface Props {
  daysUntilRdv: number | null;
}

export function ClientAppMotivationMessage({ daysUntilRdv }: Props) {
  return (
    <div
      style={{
        background: "#E1F5EE",
        borderRadius: "12px",
        padding: "14px",
        marginTop: "12px",
        textAlign: "center",
      }}
    >
      <div
        style={{
          fontSize: "13px",
          color: "#0F6E56",
          fontWeight: 500,
          marginBottom: "4px",
        }}
      >
        🎯 Continue comme ça !
      </div>
      <div style={{ fontSize: "11px", color: "#0F6E56" }}>
        {daysUntilRdv !== null && daysUntilRdv >= 0
          ? `Tu es en route vers ton objectif. Prochain RDV dans ${daysUntilRdv} jour${
              daysUntilRdv > 1 ? "s" : ""
            }.`
          : `Tu es en route vers ton objectif.`}
      </div>
    </div>
  );
}
