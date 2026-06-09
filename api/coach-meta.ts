// =============================================================================
// api/coach-meta — Open Graph par coach pour la fiche publique /coach/:slug.
//
// Pourquoi : l'app est un SPA. Les robots des réseaux (WhatsApp, Instagram,
// Facebook, Twitter/X, LinkedIn, Telegram…) ne lisent PAS le JavaScript, donc
// les balises OG injectées côté React leur sont invisibles → ils tomberaient
// sur l'OG générique de index.html.
//
// vercel.json route UNIQUEMENT les robots (via `has` user-agent) vers cette
// fonction ; les vrais visiteurs gardent le SPA normal (zéro impact UX).
// La fonction renvoie un HTML minimal avec les balises OG personnalisées du
// coach (photo + prénom + bio), et redirige un éventuel humain vers la page.
//
// Données : RPC publique get_coach_credibility_by_slug (anon, SECURITY DEFINER,
// champs safe uniquement). Chantier #13-B (2026-06-08).
// =============================================================================

const FALLBACK_IMAGE =
  "https://www.labase360.fr/brand/labase360/og-image-1200x630.png";

function esc(input: unknown): string {
  return String(input ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function normalizeSlug(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]/g, "")
    .trim();
}

export default async function handler(req: any, res: any) {
  const rawSlug = String(req.query?.slug ?? "").trim();
  const slug = normalizeSlug(rawSlug);

  const host = String(req.headers["x-forwarded-host"] ?? req.headers.host ?? "www.labase360.fr");
  const proto = String(req.headers["x-forwarded-proto"] ?? "https");
  const pageUrl = `${proto}://${host}/coach/${encodeURIComponent(slug)}`;

  // Valeurs par défaut (coach inconnu / RPC indispo) → OG générique brandé.
  let title = "Coach bien-être · La Base 360";
  let description =
    "Reprends ta forme avec un accompagnement humain et personnalisé.";

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
        const data: any = await r.json();
        if (data && data.first_name) {
          const firstName = String(data.first_name);
          title = `${firstName} · Coach bien-être La Base 360`;
          const bio = (data.bio ?? "").toString().trim();
          if (bio) {
            description = bio.length > 200 ? `${bio.slice(0, 197)}…` : bio;
          } else if (data.city) {
            description = `Coach bien-être à ${data.city}. Bilan offert + accompagnement personnalisé.`;
          }
        }
      }
    }
  } catch {
    // best-effort : on garde l'OG générique en cas d'erreur réseau/RPC.
  }

  // og:image = bannière 1200×630 générée par api/og/coach (B.2c). La fonction OG
  // gère elle-même le coach inconnu. Fallback générique si pas de slug exploitable.
  const image =
    slug.length >= 2
      ? `${proto}://${host}/api/og/coach?slug=${encodeURIComponent(slug)}`
      : FALLBACK_IMAGE;
  const twitterCard = "summary_large_image";

  const html = `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8" />
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}" />
<meta property="og:type" content="profile" />
<meta property="og:site_name" content="La Base 360" />
<meta property="og:title" content="${esc(title)}" />
<meta property="og:description" content="${esc(description)}" />
<meta property="og:url" content="${esc(pageUrl)}" />
<meta property="og:image" content="${esc(image)}" />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />
<meta property="og:locale" content="fr_FR" />
<meta name="twitter:card" content="${twitterCard}" />
<meta name="twitter:title" content="${esc(title)}" />
<meta name="twitter:description" content="${esc(description)}" />
<meta name="twitter:image" content="${esc(image)}" />
<link rel="canonical" href="${esc(pageUrl)}" />
<meta http-equiv="refresh" content="0; url=${esc(pageUrl)}" />
</head>
<body>
<p>Redirection vers <a href="${esc(pageUrl)}">${esc(title)}</a>…</p>
<script>window.location.replace(${JSON.stringify(pageUrl)});</script>
</body>
</html>`;

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  // Cache court côté CDN : les previews se rafraîchissent sans être figées.
  res.setHeader("Cache-Control", "public, max-age=0, s-maxage=600, stale-while-revalidate=86400");
  res.status(200).send(html);
}
