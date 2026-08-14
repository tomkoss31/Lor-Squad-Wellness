// =============================================================================
// api/og/club — Bannière de partage 1200×630 du site public Breakfast Club.
// @vercel/og (satori) — Edge runtime. Servie comme og:image par api/club-meta
// aux robots sociaux (WhatsApp, Instagram, Facebook, iMessage…).
//
// AUTO-SUFFISANTE : aucun fetch d'image externe (le fetch d'un asset depuis une
// preview protégée échoue sur le mur d'auth Vercel → logo vide + layout cassé).
// Wordmark rendu en TEXTE Anton + cœur dessiné en SVG inline (data URI). Fond
// crème brandé, offre « body scan offert », CTA orange. Calé pour tenir dans 630.
// Pas de JSX (React.createElement).
// =============================================================================

import { ImageResponse } from "@vercel/og";
import { createElement as h } from "react";

export const config = { runtime: "edge" };

// ⚠ RECOPIÉ DEPUIS src/data/clubOuverture.ts — les fonctions Vercel ne peuvent
// pas importer le front (même contrainte que le catalogue PV, cf. CLAUDE.md).
// Si la date change là-bas, la changer ici aussi : c'est écrit des deux côtés.
//
// Rappel utile le jour J : cette bannière est une IMAGE, et Facebook comme
// WhatsApp la gardent en cache longtemps. Un lien partagé avant le 7 septembre
// continuera d'afficher « ouverture le 7 septembre » après l'ouverture, jusqu'à
// ce que la plateforme la relise.
const CLUB_OUVERTURE = "2026-09-07";

function mentionOuverture(maintenant: Date = new Date()): string {
  const aujourdhui = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Paris",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(maintenant);
  if (aujourdhui >= CLUB_OUVERTURE) return "ouvert dès 7h";
  const [a, m, j] = CLUB_OUVERTURE.split("-").map(Number);
  const libelle = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long" })
    .format(new Date(Date.UTC(a, m - 1, j)));
  return `ouverture le ${libelle}`;
}

const HEART =
  "data:image/svg+xml," +
  encodeURIComponent(
    "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'><path d='M16 25.5C7.8 20.2 5.5 15.3 8.7 12.2c2.1-2 4.9-1.1 6.4 1.2l.9 1.4.9-1.4c1.5-2.3 4.3-3.2 6.4-1.2 3.2 3.1.9 8-7.3 13.3z' fill='#E5352B'/></svg>",
  );

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
  const path = searchParams.get("path") ?? "club";

  const offer =
    path === "reserver"
      ? "Ton body scan + bilan bien-être, offerts."
      : "Le club du matin de Verdun · body scan offert.";
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
        padding: "48px 70px",
        backgroundColor: "#F7F1E6",
        backgroundImage:
          "radial-gradient(circle at 15% 20%, rgba(241,226,126,0.55), transparent 45%), radial-gradient(circle at 85% 86%, rgba(224,83,42,0.18), transparent 46%)",
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
          fontSize: 24,
          letterSpacing: 8,
          textTransform: "uppercase",
          color: "#E0532A",
          fontWeight: 600,
          marginBottom: 20,
        },
      },
      `Verdun · ${mentionOuverture()}`,
    ),
    // « The ♥ »
    h(
      "div",
      { style: { display: "flex", alignItems: "flex-start", fontFamily: display, fontSize: 44, color: "#17201C", lineHeight: 1 } },
      "THE",
      h("img", { src: HEART, width: 30, height: 30, style: { marginLeft: 8, marginTop: -4 } }),
    ),
    // « BREAKFAST CLUB »
    h(
      "div",
      { style: { display: "flex", fontFamily: display, fontSize: 96, lineHeight: 0.92, color: "#17201C", textTransform: "uppercase" } },
      "Breakfast Club",
    ),
    // by La Base
    h(
      "div",
      { style: { display: "flex", fontSize: 22, letterSpacing: 5, textTransform: "uppercase", color: "#5F7154", marginTop: 8 } },
      "by La Base",
    ),
    // offre
    h(
      "div",
      { style: { display: "flex", fontSize: 31, color: "#3A443F", marginTop: 26, textAlign: "center" } },
      offer,
    ),
    // CTA pill
    h(
      "div",
      {
        style: {
          display: "flex",
          marginTop: 26,
          fontSize: 27,
          fontWeight: 600,
          color: "#ffffff",
          backgroundImage: "linear-gradient(135deg,#FF7A2F,#FF1E3C)",
          borderRadius: 999,
          padding: "16px 38px",
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
