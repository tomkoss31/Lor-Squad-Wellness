// LegalFooter — petit footer in-page (2026-04-30)
// Discret, en bas du contenu de chaque page principale (Co-pilote, /pv, etc.).
// Affiche : "© AppName · CompanyName · Mentions · Confidentialité"
// Theme-aware var(--ls-*).

import { Link } from "react-router-dom";
import { APP_NAME_FULL, COMPANY_NAME } from "../../lib/branding";

export function LegalFooter() {
  return (
    <footer
      style={{
        marginTop: 32,
        paddingTop: 16,
        borderTop: "0.5px dashed var(--ls-border)",
        textAlign: "center",
        fontSize: 11,
        color: "var(--ls-text-hint)",
        fontFamily: "DM Sans, sans-serif",
        display: "flex",
        flexWrap: "wrap",
        justifyContent: "center",
        gap: 8,
        alignItems: "center",
      }}
    >
      <span>© {APP_NAME_FULL}</span>
      <span aria-hidden style={{ opacity: 0.5 }}>·</span>
      <span>{COMPANY_NAME}</span>
      <span aria-hidden style={{ opacity: 0.5 }}>·</span>
      <Link
        to="/legal/mentions"
        style={{
          color: "var(--ls-text-muted)",
          textDecoration: "none",
          transition: "color 0.15s ease",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.color = "var(--ls-gold)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.color = "var(--ls-text-muted)";
        }}
      >
        Mentions
      </Link>
      <span aria-hidden style={{ opacity: 0.5 }}>·</span>
      <Link
        to="/legal/confidentialite"
        style={{
          color: "var(--ls-text-muted)",
          textDecoration: "none",
          transition: "color 0.15s ease",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.color = "var(--ls-gold)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.color = "var(--ls-text-muted)";
        }}
      >
        Confidentialité
      </Link>
    </footer>
  );
}
