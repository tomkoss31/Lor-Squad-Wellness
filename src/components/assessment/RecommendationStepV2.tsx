// =============================================================================
// RecommendationStepV2 — refonte etape 10 du bilan (2026-11-04)
//
// Inspire du pattern Programme Client VIP : tier dynamique + progress bar
// avec paliers + animation quand un palier est debloque.
//
// Avant : 10 gros pavés gris empiles + 2 paliers cadeau cards plates +
// pas de progression visible. Lourd, plat, pas motivant.
//
// Apres :
//   - Hero compact avec tier badge dynamique (Bronze/Silver/Gold) + emoji
//     + label adaptatif selon nombre de noms remplis
//   - Compteur grand Syne "X / 10"
//   - Progress bar avec 2 jalons (palier 5 et 10) qui s allument
//   - Message dynamique : "X noms pour palier suivant" ou palier debloque
//   - 10 lignes compactes (numero pill + nom + contact en ligne unique)
//   - Animation lift sur ligne hover, glow gold sur ligne remplie
//
// Theme-aware total via var(--ls-*).
// =============================================================================

import { type RecommendationLead } from "../../types/domain";
import { AssessmentSectionV2 } from "./AssessmentSectionV2";

interface TierMeta {
  emoji: string;
  label: string;
  color: string;
  hint: string;
}

function getTier(filled: number): TierMeta {
  if (filled >= 10) {
    return {
      emoji: "🌟",
      label: "Cadeau premium débloqué",
      color: "var(--ls-gold)",
      hint: "Tu as offert l'expérience à 10 personnes — palier max !",
    };
  }
  if (filled >= 5) {
    return {
      emoji: "✨",
      label: "Premier cadeau débloqué",
      color: "var(--ls-teal)",
      hint: `Plus que ${10 - filled} pour le cadeau premium.`,
    };
  }
  if (filled >= 1) {
    return {
      emoji: "🌱",
      label: "Tu as lancé la dynamique",
      color: "var(--ls-purple)",
      hint: `Encore ${5 - filled} pour débloquer le premier cadeau.`,
    };
  }
  return {
    emoji: "💛",
    label: "Faire grandir le cercle",
    color: "var(--ls-text-muted)",
    hint: "Note un prénom et un contact pour démarrer.",
  };
}

export interface RecommendationStepV2Props {
  recommendations: RecommendationLead[];
  recommendationsContacted: boolean;
  onChange: (index: number, field: keyof RecommendationLead, value: string) => void;
  onToggleContacted: (value: boolean) => void;
}

export function RecommendationStepV2({
  recommendations,
  recommendationsContacted,
  onChange,
  onToggleContacted,
}: RecommendationStepV2Props) {
  const filled = recommendations.filter((r) => r.name.trim() || r.contact.trim()).length;
  const tier = getTier(filled);
  const progress = Math.min(100, (filled / 10) * 100);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* ─── Hero progression ─── */}
      <div
        style={{
          position: "relative",
          padding: "22px 24px 24px",
          borderRadius: 22,
          background:
            "linear-gradient(135deg, color-mix(in srgb, var(--ls-gold) 8%, var(--ls-surface)) 0%, color-mix(in srgb, var(--ls-teal) 6%, var(--ls-surface)) 100%)",
          border: `0.5px solid color-mix(in srgb, ${tier.color} 30%, var(--ls-border))`,
          boxShadow: `0 8px 28px -16px color-mix(in srgb, ${tier.color} 35%, transparent)`,
          overflow: "hidden",
        }}
      >
        {/* Glow ambient */}
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            top: -50,
            right: -50,
            width: 180,
            height: 180,
            borderRadius: "50%",
            background: `color-mix(in srgb, ${tier.color} 18%, transparent)`,
            filter: "blur(56px)",
            pointerEvents: "none",
          }}
        />

        {/* Header tier + counter */}
        <div
          style={{
            position: "relative",
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 16,
            marginBottom: 18,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 14, flex: 1, minWidth: 0 }}>
            {/* Badge tier */}
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: 16,
                background: `linear-gradient(135deg, ${tier.color} 0%, color-mix(in srgb, ${tier.color} 70%, var(--ls-bg)) 100%)`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 28,
                boxShadow: `0 4px 14px color-mix(in srgb, ${tier.color} 35%, transparent), inset 0 1px 0 rgba(255,255,255,0.4)`,
                flexShrink: 0,
                transition: "background 400ms ease, box-shadow 400ms ease",
              }}
            >
              {tier.emoji}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontFamily: "DM Sans, sans-serif",
                  fontSize: 10.5,
                  fontWeight: 700,
                  letterSpacing: "0.18em",
                  textTransform: "uppercase",
                  color: tier.color,
                  marginBottom: 4,
                }}
              >
                💛 Faire grandir le cercle
              </div>
              <div
                style={{
                  fontFamily: "Syne, serif",
                  fontWeight: 700,
                  fontSize: "clamp(16px, 2vw, 19px)",
                  color: "var(--ls-text)",
                  letterSpacing: "-0.018em",
                  lineHeight: 1.2,
                }}
              >
                {tier.label}
              </div>
              <div
                style={{
                  fontFamily: "DM Sans, sans-serif",
                  fontSize: 12.5,
                  color: "var(--ls-text-muted)",
                  marginTop: 4,
                  lineHeight: 1.4,
                }}
              >
                {tier.hint}
              </div>
            </div>
          </div>
          {/* Counter big */}
          <div
            style={{
              display: "flex",
              alignItems: "baseline",
              gap: 4,
              padding: "10px 16px",
              borderRadius: 14,
              background: `color-mix(in srgb, ${tier.color} 14%, var(--ls-surface))`,
              border: `0.5px solid color-mix(in srgb, ${tier.color} 30%, transparent)`,
              flexShrink: 0,
            }}
          >
            <span
              style={{
                fontFamily: "Syne, serif",
                fontWeight: 800,
                fontSize: 28,
                letterSpacing: "-0.03em",
                color: tier.color,
                lineHeight: 1,
              }}
            >
              {filled}
            </span>
            <span
              style={{
                fontFamily: "Syne, serif",
                fontSize: 16,
                color: "var(--ls-text-muted)",
                fontWeight: 600,
              }}
            >
              / 10
            </span>
          </div>
        </div>

        {/* Progress bar with milestones */}
        <div style={{ position: "relative", marginBottom: 8 }}>
          <div
            style={{
              height: 10,
              background: "var(--ls-surface2)",
              borderRadius: 999,
              overflow: "hidden",
              boxShadow: "inset 0 1px 2px rgba(0,0,0,0.10)",
            }}
          >
            <div
              style={{
                width: `${progress}%`,
                height: "100%",
                background: `linear-gradient(90deg, var(--ls-purple) 0%, var(--ls-teal) 50%, var(--ls-gold) 100%)`,
                borderRadius: 999,
                transition: "width 700ms cubic-bezier(0.4, 0, 0.2, 1)",
                boxShadow: `0 0 8px color-mix(in srgb, ${tier.color} 50%, transparent)`,
              }}
            />
          </div>
          {/* Milestones markers */}
          {[
            { at: 50, label: "🎁 Palier 1", reached: filled >= 5 },
            { at: 100, label: "🌟 Palier 2", reached: filled >= 10 },
          ].map((m) => (
            <div
              key={m.at}
              style={{
                position: "absolute",
                top: -2,
                left: `${m.at}%`,
                transform: "translateX(-50%)",
                width: 14,
                height: 14,
                borderRadius: "50%",
                background: m.reached ? "var(--ls-gold)" : "var(--ls-surface)",
                border: m.reached
                  ? "2px solid var(--ls-bg)"
                  : "2px solid var(--ls-border)",
                boxShadow: m.reached
                  ? "0 0 12px color-mix(in srgb, var(--ls-gold) 70%, transparent)"
                  : "none",
                transition: "all 400ms ease",
              }}
            />
          ))}
        </div>

        {/* Milestones labels */}
        <div
          style={{
            position: "relative",
            display: "flex",
            justifyContent: "space-between",
            fontSize: 10,
            fontFamily: "DM Sans, sans-serif",
            color: "var(--ls-text-muted)",
            marginTop: 10,
          }}
        >
          <span style={{ fontWeight: 600 }}>Démarrer</span>
          <span
            style={{
              position: "absolute",
              left: "50%",
              transform: "translateX(-50%)",
              fontWeight: filled >= 5 ? 700 : 500,
              color: filled >= 5 ? "var(--ls-teal)" : "var(--ls-text-muted)",
              transition: "color 400ms ease",
            }}
          >
            🎁 5 noms
          </span>
          <span
            style={{
              fontWeight: filled >= 10 ? 700 : 500,
              color: filled >= 10 ? "var(--ls-gold)" : "var(--ls-text-muted)",
              transition: "color 400ms ease",
            }}
          >
            🌟 10 noms
          </span>
        </div>
      </div>

      {/* ─── Liste nominative compacte ─── */}
      <AssessmentSectionV2
        emoji="💛"
        eyebrow="Liste · prénom + contact"
        title="À qui aimerais-tu offrir ce moment bien-être ?"
        description="Note simplement un prénom et un moyen de contact par ligne. Aucune pression, c'est juste pour pouvoir leur faire signe."
        accent="purple"
      >
        {/* Toggle contactées */}
        <label
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            padding: "12px 16px",
            borderRadius: 14,
            background: "var(--ls-surface2)",
            border: "0.5px solid var(--ls-border)",
            cursor: "pointer",
          }}
        >
          <div style={{ flex: 1 }}>
            <div
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: "var(--ls-text)",
                fontFamily: "DM Sans, sans-serif",
              }}
            >
              Recommandations déjà contactées
            </div>
            <div
              style={{
                fontSize: 11.5,
                color: "var(--ls-text-muted)",
                fontFamily: "DM Sans, sans-serif",
                marginTop: 2,
              }}
            >
              Coche quand les contacts ont déjà été repris.
            </div>
          </div>
          <input
            type="checkbox"
            checked={recommendationsContacted}
            onChange={(event) => onToggleContacted(event.target.checked)}
            style={{ width: 20, height: 20, accentColor: "var(--ls-gold)" }}
          />
        </label>

        {/* Lignes recos compactes */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {recommendations.map((item, index) => (
            <RecommendationLineCompact
              key={`reco-${index}`}
              index={index}
              name={item.name}
              contact={item.contact}
              onNameChange={(v) => onChange(index, "name", v)}
              onContactChange={(v) => onChange(index, "contact", v)}
              isMilestone5={index === 4 && filled >= 5}
              isMilestone10={index === 9 && filled >= 10}
            />
          ))}
        </div>
      </AssessmentSectionV2>
    </div>
  );
}

// ─── Ligne reco compacte ────────────────────────────────────────────────────
interface RecommendationLineCompactProps {
  index: number;
  name: string;
  contact: string;
  onNameChange: (value: string) => void;
  onContactChange: (value: string) => void;
  isMilestone5: boolean;
  isMilestone10: boolean;
}

function RecommendationLineCompact({
  index,
  name,
  contact,
  onNameChange,
  onContactChange,
  isMilestone5,
  isMilestone10,
}: RecommendationLineCompactProps) {
  const filled = name.trim().length > 0 || contact.trim().length > 0;
  const milestone = isMilestone10 ? "gold" : isMilestone5 ? "teal" : null;
  const accentColor = milestone === "gold" ? "var(--ls-gold)" : milestone === "teal" ? "var(--ls-teal)" : filled ? "var(--ls-purple)" : null;

  return (
    <div
      style={{
        display: "grid",
        gap: 10,
        gridTemplateColumns: "44px 1fr 1fr",
        alignItems: "center",
        padding: "10px 12px",
        borderRadius: 12,
        background: filled ? "color-mix(in srgb, var(--ls-purple) 4%, var(--ls-surface2))" : "var(--ls-surface2)",
        border: accentColor
          ? `0.5px solid color-mix(in srgb, ${accentColor} 35%, var(--ls-border))`
          : "0.5px solid var(--ls-border)",
        transition: "all 280ms cubic-bezier(0.4, 0, 0.2, 1)",
        position: "relative",
      }}
    >
      {/* Numero pill */}
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: 10,
          background: accentColor
            ? `linear-gradient(135deg, ${accentColor} 0%, color-mix(in srgb, ${accentColor} 70%, var(--ls-bg)) 100%)`
            : "var(--ls-surface)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "Syne, serif",
          fontWeight: 800,
          fontSize: 13,
          color: accentColor ? "var(--ls-bg)" : "var(--ls-text-hint)",
          boxShadow: accentColor
            ? `0 2px 8px color-mix(in srgb, ${accentColor} 40%, transparent)`
            : "none",
          transition: "all 280ms ease",
        }}
      >
        {String(index + 1).padStart(2, "0")}
      </div>

      {/* Inputs compacts */}
      <input
        type="text"
        value={name}
        onChange={(e) => onNameChange(e.target.value)}
        placeholder="Prénom"
        style={{
          padding: "8px 12px",
          fontSize: 13,
          background: "var(--ls-surface)",
          border: "0.5px solid var(--ls-border)",
          borderRadius: 10,
          fontFamily: "DM Sans, sans-serif",
          color: "var(--ls-text)",
          width: "100%",
        }}
      />
      <input
        type="text"
        value={contact}
        onChange={(e) => onContactChange(e.target.value)}
        placeholder="Téléphone ou réseau"
        style={{
          padding: "8px 12px",
          fontSize: 13,
          background: "var(--ls-surface)",
          border: "0.5px solid var(--ls-border)",
          borderRadius: 10,
          fontFamily: "DM Sans, sans-serif",
          color: "var(--ls-text)",
          width: "100%",
        }}
      />

      {/* Milestone glow indicator */}
      {milestone ? (
        (() => {
          const milestoneColor = milestone === "gold" ? "var(--ls-gold)" : "var(--ls-teal)";
          return (
            <div
              aria-hidden="true"
              style={{
                position: "absolute",
                top: -2,
                right: -2,
                padding: "2px 8px",
                borderRadius: 999,
                background: milestoneColor,
                color: "var(--ls-bg)",
                fontSize: 9,
                fontWeight: 800,
                fontFamily: "DM Sans, sans-serif",
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                boxShadow: `0 2px 8px color-mix(in srgb, ${milestoneColor} 40%, transparent)`,
              }}
            >
              {milestone === "gold" ? "🌟 Palier 2" : "🎁 Palier 1"}
            </div>
          );
        })()
      ) : null}
    </div>
  );
}
