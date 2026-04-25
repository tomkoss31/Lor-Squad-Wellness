// Mensurations block (Chantier Refonte Accueil + Évolution v2, 2026-04-25).

interface MeasurementRow {
  key: "taille" | "hanches" | "cuisses" | "bras";
  current: number | null;
  starting: number | null;
  label: string;
}

interface Props {
  measurements: MeasurementRow[];
  totalCmLost: number;
  onAddFirst?: () => void;
}

const GOLD = "#B8922A";
const TEAL = "#1D9E75";
const TEXT = "#444";
const MUTED = "#888";

export function ClientAppMeasurementsBlock({ measurements, totalCmLost, onAddFirst }: Props) {
  const allEmpty = measurements.every((m) => m.starting == null);

  if (allEmpty && totalCmLost === 0) {
    return (
      <div
        style={{
          background: "#FFFFFF",
          borderRadius: 12,
          padding: 16,
          textAlign: "center",
          fontFamily: '"DM Sans", sans-serif',
          border: "1px solid #eee",
        }}
      >
        <button
          type="button"
          onClick={onAddFirst}
          style={{
            background: "transparent",
            border: "none",
            color: GOLD,
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
            fontFamily: '"DM Sans", sans-serif',
          }}
        >
          Saisir ma première mesure
        </button>
      </div>
    );
  }

  return (
    <div
      style={{
        background: "#FFFFFF",
        borderRadius: 12,
        padding: 16,
        border: "1px solid #eee",
        fontFamily: '"DM Sans", sans-serif',
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 10 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: TEXT }}>📏 Mes mensurations</div>
        <div style={{ fontSize: 11, color: MUTED }}>total perdu</div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        {measurements.map((m) => {
          const delta =
            m.current != null && m.starting != null ? m.current - m.starting : null;
          return (
            <div
              key={m.key}
              style={{
                border: "1px solid #eee",
                borderRadius: 8,
                padding: 12,
              }}
            >
              <div
                style={{
                  fontSize: 10,
                  color: MUTED,
                  textTransform: "uppercase",
                  letterSpacing: 0.5,
                }}
              >
                {m.label}
              </div>
              <div style={{ marginTop: 4 }}>
                <span style={{ fontFamily: '"Syne", serif', fontSize: 16, color: TEXT }}>
                  {m.current != null ? m.current.toFixed(0) : "—"}
                </span>
                <span style={{ fontSize: 11, color: MUTED, marginLeft: 4 }}>cm</span>
              </div>
              {delta != null && delta < 0 ? (
                <div style={{ fontSize: 11, color: TEAL, marginTop: 4 }}>
                  ↓ {Math.abs(delta).toFixed(0)} cm
                </div>
              ) : (
                <div style={{ fontSize: 11, color: MUTED, marginTop: 4 }}>—</div>
              )}
            </div>
          );
        })}
      </div>

      <div
        style={{
          background: GOLD,
          color: "#FFFFFF",
          borderRadius: 8,
          padding: 14,
          marginTop: 12,
          textAlign: "center",
        }}
      >
        <div style={{ fontFamily: '"Syne", serif', fontSize: 24 }}>
          - {totalCmLost} cm
        </div>
        <div style={{ fontSize: 11, opacity: 0.9, marginTop: 2 }}>
          au total depuis le départ 🎉
        </div>
      </div>
    </div>
  );
}
