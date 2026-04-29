// EmptyState V2 PREMIUM (2026-04-29).
// Remplace les "Aucun resultat" plats par une carte premium avec :
//  - Emoji animation float subtle
//  - Halo radial subtle
//  - Title Syne + subtitle muted
//  - CTA gold gradient avec hover lift
//  - Variant compact (in-card) ou full (page-level)

interface EmptyStateProps {
  /** Emoji ou icone unicode (ex: "🌿", "📭", "🎯") */
  emoji: string;
  /** Titre court (Syne) */
  title: string;
  /** Sous-titre descriptif */
  description?: string;
  /** Label du CTA principal (gold), si fourni */
  ctaLabel?: string;
  /** Handler du CTA (sinon href) */
  onCta?: () => void;
  /** Lien du CTA (alternative a onCta) */
  ctaHref?: string;
  /** Compact : retire le padding pour usage in-card */
  compact?: boolean;
  /** Variant : 'default' = halo subtle / 'plain' = pas de halo (in card) */
  variant?: "default" | "plain";
}

export function EmptyState({
  emoji,
  title,
  description,
  ctaLabel,
  onCta,
  ctaHref,
  compact = false,
  variant = "default",
}: EmptyStateProps) {
  return (
    <>
      <style>{`
        @keyframes ls-empty-float {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          50%      { transform: translateY(-4px) rotate(2deg); }
        }
        @media (prefers-reduced-motion: reduce) {
          .ls-empty-emoji { animation: none !important; }
        }
      `}</style>
      <div
        style={{
          position: "relative",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: compact ? "28px 16px" : "56px 24px",
          textAlign: "center",
          gap: 14,
          borderRadius: variant === "default" ? 16 : 0,
          background: variant === "default"
            ? "radial-gradient(circle at 50% 30%, color-mix(in srgb, var(--ls-gold) 6%, var(--ls-surface)) 0%, var(--ls-surface) 70%)"
            : "transparent",
          border: variant === "default" ? "0.5px dashed var(--ls-border)" : "none",
        }}
      >
        {/* Halo behind emoji */}
        {variant === "default" && (
          <div
            aria-hidden
            style={{
              position: "absolute",
              top: compact ? 16 : 36,
              left: "50%",
              transform: "translateX(-50%)",
              width: compact ? 80 : 120,
              height: compact ? 80 : 120,
              borderRadius: "50%",
              background: "radial-gradient(circle, color-mix(in srgb, var(--ls-gold) 14%, transparent) 0%, transparent 70%)",
              pointerEvents: "none",
              filter: "blur(4px)",
            }}
          />
        )}

        <div
          className="ls-empty-emoji"
          style={{
            fontSize: compact ? 44 : 64,
            lineHeight: 1,
            position: "relative",
            animation: "ls-empty-float 4s ease-in-out infinite",
            filter: "drop-shadow(0 4px 12px rgba(0,0,0,0.12))",
          }}
        >
          {emoji}
        </div>
        <h3
          style={{
            position: "relative",
            fontFamily: "Syne, Georgia, serif",
            fontSize: compact ? 16 : 21,
            fontWeight: 800,
            margin: 0,
            color: "var(--ls-text)",
            letterSpacing: "-0.015em",
            lineHeight: 1.2,
          }}
        >
          {title}
        </h3>
        {description && (
          <p
            style={{
              position: "relative",
              fontSize: compact ? 12.5 : 13.5,
              color: "var(--ls-text-muted)",
              maxWidth: 380,
              lineHeight: 1.55,
              margin: 0,
              fontFamily: "DM Sans, sans-serif",
            }}
          >
            {description}
          </p>
        )}
        {ctaLabel && (onCta || ctaHref) && (
          <div style={{ position: "relative", marginTop: 4 }}>
            {ctaHref ? (
              <a
                href={ctaHref}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "10px 20px",
                  borderRadius: 999,
                  background: "linear-gradient(135deg, #EF9F27 0%, #BA7517 100%)",
                  color: "white",
                  fontSize: 13,
                  fontWeight: 700,
                  textDecoration: "none",
                  fontFamily: "DM Sans, sans-serif",
                  boxShadow: "0 6px 16px -4px rgba(186,117,23,0.45), inset 0 1px 0 rgba(255,255,255,0.20)",
                  transition: "transform 0.15s ease, filter 0.15s ease",
                  letterSpacing: "-0.005em",
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
                {ctaLabel}
                <span aria-hidden style={{ fontSize: 14 }}>→</span>
              </a>
            ) : (
              <button
                type="button"
                onClick={onCta}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "10px 20px",
                  borderRadius: 999,
                  background: "linear-gradient(135deg, #EF9F27 0%, #BA7517 100%)",
                  color: "white",
                  border: "none",
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: "pointer",
                  fontFamily: "DM Sans, sans-serif",
                  boxShadow: "0 6px 16px -4px rgba(186,117,23,0.45), inset 0 1px 0 rgba(255,255,255,0.20)",
                  transition: "transform 0.15s ease, filter 0.15s ease",
                  letterSpacing: "-0.005em",
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
                {ctaLabel}
                <span aria-hidden style={{ fontSize: 14 }}>→</span>
              </button>
            )}
          </div>
        )}
      </div>
    </>
  );
}
