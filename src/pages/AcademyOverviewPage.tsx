// Chantier Academy Phase 1 (2026-04-26).
// Page d accueil de Lor'Squad Academy. Mockup A valide visuellement par
// Thomas. Couleurs hardcodees palette Lor'Squad. Le contenu interactif
// par section arrive en Phase 2.

import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAcademyProgress } from "../features/academy/hooks/useAcademyProgress";
import { ACADEMY_SECTIONS, type AcademySection } from "../features/academy/sections";
import { ConfettiBurst } from "../features/academy/components/ConfettiBurst";
import { AcademyTimeline } from "../features/academy/components/AcademyTimeline";
import { useAcademyTeamStats } from "../features/academy/hooks/useAcademyTeamStats";
import { AcademyBadges } from "../features/academy/components/AcademyBadges";

export function AcademyOverviewPage() {
  const { view, goToSection, restartSection } = useAcademyProgress();
  const teamStats = useAcademyTeamStats();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const justCompletedId = searchParams.get("completed");
  const [confettiActive, setConfettiActive] = useState(false);
  const [pulseSectionId, setPulseSectionId] = useState<string | null>(null);

  // Polish ludique (2026-04-27) : retour de section terminee → pulse
  // vert sur la row + confetti fullscreen si Academy 100% completee.
  useEffect(() => {
    if (!justCompletedId || !view.loaded) return;
    setPulseSectionId(justCompletedId);
    if (view.isCompleted) {
      setConfettiActive(true);
    }
    // Cleanup query param sans push history
    const next = new URLSearchParams(searchParams);
    next.delete("completed");
    setSearchParams(next, { replace: true });
    // Pulse termine apres 1500ms
    const t = window.setTimeout(() => setPulseSectionId(null), 1500);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [justCompletedId, view.loaded, view.isCompleted]);

  if (!view.loaded) {
    return (
      <div
        style={{
          padding: 40,
          textAlign: "center",
          color: "#6B6B62",
          fontFamily: "var(--ls-font-sans, system-ui, sans-serif)",
        }}
      >
        Chargement de ta progression…
      </div>
    );
  }

  const ringRadius = 36;
  const ringCircumference = 2 * Math.PI * ringRadius;
  const ringDashoffset = ringCircumference * (1 - view.percentComplete / 100);

  return (
    <div
      style={{
        maxWidth: 880,
        margin: "0 auto",
        padding: "32px 24px",
        fontFamily: "var(--ls-font-sans, system-ui, sans-serif)",
      }}
    >
      {/* Bandeau motivation social (Polish K 2026-04-28) */}
      {teamStats.loaded ? <MotivationBanner stats={teamStats} viewIsCompleted={view.isCompleted} /> : null}

      <div
        style={{
          background: "#FAF6E8",
          borderRadius: 16,
          padding: 28,
          border: "0.5px solid #E5DFCF",
        }}
      >
        {/* Hero */}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            gap: 24,
            marginBottom: 28,
            paddingBottom: 24,
            borderBottom: "0.5px solid #E5DFCF",
          }}
        >
          <svg width="92" height="92" viewBox="0 0 84 84" style={{ flexShrink: 0 }}>
            <circle cx="42" cy="42" r={ringRadius} fill="none" stroke="#E5DFCF" strokeWidth="6" />
            <circle
              cx="42"
              cy="42"
              r={ringRadius}
              fill="none"
              stroke="#B8922A"
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={ringCircumference}
              strokeDashoffset={ringDashoffset}
              transform="rotate(-90 42 42)"
              style={{ transition: "stroke-dashoffset 800ms cubic-bezier(0.4, 0, 0.2, 1)" }}
            />
            <text
              x="42"
              y="48"
              textAnchor="middle"
              fontFamily="var(--ls-font-serif, Georgia, serif)"
              fontSize="20"
              fontWeight="500"
              fill="#5C4A0F"
            >
              {view.percentComplete}%
            </text>
          </svg>
          <div style={{ flex: 1, minWidth: 220 }}>
            <h1
              style={{
                fontFamily: "var(--ls-font-serif, Georgia, serif)",
                fontSize: 26,
                fontWeight: 500,
                margin: "0 0 6px 0",
                color: "#2C2C2A",
              }}
            >
              Lor&apos;Squad Academy
            </h1>
            <p style={{ fontSize: 14, color: "#6B6B62", margin: "0 0 14px 0" }}>
              {renderHeroSubtitle(view)}
            </p>
            {!view.isCompleted ? (
              <button
                type="button"
                onClick={() => goToSection(view.currentSection.id)}
                style={{
                  background: "#B8922A",
                  color: "white",
                  border: "none",
                  padding: "10px 20px",
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: 500,
                  cursor: "pointer",
                }}
              >
                {view.hasStarted ? "Reprendre la formation" : "Démarrer la formation"}
              </button>
            ) : (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    fontSize: 13,
                    color: "#1D9E75",
                    fontWeight: 500,
                  }}
                >
                  ✓ Formation terminée
                </span>
                <button
                  type="button"
                  onClick={() => navigate("/academy/certificat")}
                  style={{
                    background: "linear-gradient(135deg, #EF9F27 0%, #BA7517 100%)",
                    color: "white",
                    border: "none",
                    padding: "8px 16px",
                    borderRadius: 8,
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: "pointer",
                    fontFamily: "DM Sans, sans-serif",
                    boxShadow: "0 2px 6px rgba(186,117,23,0.25)",
                  }}
                >
                  📜 Voir mon certificat
                </button>
              </div>
            )}
          </div>
        </div>

        {/* CTA Mode pratique — sandbox interactif (2026-04-29 v2) */}
        <button
          type="button"
          onClick={() => navigate("/academy/sandbox")}
          style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            gap: 14,
            padding: "16px 18px",
            marginBottom: 18,
            background: "linear-gradient(135deg, #FFF5C4 0%, #F5E0A0 100%)",
            border: "0.5px solid #C9A84C",
            borderRadius: 14,
            cursor: "pointer",
            textAlign: "left",
            fontFamily: "inherit",
            transition: "transform 160ms ease, box-shadow 160ms ease",
            boxShadow: "0 4px 14px rgba(184,146,42,0.18)",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = "translateY(-2px)";
            e.currentTarget.style.boxShadow = "0 8px 22px rgba(184,146,42,0.28)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "translateY(0)";
            e.currentTarget.style.boxShadow = "0 4px 14px rgba(184,146,42,0.18)";
          }}
        >
          <span style={{ fontSize: 32, flexShrink: 0 }}>🎮</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontFamily: "var(--ls-font-serif, Georgia, serif)",
                fontSize: 16,
                fontWeight: 600,
                color: "#5C4A0F",
                marginBottom: 2,
              }}
            >
              Mode pratique — Bilan d&apos;essai
            </div>
            <div style={{ fontSize: 12, color: "#6B6B62", lineHeight: 1.4 }}>
              Simule un bilan complet en 2 min · sans toucher à la base · pour
              ressentir le flow avant ton premier vrai RDV.
            </div>
          </div>
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: 0.5,
              padding: "5px 10px",
              borderRadius: 6,
              background: "#B8922A",
              color: "white",
              flexShrink: 0,
            }}
          >
            LANCER →
          </span>
        </button>

        {/* Badges progression (Direction 5 — 2026-04-28) */}
        <AcademyBadges
          completedCount={view.completedCount}
          isCompleted={view.isCompleted}
        />

        {/* Timeline horizontale (Polish D 2026-04-28) */}
        <AcademyTimeline
          completedCount={view.completedCount}
          currentSectionIndex={view.currentSectionIndex}
          isCompleted={view.isCompleted}
          onSectionClick={(sectionId) => {
            // Si la section a deja ete faite, on relance (restart + go).
            // Sinon on y va direct.
            const idx = ACADEMY_SECTIONS.findIndex((s) => s.id === sectionId);
            if (idx < view.completedCount) {
              restartSection(sectionId);
            }
            goToSection(sectionId);
          }}
        />

        {/* Sections list */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {ACADEMY_SECTIONS.map((section, idx) => {
            const isDone = idx < view.completedCount;
            const isCurrent = !view.isCompleted && idx === view.currentSectionIndex;

            return (
              <SectionRow
                key={section.id}
                index={idx}
                section={section}
                state={isDone ? "done" : isCurrent ? "current" : "todo"}
                pulse={pulseSectionId === section.id}
                onContinue={isCurrent ? () => goToSection(section.id) : undefined}
                onRestart={
                  isDone
                    ? () => {
                        restartSection(section.id);
                        goToSection(section.id);
                      }
                    : undefined
                }
              />
            );
          })}
        </div>
      </div>
      {confettiActive ? (
        <ConfettiBurst onComplete={() => setConfettiActive(false)} count={80} durationMs={4500} />
      ) : null}
      {/* Keyframes pulse + bandeau celebration injectes ici pour rester
          self-contained (pas de fichier CSS externe). */}
      <style>{`
        @keyframes ls-academy-pulse {
          0% { box-shadow: 0 0 0 0 rgba(29,158,117,0.55), 0 0 0 0 rgba(29,158,117,0.0); }
          50% { box-shadow: 0 0 0 8px rgba(29,158,117,0.18), 0 0 22px 4px rgba(29,158,117,0.35); }
          100% { box-shadow: 0 0 0 0 rgba(29,158,117,0), 0 0 0 0 rgba(29,158,117,0); }
        }
      `}</style>
      {confettiActive ? (
        <div
          role="status"
          style={{
            position: "fixed",
            top: 24,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 99998,
            background: "linear-gradient(135deg, #1D9E75, #0F6E56)",
            color: "white",
            padding: "14px 24px",
            borderRadius: 14,
            fontFamily: "var(--ls-font-serif, Georgia, serif)",
            fontSize: 17,
            fontWeight: 500,
            boxShadow: "0 12px 30px rgba(29,158,117,0.4)",
            letterSpacing: "0.01em",
            animation: "ls-academy-pulse 2s ease-out",
          }}
        >
          🎉 Academy complétée — bravo !
        </div>
      ) : null}
    </div>
  );
}

type AcademyView = ReturnType<typeof useAcademyProgress>["view"];

function MotivationBanner({
  stats,
  viewIsCompleted,
}: {
  stats: ReturnType<typeof useAcademyTeamStats>;
  viewIsCompleted: boolean;
}) {
  // Choix de copy selon le contexte le plus motivant
  const copy = (() => {
    if (viewIsCompleted) {
      return {
        emoji: "🏆",
        text: `Tu fais partie des ${stats.totalCompleted} distri qui ont fini l'Academy. Ton équipe progresse grâce à toi.`,
      };
    }
    if (stats.completedThisMonth > 0) {
      const next = stats.completedThisMonth + 1;
      return {
        emoji: "🔥",
        text: `${stats.completedThisMonth} distri ont fini l'Academy ce mois — sois le ${next}ème.`,
      };
    }
    if (stats.startedThisWeek > 1) {
      return {
        emoji: "💪",
        text: `${stats.startedThisWeek} distri ont commencé l'Academy cette semaine. Le mouvement est lancé.`,
      };
    }
    if (stats.totalStarted > 0) {
      return {
        emoji: "🚀",
        text: `${stats.totalStarted} distri ont déjà entamé leur Academy. Rejoins le mouvement.`,
      };
    }
    return {
      emoji: "✨",
      text: "Tu fais partie des premiers à découvrir Lor'Squad Academy. Pose la barre haute pour ton équipe.",
    };
  })();

  return (
    <div
      style={{
        background:
          "linear-gradient(135deg, rgba(184,146,42,0.10), rgba(29,158,117,0.08))",
        border: "0.5px solid rgba(184,146,42,0.25)",
        borderRadius: 12,
        padding: "12px 18px",
        marginBottom: 14,
        display: "flex",
        alignItems: "center",
        gap: 12,
        fontFamily: "var(--ls-font-sans, system-ui, sans-serif)",
      }}
    >
      <span style={{ fontSize: 22, flexShrink: 0 }}>{copy.emoji}</span>
      <p style={{ fontSize: 13, color: "#5C4A0F", margin: 0, fontWeight: 500, lineHeight: 1.45 }}>
        {copy.text}
      </p>
    </div>
  );
}

function renderHeroSubtitle(view: AcademyView): string {
  if (view.isCompleted) return "Tu as terminé toute la formation. Bravo.";
  if (view.isSkipped) return "Tu peux reprendre quand tu veux.";

  const sectionWord = view.totalCount > 1 ? "sections" : "section";
  const minuteWord = view.remainingMinutes > 1 ? "minutes" : "minute";

  if (!view.hasStarted) {
    return `${view.totalCount} ${sectionWord} — environ ${view.remainingMinutes} ${minuteWord} au total.`;
  }

  const completedWord = view.completedCount > 1 ? "sections" : "section";
  const completedSuffix = view.completedCount > 1 ? "terminées" : "terminée";
  return `${view.completedCount} ${completedWord} sur ${view.totalCount} ${completedSuffix} — il te reste environ ${view.remainingMinutes} ${minuteWord}.`;
}

interface SectionRowProps {
  index: number;
  section: AcademySection;
  state: "done" | "current" | "todo";
  /** Si true, anime un pulse vert sur la row (1.5s). Polish ludique. */
  pulse?: boolean;
  onContinue?: () => void;
  onRestart?: () => void;
}

function SectionRow({ index, section, state, pulse, onContinue, onRestart }: SectionRowProps) {
  // Style anim pulse partage entre les 3 variantes (done/current/todo).
  const pulseStyle: React.CSSProperties = pulse
    ? { animation: "ls-academy-pulse 1.5s ease-out", borderColor: "#1D9E75" }
    : {};

  if (state === "done") {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          background: "white",
          padding: "12px 14px",
          borderRadius: 10,
          border: "0.5px solid #E5DFCF",
          ...pulseStyle,
        }}
      >
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: "50%",
            background: "#1D9E75",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <svg width="14" height="14" viewBox="0 0 14 14">
            <path
              d="M3 7L6 10L11 4"
              stroke="white"
              strokeWidth="2.2"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <div style={{ flex: 1 }}>
          <p style={{ margin: 0, fontSize: 14, fontWeight: 500, color: "#2C2C2A" }}>
            {section.title}
          </p>
          <p style={{ margin: "2px 0 0 0", fontSize: 12, color: "#6B6B62" }}>
            {section.estimatedDurationMinutes} min · Terminé
          </p>
        </div>
        {onRestart ? (
          <button
            type="button"
            onClick={onRestart}
            style={{
              background: "transparent",
              border: "0.5px solid #C9C2AB",
              color: "#6B6B62",
              padding: "5px 10px",
              borderRadius: 6,
              fontSize: 11,
              fontWeight: 500,
              cursor: "pointer",
              flexShrink: 0,
            }}
          >
            ↻ Recommencer
          </button>
        ) : null}
      </div>
    );
  }

  if (state === "current") {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          background: "#FCF5E1",
          padding: 14,
          borderRadius: 10,
          border: "1.5px solid #B8922A",
          ...pulseStyle,
        }}
      >
        <div
          style={{
            width: 30,
            height: 30,
            borderRadius: "50%",
            background: "#B8922A",
            color: "white",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 13,
            fontWeight: 500,
            flexShrink: 0,
          }}
        >
          {index + 1}
        </div>
        <div style={{ flex: 1 }}>
          <p style={{ margin: 0, fontSize: 14, fontWeight: 500, color: "#2C2C2A" }}>
            {section.title}
          </p>
          <p style={{ margin: "2px 0 0 0", fontSize: 12, color: "#B8922A", fontWeight: 500 }}>
            {section.estimatedDurationMinutes} min · {section.description}
          </p>
        </div>
        {onContinue ? (
          <button
            type="button"
            onClick={onContinue}
            style={{
              background: "#B8922A",
              color: "white",
              border: "none",
              padding: "6px 12px",
              borderRadius: 6,
              fontSize: 12,
              fontWeight: 500,
              cursor: "pointer",
              flexShrink: 0,
            }}
          >
            Continuer
          </button>
        ) : null}
      </div>
    );
  }

  // todo
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        background: "white",
        padding: "12px 14px",
        borderRadius: 10,
        border: "0.5px solid #E5DFCF",
      }}
    >
      <div
        style={{
          width: 28,
          height: 28,
          borderRadius: "50%",
          background: "transparent",
          border: "1.5px solid #C9C2AB",
          color: "#888780",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 13,
          fontWeight: 500,
          flexShrink: 0,
        }}
      >
        {index + 1}
      </div>
      <div style={{ flex: 1 }}>
        <p style={{ margin: 0, fontSize: 14, fontWeight: 500, color: "#5F5E5A" }}>
          {section.title}
        </p>
        <p style={{ margin: "2px 0 0 0", fontSize: 12, color: "#888780" }}>
          {section.estimatedDurationMinutes} min · À faire
        </p>
      </div>
    </div>
  );
}
