// =============================================================================
// PanierPage — calculateur de panier produits (chantier audit 2026-06-12,
// d'après la maquette Claude Design validée par Thomas).
//
// Le coach compose une sélection (catalogue pv_products réel), voit le total
// prix + le total PV, applique une remise client (%) et obtient le prix client
// instantanément — pour éviter d'aller calculer sur Bizworks. La remise ne
// touche QUE le prix ; le PV reste fixe. Récap chaleureux copiable en 1 clic.
//
// Branché sur le vrai catalogue (src/data/pvCatalog → pvProductCatalog).
// Tokens var(--ls-*) → suit le thème clair/sombre de l'app.
// =============================================================================

import { useMemo, useState } from "react";
import { pvProductCatalog } from "../data/pvCatalog";
import { useToast } from "../context/ToastContext";

const euro = (n: number) =>
  n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";
const pvf = (n: number) => n.toLocaleString("fr-FR", { maximumFractionDigits: 2 });
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

/** Regroupe les catégories texte-libre du catalogue en buckets lisibles. */
function bucket(cat: string): string {
  const c = (cat ?? "").toLowerCase();
  if (/shake|repas|formula 1/.test(c)) return "Shakes";
  if (/prot/.test(c)) return "Protéines";
  if (/hydrat|th[eé]|aloe/.test(c)) return "Hydratation";
  if (/g[eé]lul/.test(c)) return "Gélules";
  if (/energie|énergie|concentration|liftoff|workout/.test(c)) return "Boosters";
  if (/fibre|digest|transit|microbiotic/.test(c)) return "Digestion";
  if (/sommeil|night/.test(c)) return "Sommeil";
  if (/calcium|visceral|encas|barre|cal/.test(c)) return "Routine";
  return "Autres";
}

const CAT_ORDER = ["Shakes", "Protéines", "Hydratation", "Boosters", "Gélules", "Digestion", "Sommeil", "Routine", "Autres"];

interface CatProduct {
  id: string;
  name: string;
  bucket: string;
  price: number;
  pv: number;
}

export function PanierPage() {
  const { push } = useToast();
  const [query, setQuery] = useState("");
  const [cat, setCat] = useState("Tous");
  const [cart, setCart] = useState<Record<string, number>>({});
  const [discount, setDiscount] = useState(0);
  const [customText, setCustomText] = useState("");

  const products: CatProduct[] = useMemo(
    () =>
      pvProductCatalog
        .filter((p) => p.active && p.pricePublic > 0)
        .map((p) => ({ id: p.id, name: p.name, bucket: bucket(p.category), price: p.pricePublic, pv: p.pv })),
    [],
  );

  const cats = useMemo(() => {
    const present = new Set(products.map((p) => p.bucket));
    return ["Tous", ...CAT_ORDER.filter((c) => present.has(c))];
  }, [products]);

  const q = query.trim().toLowerCase();
  const filtered = products.filter(
    (p) => (cat === "Tous" || p.bucket === cat) && (!q || p.name.toLowerCase().includes(q)),
  );

  const lines = products.filter((p) => (cart[p.id] ?? 0) > 0);
  const totalPrice = lines.reduce((a, p) => a + cart[p.id] * p.price, 0);
  const totalPV = lines.reduce((a, p) => a + cart[p.id] * p.pv, 0);
  const disc = clamp(discount, 0, 100);
  const clientPrice = totalPrice * (1 - disc / 100);
  const savings = totalPrice - clientPrice;
  const itemCount = lines.reduce((a, p) => a + cart[p.id], 0);
  const hasItems = lines.length > 0;

  const add = (id: string) => setCart((c) => ({ ...c, [id]: (c[id] ?? 0) + 1 }));
  const dec = (id: string) =>
    setCart((c) => {
      const q2 = (c[id] ?? 0) - 1;
      const next = { ...c };
      if (q2 <= 0) delete next[id];
      else next[id] = q2;
      return next;
    });
  const remove = (id: string) =>
    setCart((c) => {
      const next = { ...c };
      delete next[id];
      return next;
    });
  const reset = () => {
    setCart({});
    setDiscount(0);
    setCustomText("");
  };

  function copyRecap() {
    if (!hasItems) return;
    const body = lines.map((p) => `• ${p.name} × ${cart[p.id]} — ${euro(p.price * cart[p.id])}`).join("\n");
    let txt = `Coucou 🌿 voici la sélection qu'on a préparée ensemble :\n\n${body}\n\nTotal : ${euro(totalPrice)}`;
    if (disc > 0) txt += `\nAvec ta remise de ${disc} % : ${euro(clientPrice)}\nTu économises ${euro(savings)} 🎉`;
    txt += `\n\nDis-moi si tu veux ajuster quelque chose, je suis là 💛`;
    void navigator.clipboard?.writeText(txt).then(() =>
      push({ tone: "success", title: "Récap copié", message: "Prêt à coller dans ta messagerie." }),
    );
  }

  return (
    <div style={{ maxWidth: 1180, margin: "0 auto", padding: "4px 4px 90px" }}>
      {/* Hero */}
      <div style={{ fontFamily: "Syne, sans-serif", fontSize: 11, fontWeight: 700, letterSpacing: 2.4, textTransform: "uppercase", color: "var(--ls-text-muted)" }}>
        La Base 360 · Calculateur
      </div>
      <h1 style={{ fontFamily: "Syne, sans-serif", fontWeight: 800, fontSize: "clamp(32px,6vw,52px)", lineHeight: 1.02, letterSpacing: "-1.5px", margin: "6px 0 0", color: "var(--ls-text)" }}>
        <span style={{ background: "linear-gradient(100deg,var(--ls-teal),var(--ls-purple))", WebkitBackgroundClip: "text", backgroundClip: "text", WebkitTextFillColor: "transparent" }}>
          Panier
        </span>
      </h1>
      <p style={{ margin: "8px 0 26px", color: "var(--ls-text-muted)", fontSize: 15, maxWidth: 440, fontFamily: "DM Sans, sans-serif" }}>
        Compose, applique une remise, obtiens le prix client en 2 secondes.
      </p>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 24, alignItems: "flex-start" }}>
        {/* Catalogue */}
        <section style={{ flex: "1 1 460px", minWidth: 0 }}>
          <div style={{ position: "relative", marginBottom: 14 }}>
            <svg width="16" height="16" viewBox="0 0 16 16" style={{ position: "absolute", left: 16, top: "50%", transform: "translateY(-50%)", stroke: "var(--ls-text-hint)", fill: "none", strokeWidth: 1.5, strokeLinecap: "round" }}>
              <circle cx="7" cy="7" r="5" />
              <line x1="11" y1="11" x2="15" y2="15" />
            </svg>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Rechercher un produit…"
              style={{ width: "100%", boxSizing: "border-box", padding: "13px 16px 13px 44px", borderRadius: 14, border: "1px solid var(--ls-border)", background: "var(--ls-input-bg)", color: "var(--ls-text)", fontSize: 14.5, fontFamily: "DM Sans, sans-serif", outline: "none" }}
            />
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 18 }}>
            {cats.map((c) => {
              const on = cat === c;
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCat(c)}
                  style={{
                    padding: "7px 14px",
                    borderRadius: 999,
                    fontSize: 12.5,
                    fontWeight: 600,
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                    fontFamily: "DM Sans, sans-serif",
                    border: on ? "1px solid transparent" : "1px solid var(--ls-border)",
                    background: on ? "var(--ls-text)" : "var(--ls-surface)",
                    color: on ? "var(--ls-bg)" : "var(--ls-text-muted)",
                  }}
                >
                  {c}
                </button>
              );
            })}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(198px,1fr))", gap: 13 }}>
            {filtered.map((p) => {
              const qty = cart[p.id] ?? 0;
              return (
                <div key={p.id} style={{ background: "var(--ls-surface)", border: "1px solid var(--ls-border)", borderRadius: 18, padding: 15, display: "flex", flexDirection: "column", gap: 11 }}>
                  <div style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: 1.3, textTransform: "uppercase", color: "var(--ls-text-hint)" }}>{p.bucket}</div>
                  <div style={{ fontFamily: "Syne, sans-serif", fontWeight: 600, fontSize: 14.5, lineHeight: 1.28, color: "var(--ls-text)", minHeight: 36 }}>{p.name}</div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                    <span style={{ fontFamily: "Syne, sans-serif", fontWeight: 700, fontSize: 18, color: "var(--ls-text)" }}>{euro(p.price)}</span>
                    <span style={pvBadge}>{pvf(p.pv)}<span style={{ fontSize: 9, letterSpacing: 0.5, opacity: 0.85 }}>PV</span></span>
                  </div>
                  {qty === 0 ? (
                    <button type="button" onClick={() => add(p.id)} style={{ width: "100%", padding: 9, borderRadius: 12, border: "1px solid var(--ls-border)", background: "var(--ls-surface2)", color: "var(--ls-text)", fontWeight: 600, fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, fontFamily: "DM Sans, sans-serif" }}>
                      <span style={{ color: "var(--ls-teal)", fontSize: 16, fontWeight: 700 }}>＋</span>Ajouter
                    </button>
                  ) : (
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, background: "var(--ls-surface2)", border: "1px solid var(--ls-border)", borderRadius: 12, padding: 5 }}>
                      <button type="button" onClick={() => dec(p.id)} style={stepBtn(false)}>−</button>
                      <span style={{ fontFamily: "Syne, sans-serif", fontWeight: 700, fontSize: 15, color: "var(--ls-text)" }}>{qty}</span>
                      <button type="button" onClick={() => add(p.id)} style={stepBtn(true)}>＋</button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* Panier */}
        <aside style={{ flex: "0 0 372px", maxWidth: "100%", position: "sticky", top: 16, alignSelf: "flex-start" }} className="panier-aside">
          <div style={{ background: "var(--ls-surface)", border: "1px solid var(--ls-border)", borderRadius: 22, padding: 22 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 16 }}>
              <span style={{ fontFamily: "Syne, sans-serif", fontWeight: 700, fontSize: 17, color: "var(--ls-text)" }}>Ton panier</span>
              {hasItems ? (
                <span style={{ padding: "4px 10px", borderRadius: 999, background: "var(--ls-surface2)", border: "1px solid var(--ls-border)", color: "var(--ls-text-muted)", fontSize: 12, fontWeight: 600 }}>
                  {itemCount} article{itemCount > 1 ? "s" : ""}
                </span>
              ) : null}
            </div>

            {!hasItems ? (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: 13, padding: "26px 6px 12px" }}>
                <div style={{ width: 100, height: 100, borderRadius: 999, background: "var(--ls-surface2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 44 }}>🛒</div>
                <div style={{ fontFamily: "Syne, sans-serif", fontWeight: 700, fontSize: 15, color: "var(--ls-text)" }}>Ton panier est vide</div>
                <div style={{ color: "var(--ls-text-muted)", fontSize: 13.5, lineHeight: 1.5, maxWidth: 220 }}>Ajoute des produits pour calculer le prix client.</div>
              </div>
            ) : (
              <>
                <div style={{ maxHeight: 300, overflow: "auto", margin: "0 -4px", padding: "0 4px" }}>
                  {lines.map((p) => (
                    <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 0", borderBottom: "1px solid var(--ls-border)" }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: 14, color: "var(--ls-text)", lineHeight: 1.3 }}>{p.name}</div>
                        <div style={{ color: "var(--ls-text-hint)", fontSize: 12.5, marginTop: 3 }}>× {cart[p.id]}</div>
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
                        <span style={{ fontFamily: "Syne, sans-serif", fontWeight: 700, fontSize: 14.5, color: "var(--ls-text)" }}>{euro(p.price * cart[p.id])}</span>
                        <span style={{ ...pvBadge, fontSize: 10.5, padding: "2px 7px" }}>{pvf(p.pv * cart[p.id])}<span style={{ fontSize: 8.5, opacity: 0.85 }}>PV</span></span>
                      </div>
                      <button type="button" onClick={() => remove(p.id)} title="Retirer" style={{ width: 28, height: 28, flex: "none", borderRadius: 9, border: "none", background: "transparent", color: "var(--ls-text-hint)", cursor: "pointer", fontSize: 15 }}>✕</button>
                    </div>
                  ))}
                </div>

                {/* Totaux */}
                <div style={{ marginTop: 16 }}>
                  <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
                    <span style={{ color: "var(--ls-text-muted)", fontSize: 13.5 }}>Total catalogue</span>
                    <span style={{ fontFamily: "Syne, sans-serif", fontWeight: 700, fontSize: 18, color: "var(--ls-text)" }}>{euro(totalPrice)}</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 11 }}>
                    <span style={{ color: "var(--ls-text-muted)", fontSize: 13.5 }}>Volume</span>
                    <span style={{ display: "inline-flex", alignItems: "baseline", gap: 5, padding: "6px 13px", borderRadius: 999, background: "linear-gradient(100deg, color-mix(in srgb, var(--ls-teal) 14%, transparent), color-mix(in srgb, var(--ls-purple) 16%, transparent))", border: "1px solid var(--ls-border)", color: "var(--ls-teal)", fontFamily: "Syne, sans-serif", fontWeight: 700, fontSize: 15 }}>
                      {pvf(totalPV)}<span style={{ fontSize: 10, letterSpacing: 0.5, opacity: 0.85 }}>PV</span>
                    </span>
                  </div>
                </div>

                {/* Remise */}
                <div style={{ marginTop: 18, paddingTop: 18, borderTop: "1px solid var(--ls-border)" }}>
                  <span style={{ display: "block", color: "var(--ls-text-muted)", fontSize: 13.5, fontWeight: 600, marginBottom: 10 }}>Remise client</span>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 7, alignItems: "center" }}>
                    {[5, 10, 15, 25, 35].map((v) => {
                      const on = discount === v && customText === "";
                      return (
                        <button
                          key={v}
                          type="button"
                          onClick={() => {
                            setDiscount(v);
                            setCustomText("");
                          }}
                          style={{
                            padding: "7px 13px",
                            borderRadius: 999,
                            fontSize: 13,
                            fontWeight: 700,
                            cursor: "pointer",
                            fontFamily: "Syne, sans-serif",
                            border: on ? "1px solid transparent" : "1px solid var(--ls-border)",
                            background: on ? "var(--ls-text)" : "var(--ls-surface2)",
                            color: on ? "var(--ls-bg)" : "var(--ls-text-muted)",
                          }}
                        >
                          {v} %
                        </button>
                      );
                    })}
                    <input
                      value={customText}
                      onChange={(e) => {
                        const v = e.target.value;
                        setCustomText(v);
                        setDiscount(clamp(parseFloat(v.replace(",", ".")) || 0, 0, 100));
                      }}
                      placeholder="%"
                      inputMode="decimal"
                      style={{ width: 62, padding: "8px 10px", borderRadius: 999, border: "1px solid var(--ls-border)", background: "var(--ls-input-bg)", color: "var(--ls-text)", fontSize: 13, textAlign: "center", fontWeight: 600 }}
                    />
                  </div>
                </div>

                {/* Prix client */}
                <div style={{ marginTop: 18, background: "color-mix(in srgb, var(--ls-gold) 10%, transparent)", border: "1px solid color-mix(in srgb, var(--ls-gold) 28%, transparent)", borderRadius: 18, padding: "16px 18px" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                    <span style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: 1.2, textTransform: "uppercase", color: "var(--ls-text-muted)" }}>Prix client</span>
                    {disc > 0 ? (
                      <span style={{ padding: "3px 9px", borderRadius: 999, background: "var(--ls-gold)", color: "#1a1407", fontSize: 11.5, fontWeight: 700 }}>−{disc} %</span>
                    ) : null}
                  </div>
                  <div style={{ fontFamily: "Syne, sans-serif", fontWeight: 800, fontSize: 34, lineHeight: 1, color: "var(--ls-gold)", marginTop: 7 }}>{euro(clientPrice)}</div>
                  {savings > 0.005 ? (
                    <div style={{ display: "inline-flex", alignItems: "center", gap: 6, marginTop: 11, padding: "5px 11px", borderRadius: 999, background: "color-mix(in srgb, #34D399 14%, transparent)", color: "#34D399", fontWeight: 700, fontSize: 12.5 }}>
                      <span style={{ fontSize: 14 }}>↓</span>Tu économises {euro(savings)}
                    </div>
                  ) : null}
                </div>

                {/* Actions */}
                <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
                  <button type="button" onClick={copyRecap} style={{ flex: 1, padding: 13, borderRadius: 14, border: "none", background: "linear-gradient(100deg,var(--ls-teal),var(--ls-purple))", color: "#fff", fontFamily: "Syne, sans-serif", fontWeight: 700, fontSize: 13.5, cursor: "pointer" }}>
                    📋 Copier le récap
                  </button>
                  <button type="button" onClick={reset} style={{ padding: "13px 16px", borderRadius: 14, border: "1px solid var(--ls-border)", background: "transparent", color: "var(--ls-text-muted)", fontWeight: 600, fontSize: 13.5, cursor: "pointer", fontFamily: "DM Sans, sans-serif" }}>
                    Réinitialiser
                  </button>
                </div>
              </>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}

const pvBadge: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "baseline",
  gap: 4,
  padding: "4px 9px",
  borderRadius: 999,
  background: "color-mix(in srgb, var(--ls-teal) 13%, transparent)",
  color: "var(--ls-teal)",
  fontFamily: "Syne, sans-serif",
  fontWeight: 700,
  fontSize: 12,
  whiteSpace: "nowrap",
};

function stepBtn(primary: boolean): React.CSSProperties {
  return {
    width: 36,
    height: 30,
    borderRadius: 9,
    border: "none",
    cursor: "pointer",
    fontSize: 18,
    lineHeight: 1,
    background: primary ? "var(--ls-teal)" : "var(--ls-surface)",
    color: primary ? "#fff" : "var(--ls-text)",
  };
}
