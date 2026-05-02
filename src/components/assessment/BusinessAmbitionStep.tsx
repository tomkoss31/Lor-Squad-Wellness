// =============================================================================
// BusinessAmbitionStep — etape immersive bilan (2026-11-03)
//
// Affichee entre 'concept' et 'program' uniquement si business_curiosity !=
// 'never' (cf. ALL_STEPS dans NewAssessmentPage). Format pop-up sandbox :
// citation hero + 6 boutons montants + champ libre conditionnel "Plus".
//
// Stockage : form.businessInterestAmount (number | null) + form.businessInterestNote
// (string). 0 = "Pas pour moi" explicite, 100/300/500/1000 = paliers, -1 = "Plus"
// (avec note libre). Persist en DB business_interest_amount + _note + _date au save.
// =============================================================================

import { useMemo } from "react";

export interface BusinessAmbitionStepProps {
  firstName: string;
  amount: number | null;
  note: string;
  onAmountChange: (value: number | null) => void;
  onNoteChange: (value: string) => void;
}

interface AmbitionOption {
  value: number;
  label: string;
  sub: string;
  emoji: string;
  highlight?: boolean;
}

const OPTIONS: AmbitionOption[] = [
  { value: 0, label: "Pas pour moi", sub: "Je suis bien comme ça", emoji: "🙅" },
  { value: 100, label: "+100 €/mois", sub: "Un coup de pouce", emoji: "✨" },
  { value: 300, label: "+300 €/mois", sub: "Une vraie respiration", emoji: "🌿", highlight: true },
  { value: 500, label: "+500 €/mois", sub: "Un changement de cap", emoji: "🚀" },
  { value: 1000, label: "+1000 €/mois", sub: "Une nouvelle vie", emoji: "🔥" },
  { value: -1, label: "Plus encore", sub: "J'ai un projet précis", emoji: "🌟" },
];

export function BusinessAmbitionStep({
  firstName,
  amount,
  note,
  onAmountChange,
  onNoteChange,
}: BusinessAmbitionStepProps) {
  const hello = useMemo(() => firstName.trim() || "toi", [firstName]);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 28,
        padding: "8px 4px",
      }}
    >
      {/* Hero immersif type sandbox */}
      <div
        style={{
          position: "relative",
          padding: "32px 24px",
          borderRadius: 24,
          background:
            "linear-gradient(135deg, color-mix(in srgb, var(--ls-gold) 10%, var(--ls-surface)) 0%, color-mix(in srgb, var(--ls-teal) 8%, var(--ls-surface2)) 100%)",
          border: "0.5px solid color-mix(in srgb, var(--ls-gold) 30%, var(--ls-border))",
          textAlign: "center",
          overflow: "hidden",
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
            filter: "blur(40px)",
          }}
        />
        <span
          style={{
            display: "inline-block",
            fontSize: 11,
            fontFamily: "DM Sans, sans-serif",
            fontWeight: 700,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: "var(--ls-gold)",
            marginBottom: 12,
          }}
        >
          ✦ Et au-delà de ta santé ?
        </span>
        <h2
          style={{
            fontFamily: "Syne, serif",
            fontWeight: 800,
            fontSize: "clamp(22px, 4vw, 30px)",
            lineHeight: 1.15,
            color: "var(--ls-text)",
            margin: 0,
            letterSpacing: "-0.02em",
            position: "relative",
          }}
        >
          {hello}, et si on parlait
          <br />
          <span
            style={{
              background:
                "linear-gradient(90deg, var(--ls-gold) 0%, var(--ls-teal) 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            de ton avenir aussi ?
          </span>
        </h2>
        <p
          style={{
            fontFamily: "DM Sans, sans-serif",
            fontSize: 14,
            lineHeight: 1.55,
            color: "var(--ls-text-muted)",
            margin: "16px auto 0",
            maxWidth: 520,
            position: "relative",
          }}
        >
          Tu nous as dit que l'idée d'un complément de revenu te traversait l'esprit.
          On ne va pas te vendre un truc — on veut juste comprendre ce qui te ferait
          vraiment du bien. Sans pression.
        </p>
      </div>

      {/* Question */}
      <div style={{ textAlign: "center" }}>
        <p
          style={{
            fontFamily: "Syne, serif",
            fontWeight: 700,
            fontSize: 18,
            color: "var(--ls-text)",
            margin: 0,
            letterSpacing: "-0.01em",
          }}
        >
          Combien aimerais-tu gagner en plus chaque mois ?
        </p>
        <p
          style={{
            fontSize: 12,
            color: "var(--ls-text-muted)",
            marginTop: 6,
            fontFamily: "DM Sans, sans-serif",
          }}
        >
          Choisis ce qui résonne le plus. C'est juste un repère, pas un contrat.
        </p>
      </div>

      {/* Grille 6 boutons */}
      <div
        style={{
          display: "grid",
          gap: 12,
          gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
        }}
      >
        {OPTIONS.map((opt) => {
          const active = amount === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => {
                onAmountChange(active ? null : opt.value);
                if (opt.value !== -1) onNoteChange("");
              }}
              style={{
                padding: "18px 14px",
                borderRadius: 18,
                background: active
                  ? opt.highlight
                    ? "color-mix(in srgb, var(--ls-gold) 18%, var(--ls-surface))"
                    : "color-mix(in srgb, var(--ls-teal) 14%, var(--ls-surface))"
                  : "var(--ls-surface)",
                border: active
                  ? `1.5px solid ${opt.highlight ? "var(--ls-gold)" : "var(--ls-teal)"}`
                  : "0.5px solid var(--ls-border)",
                color: "var(--ls-text)",
                cursor: "pointer",
                textAlign: "center",
                transition: "all 180ms cubic-bezier(0.4, 0, 0.2, 1)",
                transform: active ? "scale(1.02)" : "scale(1)",
                boxShadow: active
                  ? "0 8px 24px color-mix(in srgb, var(--ls-gold) 18%, transparent)"
                  : "none",
              }}
            >
              <div style={{ fontSize: 28, marginBottom: 6 }} aria-hidden="true">
                {opt.emoji}
              </div>
              <div
                style={{
                  fontFamily: "Syne, serif",
                  fontWeight: 800,
                  fontSize: 15,
                  letterSpacing: "-0.01em",
                  color: active && opt.highlight ? "var(--ls-gold)" : "var(--ls-text)",
                }}
              >
                {opt.label}
              </div>
              <div
                style={{
                  fontFamily: "DM Sans, sans-serif",
                  fontSize: 11,
                  color: "var(--ls-text-muted)",
                  marginTop: 2,
                }}
              >
                {opt.sub}
              </div>
            </button>
          );
        })}
      </div>

      {/* Champ libre si "Plus" */}
      {amount === -1 ? (
        <div
          style={{
            padding: 16,
            borderRadius: 14,
            background: "color-mix(in srgb, var(--ls-gold) 6%, var(--ls-surface2))",
            border: "0.5px solid color-mix(in srgb, var(--ls-gold) 30%, var(--ls-border))",
          }}
        >
          <label
            style={{
              display: "block",
              fontSize: 12,
              fontFamily: "DM Sans, sans-serif",
              fontWeight: 600,
              color: "var(--ls-text)",
              marginBottom: 8,
            }}
          >
            Raconte-nous ton projet (optionnel)
          </label>
          <textarea
            value={note}
            onChange={(e) => onNoteChange(e.target.value)}
            placeholder="Ex : remplacer mon salaire, financer un projet, changer de vie…"
            rows={3}
            style={{
              width: "100%",
              padding: 12,
              borderRadius: 10,
              background: "var(--ls-surface)",
              border: "0.5px solid var(--ls-border)",
              color: "var(--ls-text)",
              fontFamily: "DM Sans, sans-serif",
              fontSize: 13,
              resize: "vertical",
            }}
          />
        </div>
      ) : null}

      {/* Footer rassurant */}
      <p
        style={{
          fontSize: 11,
          color: "var(--ls-text-muted)",
          textAlign: "center",
          fontFamily: "DM Sans, sans-serif",
          fontStyle: "italic",
          margin: 0,
        }}
      >
        🔒 Ta réponse reste entre toi et ton coach. Aucun engagement.
      </p>
    </div>
  );
}
