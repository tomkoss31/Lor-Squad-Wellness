// Skeleton V2 (2026-04-29) — placeholders animes pour les chargements.
// Shimmer modern (gradient sweep 1.6s) + 4 helpers : Line / Paragraph / Card / Row.
// Theme-aware via var(--ls-surface2 / text-hint).

import type { CSSProperties } from "react";

const SHIMMER_KEYFRAMES = `
@keyframes ls-skeleton-shimmer {
  0%   { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}
@media (prefers-reduced-motion: reduce) {
  .ls-skeleton { animation: none !important; }
}
`;

if (typeof document !== "undefined") {
  const styleEl = document.getElementById("ls-skeleton-keyframes");
  if (!styleEl) {
    const el = document.createElement("style");
    el.id = "ls-skeleton-keyframes";
    el.textContent = SHIMMER_KEYFRAMES;
    document.head.appendChild(el);
  }
}

export interface SkeletonProps {
  width?: number | string;
  height?: number | string;
  variant?: "text" | "card" | "circle";
  radius?: number;
  style?: CSSProperties;
}

export function Skeleton({ width, height, variant = "text", radius, style }: SkeletonProps) {
  const defaultHeight = variant === "card" ? 80 : variant === "circle" ? 40 : 14;
  const defaultRadius = variant === "circle" ? 9999 : variant === "card" ? 14 : 6;
  return (
    <div
      className="ls-skeleton"
      aria-hidden="true"
      style={{
        width: width ?? (variant === "circle" ? defaultHeight : "100%"),
        height: height ?? defaultHeight,
        borderRadius: radius ?? defaultRadius,
        background: `linear-gradient(
          90deg,
          var(--ls-surface2) 0%,
          color-mix(in srgb, var(--ls-text-hint) 18%, var(--ls-surface2)) 50%,
          var(--ls-surface2) 100%
        )`,
        backgroundSize: "200% 100%",
        animation: "ls-skeleton-shimmer 1.6s ease-in-out infinite",
        ...style,
      }}
    />
  );
}

export function SkeletonLine({
  width = "100%",
  height = 14,
  style,
}: {
  width?: string | number;
  height?: number;
  style?: CSSProperties;
}) {
  return <Skeleton variant="text" width={width} height={height} style={style} />;
}

export function SkeletonParagraph({ lines = 3 }: { lines?: number }) {
  const widths = ["100%", "92%", "78%", "85%", "70%", "95%"];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {Array.from({ length: lines }).map((_, i) => (
        <SkeletonLine key={i} width={widths[i % widths.length]} />
      ))}
    </div>
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

/** Row skeleton avec avatar + nom + meta + status pill. Pour listes (clients, distri, RDV...). */
export function SkeletonRow() {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "12px 14px",
        background: "var(--ls-surface)",
        borderRadius: 12,
        border: "0.5px solid var(--ls-border)",
      }}
    >
      <Skeleton variant="circle" width={36} height={36} />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
        <SkeletonLine width="55%" height={12} />
        <SkeletonLine width="35%" height={10} />
      </div>
      <SkeletonLine width={60} height={20} style={{ borderRadius: 999, flexShrink: 0 } as CSSProperties} />
    </div>
  );
}
