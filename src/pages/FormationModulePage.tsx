// =============================================================================
// FormationModulePage — page d un niveau de parcours guide (2026-04-30)
//
// Route /formation/parcours/:levelSlug. Affiche les modules d un niveau.
//
// Phase 2 : modules vides → empty state propre + retour /formation.
// Phase 3 : liste des modules avec progression, debloquage sequentiel,
//          quiz validation. Sera enrichi avec le contenu Notion.
// =============================================================================

import { Link, useNavigate, useParams } from "react-router-dom";
import { PageHeading } from "../components/ui/PageHeading";
import {
  FORMATION_LEVELS,
  getFormationLevelBySlug,
  type FormationLevelAccent,
} from "../data/formation";
import { useFormationProgress } from "../hooks/useFormationProgress";

const ACCENT_TOKEN: Record<FormationLevelAccent, string> = {
  gold: "var(--ls-gold)",
  teal: "var(--ls-teal)",
  purple: "var(--ls-purple)",
};

export function FormationModulePage() {
  const { levelSlug } = useParams<{ levelSlug: string }>();
  const navigate = useNavigate();
  const { stats } = useFormationProgress();

  const level = levelSlug ? getFormationLevelBySlug(levelSlug) : undefined;

  if (!level) {
    return (
      <div className="space-y-4" style={{ padding: 20 }}>
        <p style={{ color: "var(--ls-text-muted)" }}>
          Niveau introuvable.{" "}
          <Link to="/formation" style={{ color: "var(--ls-gold)" }}>Retour à la formation</Link>
        </p>
      </div>
    );
  }

  const accentVar = ACCENT_TOKEN[level.accent];
  const levelStats = stats[level.id];
  const isEmpty = level.modules.length === 0;

  return (
    <div className="space-y-6">
      <button
        type="button"
        onClick={() => navigate("/formation")}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          padding: "6px 10px",
          borderRadius: 8,
          background: "transparent",
          border: "none",
          color: "var(--ls-text-muted)",
          cursor: "pointer",
          fontSize: 12,
          fontFamily: "DM Sans, sans-serif",
        }}
      >
        ← Retour à la formation
      </button>

      <PageHeading
        eyebrow={`Niveau ${level.order} · Parcours guidé`}
        title={`${level.icon} ${level.title} — ${level.subtitle}`}
        description={level.description}
      />

      {/* Bandeau progression du niveau */}
      <div
        style={{
          padding: "14px 18px",
          background: `linear-gradient(135deg, color-mix(in srgb, ${accentVar} 8%, var(--ls-surface)) 0%, var(--ls-surface) 100%)`,
          border: `0.5px solid color-mix(in srgb, ${accentVar} 25%, var(--ls-border))`,
          borderLeft: `3px solid ${accentVar}`,
          borderRadius: 14,
          fontFamily: "DM Sans, sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 8,
          }}
        >
          <div
            style={{
              fontSize: 11,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              fontWeight: 700,
              color: accentVar,
            }}
          >
            Ta progression
          </div>
          {levelStats.totalCount > 0 ? (
            <div style={{ fontSize: 13, fontWeight: 700, color: accentVar }}>
              {levelStats.percent}%
            </div>
          ) : null}
        </div>
        <div
          style={{
            height: 6,
            borderRadius: 3,
            background: "var(--ls-surface2)",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              width: levelStats.totalCount > 0 ? `${levelStats.percent}%` : "0%",
              height: "100%",
              background: accentVar,
              transition: "width 0.4s ease",
            }}
          />
        </div>
        <div
          style={{
            marginTop: 8,
            fontSize: 12,
            color: "var(--ls-text-muted)",
          }}
        >
          {levelStats.totalCount === 0
            ? "Modules en cours de préparation"
            : `${levelStats.completedCount} sur ${levelStats.totalCount} modules validés`}
        </div>
      </div>

      {/* Liste des modules ou empty state */}
      {isEmpty ? (
        <EmptyModuleState accentVar={accentVar} levelTitle={level.title} />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {/* Phase 3 : liste des modules ici */}
        </div>
      )}

      {/* Nav autres niveaux */}
      <div
        style={{
          padding: "14px 16px",
          background: "var(--ls-surface)",
          border: "0.5px solid var(--ls-border)",
          borderRadius: 14,
        }}
      >
        <div
          style={{
            fontSize: 10,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: "var(--ls-text-muted)",
            fontWeight: 700,
            marginBottom: 10,
            fontFamily: "DM Sans, sans-serif",
          }}
        >
          Autres niveaux
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {FORMATION_LEVELS.filter((l) => l.slug !== levelSlug).map((l) => (
            <Link
              key={l.id}
              to={`/formation/parcours/${l.slug}`}
              style={{
                padding: "6px 12px",
                borderRadius: 999,
                background: "var(--ls-surface2)",
                border: "0.5px solid var(--ls-border)",
                color: "var(--ls-text)",
                textDecoration: "none",
                fontSize: 12,
                fontWeight: 500,
                fontFamily: "DM Sans, sans-serif",
              }}
            >
              {l.icon} N{l.order} — {l.title}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

function EmptyModuleState({ accentVar, levelTitle }: { accentVar: string; levelTitle: string }) {
  return (
    <div
      style={{
        padding: "40px 24px",
        background: `color-mix(in srgb, ${accentVar} 4%, var(--ls-surface))`,
        border: `0.5px dashed color-mix(in srgb, ${accentVar} 30%, transparent)`,
        borderRadius: 16,
        textAlign: "center",
        fontFamily: "DM Sans, sans-serif",
      }}
    >
      <div style={{ fontSize: 44, marginBottom: 12 }} aria-hidden="true">🛠️</div>
      <h3
        style={{
          fontFamily: "Syne, serif",
          fontSize: 19,
          fontWeight: 800,
          color: "var(--ls-text)",
          margin: "0 0 8px",
          letterSpacing: "-0.01em",
        }}
      >
        Niveau {levelTitle} — bientôt disponible
      </h3>
      <p
        style={{
          fontSize: 13,
          color: "var(--ls-text-muted)",
          margin: "0 auto",
          lineHeight: 1.55,
          maxWidth: 480,
        }}
      >
        Thomas est en train de finaliser les modules de ce niveau. Tu seras
        notifié dès qu'ils seront prêts. En attendant, fonce sur ta routine
        et consolide tes premiers RDV.
      </p>
    </div>
  );
}
