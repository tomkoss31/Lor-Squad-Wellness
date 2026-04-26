// Chantier Academy Phase 1 (2026-04-26).
// Page d accueil de Lor'Squad Academy. Mockup A valide visuellement par
// Thomas. Couleurs hardcodees palette Lor'Squad. Le contenu interactif
// par section arrive en Phase 2.

import { useNavigate } from "react-router-dom";
import { useAcademyProgress } from "../features/academy/hooks/useAcademyProgress";
import { ACADEMY_SECTIONS, type AcademySection } from "../features/academy/sections";

export function AcademyOverviewPage() {
  const navigate = useNavigate();
  void navigate;
  const { view, goToSection } = useAcademyProgress();

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
            )}
          </div>
        </div>

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
                onContinue={isCurrent ? () => goToSection(section.id) : undefined}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}

type AcademyView = ReturnType<typeof useAcademyProgress>["view"];

function renderHeroSubtitle(view: AcademyView): string {
  if (view.isCompleted) return "Tu as terminé toute la formation. Bravo.";
  if (view.isSkipped) return "Tu peux reprendre quand tu veux.";
  if (!view.hasStarted) {
    return `${view.totalCount} sections — environ ${view.remainingMinutes} minutes au total.`;
  }
  return `${view.completedCount} sections sur ${view.totalCount} terminées — il te reste environ ${view.remainingMinutes} minutes.`;
}

interface SectionRowProps {
  index: number;
  section: AcademySection;
  state: "done" | "current" | "todo";
  onContinue?: () => void;
}

function SectionRow({ index, section, state, onContinue }: SectionRowProps) {
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
