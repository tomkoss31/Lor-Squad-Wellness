// BilanSectionDivider — refonte page Programme uniforme (2026-04-29)
// Header de section reutilisable pour structurer le step Programme
// (et potentiellement d'autres steps complexes) avec une grammaire
// visuelle constante :
//   - Numero circle gradient color
//   - Eyebrow uppercase + dot pulsant
//   - Title Syne 18px var(--ls-text)
//   - Subtitle DM Sans gris muted (optionnel)
//
// 4 couleurs identitaires utilisees dans le bilan :
//   teal   → Tes besoins (data nutritionnelle)
//   gold   → Programme cœur (la vente)
//   coral  → Pour aller plus loin (upsells)
//   purple → Suite (decision)

import type { ReactNode } from "react";

export type BilanSectionColor = "teal" | "gold" | "coral" | "purple";

const COLOR_MAP: Record<BilanSectionColor, { hex: string; var: string }> = {
  teal:   { hex: "#2DD4BF", var: "var(--ls-teal)" },
  gold:   { hex: "#EF9F27", var: "var(--ls-gold)" },
  coral:  { hex: "#FB7185", var: "var(--ls-coral)" },
  purple: { hex: "#A78BFA", var: "var(--ls-purple)" },
};

export interface BilanSectionDividerProps {
  /** Numero affiche dans le circle (1, 2, 3, 4...) */
  number: number;
  /** Eyebrow uppercase au-dessus du title (ex: "Tes besoins detectes") */
  eyebrow: string;
  /** Title principal Syne 18px (ex: "Ce que ton corps demande") */
  title: string;
  /** Description courte sous le title (DM Sans, gris muted) */
  description?: string;
  /** Couleur identitaire de la section (teal / gold / coral / purple) */
  color: BilanSectionColor;
  /** Slot droite — badge, status, action (optionnel) */
  rightSlot?: ReactNode;
  /** Marge top customisable (par defaut 0, mais utile pour bumper les sections) */
  marginTop?: number;
}

export function BilanSectionDivider({
  number,
  eyebrow,
  title,
  description,
  color,
  rightSlot,
  marginTop,
}: BilanSectionDividerProps) {
  const { hex, var: cssVar } = COLOR_MAP[color];

  return (
    <>
      <style>{`
        @keyframes ls-section-dot-pulse {
          0%, 100% { box-shadow: 0 0 0 0 var(--section-dot-color, ${hex}); opacity: 1; }
          50%      { box-shadow: 0 0 0 4px transparent; opacity: 0.85; }
        }
        @media (prefers-reduced-motion: reduce) {
          .ls-section-dot { animation: none !important; }
        }
      `}</style>
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          gap: 14,
          marginTop: marginTop ?? 0,
          marginBottom: 4,
        }}
      >
        <div
          style={{
            width: 38,
            height: 38,
            borderRadius: 12,
            flexShrink: 0,
            background: `linear-gradient(135deg, ${hex} 0%, color-mix(in srgb, ${hex} 70%, #000) 100%)`,
            color: "#FFFFFF",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: "Syne, serif",
            fontWeight: 800,
            fontSize: 17,
            letterSpacing: "-0.02em",
            boxShadow: `0 6px 16px -6px ${hex}80, inset 0 1px 0 rgba(255,255,255,0.20)`,
          }}
        >
          {number}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              fontSize: 10,
              letterSpacing: 1.6,
              textTransform: "uppercase",
              fontWeight: 700,
              color: cssVar,
              fontFamily: "DM Sans, sans-serif",
              marginBottom: 4,
            }}
          >
            <span
              className="ls-section-dot"
              style={
                {
                  display: "inline-block",
                  width: 6,
                  height: 6,
                  borderRadius: 999,
                  background: cssVar,
                  animation: "ls-section-dot-pulse 2.4s ease-in-out infinite",
                  "--section-dot-color": hex,
                } as React.CSSProperties
              }
            />
            {eyebrow}
          </div>
          <div
            style={{
              fontFamily: "Syne, serif",
              fontWeight: 800,
              fontSize: 19,
              letterSpacing: "-0.015em",
              color: "var(--ls-text)",
              lineHeight: 1.2,
            }}
          >
            {title}
          </div>
          {description && (
            <div
              style={{
                fontFamily: "DM Sans, sans-serif",
                fontSize: 13,
                color: "var(--ls-text-muted)",
                marginTop: 4,
                lineHeight: 1.5,
              }}
            >
              {description}
            </div>
          )}
        </div>
        {rightSlot && (
          <div style={{ flexShrink: 0 }}>{rightSlot}</div>
        )}
      </div>
      {/* Trait subtil sous le header pour delimiter */}
      <div
        style={{
          height: 1,
          background: `linear-gradient(90deg, ${hex}40 0%, transparent 60%)`,
          marginBottom: 14,
        }}
      />
    </>
  );
}
