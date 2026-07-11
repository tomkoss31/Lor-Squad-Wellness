// =============================================================================
// api/boutique-meta — Open Graph pour la boutique HL SKIN (SPA → robots).
//
// Comme /coach/:slug, l'app est un SPA : les robots sociaux ne lisent pas le JS.
// vercel.json route UNIQUEMENT les robots (via `has` user-agent) vers cette
// fonction pour /boutique/:slug et /boutique/:slug/produit/:productSlug.
// Renvoie un HTML minimal avec les balises OG (nom boutique / produit + visuel)
// et redirige l'humain égaré vers la page.
//
// Données : RPC publique get_boutique_by_slug (anon) + table shop_products.
// Chantier Boutique HL SKIN (audit Claude Design, 2026-07-10).
// =============================================================================

const FALLBACK_IMAGE = "https://www.labase360.fr/brand/labase360/og-image-1200x630.png";

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
  const slug = normalizeSlug(String(req.query?.slug ?? "").trim());
  const productSlug = String(req.query?.product ?? "").trim().toLowerCase();

  const host = String(req.headers["x-forwarded-host"] ?? req.headers.host ?? "www.labase360.fr");
  const proto = String(req.headers["x-forwarded-proto"] ?? "https");
  const pageUrl = productSlug
    ? `${proto}://${host}/boutique/${encodeURIComponent(slug)}/produit/${encodeURIComponent(productSlug)}`
    : `${proto}://${host}/boutique/${encodeURIComponent(slug)}`;

  let title = "Beauté K Skin · Skincare coréen HL Skin";
  let description = "Cosmétiques coréens premium : sérums, soins et rituels glass skin. Livraison offerte dès 90 €.";
  let image = FALLBACK_IMAGE;
  let ogType = "website";

  try {
    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const anonKey = process.env.VITE_SUPABASE_ANON_KEY;
    if (supabaseUrl && anonKey && slug.length >= 2) {
      // Boutique (nom + avatar distri).
      const bRes = await fetch(`${supabaseUrl}/rest/v1/rpc/get_boutique_by_slug`, {
        method: "POST",
        headers: {
          apikey: anonKey,
          Authorization: `Bearer ${anonKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ p_slug: slug }),
      });
      const boutique: any = bRes.ok ? await bRes.json() : null;
      const shopName = boutique?.shop_name || "Beauté K Skin";
      const firstName = boutique?.first_name ? String(boutique.first_name) : null;
      if (boutique?.avatar_url) image = String(boutique.avatar_url);

      if (productSlug) {
        // Page produit.
        const pRes = await fetch(
          `${supabaseUrl}/rest/v1/shop_products?slug=eq.${encodeURIComponent(productSlug)}&active=eq.true&select=name,tagline,description,price_ttc,currency,images`,
          { headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}` } },
        );
        const rows: any[] = pRes.ok ? await pRes.json() : [];
        const p = rows[0];
        if (p) {
          ogType = "product";
          const price = Number(p.price_ttc).toLocaleString("fr-FR", { minimumFractionDigits: 2 });
          title = `${p.name} · ${shopName}`;
          description = String(p.tagline || p.description || p.name).slice(0, 200);
          const firstImg = Array.isArray(p.images) && p.images[0]?.url ? String(p.images[0].url) : null;
          if (firstImg) image = firstImg;
          description = `${description} — ${price} €`;
        }
      } else {
        title = firstName ? `${shopName} · par ${firstName}` : `${shopName} · Skincare coréen`;
        description = `La boutique de cosmétiques coréens HL Skin${firstName ? ` de ${firstName}` : ""} : sérums, soins et rituels glass skin. Livraison offerte dès 90 €.`;
      }
    }
  } catch {
    // best-effort → OG générique.
  }

  const html = `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8" />
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}" />
<meta property="og:type" content="${esc(ogType)}" />
<meta property="og:site_name" content="Beauté K Skin" />
<meta property="og:title" content="${esc(title)}" />
<meta property="og:description" content="${esc(description)}" />
<meta property="og:url" content="${esc(pageUrl)}" />
<meta property="og:image" content="${esc(image)}" />
<meta property="og:locale" content="fr_FR" />
<meta name="twitter:card" content="summary_large_image" />
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
  res.setHeader("Cache-Control", "public, max-age=0, s-maxage=600, stale-while-revalidate=86400");
  res.status(200).send(html);
}
