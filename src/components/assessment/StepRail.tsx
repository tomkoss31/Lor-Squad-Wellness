// StepRail V2 PREMIUM — refonte 2026-04-29
// Stepper visuel pro pour le bilan : timeline horizontale 4 phases avec
// gradient gold qui se remplit, nodes animés (active = ring pulsant +
// scale), check icon SVG sur les done, hover lift + click pour saut
// rapide. Mobile : version condensée avec phase pill colorée +
// progress dotted.
//
// Différences vs V1 :
//  - Gradient gold tonal sur la barre (pas teal)
//  - Glow color-matched derrière le node actif
//  - Phase pills avec emoji + couleur identitaire
//  - Pourcentage live affiché en grand chiffre Syne
//  - Animations fluides (transition 0.4s ease-out)
//  - Check ✓ premium (SVG stroke 2.5)

interface StepRailProps {
  currentStep: number;
  steps: string[];
  onStepClick?: (step: number) => void;
}

const STEP_PHASES = [
  { label: "Client",    emoji: "👤", steps: [0],            color: "#EF9F27" },
  { label: "Habitudes", emoji: "🍽️", steps: [1, 2, 3, 4],   color: "#2DD4BF" },
  { label: "Analyse",   emoji: "🧬", steps: [5, 6, 7, 8, 9], color: "#A78BFA" },
  { label: "Clôture",   emoji: "✨", steps: [10, 11, 12, 13, 14], color: "#F0C96A" },
];

function getPhaseColor(stepIndex: number): string {
  for (const phase of STEP_PHASES) {
    if (phase.steps.includes(stepIndex)) return phase.color;
  }
  return "#C9A84C";
}

function getPhaseForStep(stepIndex: number): { label: string; emoji: string; color: string } {
  for (const phase of STEP_PHASES) {
    if (phase.steps.includes(stepIndex)) {
      return { label: phase.label, emoji: phase.emoji, color: phase.color };
    }
  }
  return { label: "Étape", emoji: "✦", color: "#C9A84C" };
}

export function StepRail({ currentStep, steps, onStepClick }: StepRailProps) {
  const progress = steps.length > 1 ? (currentStep / (steps.length - 1)) * 100 : 0;
  const progressPct = Math.round(progress);
  const phase = getPhaseForStep(currentStep);

  return (
    <>
      <style>{`
        @keyframes ls-rail-pulse {
          0%, 100% { box-shadow: 0 0 0 0 var(--rail-color, #EF9F27), 0 0 12px 0 var(--rail-color, #EF9F27); }
          50%      { box-shadow: 0 0 0 6px transparent, 0 0 18px 4px var(--rail-color, #EF9F27); }
        }
        @keyframes ls-rail-shine {
          0%, 100% { transform: translateX(-50%); opacity: 0; }
          50%      { transform: translateX(150%); opacity: 0.55; }
        }
        @keyframes ls-rail-fill {
          from { width: 0%; }
          to   { width: var(--rail-target-width, 0%); }
        }
        .ls-rail-active-node {
          animation: ls-rail-pulse 2.4s ease-in-out infinite;
          transform: scale(1.15);
        }
        .ls-rail-shine {
          position: absolute; top: 0; left: 0; height: 100%; width: 30%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.45), transparent);
          animation: ls-rail-shine 3.2s ease-in-out infinite;
          pointer-events: none;
        }
        @media (prefers-reduced-motion: reduce) {
          .ls-rail-active-node, .ls-rail-shine { animation: none !important; }
        }
      `}</style>

      {/* ═══ MOBILE — version condensée premium ═══ */}
      <div className="lg:hidden">
        <div
          style={{
            position: "relative",
            overflow: "hidden",
            background: "var(--ls-surface)",
            border: `0.5px solid color-mix(in srgb, ${phase.color} 30%, var(--ls-border))`,
            borderRadius: 16,
            padding: "14px 16px",
            boxShadow: `0 4px 16px -8px ${phase.color}40`,
          }}
        >
          {/* Pill phase */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "4px 10px",
                borderRadius: 999,
                background: `color-mix(in srgb, ${phase.color} 14%, transparent)`,
                border: `0.5px solid color-mix(in srgb, ${phase.color} 40%, transparent)`,
                fontSize: 10,
                fontWeight: 700,
                fontFamily: "DM Sans, sans-serif",
                color: phase.color,
                textTransform: "uppercase",
                letterSpacing: 1.2,
              }}
            >
              <span>{phase.emoji}</span> {phase.label}
            </div>
            <div
              style={{
                fontFamily: "Syne, serif",
                fontWeight: 800,
                fontSize: 18,
                color: "var(--ls-text)",
                letterSpacing: "-0.02em",
              }}
            >
              {progressPct}<span style={{ color: phase.color, marginLeft: 1 }}>%</span>
            </div>
          </div>

          {/* Step name */}
          <div
            style={{
              fontFamily: "Syne, serif",
              fontWeight: 700,
              fontSize: 15,
              color: "var(--ls-text)",
              marginBottom: 10,
              letterSpacing: "-0.01em",
            }}
          >
            {steps[currentStep]}
          </div>

          {/* Progress bar avec shine */}
          <div
            style={{
              position: "relative",
              height: 6,
              background: "var(--ls-surface2)",
              borderRadius: 999,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                position: "relative",
                height: "100%",
                width: `${progress}%`,
                background: `linear-gradient(90deg, #EF9F27 0%, ${phase.color} 100%)`,
                borderRadius: 999,
                transition: "width 0.5s cubic-bezier(0.22, 1, 0.36, 1)",
                boxShadow: `0 0 8px ${phase.color}80`,
                overflow: "hidden",
              }}
            >
              <div className="ls-rail-shine" aria-hidden="true" />
            </div>
          </div>

          <div
            style={{
              fontSize: 10,
              color: "var(--ls-text-hint)",
              fontFamily: "DM Sans, sans-serif",
              marginTop: 8,
              letterSpacing: 0.5,
            }}
          >
            Étape {currentStep + 1} sur {steps.length}
          </div>
        </div>
      </div>

      {/* ═══ DESKTOP — version complète premium ═══ */}
      <div className="hidden lg:block">
        <div
          style={{
            position: "relative",
            overflow: "hidden",
            background:
              "linear-gradient(180deg, color-mix(in srgb, var(--ls-gold) 4%, var(--ls-surface)) 0%, var(--ls-surface) 100%)",
            border: `0.5px solid color-mix(in srgb, ${phase.color} 25%, var(--ls-border))`,
            borderRadius: 20,
            padding: "18px 22px",
            boxShadow: `0 1px 0 0 ${phase.color}1A, 0 8px 24px -12px ${phase.color}33`,
          }}
        >
          {/* HEADER */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 16,
              marginBottom: 14,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "5px 11px",
                  borderRadius: 999,
                  background: `color-mix(in srgb, ${phase.color} 14%, transparent)`,
                  border: `0.5px solid color-mix(in srgb, ${phase.color} 40%, transparent)`,
                  fontSize: 10.5,
                  fontWeight: 700,
                  fontFamily: "DM Sans, sans-serif",
                  color: phase.color,
                  textTransform: "uppercase",
                  letterSpacing: 1.4,
                }}
              >
                <span style={{ fontSize: 12 }}>{phase.emoji}</span> Phase {phase.label}
              </div>
              <span
                style={{
                  fontSize: 11,
                  color: "var(--ls-text-hint)",
                  fontFamily: "DM Sans, sans-serif",
                  letterSpacing: 0.5,
                }}
              >
                · Étape {currentStep + 1} / {steps.length}
              </span>
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "baseline",
                gap: 8,
              }}
            >
              <span
                style={{
                  fontFamily: "Syne, serif",
                  fontWeight: 800,
                  fontSize: 28,
                  letterSpacing: "-0.03em",
                  color: "var(--ls-text)",
                  display: "inline-flex",
                  alignItems: "baseline",
                  gap: 2,
                }}
              >
                {progressPct}
                <span style={{ color: phase.color, fontSize: 20, fontWeight: 700 }}>%</span>
              </span>
              <span
                style={{
                  fontSize: 11,
                  color: "var(--ls-text-muted)",
                  fontFamily: "DM Sans, sans-serif",
                  fontWeight: 500,
                }}
              >
                complété
              </span>
            </div>
          </div>

          {/* Progress bar premium avec shine */}
          <div
            style={{
              position: "relative",
              height: 8,
              background: "var(--ls-surface2)",
              borderRadius: 999,
              overflow: "hidden",
              marginBottom: 18,
            }}
          >
            <div
              style={{
                position: "relative",
                height: "100%",
                width: `${progress}%`,
                background: `linear-gradient(90deg, #EF9F27 0%, #BA7517 35%, ${phase.color} 100%)`,
                borderRadius: 999,
                transition: "width 0.6s cubic-bezier(0.22, 1, 0.36, 1)",
                boxShadow: `0 0 12px ${phase.color}66, inset 0 1px 0 rgba(255,255,255,0.25)`,
                overflow: "hidden",
              }}
            >
              <div className="ls-rail-shine" aria-hidden="true" />
            </div>
          </div>

          {/* Step nodes */}
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 4 }}>
            {steps.map((step, index) => {
              const isDone = index < currentStep;
              const isActive = index === currentStep;
              const color = getPhaseColor(index);
              const interactive = !!onStepClick;

              return (
                <div
                  key={step + index}
                  style={{
                    flex: 1,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 6,
                    cursor: interactive ? "pointer" : "default",
                    minWidth: 0,
                  }}
                  role={interactive ? "button" : undefined}
                  tabIndex={interactive ? 0 : undefined}
                  onClick={interactive ? () => onStepClick(index) : undefined}
                  onKeyDown={
                    interactive
                      ? (e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            onStepClick(index);
                          }
                        }
                      : undefined
                  }
                  onMouseEnter={(e) => {
                    if (interactive && !isActive) {
                      const node = e.currentTarget.querySelector<HTMLDivElement>("[data-rail-node]");
                      if (node) node.style.transform = "scale(1.08)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (interactive && !isActive) {
                      const node = e.currentTarget.querySelector<HTMLDivElement>("[data-rail-node]");
                      if (node) node.style.transform = "scale(1)";
                    }
                  }}
                >
                  <div
                    data-rail-node
                    className={isActive ? "ls-rail-active-node" : ""}
                    style={
                      {
                        width: 30,
                        height: 30,
                        borderRadius: "50%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 11,
                        fontWeight: 800,
                        fontFamily: "Syne, serif",
                        background: isDone
                          ? `linear-gradient(135deg, ${color} 0%, color-mix(in srgb, ${color} 70%, #000) 100%)`
                          : isActive
                            ? `color-mix(in srgb, ${color} 22%, var(--ls-surface))`
                            : "var(--ls-surface)",
                        border: isDone
                          ? `2px solid ${color}`
                          : isActive
                            ? `2px solid ${color}`
                            : "1.5px solid var(--ls-border)",
                        color: isDone
                          ? "#0B0D11"
                          : isActive
                            ? color
                            : "var(--ls-text-hint)",
                        transition: "transform 0.25s ease, background 0.25s ease, border 0.25s ease",
                        boxShadow: isDone ? `0 2px 6px ${color}55` : "none",
                        "--rail-color": color,
                      } as React.CSSProperties
                    }
                  >
                    {isDone ? (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    ) : (
                      index + 1
                    )}
                  </div>
                  <span
                    style={{
                      fontSize: 9.5,
                      lineHeight: 1.25,
                      textAlign: "center",
                      maxWidth: 72,
                      color: isActive ? color : isDone ? "var(--ls-text-muted)" : "var(--ls-text-hint)",
                      fontWeight: isActive ? 700 : 500,
                      fontFamily: "DM Sans, sans-serif",
                      transition: "color 0.25s ease",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      width: "100%",
                    }}
                    title={step}
                  >
                    {step}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}
