// =============================================================================
// PinAWTCinematic — pin Active World Team décoratif (2026-05-05)
//
// SVG inline 480×480 (resize via prop si besoin). Rotation lente 60s linear
// infinite, opacity 18 % par défaut, position absolue à droite du hero
// éditorial. GPU-accelerated via `will-change: transform`.
//
// Sur mobile (< 480px), masqué pour économiser CPU/batterie.
// =============================================================================

interface PinAWTCinematicProps {
  /** Taille en px (défaut 480, peut réduire pour mobile / variantes). */
  size?: number;
  /** Opacité 0-1 (défaut 0.18 — discret en filigrane). */
  opacity?: number;
  /** Année affichée au centre du pin. Défaut 2026. */
  year?: number;
  /** Texte courbé en haut de l'arc. Défaut "ACTIVE WORLD TEAM". */
  title?: string;
  /** Position absolue : si false, le composant est inline (utile pour preview). */
  positioned?: boolean;
}

export function PinAWTCinematic({
  size = 480,
  opacity = 0.18,
  year = 2026,
  title = "ACTIVE WORLD TEAM",
  positioned = true,
}: PinAWTCinematicProps) {
  const containerStyle: React.CSSProperties = positioned
    ? {
        position: "absolute",
        right: -60,
        top: "50%",
        transform: "translateY(-50%)",
        width: size,
        height: size,
        pointerEvents: "none",
        opacity,
      }
    : {
        width: size,
        height: size,
        pointerEvents: "none",
        opacity,
      };

  return (
    <div className="v5-pin-rotate" style={containerStyle} aria-hidden="true">
      <svg viewBox="0 0 480 480" xmlns="http://www.w3.org/2000/svg" width={size} height={size}>
        <defs>
          <radialGradient id="pinHeroV5Cinematic" cx="35%" cy="30%">
            <stop offset="0%" stopColor="#F8DDA0" />
            <stop offset="40%" stopColor="#D4A937" />
            <stop offset="100%" stopColor="#5A4612" />
          </radialGradient>
        </defs>

        {/* Disque principal avec gradient gold */}
        <circle
          cx="240"
          cy="240"
          r="235"
          fill="url(#pinHeroV5Cinematic)"
          stroke="#5A4612"
          strokeWidth="2"
        />

        {/* Cercle anneau intérieur */}
        <circle cx="240" cy="240" r="200" fill="none" stroke="#1A1612" strokeWidth="3" />

        {/* Disque sombre central pour relief */}
        <circle cx="240" cy="240" r="170" fill="#1A1612" opacity="0.18" />

        {/* Texte courbé en haut */}
        <path id="topArcV5Cinematic" d="M 100 240 A 140 140 0 0 1 380 240" fill="none" />
        <text
          fontFamily="DM Sans, sans-serif"
          fontSize="22"
          fontWeight="800"
          fill="#F8DDA0"
          letterSpacing="5"
        >
          <textPath href="#topArcV5Cinematic" startOffset="50%" textAnchor="middle">
            {title}
          </textPath>
        </text>

        {/* Année */}
        <text
          x="240"
          y="105"
          fontFamily="DM Sans, sans-serif"
          fontSize="22"
          fontWeight="800"
          fill="#F8DDA0"
          textAnchor="middle"
          letterSpacing="4"
        >
          {year}
        </text>

        {/* Flamme stylisée centre (tear drop) */}
        <g transform="translate(240, 250)">
          <path
            d="M 0 -55 Q -34 -15 -38 38 Q -12 28 0 28 Q 12 28 38 38 Q 34 -15 0 -55 Z"
            fill="#F8DDA0"
          />
          <path
            d="M 0 -38 Q -10 -8 0 30"
            stroke="#1A1612"
            strokeWidth="1.5"
            fill="none"
            opacity="0.5"
          />
        </g>
      </svg>
    </div>
  );
}
