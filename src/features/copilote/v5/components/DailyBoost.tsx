// =============================================================================
// DailyBoost — citation motivante du jour (2026-05-05)
//
// Affichée dans la partie droite du hero éditorial, sous le countdown.
// Citation Cormorant italic, décorée de guillemets gold, label Cinzel.
// Border-top transparent (séparateur subtil avec le block countdown).
//
// Validation Thomas (2026-05-05) :
//   - Fond TRANSPARENT + border-top 1px (pas de card avec bg)
//   - Label Cinzel gold encadré de ✦
//   - Guillemets décoratifs gold avant/après
//   - Auteur Cinzel gris clair en bas, aligné droite
//
// Si la rentabilité est en alerte critique (PvActionPlanAlert visible),
// on peut "alléger" le Daily Boost via la prop `dimmed` (parent décide).
// =============================================================================

import type { DailyQuote } from "../lib/pick-quote-of-day";

interface DailyBoostProps {
  quote: DailyQuote | null;
  /** Si true, opacity réduite (utilisé quand alerte PV concurrente). */
  dimmed?: boolean;
  /** True si la quote provient d'un previewQuoteId admin (pour debug visuel). */
  isPreview?: boolean;
}

export function DailyBoost({ quote, dimmed = false, isPreview = false }: DailyBoostProps) {
  if (!quote) {
    // Skippe silencieusement (le hero peut survivre sans Daily Boost si
    // la table est vide ou si erreur fetch — le countdown reste seul)
    return null;
  }

  return (
    <div
      style={{
        ...wrapperStyle,
        opacity: dimmed ? 0.5 : 1,
        transition: "opacity 0.3s ease",
      }}
    >
      {/* V7 Phase 8 (2026-05-08) : la classe .v5-cinzel est retiree —
          le label utilise desormais var(--lb360-mono) inline.
          Le ✦ accent passe en emerald (au lieu de gold #D4A937). */}
      <div style={labelStyle}>
        <span style={accentStarStyle}>✦</span>
        Daily Boost
        <span style={accentStarStyle}>✦</span>
        {isPreview && (
          <span style={previewBadgeStyle} title="Preview admin (?previewQuoteId)">
            preview
          </span>
        )}
      </div>

      <p style={quoteStyle} className="v5-daily-quote">{quote.quote}</p>

      {quote.author && (
        <div style={authorStyle}>
          — {quote.author}
        </div>
      )}
    </div>
  );
}

// ─── Styles inline-scoped ──────────────────────────────────────────────────

const wrapperStyle: React.CSSProperties = {
  // Validation Thomas 2026-05-05 : virer la borderTop au-dessus du
  // Daily Boost, le pin AWT respire mieux sans la barre qui le coupe.
  paddingTop: 18,
  background: "transparent",
};

// V7 Phase 8 : tokens passes en var(--lb360-*) + couleurs G3
// (au lieu de gold #D4A937 / beige #F5DEB3 V5).
const labelStyle: React.CSSProperties = {
  fontFamily: "var(--lb360-mono, 'JetBrains Mono', monospace)",
  fontSize: 10,
  letterSpacing: "0.18em",
  color: "color-mix(in srgb, #10B981 60%, white)",
  textTransform: "uppercase",
  fontWeight: 500,
  marginBottom: 10,
  display: "flex",
  alignItems: "center",
  gap: 7,
};

const accentStarStyle: React.CSSProperties = {
  color: "color-mix(in srgb, #10B981 75%, white)",
};

const quoteStyle: React.CSSProperties = {
  fontFamily: "var(--lb360-display-serif, 'Fraunces', 'Cormorant Garamond', serif)",
  fontSize: 16,
  fontStyle: "italic",
  color: "rgba(241, 245, 249, 0.88)",
  lineHeight: 1.5,
  fontWeight: 400,
  margin: 0,
  display: "block",
  // Border-left subtle gradient G3 pour donner du relief a la quote
  borderLeft: "2px solid color-mix(in srgb, #10B981 50%, transparent)",
  paddingLeft: 16,
  maxWidth: "44ch",
};

const authorStyle: React.CSSProperties = {
  fontFamily: "var(--lb360-mono, 'JetBrains Mono', monospace)",
  fontSize: 10,
  letterSpacing: "0.16em",
  color: "rgba(241, 245, 249, 0.5)",
  textTransform: "uppercase",
  marginTop: 10,
  textAlign: "right",
  fontWeight: 500,
};

const previewBadgeStyle: React.CSSProperties = {
  marginLeft: "auto",
  fontFamily: "var(--lb360-mono, 'JetBrains Mono', monospace)",
  fontSize: 8,
  letterSpacing: 0.5,
  background: "color-mix(in srgb, #10B981 15%, transparent)",
  color: "color-mix(in srgb, #10B981 80%, white)",
  border: "1px solid color-mix(in srgb, #10B981 30%, transparent)",
  padding: "2px 6px",
  borderRadius: 4,
  textTransform: "lowercase",
};

// ─── Note styling ─────────────────────────────────────────────────────────
// Les guillemets décoratifs «...» du brief HTML sont en pseudo-éléments CSS
// (::before / ::after). Comme on est en inline-style, on doit soit :
//   1. Encapsuler dans un span avec classe .v5-quote (CSS dans copilote-v5.css)
//   2. Ajouter manuellement « et » dans le texte
//
// On va opter pour 1. Si le composant DailyBoost est utilisé hors `.copilote-v5`
// les guillemets seront simplement absents (fallback discret).
//
// Ajouter dans copilote-v5.css :
//   .copilote-v5 .v5-daily-quote::before {
//     content: '«';
//     color: #D4A937;
//     font-size: 22px;
//     margin-right: 4px;
//     vertical-align: -3px;
//   }
//   .copilote-v5 .v5-daily-quote::after { content: '»'; ... }
