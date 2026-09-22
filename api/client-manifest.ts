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
// icône, distincte de l'app coach sur un même téléphone).
//
// 22/09 (le lien d'accès refait, maquette 7pdf4sTkQoHob1axp76vfP) : une membre
// du Breakfast Club installe SON club — le médaillon et « Mon club » — au lieu
// de La Base 360. La base dit qui elle est par `apercu_espace_membre` (la même
// que l'aperçu des liens, api/client-meta : 'club' | 'app', aucun nom), en
// 2,5 s au plus ; sinon, La Base 360 comme avant. L'iPhone, lui, prend l'icône
// de la page (apple-touch-icon) : ClientAppPage la change pour une membre.
//
// EDGE runtime (le plafond Hobby de 12 fonctions serverless est atteint ; les
// edge n'y comptent pas).
// =============================================================================

export const config = { runtime: "edge" };

const JETON = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const icones = (dossier: string) => [
  { src: `/brand/${dossier}/pwa-192.png`, sizes: "192x192", type: "image/png", purpose: "any" },
  { src: `/brand/${dossier}/pwa-512.png`, sizes: "512x512", type: "image/png", purpose: "any" },
  { src: `/brand/${dossier}/pwa-maskable-192.png`, sizes: "192x192", type: "image/png", purpose: "maskable" },
  { src: `/brand/${dossier}/pwa-maskable-512.png`, sizes: "512x512", type: "image/png", purpose: "maskable" },
];

const HABILLAGES = {
  app: {
    name: "La Base 360",
    short_name: "La Base 360",
    description: "Mon espace bien-être personnalisé · The wellness nutrition club",
    icons: icones("labase360"),
  },
  club: {
    name: "The Breakfast Club",
    short_name: "Mon club",
    description: "Mon espace membre · The Breakfast Club by La Base",
    icons: icones("breakfast-club"),
  },
} as const;

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
  const token = (new URL(req.url).searchParams.get("token") ?? "").trim();
  const valide = JETON.test(token);
  const depart = valide ? `/client/${token}` : "/client/";
  const qui = valide ? await habillage(token) : null;
  const h = qui === "club" ? HABILLAGES.club : HABILLAGES.app;

  const manifeste = {
    id: depart,
    name: h.name,
    short_name: h.short_name,
    description: h.description,
    start_url: depart,
    // Le périmètre d'origine (ClientAppPage, 16/06) : l'app de la membre reste dans
    // /client/, elle ne se confond pas avec l'app coach installée sur le même téléphone.
    scope: "/client/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#162624",
    theme_color: "#162624",
    icons: h.icons,
  };

  return new Response(JSON.stringify(manifeste), {
    status: 200,
    headers: {
      "Content-Type": "application/manifest+json; charset=utf-8",
      // Une réponse par jeton (l'adresse le porte) : le cache ne mélange personne.
      // Base injoignable → La Base 360, gardée 5 min seulement (pas une journée).
      "Cache-Control": qui ? "public, max-age=0, s-maxage=86400" : "public, max-age=0, s-maxage=300",
      "X-Robots-Tag": "noindex, nofollow",
    },
  });
}
