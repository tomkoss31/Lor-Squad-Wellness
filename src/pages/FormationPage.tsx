// Chantier Centre de Formation V1 (2026-04-24).
// Liste des 4 catégories (Prospection / Bilan / Suivi / Business).

import { Link } from "react-router-dom";
import { PageHeading } from "../components/ui/PageHeading";
import { FORMATION_CATEGORIES } from "../data/formationContent";

const ACCENT_STYLES = {
  teal: { bg: "rgba(29,158,117,0.12)", border: "rgba(29,158,117,0.3)", color: "#1D9E75" },
  gold: { bg: "rgba(239,159,39,0.12)", border: "rgba(239,159,39,0.3)", color: "#BA7517" },
  magenta: { bg: "rgba(212,83,126,0.12)", border: "rgba(212,83,126,0.3)", color: "#D4537E" },
  violet: { bg: "rgba(167,139,250,0.14)", border: "rgba(167,139,250,0.35)", color: "#A78BFA" },
};

export function FormationPage() {
  return (
    <div className="space-y-6">
      <PageHeading
        eyebrow="Formation"
        title="Centre de formation"
        description="Progresser chaque jour — du premier RDV jusqu'au 100 clubs."
      />

      <div
        style={{
          display: "grid",
          gap: 14,
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
        }}
      >
        {FORMATION_CATEGORIES.map((cat) => {
          const acc = ACCENT_STYLES[cat.accent];
          return (
            <Link
              key={cat.slug}
              to={`/formation/${cat.slug}`}
              style={{
                display: "block",
                padding: 20,
                background: "var(--ls-surface)",
                border: `1px solid ${acc.border}`,
                borderRadius: 16,
                textDecoration: "none",
                transition: "transform 0.2s ease, box-shadow 0.2s ease",
                fontFamily: "DM Sans, sans-serif",
                color: "var(--ls-text)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-2px)";
                e.currentTarget.style.boxShadow = `0 4px 18px ${acc.bg}`;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "none";
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 12,
                    background: acc.bg,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 22,
                    flexShrink: 0,
                  }}
                >
                  {cat.emoji}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: "Syne, sans-serif", fontSize: 15, fontWeight: 700, color: "var(--ls-text)" }}>
                    {cat.title}
                  </div>
                  <div style={{ fontSize: 11, color: acc.color, fontWeight: 600, marginTop: 2 }}>
                    {cat.resources.length} ressource{cat.resources.length > 1 ? "s" : ""}
                  </div>
                </div>
                <span style={{ color: "var(--ls-text-muted)", fontSize: 18 }}>→</span>
              </div>
              <div style={{ fontSize: 13, color: "var(--ls-text-muted)", lineHeight: 1.55 }}>
                {cat.description}
              </div>
            </Link>
          );
        })}
      </div>

      <div
        style={{
          padding: "16px 18px",
          background: "rgba(239,159,39,0.08)",
          border: "1px solid rgba(239,159,39,0.25)",
          borderRadius: 14,
          fontSize: 13,
          color: "var(--ls-text)",
          lineHeight: 1.55,
        }}
      >
        <strong style={{ color: "#BA7517" }}>💡 Astuce :</strong> Le contenu s&apos;enrichit chaque mois.
        Demande à Thomas les dernières ressources si tu ne les trouves pas ici.
      </div>
    </div>
  );
}
