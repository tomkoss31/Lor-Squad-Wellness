// =============================================================================
// AssessmentSectionV2 — bloc de section premium pour le bilan (2026-11-04)
//
// Refonte profonde du SectionBlock historique. Plutot qu un simple titre +
// dashed border, chaque section devient un mini-chapitre avec :
//
//   - Eyebrow : emoji + label uppercase color-tinted (gold/teal/purple/coral)
//   - Titre Syne 20-22px avec letter-spacing tight
//   - Description en DM Sans, ton coach
//   - Glow ambient subtil en haut a droite (pointer-events: none)
//   - Border 0.5px tinted selon accent
//   - Padding 26-28px (respiration premium)
//   - Hover lift translateY -1px (sensation de produit vivant)
//   - Theme-aware via var(--ls-*) + color-mix
//
// Utilisable comme remplacement direct de SectionBlock partout dans le
// bilan. On commence par etape 1 (client-info) pour test grandeur nature
// avant cascade aux 12 autres etapes.
// =============================================================================

import { type ReactNode } from "react";

export type SectionAccent = "gold" | "teal" | "purple" | "coral" | "neutral";

export interface AssessmentSectionV2Props {
  /** Emoji ou icon en eyebrow (ex: "🎯", "🧬", "🍽️"). */
  emoji: string;
  /** Label eyebrow uppercase (ex: "OBJECTIF & CADRE", "RYTHME DE VIE"). */
  eyebrow: string;
  /** Titre principal en Syne (ex: "Pose le cap dès le départ"). */
  title: string;
  /** Sous-titre / description en DM Sans (ton coach). */
  description?: string;
  /** Couleur d accent (gold default). Pilote eyebrow + glow + border tint. */
  accent?: SectionAccent;
  /** Contenu (champs, choix, etc.). */
  children: ReactNode;
  /** ID optionnel pour data-tour-id. */
  dataTourId?: string;
}

const ACCENT_COLORS: Record<SectionAccent, string> = {
  gold: "var(--ls-gold)",
  teal: "var(--ls-teal)",
  purple: "var(--ls-purple)",
  coral: "var(--ls-coral)",
  neutral: "var(--ls-text-muted)",
};

export function AssessmentSectionV2({
  emoji,
  eyebrow,
  title,
  description,
  accent = "gold",
  children,
  dataTourId,
}: AssessmentSectionV2Props) {
  const accentColor = ACCENT_COLORS[accent];

  return (
    <section
      data-tour-id={dataTourId}
      className="ls-section-v2"
      style={{
        position: "relative",
        padding: "26px 28px 28px",
        borderRadius: 22,
        background: "var(--ls-surface)",
        border: `0.5px solid color-mix(in srgb, ${accentColor} 18%, var(--ls-border))`,
        boxShadow: `0 1px 0 0 color-mix(in srgb, ${accentColor} 6%, transparent), 0 8px 24px -16px color-mix(in srgb, ${accentColor} 18%, transparent)`,
        overflow: "hidden",
        transition:
          "transform 240ms cubic-bezier(0.4, 0, 0.2, 1), box-shadow 240ms cubic-bezier(0.4, 0, 0.2, 1), border-color 240ms ease",
      }}
    >
      <style>{`
        .ls-section-v2:hover {
          transform: translateY(-1px);
        }
        @media (prefers-reduced-motion: reduce) {
          .ls-section-v2 { transition: none !important; }
          .ls-section-v2:hover { transform: none !important; }
        }
      `}</style>

      {/* Glow ambient en haut a droite (couleur tintée par accent) */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          top: -60,
          right: -60,
          width: 180,
          height: 180,
          borderRadius: "50%",
          background: `color-mix(in srgb, ${accentColor} 10%, transparent)`,
          filter: "blur(56px)",
          pointerEvents: "none",
        }}
      />

      {/* Header : eyebrow + titre + description */}
      <header
        style={{
          position: "relative",
          marginBottom: 22,
          paddingBottom: 18,
          borderBottom: `1px solid color-mix(in srgb, ${accentColor} 14%, var(--ls-border))`,
        }}
      >
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            marginBottom: 10,
          }}
        >
          <span
            style={{
              fontSize: 18,
              lineHeight: 1,
              filter: `drop-shadow(0 1px 4px color-mix(in srgb, ${accentColor} 30%, transparent))`,
            }}
            aria-hidden="true"
          >
            {emoji}
          </span>
          <span
            style={{
              fontFamily: "DM Sans, sans-serif",
              fontSize: 10.5,
              fontWeight: 700,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: accentColor,
            }}
          >
            {eyebrow}
          </span>
        </div>
        <h3
          style={{
            fontFamily: "Syne, serif",
            fontWeight: 700,
            fontSize: "clamp(18px, 2.2vw, 22px)",
            letterSpacing: "-0.018em",
            lineHeight: 1.18,
            color: "var(--ls-text)",
            margin: 0,
          }}
        >
          {title}
        </h3>
        {description ? (
          <p
            style={{
              fontFamily: "DM Sans, sans-serif",
              fontSize: 13.5,
              lineHeight: 1.6,
              color: "var(--ls-text-muted)",
              margin: "8px 0 0",
              maxWidth: 640,
            }}
          >
            {description}
          </p>
        ) : null}
      </header>

      {/* Contenu */}
      <div style={{ position: "relative", display: "flex", flexDirection: "column", gap: 20 }}>
        {children}
      </div>
    </section>
  );
}
