// Chantier Academy polish D (2026-04-28).
// Timeline horizontale visuelle des 8 sections de l Academy. Donne une
// vue panoramique de la progression : dots colorés selon l etat, ligne
// gold qui se remplit au fur et a mesure.
//
// Cliquer sur un dot done -> restart cette section.
// Cliquer sur le current -> reprendre.
// Cliquer sur un todo -> aller a cette section directement.

import { ACADEMY_SECTIONS } from "../sections";

interface Props {
  completedCount: number;
  currentSectionIndex: number;
  isCompleted: boolean;
  onSectionClick: (sectionId: string) => void;
}

export function AcademyTimeline({
  completedCount,
  currentSectionIndex,
  isCompleted,
  onSectionClick,
}: Props) {
  // Largeur du fill : pourcentage de la ligne entre le 1er et le dernier dot.
  // completedCount / (totalCount - 1) car la ligne va du dot 0 au dot N-1.
  const total = ACADEMY_SECTIONS.length;
  const fillPercent = isCompleted
    ? 100
    : Math.min(100, Math.max(0, (completedCount / (total - 1)) * 100));

  return (
    <div
      style={{
        background: "var(--ls-surface2)",
        border: "0.5px solid var(--ls-border)",
        borderRadius: 14,
        padding: "20px 8px 16px",
        marginBottom: 16,
        overflowX: "auto",
        WebkitOverflowScrolling: "touch",
      }}
    >
      <style>{`
        @keyframes ls-timeline-current-pulse {
          0%, 100% {
            box-shadow: 0 0 0 0 rgba(184,146,42,0.55), 0 4px 10px rgba(184,146,42,0.35);
          }
          50% {
            box-shadow: 0 0 0 8px rgba(184,146,42,0.10), 0 4px 14px rgba(184,146,42,0.55);
          }
        }
        .ls-timeline-dot {
          transition: transform 180ms ease-out;
          cursor: pointer;
        }
        .ls-timeline-dot:hover {
          transform: translateY(-2px) scale(1.05);
        }
      `}</style>

      <div
        style={{
          position: "relative",
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          minWidth: total * 78,
          padding: "0 16px",
        }}
      >
        {/* Ligne de fond grise */}
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            top: 18,
            left: `calc(16px + 18px)`,
            right: `calc(16px + 18px)`,
            height: 3,
            background: "var(--ls-border)",
            borderRadius: 2,
            zIndex: 0,
          }}
        />
        {/* Ligne de progression gold */}
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            top: 18,
            left: `calc(16px + 18px)`,
            width: `calc((100% - 32px - 36px) * ${fillPercent / 100})`,
            height: 3,
            background: "linear-gradient(90deg, #B8922A, #EF9F27)",
            borderRadius: 2,
            zIndex: 1,
            transition: "width 800ms cubic-bezier(0.4, 0, 0.2, 1)",
          }}
        />

        {ACADEMY_SECTIONS.map((section, idx) => {
          const isDone = idx < completedCount;
          const isCurrent = !isCompleted && idx === currentSectionIndex;
          const stateColor = isDone ? "var(--ls-teal)" : isCurrent ? "var(--ls-gold)" : "var(--ls-text-hint)";
          const dotBg = isDone ? "var(--ls-teal)" : isCurrent ? "var(--ls-gold)" : "var(--ls-surface)";
          const dotColor = isDone || isCurrent ? "white" : "var(--ls-text-hint)";
          const dotBorder = isDone
            ? "none"
            : isCurrent
              ? "none"
              : "1.5px solid var(--ls-border)";

          return (
            <button
              key={section.id}
              type="button"
              onClick={() => onSectionClick(section.id)}
              className="ls-timeline-dot"
              title={section.title}
              aria-label={`Section ${idx + 1} : ${section.title}`}
              style={{
                position: "relative",
                zIndex: 2,
                background: "transparent",
                border: "none",
                padding: 0,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 6,
                width: 62,
                flexShrink: 0,
              }}
            >
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: "50%",
                  background: dotBg,
                  border: dotBorder,
                  color: dotColor,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontFamily: "Syne, serif",
                  fontSize: 13,
                  fontWeight: 600,
                  animation: isCurrent
                    ? "ls-timeline-current-pulse 2s ease-in-out infinite"
                    : undefined,
                  boxShadow: isDone
                    ? "0 2px 6px rgba(29,158,117,0.3)"
                    : undefined,
                }}
              >
                {isDone ? (
                  <svg width="14" height="14" viewBox="0 0 14 14">
                    <path
                      d="M3 7L6 10L11 4"
                      stroke="white"
                      strokeWidth="2.4"
                      fill="none"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                ) : (
                  <span style={{ fontSize: 14 }}>{section.icon}</span>
                )}
              </div>
              <span
                style={{
                  fontSize: 10,
                  fontFamily: "DM Sans, sans-serif",
                  color: stateColor,
                  fontWeight: isCurrent ? 600 : 500,
                  textAlign: "center",
                  whiteSpace: "nowrap",
                  letterSpacing: "0.02em",
                }}
              >
                {section.shortLabel}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
