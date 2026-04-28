// =============================================================================
// PremiumHero — wrapper hero gradient mesh time-of-day reutilisable
// (2026-04-29)
// =============================================================================
//
// Pattern hero unifie applique sur Co-pilote / Agenda / Messages / PV / Team
// pour cohérence visuelle. Chaque page passe son identité (couleur dominante)
// et son contenu — le wrapper s'occupe du gradient mesh, shine, eyebrow.
//
// Usage :
//   <PremiumHero
//     identity="gold"
//     eyebrow="Suivi PV · 12 alertes"
//     titleAccent="Ton suivi"
//     titleSuffix=" du moment 🎯"
//     subtitle="Gere les commandes, les cures et les relances."
//     rightSlot={<button>+ Nouveau</button>}
//   >
//     <StatsRow ... />
//   </PremiumHero>
// =============================================================================

import { useId, type ReactNode } from "react";
import { getHeroGradient, type HeroIdentity } from "../../lib/heroGradient";

interface Props {
  identity?: HeroIdentity;
  eyebrow?: string;
  titleAccent?: string;
  titleSuffix?: ReactNode;
  subtitle?: string;
  rightSlot?: ReactNode;
  /** Contenu sous le header (typiquement une grid de stats). */
  children?: ReactNode;
}

export function PremiumHero({
  identity = "gold",
  eyebrow,
  titleAccent,
  titleSuffix,
  subtitle,
  rightSlot,
  children,
}: Props) {
  const g = getHeroGradient(identity);
  const uid = useId().replace(/:/g, "");
  const meshClass = `ls-hero-mesh-${uid}`;
  const shineClass = `ls-hero-shine-${uid}`;
  const heroClass = `ls-hero-${uid}`;

  return (
    <div className={heroClass}>
      <style>{`
        @keyframes ls-hero-mesh-shift-${uid} {
          0% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(-10px, 6px) scale(1.05); }
          100% { transform: translate(8px, -4px) scale(1); }
        }
        @keyframes ls-hero-shine-${uid} {
          0%, 100% { transform: translateX(-50%); opacity: 0; }
          50% { transform: translateX(150%); opacity: 0.6; }
        }
        .${heroClass} {
          position: relative;
          overflow: hidden;
          padding: 26px 28px;
          border-radius: 24px;
          background: var(--ls-surface);
          border: 0.5px solid var(--ls-border);
          box-shadow: 0 1px 0 0 ${g.glow}, 0 12px 36px -12px rgba(0,0,0,0.10);
        }
        .${meshClass} {
          position: absolute; inset: -20%; opacity: 0.55; pointer-events: none;
          animation: ls-hero-mesh-shift-${uid} 22s ease-in-out infinite alternate;
          background:
            radial-gradient(circle at 0% 0%, ${g.glow} 0%, transparent 45%),
            radial-gradient(circle at 100% 100%, ${g.glow} 0%, transparent 50%),
            radial-gradient(circle at 100% 0%, color-mix(in srgb, ${g.tertiary} 25%, transparent) 0%, transparent 60%);
        }
        .${shineClass} {
          position: absolute; top: 0; height: 100%; width: 50%; left: 0;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.10), transparent);
          animation: ls-hero-shine-${uid} 9s ease-in-out infinite;
          pointer-events: none;
        }
        @media (prefers-reduced-motion: reduce) {
          .${meshClass}, .${shineClass} { animation: none !important; }
        }
      `}</style>
      <div className={meshClass} aria-hidden="true" />
      <div className={shineClass} aria-hidden="true" />

      <div
        style={{
          position: "relative",
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 24,
          flexWrap: "wrap",
          marginBottom: children ? 18 : 0,
        }}
      >
        <div style={{ flex: 1, minWidth: 240 }}>
          {eyebrow ? (
            <div
              style={{
                fontSize: 10,
                letterSpacing: 2,
                textTransform: "uppercase",
                fontWeight: 700,
                color: g.secondary,
                marginBottom: 6,
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <span
                style={{
                  display: "inline-block",
                  width: 6,
                  height: 6,
                  borderRadius: 999,
                  background: g.primary,
                  boxShadow: `0 0 8px ${g.glow}`,
                }}
              />
              {eyebrow}
            </div>
          ) : null}

          {titleAccent || titleSuffix ? (
            <h1
              style={{
                fontFamily: "Syne, serif",
                fontSize: 32,
                fontWeight: 800,
                color: "var(--ls-text)",
                lineHeight: 1.05,
                letterSpacing: "-0.02em",
                margin: 0,
              }}
            >
              {titleAccent ? (
                <span
                  style={{
                    background: `linear-gradient(135deg, ${g.primary} 0%, ${g.secondary} 60%, ${g.tertiary} 100%)`,
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    backgroundClip: "text",
                  }}
                >
                  {titleAccent}
                </span>
              ) : null}
              {titleSuffix}
            </h1>
          ) : null}

          {subtitle ? (
            <p
              style={{
                fontSize: 13,
                color: "var(--ls-text-muted)",
                marginTop: 6,
                marginBottom: 0,
                fontFamily: "DM Sans, sans-serif",
              }}
            >
              {subtitle}
            </p>
          ) : null}
        </div>

        {rightSlot ? <div style={{ flexShrink: 0 }}>{rightSlot}</div> : null}
      </div>

      {children ? <div style={{ position: "relative" }}>{children}</div> : null}
    </div>
  );
}
