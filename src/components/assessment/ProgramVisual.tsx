import type { ProgramChoiceId } from "../../data/programs";

/**
 * Chantier refonte étape 11 (2026-04-20) — SVG flat minimaliste pour chaque
 * programme. Respecte un ratio carré via viewBox + preserveAspectRatio.
 *
 * Codes couleurs :
 *  - Corps bouteille : blanc avec contour doux
 *  - Label Herbalife : vert #0F6E56 (Découverte) / gold #BA7517 (Premium+)
 *  - Fond selon programme : c-green-50 / c-amber-50 / coral-50 / amber-100
 */
interface Props {
  program: ProgramChoiceId;
  className?: string;
}

export function ProgramVisual({ program, className }: Props) {
  const bg = PROGRAM_BG[program];
  const label = PROGRAM_LABEL_COLOR[program];

  return (
    <svg
      viewBox="0 0 140 140"
      preserveAspectRatio="xMidYMid meet"
      className={className}
      style={{ width: "100%", height: "auto", display: "block" }}
      aria-hidden="true"
    >
      {/* Fond arrondi */}
      <rect x={0} y={0} width={140} height={140} rx={14} ry={14} fill={bg} />

      {/* Ombre au sol discrète */}
      <ellipse cx={70} cy={125} rx={46} ry={4} fill="rgba(0,0,0,0.06)" />

      {/* Groupe produits centré */}
      <g transform="translate(0, 8)">
        {renderBottles(program, label)}
      </g>
    </svg>
  );
}

const PROGRAM_BG: Record<ProgramChoiceId, string> = {
  discovery: "#E8F5E9", // green-50
  premium: "#FFF8E1",   // amber-50
  booster1: "#FFEBEE",  // coral-50 / rose-50
  booster2: "#FFECB3",  // amber-100
  unit: "#F5F5F5",      // gray-100 (pas de programme)
};

const PROGRAM_LABEL_COLOR: Record<ProgramChoiceId, string> = {
  discovery: "#0F6E56",
  premium: "#BA7517",
  booster1: "#C2414B",
  booster2: "#B8922A",
  unit: "#6B6F7A",
};

/** Bouteille shake Formula 1 — grande, centre ou gauche. */
function Bottle({ x, y, h = 56, labelColor }: { x: number; y: number; h?: number; labelColor: string }) {
  return (
    <g transform={`translate(${x}, ${y})`}>
      {/* Couvercle */}
      <rect x={10} y={0} width={16} height={6} rx={2} ry={2} fill="#D1D5DB" />
      {/* Corps bouteille */}
      <rect x={6} y={6} width={24} height={h} rx={5} ry={5} fill="#FFFFFF" stroke="#E5E7EB" strokeWidth={1} />
      {/* Label */}
      <rect x={8} y={18} width={20} height={h - 20} rx={2} ry={2} fill={labelColor} />
    </g>
  );
}

/** Pot trapu (ex: Thé 51g). */
function Jar({ x, y, fill = "#FFFFFF", accent }: { x: number; y: number; fill?: string; accent: string }) {
  return (
    <g transform={`translate(${x}, ${y})`}>
      <rect x={8} y={0} width={16} height={5} rx={2} ry={2} fill="#D1D5DB" />
      <rect x={4} y={5} width={24} height={34} rx={4} ry={4} fill={fill} stroke="#E5E7EB" strokeWidth={1} />
      <rect x={6} y={14} width={20} height={14} rx={2} ry={2} fill={accent} />
    </g>
  );
}

/** Flacon Aloe Vera. */
function FlatBottle({ x, y, accent }: { x: number; y: number; accent: string }) {
  return (
    <g transform={`translate(${x}, ${y})`}>
      <rect x={9} y={0} width={14} height={5} rx={2} ry={2} fill="#D1D5DB" />
      <path
        d="M 6 42 L 6 14 Q 6 5 14 5 L 18 5 Q 26 5 26 14 L 26 42 Q 26 48 20 48 L 12 48 Q 6 48 6 42 Z"
        fill="#FFFFFF"
        stroke="#E5E7EB"
        strokeWidth={1}
      />
      <rect x={8} y={18} width={16} height={22} rx={2} ry={2} fill={accent} />
    </g>
  );
}

/** Capsule gélule (booster). */
function Capsule({ x, y, colorA, colorB }: { x: number; y: number; colorA: string; colorB: string }) {
  return (
    <g transform={`translate(${x}, ${y})`}>
      <rect x={0} y={0} width={26} height={12} rx={6} ry={6} fill={colorA} />
      <rect x={13} y={0} width={13} height={12} rx={6} ry={6} fill={colorB} />
      <rect x={12} y={0} width={2} height={12} fill="rgba(0,0,0,0.08)" />
    </g>
  );
}

function renderBottles(program: ProgramChoiceId, labelColor: string) {
  switch (program) {
    case "discovery":
      // F1 + Thé + Aloé
      return (
        <>
          <Bottle x={30} y={40} h={58} labelColor={labelColor} />
          <FlatBottle x={64} y={50} accent={labelColor} />
          <Jar x={98} y={62} accent={labelColor} />
        </>
      );
    case "premium":
      // F1 + PDM + Aloé + Thé
      return (
        <>
          <Bottle x={16} y={40} h={58} labelColor={labelColor} />
          <Bottle x={50} y={40} h={58} labelColor="#B8922A" />
          <FlatBottle x={82} y={50} accent={labelColor} />
          <Jar x={108} y={62} accent={labelColor} />
        </>
      );
    case "booster1":
      // Premium + pot digestion (rose)
      return (
        <>
          <Bottle x={10} y={40} h={58} labelColor="#0F6E56" />
          <Bottle x={40} y={40} h={58} labelColor="#B8922A" />
          <FlatBottle x={70} y={50} accent="#0F6E56" />
          <Jar x={96} y={62} accent="#0F6E56" />
          <Jar x={78} y={22} fill="#FFFFFF" accent={labelColor} />
        </>
      );
    case "booster2":
      // Premium + pot énergie + capsule orange
      return (
        <>
          <Bottle x={10} y={40} h={58} labelColor="#0F6E56" />
          <Bottle x={40} y={40} h={58} labelColor="#B8922A" />
          <FlatBottle x={70} y={50} accent="#0F6E56" />
          <Jar x={96} y={62} accent="#0F6E56" />
          <Jar x={78} y={22} fill="#FFFFFF" accent={labelColor} />
          <Capsule x={50} y={108} colorA="#F59E0B" colorB="#FBBF24" />
        </>
      );
  }
}
