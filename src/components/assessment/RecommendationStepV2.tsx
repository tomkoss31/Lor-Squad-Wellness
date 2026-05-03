// =============================================================================
// RecommendationStepV2 — refonte etape 10 du bilan (V3, 2026-11-04)
//
// V1 : 10 gros pavés gris empiles, plat.
// V2 : pattern VIP avec hero progression + 10 lignes compactes.
// V3 (cette refonte) : pattern modale "Mode pratique VIP" — beaucoup
// plus elegant. 3 cards initiales + bouton "+ Ajouter" pour reveler
// la suivante. Chaque card a un tag categorie (Famille / Travail /
// Sport / Ami / Autre) pour aider le coach a contextualiser.
//
// Hero progression conserve (tier badge + jauge avec paliers 5/10).
// =============================================================================

import { useState, type ReactNode } from "react";
import type { RecommendationLead } from "../../types/domain";
import { AssessmentSectionV2 } from "./AssessmentSectionV2";

const INITIAL_VISIBLE = 3;
const MAX_RECOMMENDATIONS = 10;

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

const CATEGORIES: Array<{
  value: NonNullable<RecommendationLead["category"]>;
  label: string;
  emoji: string;
  color: string;
}> = [
  { value: "famille", label: "Famille", emoji: "👨‍👩‍👧", color: "var(--ls-coral)" },
  { value: "travail", label: "Travail", emoji: "💼", color: "var(--ls-purple)" },
  { value: "sport", label: "Sport", emoji: "🏋️", color: "var(--ls-teal)" },
  { value: "ami", label: "Ami·e", emoji: "🤝", color: "var(--ls-gold)" },
  { value: "autre", label: "Autre", emoji: "✨", color: "var(--ls-text-muted)" },
];

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
  const filled = recommendations.filter(
    (r) => r.name.trim() || r.contact.trim(),
  ).length;
  const tier = getTier(filled);
  const progress = Math.min(100, (filled / 10) * 100);

  // Affichage progressif : on demarre a 3 cards, on peut deployer jusqu a 10.
  // Si une card existante a ete remplie au-dela de visibleCount (ex: bilan
  // re-edition), on s aligne sur le max necessaire.
  const lastFilledIndex = recommendations.reduce(
    (acc, r, i) => (r.name.trim() || r.contact.trim() ? i : acc),
    -1,
  );
  const minVisible = Math.max(INITIAL_VISIBLE, lastFilledIndex + 1);
  const [visibleCount, setVisibleCount] = useState<number>(minVisible);
  const effectiveVisible = Math.max(visibleCount, minVisible);

  function addOne() {
    setVisibleCount((c) => Math.min(MAX_RECOMMENDATIONS, c + 1));
  }
  function removeOne(index: number) {
    // Clear le contenu de la card. On ne reduit pas visibleCount pour eviter
    // un effet "pop" desagreable quand on supprime le milieu.
    onChange(index, "name", "");
    onChange(index, "contact", "");
    onChange(index, "category", "");
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* ─── Hero progression (tier + jauge + paliers) ─── */}
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
            flexWrap: "wrap",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 14,
              flex: 1,
              minWidth: 240,
            }}
          >
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
                background:
                  "linear-gradient(90deg, var(--ls-purple) 0%, var(--ls-teal) 50%, var(--ls-gold) 100%)",
                borderRadius: 999,
                transition: "width 700ms cubic-bezier(0.4, 0, 0.2, 1)",
                boxShadow: `0 0 8px color-mix(in srgb, ${tier.color} 50%, transparent)`,
              }}
            />
          </div>
          {[
            { at: 50, reached: filled >= 5 },
            { at: 100, reached: filled >= 10 },
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

      {/* ─── Cards prospects (3 par defaut, +1 a chaque clic Ajouter) ─── */}
      <AssessmentSectionV2
        emoji="👥"
        eyebrow="Tes futurs filleuls"
        title="À qui aimerais-tu offrir ce moment ?"
        description="Liste 3 personnes (ou plus) que tu pourrais recommander pour démarrer Lor'Squad. Pas d'engagement — juste pour identifier qui pourrait être intéressé."
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

        {/* Cards prospects */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {recommendations.slice(0, effectiveVisible).map((item, index) => (
            <ProspectCard
              key={`prospect-${index}`}
              index={index}
              name={item.name}
              contact={item.contact}
              category={item.category}
              onNameChange={(v) => onChange(index, "name", v)}
              onContactChange={(v) => onChange(index, "contact", v)}
              onCategoryChange={(v) => onChange(index, "category", v)}
              onRemove={effectiveVisible > INITIAL_VISIBLE ? () => removeOne(index) : undefined}
              isMilestone5={index === 4 && filled >= 5}
              isMilestone10={index === 9 && filled >= 10}
            />
          ))}
        </div>

        {/* Bouton + Ajouter */}
        {effectiveVisible < MAX_RECOMMENDATIONS ? (
          <button
            type="button"
            onClick={addOne}
            style={{
              padding: "14px 18px",
              borderRadius: 14,
              background: "var(--ls-surface2)",
              border: "1px dashed color-mix(in srgb, var(--ls-purple) 40%, var(--ls-border))",
              color: "var(--ls-purple)",
              fontFamily: "DM Sans, sans-serif",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
              transition: "all 200ms cubic-bezier(0.4, 0, 0.2, 1)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background =
                "color-mix(in srgb, var(--ls-purple) 8%, var(--ls-surface2))";
              e.currentTarget.style.borderColor =
                "color-mix(in srgb, var(--ls-purple) 60%, transparent)";
              e.currentTarget.style.transform = "translateY(-1px)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "var(--ls-surface2)";
              e.currentTarget.style.borderColor =
                "color-mix(in srgb, var(--ls-purple) 40%, var(--ls-border))";
              e.currentTarget.style.transform = "none";
            }}
          >
            <span style={{ fontSize: 16, lineHeight: 1 }}>+</span>
            Ajouter une recommandation ({effectiveVisible}/{MAX_RECOMMENDATIONS})
          </button>
        ) : (
          <div
            style={{
              padding: "12px 16px",
              borderRadius: 12,
              background: "color-mix(in srgb, var(--ls-gold) 8%, var(--ls-surface2))",
              border: "0.5px solid color-mix(in srgb, var(--ls-gold) 30%, transparent)",
              fontSize: 12.5,
              color: "var(--ls-gold)",
              fontFamily: "DM Sans, sans-serif",
              fontWeight: 600,
              textAlign: "center",
            }}
          >
            🌟 Tu as atteint le max de 10 recommandations.
          </div>
        )}
      </AssessmentSectionV2>
    </div>
  );
}

// ─── Card prospect (style modale "Mode pratique VIP") ──────────────────────
interface ProspectCardProps {
  index: number;
  name: string;
  contact: string;
  category: RecommendationLead["category"];
  onNameChange: (value: string) => void;
  onContactChange: (value: string) => void;
  onCategoryChange: (value: string) => void;
  onRemove?: () => void;
  isMilestone5: boolean;
  isMilestone10: boolean;
}

function ProspectCard({
  index,
  name,
  contact,
  category,
  onNameChange,
  onContactChange,
  onCategoryChange,
  onRemove,
  isMilestone5,
  isMilestone10,
}: ProspectCardProps): ReactNode {
  const filled = name.trim().length > 0 || contact.trim().length > 0;
  const milestone: "gold" | "teal" | null = isMilestone10
    ? "gold"
    : isMilestone5
      ? "teal"
      : null;
  const accentColor =
    milestone === "gold"
      ? "var(--ls-gold)"
      : milestone === "teal"
        ? "var(--ls-teal)"
        : filled
          ? "var(--ls-purple)"
          : null;

  return (
    <div
      style={{
        position: "relative",
        padding: "16px 18px 14px",
        borderRadius: 16,
        background: filled
          ? "color-mix(in srgb, var(--ls-purple) 4%, var(--ls-surface))"
          : "var(--ls-surface)",
        border: accentColor
          ? `0.5px solid color-mix(in srgb, ${accentColor} 35%, var(--ls-border))`
          : "0.5px solid var(--ls-border)",
        transition: "all 280ms cubic-bezier(0.4, 0, 0.2, 1)",
      }}
    >
      {/* Milestone glow indicator (top-right corner) */}
      {milestone && accentColor ? (
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            top: -2,
            right: -2,
            padding: "3px 9px",
            borderRadius: 999,
            background: accentColor,
            color: "var(--ls-bg)",
            fontSize: 9,
            fontWeight: 800,
            fontFamily: "DM Sans, sans-serif",
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            boxShadow: `0 2px 8px color-mix(in srgb, ${accentColor} 40%, transparent)`,
          }}
        >
          {milestone === "gold" ? "🌟 Palier 2" : "🎁 Palier 1"}
        </div>
      ) : null}

      {/* Row 1 : numero + input prenom + bouton supprimer */}
      <div
        style={{
          display: "grid",
          gap: 12,
          gridTemplateColumns: "32px 1fr auto",
          alignItems: "center",
          marginBottom: 12,
        }}
      >
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: "50%",
            background: accentColor
              ? `linear-gradient(135deg, ${accentColor} 0%, color-mix(in srgb, ${accentColor} 70%, var(--ls-bg)) 100%)`
              : "var(--ls-surface2)",
            border: accentColor ? "none" : "0.5px solid var(--ls-border)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: "Syne, serif",
            fontWeight: 800,
            fontSize: 13,
            color: accentColor ? "var(--ls-bg)" : "var(--ls-text-hint)",
            boxShadow: accentColor
              ? `0 2px 8px color-mix(in srgb, ${accentColor} 35%, transparent)`
              : "none",
            transition: "all 280ms ease",
            flexShrink: 0,
          }}
        >
          {index + 1}
        </div>
        <input
          type="text"
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          placeholder="Prénom"
          style={{
            padding: "10px 14px",
            fontSize: 14,
            background: "var(--ls-input-bg)",
            border: "0.5px solid var(--ls-border)",
            borderRadius: 10,
            fontFamily: "DM Sans, sans-serif",
            color: "var(--ls-text)",
            width: "100%",
          }}
        />
        {onRemove ? (
          <button
            type="button"
            onClick={onRemove}
            aria-label="Vider cette recommandation"
            style={{
              width: 28,
              height: 28,
              borderRadius: 8,
              background: "transparent",
              border: "0.5px solid var(--ls-border)",
              color: "var(--ls-text-hint)",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 14,
              fontFamily: "DM Sans, sans-serif",
              transition: "all 180ms ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor =
                "color-mix(in srgb, var(--ls-coral) 60%, var(--ls-border))";
              e.currentTarget.style.color = "var(--ls-coral)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "var(--ls-border)";
              e.currentTarget.style.color = "var(--ls-text-hint)";
            }}
          >
            ✕
          </button>
        ) : null}
      </div>

      {/* Row 2 : input contact (telephone/reseau) */}
      <input
        type="text"
        value={contact}
        onChange={(e) => onContactChange(e.target.value)}
        placeholder="Téléphone ou réseau (optionnel)"
        style={{
          padding: "8px 12px",
          fontSize: 12.5,
          background: "var(--ls-input-bg)",
          border: "0.5px solid var(--ls-border)",
          borderRadius: 10,
          fontFamily: "DM Sans, sans-serif",
          color: "var(--ls-text)",
          width: "100%",
          marginBottom: 10,
        }}
      />

      {/* Row 3 : chips categorie */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 6,
        }}
      >
        {CATEGORIES.map((cat) => {
          const active = category === cat.value;
          return (
            <button
              key={cat.value}
              type="button"
              onClick={() => onCategoryChange(active ? "" : cat.value)}
              style={{
                padding: "5px 10px",
                borderRadius: 999,
                background: active
                  ? `color-mix(in srgb, ${cat.color} 16%, var(--ls-surface))`
                  : "var(--ls-surface2)",
                border: active
                  ? `0.5px solid ${cat.color}`
                  : "0.5px solid var(--ls-border)",
                color: active ? cat.color : "var(--ls-text-muted)",
                fontFamily: "DM Sans, sans-serif",
                fontSize: 11,
                fontWeight: active ? 700 : 500,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                transition: "all 200ms cubic-bezier(0.4, 0, 0.2, 1)",
                transform: active ? "scale(1.03)" : "scale(1)",
              }}
              onMouseEnter={(e) => {
                if (!active) {
                  e.currentTarget.style.borderColor = `color-mix(in srgb, ${cat.color} 40%, var(--ls-border))`;
                }
              }}
              onMouseLeave={(e) => {
                if (!active) {
                  e.currentTarget.style.borderColor = "var(--ls-border)";
                }
              }}
              aria-pressed={active}
            >
              <span aria-hidden="true" style={{ fontSize: 12 }}>
                {cat.emoji}
              </span>
              {cat.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
