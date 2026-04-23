// Chantier Refonte onglet Produits app client (2026-04-25).
// Vitrine premium 3 sections : Hero "Recommandé pour toi" (gold) +
// "Mon programme actuel" (teal, live pv_client_products) + "Catalogue
// complet" repliable + footer WhatsApp coach.
//
// Source des recommandations : `recommendedProducts` (coach-curated depuis
// data.recommendations). La logique live body-scan est dans
// src/lib/productRecommendations.ts si on veut basculer plus tard.

import { useCallback, useEffect, useMemo, useState } from "react";
import { getSupabaseClient } from "../../services/supabaseClient";
import { HERBALIFE_PRODUCTS, type HerbalifeProduct } from "../../data/herbalifeCatalog";

interface PvCurrentProduct {
  id: string;
  product_id: string;
  product_name: string;
  quantite_label: string | null;
  price_public_per_unit: number | null;
  note_metier: string | null;
  start_date: string | null;
  // Optionnel : présent uniquement sur la source live Edge Function.
  pv_per_unit?: number | null;
  active?: boolean;
}

interface Props {
  clientId: string;
  coachFirstName: string;
  coachWhatsapp?: string;
  recommendedProducts: HerbalifeProduct[];
  latestScanDate?: string | null;
  productDetails: Record<string, string>;
  onAskCoach: (product: HerbalifeProduct) => void;
  // Chantier Migration RLS Edge Function (2026-04-26) : source live des
  // produits "en cours" (pv_client_products). Si fournie, prioritaire sur
  // le fetch legacy qui ne marche plus (RLS drop 25/04). Si non fournie
  // (ex: loading), fallback silencieux sur le fetch legacy + empty state.
  liveProducts?: PvCurrentProduct[] | null;
}

const CATEGORIES: Array<{ key: HerbalifeProduct["category"]; label: string; icon: string }> = [
  { key: "formula1", label: "Formula 1", icon: "🥤" },
  { key: "select", label: "Select", icon: "✨" },
  { key: "proteines", label: "En-cas & Protéines", icon: "💪" },
  { key: "complements", label: "Compléments", icon: "🌿" },
  { key: "boissons", label: "Boissons", icon: "🍵" },
  { key: "sport", label: "Sport & Vitalité H24", icon: "⚡" },
];

function formatDate(iso?: string | null): string {
  if (!iso) return "ton dernier bilan";
  try {
    return new Date(iso).toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch {
    return "ton dernier bilan";
  }
}

export function ClientProductsTab({
  clientId,
  coachFirstName,
  coachWhatsapp,
  recommendedProducts,
  latestScanDate,
  productDetails,
  onAskCoach,
  liveProducts,
}: Props) {
  // Source des produits en cours :
  //   1. liveProducts (Edge Function client-app-data) — prioritaire
  //   2. fallback fetch legacy qui échoue silencieusement (policies RLS
  //      droppées le 25/04) — empty array la plupart du temps
  const [legacyProducts, setLegacyProducts] = useState<PvCurrentProduct[]>([]);
  const currentProducts = liveProducts ?? legacyProducts;
  const [catalogueOpen, setCatalogueOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [openCategory, setOpenCategory] = useState<HerbalifeProduct["category"] | null>(null);

  // ─── Fallback legacy : SELECT direct (ne marchera plus tant que RLS
  // drop, mais on garde comme filet si un jour policies restaurées). Pas
  // appelé si liveProducts fourni.
  useEffect(() => {
    if (liveProducts) return; // Skip : on a déjà les données live via Edge Function
    let cancelled = false;
    async function load() {
      try {
        const sb = await getSupabaseClient();
        if (!sb || !clientId) return;
        const { data } = await sb
          .from("pv_client_products")
          .select("id, product_id, product_name, quantite_label, price_public_per_unit, note_metier, start_date")
          .eq("client_id", clientId)
          .eq("active", true)
          .order("start_date", { ascending: false });
        if (!cancelled && data) setLegacyProducts(data as PvCurrentProduct[]);
      } catch {
        /* RLS ou réseau — affichage empty state */
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [clientId, liveProducts]);

  const whatsappUrl = useMemo(() => {
    const digits = (coachWhatsapp ?? "").replace(/\D/g, "");
    if (!digits) return null;
    const msg = encodeURIComponent(
      `Salut ${coachFirstName} ! J'ai une question sur un produit de mon programme.`,
    );
    return `https://wa.me/${digits}?text=${msg}`;
  }, [coachWhatsapp, coachFirstName]);

  const recommendedRefs = useMemo(
    () => new Set(recommendedProducts.map((p) => p.ref)),
    [recommendedProducts],
  );
  const currentProductIds = useMemo(
    () => new Set(currentProducts.map((p) => p.product_id)),
    [currentProducts],
  );

  // Filtre catalogue par recherche
  const filteredByCategory = useCallback(
    (cat: HerbalifeProduct["category"]) =>
      HERBALIFE_PRODUCTS.filter(
        (p) =>
          p.category === cat &&
          !recommendedRefs.has(p.ref) &&
          !currentProductIds.has(p.ref) &&
          (!search ||
            p.name.toLowerCase().includes(search.toLowerCase()) ||
            p.shortBenefit.toLowerCase().includes(search.toLowerCase())),
      ),
    [recommendedRefs, currentProductIds, search],
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20, paddingBottom: 20 }}>
      <style>{`
        @keyframes prod-in { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes prod-stagger { from { opacity: 0; transform: translateY(14px) scale(0.98); } to { opacity: 1; transform: translateY(0) scale(1); } }
        .prod-reco-card { animation: prod-stagger 0.5s cubic-bezier(0.16,1,0.3,1) both; transition: transform 0.25s ease, box-shadow 0.25s ease; }
        .prod-reco-card:hover { transform: scale(1.02); box-shadow: 0 12px 30px rgba(186,117,23,0.2); }
        .prod-reco-card:nth-child(1){animation-delay:60ms}
        .prod-reco-card:nth-child(2){animation-delay:120ms}
        .prod-reco-card:nth-child(3){animation-delay:180ms}
        .prod-reco-card:nth-child(4){animation-delay:240ms}
        .prod-reco-card:nth-child(5){animation-delay:300ms}
        .prod-reco-card:nth-child(6){animation-delay:360ms}
        .prod-section { animation: prod-in 0.5s cubic-bezier(0.16,1,0.3,1) both; }
        @media (prefers-reduced-motion: reduce) {
          .prod-reco-card, .prod-section { animation: none !important; }
          .prod-reco-card:hover { transform: none; }
        }
      `}</style>

      {/* ─── [1] HERO "RECOMMANDÉ POUR TOI" ────────────────────────────── */}
      {recommendedProducts.length > 0 ? (
        <section
          className="prod-section"
          style={{
            borderRadius: 22,
            padding: "20px 16px 18px",
            background:
              "linear-gradient(180deg, rgba(245,184,71,0.16) 0%, rgba(255,255,255,0) 100%)",
            border: "1px solid rgba(239,159,39,0.35)",
            boxShadow: "0 6px 24px rgba(239,159,39,0.10)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
            <span aria-hidden="true" style={{ fontSize: 20 }}>✨</span>
            <h2
              style={{
                fontFamily: "Syne, sans-serif",
                fontSize: 18,
                fontWeight: 800,
                margin: 0,
                color: "#111827",
                letterSpacing: "-0.01em",
              }}
            >
              Recommandé pour toi
            </h2>
          </div>
          <p style={{ fontSize: 12, color: "#6B7280", margin: "0 0 16px", lineHeight: 1.55 }}>
            Basé sur ton body scan du{" "}
            <strong style={{ color: "#BA7517" }}>{formatDate(latestScanDate)}</strong>
          </p>

          <div style={{ display: "grid", gap: 10 }}>
            {recommendedProducts.map((product) => (
              <RecommendedCard
                key={product.ref}
                product={product}
                description={productDetails[product.ref] ?? product.shortBenefit}
                coachFirstName={coachFirstName}
                onAskCoach={onAskCoach}
              />
            ))}
          </div>
        </section>
      ) : null}

      {/* ─── [2] MON PROGRAMME ACTUEL ──────────────────────────────────── */}
      <section className="prod-section" style={{ animationDelay: "100ms" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
          <span aria-hidden="true" style={{ fontSize: 16 }}>✓</span>
          <h2
            style={{
              fontFamily: "Syne, sans-serif",
              fontSize: 16,
              fontWeight: 700,
              margin: 0,
              color: "#111827",
            }}
          >
            Mon programme actuel
          </h2>
        </div>

        {currentProducts.length > 0 ? (
          <div style={{ display: "grid", gap: 8 }}>
            {currentProducts.map((p) => (
              <div
                key={p.id}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 12,
                  padding: "14px 16px",
                  borderRadius: 16,
                  background: "rgba(13,110,86,0.06)",
                  border: "1px solid rgba(13,110,86,0.18)",
                }}
              >
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 8,
                    background: "rgba(13,110,86,0.14)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0F6E56" strokeWidth="2.5">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#111827" }}>{p.product_name}</div>
                  <div style={{ fontSize: 11, color: "#6B7280", marginTop: 2 }}>
                    Réf. {p.product_id}
                    {p.quantite_label ? ` · ${p.quantite_label}` : ""}
                  </div>
                  {p.note_metier ? (
                    <div style={{ fontSize: 11, color: "#0F6E56", marginTop: 4, fontStyle: "italic" }}>
                      {p.note_metier}
                    </div>
                  ) : null}
                </div>
                <div
                  style={{
                    fontFamily: "Syne, sans-serif",
                    fontSize: 13,
                    fontWeight: 700,
                    color: "#0F6E56",
                    flexShrink: 0,
                  }}
                >
                  {(p.price_public_per_unit ?? 0).toFixed(2)}€
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div
            style={{
              padding: "22px 18px",
              borderRadius: 16,
              border: "1px dashed rgba(13,110,86,0.3)",
              background: "rgba(13,110,86,0.03)",
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: 24, marginBottom: 8, opacity: 0.7 }}>📋</div>
            <div style={{ fontSize: 13, color: "#374151", lineHeight: 1.55, maxWidth: 320, margin: "0 auto" }}>
              Ton programme sera défini avec <strong>{coachFirstName}</strong> lors de ton prochain RDV.
            </div>
          </div>
        )}
      </section>

      {/* ─── [3] CATALOGUE COMPLET (repliable, fermé par défaut) ──────── */}
      <section className="prod-section" style={{ animationDelay: "180ms" }}>
        <button
          type="button"
          onClick={() => setCatalogueOpen((v) => !v)}
          style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "14px 16px",
            background: "#fff",
            border: "1px solid rgba(0,0,0,0.08)",
            borderRadius: catalogueOpen ? "14px 14px 0 0" : 14,
            fontSize: 14,
            fontWeight: 700,
            color: "#111827",
            fontFamily: "Syne, sans-serif",
            cursor: "pointer",
          }}
        >
          <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span aria-hidden="true">📚</span>
            Catalogue complet
          </span>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2">
            {catalogueOpen ? <polyline points="18 15 12 9 6 15" /> : <polyline points="6 9 12 15 18 9" />}
          </svg>
        </button>

        {catalogueOpen ? (
          <div
            style={{
              border: "1px solid rgba(0,0,0,0.08)",
              borderTop: "none",
              borderRadius: "0 0 14px 14px",
              padding: 12,
              background: "#fafaf9",
            }}
          >
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher un produit…"
              style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: 10,
                border: "1px solid rgba(0,0,0,0.1)",
                fontSize: 13,
                fontFamily: "DM Sans, sans-serif",
                marginBottom: 10,
                background: "#fff",
              }}
            />

            {CATEGORIES.map(({ key, label, icon }) => {
              const products = filteredByCategory(key);
              if (products.length === 0) return null;
              const isOpen = openCategory === key || !!search;
              return (
                <div key={key} style={{ marginBottom: 8 }}>
                  <button
                    type="button"
                    onClick={() => !search && setOpenCategory(isOpen && !search ? null : key)}
                    style={{
                      width: "100%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "10px 12px",
                      background: "#fff",
                      border: "1px solid rgba(0,0,0,0.06)",
                      borderRadius: isOpen ? "10px 10px 0 0" : 10,
                      fontSize: 13,
                      fontWeight: 600,
                      color: "#374151",
                      fontFamily: "Syne, sans-serif",
                      cursor: "pointer",
                    }}
                  >
                    <span>
                      <span aria-hidden="true" style={{ marginRight: 6 }}>{icon}</span>
                      {label}{" "}
                      <span style={{ fontSize: 11, color: "#9CA3AF", fontWeight: 400, marginLeft: 4 }}>
                        · {products.length}
                      </span>
                    </span>
                    {!search ? (
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2">
                        {isOpen ? <polyline points="18 15 12 9 6 15" /> : <polyline points="6 9 12 15 18 9" />}
                      </svg>
                    ) : null}
                  </button>
                  {isOpen ? (
                    <div
                      style={{
                        border: "1px solid rgba(0,0,0,0.06)",
                        borderTop: "none",
                        borderRadius: "0 0 10px 10px",
                        padding: 8,
                        background: "#fff",
                      }}
                    >
                      {products.map((product) => (
                        <CatalogCard
                          key={product.ref}
                          product={product}
                          description={productDetails[product.ref] ?? product.shortBenefit}
                          onAskCoach={onAskCoach}
                        />
                      ))}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        ) : null}
      </section>

      {/* ─── [4] FOOTER WHATSAPP ───────────────────────────────────────── */}
      <section
        className="prod-section"
        style={{
          animationDelay: "260ms",
          borderRadius: 16,
          padding: "16px 14px",
          background: "linear-gradient(135deg, rgba(37,211,102,0.08), rgba(37,211,102,0.02))",
          border: "1px solid rgba(37,211,102,0.25)",
          textAlign: "center",
        }}
      >
        <div style={{ fontSize: 13, color: "#374151", marginBottom: 10, lineHeight: 1.5 }}>
          Questions ? Contacte <strong>{coachFirstName}</strong> directement
        </div>
        {whatsappUrl ? (
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "10px 18px",
              borderRadius: 12,
              background: "#25D366",
              color: "#fff",
              textDecoration: "none",
              fontSize: 13,
              fontWeight: 700,
              fontFamily: "Syne, sans-serif",
              boxShadow: "0 4px 12px rgba(37,211,102,0.3)",
            }}
          >
            <span aria-hidden="true">💬</span>
            Contacter sur WhatsApp
          </a>
        ) : (
          <div style={{ fontSize: 12, color: "#6B7280", fontStyle: "italic" }}>
            Utilise l&apos;onglet Messages pour écrire à {coachFirstName}.
          </div>
        )}
      </section>
    </div>
  );
}

// ─── Sous-composant : card recommandée (hero) ─────────────────────────────
function RecommendedCard({
  product,
  description,
  coachFirstName,
  onAskCoach,
}: {
  product: HerbalifeProduct;
  description: string;
  coachFirstName: string;
  onAskCoach: (p: HerbalifeProduct) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div
      className="prod-reco-card"
      style={{
        background: "#fff",
        border: "1px solid rgba(239,159,39,0.28)",
        borderRadius: 18,
        padding: "14px 14px 12px",
        boxShadow: "0 4px 16px rgba(186,117,23,0.08)",
      }}
    >
      <div
        role="button"
        tabIndex={0}
        onClick={() => setOpen(!open)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setOpen(!open);
          }
        }}
        style={{ display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }}
      >
        {/* Visuel placeholder teal rond */}
        <div
          aria-hidden="true"
          style={{
            width: 44,
            height: 44,
            borderRadius: "50%",
            background: "linear-gradient(135deg, rgba(13,110,86,0.15), rgba(13,110,86,0.05))",
            border: "1px solid rgba(13,110,86,0.2)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <span style={{ fontSize: 18 }}>🌿</span>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#111827" }}>{product.shortName}</div>
            <span
              style={{
                fontSize: 9,
                padding: "2px 8px",
                borderRadius: 999,
                background: "linear-gradient(135deg, #EF9F27 0%, #BA7517 100%)",
                color: "#fff",
                fontWeight: 700,
                letterSpacing: "0.02em",
              }}
            >
              ★ POUR TOI
            </span>
          </div>
          <div
            style={{
              fontSize: 12,
              color: "#6B7280",
              fontStyle: "italic",
              marginTop: 3,
              lineHeight: 1.5,
            }}
          >
            {product.shortBenefit.split("·")[0].trim()}
          </div>
        </div>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2">
          {open ? <polyline points="18 15 12 9 6 15" /> : <polyline points="6 9 12 15 18 9" />}
        </svg>
      </div>

      {open ? (
        <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid rgba(0,0,0,0.06)" }}>
          <p style={{ fontSize: 12, color: "#4B5563", lineHeight: 1.7, margin: "0 0 12px" }}>
            {description}
          </p>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onAskCoach(product);
            }}
            style={{
              width: "100%",
              padding: "11px 14px",
              borderRadius: 12,
              background: "linear-gradient(135deg, #EF9F27 0%, #BA7517 100%)",
              color: "#FFFFFF",
              border: "none",
              fontSize: 13,
              fontWeight: 700,
              fontFamily: "Syne, sans-serif",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              boxShadow: "0 4px 14px rgba(186,117,23,0.3)",
            }}
          >
            <span aria-hidden="true">💬</span>
            En parler à {coachFirstName}
          </button>
        </div>
      ) : null}
    </div>
  );
}

// ─── Sous-composant : card catalogue (discret) ─────────────────────────────
function CatalogCard({
  product,
  description,
  onAskCoach,
}: {
  product: HerbalifeProduct;
  description: string;
  onAskCoach: (p: HerbalifeProduct) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => setOpen(!open)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          setOpen(!open);
        }
      }}
      style={{
        background: "#fff",
        border: "1px solid rgba(0,0,0,0.06)",
        borderRadius: 10,
        padding: 11,
        marginBottom: 6,
        cursor: "pointer",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div
          style={{
            width: 6,
            height: 6,
            borderRadius: "50%",
            background: "#9CA3AF",
            flexShrink: 0,
          }}
        />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: "#111827" }}>{product.shortName}</div>
          <div style={{ fontSize: 10, color: "#9CA3AF" }}>
            {product.shortBenefit.split("·")[0].trim()}
          </div>
        </div>
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2">
          {open ? <polyline points="18 15 12 9 6 15" /> : <polyline points="6 9 12 15 18 9" />}
        </svg>
      </div>
      {open ? (
        <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid rgba(0,0,0,0.06)" }}>
          <p style={{ fontSize: 11, color: "#6B7280", lineHeight: 1.6, margin: "0 0 10px" }}>
            {description}
          </p>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onAskCoach(product);
            }}
            style={{
              width: "100%",
              padding: "9px 12px",
              borderRadius: 10,
              background: "#374151",
              color: "#fff",
              border: "none",
              fontSize: 12,
              fontWeight: 600,
              fontFamily: "DM Sans, sans-serif",
              cursor: "pointer",
            }}
          >
            💬 En parler au coach
          </button>
        </div>
      ) : null}
    </div>
  );
}
