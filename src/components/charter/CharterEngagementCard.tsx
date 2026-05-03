// Card "engagement" — variant gold (default) ou teal (pour Mon pourquoi).
// Supporte un body figé OU un mode fillable (textarea + hint).

import type { CharterDisplayMode } from "../../types/charter";

interface Props {
  icon: string;
  title: string;
  variant?: "gold" | "teal";
  /** Texte fixe de l'engagement (cards 1-3). */
  body?: string;
  /** Mode fillable : hint + textarea (cards 4-5 pourquoi/objectif). */
  hint?: string;
  fillableValue?: string;
  fillablePlaceholder?: string;
  onFillableChange?: (v: string) => void;
  mode: CharterDisplayMode;
}

const VARIANT_BG: Record<"gold" | "teal", string> = {
  gold:
    "linear-gradient(135deg, rgba(255, 252, 240, 0.85) 0%, rgba(245, 237, 211, 0.75) 100%)",
  teal:
    "linear-gradient(135deg, rgba(240, 250, 245, 0.85) 0%, rgba(230, 243, 238, 0.8) 100%)",
};

const VARIANT_BORDER: Record<"gold" | "teal", string> = {
  gold: "#B8922A",
  teal: "#1D9E75",
};

const VARIANT_TITLE_COLOR: Record<"gold" | "teal", string> = {
  gold: "#2A2419",
  teal: "#14704F",
};

const VARIANT_HINT_COLOR: Record<"gold" | "teal", string> = {
  gold: "#8B6F1F",
  teal: "rgba(20, 112, 79, 0.75)",
};

const ICON_GRADIENT: Record<"gold" | "teal", string> = {
  gold:
    "radial-gradient(circle at 32% 28%, #FFF4D4 0%, #F5DEB3 18%, #B8922A 55%, #8B6F1F 100%)",
  teal:
    "radial-gradient(circle at 32% 28%, #C5F0DD 0%, #6FD4AE 20%, #1D9E75 60%, #14704F 100%)",
};

const ICON_SHADOW: Record<"gold" | "teal", string> = {
  gold:
    "inset 0 -2px 4px rgba(90, 70, 18, 0.4), inset 0 2px 3px rgba(255, 244, 212, 0.4), 0 3px 8px rgba(184, 146, 42, 0.35)",
  teal:
    "inset 0 -2px 4px rgba(20, 112, 79, 0.4), inset 0 2px 3px rgba(197, 240, 221, 0.4), 0 3px 8px rgba(29, 158, 117, 0.35)",
};

export function CharterEngagementCard({
  icon,
  title,
  variant = "gold",
  body,
  hint,
  fillableValue,
  fillablePlaceholder,
  onFillableChange,
  mode,
}: Props) {
  const isFillable = mode === "fillable" && hint !== undefined;
  return (
    <div
      style={{
        background: VARIANT_BG[variant],
        borderLeft: `3px solid ${VARIANT_BORDER[variant]}`,
        padding: "18px 22px",
        borderRadius: 4,
        boxShadow:
          variant === "gold"
            ? "0 1px 3px rgba(184, 146, 42, 0.1), 0 1px 0 rgba(255,255,255,0.6) inset, 0 0 0 1px rgba(184, 146, 42, 0.1)"
            : "0 1px 3px rgba(29, 158, 117, 0.12), 0 1px 0 rgba(255,255,255,0.6) inset",
        position: "relative",
        backdropFilter: "blur(2px)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 8 }}>
        <div
          style={{
            width: 42,
            height: 42,
            borderRadius: "50%",
            background: ICON_GRADIENT[variant],
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 19,
            boxShadow: ICON_SHADOW[variant],
            flexShrink: 0,
            position: "relative",
          }}
          aria-hidden="true"
        >
          {icon}
          <span
            style={{
              position: "absolute",
              inset: 3,
              borderRadius: "50%",
              border: "1px solid rgba(255, 244, 212, 0.35)",
              pointerEvents: "none",
            }}
          />
        </div>
        <h2
          style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: 22,
            fontWeight: 700,
            color: VARIANT_TITLE_COLOR[variant],
            letterSpacing: 0.2,
            lineHeight: 1,
            margin: 0,
          }}
        >
          {title}
        </h2>
      </div>

      {body && !hint && (
        <p
          style={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize: 13.5,
            lineHeight: 1.55,
            color: "#4A3F2A",
            fontWeight: 400,
            margin: 0,
          }}
        >
          {body}
        </p>
      )}

      {hint && (
        <>
          <p
            style={{
              fontFamily: "'Cormorant Garamond', serif",
              fontStyle: "italic",
              fontSize: 13,
              color: VARIANT_HINT_COLOR[variant],
              marginBottom: 8,
              marginTop: 0,
            }}
          >
            {hint}
          </p>
          {isFillable ? (
            <textarea
              value={fillableValue ?? ""}
              onChange={(e) => onFillableChange?.(e.target.value)}
              placeholder={fillablePlaceholder}
              rows={2}
              style={{
                background: variant === "teal" ? "rgba(255, 255, 255, 0.65)" : "rgba(255, 255, 255, 0.55)",
                border: `1px dashed ${variant === "teal" ? "rgba(29, 158, 117, 0.4)" : "rgba(184, 146, 42, 0.35)"}`,
                borderRadius: 3,
                width: "100%",
                minHeight: 54,
                padding: "10px 12px",
                fontFamily: "'Cormorant Garamond', serif",
                fontStyle: "italic",
                fontSize: 14,
                color: "#2A2419",
                resize: "vertical",
                outline: "none",
                boxSizing: "border-box",
              }}
            />
          ) : (
            <div
              style={{
                background: variant === "teal" ? "rgba(255, 255, 255, 0.65)" : "rgba(255, 255, 255, 0.55)",
                border: `1px dashed ${variant === "teal" ? "rgba(29, 158, 117, 0.4)" : "rgba(184, 146, 42, 0.35)"}`,
                borderRadius: 3,
                minHeight: 42,
                marginTop: 6,
                padding: fillableValue ? "10px 12px" : 0,
                fontFamily: "'Cormorant Garamond', serif",
                fontStyle: "italic",
                fontSize: 14,
                color: "#2A2419",
                whiteSpace: "pre-wrap",
              }}
            >
              {fillableValue ?? ""}
            </div>
          )}
        </>
      )}
    </div>
  );
}
