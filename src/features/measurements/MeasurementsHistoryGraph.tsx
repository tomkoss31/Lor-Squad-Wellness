// Chantier Module Mensurations (2026-04-24).
// Modale graphique d'évolution. SVG natif (pas de recharts — zéro dep).
// Dropdown zone, LineChart multi-points, gradient fill teal sous courbe
// si tendance descendante (perte = succès).

import { useMemo, useState } from "react";
import { MEASUREMENT_GUIDES, type MeasurementKey } from "../../data/measurementGuides";
import type { ClientMeasurement } from "../../lib/measurementCalculations";

interface Props {
  open: boolean;
  onClose: () => void;
  sessions: ClientMeasurement[];
}

interface Point {
  x: number; // 0-100 en % du width
  y: number; // 0-100 en % du height
  value: number;
  date: string;
}

function formatShortDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
  } catch {
    return iso;
  }
}

function buildSeries(sessions: ClientMeasurement[], key: MeasurementKey): Point[] {
  // Tri ASC par date pour dessiner la courbe dans le bon sens
  const sorted = [...sessions]
    .filter((s) => (s[key] as number | null) != null)
    .sort((a, b) => new Date(a.measured_at).getTime() - new Date(b.measured_at).getTime());
  if (sorted.length === 0) return [];
  const values = sorted.map((s) => s[key] as number);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  return sorted.map((s, i) => ({
    x: sorted.length === 1 ? 50 : (i / (sorted.length - 1)) * 100,
    y: 100 - ((s[key] as number) - min) / range * 100,
    value: s[key] as number,
    date: s.measured_at,
  }));
}

export function MeasurementsHistoryGraph({ open, onClose, sessions }: Props) {
  const [zoneKey, setZoneKey] = useState<MeasurementKey>("waist");
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const series = useMemo(() => buildSeries(sessions, zoneKey), [sessions, zoneKey]);
  const firstValue = series[0]?.value;
  const lastValue = series[series.length - 1]?.value;
  const delta = firstValue != null && lastValue != null ? lastValue - firstValue : null;
  const descending = delta != null && delta < 0;

  if (!open) return null;

  const W = 600;
  const H = 240;
  const padLeft = 40;
  const padRight = 10;
  const padTop = 10;
  const padBottom = 28;
  const plotW = W - padLeft - padRight;
  const plotH = H - padTop - padBottom;

  // Coordonnées en pixels
  const pxPoints = series.map((p) => ({
    ...p,
    px: padLeft + (p.x / 100) * plotW,
    py: padTop + (p.y / 100) * plotH,
  }));

  const linePath =
    pxPoints.length > 0
      ? pxPoints.map((p, i) => `${i === 0 ? "M" : "L"} ${p.px.toFixed(1)} ${p.py.toFixed(1)}`).join(" ")
      : "";
  const areaPath =
    pxPoints.length > 0
      ? `${linePath} L ${pxPoints[pxPoints.length - 1].px.toFixed(1)} ${padTop + plotH} L ${pxPoints[0].px.toFixed(1)} ${padTop + plotH} Z`
      : "";

  // Graduations axe Y (min/mid/max de la série)
  const values = series.map((s) => s.value);
  const yMin = values.length ? Math.min(...values) : 0;
  const yMax = values.length ? Math.max(...values) : 0;
  const yMid = values.length ? (yMin + yMax) / 2 : 0;

  const currentZoneLabel =
    MEASUREMENT_GUIDES.find((g) => g.key === zoneKey)?.label ?? "";

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label="Fermer"
      onClick={onClose}
      onKeyDown={(e) => {
        if (e.key === "Escape") onClose();
      }}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.6)",
        zIndex: 10000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Historique mesures"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
        style={{
          background: "var(--ls-surface)",
          border: "1px solid var(--ls-border)",
          borderRadius: 18,
          maxWidth: 720,
          width: "100%",
          padding: 22,
          boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
          fontFamily: "DM Sans, sans-serif",
          color: "var(--ls-text)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, flexWrap: "wrap", gap: 10 }}>
          <h3
            style={{
              fontFamily: "Syne, sans-serif",
              fontSize: 18,
              fontWeight: 700,
              color: "var(--ls-text)",
              margin: 0,
            }}
          >
            Évolution · {currentZoneLabel}
          </h3>
          <select
            value={zoneKey}
            onChange={(e) => {
              setZoneKey(e.target.value as MeasurementKey);
              setHoverIndex(null);
            }}
            style={{
              padding: "7px 10px",
              borderRadius: 9,
              border: "1px solid var(--ls-border)",
              background: "var(--ls-surface2)",
              color: "var(--ls-text)",
              fontSize: 13,
              fontFamily: "DM Sans, sans-serif",
            }}
          >
            {MEASUREMENT_GUIDES.map((g) => (
              <option key={g.key} value={g.key}>
                {g.label}
              </option>
            ))}
          </select>
        </div>

        {series.length < 2 ? (
          <div
            style={{
              padding: 40,
              textAlign: "center",
              fontSize: 13,
              color: "var(--ls-text-muted)",
              background: "var(--ls-surface2)",
              borderRadius: 12,
            }}
          >
            {series.length === 0
              ? "Aucune mesure pour cette zone."
              : "Une seule mesure enregistrée. Ajoute une 2ème session pour voir l'évolution."}
          </div>
        ) : (
          <>
            <svg
              viewBox={`0 0 ${W} ${H}`}
              width="100%"
              height="auto"
              style={{ display: "block", userSelect: "none" }}
            >
              <defs>
                <linearGradient id="area-grad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#1D9E75" stopOpacity="0.32" />
                  <stop offset="100%" stopColor="#1D9E75" stopOpacity="0" />
                </linearGradient>
                <linearGradient id="area-grad-up" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#BA7517" stopOpacity="0.28" />
                  <stop offset="100%" stopColor="#BA7517" stopOpacity="0" />
                </linearGradient>
              </defs>

              {/* Grille horizontale */}
              {[0, 0.5, 1].map((p) => {
                const y = padTop + p * plotH;
                return (
                  <line
                    key={p}
                    x1={padLeft}
                    y1={y}
                    x2={W - padRight}
                    y2={y}
                    stroke="var(--ls-border, rgba(255,255,255,0.08))"
                    strokeDasharray="3 4"
                    strokeWidth="1"
                  />
                );
              })}

              {/* Axe Y labels */}
              {[yMax, yMid, yMin].map((v, i) => (
                <text
                  key={i}
                  x={padLeft - 8}
                  y={padTop + (i / 2) * plotH + 4}
                  textAnchor="end"
                  fontSize="10"
                  fill="var(--ls-text-muted, #9aa0ac)"
                  fontFamily="DM Sans, sans-serif"
                >
                  {v.toFixed(1)}
                </text>
              ))}

              {/* Area */}
              <path d={areaPath} fill={descending ? "url(#area-grad)" : "url(#area-grad-up)"} />

              {/* Line */}
              <path
                d={linePath}
                fill="none"
                stroke={descending ? "#1D9E75" : "#BA7517"}
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* Points */}
              {pxPoints.map((p, i) => (
                <g key={i}>
                  <circle
                    cx={p.px}
                    cy={p.py}
                    r={hoverIndex === i ? 7 : 5}
                    fill="#FFFFFF"
                    stroke={descending ? "#1D9E75" : "#BA7517"}
                    strokeWidth="2"
                    style={{ cursor: "pointer", transition: "r 120ms" }}
                    onMouseEnter={() => setHoverIndex(i)}
                    onMouseLeave={() => setHoverIndex(null)}
                  />
                </g>
              ))}

              {/* Tooltip au survol */}
              {hoverIndex != null && pxPoints[hoverIndex] ? (
                <g>
                  <line
                    x1={pxPoints[hoverIndex].px}
                    y1={padTop}
                    x2={pxPoints[hoverIndex].px}
                    y2={padTop + plotH}
                    stroke="var(--ls-text-hint, #6b6f7a)"
                    strokeDasharray="2 3"
                    strokeWidth="1"
                  />
                  <rect
                    x={Math.min(pxPoints[hoverIndex].px + 10, W - 130)}
                    y={pxPoints[hoverIndex].py - 36}
                    width="120"
                    height="38"
                    rx="8"
                    fill="var(--ls-surface2, #2a2f3a)"
                    stroke="var(--ls-border, rgba(255,255,255,0.12))"
                  />
                  <text
                    x={Math.min(pxPoints[hoverIndex].px + 18, W - 122)}
                    y={pxPoints[hoverIndex].py - 20}
                    fontSize="11"
                    fill="var(--ls-text, #e9ecf2)"
                    fontFamily="DM Sans, sans-serif"
                    fontWeight="700"
                  >
                    {pxPoints[hoverIndex].value.toFixed(1)} cm
                  </text>
                  <text
                    x={Math.min(pxPoints[hoverIndex].px + 18, W - 122)}
                    y={pxPoints[hoverIndex].py - 6}
                    fontSize="10"
                    fill="var(--ls-text-muted, #9aa0ac)"
                    fontFamily="DM Sans, sans-serif"
                  >
                    {formatShortDate(pxPoints[hoverIndex].date)}
                  </text>
                </g>
              ) : null}

              {/* Axe X labels (1ère et dernière dates + milieu si long) */}
              {pxPoints.length > 0 ? (
                <>
                  <text
                    x={pxPoints[0].px}
                    y={H - 8}
                    textAnchor="middle"
                    fontSize="10"
                    fill="var(--ls-text-muted, #9aa0ac)"
                    fontFamily="DM Sans, sans-serif"
                  >
                    {formatShortDate(pxPoints[0].date)}
                  </text>
                  {pxPoints.length > 1 ? (
                    <text
                      x={pxPoints[pxPoints.length - 1].px}
                      y={H - 8}
                      textAnchor="middle"
                      fontSize="10"
                      fill="var(--ls-text-muted, #9aa0ac)"
                      fontFamily="DM Sans, sans-serif"
                    >
                      {formatShortDate(pxPoints[pxPoints.length - 1].date)}
                    </text>
                  ) : null}
                </>
              ) : null}
            </svg>

            {delta != null ? (
              <div
                style={{
                  marginTop: 10,
                  padding: "10px 12px",
                  background: descending ? "rgba(29,158,117,0.12)" : "rgba(186,117,23,0.12)",
                  border: `1px solid ${descending ? "rgba(29,158,117,0.3)" : "rgba(186,117,23,0.3)"}`,
                  borderRadius: 10,
                  fontSize: 13,
                  color: descending ? "#1D9E75" : "#BA7517",
                  fontWeight: 600,
                }}
              >
                {descending
                  ? `🎉 ${Math.abs(delta).toFixed(1)} cm perdus entre la 1ère et la dernière mesure`
                  : delta === 0
                  ? "Stable entre la 1ère et la dernière mesure"
                  : `+${delta.toFixed(1)} cm sur la période (prise)`}
              </div>
            ) : null}
          </>
        )}

        <div style={{ marginTop: 16, textAlign: "right" }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: "9px 16px",
              borderRadius: 10,
              background: "transparent",
              border: "1px solid var(--ls-border)",
              color: "var(--ls-text-muted)",
              cursor: "pointer",
              fontSize: 13,
              fontFamily: "DM Sans, sans-serif",
            }}
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}
