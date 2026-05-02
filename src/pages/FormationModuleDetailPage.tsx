// =============================================================================
// FormationModuleDetailPage — page detail d un module Formation (Phase F-UI)
//
// Route /formation/parcours/:levelSlug/:moduleSlug.
//
// 2 modes :
//   - "lecture" (par defaut) : header + lecons + ancrage + action +
//     bouton "Faire le quiz"
//   - "quiz" : QuizRunner inline (au-dessus des lecons pour focus)
//
// Au mount, fetch ou cree la progression (status='in_progress').
// =============================================================================

import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { EmptyState } from "../components/ui/EmptyState";
import {
  getFormationLevelBySlug,
  type FormationLevelAccent,
} from "../data/formation";
import {
  fetchOrCreateModuleProgress,
  useMyFormationProgress,
} from "../features/formation";
import { ModuleHeaderHero } from "../components/formation/ModuleHeaderHero";
import { LessonCard } from "../components/formation/LessonCard";
import { AncrageActionPanel } from "../components/formation/AncrageActionPanel";
import { QuizRunner } from "../components/formation/QuizRunner";

const ACCENT_TOKEN: Record<FormationLevelAccent, string> = {
  gold: "var(--ls-gold)",
  teal: "var(--ls-teal)",
  purple: "var(--ls-purple)",
};

export function FormationModuleDetailPage() {
  const { levelSlug, moduleSlug } = useParams<{ levelSlug: string; moduleSlug: string }>();
  const navigate = useNavigate();
  const { getByModuleId, reload: reloadProgress } = useMyFormationProgress();
  const [mode, setMode] = useState<"lecture" | "quiz">("lecture");

  const level = levelSlug ? getFormationLevelBySlug(levelSlug) : undefined;
  const module = level?.modules.find((m) => m.slug === moduleSlug);

  // Au mount, cree la row in_progress si pas existante
  useEffect(() => {
    if (!module) return;
    let cancelled = false;
    void (async () => {
      try {
        await fetchOrCreateModuleProgress(module.id);
        if (!cancelled) void reloadProgress();
      } catch (err) {
        console.warn("[FormationModuleDetailPage] init progress failed:", err);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [module?.id]);

  if (!level || !module) {
    return (
      <div className="space-y-4" style={{ padding: 20 }}>
        <EmptyState
          emoji="🤔"
          title="Module introuvable"
          description="Ce module n'existe pas ou a été déplacé."
          ctaLabel="Retour à la formation"
          ctaHref="/formation"
        />
      </div>
    );
  }

  const accentVar = ACCENT_TOKEN[level.accent];
  const progressRow = getByModuleId(module.id);
  const status = progressRow?.status;

  return (
    <div className="space-y-5">
      {/* Breadcrumb */}
      <button
        type="button"
        onClick={() => navigate(`/formation/parcours/${level.slug}`)}
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
        ← Retour Niveau {level.order} {level.title}
      </button>

      {/* Header hero */}
      <ModuleHeaderHero
        module={module}
        status={status}
        levelTitle={level.title}
        levelOrder={level.order}
        levelAccent={accentVar}
      />

      <style>{`
        @keyframes ls-formation-fade-in {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @media (prefers-reduced-motion: reduce) {
          .ls-formation-mode-section { animation: none !important; }
        }
      `}</style>

      {/* Mode quiz : QuizRunner au-dessus des lecons */}
      {mode === "quiz" ? (
        <section
          key="quiz"
          className="ls-formation-mode-section"
          style={{ animation: "ls-formation-fade-in 0.32s cubic-bezier(0.16,1,0.3,1)" }}
        >
          <QuizRunner
            module={module}
            levelSlug={level.slug}
            onSubmitDone={() => void reloadProgress()}
          />
        </section>
      ) : null}

      {/* Lecons */}
      {mode === "lecture" ? (
        <section
          key="lecture"
          className="ls-formation-mode-section"
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 12,
            animation: "ls-formation-fade-in 0.32s cubic-bezier(0.16,1,0.3,1)",
          }}
        >
          {module.lessons.map((lesson, idx) => (
            <LessonCard key={lesson.id} lesson={lesson} index={idx} />
          ))}
        </section>
      ) : null}

      {/* Ancrage + action */}
      {mode === "lecture" ? (
        <AncrageActionPanel ancrage={module.ancrage} action={module.action} />
      ) : null}

      {/* CTA quiz (bas de page lecture) — safe-area pour iOS PWA */}
      {mode === "lecture" && module.quiz ? (
        <div
          style={{
            position: "sticky",
            bottom: "max(16px, env(safe-area-inset-bottom, 16px))",
            display: "flex",
            justifyContent: "center",
            zIndex: 5,
            paddingInline: 8,
          }}
        >
          <button
            type="button"
            onClick={() => {
              setMode("quiz");
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
            style={{
              padding: "14px 28px",
              borderRadius: 999,
              border: "none",
              background: `linear-gradient(135deg, ${accentVar} 0%, color-mix(in srgb, ${accentVar} 70%, #000) 100%)`,
              color: "white",
              fontFamily: "Syne, serif",
              fontWeight: 800,
              fontSize: 15,
              cursor: "pointer",
              boxShadow: `0 10px 24px -6px color-mix(in srgb, ${accentVar} 50%, transparent)`,
              letterSpacing: "0.01em",
              transition: "transform 0.18s, filter 0.18s",
              maxWidth: "100%",
              textAlign: "center",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-2px)";
              e.currentTarget.style.filter = "brightness(1.06)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "none";
              e.currentTarget.style.filter = "none";
            }}
          >
            ✅ Faire le quiz du module ({module.quiz.questions.length} question{module.quiz.questions.length > 1 ? "s" : ""})
          </button>
        </div>
      ) : null}

      {/* Toggle retour mode lecture quand on est en quiz */}
      {mode === "quiz" ? (
        <div style={{ display: "flex", justifyContent: "center" }}>
          <button
            type="button"
            onClick={() => setMode("lecture")}
            style={{
              padding: "8px 16px",
              borderRadius: 999,
              border: "0.5px solid var(--ls-border)",
              background: "transparent",
              color: "var(--ls-text-muted)",
              fontFamily: "DM Sans, sans-serif",
              fontSize: 12,
              cursor: "pointer",
            }}
          >
            ← Revoir les leçons
          </button>
        </div>
      ) : null}

      {/* Lien autres modules niveau */}
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
          Autres modules N{level.order}
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {level.modules
            .filter((m) => m.slug !== moduleSlug)
            .map((m) => (
              <Link
                key={m.id}
                to={`/formation/parcours/${level.slug}/${m.slug}`}
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
                {m.icon} M{m.number} — {m.title}
              </Link>
            ))}
        </div>
      </div>
    </div>
  );
}
