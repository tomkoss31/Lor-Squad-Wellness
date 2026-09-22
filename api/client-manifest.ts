// =============================================================================
// api/client-manifest — le manifeste de l'espace d'UNE cliente (/client/<jeton>).
//
// Vécu le 22/09/2026 : Gwen ouvre son lien personnel dans Safari (ça marche),
// fait « Partager → Sur l'écran d'accueil »… et l'icône ouvre la PAGE DE
// CONNEXION. L'iPhone installe l'app d'après le manifeste de la page, et le seul
// manifeste d'index.html est celui de l'app coach (`start_url: "/login"`). Un
// espace membre s'ouvre par son jeton, jamais par un mot de passe : l'icône
// ramenait donc la membre à un écran où elle ne pouvait rien faire. Même chose
// sur Android (« Installer l'application »).
//
// index.html remplace le lien du manifeste par celui-ci dès que l'adresse est
// /client/<jeton> : départ = SON lien, `id` = SON lien (chaque membre a son
// icône, distincte de l'app coach sur un même téléphone). Aucune donnée lue :
// le jeton est déjà dans l'adresse de la page ; rien ne dépend de la base.
//
// EDGE runtime (le plafond Hobby de 12 fonctions serverless est atteint ; les
// edge n'y comptent pas).
// =============================================================================

export const config = { runtime: "edge" };

const JETON = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const ICONES = [
  { src: "/brand/labase360/pwa-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
  { src: "/brand/labase360/pwa-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
  { src: "/brand/labase360/pwa-maskable-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
  { src: "/brand/labase360/pwa-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
];

export default function handler(req: Request): Response {
  const token = (new URL(req.url).searchParams.get("token") ?? "").trim();
  const depart = JETON.test(token) ? `/client/${token}` : "/client/";

  const manifeste = {
    id: depart,
    name: "La Base 360",
    short_name: "La Base 360",
    description: "Mon espace bien-être personnalisé · The wellness nutrition club",
    start_url: depart,
    // Le périmètre d'origine (ClientAppPage, 16/06) : l'app de la membre reste dans
    // /client/, elle ne se confond pas avec l'app coach installée sur le même téléphone.
    scope: "/client/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#162624",
    theme_color: "#162624",
    icons: ICONES,
  };

  return new Response(JSON.stringify(manifeste), {
    status: 200,
    headers: {
      "Content-Type": "application/manifest+json; charset=utf-8",
      // Une réponse par jeton (l'adresse le porte) : le cache ne mélange personne.
      "Cache-Control": "public, max-age=0, s-maxage=86400",
      "X-Robots-Tag": "noindex, nofollow",
    },
  });
}
