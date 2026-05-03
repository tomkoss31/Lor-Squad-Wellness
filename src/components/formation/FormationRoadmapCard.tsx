// =============================================================================
// FormationRoadmapCard — quick win #2 (2026-11-04)
//
// Card en haut de FormationPage qui affiche en 1 coup d oeil :
//   - Ou en est le distri ("Tu es a 3/5 N1")
//   - Le prochain module ("M1.4 — Comprendre l opportunite")
//   - CTA "Reprendre" gros + visuel
//
// 3 etats :
//   1. nextStep != null : card "Reprendre M1.X"
//   2. nextStep == null && isAllComplete : card "🎉 Parcours complet"
//   3. nextStep == null && !isAllComplete : ne rien afficher (cas
//      verrouille ou edge case — la zone niveaux explique deja)
//
// Theme-aware via var(--ls-*).
// =============================================================================

import { Link } from "react-router-dom";
import type { FormationNextStep } from "../../hooks/useFormationProgress";
import { formatModuleShort } from "../../data/formation";

export interface FormationRoadmapCardProps {
  nextStep: FormationNextStep | null;
  isAllComplete: boolean;
  /** Total de modules valides cross-niveaux (pour le compteur global). */
  totalCompleted: number;
  /** Total de modules existants cross-niveaux. */
  totalModules: number;
}

export function FormationRoadmapCard({
  nextStep,
  isAllComplete,
  totalCompleted,
  totalModules,
}: FormationRoadmapCardProps) {
  // Etat 1 : tout fini
  if (isAllComplete) {
    return (
      <div
        style={{
          position: "relative",
          padding: "24px 28px 26px",
          borderRadius: 22,
          background:
            "linear-gradient(135deg, color-mix(in srgb, var(--ls-gold) 14%, var(--ls-surface)) 0%, color-mix(in srgb, var(--ls-teal) 8%, var(--ls-surface)) 100%)",
          border: "0.5px solid color-mix(in srgb, var(--ls-gold) 40%, var(--ls-border))",
          boxShadow: "0 12px 36px -16px color-mix(in srgb, var(--ls-gold) 50%, transparent)",
          overflow: "hidden",
          textAlign: "center",
        }}
      >
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            top: -50,
            right: -50,
            width: 200,
            height: 200,
            borderRadius: "50%",
            background: "color-mix(in srgb, var(--ls-gold) 22%, transparent)",
            filter: "blur(60px)",
            pointerEvents: "none",
          }}
        />
        <div style={{ position: "relative" }}>
          <div style={{ fontSize: 56, marginBottom: 10 }} aria-hidden="true">
            🎉
          </div>
          <div
            style={{
              fontFamily: "DM Sans, sans-serif",
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: "var(--ls-gold)",
              marginBottom: 6,
            }}
          >
            ✦ Parcours complet
          </div>
          <h2
            style={{
              fontFamily: "Syne, serif",
              fontWeight: 800,
              fontSize: "clamp(20px, 3vw, 26px)",
              letterSpacing: "-0.02em",
              lineHeight: 1.15,
              color: "var(--ls-text)",
              margin: 0,
            }}
          >
            Tu as <span style={{ color: "var(--ls-gold)" }}>tout validé</span>. Bravo.
          </h2>
          <p
            style={{
              fontFamily: "DM Sans, sans-serif",
              fontSize: 13.5,
              color: "var(--ls-text-muted)",
              margin: "10px auto 0",
              maxWidth: 480,
              lineHeight: 1.55,
            }}
          >
            {totalCompleted} modules validés sur {totalModules}. Tu peux refaire un module à tout moment.
          </p>
        </div>
      </div>
    );
  }

  // Etat 2 : nextStep null mais pas all complete (verrouillage edge case) → ne rien afficher
  if (!nextStep) {
    return null;
  }

  // Etat 3 : nextStep dispo → CTA "Reprendre"
  const accent = nextStep.levelAccent;

  return (
    <Link
      to={`/formation/parcours/${nextStep.levelSlug}/${nextStep.moduleSlug}`}
      style={{
        display: "block",
        position: "relative",
        padding: "20px 24px 22px",
        borderRadius: 22,
        background: `linear-gradient(135deg, color-mix(in srgb, ${accent} 12%, var(--ls-surface)) 0%, color-mix(in srgb, ${accent} 4%, var(--ls-surface)) 100%)`,
        border: `0.5px solid color-mix(in srgb, ${accent} 35%, var(--ls-border))`,
        boxShadow: `0 8px 28px -16px color-mix(in srgb, ${accent} 40%, transparent)`,
        overflow: "hidden",
        textDecoration: "none",
        color: "var(--ls-text)",
        transition: "transform 240ms cubic-bezier(0.4, 0, 0.2, 1), box-shadow 240ms ease",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-2px)";
        e.currentTarget.style.boxShadow = `0 14px 36px -14px color-mix(in srgb, ${accent} 55%, transparent)`;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "none";
        e.currentTarget.style.boxShadow = `0 8px 28px -16px color-mix(in srgb, ${accent} 40%, transparent)`;
      }}
    >
      {/* Glow ambient */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          top: -50,
          right: -50,
          width: 180,
          height: 180,
          borderRadius: "50%",
          background: `color-mix(in srgb, ${accent} 22%, transparent)`,
          filter: "blur(56px)",
          pointerEvents: "none",
        }}
      />

      <div
        style={{
          position: "relative",
          display: "flex",
          alignItems: "center",
          gap: 16,
          flexWrap: "wrap",
        }}
      >
        {/* Icone module */}
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: 16,
            background: `linear-gradient(135deg, ${accent} 0%, color-mix(in srgb, ${accent} 70%, var(--ls-bg)) 100%)`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 28,
            boxShadow: `0 4px 14px color-mix(in srgb, ${accent} 40%, transparent), inset 0 1px 0 rgba(255,255,255,0.4)`,
            flexShrink: 0,
          }}
        >
          {nextStep.icon}
        </div>

        {/* Texte central */}
        <div style={{ flex: 1, minWidth: 220 }}>
          <div
            style={{
              fontFamily: "DM Sans, sans-serif",
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: accent,
              marginBottom: 4,
            }}
          >
            ✦ Reprendre · {nextStep.levelTitle}
          </div>
          <h2
            style={{
              fontFamily: "Syne, serif",
              fontWeight: 700,
              fontSize: "clamp(17px, 2.4vw, 22px)",
              letterSpacing: "-0.018em",
              lineHeight: 1.18,
              color: "var(--ls-text)",
              margin: 0,
            }}
          >
            {formatModuleShort(nextStep.moduleNumber)}
            <span style={{ color: "var(--ls-text-muted)", margin: "0 8px" }}>·</span>
            {nextStep.moduleTitle}
          </h2>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 14,
              marginTop: 8,
              fontFamily: "DM Sans, sans-serif",
              fontSize: 12,
              color: "var(--ls-text-muted)",
            }}
          >
            <span>
              ⏱ {nextStep.durationMin} min
            </span>
            <span>
              📍 Module {nextStep.positionInLevel.current}/{nextStep.positionInLevel.total} · {nextStep.levelTitle}
            </span>
            <span>
              🎯 {totalCompleted}/{totalModules} validés au total
            </span>
          </div>
        </div>

        {/* CTA "Reprendre" gros */}
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "12px 20px",
            borderRadius: 14,
            background: `linear-gradient(135deg, ${accent} 0%, color-mix(in srgb, ${accent} 75%, var(--ls-gold)) 100%)`,
            color: "var(--ls-bg)",
            fontFamily: "DM Sans, sans-serif",
            fontSize: 14,
            fontWeight: 700,
            boxShadow: `0 4px 14px color-mix(in srgb, ${accent} 40%, transparent)`,
            flexShrink: 0,
          }}
        >
          Reprendre
          <span style={{ fontSize: 16 }}>→</span>
        </div>
      </div>
    </Link>
  );
}
