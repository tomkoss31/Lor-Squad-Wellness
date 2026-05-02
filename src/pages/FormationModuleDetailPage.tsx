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
import { ReviewThreadPanel } from "../components/formation/ReviewThreadPanel";
import { useAppContext } from "../context/AppContext";

const ACCENT_TOKEN: Record<FormationLevelAccent, string> = {
  gold: "var(--ls-gold)",
  teal: "var(--ls-teal)",
  purple: "var(--ls-purple)",
};

export function FormationModuleDetailPage() {
  const { levelSlug, moduleSlug } = useParams<{ levelSlug: string; moduleSlug: string }>();
  const navigate = useNavigate();
  const { getByModuleId, reload: reloadProgress, loading: progressLoading } = useMyFormationProgress();
  const { users } = useAppContext();
  const [mode, setMode] = useState<"lecture" | "quiz">("lecture");
  const [initLoading, setInitLoading] = useState(true);

  const level = levelSlug ? getFormationLevelBySlug(levelSlug) : undefined;
  const module = level?.modules.find((m) => m.slug === moduleSlug);

  // Au mount, cree la row in_progress si pas existante
  useEffect(() => {
    if (!module) {
      setInitLoading(false);
      return;
    }
    let cancelled = false;
    setInitLoading(true);
    void (async () => {
      try {
        await fetchOrCreateModuleProgress(module.id);
        if (!cancelled) void reloadProgress();
      } catch (err) {
        console.warn("[FormationModuleDetailPage] init progress failed:", err);
      } finally {
        if (!cancelled) setInitLoading(false);
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

  // Skeleton loader pendant le fetch initial de la progression
  if (initLoading || progressLoading) {
    return (
      <div className="space-y-5">
        <style>{`
          @keyframes ls-skeleton-pulse {
            0%, 100% { opacity: 0.55; }
            50%      { opacity: 0.85; }
          }
          @media (prefers-reduced-motion: reduce) {
            .ls-skeleton { animation: none !important; }
          }
        `}</style>
        {/* Breadcrumb skeleton */}
        <div
          className="ls-skeleton"
          style={{
            width: 180, height: 22, borderRadius: 8,
            background: "var(--ls-surface2)",
            animation: "ls-skeleton-pulse 1.4s ease-in-out infinite",
          }}
        />
        {/* Hero skeleton */}
        <div
          className="ls-skeleton"
          style={{
            height: 220, borderRadius: 18,
            background: "linear-gradient(135deg, color-mix(in srgb, var(--ls-gold) 6%, var(--ls-surface)) 0%, var(--ls-surface) 70%)",
            border: "0.5px solid var(--ls-border)",
            animation: "ls-skeleton-pulse 1.4s ease-in-out infinite",
          }}
        />
        {/* Lessons skeleton */}
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="ls-skeleton"
            style={{
              height: 140, borderRadius: 14,
              background: "var(--ls-surface)",
              border: "0.5px solid var(--ls-border)",
              animation: `ls-skeleton-pulse 1.4s ease-in-out ${i * 0.15}s infinite`,
            }}
          />
        ))}
      </div>
    );
  }

  const accentVar = ACCENT_TOKEN[level.accent];
  const progressRow = getByModuleId(module.id);
  const status = progressRow?.status;
  const sponsorId = progressRow?.reviewed_by ?? null;
  const sponsorName = sponsorId ? users?.find((u) => u.id === sponsorId)?.name ?? null : null;
  const showFeedbackBanner = (status === "rejected" || status === "pending_review_sponsor") && progressRow?.feedback;
  const isValidated = status === "validated";
  const showThread = !!progressRow && (status === "rejected" || status === "validated" || status === "pending_review_sponsor" || status === "pending_review_admin");

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

      {/* Banner feedback sponsor (si rejected ou pending avec feedback) */}
      {showFeedbackBanner && progressRow ? (
        <div
          style={{
            padding: "14px 16px",
            background:
              status === "rejected"
                ? "color-mix(in srgb, var(--ls-coral) 8%, var(--ls-surface))"
                : "color-mix(in srgb, var(--ls-gold) 8%, var(--ls-surface))",
            border:
              status === "rejected"
                ? "0.5px solid color-mix(in srgb, var(--ls-coral) 30%, transparent)"
                : "0.5px solid color-mix(in srgb, var(--ls-gold) 30%, transparent)",
            borderLeft:
              status === "rejected"
                ? "3px solid var(--ls-coral)"
                : "3px solid var(--ls-gold)",
            borderRadius: 14,
            fontFamily: "DM Sans, sans-serif",
            display: "flex",
            gap: 12,
          }}
        >
          <span style={{ fontSize: 22, flexShrink: 0 }} aria-hidden="true">
            {status === "rejected" ? "🔄" : "💬"}
          </span>
          <div style={{ flex: 1 }}>
            <div
              style={{
                fontSize: 9.5,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                fontWeight: 700,
                color: status === "rejected" ? "var(--ls-coral)" : "var(--ls-gold)",
                marginBottom: 4,
              }}
            >
              {status === "rejected"
                ? `Feedback ${sponsorName ?? "sponsor"} — refais le module`
                : `Demande ${sponsorName ?? "sponsor"} en attente`}
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
              « {progressRow.feedback} »
            </p>
            {status === "rejected" ? (
              <div style={{ fontSize: 11.5, color: "var(--ls-text-muted)", marginTop: 6 }}>
                💡 Tu peux refaire le module avec ce feedback. Les modules sont refaisables à l'infini.
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      {/* Banner validated */}
      {isValidated && progressRow ? (
        <div
          style={{
            padding: "14px 16px",
            background: "color-mix(in srgb, var(--ls-teal) 8%, var(--ls-surface))",
            border: "0.5px solid color-mix(in srgb, var(--ls-teal) 30%, transparent)",
            borderLeft: "3px solid var(--ls-teal)",
            borderRadius: 14,
            fontFamily: "DM Sans, sans-serif",
            display: "flex",
            gap: 12,
          }}
        >
          <span style={{ fontSize: 22, flexShrink: 0 }} aria-hidden="true">✅</span>
          <div style={{ flex: 1 }}>
            <div
              style={{
                fontSize: 9.5,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                fontWeight: 700,
                color: "var(--ls-teal)",
                marginBottom: 4,
              }}
            >
              Module validé
              {progressRow.validation_path === "auto" ? " · auto 100%" : null}
              {progressRow.validation_path === "sponsor" && sponsorName
                ? ` · par ${sponsorName}`
                : null}
              {progressRow.validation_path === "admin_relay" ? " · admin relay" : null}
            </div>
            <div style={{ fontSize: 12, color: "var(--ls-text-muted)" }}>
              Tu peux toujours revisiter ce module ou le refaire pour ancrer.
            </div>
          </div>
        </div>
      ) : null}

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

      {/* Thread historique de la progression (si soumise) */}
      {showThread && progressRow ? (
        <details
          style={{
            background: "var(--ls-surface)",
            border: "0.5px solid var(--ls-border)",
            borderRadius: 14,
            padding: "12px 16px",
            fontFamily: "DM Sans, sans-serif",
          }}
        >
          <summary
            style={{
              cursor: "pointer",
              fontSize: 13,
              fontWeight: 600,
              color: "var(--ls-text)",
              fontFamily: "Syne, serif",
              listStyle: "none",
              outline: "none",
            }}
          >
            💬 Historique de discussion
          </summary>
          <div style={{ marginTop: 12 }}>
            <ReviewThreadPanel progressId={progressRow.id} />
          </div>
        </details>
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
