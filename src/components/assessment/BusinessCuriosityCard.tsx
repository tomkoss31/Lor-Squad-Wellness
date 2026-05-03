// =============================================================================
// BusinessCuriosityCard — refonte intégrée de la question business (2026-11-04)
//
// Avant : encart teal isolé qui flottait dans l etape 1, pas integre au
// flow visuel. Apres : reuse le pattern AssessmentSectionV2 avec accent
// teal + 3 pills custom premium (selection avec gradient teal, scale,
// glow). Garde le ton ouvert ("question ouverte sans engagement") mais
// la coherence visuelle avec les autres sections.
// =============================================================================

import { AssessmentSectionV2 } from "./AssessmentSectionV2";

export type BusinessCuriosityValue = "never" | "sometimes" | "often" | "";

export interface BusinessCuriosityCardProps {
  value: BusinessCuriosityValue;
  onChange: (next: "never" | "sometimes" | "often") => void;
}

const OPTIONS: Array<{
  value: "never" | "sometimes" | "often";
  label: string;
  emoji: string;
  hint: string;
}> = [
  { value: "never", label: "Jamais", emoji: "🌱", hint: "Je suis bien comme ça" },
  { value: "sometimes", label: "Parfois", emoji: "💭", hint: "L'idée me traverse" },
  { value: "often", label: "Oui souvent", emoji: "🚀", hint: "C'est un vrai sujet" },
];

export function BusinessCuriosityCard({ value, onChange }: BusinessCuriosityCardProps) {
  return (
    <AssessmentSectionV2
      emoji="💭"
      eyebrow="Ouverture · sans engagement"
      title="Au-delà de ton job, t'arrive-t-il de penser à un complément de revenu ?"
      description="Une question ouverte. On veut juste mieux te connaître — aucune suite si tu n'as pas envie."
      accent="teal"
    >
      <div
        style={{
          display: "grid",
          gap: 10,
          gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
        }}
      >
        {OPTIONS.map((opt) => {
          const active = value === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange(opt.value)}
              style={{
                position: "relative",
                padding: "14px 14px 12px",
                borderRadius: 14,
                background: active
                  ? "linear-gradient(135deg, var(--ls-teal) 0%, color-mix(in srgb, var(--ls-teal) 78%, var(--ls-gold)) 100%)"
                  : "var(--ls-surface2)",
                border: active
                  ? "1px solid var(--ls-teal)"
                  : "1px solid var(--ls-border)",
                color: active ? "var(--ls-bg)" : "var(--ls-text)",
                cursor: "pointer",
                textAlign: "left",
                fontFamily: "DM Sans, sans-serif",
                transition:
                  "transform 240ms cubic-bezier(0.34, 1.56, 0.64, 1), background 200ms ease, border 200ms ease, box-shadow 200ms ease",
                transform: active ? "scale(1.03)" : "scale(1)",
                boxShadow: active
                  ? "0 8px 22px -10px color-mix(in srgb, var(--ls-teal) 50%, transparent)"
                  : "none",
                outline: "none",
              }}
              onMouseEnter={(e) => {
                if (!active) {
                  (e.currentTarget as HTMLButtonElement).style.transform = "translateY(-1px)";
                  (e.currentTarget as HTMLButtonElement).style.borderColor =
                    "color-mix(in srgb, var(--ls-teal) 50%, var(--ls-border))";
                }
              }}
              onMouseLeave={(e) => {
                if (!active) {
                  (e.currentTarget as HTMLButtonElement).style.transform = "scale(1)";
                  (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--ls-border)";
                }
              }}
              aria-pressed={active}
            >
              <div style={{ fontSize: 22, marginBottom: 6, lineHeight: 1 }} aria-hidden="true">
                {opt.emoji}
              </div>
              <div
                style={{
                  fontFamily: "Syne, serif",
                  fontWeight: 700,
                  fontSize: 14,
                  letterSpacing: "-0.01em",
                  marginBottom: 2,
                }}
              >
                {opt.label}
              </div>
              <div
                style={{
                  fontSize: 11,
                  color: active
                    ? "color-mix(in srgb, var(--ls-bg) 70%, var(--ls-text))"
                    : "var(--ls-text-muted)",
                  fontFamily: "DM Sans, sans-serif",
                  lineHeight: 1.35,
                }}
              >
                {opt.hint}
              </div>
              {active ? (
                <div
                  aria-hidden="true"
                  style={{
                    position: "absolute",
                    top: 10,
                    right: 10,
                    width: 18,
                    height: 18,
                    borderRadius: "50%",
                    background: "var(--ls-bg)",
                    color: "var(--ls-teal)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <svg
                    width="10"
                    height="10"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
              ) : null}
            </button>
          );
        })}
      </div>
    </AssessmentSectionV2>
  );
}
