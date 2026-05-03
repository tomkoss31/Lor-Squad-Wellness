// =============================================================================
// ModuleHeaderHero — header de page module Formation (Phase F-UI)
//
// Affiche emoji + numero + titre + description du module + ideeForce en
// callout gold. Coherent avec PremiumHero du reste de l app mais dedie
// formation.
// =============================================================================

import type { FormationModule } from "../../data/formation";
import { formatModuleShort } from "../../data/formation";
import { FormationStatusBadge } from "./FormationStatusBadge";
import type { FormationProgressStatus } from "../../features/formation/types-db";

interface Props {
  module: FormationModule;
  /** Status courant de la progression sur ce module (si une row existe). */
  status?: FormationProgressStatus;
  levelTitle: string;
  levelOrder: 1 | 2 | 3;
  levelAccent: string; // var(--ls-gold) etc.
}

export function ModuleHeaderHero({ module, status, levelTitle, levelOrder: _levelOrder, levelAccent }: Props) {
  const totalLessons = module.lessons.length;
  const totalQcm = module.quiz?.questions.filter((q) => q.kind === "qcm").length ?? 0;
  const totalFreeText = module.quiz?.questions.filter((q) => q.kind === "free_text").length ?? 0;

  return (
    <div
      style={{
        position: "relative",
        background: `linear-gradient(135deg, color-mix(in srgb, ${levelAccent} 8%, var(--ls-surface)) 0%, var(--ls-surface) 60%)`,
        border: `0.5px solid color-mix(in srgb, ${levelAccent} 25%, var(--ls-border))`,
        borderTop: `3px solid ${levelAccent}`,
        borderRadius: 18,
        padding: "20px 22px",
        fontFamily: "DM Sans, sans-serif",
        overflow: "hidden",
      }}
    >
      {/* Big emoji watermark */}
      <span
        aria-hidden="true"
        style={{
          position: "absolute",
          top: -10,
          right: 14,
          fontSize: 110,
          lineHeight: 1,
          opacity: 0.12,
          pointerEvents: "none",
        }}
      >
        {module.icon}
      </span>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          marginBottom: 8,
          position: "relative",
        }}
      >
        <span
          style={{
            fontSize: 10,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            fontWeight: 700,
            color: levelAccent,
          }}
        >
          {levelTitle} · {formatModuleShort(module.number)}
        </span>
        {status ? <FormationStatusBadge status={status} /> : null}
      </div>

      <h1
        style={{
          fontFamily: "Syne, serif",
          fontSize: 26,
          fontWeight: 800,
          letterSpacing: "-0.02em",
          margin: "0 0 8px",
          color: "var(--ls-text)",
          position: "relative",
        }}
      >
        <span style={{ marginRight: 10 }} aria-hidden="true">
          {module.icon}
        </span>
        {module.title}
      </h1>

      <p
        style={{
          fontSize: 14,
          color: "var(--ls-text-muted)",
          lineHeight: 1.55,
          margin: "0 0 14px",
          position: "relative",
          maxWidth: 720,
        }}
      >
        {module.description}
      </p>

      {/* Meta inline : durée / leçons / questions */}
      <div
        style={{
          display: "flex",
          gap: 16,
          flexWrap: "wrap",
          fontSize: 12,
          color: "var(--ls-text-muted)",
          marginBottom: module.ideeForce ? 16 : 0,
          position: "relative",
        }}
      >
        <Meta icon="⏱" label={`${module.durationMin} min`} />
        <Meta icon="📚" label={`${totalLessons} leçon${totalLessons > 1 ? "s" : ""}`} />
        {totalQcm > 0 ? <Meta icon="✓" label={`${totalQcm} QCM`} /> : null}
        {totalFreeText > 0 ? (
          <Meta icon="✍️" label={`${totalFreeText} réponse${totalFreeText > 1 ? "s" : ""} libre${totalFreeText > 1 ? "s" : ""}`} />
        ) : null}
      </div>

      {/* Idée force callout */}
      {module.ideeForce ? (
        <div
          style={{
            position: "relative",
            background: "color-mix(in srgb, var(--ls-gold) 10%, transparent)",
            border: "0.5px solid color-mix(in srgb, var(--ls-gold) 28%, transparent)",
            borderLeft: "3px solid var(--ls-gold)",
            borderRadius: 12,
            padding: "12px 14px",
            display: "flex",
            gap: 10,
          }}
        >
          <span style={{ fontSize: 22, flexShrink: 0 }} aria-hidden="true">
            💡
          </span>
          <div style={{ flex: 1 }}>
            <div
              style={{
                fontSize: 9.5,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                fontWeight: 700,
                color: "var(--ls-gold)",
                marginBottom: 4,
              }}
            >
              Idée force
            </div>
            <p
              style={{
                fontSize: 13,
                color: "var(--ls-text)",
                lineHeight: 1.55,
                margin: 0,
                fontStyle: "italic",
              }}
            >
              {module.ideeForce}
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Meta({ icon, label }: { icon: string; label: string }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
      <span aria-hidden="true">{icon}</span> {label}
    </span>
  );
}
