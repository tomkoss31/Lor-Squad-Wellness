// Chantier Module Mensurations (2026-04-24).
// 10 illustrations zoom dédiées, une par zone. SVG 200x200, viewport
// sur la partie du corps concernée, mètre-ruban tracé en teal (#1D9E75)
// avec pointillés blancs, flèches de direction.
//
// Export { IllustrationZoom } qui route sur la bonne sous-illustration
// selon la zoneKey.

import type { MeasurementKey } from "../../../data/measurementGuides";

// ─── Primitives partagées ───────────────────────────────────────────────
function TapeHorizontal({ y, x1 = 20, x2 = 180, label }: { y: number; x1?: number; x2?: number; label?: string }) {
  return (
    <g>
      {/* Trait mètre */}
      <line x1={x1} y1={y} x2={x2} y2={y} stroke="#1D9E75" strokeWidth="3.2" strokeLinecap="round" />
      {/* Pointillés blancs dessus */}
      <line x1={x1} y1={y} x2={x2} y2={y} stroke="#FFFFFF" strokeWidth="1.2" strokeDasharray="5 5" strokeLinecap="round" />
      {/* Flèches */}
      <polygon points={`${x1},${y - 5} ${x1 - 7},${y} ${x1},${y + 5}`} fill="#1D9E75" />
      <polygon points={`${x2},${y - 5} ${x2 + 7},${y} ${x2},${y + 5}`} fill="#1D9E75" />
      {/* Graduations mini */}
      {Array.from({ length: 7 }).map((_, i) => {
        const gx = x1 + ((x2 - x1) / 7) * (i + 0.5);
        return <line key={i} x1={gx} y1={y - 3} x2={gx} y2={y + 3} stroke="#1D9E75" strokeWidth="1" />;
      })}
      {label ? (
        <text x={(x1 + x2) / 2} y={y + 22} textAnchor="middle" fontSize="10" fill="var(--ls-text-muted, #9aa0ac)" fontFamily="DM Sans, sans-serif">
          {label}
        </text>
      ) : null}
    </g>
  );
}

function BodyShape({ d, label }: { d: string; label?: string }) {
  return (
    <g>
      <path
        d={d}
        fill="var(--ls-surface2, #2a2f3a)"
        stroke="var(--ls-text-hint, #6b6f7a)"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      {label ? (
        <text x="100" y="195" textAnchor="middle" fontSize="9" fill="var(--ls-text-hint, #6b6f7a)" fontFamily="DM Sans, sans-serif" fontStyle="italic">
          {label}
        </text>
      ) : null}
    </g>
  );
}

// ─── 1. Cou ──────────────────────────────────────────────────────────────
function NeckZoom() {
  // Tête (cercle) + cou + épaules naissantes
  const d = `
    M 100 25
    C 88 25, 78 35, 78 50
    C 78 62, 84 72, 92 75
    L 92 90
    L 70 95
    L 50 105
    L 50 180
    L 150 180
    L 150 105
    L 130 95
    L 108 90
    L 108 75
    C 116 72, 122 62, 122 50
    C 122 35, 112 25, 100 25 Z
  `;
  return (
    <svg viewBox="0 0 200 200" width="100%" height="100%" style={{ maxWidth: 200 }}>
      <BodyShape d={d} />
      <TapeHorizontal y={85} x1={60} x2={140} label="horizontal, sous la pomme d'Adam" />
    </svg>
  );
}

// ─── 2. Poitrine ─────────────────────────────────────────────────────────
function ChestZoom() {
  // Torse haut (épaules large, rétrécit vers la taille)
  const d = `
    M 40 30
    L 50 25
    L 70 20
    L 100 18
    L 130 20
    L 150 25
    L 160 30
    L 155 70
    L 150 110
    L 145 150
    L 140 185
    L 60 185
    L 55 150
    L 50 110
    L 45 70
    L 40 30 Z
  `;
  return (
    <svg viewBox="0 0 200 200" width="100%" height="100%" style={{ maxWidth: 200 }}>
      <BodyShape d={d} />
      <TapeHorizontal y={78} x1={35} x2={165} label="au plus large, sous les aisselles" />
    </svg>
  );
}

// ─── 3. Taille ───────────────────────────────────────────────────────────
function WaistZoom() {
  // Torse avec rétrécissement au niveau taille (sablier)
  const d = `
    M 55 20
    L 140 20
    L 148 50
    L 152 80
    L 148 100
    L 140 115
    L 138 130
    L 142 150
    L 148 175
    L 152 195
    L 48 195
    L 52 175
    L 58 150
    L 62 130
    L 60 115
    L 52 100
    L 48 80
    L 52 50
    L 55 20 Z
  `;
  return (
    <svg viewBox="0 0 200 200" width="100%" height="100%" style={{ maxWidth: 200 }}>
      <BodyShape d={d} />
      {/* Point du nombril */}
      <circle cx="100" cy="115" r="2" fill="var(--ls-text-muted, #9aa0ac)" />
      <TapeHorizontal y={115} x1={40} x2={160} label="au nombril · expire normalement" />
    </svg>
  );
}

// ─── 4. Hanches ──────────────────────────────────────────────────────────
function HipsZoom() {
  // Hanches larges, fesses
  const d = `
    M 60 30
    L 140 30
    L 150 55
    L 158 90
    L 162 130
    L 160 165
    L 155 190
    L 45 190
    L 40 165
    L 38 130
    L 42 90
    L 50 55
    L 60 30 Z
  `;
  return (
    <svg viewBox="0 0 200 200" width="100%" height="100%" style={{ maxWidth: 200 }}>
      <BodyShape d={d} />
      <TapeHorizontal y={130} x1={28} x2={172} label="au plus large des fesses" />
    </svg>
  );
}

// ─── 5. Cuisse (gauche ou droite même schéma) ────────────────────────────
function ThighZoom({ side }: { side: "left" | "right" }) {
  // Coupe transversale d'une cuisse (forme ovale plus large en haut)
  const d = `
    M 78 20
    C 58 22, 50 55, 55 100
    C 58 135, 66 165, 80 188
    L 120 188
    C 134 165, 142 135, 145 100
    C 150 55, 142 22, 122 20
    Z
  `;
  return (
    <svg viewBox="0 0 200 200" width="100%" height="100%" style={{ maxWidth: 200 }}>
      <BodyShape d={d} label={side === "left" ? "cuisse gauche" : "cuisse droite"} />
      <TapeHorizontal y={105} x1={40} x2={160} label="milieu · ~25 cm au-dessus du genou" />
    </svg>
  );
}

// ─── 6. Bras (biceps) ────────────────────────────────────────────────────
function ArmZoom({ side }: { side: "left" | "right" }) {
  // Bras vertical : épaule haut + biceps milieu + coude bas
  const d = `
    M 80 20
    C 74 22, 70 35, 68 60
    C 66 90, 68 130, 72 160
    C 74 175, 78 185, 85 188
    L 115 188
    C 122 185, 126 175, 128 160
    C 132 130, 134 90, 132 60
    C 130 35, 126 22, 120 20
    Z
  `;
  return (
    <svg viewBox="0 0 200 200" width="100%" height="100%" style={{ maxWidth: 200 }}>
      <BodyShape d={d} label={side === "left" ? "biceps gauche, détendu" : "biceps droit, détendu"} />
      <TapeHorizontal y={100} x1={52} x2={148} label="milieu du biceps · bras détendu" />
    </svg>
  );
}

// ─── 7. Mollet ───────────────────────────────────────────────────────────
function CalfZoom({ side }: { side: "left" | "right" }) {
  // Mollet : genou haut + ventre du mollet + cheville bas
  const d = `
    M 82 20
    C 76 22, 72 32, 70 50
    C 65 90, 64 130, 72 155
    C 78 175, 85 185, 92 188
    L 108 188
    C 115 185, 122 175, 128 155
    C 136 130, 135 90, 130 50
    C 128 32, 124 22, 118 20
    Z
  `;
  return (
    <svg viewBox="0 0 200 200" width="100%" height="100%" style={{ maxWidth: 200 }}>
      <BodyShape d={d} label={side === "left" ? "mollet gauche" : "mollet droit"} />
      <TapeHorizontal y={115} x1={45} x2={155} label="au plus large · pied à plat" />
    </svg>
  );
}

// ─── Router principal ────────────────────────────────────────────────────
export function IllustrationZoom({ zoneKey }: { zoneKey: MeasurementKey }) {
  switch (zoneKey) {
    case "neck":
      return <NeckZoom />;
    case "chest":
      return <ChestZoom />;
    case "waist":
      return <WaistZoom />;
    case "hips":
      return <HipsZoom />;
    case "thigh_left":
      return <ThighZoom side="left" />;
    case "thigh_right":
      return <ThighZoom side="right" />;
    case "arm_left":
      return <ArmZoom side="left" />;
    case "arm_right":
      return <ArmZoom side="right" />;
    case "calf_left":
      return <CalfZoom side="left" />;
    case "calf_right":
      return <CalfZoom side="right" />;
    default:
      return null;
  }
}
