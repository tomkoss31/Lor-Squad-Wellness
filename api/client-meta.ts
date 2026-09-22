// =============================================================================
// api/client-meta — l'aperçu d'un lien d'espace membre (/client/<jeton>).
//
// Pourquoi (22/09/2026) : Thomas envoie à Gwen, membre du club, son lien
// personnel sur Telegram → l'aperçu affichait l'ANCIEN logo La Base 360 et
// « Bilan bien-être offert + suivi perso », la publicité de l'app. Les robots
// des messageries (Telegram, WhatsApp, iMessage…) ne lisent pas le JavaScript :
// sans cette page, ils prennent les balises génériques d'index.html.
//
// vercel.json route UNIQUEMENT les robots (via `has` user-agent) vers cette
// fonction ; un humain garde l'espace membre normal. L'habillage suit celui de
// l'espace : le Breakfast Club pour une membre du club (`clients.ebe_bbc`, la
// règle même de ClientAppPage), La Base 360 sinon — lu par la RPC
// `apercu_espace_membre`, qui ne rend QUE 'club' | 'app' | null (aucun nom,
// aucune donnée : un aperçu se voit par tous ceux qui voient le message).
//
// ⚠️ Lien PERSONNEL : `noindex, nofollow`, jamais de canonical vers le jeton,
// jamais de nom dans le titre. EDGE runtime (le plafond Hobby de 12 fonctions
// serverless est atteint ; les edge n'y comptent pas).
// =============================================================================

export const config = { runtime: "edge" };

function esc(input: unknown): string {
  return String(input ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const JETON = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** 'club' | 'app' | null — la base décide, en moins de 2,5 s, sinon La Base 360. */
async function habillage(token: string): Promise<"club" | "app" | null> {
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !anonKey || !JETON.test(token)) return null;
  const ctrl = new AbortController();
  const minuterie = setTimeout(() => ctrl.abort(), 2500);
  try {
    const r = await fetch(`${supabaseUrl}/rest/v1/rpc/apercu_espace_membre`, {
      method: "POST",
      headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ p_token: token }),
      signal: ctrl.signal,
    });
    if (!r.ok) return null;
    const v = await r.json();
    return v === "club" || v === "app" ? v : null;
  } catch {
    return null;
  } finally {
    clearTimeout(minuterie);
  }
}

export default async function handler(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const token = (url.searchParams.get("token") ?? "").trim();
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? "www.labase360.fr";
  const proto = req.headers.get("x-forwarded-proto") ?? "https";

  const club = (await habillage(token)) === "club";

  const title = club ? "Ton espace membre · The Breakfast Club" : "Ton espace · La Base 360";
  const description = club
    ? "Ta carte, ton journal, tes résultats et ton coach : tout ton suivi du club, au même endroit."
    : "Ton suivi, ton journal et tes résultats, avec ton coach, au même endroit.";
  const siteName = club ? "The Breakfast Club by La Base" : "La Base 360";
  // Nouvelle adresse d'image (?v=2) : Telegram et WhatsApp gardent une image en
  // mémoire d'après son ADRESSE — l'ancienne montrait encore l'ancien logo.
  const image = club
    ? `${proto}://${host}/api/og/club?path=membre`
    : `${proto}://${host}/brand/labase360/og-image-1200x630.png?v=2`;
  const icone = club ? "/brand/breakfast-club/favicon.svg" : "/brand/labase360/favicon.svg";
  const alt = club ? "The Breakfast Club · ton espace membre" : "La Base 360 — ton espace";

  const html = `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8" />
<title>${esc(title)}</title>
<meta name="robots" content="noindex, nofollow" />
<meta name="description" content="${esc(description)}" />
<meta property="og:type" content="website" />
<meta property="og:site_name" content="${esc(siteName)}" />
<meta property="og:title" content="${esc(title)}" />
<meta property="og:description" content="${esc(description)}" />
<meta property="og:image" content="${esc(image)}" />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />
<meta property="og:image:alt" content="${esc(alt)}" />
<meta property="og:locale" content="fr_FR" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="${esc(title)}" />
<meta name="twitter:description" content="${esc(description)}" />
<meta name="twitter:image" content="${esc(image)}" />
<link rel="icon" type="image/svg+xml" href="${esc(icone)}" />
</head>
<body>
<h1>${esc(title)}</h1>
<p>${esc(description)}</p>
</body>
</html>`;

  return new Response(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "X-Robots-Tag": "noindex, nofollow",
      // Une réponse par jeton (l'URL le porte) : le cache du CDN ne mélange personne.
      "Cache-Control": "public, max-age=0, s-maxage=600, stale-while-revalidate=86400",
    },
  });
}
