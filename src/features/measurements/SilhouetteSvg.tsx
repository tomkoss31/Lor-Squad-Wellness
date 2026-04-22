// Chantier Module Mensurations (2026-04-24).
// SVG silhouette 180x380 avec 10 points cliquables. Miroir x pour back.

import { MEASUREMENT_GUIDES, type MeasurementKey } from "../../data/measurementGuides";
import type { ClientMeasurement } from "../../lib/measurementCalculations";

interface Props {
  gender: "male" | "female";
  view: "face" | "back";
  measurements: Partial<ClientMeasurement> | null;
  onPointClick: (key: MeasurementKey) => void;
  activeKey?: MeasurementKey | null;
}

const MALE_PATH =
  "M90 10 C80 10 72 18 72 30 C72 38 76 46 82 50 L82 58 L68 62 L58 68 L52 78 L50 92 L50 110 L55 130 L62 150 L65 170 L62 185 L60 200 L60 230 L62 260 L65 290 L68 320 L70 350 L72 365 L78 370 L82 370 L84 355 L86 325 L88 295 L89 265 L90 230 L91 265 L92 295 L94 325 L96 355 L98 370 L102 370 L108 365 L110 350 L112 320 L115 290 L118 260 L120 230 L120 200 L118 185 L115 170 L118 150 L125 130 L130 110 L130 92 L128 78 L122 68 L112 62 L98 58 L98 50 C104 46 108 38 108 30 C108 18 100 10 90 10 Z";
const FEMALE_PATH =
  "M90 10 C80 10 72 18 72 30 C72 38 76 46 82 50 L82 58 L70 64 L60 74 L54 90 L52 108 L56 130 L62 148 L62 162 L58 180 L58 200 L60 220 L62 240 L64 270 L66 300 L68 330 L70 355 L76 370 L82 370 L84 340 L86 310 L88 280 L89 250 L90 220 L91 250 L92 280 L94 310 L96 340 L98 370 L104 370 L110 355 L112 330 L114 300 L116 270 L118 240 L120 220 L122 200 L122 180 L118 162 L118 148 L124 130 L128 108 L126 90 L120 74 L110 64 L98 58 L98 50 C104 46 108 38 108 30 C108 18 100 10 90 10 Z";

export function SilhouetteSvg({
  gender,
  view,
  measurements,
  onPointClick,
  activeKey,
}: Props) {
  const pathD = gender === "female" ? FEMALE_PATH : MALE_PATH;
  const visibleGuides = MEASUREMENT_GUIDES.filter(
    (g) => g.view === "both" || g.view === view,
  );

  return (
    <svg
      viewBox="0 0 180 380"
      width="180"
      height="380"
      style={{ maxWidth: "100%", height: "auto", display: "block" }}
      aria-label={`Silhouette ${gender} ${view}`}
    >
      <defs>
        <filter id="sil-soft" x="-10%" y="-10%" width="120%" height="120%">
          <feGaussianBlur stdDeviation="1" />
        </filter>
        <style>
          {`
          @keyframes sil-pulse {
            0%, 100% { transform: scale(1); opacity: 0.92; }
            50% { transform: scale(1.12); opacity: 1; }
          }
          .sil-point-empty {
            transform-origin: center;
            transform-box: fill-box;
            animation: sil-pulse 1.8s ease-in-out infinite;
          }
          `}
        </style>
      </defs>

      {/* Silhouette trait */}
      <path
        d={pathD}
        fill="var(--ls-surface2, #2a2f3a)"
        stroke="var(--ls-text-hint, #6b6f7a)"
        strokeWidth="1.2"
        strokeLinejoin="round"
        transform={view === "back" ? "translate(180, 0) scale(-1, 1)" : undefined}
      />

      {/* Points */}
      {visibleGuides.map((g) => {
        const value = (measurements?.[g.key] as number | null | undefined) ?? null;
        const filled = value != null;
        const isActive = activeKey === g.key;
        const cx = g.position.x;
        const cy = g.position.y;
        return (
          <g
            key={g.key}
            role="button"
            tabIndex={0}
            aria-label={`${g.label}${filled ? ` : ${value} cm` : " : non saisi"}`}
            onClick={() => onPointClick(g.key)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onPointClick(g.key);
              }
            }}
            style={{ cursor: "pointer" }}
          >
            {isActive ? (
              <circle cx={cx} cy={cy} r="13" fill="rgba(239,159,39,0.25)" />
            ) : null}
            <circle
              cx={cx}
              cy={cy}
              r="9"
              fill={filled ? "#1D9E75" : "#BA7517"}
              stroke="#FFFFFF"
              strokeWidth="1.5"
              className={filled ? undefined : "sil-point-empty"}
            />
            {filled ? (
              <path
                d={`M ${cx - 3.5} ${cy} L ${cx - 1} ${cy + 2.5} L ${cx + 4} ${cy - 2.5}`}
                stroke="#FFFFFF"
                strokeWidth="1.8"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            ) : (
              <text
                x={cx}
                y={cy + 3.5}
                textAnchor="middle"
                fontSize="11"
                fontWeight="700"
                fill="#FFFFFF"
                style={{ pointerEvents: "none", fontFamily: "DM Sans, sans-serif" }}
              >
                +
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}
