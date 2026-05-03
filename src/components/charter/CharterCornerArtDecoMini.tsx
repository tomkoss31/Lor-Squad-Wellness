// Coin art déco simplifié 90×90 pour la Story 9:16.

type Position = "tl" | "tr" | "bl" | "br";

const TRANSFORM: Record<Position, string> = {
  tl: "",
  tr: "scaleX(-1)",
  bl: "scaleY(-1)",
  br: "scale(-1, -1)",
};

const POS: Record<Position, React.CSSProperties> = {
  tl: { top: 18, left: 18 },
  tr: { top: 18, right: 18 },
  bl: { bottom: 18, left: 18 },
  br: { bottom: 18, right: 18 },
};

export function CharterCornerArtDecoMini({ position }: { position: Position }) {
  const id = `charter-mini-corner-${position}`;
  return (
    <svg
      width="90"
      height="90"
      viewBox="0 0 90 90"
      style={{
        position: "absolute",
        width: 90,
        height: 90,
        zIndex: 3,
        pointerEvents: "none",
        transform: TRANSFORM[position],
        ...POS[position],
      }}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={id} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#F8DDA0" />
          <stop offset="50%" stopColor="#D4A937" />
          <stop offset="100%" stopColor="#8B6F1F" />
        </linearGradient>
      </defs>
      <path d="M 6 6 L 70 6 M 6 6 L 6 70" stroke={`url(#${id})`} strokeWidth="1.5" fill="none" />
      <path d="M 12 12 L 58 12 M 12 12 L 12 58" stroke={`url(#${id})`} strokeWidth="0.7" fill="none" opacity="0.6" />
      <path d="M 22 44 L 30 36 L 38 44 L 30 52 Z" fill={`url(#${id})`} />
      <path d="M 44 22 L 52 14 L 60 22 L 52 30 Z" fill={`url(#${id})`} />
      <path d="M 32 32 L 38 26 L 44 32 L 38 38 Z" fill={`url(#${id})`} opacity="0.8" />
      <path d="M 60 6 L 6 60" stroke={`url(#${id})`} strokeWidth="0.8" fill="none" opacity="0.4" />
    </svg>
  );
}
