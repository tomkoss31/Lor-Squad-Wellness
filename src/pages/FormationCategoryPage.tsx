// Chantier Centre de Formation V1 (2026-04-24).
// Page détail /formation/:slug — liste ressources avec embed YouTube
// ou download PDF selon le type. Source : données statiques
// src/data/formationContent.ts (pas de DB en V1).

import { useMemo, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { PageHeading } from "../components/ui/PageHeading";
import {
  FORMATION_CATEGORIES,
  getFormationCategory,
  type FormationResource,
} from "../data/formationContent";

const ACCENT_STYLES = {
  teal: { bg: "rgba(29,158,117,0.12)", border: "rgba(29,158,117,0.3)", color: "#1D9E75" },
  gold: { bg: "rgba(239,159,39,0.12)", border: "rgba(239,159,39,0.3)", color: "#BA7517" },
  magenta: { bg: "rgba(212,83,126,0.12)", border: "rgba(212,83,126,0.3)", color: "#D4537E" },
  violet: { bg: "rgba(167,139,250,0.14)", border: "rgba(167,139,250,0.35)", color: "#A78BFA" },
} as const;

export function FormationCategoryPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [videoId, setVideoId] = useState<string | null>(null);

  const category = useMemo(() => (slug ? getFormationCategory(slug) : undefined), [slug]);

  if (!category) {
    return (
      <div className="space-y-4" style={{ padding: 20 }}>
        <p style={{ color: "var(--ls-text-muted)" }}>
          Catégorie introuvable.{" "}
          <Link to="/formation" style={{ color: "var(--ls-gold)" }}>Retour au catalogue</Link>
        </p>
      </div>
    );
  }

  const acc = ACCENT_STYLES[category.accent];

  function handleResourceClick(r: FormationResource) {
    if (r.videoId) setVideoId(r.videoId);
    else if (r.pdfUrl) window.open(r.pdfUrl, "_blank", "noopener,noreferrer");
  }

  return (
    <div className="space-y-6">
      <button
        type="button"
        onClick={() => navigate("/formation")}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          padding: "6px 10px",
          borderRadius: 8,
          background: "transparent",
          border: "none",
          color: "var(--ls-text-muted)",
          cursor: "pointer",
          fontSize: 12,
          fontFamily: "DM Sans, sans-serif",
        }}
      >
        ← Toutes les catégories
      </button>

      <PageHeading
        eyebrow={`Formation · ${category.emoji}`}
        title={category.title}
        description={category.description}
      />

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {category.resources.map((r) => (
          <button
            key={r.id}
            type="button"
            onClick={() => handleResourceClick(r)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 14,
              padding: "14px 16px",
              background: "var(--ls-surface)",
              border: "1px solid var(--ls-border)",
              borderRadius: 14,
              cursor: "pointer",
              fontFamily: "DM Sans, sans-serif",
              color: "var(--ls-text)",
              textAlign: "left",
              transition: "transform 0.2s, border-color 0.2s, box-shadow 0.2s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-1px)";
              e.currentTarget.style.borderColor = acc.border;
              e.currentTarget.style.boxShadow = `0 4px 14px ${acc.bg}`;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.borderColor = "var(--ls-border)";
              e.currentTarget.style.boxShadow = "none";
            }}
          >
            <div
              aria-hidden="true"
              style={{
                width: 44,
                height: 44,
                borderRadius: 11,
                background: acc.bg,
                color: acc.color,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                fontSize: 20,
              }}
            >
              {r.videoId ? "▶" : "📄"}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: "var(--ls-text)", marginBottom: 2 }}>
                {r.title}
              </div>
              <div style={{ fontSize: 12, color: "var(--ls-text-muted)", lineHeight: 1.45 }}>
                {r.description}
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 6, flexWrap: "wrap" }}>
                {r.tag ? (
                  <span
                    style={{
                      fontSize: 10,
                      padding: "2px 7px",
                      borderRadius: 999,
                      background: acc.bg,
                      color: acc.color,
                      fontWeight: 600,
                    }}
                  >
                    {r.tag}
                  </span>
                ) : null}
                {r.durationMin ? (
                  <span style={{ fontSize: 10, color: "var(--ls-text-hint)" }}>
                    ⏱ {r.durationMin} min
                  </span>
                ) : null}
                {r.pdfUrl ? (
                  <span style={{ fontSize: 10, color: "var(--ls-text-hint)" }}>
                    📎 PDF
                  </span>
                ) : null}
              </div>
            </div>
            <span style={{ color: "var(--ls-text-muted)", fontSize: 18, flexShrink: 0 }}>→</span>
          </button>
        ))}
      </div>

      {/* Video modal */}
      {videoId ? (
        <div
          role="button"
          tabIndex={0}
          aria-label="Fermer la vidéo"
          onClick={() => setVideoId(null)}
          onKeyDown={(e) => {
            if (e.key === "Escape") setVideoId(null);
          }}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.85)",
            backdropFilter: "blur(6px)",
            zIndex: 10000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            style={{
              width: "100%",
              maxWidth: 900,
              aspectRatio: "16/9",
              borderRadius: 16,
              overflow: "hidden",
              boxShadow: "0 24px 64px rgba(0,0,0,0.5)",
            }}
          >
            <iframe
              src={`https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`}
              title="Formation"
              width="100%"
              height="100%"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              style={{ border: "none", display: "block" }}
            />
          </div>
        </div>
      ) : null}

      {/* Nav autres catégories */}
      <div
        style={{
          padding: "14px 16px",
          background: "var(--ls-surface)",
          border: "1px solid var(--ls-border)",
          borderRadius: 14,
        }}
      >
        <div
          style={{
            fontSize: 10,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: "var(--ls-text-muted)",
            fontWeight: 700,
            marginBottom: 10,
          }}
        >
          Autres catégories
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {FORMATION_CATEGORIES.filter((c) => c.slug !== slug).map((c) => (
            <Link
              key={c.slug}
              to={`/formation/${c.slug}`}
              style={{
                padding: "6px 12px",
                borderRadius: 999,
                background: "var(--ls-surface2)",
                border: "1px solid var(--ls-border)",
                color: "var(--ls-text)",
                textDecoration: "none",
                fontSize: 12,
                fontWeight: 500,
              }}
            >
              {c.emoji} {c.title}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
