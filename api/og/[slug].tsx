// =============================================================================
// /api/og/[slug] — Chantier #8 étape 8.8 (2026-05-24).
// Vercel Edge Function : génère dynamiquement une image OG 1200×630 PNG
// pour chaque newsletter (partage WhatsApp/FB/Twitter/Insta).
// =============================================================================
//
// URL : /api/og/preparation-ete-2026  →  PNG 1200×630
// Fetch newsletter par slug depuis Supabase (anon RLS = sent + public)
// Render JSX → ImageResponse (satori + resvg sous le capot)
//
// Caching : Vercel CDN 1h + s-maxage 24h (les newsletters changent pas après envoi)
// =============================================================================

import { ImageResponse } from "@vercel/og";

export const config = {
  runtime: "edge",
};

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
  textHint: "#9CA3AF",
};

// Detect emoji héro depuis template_key + fallback selon date
function pickEmoji(templateKey: string | null, slug: string): string {
  if (templateKey === "summer-prep") return "☀️";
  if (templateKey === "back-to-school") return "🍂";
  if (templateKey === "winter-immunity") return "❄️";
  if (templateKey === "new-year-fresh") return "🌱";
  if (/ete|summer|juin|juillet|aout/i.test(slug)) return "☀️";
  if (/rentree|automne|septembre|octobre/i.test(slug)) return "🍂";
  if (/hiver|noel|decembre|janvier|fevrier/i.test(slug)) return "❄️";
  if (/printemps|mars|avril|mai/i.test(slug)) return "🌱";
  return "🌿"; // fallback wellness générique
}

function pickEditionLabel(sentAt: string | null, subtitle: string | null): string {
  if (subtitle && subtitle.length < 80) return subtitle;
  if (sentAt) {
    const d = new Date(sentAt);
    return `Édition ${d.toLocaleDateString("fr-FR", { month: "long", year: "numeric" })}`.toUpperCase();
  }
  return "LA BASE 360 NEWS";
}

export default async function handler(req: Request) {
  const { searchParams, pathname } = new URL(req.url);
  // Vercel param routing : [slug] dans l'URL, mais on accepte aussi ?slug=
  const pathSlug = pathname.split("/").pop()?.replace(/\.png$/, "") ?? "";
  const slug = (searchParams.get("slug") ?? pathSlug).trim();

  if (!slug) {
    return new Response("missing_slug", { status: 400 });
  }

  // Fetch newsletter via Supabase REST (anon key, RLS permet sent+public)
  const supabaseUrl = process.env.VITE_SUPABASE_URL?.trim() ?? "";
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY?.trim() ?? "";
  if (!supabaseUrl || !anonKey) {
    return new Response("supabase_misconfigured", { status: 500 });
  }

  const restUrl = `${supabaseUrl}/rest/v1/newsletters?select=title,subtitle,sent_at,template_key,status,is_public&slug=eq.${encodeURIComponent(slug)}&status=eq.sent&is_public=eq.true&limit=1`;
  let row: {
    title?: string;
    subtitle?: string | null;
    sent_at?: string | null;
    template_key?: string | null;
  } | null = null;

  try {
    const res = await fetch(restUrl, {
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${anonKey}`,
      },
    });
    if (!res.ok) {
      return new Response(`supabase_${res.status}`, { status: 502 });
    }
    const rows = (await res.json()) as Array<typeof row>;
    row = rows?.[0] ?? null;
  } catch (_e) {
    return new Response("fetch_failed", { status: 502 });
  }

  // Si newsletter pas trouvée, on génère un OG générique
  const title = row?.title ?? "La Base 360 News";
  const subtitle = row?.subtitle ?? null;
  const emoji = pickEmoji(row?.template_key ?? null, slug);
  const editionLabel = pickEditionLabel(row?.sent_at ?? null, subtitle);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: `linear-gradient(135deg, ${PV.creamWarm} 0%, ${PV.cream} 100%)`,
          fontFamily: "DM Sans, sans-serif",
          color: PV.text,
          padding: "60px 72px",
          position: "relative",
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
                display: "block",
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

        {/* Main content : flex row, text left, emoji right */}
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
          {/* Left text zone */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              flex: 1,
              maxWidth: 720,
            }}
          >
            <div
              style={{
                display: "inline-flex",
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
            </div>

            <div
              style={{
                fontSize: 84,
                fontWeight: 800,
                lineHeight: 1.05,
                color: PV.charcoal,
                letterSpacing: -1.5,
                marginBottom: 20,
                display: "flex",
              }}
            >
              {title}
            </div>

            {subtitle && subtitle !== editionLabel && (
              <div
                style={{
                  fontSize: 26,
                  lineHeight: 1.4,
                  color: PV.textMuted,
                  fontWeight: 400,
                  display: "flex",
                  maxWidth: 640,
                }}
              >
                {subtitle}
              </div>
            )}
          </div>

          {/* Right emoji zone */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 280,
              width: 340,
              flexShrink: 0,
              lineHeight: 1,
              opacity: 0.95,
            }}
          >
            {emoji}
          </div>
        </div>

        {/* Bottom : tagline + brand mark */}
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
                display: "block",
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
    ),
    {
      width: 1200,
      height: 630,
      headers: {
        // Cache 1h CDN, 24h stale-while-revalidate
        "Cache-Control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800",
      },
    },
  );
}
