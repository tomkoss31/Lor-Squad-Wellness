// =============================================================================
// FormationPage — accueil hybride parcours + bibliotheque (2026-04-30)
//
// Refonte structure hybride :
//   1. Zone haute "Mon parcours guide"  : 3 cards niveaux (Démarrer /
//      Construire / Dupliquer) avec progression localStorage.
//   2. Zone basse "Bibliotheque par theme" : 4 cards thematiques
//      (Prospection / Bilan / Suivi / Business) en libre acces.
//
// Phase 2 : modules et ressources vides (placeholder "Contenu a venir").
// Le contenu Notion sera importe en Phase 3.
//
// Theme-aware (var(--ls-*)). Mobile responsive (cards stackent < 720px).
// =============================================================================

import { Link } from "react-router-dom";
import { PageHeading } from "../components/ui/PageHeading";
import { ParcoursLevelCard } from "../components/formation/ParcoursLevelCard";
import { FormationRoadmapCard } from "../components/formation/FormationRoadmapCard";
import { FormationStreakBadge } from "../components/formation/FormationStreakBadge";
import { FormationSearchBar } from "../components/formation/FormationSearchBar";
import {
  FORMATION_CATEGORIES,
  FORMATION_LEVELS,
  type FormationCategoryAccent,
} from "../data/formation";
import { useFormationProgress } from "../hooks/useFormationProgress";

const CATEGORY_ACCENT: Record<FormationCategoryAccent, string> = {
  gold: "var(--ls-gold)",
  teal: "var(--ls-teal)",
  purple: "var(--ls-purple)",
  coral: "var(--ls-coral)",
};

export function FormationPage() {
  const { stats, nextStep, isAllComplete } = useFormationProgress();

  // Compteurs cross-niveaux pour le roadmap card
  const totalCompleted =
    stats.demarrer.completedCount +
    stats.construire.completedCount +
    stats.dupliquer.completedCount;
  const totalModules =
    stats.demarrer.totalCount +
    stats.construire.totalCount +
    stats.dupliquer.totalCount;

  return (
    <div className="space-y-6">
      <PageHeading
        eyebrow="Formation · ton parcours métier"
        title="Deviens un distributeur qui réussit"
        description="Du premier RDV jusqu'aux royalties — étape par étape, à ton rythme."
      />

      {/* Quick win #4 (2026-11-04) : Recherche texte libre modules + biblio */}
      <FormationSearchBar />

      {/* Quick win #1 (2026-11-04) : Streak Formation (jours consecutifs avec
          >= 1 module valide). Cache si 0 jours et jamais ping. */}
      <FormationStreakBadge />

      {/* Quick win #2 (2026-11-04) : Roadmap visuelle "Reprendre M1.X" en haut */}
      <FormationRoadmapCard
        nextStep={nextStep}
        isAllComplete={isAllComplete}
        totalCompleted={totalCompleted}
        totalModules={totalModules}
      />

      {/* Features #7 + #9 (2026-11-04) : 2 outils premium en row */}
      <div
        style={{
          display: "grid",
          gap: 12,
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
        }}
      >
      {/* Feature #7 (2026-11-04) : Lien vers le Strategy Plan Calculator */}
      <Link
        to="/formation/calculateur"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 14,
          padding: "16px 18px",
          background:
            "linear-gradient(135deg, color-mix(in srgb, var(--ls-gold) 10%, var(--ls-surface)) 0%, color-mix(in srgb, var(--ls-teal) 6%, var(--ls-surface)) 100%)",
          border: "0.5px solid color-mix(in srgb, var(--ls-gold) 32%, var(--ls-border))",
          borderRadius: 16,
          textDecoration: "none",
          color: "var(--ls-text)",
          fontFamily: "DM Sans, sans-serif",
          transition: "transform 200ms ease, box-shadow 200ms ease",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = "translateY(-2px)";
          e.currentTarget.style.boxShadow = "0 8px 22px -10px color-mix(in srgb, var(--ls-gold) 35%, transparent)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = "none";
          e.currentTarget.style.boxShadow = "none";
        }}
      >
        <div
          style={{
            width: 46,
            height: 46,
            borderRadius: 12,
            background: "linear-gradient(135deg, var(--ls-gold) 0%, color-mix(in srgb, var(--ls-gold) 70%, var(--ls-teal)) 100%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 22,
            boxShadow: "0 4px 14px color-mix(in srgb, var(--ls-gold) 35%, transparent)",
            flexShrink: 0,
          }}
        >
          📊
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: "var(--ls-gold)",
              marginBottom: 3,
            }}
          >
            ✦ Strategy Plan · Formule 5-3-1
          </div>
          <div
            style={{
              fontFamily: "Syne, serif",
              fontWeight: 700,
              fontSize: 16,
              color: "var(--ls-text)",
              letterSpacing: "-0.012em",
              lineHeight: 1.2,
            }}
          >
            Projecte tes 12 prochains mois en 30 secondes
          </div>
          <div
            style={{
              fontSize: 11.5,
              color: "var(--ls-text-muted)",
              marginTop: 3,
              lineHeight: 1.4,
            }}
          >
            Sliders revenus / clients / coachs → projection mois par mois + rangs débloqués + revenu cumulé.
          </div>
        </div>
        <span style={{ color: "var(--ls-gold)", fontSize: 18, flexShrink: 0 }}>→</span>
      </Link>

      {/* Feature #9 (2026-11-04) : Charte distributeur */}
      <Link
        to="/formation/charte"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 14,
          padding: "16px 18px",
          background:
            "linear-gradient(135deg, color-mix(in srgb, var(--ls-coral) 10%, var(--ls-surface)) 0%, color-mix(in srgb, var(--ls-purple) 6%, var(--ls-surface)) 100%)",
          border: "0.5px solid color-mix(in srgb, var(--ls-coral) 32%, var(--ls-border))",
          borderRadius: 16,
          textDecoration: "none",
          color: "var(--ls-text)",
          fontFamily: "DM Sans, sans-serif",
          transition: "transform 200ms ease, box-shadow 200ms ease",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = "translateY(-2px)";
          e.currentTarget.style.boxShadow = "0 8px 22px -10px color-mix(in srgb, var(--ls-coral) 35%, transparent)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = "none";
          e.currentTarget.style.boxShadow = "none";
        }}
      >
        <div
          style={{
            width: 46,
            height: 46,
            borderRadius: 12,
            background: "linear-gradient(135deg, var(--ls-coral) 0%, color-mix(in srgb, var(--ls-coral) 70%, var(--ls-purple)) 100%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 22,
            boxShadow: "0 4px 14px color-mix(in srgb, var(--ls-coral) 35%, transparent)",
            flexShrink: 0,
          }}
        >
          ✍️
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: "var(--ls-coral)",
              marginBottom: 3,
            }}
          >
            ✦ Engagement · Rituel
          </div>
          <div
            style={{
              fontFamily: "Syne, serif",
              fontWeight: 700,
              fontSize: 16,
              color: "var(--ls-text)",
              letterSpacing: "-0.012em",
              lineHeight: 1.2,
            }}
          >
            Signe ta charte de distributeur
          </div>
          <div
            style={{
              fontSize: 11.5,
              color: "var(--ls-text-muted)",
              marginTop: 3,
              lineHeight: 1.4,
            }}
          >
            5 engagements + ton pourquoi + objectif 12 mois. Imprime, signe, accroche.
          </div>
        </div>
        <span style={{ color: "var(--ls-coral)", fontSize: 18, flexShrink: 0 }}>→</span>
      </Link>
      </div>

      {/* ─── Zone 1 : Mon parcours guide ────────────────────────────── */}
      <section>
        <SectionHeader
          icon="✦"
          title="Mon parcours guidé"
          subtitle="3 niveaux pour passer du débutant au leader."
          accent="var(--ls-gold)"
        />

        <div
          style={{
            display: "grid",
            gap: 14,
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            marginTop: 12,
          }}
        >
          {FORMATION_LEVELS.map((level) => (
            <ParcoursLevelCard key={level.id} level={level} stats={stats[level.id]} />
          ))}
        </div>
      </section>

      {/* ─── Zone 2 : Bibliotheque par theme ────────────────────────── */}
      <section>
        <SectionHeader
          icon="📚"
          title="Bibliothèque par thème"
          subtitle="Pioche selon ton besoin du moment."
          accent="var(--ls-teal)"
        />

        <div
          style={{
            display: "grid",
            gap: 14,
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            marginTop: 12,
          }}
        >
          {FORMATION_CATEGORIES.map((cat) => {
            const accentVar = CATEGORY_ACCENT[cat.accent];
            const count = cat.resources.length;
            return (
              <Link
                key={cat.slug}
                to={`/formation/${cat.slug}`}
                style={{
                  display: "block",
                  padding: 18,
                  background: `linear-gradient(135deg, color-mix(in srgb, ${accentVar} 6%, var(--ls-surface)) 0%, var(--ls-surface) 100%)`,
                  border: `0.5px solid color-mix(in srgb, ${accentVar} 22%, var(--ls-border))`,
                  borderLeft: `3px solid ${accentVar}`,
                  borderRadius: 16,
                  textDecoration: "none",
                  color: "var(--ls-text)",
                  fontFamily: "DM Sans, sans-serif",
                  transition: "transform 0.18s ease, box-shadow 0.18s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-2px)";
                  e.currentTarget.style.boxShadow = `0 8px 22px -8px color-mix(in srgb, ${accentVar} 32%, transparent)`;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "none";
                  e.currentTarget.style.boxShadow = "none";
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
                  <div
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 12,
                      background: `color-mix(in srgb, ${accentVar} 18%, transparent)`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 22,
                      flexShrink: 0,
                    }}
                  >
                    {cat.emoji}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h3
                      style={{
                        fontFamily: "Syne, serif",
                        fontSize: 16,
                        fontWeight: 700,
                        margin: 0,
                        color: "var(--ls-text)",
                        letterSpacing: "-0.01em",
                      }}
                    >
                      {cat.title}
                    </h3>
                    <div
                      style={{
                        fontSize: 11,
                        color: accentVar,
                        fontWeight: 600,
                        marginTop: 2,
                      }}
                    >
                      {count === 0 ? "Bientôt disponible" : `${count} ressource${count > 1 ? "s" : ""}`}
                    </div>
                  </div>
                  <span style={{ color: "var(--ls-text-muted)", fontSize: 18, flexShrink: 0 }}>→</span>
                </div>
                <p
                  style={{
                    fontSize: 12.5,
                    color: "var(--ls-text-muted)",
                    lineHeight: 1.55,
                    margin: 0,
                  }}
                >
                  {cat.description}
                </p>
              </Link>
            );
          })}
        </div>
      </section>

      {/* ─── Note finale "contenu arrive bientot" ───────────────────── */}
      <div
        style={{
          padding: "14px 16px",
          background: "color-mix(in srgb, var(--ls-gold) 6%, var(--ls-surface))",
          border: "0.5px dashed color-mix(in srgb, var(--ls-gold) 30%, transparent)",
          borderRadius: 12,
          fontSize: 12.5,
          color: "var(--ls-text-muted)",
          lineHeight: 1.55,
          fontFamily: "DM Sans, sans-serif",
        }}
      >
        💡 <strong style={{ color: "var(--ls-gold)" }}>Le contenu arrive bientôt.</strong>{" "}
        Thomas finalise les modules de formation en ce moment. Tu pourras
        débloquer le Niveau 1 dans quelques jours. En attendant, profite-en
        pour bosser ta routine matin.
      </div>
    </div>
  );
}

// ─── SectionHeader (interne) ─────────────────────────────────────────────

function SectionHeader({
  icon,
  title,
  subtitle,
  accent,
}: {
  icon: string;
  title: string;
  subtitle: string;
  accent: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        paddingBottom: 8,
        borderBottom: `1px solid color-mix(in srgb, ${accent} 18%, transparent)`,
      }}
    >
      <span style={{ fontSize: 18, color: accent }} aria-hidden="true">
        {icon}
      </span>
      <div style={{ flex: 1 }}>
        <h2
          style={{
            fontFamily: "Syne, serif",
            fontSize: 17,
            fontWeight: 800,
            margin: 0,
            color: "var(--ls-text)",
            letterSpacing: "-0.01em",
          }}
        >
          {title}
        </h2>
        <p
          style={{
            fontSize: 12,
            color: "var(--ls-text-muted)",
            margin: "2px 0 0",
            fontFamily: "DM Sans, sans-serif",
          }}
        >
          {subtitle}
        </p>
      </div>
    </div>
  );
}
