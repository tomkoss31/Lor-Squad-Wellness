// Evolution Hero (Chantier Refonte Accueil + Évolution v2, 2026-04-25).
// Affiche départ → aujourd'hui + 2 badges récap kg / cm.

interface Props {
  startWeight: number | null;
  currentWeight: number | null;
  startDate: string | null;
  currentDate: string | null;
  totalCmLost: number;
}

const GOLD = "#B8922A";
const TEAL = "#1D9E75";
const MUTED = "#888";

function formatShort(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const s = d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
  return s.replace(/\.$/, "."); // garde le "."
}

export function ClientAppEvolutionHero({
  startWeight,
  currentWeight,
  startDate,
  currentDate,
  totalCmLost,
}: Props) {
  if (startWeight == null || currentWeight == null) {
    return (
      <div
        style={{
          background: "#FFFFFF",
          padding: "24px 20px",
          borderRadius: 12,
          border: "1px solid #eee",
          textAlign: "center",
          fontStyle: "italic",
          fontSize: 13,
          color: MUTED,
          fontFamily: '"DM Sans", sans-serif',
        }}
      >
        Encore un peu de patience, ta courbe se construit avec chaque bilan.
      </div>
    );
  }

  const kgLost = startWeight - currentWeight; // typically positive when client lost weight

  return (
    <div
      style={{
        background: "#FFFFFF",
        padding: "24px 20px",
        borderRadius: 12,
        border: "1px solid #eee",
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
          textAlign: "center",
          marginBottom: 16,
        }}
      >
        📊 MA TRANSFORMATION
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr auto 1fr",
          alignItems: "center",
          gap: 8,
        }}
      >
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 9, color: MUTED, letterSpacing: 1, textTransform: "uppercase" }}>
            DÉPART
          </div>
          <div
            style={{
              fontFamily: '"Syne", serif',
              fontSize: 30,
              color: MUTED,
              lineHeight: 1.1,
              marginTop: 4,
            }}
          >
            {startWeight.toFixed(1)}
          </div>
          <div style={{ fontSize: 10, color: MUTED, marginTop: 4 }}>
            {formatShort(startDate)}
          </div>
        </div>

        <div style={{ fontSize: 22, color: GOLD, textAlign: "center" }} aria-hidden="true">→</div>

        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 9, color: GOLD, letterSpacing: 1, textTransform: "uppercase" }}>
            AUJOURD&apos;HUI
          </div>
          <div
            style={{
              fontFamily: '"Syne", serif',
              fontSize: 38,
              color: TEAL,
              lineHeight: 1.1,
              marginTop: 4,
            }}
          >
            {currentWeight.toFixed(1)}
          </div>
          <div style={{ fontSize: 10, color: TEAL, marginTop: 4 }}>
            {formatShort(currentDate)}
          </div>
        </div>
      </div>

      <div style={{ borderTop: "1px solid #eee", marginTop: 16, paddingTop: 12 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <div
            style={{
              background: "#E1F5EE",
              color: "#0F6E56",
              borderRadius: 8,
              padding: 12,
              textAlign: "center",
            }}
          >
            <div style={{ fontFamily: '"Syne", serif', fontSize: 18 }}>
              - {Math.abs(kgLost).toFixed(1)} kg
            </div>
            <div style={{ fontSize: 10, marginTop: 2 }}>poids perdu</div>
          </div>
          <div
            style={{
              background: "#FAEEDA",
              color: "#854F0B",
              borderRadius: 8,
              padding: 12,
              textAlign: "center",
            }}
          >
            <div style={{ fontFamily: '"Syne", serif', fontSize: 18 }}>
              - {totalCmLost} cm
            </div>
            <div style={{ fontSize: 10, marginTop: 2 }}>centimètres en moins</div>
          </div>
        </div>
      </div>
    </div>
  );
}
