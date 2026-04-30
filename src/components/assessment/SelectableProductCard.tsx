// SelectableProductCard V2 PREMIUM SANDBOX (2026-04-29).
// Refonte du rendu "default" avec :
//   - Emoji avatar 48px gradient gold contextual (par nom produit)
//   - Hover lift -2px + ring glow color
//   - Bouton "+ Ajouter" gold gradient / "✓ Dans le panier" teal quand selected
//   - Pills colorees (jours = blue muted, prix = gold, PV = teal)
//   - Border-left 3px qui change de couleur selon l'etat (recommended/selected)
//   - Quantity stepper inline visible quand selected
//
// Le variant "compact" (boosters) reste inchange.
//
// Regles : var(--ls-*) uniquement, Syne + DM Sans, theme-aware light/dark.

import { QuantityStepper } from "./QuantityStepper";
import "./SelectableProductCard.css";

export interface SelectableProductCardProps {
  id: string;
  name: string;
  shortBenefit: string;
  prixPublic: number;
  pv: number;
  quantityLabel?: string;
  dureeReferenceJours?: number;
  /** Recommendation badge (⭐ + teal bg). Purely visual. */
  highlight?: { reason?: string };
  selected: boolean;
  onToggle: () => void;
  /** Quantity controls — if provided, shows stepper. */
  quantity?: number;
  onQuantityChange?: (q: number) => void;
  minQuantity?: number;
  maxQuantity?: number;
  /**
   * Variant d'affichage (2026-04-27).
   * - `default` (omis) : rendu sandbox premium V2 (besoins / upsells / app client).
   * - `compact` : rendu grille compacte 3 etats (boosters sport step Programme).
   */
  variant?: "default" | "compact";
}

function formatPriceEuro(value: number) {
  return `${value.toFixed(2).replace(".", ",")}€`;
}

function formatPv(value: number) {
  return `${value.toFixed(1)} PV`;
}

/**
 * Mapping emoji -> nom produit (sandbox V2 — 2026-04-29).
 * Match sur lowercase + accents pour robustesse. Ordre = priorite (premier match gagne).
 */
const PRODUCT_EMOJI_MAP: Array<{ match: RegExp; emoji: string }> = [
  { match: /formula\s*1|f1\b|boisson nutritionnelle/i, emoji: "🥛" },
  { match: /melange.*proteine|formula\s*3|ppp\b/i, emoji: "💪" },
  { match: /formula\s*2|multivit/i, emoji: "💊" },
  { match: /aloe/i, emoji: "🌿" },
  { match: /\bthe\b|tea\b/i, emoji: "🍵" },
  { match: /hydrate/i, emoji: "💧" },
  { match: /calcium|xtra[-\s]?cal/i, emoji: "🦴" },
  { match: /collag/i, emoji: "✨" },
  { match: /liftoff/i, emoji: "⚡" },
  { match: /cr7|n-r-g|nrg/i, emoji: "🏆" },
  { match: /cell.*activ/i, emoji: "🧬" },
  { match: /niteworks/i, emoji: "🌙" },
  { match: /omega|fish/i, emoji: "🐟" },
  { match: /iron|roseguard/i, emoji: "🛡️" },
  { match: /skin|beaut/i, emoji: "💎" },
  { match: /snack|barre|bar\b/i, emoji: "🍫" },
  { match: /soup|soupe/i, emoji: "🍲" },
  { match: /fibre|cell.*u.*loss/i, emoji: "🌾" },
  { match: /shaker|gourde/i, emoji: "🥤" },
  { match: /creatine/i, emoji: "💥" },
];

function getProductEmoji(name: string): string {
  for (const { match, emoji } of PRODUCT_EMOJI_MAP) {
    if (match.test(name)) return emoji;
  }
  return "💊"; // fallback
}

export function SelectableProductCard({
  id: _id,
  name,
  shortBenefit,
  prixPublic,
  pv,
  quantityLabel,
  dureeReferenceJours,
  highlight,
  selected,
  onToggle,
  quantity,
  onQuantityChange,
  minQuantity = 1,
  maxQuantity = 10,
  variant = "default",
}: SelectableProductCardProps) {
  const isRec = Boolean(highlight);
  const showStepper =
    typeof quantity === "number" && typeof onQuantityChange === "function" && selected;

  // ─── Variant compact (inchange) ─────────────────────────────────────
  if (variant === "compact") {
    const stateClass = selected
      ? "spc-compact--selected"
      : isRec
        ? "spc-compact--recommended"
        : "spc-compact--neutral";
    const ctaClass = selected
      ? "spc-compact__cta--selected"
      : isRec
        ? "spc-compact__cta--recommended"
        : "spc-compact__cta--neutral";
    const ctaLabel = selected ? "✓ Retenu" : isRec ? "Retenir ★" : "Retenir";
    return (
      <div className={`spc-compact ${stateClass}`}>
        {isRec ? (
          <span className="spc-compact__star" aria-hidden="true">
            ★
          </span>
        ) : null}
        <div className="spc-compact__content">
          <p className="spc-compact__title">{name}</p>
          <p className="spc-compact__subtitle">{shortBenefit}</p>
          <p className="spc-compact__price">+{formatPriceEuro(prixPublic)}</p>
          {isRec && !selected && highlight?.reason ? (
            <p className="spc-compact__reason">{highlight.reason}</p>
          ) : null}
        </div>
        <div className="spc-compact__actions">
          {showStepper ? (
            <div className="spc-compact__stepper-wrap">
              <QuantityStepper
                value={quantity as number}
                min={minQuantity}
                max={maxQuantity}
                onChange={onQuantityChange as (n: number) => void}
              />
            </div>
          ) : null}
          <button
            type="button"
            onClick={onToggle}
            aria-pressed={selected}
            className={`spc-compact__cta ${ctaClass}`}
          >
            {ctaLabel}
          </button>
        </div>
      </div>
    );
  }

  // ─── Variant default — REFONTE SANDBOX V2 (2026-04-29) ───────────────
  const emoji = getProductEmoji(name);

  // Couleur d'accent : teal si selected, gold si recommended, gris sinon
  const accentColor = selected
    ? "var(--ls-teal)"
    : isRec
      ? "var(--ls-gold)"
      : "var(--ls-border)";
  const accentHex = selected ? "#2DD4BF" : isRec ? "#EF9F27" : "transparent";

  return (
    // eslint-disable-next-line jsx-a11y/no-static-element-interactions -- Hover effect only, button inside handles selection
    <div
      style={{
        position: "relative",
        display: "flex",
        gap: 14,
        padding: "14px 16px",
        borderRadius: 16,
        background: selected
          ? "linear-gradient(135deg, color-mix(in srgb, var(--ls-teal) 8%, var(--ls-surface)) 0%, var(--ls-surface) 70%)"
          : isRec
            ? "linear-gradient(135deg, color-mix(in srgb, var(--ls-gold) 8%, var(--ls-surface)) 0%, var(--ls-surface) 70%)"
            : "var(--ls-surface)",
        border: `0.5px solid ${selected ? "color-mix(in srgb, var(--ls-teal) 35%, transparent)" : "var(--ls-border)"}`,
        borderLeft: `3px solid ${accentColor}`,
        transition: "transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease",
        boxShadow: selected
          ? "0 4px 14px -6px rgba(45,212,191,0.30)"
          : isRec
            ? "0 4px 14px -6px rgba(239,159,39,0.20)"
            : "none",
        cursor: "default",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-2px)";
        if (!selected && !isRec) {
          e.currentTarget.style.boxShadow = "0 6px 18px -8px rgba(0,0,0,0.18)";
          e.currentTarget.style.borderColor = "color-mix(in srgb, var(--ls-gold) 25%, var(--ls-border))";
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "none";
        if (!selected && !isRec) {
          e.currentTarget.style.boxShadow = "none";
          e.currentTarget.style.borderColor = "var(--ls-border)";
        }
      }}
    >
      {/* Star badge recommended */}
      {isRec && !selected && (
        <span
          style={{
            position: "absolute",
            top: 8,
            right: 10,
            fontSize: 13,
            color: "var(--ls-gold)",
            filter: "drop-shadow(0 1px 2px rgba(239,159,39,0.40))",
          }}
          aria-label="Recommandé"
          title={highlight?.reason ?? "Recommandé"}
        >
          ⭐
        </span>
      )}

      {/* Avatar emoji premium */}
      <div
        style={{
          width: 52,
          height: 52,
          flexShrink: 0,
          borderRadius: 14,
          background: selected
            ? "linear-gradient(135deg, var(--ls-teal) 0%, color-mix(in srgb, var(--ls-teal) 70%, #000) 100%)"
            : isRec
              ? "linear-gradient(135deg, #EF9F27 0%, #BA7517 100%)"
              : "linear-gradient(135deg, color-mix(in srgb, var(--ls-gold) 18%, var(--ls-surface2)) 0%, var(--ls-surface2) 100%)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 28,
          boxShadow: selected
            ? "0 4px 12px -4px rgba(45,212,191,0.45), inset 0 1px 0 rgba(255,255,255,0.20)"
            : isRec
              ? "0 4px 12px -4px rgba(239,159,39,0.45), inset 0 1px 0 rgba(255,255,255,0.20)"
              : "inset 0 1px 0 rgba(255,255,255,0.05)",
          border: selected || isRec ? "none" : "0.5px solid var(--ls-border)",
          transition: "transform 0.25s ease, background 0.25s ease",
        }}
      >
        {emoji}
      </div>

      {/* Contenu principal */}
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontFamily: "Syne, serif",
                fontSize: 15,
                fontWeight: 700,
                color: "var(--ls-text)",
                letterSpacing: "-0.01em",
                lineHeight: 1.25,
              }}
            >
              {name}
            </div>
            <div
              style={{
                fontFamily: "DM Sans, sans-serif",
                fontSize: 12.5,
                color: "var(--ls-text-muted)",
                marginTop: 3,
                lineHeight: 1.45,
              }}
            >
              {shortBenefit}
            </div>
            {isRec && !selected && highlight?.reason && (
              <div
                style={{
                  fontFamily: "DM Sans, sans-serif",
                  fontSize: 11,
                  color: "var(--ls-gold)",
                  fontStyle: "italic",
                  marginTop: 4,
                  lineHeight: 1.4,
                }}
              >
                💡 {highlight.reason}
              </div>
            )}
          </div>

          {/* CTA bouton */}
          <button
            type="button"
            onClick={onToggle}
            aria-pressed={selected}
            style={{
              flexShrink: 0,
              minHeight: 38,
              padding: "8px 14px",
              borderRadius: 999,
              border: "none",
              cursor: "pointer",
              fontFamily: "DM Sans, sans-serif",
              fontSize: 12.5,
              fontWeight: 700,
              letterSpacing: "-0.005em",
              transition: "transform 0.15s ease, box-shadow 0.15s ease, filter 0.15s ease",
              background: selected
                ? "linear-gradient(135deg, var(--ls-teal) 0%, color-mix(in srgb, var(--ls-teal) 75%, #000) 100%)"
                : "linear-gradient(135deg, #EF9F27 0%, #BA7517 100%)",
              color: "#FFFFFF",
              boxShadow: selected
                ? "0 4px 10px -3px rgba(45,212,191,0.45)"
                : "0 4px 10px -3px rgba(186,117,23,0.40)",
              whiteSpace: "nowrap",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-1px)";
              e.currentTarget.style.filter = "brightness(1.08)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "none";
              e.currentTarget.style.filter = "none";
            }}
          >
            {selected ? "✓ Dans le panier" : "+ Ajouter"}
          </button>
        </div>

        {/* Pills d'info */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
          {quantityLabel && (
            <span
              style={{
                fontSize: 11,
                fontWeight: 600,
                padding: "3px 10px",
                borderRadius: 999,
                background: "var(--ls-surface2)",
                color: "var(--ls-text-muted)",
                fontFamily: "DM Sans, sans-serif",
                border: "0.5px solid var(--ls-border)",
              }}
            >
              {quantityLabel}
            </span>
          )}
          {typeof dureeReferenceJours === "number" && dureeReferenceJours > 0 && (
            <span
              style={{
                fontSize: 11,
                fontWeight: 600,
                padding: "3px 10px",
                borderRadius: 999,
                background: "color-mix(in srgb, var(--ls-purple) 12%, transparent)",
                color: "var(--ls-purple)",
                fontFamily: "DM Sans, sans-serif",
                border: "0.5px solid color-mix(in srgb, var(--ls-purple) 30%, transparent)",
              }}
            >
              📅 {dureeReferenceJours}j
            </span>
          )}
          <span
            style={{
              fontSize: 11.5,
              fontWeight: 700,
              padding: "3px 10px",
              borderRadius: 999,
              background: "color-mix(in srgb, var(--ls-gold) 14%, transparent)",
              color: "var(--ls-gold)",
              fontFamily: "DM Sans, sans-serif",
              border: "0.5px solid color-mix(in srgb, var(--ls-gold) 35%, transparent)",
            }}
          >
            {formatPriceEuro(prixPublic)}
          </span>
          {pv > 0 && (
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                padding: "3px 10px",
                borderRadius: 999,
                background: "color-mix(in srgb, var(--ls-teal) 12%, transparent)",
                color: "var(--ls-teal)",
                fontFamily: "DM Sans, sans-serif",
                border: "0.5px solid color-mix(in srgb, var(--ls-teal) 30%, transparent)",
              }}
            >
              {formatPv(pv)}
            </span>
          )}
          {showStepper && (
            <div style={{ marginLeft: "auto" }}>
              <QuantityStepper
                value={quantity as number}
                min={minQuantity}
                max={maxQuantity}
                onChange={onQuantityChange as (n: number) => void}
              />
            </div>
          )}
        </div>
      </div>

      {/* Glow ring quand selected (utilise accentHex) */}
      {selected && (
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: 16,
            pointerEvents: "none",
            boxShadow: `inset 0 0 0 1px ${accentHex}40`,
          }}
        />
      )}
    </div>
  );
}
