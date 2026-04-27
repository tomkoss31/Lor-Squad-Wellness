// =============================================================================
// Skeleton — placeholders animes pour les chargements (Polish, 2026-04-29)
// =============================================================================
//
// 3 variants pour les usages courants :
//   - <SkeletonLine /> : une ligne de texte (titre, sous-titre)
//   - <SkeletonCard /> : un bloc card complet (header + 3 lignes)
//   - <SkeletonRow /> : une ligne de tableau (avatar + nom + meta + status)
//
// Animation pulse via CSS (1.5s ease-in-out infinite). Compatible dark mode
// via les tokens --ls-surface2 / --ls-border.
// =============================================================================

import type { CSSProperties } from "react";

const PULSE_STYLE: CSSProperties = {
  animation: "ls-skeleton-pulse 1.5s ease-in-out infinite",
};

const PULSE_KEYFRAMES = `
@keyframes ls-skeleton-pulse {
  0%, 100% { opacity: 0.6; }
  50% { opacity: 1; }
}
`;

// On injecte les keyframes 1 fois au mount du module (styled-components-like).
// Ca evite de devoir creer un fichier CSS dedie.
if (typeof document !== "undefined") {
  const styleEl = document.getElementById("ls-skeleton-keyframes");
  if (!styleEl) {
    const el = document.createElement("style");
    el.id = "ls-skeleton-keyframes";
    el.textContent = PULSE_KEYFRAMES;
    document.head.appendChild(el);
  }
}

export function SkeletonLine({
  width = "100%",
  height = 12,
  style,
}: {
  width?: string | number;
  height?: number;
  style?: CSSProperties;
}) {
  return (
    <div
      style={{
        width,
        height,
        background: "var(--ls-surface2)",
        borderRadius: height / 2,
        ...PULSE_STYLE,
        ...style,
      }}
    />
  );
}

export function SkeletonCard({ rows = 3 }: { rows?: number }) {
  return (
    <div
      style={{
        background: "var(--ls-surface)",
        border: "0.5px solid var(--ls-border)",
        borderRadius: 14,
        padding: 18,
        display: "flex",
        flexDirection: "column",
        gap: 10,
      }}
    >
      <SkeletonLine width="40%" height={16} />
      {Array.from({ length: rows }).map((_, i) => (
        <SkeletonLine key={i} width={`${100 - i * 8}%`} height={11} />
      ))}
    </div>
  );
}

export function SkeletonRow() {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "12px 14px",
        borderBottom: "0.5px solid var(--ls-border)",
      }}
    >
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: "50%",
          background: "var(--ls-surface2)",
          ...PULSE_STYLE,
          flexShrink: 0,
        }}
      />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
        <SkeletonLine width="55%" height={11} />
        <SkeletonLine width="35%" height={9} />
      </div>
      <SkeletonLine width={60} height={20} />
    </div>
  );
}
