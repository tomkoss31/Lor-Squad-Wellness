// Chantier Tuto interactif client (2026-04-24).
// Jauge horizontale gradient 4 zones avec curseur sur la valeur réelle.

import {
  COLOR_HEX,
  findRange,
  valueToPercent,
  type MetricRange,
} from "../data/metricRanges";

export function MetricGauge({
  value,
  unit = "%",
  ranges,
}: {
  value: number;
  unit?: string;
  ranges: MetricRange[];
}) {
  const pct = valueToPercent(value, ranges);
  const activeRange = findRange(value, ranges);

  // Construit un gradient linéaire qui reproduit visuellement les 4 zones.
  // On répartit en % selon les largeurs relatives jusqu'au max du 3e range.
  const displayMin = ranges[0].min;
  const displayMax = ranges[Math.min(ranges.length - 1, 3)].min + 5;
  const span = displayMax - displayMin || 1;
  const stops: string[] = [];
  for (let i = 0; i < ranges.length; i++) {
    const r = ranges[i];
    const startPct = Math.max(0, Math.min(100, ((r.min - displayMin) / span) * 100));
    const endPct = Math.max(0, Math.min(100, ((r.max - displayMin) / span) * 100));
    stops.push(`${COLOR_HEX[r.color]} ${startPct.toFixed(1)}%`);
    stops.push(`${COLOR_HEX[r.color]} ${endPct.toFixed(1)}%`);
  }
  const gradient = `linear-gradient(90deg, ${stops.join(", ")})`;

  return (
    <div style={{ width: "100%" }}>
      <div
        style={{
          position: "relative",
          height: 14,
          borderRadius: 8,
          background: gradient,
          overflow: "visible",
        }}
      >
        {/* Curseur */}
        <div
          style={{
            position: "absolute",
            top: -4,
            bottom: -4,
            left: `${pct}%`,
            transform: "translateX(-50%)",
            width: 10,
            borderRadius: 6,
            background: "#FFFFFF",
            border: `2px solid ${COLOR_HEX[activeRange.color]}`,
            boxShadow: "0 2px 6px rgba(0,0,0,0.25)",
          }}
        />
      </div>

      {/* Légende zones */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
          gap: 6,
          marginTop: 14,
        }}
      >
        {ranges.map((r) => {
          const isActive = r.key === activeRange.key;
          return (
            <div
              key={r.key}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "8px 10px",
                borderRadius: 8,
                border: isActive ? `1.5px solid ${COLOR_HEX[r.color]}` : "1px solid rgba(0,0,0,0.08)",
                background: isActive
                  ? `${COLOR_HEX[r.color]}15`
                  : "rgba(0,0,0,0.02)",
              }}
            >
              <span
                aria-hidden="true"
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: "50%",
                  background: COLOR_HEX[r.color],
                  flexShrink: 0,
                }}
              />
              <div style={{ minWidth: 0, flex: 1 }}>
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: isActive ? 700 : 500,
                    color: isActive ? COLOR_HEX[r.color] : "#4B5563",
                  }}
                >
                  {r.label}
                </div>
                <div style={{ fontSize: 10, color: "#6B7280" }}>
                  {r.min}–{r.max === 100 ? "+" : r.max}
                  {unit}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Badge "Toi : X.X% · Zone" */}
      <div
        style={{
          marginTop: 12,
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          padding: "6px 12px",
          borderRadius: 999,
          background: `${COLOR_HEX[activeRange.color]}1f`,
          color: COLOR_HEX[activeRange.color],
          fontSize: 12,
          fontWeight: 700,
          fontFamily: "DM Sans, sans-serif",
        }}
      >
        <span>Toi : {value.toFixed(1)}{unit} · {activeRange.label}</span>
      </div>
    </div>
  );
}
