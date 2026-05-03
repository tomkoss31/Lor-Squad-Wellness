// =============================================================================
// FormationToolkitDetailPage — page detail d un outil format=page
// (chantier toolkit, 2026-11-04)
//
// Route /formation/boite-a-outils/:slug
// Affiche un FormationToolkitItem en pleine page (vs popup pour scripts).
// Pour les fiches premium type "Visio à 3", "Liste 100 méthode FRANK",
// "Bases présentiel bilan", etc.
//
// Hero header avec breadcrumb + tag + emoji + titre Syne XL + description
// Markdown rendu via MarkdownRenderer
// Section scripts copiables (si présents) en cards individuelles avec
// bouton Copier (réutilise le pattern de ToolkitItemPopup mais inline).
// =============================================================================

import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  getToolkitItemBySlug,
  type FormationToolkitItem,
} from "../data/formation";
import { MarkdownRenderer } from "../components/formation/MarkdownRenderer";

const CATEGORY_ACCENT: Record<FormationToolkitItem["category"], string> = {
  prospection: "var(--ls-gold)",
  bilan: "var(--ls-teal)",
  suivi: "var(--ls-purple)",
  business: "var(--ls-coral)",
};

const CATEGORY_LABEL: Record<FormationToolkitItem["category"], string> = {
  prospection: "Prospection",
  bilan: "Bilan",
  suivi: "Suivi",
  business: "Business",
};

export function FormationToolkitDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

  const item = slug ? getToolkitItemBySlug(slug) : undefined;

  if (!item) {
    return (
      <div style={{ padding: 40, textAlign: "center", fontFamily: "DM Sans, sans-serif" }}>
        <p style={{ color: "var(--ls-text-muted)", marginBottom: 20 }}>
          Outil introuvable.
        </p>
        <button
          type="button"
          onClick={() => navigate("/formation/boite-a-outils")}
          style={{
            padding: "10px 18px",
            background: "var(--ls-gold)",
            color: "var(--ls-bg)",
            border: "none",
            borderRadius: 10,
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          ← Retour à la boîte à outils
        </button>
      </div>
    );
  }

  const accent = CATEGORY_ACCENT[item.category];

  function copyScript(text: string, idx: number) {
    if (typeof navigator === "undefined" || !navigator.clipboard) return;
    void navigator.clipboard.writeText(text).then(() => {
      setCopiedIdx(idx);
      window.setTimeout(() => setCopiedIdx(null), 1800);
    });
  }

  return (
    <div className="space-y-6" style={{ paddingBottom: 60, fontFamily: "DM Sans, sans-serif" }}>
      {/* Breadcrumb */}
      <nav
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          fontSize: 12,
          color: "var(--ls-text-muted)",
          flexWrap: "wrap",
        }}
      >
        <button
          type="button"
          onClick={() => navigate("/formation")}
          style={{
            background: "transparent",
            border: "none",
            color: "var(--ls-text-muted)",
            cursor: "pointer",
            fontFamily: "inherit",
            fontSize: "inherit",
            padding: 0,
          }}
        >
          Formation
        </button>
        <span aria-hidden="true">›</span>
        <button
          type="button"
          onClick={() => navigate("/formation/boite-a-outils")}
          style={{
            background: "transparent",
            border: "none",
            color: "var(--ls-text-muted)",
            cursor: "pointer",
            fontFamily: "inherit",
            fontSize: "inherit",
            padding: 0,
          }}
        >
          Boîte à outils
        </button>
        <span aria-hidden="true">›</span>
        <span style={{ color: accent, fontWeight: 600 }}>{CATEGORY_LABEL[item.category]}</span>
      </nav>

      {/* Hero header */}
      <header
        style={{
          position: "relative",
          padding: "28px 30px 30px",
          borderRadius: 22,
          background: `linear-gradient(135deg, color-mix(in srgb, ${accent} 12%, var(--ls-surface)) 0%, var(--ls-surface) 100%)`,
          border: `0.5px solid color-mix(in srgb, ${accent} 30%, var(--ls-border))`,
          boxShadow: `0 8px 28px -16px color-mix(in srgb, ${accent} 35%, transparent)`,
          overflow: "hidden",
        }}
      >
        {/* Glow ambient */}
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            top: -50,
            right: -50,
            width: 200,
            height: 200,
            borderRadius: "50%",
            background: `color-mix(in srgb, ${accent} 18%, transparent)`,
            filter: "blur(56px)",
            pointerEvents: "none",
          }}
        />

        {/* Tag + meta */}
        <div style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap", position: "relative" }}>
          <span
            style={{
              fontSize: 9.5,
              fontWeight: 700,
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              padding: "4px 10px",
              borderRadius: 999,
              background: `color-mix(in srgb, ${accent} 18%, transparent)`,
              color: accent,
              border: `0.5px solid color-mix(in srgb, ${accent} 35%, transparent)`,
            }}
          >
            {item.tag}
          </span>
          <span
            style={{
              fontSize: 9.5,
              fontWeight: 600,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              padding: "4px 10px",
              borderRadius: 999,
              background: "var(--ls-surface2)",
              color: "var(--ls-text-muted)",
              border: "0.5px solid var(--ls-border)",
            }}
          >
            ⏱ {item.durationMin} min
          </span>
        </div>

        {/* Icon + title */}
        <div style={{ display: "flex", alignItems: "flex-start", gap: 18, position: "relative" }}>
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 18,
              background: `linear-gradient(135deg, ${accent} 0%, color-mix(in srgb, ${accent} 70%, var(--ls-bg)) 100%)`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 32,
              boxShadow: `0 6px 18px color-mix(in srgb, ${accent} 40%, transparent), inset 0 1px 0 rgba(255,255,255,0.40)`,
              flexShrink: 0,
            }}
            aria-hidden="true"
          >
            {item.icon}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h1
              style={{
                fontFamily: "Syne, serif",
                fontWeight: 800,
                fontSize: "clamp(22px, 3.6vw, 32px)",
                letterSpacing: "-0.025em",
                lineHeight: 1.15,
                color: "var(--ls-text)",
                margin: 0,
                marginBottom: 8,
              }}
            >
              {item.title}
            </h1>
            <p
              style={{
                fontSize: "clamp(13px, 1.8vw, 15px)",
                color: "var(--ls-text-muted)",
                lineHeight: 1.55,
                margin: 0,
                maxWidth: 640,
              }}
            >
              {item.description}
            </p>
          </div>
        </div>
      </header>

      {/* Markdown content */}
      <article
        style={{
          padding: "24px 28px",
          background: "var(--ls-surface)",
          border: "0.5px solid var(--ls-border)",
          borderRadius: 18,
        }}
      >
        <MarkdownRenderer content={item.contentMarkdown} />
      </article>

      {/* Scripts pack (si présents) */}
      {item.scripts && item.scripts.length > 0 ? (
        <section style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              paddingBottom: 10,
              borderBottom: `0.5px solid color-mix(in srgb, ${accent} 22%, var(--ls-border))`,
            }}
          >
            <span style={{ fontSize: 18 }} aria-hidden="true">
              📋
            </span>
            <h2
              style={{
                fontFamily: "Syne, serif",
                fontWeight: 700,
                fontSize: 18,
                margin: 0,
                color: accent,
                letterSpacing: "-0.012em",
              }}
            >
              Scripts copier-coller · {item.scripts.length}
            </h2>
          </div>
          {item.scripts.map((script, idx) => {
            const isCopied = copiedIdx === idx;
            return (
              <div
                key={idx}
                style={{
                  padding: "16px 18px",
                  borderRadius: 14,
                  background: "var(--ls-surface)",
                  border: `0.5px solid color-mix(in srgb, ${accent} 14%, var(--ls-border))`,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 12,
                    marginBottom: 10,
                    flexWrap: "wrap",
                  }}
                >
                  <span
                    style={{
                      fontSize: 13,
                      fontWeight: 700,
                      color: "var(--ls-text)",
                    }}
                  >
                    {script.label}
                  </span>
                  <button
                    type="button"
                    onClick={() => copyScript(script.text, idx)}
                    style={{
                      padding: "6px 14px",
                      borderRadius: 999,
                      background: isCopied
                        ? accent
                        : `color-mix(in srgb, ${accent} 14%, var(--ls-surface2))`,
                      border: isCopied
                        ? `0.5px solid ${accent}`
                        : `0.5px solid color-mix(in srgb, ${accent} 35%, transparent)`,
                      color: isCopied ? "var(--ls-bg)" : accent,
                      fontFamily: "DM Sans, sans-serif",
                      fontSize: 11,
                      fontWeight: 700,
                      cursor: "pointer",
                      transition: "all 200ms ease",
                      letterSpacing: "0.02em",
                    }}
                  >
                    {isCopied ? "✓ Copié" : "📋 Copier"}
                  </button>
                </div>
                <pre
                  style={{
                    margin: 0,
                    padding: "14px 16px",
                    borderRadius: 10,
                    background: "var(--ls-surface2)",
                    border: "0.5px solid var(--ls-border)",
                    color: "var(--ls-text)",
                    fontFamily: "DM Sans, sans-serif",
                    fontSize: 13,
                    lineHeight: 1.6,
                    whiteSpace: "pre-wrap",
                    wordWrap: "break-word",
                  }}
                >
                  {script.text}
                </pre>
                {script.note ? (
                  <p
                    style={{
                      fontSize: 11.5,
                      color: "var(--ls-text-muted)",
                      fontStyle: "italic",
                      margin: "10px 0 0",
                      lineHeight: 1.5,
                      paddingLeft: 8,
                      borderLeft: `2px solid color-mix(in srgb, ${accent} 30%, transparent)`,
                    }}
                  >
                    💡 {script.note}
                  </p>
                ) : null}
              </div>
            );
          })}
        </section>
      ) : null}

      {/* Back CTA */}
      <div style={{ display: "flex", justifyContent: "center", marginTop: 12 }}>
        <button
          type="button"
          onClick={() => navigate("/formation/boite-a-outils")}
          style={{
            padding: "12px 24px",
            borderRadius: 12,
            background: "transparent",
            border: `1px solid ${accent}`,
            color: accent,
            fontFamily: "DM Sans, sans-serif",
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          ← Tous les outils
        </button>
      </div>
    </div>
  );
}
