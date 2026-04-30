// Chantier Conseils client (2026-04-24) — historique enrichi :
// "Point de départ" (oldest) distinct + jusqu'à 5 derniers bilans en
// descending. Colonne Évolution calculée vs Départ, couleur selon objectif.

import { useMemo } from "react";

type Row = Record<string, number> & { date: string };

interface Props {
  metrics: Row[];
  programTitle?: string;
  liveClientProgram?: string | null;
}

type Objective = "weight-loss" | "sport-mass-gain" | "sport-cutting" | "sport-default";

function inferObjective(programTitle?: string, liveClientProgram?: string | null): Objective {
  const t = `${programTitle ?? ""} ${liveClientProgram ?? ""}`.toLowerCase();
  if (/prise[- ]de[- ]masse|mass[- ]gain|volume/.test(t)) return "sport-mass-gain";
  if (/cutting|seche|sèche|definition|défini/.test(t)) return "sport-cutting";
  if (/sport|performance|endurance|cr7|h24|creatine|créatine/.test(t)) return "sport-default";
  return "weight-loss";
}

function getEvolutionColor(delta: number, field: "weight" | "muscle" | "fat", obj: Objective): string {
  if (!Number.isFinite(delta) || delta === 0) return "#9CA3AF";
  const gold = "#B8922A";
  const coral = "#D4537E";
  const neutral = "#6B7280";
  if (obj === "weight-loss") {
    if (field === "weight" || field === "fat") return delta < 0 ? gold : coral;
    if (field === "muscle") return delta >= 0 ? gold : coral;
    return neutral;
  }
  if (obj === "sport-mass-gain") {
    if (field === "muscle") return delta > 0 ? gold : coral;
    if (field === "weight") return delta > 0 ? gold : neutral;
    return neutral;
  }
  if (obj === "sport-cutting") {
    if (field === "weight" || field === "fat") return delta < 0 ? gold : coral;
    if (field === "muscle") return delta >= 0 ? gold : coral;
    return neutral;
  }
  return neutral;
}

function fmtDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "2-digit" });
  } catch {
    return iso;
  }
}

function fmtNum(n: number | undefined, digits = 1): string {
  return typeof n === "number" && Number.isFinite(n) ? n.toFixed(digits) : "—";
}

function mgKg(row: Row): number | undefined {
  if (typeof row.weight === "number" && typeof row.bodyFat === "number") {
    return (row.weight * row.bodyFat) / 100;
  }
  return undefined;
}

function deltaString(current: number | undefined, base: number | undefined, digits = 1): string {
  if (typeof current !== "number" || typeof base !== "number") return "—";
  const d = current - base;
  if (!Number.isFinite(d)) return "—";
  const sign = d > 0 ? "+" : d < 0 ? "−" : "";
  return `${sign}${Math.abs(d).toFixed(digits)}`;
}

export function EnrichedAssessmentHistory({ metrics, programTitle, liveClientProgram }: Props) {
  const { departure, latest5, hasMultiple } = useMemo(() => {
    if (!metrics || metrics.length === 0) return { departure: null, latest5: [], hasMultiple: false };
    const dep = metrics[0];
    const rest = metrics.slice(1).reverse().slice(0, 5); // 5 latest, descending
    return { departure: dep, latest5: rest, hasMultiple: metrics.length >= 2 };
  }, [metrics]);

  const objective = inferObjective(programTitle, liveClientProgram);

  if (!departure) return null;

  const depKey = "departure";

  function renderEvolutionCell(row: Row, isDeparture: boolean): JSX.Element {
    if (isDeparture || !departure) {
      return <span style={{ color: "#9CA3AF", fontSize: 11 }}>—</span>;
    }
    const dW = row.weight - departure.weight;
    const dM = row.muscleMass - departure.muscleMass;
    const colW = getEvolutionColor(dW, "weight", objective);
    const colM = getEvolutionColor(dM, "muscle", objective);
    // Audit 2026-04-30 : primaryDelta + void unreachable retires (dead code).
    const primaryCol = objective === "sport-mass-gain" ? colM : colW;
    const primaryLabel = objective === "sport-mass-gain" ? "Muscle" : "Poids";
    const primary = deltaString(
      objective === "sport-mass-gain" ? row.muscleMass : row.weight,
      objective === "sport-mass-gain" ? departure.muscleMass : departure.weight,
    );
    return (
      <span style={{ color: primaryCol, fontSize: 11, fontWeight: 600 }} title={`Δ ${primaryLabel}: ${primary} depuis Départ`}>
        {primary}
      </span>
    );
  }

  // ─── Mobile card render ─────────────────────────────────────────────
  function RowCard({ row, isDeparture }: { row: Row; isDeparture: boolean }) {
    const mg = mgKg(row);
    return (
      <div
        style={{
          background: "#FFFFFF",
          border: "1px solid rgba(0,0,0,0.07)",
          borderLeft: isDeparture ? "3px solid #B8922A" : "1px solid rgba(0,0,0,0.07)",
          borderRadius: 12,
          padding: "10px 12px",
          display: "flex",
          flexDirection: "column",
          gap: 6,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ fontFamily: "Syne, sans-serif", fontWeight: 700, fontSize: 13, color: "#111827" }}>
            {isDeparture ? "📍 Point de départ" : fmtDate(row.date)}
          </div>
          {isDeparture ? (
            <div style={{ fontSize: 10, color: "#9CA3AF" }}>{fmtDate(row.date)}</div>
          ) : (
            renderEvolutionCell(row, false)
          )}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6, fontSize: 11 }}>
          <div><span style={{ color: "#9CA3AF" }}>Poids</span> <strong>{fmtNum(row.weight)}</strong> kg</div>
          <div><span style={{ color: "#9CA3AF" }}>MG</span> <strong>{fmtNum(row.bodyFat)}</strong>%</div>
          <div><span style={{ color: "#9CA3AF" }}>MG kg</span> <strong>{fmtNum(mg)}</strong></div>
          <div><span style={{ color: "#9CA3AF" }}>Muscle</span> <strong>{fmtNum(row.muscleMass)}</strong> kg</div>
          <div><span style={{ color: "#9CA3AF" }}>Eau</span> <strong>{fmtNum(row.hydration, 0)}</strong>%</div>
          <div><span style={{ color: "#9CA3AF" }}>Visc.</span> <strong>{fmtNum(row.visceralFat, 0)}</strong></div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <style>{`
        @media (max-width: 480px) {
          .enriched-history-table { display: none; }
        }
        @media (min-width: 481px) {
          .enriched-history-cards { display: none; }
        }
      `}</style>

      <div style={{ fontSize: 9, letterSpacing: "2px", textTransform: "uppercase", color: "#9CA3AF", fontWeight: 500, marginTop: 4 }}>
        {hasMultiple ? "Ton point de départ & tes 5 derniers bilans" : "Ton point de départ"}
      </div>

      {/* DESKTOP TABLE */}
      <div
        className="enriched-history-table"
        style={{
          background: "#fff",
          border: "1px solid rgba(0,0,0,0.07)",
          borderRadius: 14,
          overflow: "hidden",
        }}
      >
        <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11, minWidth: 560 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid rgba(0,0,0,0.07)" }}>
                {["Date", "Poids", "MG %", "MG kg", "Muscle kg", "Eau %", "Viscéral", "Évolution"].map((h) => (
                  <th
                    key={h}
                    style={{
                      padding: "9px 6px",
                      textAlign: "left",
                      fontSize: 9,
                      color: "#9CA3AF",
                      textTransform: "uppercase",
                      letterSpacing: "0.5px",
                      fontWeight: 500,
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {/* Départ */}
              <tr
                key={depKey}
                style={{
                  borderLeft: "3px solid #B8922A",
                  background: "rgba(184,146,42,0.06)",
                  borderBottom: hasMultiple ? "1px solid rgba(0,0,0,0.05)" : "none",
                }}
              >
                <td style={{ padding: "10px 6px", fontSize: 11, whiteSpace: "nowrap", fontWeight: 700, color: "#633806" }}>
                  📍 Départ · {fmtDate(departure.date)}
                </td>
                <td style={{ padding: "10px 6px", fontWeight: 600, color: "#B8922A" }}>{fmtNum(departure.weight)}</td>
                <td style={{ padding: "10px 6px", color: "#111827" }}>{fmtNum(departure.bodyFat)}%</td>
                <td style={{ padding: "10px 6px", color: "#6B7280" }}>{fmtNum(mgKg(departure))}</td>
                <td style={{ padding: "10px 6px", color: "#0D9488" }}>{fmtNum(departure.muscleMass)}</td>
                <td style={{ padding: "10px 6px", color: "#7C3AED" }}>{fmtNum(departure.hydration, 0)}%</td>
                <td style={{ padding: "10px 6px", color: "#111827" }}>{fmtNum(departure.visceralFat, 0)}</td>
                <td style={{ padding: "10px 6px", color: "#9CA3AF" }}>—</td>
              </tr>
              {latest5.map((row, i) => (
                <tr
                  key={i}
                  style={{
                    borderBottom: i < latest5.length - 1 ? "1px solid rgba(0,0,0,0.05)" : "none",
                    background: i % 2 === 0 ? "#FAFAF9" : "#fff",
                  }}
                >
                  <td style={{ padding: "9px 6px", color: "#6B7280", fontSize: 10, whiteSpace: "nowrap" }}>
                    {fmtDate(row.date)}
                  </td>
                  <td style={{ padding: "9px 6px", fontWeight: 600, color: "#B8922A" }}>{fmtNum(row.weight)}</td>
                  <td style={{ padding: "9px 6px", color: (row.bodyFat ?? 0) > 30 ? "#DC2626" : "#111827" }}>
                    {fmtNum(row.bodyFat)}%
                  </td>
                  <td style={{ padding: "9px 6px", color: "#6B7280" }}>{fmtNum(mgKg(row))}</td>
                  <td style={{ padding: "9px 6px", color: "#0D9488" }}>{fmtNum(row.muscleMass)}</td>
                  <td style={{ padding: "9px 6px", color: (row.hydration ?? 100) < 50 ? "#DC2626" : "#7C3AED" }}>
                    {fmtNum(row.hydration, 0)}%
                  </td>
                  <td style={{ padding: "9px 6px", color: (row.visceralFat ?? 0) >= 9 ? "#DC2626" : "#111827" }}>
                    {fmtNum(row.visceralFat, 0)}
                  </td>
                  <td style={{ padding: "9px 6px" }}>{renderEvolutionCell(row, false)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* MOBILE STACK */}
      <div className="enriched-history-cards" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <RowCard row={departure} isDeparture />
        {latest5.map((row, i) => (
          <RowCard key={i} row={row} isDeparture={false} />
        ))}
      </div>
    </div>
  );
}
