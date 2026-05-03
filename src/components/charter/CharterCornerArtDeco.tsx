// Coin art déco SVG (charcoal + or) — 1 composant, 4 instances avec
// transform CSS selon position (tl/tr/bl/br).

type Position = "tl" | "tr" | "bl" | "br";

const TRANSFORM: Record<Position, string> = {
  tl: "",
  tr: "scaleX(-1)",
  bl: "scaleY(-1)",
  br: "scale(-1, -1)",
};

const CSS_POS: Record<Position, React.CSSProperties> = {
  tl: { top: 0, left: 0 },
  tr: { top: 0, right: 0 },
  bl: { bottom: 0, left: 0 },
  br: { bottom: 0, right: 0 },
};

export function CharterCornerArtDeco({ position }: { position: Position }) {
  const id = `charter-corner-${position}`;
  return (
    <svg
      width="165"
      height="165"
      viewBox="0 0 165 165"
      style={{
        position: "absolute",
        width: 165,
        height: 165,
        zIndex: 2,
        pointerEvents: "none",
        transform: TRANSFORM[position],
        ...CSS_POS[position],
      }}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={id} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#F8DDA0" />
          <stop offset="40%" stopColor="#D4A937" />
          <stop offset="100%" stopColor="#8B6F1F" />
        </linearGradient>
      </defs>
      {/* Forme charcoal angulaire */}
      <path d="M 0 0 L 165 0 L 120 0 L 0 120 L 0 165 Z" fill="#1A1410" opacity="0.94" />
      <path d="M 0 0 L 100 0 L 0 100 Z" fill="#0D0906" opacity="0.5" />
      {/* Pointillés or sur bordure */}
      <g fill={`url(#${id})`}>
        <circle cx="135" cy="6" r="1.5" />
        <circle cx="125" cy="6" r="1.5" />
        <circle cx="115" cy="6" r="1.5" />
        <circle cx="6" cy="135" r="1.5" />
        <circle cx="6" cy="125" r="1.5" />
        <circle cx="6" cy="115" r="1.5" />
      </g>
      {/* Lignes or principales */}
      <path d="M 12 12 L 100 12 M 12 12 L 12 100" stroke={`url(#${id})`} strokeWidth="1.5" fill="none" />
      <path d="M 18 18 L 90 18 M 18 18 L 18 90" stroke={`url(#${id})`} strokeWidth="0.7" fill="none" opacity="0.7" />
      {/* Diamants or */}
      <g fill={`url(#${id})`}>
        <path d="M 25 75 L 35 65 L 45 75 L 35 85 Z" />
        <path d="M 75 25 L 85 15 L 95 25 L 85 35 Z" />
        <path d="M 50 50 L 58 42 L 66 50 L 58 58 Z" />
      </g>
      {/* Petits diamants creux */}
      <g stroke={`url(#${id})`} strokeWidth="1" fill="none">
        <path d="M 25 100 L 32 93 L 39 100 L 32 107 Z" opacity="0.6" />
        <path d="M 100 25 L 107 18 L 114 25 L 107 32 Z" opacity="0.6" />
      </g>
      {/* Lignes diagonales décoratives */}
      <path d="M 105 5 L 5 105" stroke={`url(#${id})`} strokeWidth="1.2" fill="none" opacity="0.55" />
      <path d="M 130 5 L 5 130" stroke={`url(#${id})`} strokeWidth="0.6" fill="none" opacity="0.35" />
      <path d="M 155 5 L 5 155" stroke={`url(#${id})`} strokeWidth="0.4" fill="none" opacity="0.2" />
    </svg>
  );
}
