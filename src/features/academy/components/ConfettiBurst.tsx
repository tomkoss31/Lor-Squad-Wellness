// Chantier Academy polish ludique (2026-04-27).
// Composant confetti pur SVG — pas de dependance externe. Render N
// particules avec animations CSS keyframes (fall + rotate). Auto-cleanup
// apres durationMs via callback onComplete.
//
// Couleurs Lor'Squad : gold #B8922A / teal #1D9E75 / coral #D85A30 /
// purple #7F77DD / blanc creme #FAF6E8.

import { useEffect, useMemo, useState } from "react";

export interface ConfettiBurstProps {
  /** Nombre de particules. Defaut 60 (sweet spot perf + visuel). */
  count?: number;
  /** Duree avant cleanup auto (ms). Defaut 3500. */
  durationMs?: number;
  /** Callback appele apres cleanup (ferme le portal cote parent). */
  onComplete?: () => void;
  /** z-index. Defaut 99999 (au-dessus de tout). */
  zIndex?: number;
}

const PALETTE = [
  "#B8922A", // gold
  "#1D9E75", // teal
  "#D85A30", // coral
  "#7F77DD", // purple
  "#EF9F27", // gold light
  "#FFFFFF", // blanc
];

interface Particle {
  id: number;
  left: number; // %
  delay: number; // ms
  duration: number; // ms
  rotateStart: number; // deg
  rotateEnd: number; // deg
  color: string;
  size: number; // px
  drift: number; // px lateral final
  shape: "rect" | "circle";
}

function generateParticles(count: number): Particle[] {
  const out: Particle[] = [];
  for (let i = 0; i < count; i++) {
    out.push({
      id: i,
      left: Math.random() * 100,
      delay: Math.random() * 600,
      duration: 1800 + Math.random() * 1400, // 1.8-3.2s
      rotateStart: Math.random() * 360,
      rotateEnd: Math.random() * 720 - 360,
      color: PALETTE[Math.floor(Math.random() * PALETTE.length)],
      size: 6 + Math.random() * 8, // 6-14 px
      drift: (Math.random() - 0.5) * 240, // ±120px
      shape: Math.random() > 0.4 ? "rect" : "circle",
    });
  }
  return out;
}

export function ConfettiBurst({
  count = 60,
  durationMs = 3500,
  onComplete,
  zIndex = 99999,
}: ConfettiBurstProps) {
  const particles = useMemo(() => generateParticles(count), [count]);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const t = window.setTimeout(() => {
      setVisible(false);
      onComplete?.();
    }, durationMs);
    return () => window.clearTimeout(t);
  }, [durationMs, onComplete]);

  if (!visible) return null;

  return (
    <div
      aria-hidden="true"
      style={{
        position: "fixed",
        inset: 0,
        pointerEvents: "none",
        overflow: "hidden",
        zIndex,
      }}
    >
      <style>{`
        @keyframes ls-confetti-fall {
          0% {
            transform: translate3d(0, -10vh, 0) rotate(var(--ls-rot-start, 0deg));
            opacity: 1;
          }
          90% {
            opacity: 1;
          }
          100% {
            transform: translate3d(var(--ls-drift, 0px), 110vh, 0) rotate(var(--ls-rot-end, 360deg));
            opacity: 0.4;
          }
        }
      `}</style>
      {particles.map((p) => (
        <span
          key={p.id}
          style={{
            position: "absolute",
            top: 0,
            left: `${p.left}%`,
            width: p.size,
            height: p.shape === "rect" ? p.size * 0.5 : p.size,
            background: p.color,
            borderRadius: p.shape === "circle" ? "50%" : 2,
            // Custom props consommees par le keyframe
            ["--ls-rot-start" as string]: `${p.rotateStart}deg`,
            ["--ls-rot-end" as string]: `${p.rotateEnd}deg`,
            ["--ls-drift" as string]: `${p.drift}px`,
            animation: `ls-confetti-fall ${p.duration}ms cubic-bezier(0.2, 0.6, 0.5, 1) ${p.delay}ms forwards`,
            boxShadow: "0 1px 2px rgba(0,0,0,0.08)",
            willChange: "transform, opacity",
          }}
        />
      ))}
    </div>
  );
}
