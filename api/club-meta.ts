// =============================================================================
// api/club-meta — Open Graph du site public Breakfast Club (Verdun).
//
// Pourquoi : l'app est un SPA. Les robots des réseaux (WhatsApp, Instagram,
// Facebook, Twitter/X, iMessage, Telegram…) ne lisent PAS le JavaScript → sans
// ça, un lien partagé afficherait l'OG générique « La Base 360 » au lieu du
// Breakfast Club.
//
// vercel.json route UNIQUEMENT les robots (via `has` user-agent) vers cette
// fonction pour /club (+ pages internes) et /reserver ; les vrais visiteurs
// gardent le SPA normal. La fonction renvoie un HTML minimal avec les balises OG
// du club et redirige un éventuel humain vers la page.
//
// ⚠️ EDGE runtime (comme api/og/*) : le plan Vercel Hobby est plafonné à 12
// fonctions SERVERLESS/déploiement, et le projet y est déjà. Les fonctions edge
// ne comptent PAS dans ce quota → club-meta doit rester en edge.
//
// og:image = bannière 1200×630 générée par api/og/club. Pas de données dynamiques
// (vitrine fixe) → juste une variation de titre selon la page.
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

// Titre + description selon la page partagée.
function metaFor(path: string, sub: string): { title: string; description: string; realPath: string } {
  if (path === "reserver") {
    return {
      title: "Réserve ta séance découverte offerte · The Breakfast Club Verdun",
      description:
        "Body scan + bilan bien-être offerts, sans engagement. Choisis ton créneau au club de petit-déjeuner de Verdun.",
      realPath: "/reserver",
    };
  }
  const realPath = sub ? `/club/${sub}` : "/club";
  return {
    title: "The Breakfast Club · Verdun — le club où l'on t'attend, tous les matins",
    description:
      "Le club de petit-déjeuner de Verdun. Un rituel du matin, un suivi, une communauté. Ton body scan de découverte est offert.",
    realPath,
  };
}

export default async function handler(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const path = (url.searchParams.get("path") ?? "club").trim();
  const sub = (url.searchParams.get("sub") ?? "").trim().replace(/[^a-z-]/g, "");

  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? "www.labase-nutrition.com";
  const proto = req.headers.get("x-forwarded-proto") ?? "https";

  const { title, description, realPath } = metaFor(path, sub);
  const pageUrl = `${proto}://${host}${realPath}`;
  const image = `${proto}://${host}/api/og/club?path=${encodeURIComponent(path === "reserver" ? "reserver" : "club")}`;

  const html = `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8" />
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}" />
<meta property="og:type" content="website" />
<meta property="og:site_name" content="The Breakfast Club by La Base" />
<meta property="og:title" content="${esc(title)}" />
<meta property="og:description" content="${esc(description)}" />
<meta property="og:url" content="${esc(pageUrl)}" />
<meta property="og:image" content="${esc(image)}" />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />
<meta property="og:image:alt" content="The Breakfast Club · Verdun — body scan offert" />
<meta property="og:locale" content="fr_FR" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="${esc(title)}" />
<meta name="twitter:description" content="${esc(description)}" />
<meta name="twitter:image" content="${esc(image)}" />
<link rel="canonical" href="${esc(pageUrl)}" />
<!-- L'icône du CLUB, et pas celle de l'app. Sans cette ligne, le robot
     n'en trouve aucune ici et retombe sur celle du document servi par
     défaut : Google affichait donc le « B » bleu de La Base 360 à côté du
     résultat du Breakfast Club (constaté par Thomas le 13/08). -->
<link rel="icon" type="image/svg+xml" href="/brand/breakfast-club/favicon.svg" />
<meta http-equiv="refresh" content="0; url=${esc(pageUrl)}" />
</head>
<body>
<p>Redirection vers <a href="${esc(pageUrl)}">${esc(title)}</a>…</p>
<script>window.location.replace(${JSON.stringify(pageUrl)});</script>
</body>
</html>`;

  return new Response(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "public, max-age=0, s-maxage=600, stale-while-revalidate=86400",
    },
  });
}
