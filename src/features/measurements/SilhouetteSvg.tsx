// Chantier Module Mensurations (2026-04-24).
// Silhouette SVG 180x400. Paths anatomiques (homme/femme) construits
// avec cohérence des proportions : tête/cou/épaules/torse/hanches/
// cuisses/mollets. Les 10 points de mesure sont positionnés aux zones
// réelles du corps.
//
// View 'back' : on applique un miroir horizontal via transform scaleX(-1)
// sur la silhouette uniquement. Les points restent dans le bon
// référentiel (coords absolues de la version face).

import { MEASUREMENT_GUIDES, type MeasurementKey } from "../../data/measurementGuides";
import type { ClientMeasurement } from "../../lib/measurementCalculations";

interface Props {
  gender: "male" | "female";
  view: "face" | "back";
  measurements: Partial<ClientMeasurement> | null;
  /** Set de clés qui sont en "draft" (saisies mais pas encore sauvées) */
  draftKeys?: Set<MeasurementKey>;
  onPointClick: (key: MeasurementKey) => void;
  activeKey?: MeasurementKey | null;
}

// Paths silhouette — homme vs femme.
// Construction : tête (cercle), cou, épaules, torse en V (homme) ou en
// sablier (femme), hanches, cuisses, mollets.
// viewBox 0 0 180 400, centre x=90.

const MALE_PATH = `
M 90 18
C 80 18, 73 26, 73 38
C 73 46, 77 54, 82 57
L 82 63
L 72 66
L 55 76
L 48 95
L 42 120
L 45 140
L 50 150
L 52 162
L 55 175
L 58 188
L 60 200
L 62 215
L 64 230
L 68 235
L 70 260
L 72 290
L 75 320
L 78 350
L 80 375
L 85 382
L 89 382
L 89 235
L 91 235
L 91 382
L 95 382
L 100 375
L 102 350
L 105 320
L 108 290
L 110 260
L 112 235
L 116 230
L 118 215
L 120 200
L 122 188
L 125 175
L 128 162
L 130 150
L 135 140
L 138 120
L 132 95
L 125 76
L 108 66
L 98 63
L 98 57
C 103 54, 107 46, 107 38
C 107 26, 100 18, 90 18 Z
`.trim();

const FEMALE_PATH = `
M 90 18
C 80 18, 73 26, 73 38
C 73 46, 77 54, 82 57
L 82 63
L 74 67
L 62 78
L 56 95
L 53 115
L 58 135
L 64 152
L 62 165
L 58 180
L 55 195
L 54 215
L 56 230
L 60 238
L 64 238
L 68 260
L 70 290
L 73 320
L 76 350
L 78 375
L 83 382
L 88 382
L 89 235
L 91 235
L 92 382
L 97 382
L 102 375
L 104 350
L 107 320
L 110 290
L 112 260
L 116 238
L 120 238
L 124 230
L 126 215
L 125 195
L 122 180
L 118 165
L 116 152
L 122 135
L 127 115
L 124 95
L 118 78
L 106 67
L 98 63
L 98 57
C 103 54, 107 46, 107 38
C 107 26, 100 18, 90 18 Z
`.trim();

export function SilhouetteSvg({
  gender,
  view,
  measurements,
  draftKeys,
  onPointClick,
  activeKey,
}: Props) {
  const pathD = gender === "female" ? FEMALE_PATH : MALE_PATH;
  const visibleGuides = MEASUREMENT_GUIDES.filter(
    (g) => g.view === "both" || g.view === view,
  );

  return (
    <svg
      viewBox="0 0 180 400"
      width="100%"
      height="auto"
      style={{ maxWidth: 220, display: "block" }}
      aria-label={`Silhouette ${gender} ${view}`}
      preserveAspectRatio="xMidYMid meet"
    >
      <defs>
        <linearGradient id="sil-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--ls-surface2, #2a2f3a)" stopOpacity="0.6" />
          <stop offset="100%" stopColor="var(--ls-surface, #1a1d26)" stopOpacity="0.9" />
        </linearGradient>
        <style>
          {`
          @keyframes sil-pulse {
            0%, 100% { r: 9; opacity: 0.95; }
            50%      { r: 11; opacity: 1; }
          }
          .sil-point-empty { animation: sil-pulse 1.8s ease-in-out infinite; }
          `}
        </style>
      </defs>

      {/* Lignes repère subtiles (guides d'anatomie, discrets) */}
      <line x1="90" y1="10" x2="90" y2="395" stroke="var(--ls-border, rgba(255,255,255,0.05))" strokeWidth="0.5" strokeDasharray="2 3" />

      {/* Silhouette */}
      <g transform={view === "back" ? "matrix(-1 0 0 1 180 0)" : undefined}>
        <path
          d={pathD}
          fill="url(#sil-fill)"
          stroke="var(--ls-text-hint, #6b6f7a)"
          strokeWidth="1.3"
          strokeLinejoin="round"
        />
      </g>

      {/* Points de mesure */}
      {visibleGuides.map((g) => {
        const value = (measurements?.[g.key] as number | null | undefined) ?? null;
        const filled = value != null;
        const isDraft = draftKeys?.has(g.key) ?? false;
        const isActive = activeKey === g.key;
        const cx = g.position.x;
        const cy = g.position.y;
        // Couleur : draft (orange), rempli persisté (vert), vide (gold)
        const fillColor = isDraft ? "#EF9F27" : filled ? "#1D9E75" : "#BA7517";

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
            {/* Halo actif */}
            {isActive ? (
              <circle cx={cx} cy={cy} r="15" fill={fillColor} opacity="0.22" />
            ) : null}

            {/* Anneau blanc */}
            <circle
              cx={cx}
              cy={cy}
              r="10"
              fill="#FFFFFF"
              opacity="0.85"
            />

            {/* Cercle principal */}
            <circle
              cx={cx}
              cy={cy}
              r="8"
              fill={fillColor}
              stroke="#FFFFFF"
              strokeWidth="1.5"
              className={filled ? undefined : "sil-point-empty"}
            />

            {/* Icône intérieure : check si rempli, + si vide */}
            {filled ? (
              <path
                d={`M ${cx - 3.5} ${cy + 0.5} l 2.5 2.5 l 4 -4.5`}
                stroke="#FFFFFF"
                strokeWidth="1.8"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            ) : (
              <>
                <line x1={cx - 3} y1={cy} x2={cx + 3} y2={cy} stroke="#FFFFFF" strokeWidth="1.8" strokeLinecap="round" />
                <line x1={cx} y1={cy - 3} x2={cx} y2={cy + 3} stroke="#FFFFFF" strokeWidth="1.8" strokeLinecap="round" />
              </>
            )}
          </g>
        );
      })}
    </svg>
  );
}
