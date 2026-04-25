// Hero Accueil refondu (Chantier Refonte Accueil + Évolution v2, 2026-04-25).
// Affiche soit la transformation chiffrée (>=2 bilans), soit un bienvenue.

interface Props {
  totalKgLost: number | null;
  totalCmLost: number;
  assessmentsCount: number;
  firstAssessmentDate: string | null;
  programTitle: string | null;
  onSeeEvolution?: () => void;
}

const GOLD = "#B8922A";
const TEAL = "#1D9E75";
const TEXT = "#444";
const MUTED = "#888";

function formatDateLong(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export function ClientAppHomeHero({
  totalKgLost,
  totalCmLost,
  assessmentsCount,
  firstAssessmentDate,
  programTitle,
  onSeeEvolution,
}: Props) {
  const multi = assessmentsCount >= 2 && totalKgLost != null;

  if (multi && totalKgLost != null) {
    const formatted = (totalKgLost < 0 ? "- " : "+ ") + Math.abs(totalKgLost).toFixed(1);
    return (
      <div
        style={{
          background: "#FFFFFF",
          borderLeft: `4px solid ${GOLD}`,
          padding: 20,
          borderRadius: 12,
          fontFamily: '"DM Sans", sans-serif',
        }}
      >
        <div
          style={{
            fontSize: 10,
            color: GOLD,
            letterSpacing: 1.5,
            fontWeight: 500,
            textTransform: "uppercase",
            marginBottom: 12,
          }}
        >
          🎯 TA TRANSFORMATION
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <div
            style={{
              background: TEAL,
              borderRadius: 8,
              padding: 14,
              color: "#FFFFFF",
            }}
          >
            <div style={{ fontFamily: '"Syne", serif', fontSize: 28, lineHeight: 1.1 }}>
              {formatted}
            </div>
            <div style={{ fontSize: 11, opacity: 0.85, marginTop: 4 }}>
              kg depuis le départ
            </div>
          </div>

          <div
            style={{
              background: GOLD,
              borderRadius: 8,
              padding: 14,
              color: "#FFFFFF",
            }}
          >
            <div style={{ fontFamily: '"Syne", serif', fontSize: 28, lineHeight: 1.1 }}>
              - {totalCmLost}
            </div>
            <div style={{ fontSize: 11, opacity: 0.85, marginTop: 4 }}>
              cm en moins
            </div>
          </div>
        </div>

        {/* Mini courbe descendante stylisée */}
        <div style={{ marginTop: 12, display: "flex", justifyContent: "center" }}>
          <svg width="100%" height="50" viewBox="0 0 240 50" preserveAspectRatio="none" aria-hidden="true">
            <polyline
              points="0,12 40,18 80,22 120,28 160,34 200,40 240,44"
              fill="none"
              stroke={GOLD}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        <button
          type="button"
          onClick={onSeeEvolution}
          style={{
            display: "block",
            width: "100%",
            marginTop: 8,
            padding: "8px 0",
            background: "transparent",
            border: "none",
            color: GOLD,
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
            textAlign: "center",
            fontFamily: '"DM Sans", sans-serif',
          }}
        >
          Voir toute mon évolution →
        </button>
      </div>
    );
  }

  // Cas 1 seul bilan
  return (
    <div
      style={{
        background: "#FFFFFF",
        borderLeft: `4px solid ${GOLD}`,
        padding: 20,
        borderRadius: 12,
        fontFamily: '"DM Sans", sans-serif',
      }}
    >
      <div
        style={{
          fontSize: 10,
          color: GOLD,
          letterSpacing: 1.5,
          fontWeight: 500,
          textTransform: "uppercase",
          marginBottom: 8,
        }}
      >
        💫 BIENVENUE DANS L&apos;AVENTURE
      </div>
      <div style={{ fontFamily: '"Syne", serif', fontSize: 18, color: TEXT, marginBottom: 4 }}>
        Bienvenue dans l&apos;aventure 💫
      </div>
      <div style={{ fontSize: 12, color: MUTED, marginBottom: 12 }}>
        Premier bilan le {firstAssessmentDate ? formatDateLong(firstAssessmentDate) : "—"}
      </div>
      <div
        style={{
          background: GOLD,
          borderRadius: 8,
          padding: 14,
          color: "#FFFFFF",
          textAlign: "center",
          fontFamily: '"Syne", serif',
          fontSize: 15,
        }}
      >
        Programme {programTitle ?? "—"} activé
      </div>
      <button
        type="button"
        onClick={onSeeEvolution}
        style={{
          display: "block",
          width: "100%",
          marginTop: 10,
          padding: "8px 0",
          background: "transparent",
          border: "none",
          color: GOLD,
          fontSize: 13,
          fontWeight: 600,
          cursor: "pointer",
          textAlign: "center",
          fontFamily: '"DM Sans", sans-serif',
        }}
      >
        Voir mon point de départ →
      </button>
    </div>
  );
}
