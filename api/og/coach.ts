// =============================================================================
// api/og/coach — Bannière de partage 1200×630 générée à la volée (#13-B B.2c).
// @vercel/og (satori) — Edge runtime. Rendue pour les robots sociaux via
// l'og:image de api/coach-meta. Design net premium (satori ne fait pas le flou) :
// mesh dégradés radiaux teal/violet/coral + photo + prénom + accroche club +250
// + CTA. Données via RPC publique get_coach_credibility_by_slug.
//
// Pas de JSX (React.createElement) → aucun réglage de build. Polices chargées
// depuis jsDelivr (woff, supporté par satori) avec fallback police par défaut.
// =============================================================================

import { ImageResponse } from "@vercel/og";
import { createElement as h } from "react";

export const config = { runtime: "edge" };

const SOCIAL_PROOF = "+250 personnes accompagnées chaque mois";

function normalizeSlug(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]/g, "")
    .trim();
}

async function loadFont(url: string, name: string, weight: 400 | 600 | 700) {
  try {
    const r = await fetch(url);
    if (!r.ok) return null;
    const data = await r.arrayBuffer();
    return { name, data, weight, style: "normal" as const };
  } catch {
    return null;
  }
}

export default async function handler(req: Request): Promise<Response> {
  const { searchParams } = new URL(req.url);
  const slug = normalizeSlug(searchParams.get("slug") ?? "");

  let firstName = slug ? slug.charAt(0).toUpperCase() + slug.slice(1) : "Coach";
  let city: string | null = null;
  let avatarUrl: string | null = null;

  try {
    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const anonKey = process.env.VITE_SUPABASE_ANON_KEY;
    if (supabaseUrl && anonKey && slug.length >= 2) {
      const r = await fetch(`${supabaseUrl}/rest/v1/rpc/get_coach_credibility_by_slug`, {
        method: "POST",
        headers: {
          apikey: anonKey,
          Authorization: `Bearer ${anonKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ p_slug: slug }),
      });
      if (r.ok) {
        const d: any = await r.json();
        if (d && d.first_name) {
          firstName = String(d.first_name);
          city = d.city ?? null;
          avatarUrl = d.avatar_url ?? null;
        }
      }
    }
  } catch {
    /* fallback : valeurs par défaut ci-dessus */
  }

  const [sora, inter] = await Promise.all([
    loadFont("https://cdn.jsdelivr.net/npm/@fontsource/sora@5.0.8/files/sora-latin-700-normal.woff", "Sora", 700),
    loadFont("https://cdn.jsdelivr.net/npm/@fontsource/inter@5.0.16/files/inter-latin-600-normal.woff", "Inter", 600),
  ]);
  const fonts = [sora, inter].filter(Boolean) as Array<{ name: string; data: ArrayBuffer; weight: 400 | 600 | 700; style: "normal" }>;

  const display = sora ? "Sora" : "Inter";

  const avatarNode = avatarUrl
    ? h("img", {
        src: avatarUrl,
        width: 320,
        height: 320,
        style: { borderRadius: 9999, objectFit: "cover", border: "6px solid rgba(255,255,255,0.14)" },
      })
    : h(
        "div",
        {
          style: {
            width: 320,
            height: 320,
            borderRadius: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundImage: "linear-gradient(135deg,#2DD4BF,#7C3AED)",
            fontSize: 150,
            fontWeight: 700,
            color: "#fff",
            fontFamily: display,
          },
        },
        firstName.charAt(0).toUpperCase(),
      );

  const element = h(
    "div",
    {
      style: {
        width: 1200,
        height: 630,
        display: "flex",
        alignItems: "center",
        gap: 64,
        padding: "0 90px",
        backgroundColor: "#0B0D11",
        backgroundImage:
          "radial-gradient(circle at 12% 18%, rgba(45,212,191,0.45), transparent 42%), radial-gradient(circle at 90% 86%, rgba(167,139,250,0.42), transparent 45%), radial-gradient(circle at 80% 6%, rgba(251,113,133,0.30), transparent 40%)",
        color: "#FBF7F0",
        fontFamily: inter ? "Inter" : display,
      },
    },
    avatarNode,
    h(
      "div",
      { style: { display: "flex", flexDirection: "column", flex: 1 } },
      h(
        "div",
        {
          style: {
            display: "flex",
            alignItems: "center",
            fontSize: 24,
            letterSpacing: 6,
            textTransform: "uppercase",
            color: "rgba(251,247,240,0.62)",
            fontFamily: display,
            marginBottom: 16,
          },
        },
        "La Base 360 · Coach",
      ),
      h("div", { style: { display: "flex", fontSize: 100, fontWeight: 700, fontFamily: display, lineHeight: 1 } }, firstName),
      h(
        "div",
        { style: { display: "flex", fontSize: 40, fontFamily: display, color: "rgba(251,247,240,0.86)", marginTop: 16 } },
        city ? `Coach bien-être à ${city}` : "Coach bien-être",
      ),
      h(
        "div",
        {
          style: {
            display: "flex",
            alignItems: "center",
            marginTop: 30,
            fontSize: 26,
            fontWeight: 600,
            color: "#FBF7F0",
            backgroundColor: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.16)",
            borderRadius: 999,
            padding: "14px 28px",
          },
        },
        h("div", { style: { width: 14, height: 14, borderRadius: 9999, backgroundColor: "#2DD4BF", marginRight: 14 } }),
        SOCIAL_PROOF,
      ),
      h(
        "div",
        {
          style: {
            display: "flex",
            marginTop: 22,
            fontSize: 24,
            fontWeight: 600,
            color: "#0B0D11",
            backgroundImage: "linear-gradient(135deg,#2DD4BF,#7C3AED)",
            borderRadius: 16,
            padding: "16px 30px",
          },
        },
        "Faire mon bilan gratuit  →",
      ),
    ),
  );

  return new ImageResponse(element, {
    width: 1200,
    height: 630,
    ...(fonts.length ? { fonts } : {}),
    headers: {
      "Cache-Control": "public, max-age=0, s-maxage=86400, stale-while-revalidate=604800",
    },
  });
}
