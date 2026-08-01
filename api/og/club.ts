// =============================================================================
// api/og/club — Bannière de partage 1200×630 du site public Breakfast Club.
// @vercel/og (satori) — Edge runtime. Servie comme og:image par api/club-meta
// aux robots sociaux (WhatsApp, Instagram, Facebook, iMessage…).
//
// Design brand crème (#F7F1E6) : wordmark AVEC le cœur (logo-heart.png) + offre
// « body scan offert » + CTA orange. Pas de flou (satori ne le fait pas), radials
// doux jaune/orange rappelant les blobs du hero. Pas de JSX (React.createElement).
// =============================================================================

import { ImageResponse } from "@vercel/og";
import { createElement as h } from "react";

export const config = { runtime: "edge" };

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
  const origin = new URL(req.url).origin;
  const { searchParams } = new URL(req.url);
  const path = searchParams.get("path") ?? "club";

  // L'offre mise en avant varie légèrement selon la page partagée.
  const headline = path === "reserver" ? "TON BODY SCAN OFFERT" : "LE CLUB DU MATIN, À VERDUN";
  const cta = path === "reserver" ? "Réserver ma séance  →" : "Réserver mon body scan  →";

  const [anton, sora, inter] = await Promise.all([
    loadFont("https://cdn.jsdelivr.net/npm/@fontsource/anton@5.0.20/files/anton-latin-400-normal.woff", "Anton", 400),
    loadFont("https://cdn.jsdelivr.net/npm/@fontsource/sora@5.0.8/files/sora-latin-700-normal.woff", "Sora", 700),
    loadFont("https://cdn.jsdelivr.net/npm/@fontsource/inter@5.0.16/files/inter-latin-600-normal.woff", "Inter", 600),
  ]);
  const fonts = [anton, sora, inter].filter(Boolean) as Array<{ name: string; data: ArrayBuffer; weight: 400 | 600 | 700; style: "normal" }>;
  const display = anton ? "Anton" : sora ? "Sora" : "Inter";
  const body = inter ? "Inter" : display;

  const element = h(
    "div",
    {
      style: {
        width: 1200,
        height: 630,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "56px 70px",
        backgroundColor: "#F7F1E6",
        backgroundImage:
          "radial-gradient(circle at 14% 16%, rgba(241,226,126,0.55), transparent 44%), radial-gradient(circle at 88% 90%, rgba(224,83,42,0.20), transparent 46%)",
        color: "#17201C",
        fontFamily: body,
      },
    },
    // eyebrow
    h(
      "div",
      {
        style: {
          display: "flex",
          fontSize: 25,
          letterSpacing: 8,
          textTransform: "uppercase",
          color: "#E0532A",
          fontWeight: 600,
          marginBottom: 26,
        },
      },
      "Verdun · Ouverture prochaine",
    ),
    // wordmark avec le cœur
    h("img", {
      src: `${origin}/brand/breakfast-club/logo-heart.png`,
      width: 640,
      height: 404,
      style: { objectFit: "contain" },
    }),
    // accroche offre
    h(
      "div",
      {
        style: {
          display: "flex",
          fontFamily: display,
          fontSize: 58,
          lineHeight: 1,
          textTransform: "uppercase",
          color: "#17201C",
          marginTop: 14,
          textAlign: "center",
        },
      },
      headline,
    ),
    // sous-titre
    h(
      "div",
      { style: { display: "flex", fontSize: 28, color: "#5F7154", marginTop: 16 } },
      "Body scan + bilan bien-être, offerts et sans engagement.",
    ),
    // CTA pill
    h(
      "div",
      {
        style: {
          display: "flex",
          marginTop: 30,
          fontSize: 27,
          fontWeight: 600,
          color: "#ffffff",
          backgroundImage: "linear-gradient(135deg,#FF7A2F,#FF1E3C)",
          borderRadius: 999,
          padding: "17px 38px",
        },
      },
      cta,
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
