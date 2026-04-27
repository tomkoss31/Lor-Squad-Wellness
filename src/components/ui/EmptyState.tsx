// =============================================================================
// EmptyState — composant generique pour les zones vides (Polish, 2026-04-29)
// =============================================================================
//
// Remplace les "Aucun resultat" et "Pas encore de donnees" par une vraie
// experience visuelle : grosse illustration emoji + titre Syne + sous-titre
// + CTA gold optionnel.
//
// Utilise dans /clients (filtre vide), /agenda (pas de RDV), /messages
// (inbox vide), etc.
// =============================================================================

interface EmptyStateProps {
  /** Emoji ou icone unicode (ex: "🌿", "📭", "🎯") */
  emoji: string;
  /** Titre court (Syne 18px) */
  title: string;
  /** Sous-titre descriptif (DM Sans 13px muted) */
  description?: string;
  /** Label du CTA principal (gold), si fourni */
  ctaLabel?: string;
  /** Handler du CTA (sinon href) */
  onCta?: () => void;
  /** Lien du CTA (alternative a onCta) */
  ctaHref?: string;
  /** Compact : retire le padding pour usage in-card */
  compact?: boolean;
}

export function EmptyState({
  emoji,
  title,
  description,
  ctaLabel,
  onCta,
  ctaHref,
  compact = false,
}: EmptyStateProps) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: compact ? "24px 16px" : "48px 24px",
        textAlign: "center",
        gap: 12,
      }}
    >
      <div style={{ fontSize: compact ? 40 : 56, lineHeight: 1, opacity: 0.85 }}>
        {emoji}
      </div>
      <h3
        style={{
          fontFamily: "Syne, Georgia, serif",
          fontSize: compact ? 16 : 20,
          fontWeight: 500,
          margin: 0,
          color: "var(--ls-text)",
        }}
      >
        {title}
      </h3>
      {description && (
        <p
          style={{
            fontSize: 13,
            color: "var(--ls-text-muted)",
            maxWidth: 360,
            lineHeight: 1.55,
            margin: 0,
          }}
        >
          {description}
        </p>
      )}
      {ctaLabel && (onCta || ctaHref) && (
        <div style={{ marginTop: 4 }}>
          {ctaHref ? (
            <a
              href={ctaHref}
              style={{
                display: "inline-block",
                padding: "10px 18px",
                borderRadius: 10,
                background: "linear-gradient(135deg, #B8922A, #BA7517)",
                color: "white",
                fontSize: 13,
                fontWeight: 500,
                textDecoration: "none",
                fontFamily: "DM Sans, sans-serif",
              }}
            >
              {ctaLabel}
            </a>
          ) : (
            <button
              type="button"
              onClick={onCta}
              style={{
                padding: "10px 18px",
                borderRadius: 10,
                background: "linear-gradient(135deg, #B8922A, #BA7517)",
                color: "white",
                border: "none",
                fontSize: 13,
                fontWeight: 500,
                cursor: "pointer",
                fontFamily: "DM Sans, sans-serif",
              }}
            >
              {ctaLabel}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
