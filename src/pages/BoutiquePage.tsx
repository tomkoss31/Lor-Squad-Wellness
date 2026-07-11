// =============================================================================
// BoutiquePage — Vitrine e-commerce publique « Beauté K Skin » (HL SKIN).
// Route : /boutique/:coachSlug  (publique, hors AppLayout authentifié).
//
// Étape 2 du chantier Boutique : vitrine data-driven. Résout la boutique de la
// distri via la RPC publique get_boutique_by_slug, lit le catalogue depuis
// shop_products, affiche hero + shop-by-concern + gamme + ingrédient + avis +
// teaser affiliation. Fiche produit en vue rapide (ProductQuickView).
//
// Le PANIER + checkout arrivent à l'Étape 3. Identité visuelle 100 % dédiée
// (céladon coréen), indépendante du thème app coach — cf. src/styles/boutique.css.
// =============================================================================

import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import "../styles/boutique.css";
import { getSupabaseClient } from "../services/supabaseClient";
import { formatEuro, formatEuroCompact } from "../lib/format";
import { ProductQuickView } from "../components/boutique/ProductQuickView";
import { CartDrawer } from "../components/boutique/CartDrawer";
import { CheckoutForm } from "../components/boutique/CheckoutForm";
import { WelcomePopup } from "../components/boutique/WelcomePopup";
import { useCart } from "../components/boutique/useCart";
import {
  CONCERN_LABELS,
  COMING_SOON,
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
    // Pas de préférence stockée → on respecte le thème système au 1er rendu.
    if (window.matchMedia("(prefers-color-scheme: dark)").matches) return "dark";
  } catch {
    /* ignore */
  }
  return "light";
}

export function BoutiquePage() {
  const { coachSlug } = useParams<{ coachSlug?: string }>();
  const [theme, setTheme] = useState<ThemeMode>(readTheme);
  const [loading, setLoading] = useState(true);
  const [boutique, setBoutique] = useState<BoutiqueInfo | null>(null);
  const [products, setProducts] = useState<ShopProduct[]>([]);
  const [activeConcern, setActiveConcern] = useState<string | null>(null);
  const [quickView, setQuickView] = useState<ShopProduct | null>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const { cart, add, setQty, remove, clear, count } = useCart(coachSlug);
  const [checkout, setCheckout] = useState<{ promo: AppliedPromo | null } | null>(null);
  const [orderSuccess, setOrderSuccess] = useState<{ firstName?: string; total?: number } | null>(
    null,
  );
  const [welcomeOpen, setWelcomeOpen] = useState(false);
  const [welcomeBar, setWelcomeBar] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();

  const rootRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // ── Résolution boutique + catalogue ───────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const sb = await getSupabaseClient();
        if (!sb) {
          if (!cancelled) setLoading(false);
          return;
        }
        const [boutiqueRes, productsRes] = await Promise.all([
          coachSlug
            ? sb.rpc("get_boutique_by_slug", { p_slug: coachSlug })
            : Promise.resolve({ data: null, error: null }),
          sb
            .from("shop_products")
            .select("*")
            .eq("active", true)
            .order("sort_order", { ascending: true }),
        ]);
        if (cancelled) return;
        if (boutiqueRes.data) setBoutique(boutiqueRes.data as BoutiqueInfo);
        if (productsRes.data) setProducts(productsRes.data as ShopProduct[]);
        // Compteur de visites (best-effort, non bloquant). Note : les builders
        // Supabase sont lazy → il faut .then() pour déclencher la requête.
        if (coachSlug) {
          sb.rpc("track_boutique_visit", { p_slug: coachSlug }).then(
            () => {},
            () => {},
          );
        }
      } catch {
        /* fallback : vitrine générique, cf. rendu ci-dessous */
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [coachSlug]);

  // ── Persistance thème ─────────────────────────────────────────────────────
  useEffect(() => {
    try {
      localStorage.setItem("bk-shop-theme", theme);
    } catch {
      /* ignore */
    }
  }, [theme]);

  // ── Retour de paiement (success / cancel) ─────────────────────────────────
  useEffect(() => {
    const status = searchParams.get("checkout");
    if (!status) return;
    const orderId = searchParams.get("order");
    const sessionId = searchParams.get("session_id");
    const clean = () => {
      const sp = new URLSearchParams(searchParams);
      ["checkout", "order", "session_id"].forEach((k) => sp.delete(k));
      setSearchParams(sp, { replace: true });
    };
    if (status === "success" && orderId && sessionId) {
      (async () => {
        try {
          const sb = await getSupabaseClient();
          const resp = await sb?.functions.invoke("confirm-shop-payment", {
            body: { order_id: orderId, session_id: sessionId },
          });
          const res = resp?.data as
            | { paid?: boolean; order?: { first_name?: string; total_cents?: number } }
            | undefined;
          if (res?.paid) {
            clear();
            setOrderSuccess({
              firstName: res.order?.first_name,
              total: res.order?.total_cents != null ? res.order.total_cents / 100 : undefined,
            });
          }
        } catch {
          /* silencieux : la confirmation serveur fait foi */
        } finally {
          clean();
        }
      })();
    } else if (status === "cancel") {
      clean();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Popup bienvenue : desktop = modale après délai ; mobile = barre slide-in
  // (pas d'interstitiel plein écran on-load sur mobile — pénalité Google). Une
  // seule fois par navigateur/boutique.
  useEffect(() => {
    if (loading) return;
    let seen = false;
    try {
      seen = !!localStorage.getItem(`bk-welc-${coachSlug}`);
    } catch {
      /* ignore */
    }
    if (seen) return;
    const t = setTimeout(() => {
      try {
        localStorage.setItem(`bk-welc-${coachSlug}`, "1");
      } catch {
        /* ignore */
      }
      if (window.matchMedia("(min-width:761px)").matches) setWelcomeOpen(true);
      else setWelcomeBar(true);
    }, 6500);
    return () => clearTimeout(t);
  }, [loading, coachSlug]);

  // ── SEO minimal (OG serveur = étape ultérieure) ───────────────────────────
  const shopName = boutique?.shop_name ?? "Beauté K Skin";
  const distriFirstName = boutique?.first_name ?? null;
  useEffect(() => {
    document.title = `${shopName} · Skincare coréen`;
  }, [shopName]);

  // ── Reveal on scroll ──────────────────────────────────────────────────────
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const els = Array.from(root.querySelectorAll<HTMLElement>(".bk-reveal"));
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      els.forEach((el) => el.classList.add("bk-in"));
      return;
    }
    const io = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("bk-in");
            io.unobserve(e.target);
          }
        }),
      { threshold: 0.12 },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [loading, products.length]);

  // ── Canvas « dewy » ambiant du hero ───────────────────────────────────────
  useEffect(() => {
    const cv = canvasRef.current;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    let raf = 0;
    let blobs: { x: number; y: number; r: number; dx: number; dy: number; h: string }[] = [];
    const size = () => {
      const rect = cv.getBoundingClientRect();
      cv.width = rect.width * dpr;
      cv.height = rect.height * dpr;
    };
    const init = () => {
      blobs = Array.from({ length: 5 }, (_, i) => ({
        x: Math.random() * cv.width,
        y: Math.random() * cv.height,
        r: (80 + Math.random() * 120) * dpr,
        dx: (Math.random() - 0.5) * 0.25 * dpr,
        dy: (Math.random() - 0.5) * 0.25 * dpr,
        h: i % 2 ? "79,139,114" : "207,148,136",
      }));
    };
    const paint = (animate: boolean) => {
      ctx.clearRect(0, 0, cv.width, cv.height);
      ctx.globalCompositeOperation = "lighter";
      blobs.forEach((b) => {
        if (animate) {
          b.x += b.dx;
          b.y += b.dy;
          if (b.x < -b.r || b.x > cv.width + b.r) b.dx *= -1;
          if (b.y < -b.r || b.y > cv.height + b.r) b.dy *= -1;
        }
        const g = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.r);
        g.addColorStop(0, `rgba(${b.h},.28)`);
        g.addColorStop(1, `rgba(${b.h},0)`);
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.r, 0, 7);
        ctx.fill();
      });
    };
    size();
    init();
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let visible = true;
    const loop = () => {
      paint(true);
      raf = requestAnimationFrame(loop);
    };
    const start = () => {
      cancelAnimationFrame(raf);
      loop();
    };
    const stop = () => cancelAnimationFrame(raf);

    if (reduce) paint(false);
    else start();

    // Perf : on met l'animation en pause quand le hero sort du viewport.
    const io = new IntersectionObserver(
      (entries) => {
        const nowVisible = entries[0]?.isIntersecting ?? true;
        if (nowVisible === visible) return;
        visible = nowVisible;
        if (reduce) return;
        if (visible) start();
        else stop();
      },
      { threshold: 0 },
    );
    io.observe(cv);

    const onResize = () => {
      size();
      init();
      if (reduce) paint(false);
      else if (visible) start();
    };
    window.addEventListener("resize", onResize);
    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      window.removeEventListener("resize", onResize);
    };
  }, [loading]);

  // ── Dérivés ───────────────────────────────────────────────────────────────
  const availableConcerns = useMemo(() => {
    const set = new Set(products.map((p) => p.concern).filter(Boolean) as string[]);
    return Object.keys(CONCERN_LABELS).filter((k) => set.has(k));
  }, [products]);

  const visibleProducts = useMemo(
    () => (activeConcern ? products.filter((p) => p.concern === activeConcern) : products),
    [products, activeConcern],
  );

  const brandInitial = (distriFirstName ?? shopName ?? "B").charAt(0).toUpperCase();

  const heroVideo = useMemo(() => {
    const u = boutique?.hero_video_url?.trim();
    if (!u) return null;
    const yt = u.match(
      /(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([\w-]{11})/,
    );
    if (yt) {
      return {
        youtube: true,
        embed: `https://www.youtube.com/embed/${yt[1]}?autoplay=1&mute=1&loop=1&playlist=${yt[1]}&controls=0&modestbranding=1&rel=0`,
      };
    }
    return { youtube: false, url: u };
  }, [boutique?.hero_video_url]);

  const scrollTo = (id: string) =>
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });

  const addToCart = (id: string) => {
    add(id);
    setCartOpen(true);
  };

  // ── Rendu ─────────────────────────────────────────────────────────────────
  return (
    <div className="bk-shop" data-bk-theme={theme} ref={rootRef}>
      {loading ? (
        <div className="bk-center">
          <div className="bk-spinner" aria-label="Chargement" />
          <p style={{ color: "var(--ink-soft)" }}>Ouverture de la boutique…</p>
        </div>
      ) : (
        <>
          <div className="bk-announce">
            ✦ Livraison offerte dès <b>{formatEuroCompact(FREE_SHIPPING_THRESHOLD)}</b> ·{" "}
            <b>−5 %</b> sur ta 1ʳᵉ commande avec le code <span className="bk-code">WELCOME5</span>
          </div>

          {/* Header */}
          <header className="bk-bar">
            <div className="bk-wrap bk-bar-in">
              <a className="bk-brand" href="#">
                {boutique?.avatar_url ? (
                  <img className="bk-ava" src={boutique.avatar_url} alt={shopName} />
                ) : (
                  <span className="bk-ava-fb">{brandInitial}</span>
                )}
                <span>
                  <span className="bk-mark">{shopName}</span>
                  <span className="bk-by" style={{ display: "block" }}>
                    {distriFirstName ? `par ${distriFirstName}` : "boutique officielle"} · HL Skin
                  </span>
                </span>
              </a>
              <nav className="bk-nav">
                <a href="#bk-gamme" onClick={(e) => (e.preventDefault(), scrollTo("bk-gamme"))}>
                  La gamme
                </a>
                <a href="#bk-concern" onClick={(e) => (e.preventDefault(), scrollTo("bk-concern"))}>
                  Par besoin
                </a>
                <a href="#bk-ingredient" onClick={(e) => (e.preventDefault(), scrollTo("bk-ingredient"))}>
                  Ingrédients
                </a>
                <a href="#bk-affil" onClick={(e) => (e.preventDefault(), scrollTo("bk-affil"))}>
                  Affiliation
                </a>
              </nav>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
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

          {/* Hero */}
          <div className="bk-wrap bk-hero">
            <div className="bk-hero-grid">
              <div>
                <div className="bk-eyebrow">Skincare coréen · glass skin</div>
                <h1>
                  L'éclat <em>rosé</em>, en quatre gestes.
                </h1>
                <p className="bk-hero-sub">
                  La routine coréenne condensée à l'essentiel : niacinamide, collagène, textures
                  fondantes. Une peau nette et repulpée — sans les dix étapes.
                </p>
                <div className="bk-cta">
                  <button className="bk-btn bk-btn-primary" onClick={() => scrollTo("bk-gamme")}>
                    Voir la gamme
                  </button>
                  <button className="bk-btn bk-btn-ghost" onClick={() => scrollTo("bk-concern")}>
                    Trouver ma routine
                  </button>
                </div>
                <div className="bk-hero-rate">
                  <span className="bk-stars">★★★★★</span> Adoré par nos clientes
                </div>
              </div>
              <div className="bk-stage">
                {heroVideo ? (
                  heroVideo.youtube ? (
                    <iframe
                      className="bk-video"
                      src={heroVideo.embed}
                      title="Vidéo boutique"
                      allow="autoplay; encrypted-media"
                      allowFullScreen
                    />
                  ) : (
                    <video className="bk-video" src={heroVideo.url} autoPlay muted loop playsInline />
                  )
                ) : (
                  <>
                    <canvas ref={canvasRef} aria-hidden="true" />
                    <div className="bk-glass" aria-hidden="true" />
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Trust */}
          <div className="bk-trust">
            <div className="bk-wrap bk-trust-in">
              <span>
                <span className="bk-dot" /> <b>Formulé en Corée</b>
              </span>
              <span>
                <span className="bk-dot" /> Testé dermatologiquement
              </span>
              <span>
                <span className="bk-dot" /> Cruelty-free
              </span>
              <span>
                <span className="bk-dot" /> Livraison offerte dès{" "}
                <b>{formatEuroCompact(FREE_SHIPPING_THRESHOLD)}</b>
              </span>
              <span>
                <span className="bk-dot" /> Paiement <b>sécurisé</b>
              </span>
            </div>
          </div>

          {/* Diagnostic peau par IA (HL/Skin AI) — mis en avant si le lien est configuré */}
          {boutique?.ai_scan_url && (
            <section className="bk-wrap bk-sec bk-reveal" style={{ paddingBottom: 0 }}>
              <a
                className="bk-aiscan"
                href={boutique.ai_scan_url}
                target="_blank"
                rel="noreferrer"
              >
                <div className="bk-aiscan-txt">
                  <div className="bk-eyebrow" style={{ color: "var(--jade-deep)" }}>
                    Nouveau · analyse par IA
                  </div>
                  <h2>Ta peau, analysée en 60 secondes.</h2>
                  <p>
                    Un selfie, et l'IA HL/Skin établit ton diagnostic (209 points, 6 types de peau)
                    + ta routine sur-mesure. Gratuit, sans engagement.
                  </p>
                </div>
                <span className="bk-btn bk-btn-primary bk-aiscan-cta">Faire mon diagnostic →</span>
              </a>
            </section>
          )}

          {/* Shop by concern */}
          {availableConcerns.length > 0 && (
            <section id="bk-concern" className="bk-wrap bk-sec bk-reveal">
              <div className="bk-sec-head">
                <div>
                  <div className="bk-eyebrow" style={{ marginBottom: 12 }}>
                    Par besoin
                  </div>
                  <h2>Ta peau d'abord.</h2>
                </div>
                <p>Dis-nous ce que tu veux corriger, on te montre le bon geste.</p>
              </div>
              <div className="bk-concerns">
                {availableConcerns.map((key) => {
                  const c = CONCERN_LABELS[key];
                  return (
                    <button
                      key={key}
                      className="bk-concern"
                      onClick={() => {
                        setActiveConcern(key);
                        scrollTo("bk-gamme");
                      }}
                    >
                      <div className="bk-ic">{c.icon}</div>
                      <h4>{c.label}</h4>
                      <span>{c.sub}</span>
                      <span className="bk-arr">Voir →</span>
                    </button>
                  );
                })}
              </div>
            </section>
          )}

          {/* Gamme */}
          <section id="bk-gamme" className="bk-wrap bk-sec bk-reveal">
            <div className="bk-sec-head">
              <div>
                <div className="bk-eyebrow" style={{ marginBottom: 12 }}>
                  Les plus aimés
                </div>
                <h2>Six essentiels, zéro superflu.</h2>
              </div>
              <p>La sélection resserrée qui compose l'essentiel des routines HL Skin.</p>
            </div>

            {availableConcerns.length > 0 && (
              <div className="bk-chips">
                <button
                  className={`bk-chip${activeConcern === null ? " bk-on" : ""}`}
                  onClick={() => setActiveConcern(null)}
                >
                  Tout
                </button>
                {availableConcerns.map((key) => (
                  <button
                    key={key}
                    className={`bk-chip${activeConcern === key ? " bk-on" : ""}`}
                    onClick={() => setActiveConcern((c) => (c === key ? null : key))}
                  >
                    {CONCERN_LABELS[key].icon} {CONCERN_LABELS[key].label}
                  </button>
                ))}
              </div>
            )}

            {visibleProducts.length === 0 ? (
              <p style={{ color: "var(--ink-soft)" }}>Aucun produit pour ce besoin pour l'instant.</p>
            ) : (
              <div className="bk-grid">
                {visibleProducts.map((p) => {
                  const hasRating = typeof p.rating === "number" && p.reviews_count > 0;
                  return (
                    <Link
                      key={p.id}
                      className="bk-card"
                      to={`/boutique/${coachSlug}/produit/${p.slug}`}
                    >
                      <div className="bk-thumb">
                        {p.badge && (
                          <span className={`bk-tag${p.badge === "new" ? " bk-new" : ""}`}>
                            {p.badge === "best-seller"
                              ? "Best-seller"
                              : p.badge === "new"
                                ? "Nouveau"
                                : p.badge}
                          </span>
                        )}
                        {p.images[0]?.url ? (
                          <img src={p.images[0].url} alt={p.name} loading="lazy" />
                        ) : (
                          <div className="bk-bottle" aria-hidden="true" />
                        )}
                        <button
                          className="bk-qvlabel"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setQuickView(p);
                          }}
                        >
                          Vue rapide
                        </button>
                      </div>
                      <div className="bk-cbody">
                        {hasRating && (
                          <div className="bk-rate">
                            <span className="bk-stars">★★★★★</span>{" "}
                            {p.rating!.toString().replace(".", ",")} · {p.reviews_count} avis
                          </div>
                        )}
                        {p.volume_label && <span className="bk-vol">{p.volume_label}</span>}
                        <h3>{p.name}</h3>
                        {p.tagline && <p className="bk-desc">{p.tagline}</p>}
                        <div className="bk-cfoot">
                          <span className="bk-price bk-tnum">{formatEuro(p.price_ttc)}</span>
                          <button
                            className="bk-add"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              addToCart(p.id);
                            }}
                          >
                            Ajouter
                          </button>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </section>

          {/* Bientôt disponible (teaser — pas en vente) */}
          <section className="bk-wrap bk-sec bk-reveal" style={{ paddingTop: 6 }}>
            <div className="bk-soon">
              <div className="bk-soon-head">
                <div className="bk-eyebrow">Prochainement</div>
                <h3>La gamme s'agrandit.</h3>
                <p>Sois la première prévenue — préviens ta coach pour être sur la liste.</p>
              </div>
              <div className="bk-soon-grid">
                {COMING_SOON.map((s) => (
                  <div className="bk-soon-card" key={s.name}>
                    <span className="bk-soon-tag">Bientôt</span>
                    <div
                      className="bk-soon-ic"
                      style={{ background: `${CONCERN_LABELS[s.concern]?.hue ?? "#6FB7B0"}22` }}
                    >
                      {CONCERN_LABELS[s.concern]?.icon ?? "✦"}
                    </div>
                    <h4>{s.name}</h4>
                    <p>{s.tagline}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Ingrédient */}
          <section id="bk-ingredient" className="bk-wrap bk-sec bk-reveal">
            <div className="bk-sec-head">
              <div>
                <div className="bk-eyebrow" style={{ marginBottom: 12 }}>
                  Le pouvoir des actifs
                </div>
                <h2>Un héros par produit.</h2>
              </div>
            </div>
            <div className="bk-ing">
              <div className="bk-ing-card bk-clin">
                <span className="bk-badge">Testé dermatologiquement</span>
                <span className="bk-pct">10 %</span>
                <h3>Niacinamide</h3>
                <p>
                  La concentration qui unifie le teint et renforce la barrière cutanée en 4
                  semaines. Dosée pour agir, tolérée par les peaux sensibles.
                </p>
              </div>
              <div className="bk-ing-card bk-rit">
                <span className="bk-badge">La beauté de l'intérieur</span>
                <span className="bk-pct">
                  Verisol<span style={{ fontSize: 22 }}> ® P</span>
                </span>
                <h3>Collagène bioactif</h3>
                <p>
                  Une cure à boire qui nourrit la peau là où les crèmes n'atteignent pas. Rides des
                  yeux et élasticité dès 4 semaines — le rituel beauté de l'intérieur.
                </p>
              </div>
            </div>
          </section>

          {/* Avis (placeholder — se branchera sur le système témoignages) */}
          <section className="bk-wrap bk-sec bk-reveal">
            <div className="bk-sec-head">
              <div>
                <div className="bk-eyebrow" style={{ marginBottom: 12 }}>
                  Elles ont testé
                </div>
                <h2>La preuve sur vraie peau.</h2>
              </div>
            </div>
            <div className="bk-revs">
              {[
                {
                  init: "CL",
                  who: "Camille L.",
                  ctx: "Sérum Niacinamide",
                  badge: "Avant / Après",
                  text: "En trois semaines mon grain de peau s'est lissé, je ne mets presque plus de fond de teint.",
                },
                {
                  init: "SN",
                  who: "Sarah N.",
                  ctx: "Routine éclat",
                  badge: "Éclat",
                  text: "La cure collagène + la crème tension, c'est le combo. Peau repulpée le matin.",
                },
                {
                  init: "MB",
                  who: "Maya B.",
                  ctx: "Contour des yeux",
                  badge: "Hydratation",
                  text: "Textures fondantes, zéro effet gras. Le contour des yeux décongestionne vraiment.",
                },
              ].map((r) => (
                <div className="bk-rev" key={r.who}>
                  <div className="bk-rt">
                    <span className="bk-stars">★★★★★</span>
                    <span className="bk-ba">{r.badge}</span>
                  </div>
                  <p>« {r.text} »</p>
                  <div className="bk-who">
                    <div className="bk-av">{r.init}</div>
                    <div>
                      <b>{r.who}</b>
                      <br />
                      <span>{r.ctx} · achat vérifié</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Affiliation (teaser) */}
          <section id="bk-affil" className="bk-wrap bk-sec bk-reveal">
            <div className="bk-affil">
              <div style={{ flex: 1, minWidth: 260 }}>
                <span className="bk-badge">Programme d'affiliation</span>
                <h2>Partage ta boutique, sois récompensée.</h2>
                <p>
                  Recommande {shopName} autour de toi. Tes filleules commandent avec ton lien — et tu
                  es récompensée jusqu'à la moitié du panier.
                </p>
                <div className="bk-pcts">
                  <div className="bk-pc">
                    <b>25 %</b>
                    <span>dès le départ</span>
                  </div>
                  <div className="bk-pc">
                    <b>50 %</b>
                    <span>si tu joues le jeu</span>
                  </div>
                </div>
              </div>
              <a
                className="bk-btn bk-btn-primary"
                href={`/boutique/${coachSlug}/affiliation`}
                style={{ textDecoration: "none", whiteSpace: "nowrap" }}
              >
                Deviens affiliée →
              </a>
            </div>
          </section>

          <section className="bk-wrap bk-sec bk-reveal" style={{ paddingTop: 6 }}>
            <div className="bk-capture">
              <div className="bk-eyebrow">−5 % de bienvenue</div>
              <h2>Rejoins le cercle Beauté K.</h2>
              <p>Conseils de ta coach, nouveautés et offres privées. Ton code de bienvenue t'attend.</p>
              <button className="bk-cta-btn" onClick={() => setWelcomeOpen(true)}>
                Je reçois mon −5 %
              </button>
            </div>
          </section>

          <footer className="bk-footer">
            <div className="bk-wrap bk-foot-in">
              <div>
                <span className="bk-mark" style={{ fontSize: 17 }}>
                  {shopName}
                </span>{" "}
                {distriFirstName ? `· boutique de ${distriFirstName}` : ""}
              </div>
              <div>Propulsé par La Base 360 · chaque distributrice a sa boutique</div>
            </div>
          </footer>
        </>
      )}

      {quickView && (
        <ProductQuickView
          product={quickView}
          coachSlug={coachSlug}
          onClose={() => setQuickView(null)}
          onAdd={(id) => {
            addToCart(id);
            setQuickView(null);
          }}
        />
      )}
      {cartOpen && (
        <CartDrawer
          onClose={() => setCartOpen(false)}
          products={products}
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
          products={products}
          cart={cart}
          promo={checkout.promo}
          onClose={() => setCheckout(null)}
          onBack={() => {
            setCheckout(null);
            setCartOpen(true);
          }}
        />
      )}
      {orderSuccess && (
        <div
          className="bk-qvm"
          role="dialog"
          aria-modal="true"
          aria-label="Commande confirmée"
          onClick={(e) => e.target === e.currentTarget && setOrderSuccess(null)}
        >
          <div className="bk-success">
            <div className="bk-top">
              <div className="bk-check">✓</div>
              <h2>Merci{orderSuccess.firstName ? `, ${orderSuccess.firstName}` : ""} !</h2>
            </div>
            <div className="bk-bd">
              <p>
                Ta commande est confirmée
                {orderSuccess.total != null ? ` (${formatEuro(orderSuccess.total)})` : ""}. Un email
                de confirmation arrive, et ta coach prépare ton envoi (48 h) ✨
              </p>
              <button className="bk-co" onClick={() => setOrderSuccess(null)}>
                Continuer mes achats
              </button>
            </div>
          </div>
        </div>
      )}
      {welcomeOpen && (
        <WelcomePopup
          slug={coachSlug ?? ""}
          shopName={shopName}
          onClose={() => setWelcomeOpen(false)}
        />
      )}
      {welcomeBar && !welcomeOpen && (
        <div className="bk-welcbar">
          <div className="bk-wb-txt">
            <b>−5 %</b> sur ta 1ʳᵉ commande
          </div>
          <button
            className="bk-wb-cta"
            onClick={() => {
              setWelcomeBar(false);
              setWelcomeOpen(true);
            }}
          >
            J'en profite
          </button>
          <button className="bk-wb-x" onClick={() => setWelcomeBar(false)} aria-label="Fermer">
            ×
          </button>
        </div>
      )}
    </div>
  );
}
