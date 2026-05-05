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
      <div style={labelStyle} className="v5-cinzel">
        <span style={{ color: "#D4A937" }}>✦</span>
        Daily Boost
        <span style={{ color: "#D4A937" }}>✦</span>
        {isPreview && (
          <span style={previewBadgeStyle} title="Preview admin (?previewQuoteId)">
            preview
          </span>
        )}
      </div>

      <p style={quoteStyle} className="v5-daily-quote">{quote.quote}</p>

      {quote.author && (
        <div style={authorStyle} className="v5-cinzel">
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

const labelStyle: React.CSSProperties = {
  fontFamily: "Cinzel, serif",
  fontSize: 9,
  letterSpacing: "3px",
  color: "#D4A937",
  textTransform: "uppercase",
  fontWeight: 600,
  marginBottom: 8,
  display: "flex",
  alignItems: "center",
  gap: 7,
};

const quoteStyle: React.CSSProperties = {
  fontFamily: "'Cormorant Garamond', serif",
  fontSize: 14.5,
  fontStyle: "italic",
  color: "rgba(245, 222, 179, 0.88)",
  lineHeight: 1.45,
  fontWeight: 500,
  margin: 0,
  // Décor : guillemets gold avant/après via ::before/::after en classe ?
  // Inline CSS ne supporte pas pseudo-elements, on injecte les guillemets
  // manuellement dans le texte.
  display: "block",
};

const authorStyle: React.CSSProperties = {
  fontFamily: "Cinzel, serif",
  fontSize: 9,
  letterSpacing: "2px",
  color: "rgba(245, 222, 179, 0.5)",
  textTransform: "uppercase",
  marginTop: 8,
  textAlign: "right",
  fontWeight: 500,
};

const previewBadgeStyle: React.CSSProperties = {
  marginLeft: "auto",
  fontFamily: "JetBrains Mono, monospace",
  fontSize: 8,
  letterSpacing: 0.5,
  background: "rgba(212, 169, 55, 0.15)",
  color: "#F5DEB3",
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
