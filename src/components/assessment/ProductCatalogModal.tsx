// ProductCatalogModal — sandbox catalogue complet Herbalife (2026-04-29).
//
// Modale plein ecran avec :
//  - Header gold gradient + close button
//  - Search bar (filtre par nom / categorie / note metier)
//  - Filter chips par categorie (auto-derivees du catalogue)
//  - Grid produits avec cards similaires SelectableProductCard
//  - Click "Ajouter" → toggle dans le panier (ou +1 quantite si deja la)
//
// Usage : depuis le step Programme du bilan, bouton sous le ticket
// "+ Ajouter du catalogue" qui ouvre cette modale. Permet d'inclure des
// produits non listes dans les besoins detectes (barres, chips, etc).

import { useEffect, useMemo, useState } from "react";
import { pvProductCatalog } from "../../data/pvCatalog";
import type { PvProductCatalogItem } from "../../types/pv";

const PRODUCT_EMOJI_MAP: Array<{ match: RegExp; emoji: string }> = [
  { match: /formula\s*1|f1\b|boisson nutritionnelle/i, emoji: "🥛" },
  { match: /melange.*proteine|formula\s*3|ppp\b|pdm\b/i, emoji: "💪" },
  { match: /formula\s*2|multivit/i, emoji: "💊" },
  { match: /aloe/i, emoji: "🌿" },
  { match: /\bthe\b|tea\b/i, emoji: "🍵" },
  { match: /hydrate/i, emoji: "💧" },
  { match: /calcium|xtra[-\s]?cal/i, emoji: "🦴" },
  { match: /collag/i, emoji: "✨" },
  { match: /liftoff/i, emoji: "⚡" },
  { match: /cr7|n-r-g|nrg/i, emoji: "🏆" },
  { match: /cell.*activ/i, emoji: "🧬" },
  { match: /niteworks/i, emoji: "🌙" },
  { match: /omega|fish/i, emoji: "🐟" },
  { match: /iron|roseguard|immun/i, emoji: "🛡️" },
  { match: /skin|beaut/i, emoji: "💎" },
  { match: /chips|barre|bar\b|encas|en-cas/i, emoji: "🍫" },
  { match: /soup|soupe/i, emoji: "🍲" },
  { match: /fibre|cell.*u.*loss/i, emoji: "🌾" },
  { match: /shaker|gourde/i, emoji: "🥤" },
  { match: /creatine/i, emoji: "💥" },
  { match: /phyto|brule|graisse/i, emoji: "🔥" },
  { match: /digest/i, emoji: "💚" },
  { match: /sommeil|night/i, emoji: "🌙" },
];

function getEmoji(name: string, category: string): string {
  const haystack = `${name} ${category}`;
  for (const { match, emoji } of PRODUCT_EMOJI_MAP) {
    if (match.test(haystack)) return emoji;
  }
  return "💊";
}

function formatPrice(value: number) {
  return `${value.toFixed(2).replace(".", ",")}€`;
}

export interface ProductCatalogModalProps {
  open: boolean;
  onClose: () => void;
  /** IDs deja dans le panier (pour bouton "Deja ajoute") */
  selectedIds: string[];
  /** Callback ajout produit au panier */
  onAddProduct: (productId: string) => void;
}

export function ProductCatalogModal({
  open,
  onClose,
  selectedIds,
  onAddProduct,
}: ProductCatalogModalProps) {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("all");

  // Reset search/category quand modale ferme
  useEffect(() => {
    if (!open) {
      setSearch("");
      setActiveCategory("all");
    }
  }, [open]);

  // ESC pour fermer
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  // Body scroll lock
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const activeProducts = useMemo(
    () => pvProductCatalog.filter((p) => p.active),
    []
  );

  // Macro sections inspirees du PDF catalogue Herbalife (V3.3 — 2026-04-29).
  // Au lieu de 15+ categories techniques eclatees, on regroupe en 6 grandes
  // familles claires pour le coach et le client.
  const MACRO_SECTIONS: Array<{
    id: string;
    label: string;
    emoji: string;
    color: string;
    matches: RegExp[];
  }> = useMemo(
    () => [
      {
        id: "petit-dejeuner",
        label: "Petit-déjeuner & Repas",
        emoji: "🥛",
        color: "var(--ls-gold)",
        matches: [/shake/i, /repas/i, /proteine/i, /protéine/i, /fibre/i],
      },
      {
        id: "snacks",
        label: "Snacks & En-cas",
        emoji: "🍫",
        color: "var(--ls-coral)",
        matches: [/encas/i, /en-cas/i, /chips/i, /barre/i, /bar\b/i],
      },
      {
        id: "hydratation",
        label: "Hydratation",
        emoji: "💧",
        color: "var(--ls-purple)",
        matches: [/hydratation/i, /aloe/i],
      },
      {
        id: "sport",
        label: "Sport & Énergie",
        emoji: "💪",
        color: "var(--ls-teal)",
        matches: [/sport/i, /muscle/i, /énergie/i, /energie/i, /concentration/i, /creatine/i],
      },
      {
        id: "vitalite",
        label: "Vitalité & Compléments",
        emoji: "🛡️",
        color: "var(--ls-gold)",
        matches: [/calcium/i, /immunité/i, /immunite/i, /gelule/i, /digestif/i, /sommeil/i, /visceral/i],
      },
      {
        id: "beaute",
        label: "Beauté & Bien-être",
        emoji: "💎",
        color: "var(--ls-coral)",
        matches: [/collag/i, /skin/i, /beaut/i, /night/i],
      },
    ],
    [],
  );

  function getProductSection(category: string): typeof MACRO_SECTIONS[number] {
    for (const section of MACRO_SECTIONS) {
      if (section.matches.some((rx) => rx.test(category))) return section;
    }
    // Fallback : range dans Vitalite si rien ne match
    return MACRO_SECTIONS[4];
  }

  // Index produits par section macro
  const productsBySection = useMemo(() => {
    const map = new Map<string, typeof activeProducts>();
    MACRO_SECTIONS.forEach((s) => map.set(s.id, []));
    for (const p of activeProducts) {
      const section = getProductSection(p.category);
      const list = map.get(section.id);
      if (list) list.push(p);
    }
    return map;
  }, [activeProducts, MACRO_SECTIONS]);

  // Filtre actif (section macro + search). On rend par section.
  const sectionsToRender = useMemo(() => {
    const q = search.trim().toLowerCase();
    return MACRO_SECTIONS.map((section) => {
      const all = productsBySection.get(section.id) ?? [];
      const filtered = all.filter((p) => {
        if (!q) return true;
        const hay = `${p.name} ${p.category} ${p.noteMetier ?? ""}`.toLowerCase();
        return hay.includes(q);
      });
      return { ...section, products: filtered, totalCount: all.length };
    }).filter((s) => {
      if (activeCategory === "all") return s.products.length > 0;
      return s.id === activeCategory && s.products.length > 0;
    });
  }, [MACRO_SECTIONS, productsBySection, search, activeCategory]);

  const totalFilteredCount = sectionsToRender.reduce((s, sec) => s + sec.products.length, 0);

  if (!open) return null;

  return (
    <>
      <style>{`
        @keyframes ls-cat-fade-in {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes ls-cat-slide-up {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes ls-cat-shine {
          0%, 100% { transform: translateX(-30%); opacity: 0; }
          50%      { transform: translateX(180%); opacity: 0.40; }
        }
        .ls-cat-overlay {
          animation: ls-cat-fade-in 0.18s ease-out;
        }
        .ls-cat-panel {
          animation: ls-cat-slide-up 0.32s cubic-bezier(0.22, 1, 0.36, 1);
        }
        /* Cache la scrollbar horizontale du chips bar (firefox + chrome) */
        .ls-cat-chips::-webkit-scrollbar { display: none; }
        .ls-cat-chips { scrollbar-width: none; }
        /* Mobile : modale full screen, padding reduit, grid 1 colonne */
        @media (max-width: 640px) {
          .ls-cat-overlay {
            padding: 0 !important;
          }
          .ls-cat-panel {
            max-height: 100vh !important;
            max-height: 100dvh !important;
            height: 100% !important;
            border-radius: 0 !important;
            max-width: 100% !important;
          }
          .ls-cat-body {
            padding: 14px 14px 18px !important;
          }
          .ls-cat-grid {
            grid-template-columns: 1fr !important;
          }
        }
        /* Tablet : grid 2 colonnes */
        @media (min-width: 641px) and (max-width: 900px) {
          .ls-cat-grid {
            grid-template-columns: 1fr 1fr !important;
          }
        }
      `}</style>
      {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events -- Backdrop, ESC at dialog level */}
      <div
        className="ls-cat-overlay"
        role="dialog"
        aria-modal="true"
        aria-labelledby="ls-cat-title"
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 9000,
          background: "color-mix(in srgb, var(--ls-bg) 75%, transparent)",
          backdropFilter: "blur(6px)",
          WebkitBackdropFilter: "blur(6px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "20px 12px",
          fontFamily: "DM Sans, sans-serif",
        }}
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <div
          className="ls-cat-panel"
          style={{
            width: "100%",
            maxWidth: 980,
            maxHeight: "92vh",
            display: "flex",
            flexDirection: "column",
            background: "var(--ls-surface)",
            border: "0.5px solid color-mix(in srgb, var(--ls-gold) 30%, var(--ls-border))",
            borderRadius: 24,
            overflow: "hidden",
            boxShadow:
              "0 24px 64px -16px rgba(0,0,0,0.40), 0 1px 0 0 rgba(239,159,39,0.20)",
          }}
        >
          {/* HEADER */}
          <div
            style={{
              position: "relative",
              overflow: "hidden",
              padding: "18px 22px",
              background: "linear-gradient(135deg, #EF9F27 0%, #BA7517 60%, #5C3A05 100%)",
              color: "#FFFFFF",
              flexShrink: 0,
            }}
          >
            <div
              aria-hidden
              style={{
                position: "absolute",
                top: 0, left: 0, height: "100%", width: "30%",
                background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.40), transparent)",
                animation: "ls-cat-shine 5.5s ease-in-out infinite",
                pointerEvents: "none",
              }}
            />
            <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
                <div
                  style={{
                    width: 44, height: 44, flexShrink: 0,
                    borderRadius: 14,
                    background: "rgba(255,255,255,0.18)",
                    border: "1px solid rgba(255,255,255,0.35)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 22,
                    backdropFilter: "blur(8px)",
                    WebkitBackdropFilter: "blur(8px)",
                  }}
                >
                  🛍️
                </div>
                <div>
                  <div style={{ fontSize: 10, letterSpacing: 1.6, textTransform: "uppercase", fontWeight: 800, color: "rgba(255,255,255,0.90)", marginBottom: 2 }}>
                    Sandbox Catalogue
                  </div>
                  <h2
                    id="ls-cat-title"
                    style={{
                      fontFamily: "Syne, serif",
                      fontWeight: 800,
                      fontSize: 22,
                      letterSpacing: "-0.02em",
                      margin: 0,
                      textShadow: "0 1px 2px rgba(0,0,0,0.18)",
                    }}
                  >
                    Gamme complete Herbalife
                  </h2>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Fermer le catalogue"
                style={{
                  width: 36, height: 36, flexShrink: 0,
                  borderRadius: 999,
                  border: "1px solid rgba(255,255,255,0.30)",
                  background: "rgba(255,255,255,0.18)",
                  color: "#FFFFFF",
                  cursor: "pointer",
                  fontSize: 18,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  transition: "transform 0.15s ease, background 0.15s ease",
                  backdropFilter: "blur(6px)",
                  WebkitBackdropFilter: "blur(6px)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "rotate(90deg)";
                  e.currentTarget.style.background = "rgba(255,255,255,0.30)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "none";
                  e.currentTarget.style.background = "rgba(255,255,255,0.18)";
                }}
              >
                ✕
              </button>
            </div>
          </div>

          {/* SEARCH + FILTERS */}
          <div
            style={{
              padding: "14px 22px",
              borderBottom: "0.5px solid var(--ls-border)",
              flexShrink: 0,
              display: "flex",
              flexDirection: "column",
              gap: 10,
            }}
          >
            <div style={{ position: "relative" }}>
              <span
                aria-hidden
                style={{
                  position: "absolute",
                  left: 14,
                  top: "50%",
                  transform: "translateY(-50%)",
                  fontSize: 16,
                  color: "var(--ls-text-hint)",
                  pointerEvents: "none",
                }}
              >
                🔍
              </span>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher un produit (barre, calcium, F1...)"
                style={{
                  width: "100%",
                  padding: "10px 14px 10px 38px",
                  borderRadius: 12,
                  border: "0.5px solid var(--ls-border)",
                  background: "var(--ls-surface2)",
                  color: "var(--ls-text)",
                  fontSize: 13.5,
                  fontFamily: "DM Sans, sans-serif",
                  outline: "none",
                  transition: "border-color 0.15s ease, box-shadow 0.15s ease",
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = "color-mix(in srgb, var(--ls-gold) 50%, transparent)";
                  e.currentTarget.style.boxShadow = "0 0 0 3px color-mix(in srgb, var(--ls-gold) 15%, transparent)";
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = "var(--ls-border)";
                  e.currentTarget.style.boxShadow = "none";
                }}
              />
            </div>

            {/* Macro section chips (V3.3 — 2026-04-29) */}
            <div
              className="ls-cat-chips"
              style={{
                display: "flex",
                gap: 6,
                flexWrap: "wrap",
                overflowX: "auto",
                WebkitOverflowScrolling: "touch",
                paddingBottom: 2,
              }}
            >
              <button
                type="button"
                onClick={() => setActiveCategory("all")}
                style={{
                  padding: "7px 13px",
                  borderRadius: 999,
                  border: activeCategory === "all"
                    ? "0.5px solid color-mix(in srgb, var(--ls-gold) 50%, transparent)"
                    : "0.5px solid var(--ls-border)",
                  background: activeCategory === "all"
                    ? "linear-gradient(135deg, color-mix(in srgb, var(--ls-gold) 14%, var(--ls-surface)) 0%, var(--ls-surface) 100%)"
                    : "var(--ls-surface)",
                  color: activeCategory === "all" ? "var(--ls-gold)" : "var(--ls-text-muted)",
                  fontSize: 12,
                  fontWeight: activeCategory === "all" ? 700 : 500,
                  fontFamily: "DM Sans, sans-serif",
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  flexShrink: 0,
                  boxShadow: activeCategory === "all" ? "0 2px 8px -3px rgba(239,159,39,0.30)" : "none",
                }}
              >
                ✨ Tout
                <span
                  style={{
                    fontSize: 10, fontWeight: 800, fontFamily: "Syne, serif",
                    padding: "1px 6px", borderRadius: 999,
                    background: activeCategory === "all" ? "var(--ls-bg)" : "var(--ls-surface2)",
                    color: activeCategory === "all" ? "var(--ls-gold)" : "var(--ls-text-hint)",
                    border: activeCategory === "all" ? "0.5px solid var(--ls-gold)" : "0.5px solid transparent",
                  }}
                >
                  {activeProducts.length}
                </span>
              </button>
              {MACRO_SECTIONS.map((section) => {
                const count = (productsBySection.get(section.id) ?? []).length;
                if (count === 0) return null;
                const isActive = activeCategory === section.id;
                return (
                  <button
                    key={section.id}
                    type="button"
                    onClick={() => setActiveCategory(section.id)}
                    style={{
                      padding: "7px 13px",
                      borderRadius: 999,
                      border: isActive
                        ? `0.5px solid color-mix(in srgb, ${section.color} 50%, transparent)`
                        : "0.5px solid var(--ls-border)",
                      background: isActive
                        ? `linear-gradient(135deg, color-mix(in srgb, ${section.color} 14%, var(--ls-surface)) 0%, var(--ls-surface) 100%)`
                        : "var(--ls-surface)",
                      color: isActive ? section.color : "var(--ls-text-muted)",
                      fontSize: 12,
                      fontWeight: isActive ? 700 : 500,
                      fontFamily: "DM Sans, sans-serif",
                      cursor: "pointer",
                      whiteSpace: "nowrap",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      flexShrink: 0,
                      boxShadow: isActive ? `0 2px 8px -3px ${section.color}50` : "none",
                      transition: "transform 0.15s ease, border-color 0.15s ease",
                    }}
                    onMouseEnter={(e) => {
                      if (!isActive) e.currentTarget.style.transform = "translateY(-1px)";
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive) e.currentTarget.style.transform = "none";
                    }}
                  >
                    <span style={{ fontSize: 14 }}>{section.emoji}</span>
                    {section.label}
                    <span
                      style={{
                        fontSize: 10, fontWeight: 800, fontFamily: "Syne, serif",
                        padding: "1px 6px", borderRadius: 999,
                        background: isActive ? "var(--ls-bg)" : "var(--ls-surface2)",
                        color: isActive ? section.color : "var(--ls-text-hint)",
                        border: isActive ? `0.5px solid ${section.color}` : "0.5px solid transparent",
                      }}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* GRID PRODUITS — par sections macro, scrollable */}
          <div
            className="ls-cat-body"
            style={{
              flex: 1,
              overflowY: "auto",
              WebkitOverflowScrolling: "touch",
              padding: "18px 22px 22px",
            }}
          >
            {totalFilteredCount === 0 ? (
              <div
                style={{
                  textAlign: "center",
                  padding: "40px 20px",
                  color: "var(--ls-text-muted)",
                  fontSize: 14,
                  fontFamily: "DM Sans, sans-serif",
                }}
              >
                <div style={{ fontSize: 40, marginBottom: 8 }}>🤷‍♂️</div>
                Aucun produit trouvé avec ces filtres.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
                {sectionsToRender.map((section) => (
                  <section key={section.id}>
                    {/* Section header */}
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        marginBottom: 12,
                        paddingBottom: 8,
                        borderBottom: `0.5px solid color-mix(in srgb, ${section.color} 25%, var(--ls-border))`,
                      }}
                    >
                      <div
                        style={{
                          width: 36, height: 36, flexShrink: 0,
                          borderRadius: 12,
                          background: `linear-gradient(135deg, color-mix(in srgb, ${section.color} 22%, var(--ls-surface2)) 0%, var(--ls-surface2) 100%)`,
                          border: `0.5px solid color-mix(in srgb, ${section.color} 35%, transparent)`,
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: 18,
                        }}
                      >
                        {section.emoji}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            fontFamily: "Syne, serif",
                            fontSize: 15,
                            fontWeight: 800,
                            color: "var(--ls-text)",
                            letterSpacing: "-0.01em",
                            lineHeight: 1.2,
                          }}
                        >
                          {section.label}
                        </div>
                        <div
                          style={{
                            fontSize: 10,
                            color: "var(--ls-text-hint)",
                            fontFamily: "DM Sans, sans-serif",
                            letterSpacing: 0.5,
                            textTransform: "uppercase",
                            fontWeight: 600,
                          }}
                        >
                          {section.products.length} produit{section.products.length > 1 ? "s" : ""}
                        </div>
                      </div>
                    </div>

                    {/* Grid produits de la section */}
                    <div
                      className="ls-cat-grid"
                      style={{
                        display: "grid",
                        gap: 10,
                        gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
                      }}
                    >
                      {section.products.map((p) => (
                        <CatalogCard
                          key={p.id}
                          product={p}
                          isInCart={selectedIds.includes(p.id)}
                          onAdd={() => onAddProduct(p.id)}
                        />
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

interface CatalogCardProps {
  product: PvProductCatalogItem;
  isInCart: boolean;
  onAdd: () => void;
}

function CatalogCard({ product, isInCart, onAdd }: CatalogCardProps) {
  const emoji = getEmoji(product.name, product.category);
  return (
    // eslint-disable-next-line jsx-a11y/no-static-element-interactions -- Hover effect only, button inside handles interaction
    <div
      style={{
        display: "flex",
        gap: 12,
        padding: "12px 14px",
        borderRadius: 14,
        background: isInCart
          ? "linear-gradient(135deg, color-mix(in srgb, var(--ls-teal) 8%, var(--ls-surface)) 0%, var(--ls-surface) 100%)"
          : "var(--ls-surface)",
        border: isInCart
          ? "0.5px solid color-mix(in srgb, var(--ls-teal) 35%, transparent)"
          : "0.5px solid var(--ls-border)",
        borderLeft: isInCart ? "3px solid var(--ls-teal)" : "3px solid transparent",
        transition: "transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-2px)";
        e.currentTarget.style.boxShadow = "0 6px 18px -8px rgba(0,0,0,0.18)";
        if (!isInCart) {
          e.currentTarget.style.borderColor = "color-mix(in srgb, var(--ls-gold) 30%, var(--ls-border))";
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "none";
        e.currentTarget.style.boxShadow = "none";
        if (!isInCart) {
          e.currentTarget.style.borderColor = "var(--ls-border)";
        }
      }}
    >
      {/* Avatar emoji */}
      <div
        style={{
          width: 44, height: 44, flexShrink: 0,
          borderRadius: 12,
          background: isInCart
            ? "linear-gradient(135deg, var(--ls-teal) 0%, color-mix(in srgb, var(--ls-teal) 70%, #000) 100%)"
            : "linear-gradient(135deg, color-mix(in srgb, var(--ls-gold) 18%, var(--ls-surface2)) 0%, var(--ls-surface2) 100%)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 22,
          boxShadow: isInCart
            ? "0 3px 8px -3px rgba(45,212,191,0.45), inset 0 1px 0 rgba(255,255,255,0.20)"
            : "inset 0 1px 0 rgba(255,255,255,0.08)",
          border: isInCart ? "none" : "0.5px solid var(--ls-border)",
        }}
      >
        {emoji}
      </div>

      {/* Contenu */}
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 6 }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 8, justifyContent: "space-between" }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontFamily: "Syne, serif",
                fontSize: 13.5,
                fontWeight: 700,
                color: "var(--ls-text)",
                letterSpacing: "-0.01em",
                lineHeight: 1.25,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {product.name}
            </div>
            <div
              style={{
                fontSize: 10.5,
                color: "var(--ls-text-muted)",
                marginTop: 2,
                textTransform: "capitalize",
                fontFamily: "DM Sans, sans-serif",
              }}
            >
              {product.category}
            </div>
          </div>
          <button
            type="button"
            onClick={onAdd}
            disabled={isInCart}
            style={{
              padding: "6px 12px",
              borderRadius: 999,
              border: "none",
              cursor: isInCart ? "default" : "pointer",
              fontSize: 11.5,
              fontWeight: 700,
              fontFamily: "DM Sans, sans-serif",
              background: isInCart
                ? "color-mix(in srgb, var(--ls-teal) 15%, var(--ls-surface))"
                : "linear-gradient(135deg, #EF9F27 0%, #BA7517 100%)",
              color: isInCart ? "var(--ls-teal)" : "#FFFFFF",
              boxShadow: isInCart ? "none" : "0 3px 8px -2px rgba(186,117,23,0.40)",
              transition: "transform 0.15s ease, filter 0.15s ease",
              flexShrink: 0,
              whiteSpace: "nowrap",
            }}
            onMouseEnter={(e) => {
              if (!isInCart) {
                e.currentTarget.style.transform = "translateY(-1px)";
                e.currentTarget.style.filter = "brightness(1.08)";
              }
            }}
            onMouseLeave={(e) => {
              if (!isInCart) {
                e.currentTarget.style.transform = "none";
                e.currentTarget.style.filter = "none";
              }
            }}
          >
            {isInCart ? "✓ Ajouté" : "+ Ajouter"}
          </button>
        </div>

        {/* Pills info */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
          {product.dureeReferenceJours > 0 && (
            <span
              style={{
                fontSize: 10, fontWeight: 600,
                padding: "2px 8px", borderRadius: 999,
                background: "color-mix(in srgb, var(--ls-purple) 12%, transparent)",
                color: "var(--ls-purple)",
                fontFamily: "DM Sans, sans-serif",
                border: "0.5px solid color-mix(in srgb, var(--ls-purple) 25%, transparent)",
              }}
            >
              📅 {product.dureeReferenceJours}j
            </span>
          )}
          <span
            style={{
              fontSize: 10.5, fontWeight: 700,
              padding: "2px 8px", borderRadius: 999,
              background: "color-mix(in srgb, var(--ls-gold) 14%, transparent)",
              color: "var(--ls-gold)",
              fontFamily: "DM Sans, sans-serif",
              border: "0.5px solid color-mix(in srgb, var(--ls-gold) 30%, transparent)",
            }}
          >
            {formatPrice(product.pricePublic)}
          </span>
          {product.pv > 0 && (
            <span
              style={{
                fontSize: 10, fontWeight: 700,
                padding: "2px 8px", borderRadius: 999,
                background: "color-mix(in srgb, var(--ls-teal) 12%, transparent)",
                color: "var(--ls-teal)",
                fontFamily: "DM Sans, sans-serif",
                border: "0.5px solid color-mix(in srgb, var(--ls-teal) 25%, transparent)",
              }}
            >
              {product.pv.toFixed(1)} PV
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
