// =============================================================================
// api/club-meta — Open Graph du tunnel de réservation du Breakfast Club.
//
// LE PROBLÈME (constaté par Thomas le 2026-08-10, capture Safari à l'appui)
// labase-nutrition.com et labase360.fr servent le MÊME index.html. Le domaine
// du CLUB annonçait donc partout l'identité de l'APP COACH :
//     <title>     La Base 360 — The wellness nutrition club
//     og:title    La Base 360 — The wellness nutrition club
//     og:desc     « L'app du coach nutrition moderne… »
//     og:image    l'image de l'app, hébergée sur labase360.fr
// Le titre est bien corrigé après coup par useClubHead — mais APRÈS le
// JavaScript. Or les robots des réseaux (WhatsApp, Facebook, Instagram,
// Telegram, LinkedIn…) et Google ne l'exécutent pas. Quelqu'un qui partage le
// lien du flyer QR affichait donc l'app coach au lieu du club.
//
// Trois marques cohabitent et ne doivent pas se mélanger :
//   • La Base 360        → l'app des coachs (labase360.fr)
//   • The Breakfast Club → le club du matin, 7h-11h (labase-nutrition.com)
//   • La Base Shakes&Drinks → le bar healthy de l'après-midi, 11h-17h30
// Cette fonction fait parler la DEUXIÈME sur son propre domaine.
//
// Même mécanique que api/coach-meta : vercel.json ne route QUE les robots ici
// (via `has` user-agent), les vrais visiteurs gardent le SPA (zéro impact UX).
// Contenu statique — aucune requête base, donc aucune latence ajoutée.
// =============================================================================

const TITLE = "Réserver mon RDV découverte · The Breakfast Club by La Base";
const DESCRIPTION =
  "Le club de petit-déjeuner et de coaching nutrition de Verdun. Body scan et bilan bien-être offerts, sans engagement. 11 rue Saint Pierre, du lundi au samedi.";
// La façade : elle montre le lieu ET répond d'elle-même à la confusion entre le
// club du matin et le bar de l'après-midi (« 1 lieu, 2 ambiances »).
const IMAGE_PATH = "/brand/breakfast-club/photos/club-facade.jpg";

function esc(input: unknown): string {
  return String(input ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export default function handler(
  req: { headers: Record<string, string | string[] | undefined>; url?: string },
  res: {
    setHeader: (k: string, v: string) => void;
    status: (c: number) => { send: (b: string) => void };
  },
): void {
  const hostHeader = req.headers["x-forwarded-host"] ?? req.headers.host;
  const host = String(Array.isArray(hostHeader) ? hostHeader[0] : hostHeader ?? "www.labase-nutrition.com");
  const protoHeader = req.headers["x-forwarded-proto"];
  const proto = String(Array.isArray(protoHeader) ? protoHeader[0] : protoHeader ?? "https");

  // On renvoie le robot vers l'URL qu'il a demandée : /reserver ou
  // /reserver/<club>. Sans ça, un lien vers un club précis perdrait son slug.
  const path = (req.url ?? "/reserver").split("?")[0] || "/reserver";
  const safePath = /^\/reserver(\/[a-z0-9-]{1,64})?$/i.test(path) ? path : "/reserver";
  const pageUrl = `${proto}://${host}${safePath}`;
  const image = `${proto}://${host}${IMAGE_PATH}`;

  const html = `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8" />
<title>${esc(TITLE)}</title>
<meta name="description" content="${esc(DESCRIPTION)}" />
<meta property="og:type" content="website" />
<meta property="og:site_name" content="The Breakfast Club by La Base" />
<meta property="og:title" content="${esc(TITLE)}" />
<meta property="og:description" content="${esc(DESCRIPTION)}" />
<meta property="og:url" content="${esc(pageUrl)}" />
<meta property="og:image" content="${esc(image)}" />
<meta property="og:image:width" content="1280" />
<meta property="og:image:height" content="720" />
<meta property="og:locale" content="fr_FR" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="${esc(TITLE)}" />
<meta name="twitter:description" content="${esc(DESCRIPTION)}" />
<meta name="twitter:image" content="${esc(image)}" />
<link rel="canonical" href="${esc(pageUrl)}" />
<meta http-equiv="refresh" content="0; url=${esc(pageUrl)}" />
</head>
<body>
<p>Redirection vers <a href="${esc(pageUrl)}">${esc(TITLE)}</a>…</p>
<script>window.location.replace(${JSON.stringify(pageUrl)});</script>
</body>
</html>`;

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  // Cache court côté CDN : les aperçus se rafraîchissent sans rester figés.
  res.setHeader("Cache-Control", "public, max-age=0, s-maxage=600, stale-while-revalidate=86400");
  res.status(200).send(html);
}
