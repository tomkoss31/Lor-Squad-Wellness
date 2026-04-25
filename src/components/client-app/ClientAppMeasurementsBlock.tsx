// Chantier MEGA app client v2 (2026-04-25).
// Block mensurations Évolution — 4 cards (taille/hanches/cuisses/bras) +
// bandeau gold "total perdu" si delta > 0. Empty state : CTA "Saisir
// première mesure" qui scrolle vers ClientMeasurementsSection (saisie).
// Spec figée Thomas, code chirurgical.

import type { Measurement } from "../../lib/clientAppData";

interface Props {
  measurements: Measurement[];
  onAddFirst: () => void;
}

interface MeasureCardProps {
  label: string;
  current: number | undefined;
  delta: number | null;
}

function MeasureCard({ label, current, delta }: MeasureCardProps) {
  return (
    <div
      style={{
        padding: "10px",
        border: "0.5px solid rgba(0,0,0,0.08)",
        borderRadius: "8px",
      }}
    >
      <div style={{ fontSize: "10px", color: "#888" }}>{label}</div>
      <div
        style={{
          fontSize: "16px",
          color: "#444",
          fontWeight: 500,
          margin: "2px 0",
        }}
      >
        {current !== undefined ? `${current} cm` : "—"}
      </div>
      <div
        style={{
          fontSize: "11px",
          color: delta && delta > 0 ? "#1D9E75" : "#888",
          fontWeight: 500,
        }}
      >
        {delta !== null && delta > 0 ? `↓ ${delta} cm` : "—"}
      </div>
    </div>
  );
}

export function ClientAppMeasurementsBlock({ measurements, onAddFirst }: Props) {
  if (!measurements?.length) {
    return (
      <div
        style={{
          background: "#FFFFFF",
          borderRadius: "12px",
          padding: "14px",
          marginTop: "12px",
          textAlign: "center",
        }}
      >
        <div
          style={{
            fontSize: "13px",
            color: "#444",
            fontWeight: 500,
            marginBottom: "8px",
          }}
        >
          📏 Mes mensurations
        </div>
        <div style={{ fontSize: "12px", color: "#888", marginBottom: "12px" }}>
          Tu n'as pas encore saisi tes mesures.
        </div>
        <button
          type="button"
          onClick={onAddFirst}
          style={{
            background: "#B8922A",
            color: "white",
            border: "none",
            padding: "10px 20px",
            borderRadius: "8px",
            fontSize: "13px",
            fontWeight: 500,
            cursor: "pointer",
          }}
        >
          Saisir ma première mesure
        </button>
      </div>
    );
  }

  const start = measurements[0];
  const current = measurements[measurements.length - 1];

  const delta = (curr?: number, st?: number) => {
    if (curr === undefined || st === undefined) return null;
    return Math.round((st - curr) * 10) / 10;
  };

  const dWaist = delta(current.waist_cm, start.waist_cm);
  const dHips = delta(current.hips_cm, start.hips_cm);
  const dThigh = delta(current.thigh_cm, start.thigh_cm);
  const dArm = delta(current.arm_cm, start.arm_cm);

  const totalLost = [dWaist, dHips, dThigh, dArm]
    .filter((d): d is number => d !== null && d > 0)
    .reduce((sum, d) => sum + d, 0);

  return (
    <div
      style={{
        background: "#FFFFFF",
        borderRadius: "12px",
        padding: "14px",
        marginTop: "12px",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "14px",
        }}
      >
        <div style={{ fontSize: "13px", color: "#444", fontWeight: 500 }}>
          📏 Mes mensurations
        </div>
        <div style={{ fontSize: "10px", color: "#888" }}>total perdu</div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "8px",
        }}
      >
        <MeasureCard
          label="Tour de taille"
          current={current.waist_cm}
          delta={dWaist}
        />
        <MeasureCard
          label="Tour de hanches"
          current={current.hips_cm}
          delta={dHips}
        />
        <MeasureCard
          label="Tour de cuisses"
          current={current.thigh_cm}
          delta={dThigh}
        />
        <MeasureCard
          label="Tour de bras"
          current={current.arm_cm}
          delta={dArm}
        />
      </div>

      {totalLost > 0 ? (
        <div
          style={{
            background: "#B8922A",
            color: "white",
            padding: "12px",
            borderRadius: "8px",
            marginTop: "10px",
            textAlign: "center",
          }}
        >
          <div
            style={{
              fontSize: "24px",
              fontWeight: 500,
              fontFamily: "var(--font-serif)",
            }}
          >
            - {Math.round(totalLost)} cm
          </div>
          <div style={{ fontSize: "11px", opacity: 0.9, marginTop: "2px" }}>
            au total depuis le départ 🎉
          </div>
        </div>
      ) : null}
    </div>
  );
}
