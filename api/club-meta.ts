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

/**
 * Titre + description PAR PAGE.
 *
 * ⚠ C'est ce fichier que Google lit, pas les titres posés en JavaScript par
 * ClubShell : un robot reçoit cette réponse-là et s'arrête. Jusqu'au 13/08 les
 * sept pages du club renvoyaient ici UN SEUL titre — un moteur y voyait sept
 * fois la même page et n'en gardait qu'une.
 *
 * Chaque entrée vise une recherche différente, et TOUTES portent « Verdun » :
 * l'objectif est de sortir sur la ville. Les mots ciblés sont ceux que les gens
 * tapent — nutrition, petit-déjeuner, perte de poids, remise en forme,
 * communauté — répartis pour que les pages ne se concurrencent pas entre elles.
 *
 * Aucune marque tierce ici : on ne se positionne pas sur un nom qu'on ne
 * possède pas, et l'écrire exposerait le club pour rien.
 *
 * Longueurs : titre sous ~60 caractères, description entre 140 et 160.
 * Au-delà, Google tronque et la fin ne sert plus à rien.
 */
const META_PAGES: Record<string, { title: string; description: string }> = {
  "": {
    title: "Club nutrition et petit-déjeuner à Verdun · Breakfast Club",
    description:
      "Perte de poids, remise en forme, énergie : un petit-déjeuner complet et un suivi chaque matin, dans une vraie communauté à Verdun. Body scan offert.",
  },
  "le-club": {
    title: "Le club de petit-déjeuner de Verdun · Breakfast Club",
    description:
      "Un lieu ouvert dès 7h à Verdun : nutrition, coaching et une communauté qui t'attend chaque matin. Sans rendez-vous, sans engagement, body scan offert.",
  },
  "le-rituel": {
    title: "Le rituel du matin : nutrition complète · Verdun",
    description:
      "Trois boissons et un smoothie qui couvre près de 40 % de tes apports, puis un point avec ton coach. Ce qu'on boit chaque matin au club de Verdun, et pourquoi.",
  },
  "comment-ca-se-passe": {
    title: "Comment ça se passe — tarifs et déroulé · Verdun",
    description:
      "Du body scan offert au point des 10 visites : le déroulé, les tarifs, la validité des cartes, et les réponses aux questions qu'on nous pose à Verdun.",
  },
  resultats: {
    title: "Perte de poids et remise en forme à Verdun — résultats",
    description:
      "Les transformations des membres du club de Verdun : perte de poids, remise en forme, énergie retrouvée. Des habitants de Verdun, avec leurs chiffres.",
  },
  nous: {
    title: "Mélanie & Thomas, coachs nutrition à Verdun",
    description:
      "Les deux coachs du Breakfast Club de Verdun : pourquoi ils ont ouvert ce club de petit-déjeuner, et comment ils accompagnent leur communauté chaque matin.",
  },
  rejoindre: {
    title: "Devenir coach nutrition à Verdun — rejoindre l'équipe",
    description:
      "Rejoindre l'équipe du Breakfast Club de Verdun : ce que c'est vraiment, ce que ça demande au quotidien, et comment en parler avec nous. Sans engagement.",
  },
};

function metaFor(path: string, sub: string): { title: string; description: string; realPath: string } {
  if (path === "reserver") {
    return {
      title: "Body scan offert à Verdun · The Breakfast Club",
      description:
        "Body scan et bilan bien-être offerts, sans engagement. Choisis ton créneau au club de nutrition et de petit-déjeuner de Verdun, ouvert dès 7h.",
      realPath: "/reserver",
    };
  }
  const realPath = sub ? `/club/${sub}` : "/club";
  // Une sous-page inconnue retombe sur l'accueil : mieux vaut le bon titre du
  // club qu'un titre vide, et ça ne crée pas de doublon puisque l'URL diffère.
  const m = META_PAGES[sub] ?? META_PAGES[""];
  return { title: m.title, description: m.description, realPath };
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
