// =============================================================================
// OgImageTemplate — Chantier #8 étape 8.8 (2026-05-24, pivot post @vercel/og).
// Template React 1200×630 capturé via html2canvas → upload Supabase Storage.
// =============================================================================
//
// Rendu offscreen via forwardRef pour permettre à AdminNewsletterEditPage
// de capturer le DOM avec html2canvas.
//
// Couleurs hardcodées (light cream brand) — pas le theme app coach.
// =============================================================================

import { forwardRef } from "react";

interface Props {
  title: string;
  subtitle: string | null;
  slug: string;
  templateKey: string | null;
  sentAt: string | null;
  isDraft?: boolean;
}

const PV = {
  gold: "#C9A84C",
  goldLight: "#E5C97D",
  teal: "#2DD4BF",
  tealDark: "#0F766E",
  charcoal: "#0B0D11",
  cream: "#FBF7F0",
  creamWarm: "#FAEEDA",
  text: "#1F2937",
  textMuted: "#4B5563",
};

function pickEmoji(templateKey: string | null, slug: string): string {
  if (templateKey === "summer-prep") return "☀️";
  if (templateKey === "back-to-school") return "🍂";
  if (templateKey === "winter-immunity") return "❄️";
  if (templateKey === "new-year-fresh") return "🌱";
  if (/ete|summer|juin|juillet|aout/i.test(slug)) return "☀️";
  if (/rentree|automne|septembre|octobre/i.test(slug)) return "🍂";
  if (/hiver|noel|decembre|janvier|fevrier/i.test(slug)) return "❄️";
  if (/printemps|mars|avril|mai/i.test(slug)) return "🌱";
  return "🌿";
}

function pickEditionLabel(sentAt: string | null, subtitle: string | null, isDraft: boolean): string {
  if (isDraft && !sentAt) return "PROCHAINE ÉDITION";
  if (subtitle && subtitle.length < 80) return subtitle.toUpperCase();
  if (sentAt) {
    const d = new Date(sentAt);
    return `Édition ${d.toLocaleDateString("fr-FR", { month: "long", year: "numeric" })}`.toUpperCase();
  }
  return "LA BASE 360 NEWS";
}

export const OgImageTemplate = forwardRef<HTMLDivElement, Props>(function OgImageTemplate(
  { title, subtitle, slug, templateKey, sentAt, isDraft = false },
  ref,
) {
  const emoji = pickEmoji(templateKey, slug);
  const editionLabel = pickEditionLabel(sentAt, subtitle, isDraft);

  return (
    <div
      ref={ref}
      style={{
        width: 1200,
        height: 630,
        background: `linear-gradient(135deg, ${PV.creamWarm} 0%, ${PV.cream} 100%)`,
        fontFamily: "'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif",
        color: PV.text,
        padding: "60px 72px",
        position: "relative",
        display: "flex",
        flexDirection: "column",
        boxSizing: "border-box",
        overflow: "hidden",
      }}
    >
      {/* Top wordmark + thin rule */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          paddingBottom: 22,
          borderBottom: `1px solid rgba(11,13,17,0.10)`,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 14,
            fontSize: 22,
            fontWeight: 700,
            letterSpacing: 4,
            color: PV.gold,
            textTransform: "uppercase",
            fontFamily: "'Syne', Georgia, serif",
          }}
        >
          <span>LA BASE</span>
          <span style={{ color: PV.gold }}>360</span>
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: 99,
              background: PV.teal,
              display: "inline-block",
            }}
          />
          <span style={{ color: PV.charcoal }}>NEWS</span>
        </div>
        <div
          style={{
            fontSize: 14,
            fontWeight: 600,
            letterSpacing: 2,
            color: PV.textMuted,
            textTransform: "uppercase",
          }}
        >
          BI-MENSUEL · WELLNESS
        </div>
      </div>

      {/* Main : flex row text + emoji */}
      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginTop: 32,
          gap: 48,
        }}
      >
        {/* Left text */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            flex: 1,
            maxWidth: 720,
          }}
        >
          <span
            style={{
              alignSelf: "flex-start",
              padding: "8px 16px",
              background: "rgba(45,212,191,0.14)",
              borderRadius: 999,
              fontSize: 14,
              fontWeight: 700,
              letterSpacing: 2.5,
              color: PV.tealDark,
              textTransform: "uppercase",
              marginBottom: 24,
            }}
          >
            {editionLabel}
          </span>

          <h1
            style={{
              fontSize: 78,
              fontWeight: 800,
              lineHeight: 1.05,
              color: PV.charcoal,
              letterSpacing: -1.5,
              margin: "0 0 20px",
              fontFamily: "'Syne', Georgia, serif",
            }}
          >
            {title}
          </h1>

          {subtitle && (
            <p
              style={{
                fontSize: 24,
                lineHeight: 1.4,
                color: PV.textMuted,
                fontWeight: 400,
                margin: 0,
                maxWidth: 640,
              }}
            >
              {subtitle}
            </p>
          )}
        </div>

        {/* Right emoji */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 280,
            width: 340,
            flexShrink: 0,
            lineHeight: 1,
          }}
        >
          {emoji}
        </div>
      </div>

      {/* Bottom tagline */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          paddingTop: 22,
          borderTop: `1px solid rgba(11,13,17,0.10)`,
          fontSize: 16,
          color: PV.textMuted,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: 99,
              background: PV.gold,
              display: "inline-block",
            }}
          />
          <span>Conseils nutrition & bien-être, sans pression</span>
        </div>
        <div
          style={{
            fontSize: 14,
            letterSpacing: 1.5,
            color: PV.textMuted,
            textTransform: "uppercase",
            fontWeight: 600,
          }}
        >
          labase360.fr/news
        </div>
      </div>
    </div>
  );
});
