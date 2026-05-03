// =============================================================================
// FormationPage — accueil Formation (refonte 2026-11-04, "newcomer-first")
//
// Architecture pensee pour un nouveau distri qui debarque :
//   1. PageHeading
//   2. Recherche (compacte)
//   3. Streak Formation (si actif)
//   4. Roadmap "Reprendre M1.X" — call to action #1
//   5. Section "Ton parcours guide" — 3 cards niveaux (HERO)
//   6. Section "Tes outils du quotidien" — Boite a outils (large) +
//      Calculateur + Charte regroupes
//   7. Note "contenu arrive bientot"
//   8. Glossaire footer
//
// Suppressions vs version precedente :
//   - "Bibliotheque par theme" (redondante avec Boite a outils)
//   - Routes /formation/:slug (FormationCategoryPage devient orpheline)
//
// Theme-aware via var(--ls-*).
// =============================================================================

import { Link } from "react-router-dom";
import { PageHeading } from "../components/ui/PageHeading";
import { ParcoursLevelCard } from "../components/formation/ParcoursLevelCard";
import { FormationRoadmapCard } from "../components/formation/FormationRoadmapCard";
import { FormationStreakBadge } from "../components/formation/FormationStreakBadge";
import { FormationSearchBar } from "../components/formation/FormationSearchBar";
import { FORMATION_LEVELS } from "../data/formation";
import { useFormationProgress } from "../hooks/useFormationProgress";

// Stages dynamiques bases sur la progression reelle (2026-11-04)
// Pas de toggle manuel : la formation est sequentielle (N1 verrouille N2,
// N2 verrouille N3), donc l etat de progression est la vraie source de
// verite pour adapter le discours.
type FormationStage = "decouverte" | "en-cours" | "leader" | "complete";

interface StageWording {
  eyebrow: string;
  title: string;
  description: string;
}

const STAGE_WORDING: Record<FormationStage, StageWording> = {
  decouverte: {
    eyebrow: "Formation · découvre l'aventure",
    title: "Bienvenue dans Lor'Squad",
    description:
      "Tu débutes ? On y va à ton rythme. 1 étape à la fois — découvre Herbalife, l'app, et ton métier de coach bien-être.",
  },
  "en-cours": {
    eyebrow: "Formation · ton parcours en cours",
    title: "Continue sur ta lancée",
    description:
      "Tu progresses bien. Reprends là où tu t'es arrêté·e — chaque module te rapproche du palier suivant.",
  },
  leader: {
    eyebrow: "Formation · mode leader",
    title: "Tes outils de leader",
    description:
      "Tu connais le terrain. On accélère : duplique, coache ton équipe, vise GET et au-delà.",
  },
  complete: {
    eyebrow: "Formation · parcours complet",
    title: "Tu as tout validé. Bravo.",
    description:
      "Reviens piocher dans la boîte à outils quand tu as besoin d'un script ou d'une fiche. Tu peux aussi refaire un module à tout moment.",
  },
};

export function FormationPage() {
  const { stats, nextStep, isAllComplete } = useFormationProgress();

  const totalCompleted =
    stats.demarrer.completedCount + stats.construire.completedCount + stats.dupliquer.completedCount;
  const totalModules =
    stats.demarrer.totalCount + stats.construire.totalCount + stats.dupliquer.totalCount;

  // Determine le stage selon progression reelle
  const stage: FormationStage = (() => {
    if (isAllComplete) return "complete";
    // Leader = N3 entame OU N2 valide a 100%
    if (stats.dupliquer.hasStarted || stats.construire.isComplete) return "leader";
    // En cours = au moins 1 module valide quelque part
    if (totalCompleted > 0 || stats.demarrer.hasStarted) return "en-cours";
    // Sinon : decouverte (0 module touche)
    return "decouverte";
  })();

  const heading = STAGE_WORDING[stage];

  return (
    <div className="space-y-6">
      <PageHeading
        eyebrow={heading.eyebrow}
        title={heading.title}
        description={heading.description}
      />

      {/* Recherche transversale — modules + biblio */}
      <FormationSearchBar />

      {/* Streak Formation (cache si 0 jour) */}
      <FormationStreakBadge />

      {/* Roadmap "Reprendre M1.X" ou "Démarrer" */}
      <FormationRoadmapCard
        nextStep={nextStep}
        isAllComplete={isAllComplete}
        totalCompleted={totalCompleted}
        totalModules={totalModules}
      />

      {/* ─── SECTION 1 : Ton parcours guidé ─────────────────────────── */}
      <section>
        <SectionHeader
          icon="✦"
          title="Ton parcours guidé"
          subtitle="3 niveaux · théorie + quiz + validation par ton sponsor."
          accent="var(--ls-gold)"
        />
        <div
          style={{
            display: "grid",
            gap: 14,
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            marginTop: 14,
          }}
        >
          {FORMATION_LEVELS.map((level) => (
            <ParcoursLevelCard key={level.id} level={level} stats={stats[level.id]} />
          ))}
        </div>
      </section>

      {/* ─── SECTION 2 : Tes outils du quotidien ────────────────────── */}
      <section>
        <SectionHeader
          icon="🛠️"
          title="Tes outils du quotidien"
          subtitle="Scripts, fiches, calculateur. Tout ce qu'il te faut pour passer à l'acte."
          accent="var(--ls-teal)"
        />

        {/* Boîte à outils — card large dominante */}
        <Link
          to="/formation/boite-a-outils"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            padding: "20px 22px",
            marginTop: 14,
            background:
              "linear-gradient(135deg, color-mix(in srgb, var(--ls-gold) 12%, var(--ls-surface)) 0%, color-mix(in srgb, var(--ls-teal) 8%, var(--ls-surface)) 50%, color-mix(in srgb, var(--ls-purple) 6%, var(--ls-surface)) 100%)",
            border: "0.5px solid color-mix(in srgb, var(--ls-gold) 32%, var(--ls-border))",
            borderRadius: 18,
            textDecoration: "none",
            color: "var(--ls-text)",
            fontFamily: "DM Sans, sans-serif",
            boxShadow: "0 6px 22px -12px color-mix(in srgb, var(--ls-gold) 30%, transparent)",
            transition: "transform 240ms cubic-bezier(0.4, 0, 0.2, 1), box-shadow 240ms ease",
            position: "relative",
            overflow: "hidden",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = "translateY(-2px)";
            e.currentTarget.style.boxShadow =
              "0 12px 30px -12px color-mix(in srgb, var(--ls-gold) 45%, transparent)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "none";
            e.currentTarget.style.boxShadow =
              "0 6px 22px -12px color-mix(in srgb, var(--ls-gold) 30%, transparent)";
          }}
        >
          <div
            aria-hidden="true"
            style={{
              position: "absolute",
              top: -40,
              right: -40,
              width: 160,
              height: 160,
              borderRadius: "50%",
              background: "color-mix(in srgb, var(--ls-gold) 18%, transparent)",
              filter: "blur(56px)",
              pointerEvents: "none",
            }}
          />
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 16,
              background: "linear-gradient(135deg, var(--ls-gold) 0%, var(--ls-teal) 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 28,
              boxShadow:
                "0 4px 14px color-mix(in srgb, var(--ls-gold) 35%, transparent), inset 0 1px 0 rgba(255,255,255,0.40)",
              flexShrink: 0,
              position: "relative",
            }}
          >
            🛠️
          </div>
          <div style={{ flex: 1, minWidth: 0, position: "relative" }}>
            <div
              style={{
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                color: "var(--ls-gold)",
                marginBottom: 4,
              }}
            >
              ✦ Pièce maîtresse · 16 outils
            </div>
            <div
              style={{
                fontFamily: "Syne, serif",
                fontWeight: 800,
                fontSize: "clamp(16px, 2vw, 19px)",
                color: "var(--ls-text)",
                letterSpacing: "-0.018em",
                lineHeight: 1.2,
                marginBottom: 4,
              }}
            >
              Boîte à outils Lor&apos;Squad
            </div>
            <div
              style={{
                fontSize: 12.5,
                color: "var(--ls-text-muted)",
                lineHeight: 1.5,
              }}
            >
              Scripts d&apos;invitation, méthode FRANK, Visio à 3, templates de suivi, objections…
              16 outils prêts à copier-coller pour passer à l&apos;acte.
            </div>
          </div>
          <span style={{ color: "var(--ls-gold)", fontSize: 22, flexShrink: 0, position: "relative" }}>
            →
          </span>
        </Link>

        {/* 2 outils secondaires en row */}
        <div
          style={{
            display: "grid",
            gap: 12,
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            marginTop: 12,
          }}
        >
          <SecondaryToolCard
            to="/formation/calculateur"
            emoji="📊"
            eyebrow="Projection"
            title="Calculateur Strategy Plan"
            description="Sliders revenus / clients / coachs. Visualise tes 12 prochains mois en 30 secondes."
            accent="var(--ls-teal)"
          />
          <SecondaryToolCard
            to="/formation/charte"
            emoji="✍️"
            eyebrow="Engagement"
            title="Charte du distributeur"
            description="5 engagements + ton pourquoi + objectif 12 mois. À signer, imprimer, accrocher."
            accent="var(--ls-coral)"
          />
        </div>
      </section>

      {/* Note "contenu arrive bientôt" */}
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
        💡 <strong style={{ color: "var(--ls-gold)" }}>Le contenu arrive bientôt.</strong> Thomas
        finalise les modules de formation. La boîte à outils est déjà 100% utilisable. Pour les
        modules N1/N2/N3, encore quelques jours de patience.
      </div>

      {/* Footer : glossaire */}
      <Link
        to="/formation/glossaire"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          padding: "12px 16px",
          background: "var(--ls-surface)",
          border: "0.5px dashed color-mix(in srgb, var(--ls-purple) 30%, var(--ls-border))",
          borderRadius: 12,
          textDecoration: "none",
          color: "var(--ls-purple)",
          fontFamily: "DM Sans, sans-serif",
          fontSize: 12.5,
          fontWeight: 600,
          transition: "all 200ms ease",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background =
            "color-mix(in srgb, var(--ls-purple) 6%, var(--ls-surface))";
          e.currentTarget.style.borderStyle = "solid";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "var(--ls-surface)";
          e.currentTarget.style.borderStyle = "dashed";
        }}
      >
        📖 Tu butes sur un terme ? Consulte le glossaire (VP, RO, DMO, Sup…) →
      </Link>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────

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
        alignItems: "flex-end",
        justifyContent: "space-between",
        gap: 12,
        paddingBottom: 12,
        borderBottom: `0.5px solid color-mix(in srgb, ${accent} 22%, var(--ls-border))`,
        flexWrap: "wrap",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, minWidth: 0 }}>
        <span style={{ fontSize: 20 }} aria-hidden="true">
          {icon}
        </span>
        <div>
          <h2
            style={{
              fontFamily: "Syne, serif",
              fontWeight: 700,
              fontSize: 18,
              letterSpacing: "-0.012em",
              color: "var(--ls-text)",
              margin: 0,
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
              lineHeight: 1.4,
            }}
          >
            {subtitle}
          </p>
        </div>
      </div>
    </div>
  );
}

function SecondaryToolCard({
  to,
  emoji,
  eyebrow,
  title,
  description,
  accent,
}: {
  to: string;
  emoji: string;
  eyebrow: string;
  title: string;
  description: string;
  accent: string;
}) {
  return (
    <Link
      to={to}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 14,
        padding: "16px 18px",
        background: `linear-gradient(135deg, color-mix(in srgb, ${accent} 8%, var(--ls-surface)) 0%, var(--ls-surface) 100%)`,
        border: `0.5px solid color-mix(in srgb, ${accent} 28%, var(--ls-border))`,
        borderRadius: 16,
        textDecoration: "none",
        color: "var(--ls-text)",
        fontFamily: "DM Sans, sans-serif",
        transition: "transform 200ms ease, box-shadow 200ms ease",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-2px)";
        e.currentTarget.style.boxShadow = `0 8px 22px -10px color-mix(in srgb, ${accent} 35%, transparent)`;
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
          background: `linear-gradient(135deg, ${accent} 0%, color-mix(in srgb, ${accent} 70%, var(--ls-bg)) 100%)`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 22,
          boxShadow: `0 4px 14px color-mix(in srgb, ${accent} 35%, transparent)`,
          flexShrink: 0,
        }}
        aria-hidden="true"
      >
        {emoji}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: accent,
            marginBottom: 3,
          }}
        >
          ✦ {eyebrow}
        </div>
        <div
          style={{
            fontFamily: "Syne, serif",
            fontWeight: 700,
            fontSize: 15,
            color: "var(--ls-text)",
            letterSpacing: "-0.012em",
            lineHeight: 1.2,
            marginBottom: 3,
          }}
        >
          {title}
        </div>
        <div
          style={{
            fontSize: 11.5,
            color: "var(--ls-text-muted)",
            lineHeight: 1.4,
          }}
        >
          {description}
        </div>
      </div>
      <span style={{ color: accent, fontSize: 18, flexShrink: 0 }}>→</span>
    </Link>
  );
}
