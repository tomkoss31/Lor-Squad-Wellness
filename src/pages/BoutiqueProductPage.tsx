// =============================================================================
// BoutiqueProductPage — Page produit dédiée & partageable de la boutique.
// Route publique : /boutique/:coachSlug/produit/:productSlug
//
// La « vue rapide » (modale) reste sur la vitrine ; ici le produit a sa propre
// URL — partageable, indexable, avec JSON-LD Product/Offer. Réutilise le panier
// (useCart, même localStorage que la vitrine) + CartDrawer + CheckoutForm.
// =============================================================================

import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import "../styles/boutique.css";
import { getSupabaseClient } from "../services/supabaseClient";
import { formatEuro, formatEuroCompact } from "../lib/format";
import { CartDrawer } from "../components/boutique/CartDrawer";
import { CheckoutForm } from "../components/boutique/CheckoutForm";
import { useCart } from "../components/boutique/useCart";
import {
  CONCERN_LABELS,
  FREE_SHIPPING_THRESHOLD,
  type AppliedPromo,
  type BoutiqueInfo,
  type ShopProduct,
} from "../components/boutique/types";

type ThemeMode = "light" | "dark";

function readTheme(): ThemeMode {
  try {
    const v = localStorage.getItem("bk-shop-theme");
    if (v === "light" || v === "dark") return v;
    if (window.matchMedia("(prefers-color-scheme: dark)").matches) return "dark";
  } catch {
    /* ignore */
  }
  return "light";
}

export function BoutiqueProductPage() {
  const { coachSlug, productSlug } = useParams<{ coachSlug?: string; productSlug?: string }>();
  const [theme, setTheme] = useState<ThemeMode>(readTheme);
  const [loading, setLoading] = useState(true);
  const [boutique, setBoutique] = useState<BoutiqueInfo | null>(null);
  const [product, setProduct] = useState<ShopProduct | null>(null);
  const [allProducts, setAllProducts] = useState<ShopProduct[]>([]);

  const [cartOpen, setCartOpen] = useState(false);
  const { cart, add, setQty, remove, count } = useCart(coachSlug);
  const [checkout, setCheckout] = useState<{ promo: AppliedPromo | null } | null>(null);
  const [heroIdx, setHeroIdx] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setHeroIdx(0);
    (async () => {
      try {
        const sb = await getSupabaseClient();
        if (!sb) return;
        const [boutiqueRes, productRes, allRes] = await Promise.all([
          coachSlug
            ? sb.rpc("get_boutique_by_slug", { p_slug: coachSlug })
            : Promise.resolve({ data: null }),
          sb.from("shop_products").select("*").eq("slug", productSlug).eq("active", true).maybeSingle(),
          sb.from("shop_products").select("*").eq("active", true).order("sort_order"),
        ]);
        if (cancelled) return;
        if (boutiqueRes.data) setBoutique(boutiqueRes.data as BoutiqueInfo);
        if (productRes.data) setProduct(productRes.data as ShopProduct);
        if (allRes.data) setAllProducts(allRes.data as ShopProduct[]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [coachSlug, productSlug]);

  useEffect(() => {
    try {
      localStorage.setItem("bk-shop-theme", theme);
    } catch {
      /* ignore */
    }
  }, [theme]);

  const shopName = boutique?.shop_name ?? "Beauté K Skin";
  const boutiqueUrl = `/boutique/${coachSlug}`;

  useEffect(() => {
    if (product) {
      document.title = `${product.name} · ${shopName}`;
      const meta = document.querySelector('meta[name="description"]') ?? (() => {
        const m = document.createElement("meta");
        m.setAttribute("name", "description");
        document.head.appendChild(m);
        return m;
      })();
      meta.setAttribute("content", (product.tagline ?? product.description ?? product.name).slice(0, 160));
    }
  }, [product, shopName]);

  // JSON-LD Product/Offer (SEO).
  const jsonLd = useMemo(() => {
    if (!product) return null;
    return JSON.stringify({
      "@context": "https://schema.org",
      "@type": "Product",
      name: product.name,
      description: product.tagline ?? product.description ?? undefined,
      image: product.images?.map((i) => i.url).filter(Boolean),
      brand: { "@type": "Brand", name: "HL Skin" },
      offers: {
        "@type": "Offer",
        price: product.price_ttc,
        priceCurrency: product.currency || "EUR",
        availability: "https://schema.org/InStock",
      },
      ...(product.rating && product.reviews_count
        ? { aggregateRating: { "@type": "AggregateRating", ratingValue: product.rating, reviewCount: product.reviews_count } }
        : {}),
    });
  }, [product]);

  const concernLabel = product?.concern ? CONCERN_LABELS[product.concern]?.label : null;
  const hasRating = product && typeof product.rating === "number" && product.reviews_count > 0;

  function addToCart(id: string) {
    add(id);
    setCartOpen(true);
  }

  if (loading) {
    return (
      <div className="bk-shop" data-bk-theme={theme}>
        <div className="bk-center">
          <div className="bk-spinner" aria-label="Chargement" />
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="bk-shop" data-bk-theme={theme}>
        <div className="bk-center">
          <h2>Produit introuvable</h2>
          <p style={{ color: "var(--ink-soft)" }}>Ce produit n'existe pas ou n'est plus disponible.</p>
          <Link className="bk-btn bk-btn-primary" to={boutiqueUrl} style={{ textDecoration: "none" }}>
            ← Retour à la boutique
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="bk-shop" data-bk-theme={theme}>
      {jsonLd && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd }} />}

      {/* Header */}
      <header className="bk-bar">
        <div className="bk-wrap bk-bar-in">
          <Link className="bk-brand" to={boutiqueUrl}>
            {boutique?.avatar_url ? (
              <img className="bk-ava" src={boutique.avatar_url} alt={shopName} />
            ) : (
              <span className="bk-ava-fb">{shopName.charAt(0)}</span>
            )}
            <span>
              <span className="bk-mark">{shopName}</span>
              <span className="bk-by" style={{ display: "block" }}>
                {boutique?.first_name ? `par ${boutique.first_name}` : "boutique officielle"} · HL Skin
              </span>
            </span>
          </Link>
          <div className="bk-bar-actions">
            <button
              className="bk-iconbtn"
              onClick={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
              aria-label="Changer de thème"
            >
              {theme === "dark" ? "☀" : "☾"}
            </button>
            <button className="bk-cartbtn" onClick={() => setCartOpen(true)} aria-label="Ouvrir le panier">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                <path d="M6 7h12l-1 12H7L6 7Z" />
                <path d="M9 7a3 3 0 0 1 6 0" />
              </svg>
              <span className="bk-cartlbl">Panier</span>
              {count > 0 && <span className="bk-count">{count}</span>}
            </button>
          </div>
        </div>
      </header>

      <div className="bk-wrap" style={{ padding: "24px 24px 60px" }}>
        {/* Fil d'ariane */}
        <nav
          style={{ fontSize: 12.5, color: "var(--ink-faint)", marginBottom: 18 }}
          aria-label="Fil d'ariane"
        >
          <Link to={boutiqueUrl} style={{ color: "var(--ink-faint)" }}>
            Boutique
          </Link>
          {concernLabel && <span style={{ opacity: 0.5 }}> / {concernLabel}</span>}
          <span style={{ opacity: 0.5 }}> / </span>
          <span style={{ color: "var(--ink-soft)" }}>{product.name}</span>
        </nav>

        {/* PDP */}
        <div className="bk-pdp" style={{ position: "static", maxWidth: "none", maxHeight: "none" }}>
          <div className="bk-pdp-media">
            <div className="bk-big">
              {product.images[heroIdx]?.url ? (
                <img
                  src={product.images[heroIdx].url}
                  alt={product.name}
                  loading="eager"
                  style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 16 }}
                />
              ) : (
                <div className="bk-bottle" aria-hidden="true" />
              )}
            </div>
            {product.images.length > 1 && (
              <div className="bk-thumbs">
                {product.images.map((img, i) => (
                  <button
                    className="bk-th"
                    key={img.url}
                    onClick={() => setHeroIdx(i)}
                    style={{
                      borderColor: heroIdx === i ? "var(--jade)" : undefined,
                      cursor: "pointer",
                    }}
                  >
                    <img
                      src={img.url}
                      alt=""
                      loading="lazy"
                      style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 9 }}
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="bk-pdp-info" style={{ overflow: "visible" }}>
            {hasRating && (
              <div className="bk-rate">
                <span className="bk-stars">★★★★★</span>{" "}
                {product.rating!.toString().replace(".", ",")} · {product.reviews_count} avis
              </div>
            )}
            <h1 style={{ fontSize: 32, marginBottom: 6 }}>{product.name}</h1>
            {product.volume_label && <div className="bk-vol">{product.volume_label}</div>}
            <div className="bk-pdp-price bk-tnum">{formatEuro(product.price_ttc)}</div>

            {product.benefits.length > 0 && (
              <ul className="bk-ben">
                {product.benefits.map((b) => (
                  <li key={b}>{b}</li>
                ))}
              </ul>
            )}

            <button className="bk-pdp-add" onClick={() => addToCart(product.id)}>
              Ajouter au panier · {formatEuro(product.price_ttc)}
            </button>
            <div style={{ fontSize: 12, color: "var(--ink-faint)", marginTop: 8, textAlign: "center" }}>
              🚚 Livraison offerte dès {formatEuroCompact(FREE_SHIPPING_THRESHOLD)}
            </div>

            {product.ingredient_hero && (
              <div className="bk-pdp-sec">
                <h4>L'actif héros</h4>
                <p>{product.ingredient_hero}</p>
              </div>
            )}
            {product.how_to && (
              <div className="bk-pdp-sec">
                <h4>Mode d'emploi</h4>
                <p>{product.how_to}</p>
              </div>
            )}
            {product.faq.length > 0 && (
              <div className="bk-pdp-sec bk-faq">
                <h4>Questions fréquentes</h4>
                {product.faq.map((f) => (
                  <details key={f.q}>
                    <summary>{f.q}</summary>
                    <p>{f.a}</p>
                  </details>
                ))}
              </div>
            )}
            <div className="bk-pdp-sec">
              <h4>Réassurance</h4>
              <p>🔒 Paiement Stripe sécurisé · ↩︎ Retours 14 j · 🚚 Expédié en 48 h</p>
            </div>
          </div>
        </div>

        {/* Autres produits */}
        {allProducts.length > 1 && (
          <div style={{ marginTop: 44 }}>
            <div className="bk-eyebrow" style={{ marginBottom: 14 }}>
              Tu aimeras aussi
            </div>
            <div className="bk-grid">
              {allProducts
                .filter((p) => p.id !== product.id)
                .slice(0, 3)
                .map((p) => (
                  <Link
                    key={p.id}
                    className="bk-card"
                    to={`/boutique/${coachSlug}/produit/${p.slug}`}
                    style={{ textDecoration: "none" }}
                  >
                    <div className="bk-thumb">
                      {p.images[0]?.url ? (
                        <img src={p.images[0].url} alt={p.name} loading="lazy" />
                      ) : (
                        <div className="bk-bottle" aria-hidden="true" />
                      )}
                    </div>
                    <div className="bk-cbody">
                      {p.volume_label && <span className="bk-vol">{p.volume_label}</span>}
                      <h3>{p.name}</h3>
                      <div className="bk-cfoot">
                        <span className="bk-price bk-tnum">{formatEuro(p.price_ttc)}</span>
                        <span className="bk-view">Voir →</span>
                      </div>
                    </div>
                  </Link>
                ))}
            </div>
          </div>
        )}
      </div>

      {cartOpen && (
        <CartDrawer
          onClose={() => setCartOpen(false)}
          products={allProducts}
          cart={cart}
          add={add}
          setQty={setQty}
          remove={remove}
          coachUserId={boutique?.user_id ?? null}
          onCheckout={(promo) => {
            setCartOpen(false);
            setCheckout({ promo });
          }}
        />
      )}
      {checkout && (
        <CheckoutForm
          slug={coachSlug ?? ""}
          products={allProducts}
          cart={cart}
          promo={checkout.promo}
          onClose={() => setCheckout(null)}
          onBack={() => {
            setCheckout(null);
            setCartOpen(true);
          }}
        />
      )}
    </div>
  );
}
