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
import { useNavigate } from "react-router-dom";
import { pvProductCatalog } from "../data/pvCatalog";
import { useToast } from "../context/ToastContext";
import { useAppContext } from "../context/AppContext";
import { recordQuickSale } from "../services/supabaseService";

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

// Emoji par produit (même logique que le ticket du bilan) → identité visuelle.
const PRODUCT_EMOJI_MAP: Array<{ match: RegExp; emoji: string }> = [
  { match: /formula\s*1|f1\b|boisson nutritionnelle/i, emoji: "🥛" },
  { match: /melange.*proteine|formula\s*3|ppp\b|pdm/i, emoji: "💪" },
  { match: /formula\s*2|multivit/i, emoji: "💊" },
  { match: /aloe/i, emoji: "🌿" },
  { match: /\bthe\b|th[eé]\b|tea\b/i, emoji: "🍵" },
  { match: /hydrate/i, emoji: "💧" },
  { match: /calcium|xtra[-\s]?cal/i, emoji: "🦴" },
  { match: /collag/i, emoji: "✨" },
  { match: /liftoff/i, emoji: "⚡" },
  { match: /cr7|n-r-g|nrg/i, emoji: "🏆" },
  { match: /cell.*activ/i, emoji: "🧬" },
  { match: /niteworks|night|sommeil/i, emoji: "🌙" },
  { match: /omega|fish/i, emoji: "🐟" },
  { match: /iron|roseguard/i, emoji: "🛡️" },
  { match: /skin|beaut/i, emoji: "💎" },
  { match: /snack|barre|bar\b/i, emoji: "🍫" },
  { match: /soup|soupe/i, emoji: "🍲" },
  { match: /fibre|cell.*u.*loss|digest|transit/i, emoji: "🌾" },
  { match: /shaker|gourde/i, emoji: "🥤" },
  { match: /creatine/i, emoji: "💥" },
];
function getEmoji(name: string): string {
  for (const { match, emoji } of PRODUCT_EMOJI_MAP) if (match.test(name)) return emoji;
  return "💊";
}

// Couleur d'accent par catégorie (barre gauche + teinte avatar).
const BUCKET_COLOR: Record<string, string> = {
  Shakes: "var(--ls-teal)",
  Protéines: "var(--ls-purple)",
  Hydratation: "var(--ls-teal)",
  Boosters: "var(--ls-gold)",
  Gélules: "var(--ls-purple)",
  Digestion: "var(--ls-teal)",
  Sommeil: "var(--ls-purple)",
  Routine: "var(--ls-gold)",
  Autres: "var(--ls-text-muted)",
};
const bucketColor = (b: string) => BUCKET_COLOR[b] ?? "var(--ls-teal)";

// Emoji par catégorie (cohérent avec l'univers produits de l'app).
const CAT_EMOJI: Record<string, string> = {
  Tous: "🛍️",
  Shakes: "🥤",
  Protéines: "💪",
  Hydratation: "💧",
  Boosters: "⚡",
  Gélules: "💊",
  Digestion: "🌾",
  Sommeil: "🌙",
  Routine: "✨",
  Autres: "📦",
};
const catEmoji = (c: string) => CAT_EMOJI[c] ?? "🏷️";

interface CatProduct {
  id: string;
  name: string;
  bucket: string;
  price: number;
  pv: number;
}

export function PanierPage() {
  const { push } = useToast();
  const { currentUser, reloadClients } = useAppContext();
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState("");
  const [cat, setCat] = useState("Tous");
  const [cart, setCart] = useState<Record<string, number>>({});
  const [discount, setDiscount] = useState(0);
  const [customText, setCustomText] = useState("");
  const [clientName, setClientName] = useState("");

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
    setClientName("");
  };

  function copyRecap() {
    if (!hasItems) return;
    const body = lines.map((p) => `• ${p.name} × ${cart[p.id]} — ${euro(p.price * cart[p.id])}`).join("\n");
    const hello = clientName.trim() ? `Coucou ${clientName.trim()} 🌿` : "Coucou 🌿";
    let txt = `${hello} voici la sélection qu'on a préparée ensemble :\n\n${body}\n\nTotal : ${euro(totalPrice)}`;
    if (disc > 0) txt += `\nAvec ta remise de ${disc} % : ${euro(clientPrice)}\nTu économises ${euro(savings)} 🎉`;
    txt += `\n\nDis-moi si tu veux ajuster quelque chose, je suis là 💛`;
    void navigator.clipboard?.writeText(txt).then(() =>
      push({ tone: "success", title: "Récap copié", message: "Prêt à coller dans ta messagerie." }),
    );
  }

  // Valider la vente → crée un client léger (hors-app, non-VIP) + enregistre les
  // produits → remonte direct dans la Rentabilité (marge + nombre de clients).
  async function validateSale() {
    if (!hasItems || saving) return;
    if (!currentUser) {
      push({ tone: "error", title: "Connecte-toi", message: "Session expirée, reconnecte-toi." });
      return;
    }
    setSaving(true);
    try {
      await recordQuickSale({
        clientName,
        distributorId: currentUser.id,
        distributorName: currentUser.name,
        lines: lines.map((p) => ({ id: p.id, name: p.name, price: p.price, pv: p.pv, quantity: cart[p.id] })),
      });
      await reloadClients();
      push({
        tone: "success",
        title: "Vente enregistrée 🎉",
        message: clientName.trim()
          ? `${clientName.trim()} ajouté·e à ta rentabilité.`
          : "Ajoutée à ta rentabilité.",
      });
      reset();
      navigate("/rentabilite");
    } catch (e) {
      push({ tone: "error", title: "Erreur", message: e instanceof Error ? e.message : "Réessaie." });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="panier-root" style={{ maxWidth: 1180, margin: "0 auto", padding: "4px 4px 90px" }}>
      <style>{`
        .panier-title { font-size: clamp(28px, 5.5vw, 46px); }
        .panier-mobilebar { display: none; }
        @keyframes panier-pop {
          0% { opacity: 0; transform: translateY(6px) scale(0.98); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
        .panier-line-anim { animation: panier-pop 0.28s cubic-bezier(0.22,1,0.36,1); }
        @media (prefers-reduced-motion: reduce) { .panier-line-anim { animation: none; } }
        @media (max-width: 760px) {
          .panier-title { font-size: 26px; }
          .panier-lead { display: none; }
          .panier-aside { position: static !important; flex: 1 1 100% !important; }
          .panier-root { padding-bottom: 150px !important; }
          .panier-mobilebar { display: flex !important; }
        }
      `}</style>
      {/* Hero */}
      <div style={{ fontFamily: "Syne, sans-serif", fontSize: 11, fontWeight: 700, letterSpacing: 2.4, textTransform: "uppercase", color: "var(--ls-text-muted)" }}>
        La Base 360 · Calculateur
      </div>
      <h1 className="panier-title" style={{ fontFamily: "Syne, sans-serif", fontWeight: 800, lineHeight: 1.02, letterSpacing: "-1.5px", margin: "6px 0 0", color: "var(--ls-text)" }}>
        <span style={{ background: "linear-gradient(100deg,var(--ls-teal),var(--ls-purple))", WebkitBackgroundClip: "text", backgroundClip: "text", WebkitTextFillColor: "transparent" }}>
          Panier
        </span>
      </h1>
      <p className="panier-lead" style={{ margin: "8px 0 26px", color: "var(--ls-text-muted)", fontSize: 15, maxWidth: 440, fontFamily: "DM Sans, sans-serif" }}>
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

          {/* Catégorie en menu déroulant (gain de place mobile vs chips) */}
          <div style={{ position: "relative", marginBottom: 18 }}>
            <select
              value={cat}
              onChange={(e) => setCat(e.target.value)}
              aria-label="Filtrer par catégorie"
              style={{
                width: "100%",
                boxSizing: "border-box",
                appearance: "none",
                WebkitAppearance: "none",
                MozAppearance: "none",
                padding: "12px 40px 12px 16px",
                borderRadius: 14,
                border: "1px solid var(--ls-border)",
                background: "var(--ls-input-bg)",
                color: "var(--ls-text)",
                fontSize: 14,
                fontWeight: 600,
                fontFamily: "DM Sans, sans-serif",
                outline: "none",
                cursor: "pointer",
              }}
            >
              {cats.map((c) => (
                <option key={c} value={c}>
                  {catEmoji(c)}  {c === "Tous" ? "Toutes les catégories" : c}
                </option>
              ))}
            </select>
            <span
              aria-hidden="true"
              style={{ position: "absolute", right: 16, top: "50%", transform: "translateY(-50%)", color: "var(--ls-text-muted)", fontSize: 12, pointerEvents: "none" }}
            >
              ▾
            </span>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(300px,1fr))", gap: 9 }}>
            {filtered.map((p) => {
              const qty = cart[p.id] ?? 0;
              const active = qty > 0;
              const accent = bucketColor(p.bucket);
              return (
                <div
                  key={p.id}
                  style={{
                    position: "relative",
                    overflow: "hidden",
                    display: "flex",
                    alignItems: "center",
                    gap: 11,
                    background: active ? `color-mix(in srgb, ${accent} 8%, var(--ls-surface))` : "var(--ls-surface)",
                    border: active ? `1px solid color-mix(in srgb, ${accent} 42%, var(--ls-border))` : "1px solid var(--ls-border)",
                    borderRadius: 14,
                    padding: "10px 12px 10px 16px",
                    transition: "background .15s ease, border-color .15s ease",
                  }}
                >
                  {/* Barre d'accent catégorie */}
                  <span aria-hidden="true" style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 4, background: accent, opacity: active ? 1 : 0.65 }} />
                  {/* Avatar emoji produit */}
                  <div
                    aria-hidden="true"
                    style={{
                      flex: "0 0 auto",
                      width: 38,
                      height: 38,
                      borderRadius: 11,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 19,
                      background: `color-mix(in srgb, ${accent} 14%, var(--ls-surface2))`,
                      border: `0.5px solid color-mix(in srgb, ${accent} 28%, transparent)`,
                    }}
                  >
                    {getEmoji(p.name)}
                  </div>
                  {/* Gauche : nom + PV dessous */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontFamily: "Syne, sans-serif",
                        fontWeight: 600,
                        fontSize: 14,
                        lineHeight: 1.25,
                        color: "var(--ls-text)",
                        display: "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical",
                        overflow: "hidden",
                      }}
                    >
                      {p.name}
                    </div>
                    <span style={{ ...pvBadge, marginTop: 5, fontSize: 10.5, padding: "2px 8px" }}>
                      {pvf(p.pv)}
                      <span style={{ fontSize: 8.5, letterSpacing: 0.4, opacity: 0.85 }}>PV</span>
                    </span>
                  </div>

                  {/* Droite : prix + stepper / ajouter */}
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 7, flex: "none" }}>
                    <span style={{ fontFamily: "Syne, sans-serif", fontWeight: 700, fontSize: 16, color: "var(--ls-gold)" }}>{euro(p.price)}</span>
                    {!active ? (
                      <button
                        type="button"
                        onClick={() => add(p.id)}
                        aria-label={`Ajouter ${p.name}`}
                        style={{
                          width: 34,
                          height: 30,
                          borderRadius: 9,
                          border: "none",
                          cursor: "pointer",
                          fontSize: 18,
                          lineHeight: 1,
                          background: "var(--ls-teal)",
                          color: "#fff",
                          fontWeight: 700,
                        }}
                      >
                        ＋
                      </button>
                    ) : (
                      <div style={{ display: "flex", alignItems: "center", gap: 6, background: "var(--ls-surface)", border: "1px solid var(--ls-border)", borderRadius: 10, padding: 3 }}>
                        <button type="button" onClick={() => dec(p.id)} aria-label="Retirer un" style={stepBtn(false)}>−</button>
                        <span style={{ fontFamily: "Syne, sans-serif", fontWeight: 700, fontSize: 15, color: "var(--ls-text)", minWidth: 18, textAlign: "center" }}>{qty}</span>
                        <button type="button" onClick={() => add(p.id)} aria-label="Ajouter un" style={stepBtn(true)}>＋</button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Panier */}
        <aside id="panier-recap" style={{ flex: "0 0 372px", maxWidth: "100%", position: "sticky", top: 16, alignSelf: "flex-start" }} className="panier-aside">
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
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: 10, padding: "18px 6px 8px" }}>
                <div style={{ width: 56, height: 56, borderRadius: 999, background: "var(--ls-surface2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26 }}>🛒</div>
                <div style={{ fontFamily: "Syne, sans-serif", fontWeight: 700, fontSize: 15, color: "var(--ls-text)" }}>Ton panier est vide</div>
                <div style={{ color: "var(--ls-text-muted)", fontSize: 13.5, lineHeight: 1.5, maxWidth: 220 }}>Ajoute des produits pour calculer le prix client.</div>
              </div>
            ) : (
              <>
                {/* Nom du client (ventes hors-app) */}
                <label style={{ display: "block", marginBottom: 14 }}>
                  <span style={{ display: "block", fontSize: 11.5, fontWeight: 600, color: "var(--ls-text-muted)", marginBottom: 5 }}>
                    Nom du client <span style={{ color: "var(--ls-text-hint)", fontWeight: 400 }}>(optionnel)</span>
                  </span>
                  <input
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    placeholder="Ex : Marie D."
                    style={{ width: "100%", boxSizing: "border-box", padding: "10px 12px", borderRadius: 12, border: "1px solid var(--ls-border)", background: "var(--ls-input-bg)", color: "var(--ls-text)", fontSize: 14, fontFamily: "DM Sans, sans-serif", outline: "none" }}
                  />
                </label>

                <div style={{ maxHeight: 300, overflow: "auto", margin: "0 -4px", padding: "0 4px" }}>
                  {lines.map((p) => (
                    <div key={p.id} className="panier-line-anim" style={{ display: "flex", alignItems: "center", gap: 11, padding: "12px 0", borderBottom: "1px solid var(--ls-border)" }}>
                      <div
                        aria-hidden="true"
                        style={{
                          flex: "0 0 auto",
                          width: 32,
                          height: 32,
                          borderRadius: 9,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 16,
                          background: `color-mix(in srgb, ${bucketColor(p.bucket)} 14%, var(--ls-surface2))`,
                          border: `0.5px solid color-mix(in srgb, ${bucketColor(p.bucket)} 28%, transparent)`,
                        }}
                      >
                        {getEmoji(p.name)}
                      </div>
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
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                    <span style={{ color: "var(--ls-text-muted)", fontSize: 13.5, fontWeight: 600 }}>Remise client</span>
                    {disc > 0 ? (
                      <button
                        type="button"
                        onClick={() => {
                          setDiscount(0);
                          setCustomText("");
                        }}
                        style={{ background: "none", border: "none", color: "var(--ls-teal)", fontSize: 12.5, fontWeight: 600, cursor: "pointer", padding: 0 }}
                      >
                        ✕ Enlever
                      </button>
                    ) : null}
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 7, alignItems: "center" }}>
                    {[5, 10, 15, 25, 35].map((v) => {
                      const on = discount === v && customText === "";
                      return (
                        <button
                          key={v}
                          type="button"
                          onClick={() => {
                            if (on) {
                              setDiscount(0); // re-clic = on retire la remise
                            } else {
                              setDiscount(v);
                              setCustomText("");
                            }
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
                  </div>
                  {/* Saisie libre : n'importe quel % (8, 12, 18…) */}
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 11 }}>
                    <span style={{ fontSize: 12.5, color: "var(--ls-text-muted)" }}>ou saisis&nbsp;:</span>
                    <div style={{ position: "relative" }}>
                      <input
                        value={customText}
                        onChange={(e) => {
                          const v = e.target.value;
                          setCustomText(v);
                          setDiscount(clamp(parseFloat(v.replace(",", ".")) || 0, 0, 100));
                        }}
                        placeholder="ex : 8"
                        inputMode="decimal"
                        aria-label="Remise personnalisée en pourcentage"
                        style={{
                          width: 104,
                          boxSizing: "border-box",
                          padding: "9px 28px 9px 12px",
                          borderRadius: 12,
                          border: customText ? "1px solid var(--ls-teal)" : "1px solid var(--ls-border)",
                          background: "var(--ls-input-bg)",
                          color: "var(--ls-text)",
                          fontSize: 14,
                          fontWeight: 600,
                          outline: "none",
                        }}
                      />
                      <span style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", color: "var(--ls-text-muted)", fontSize: 14, fontWeight: 600, pointerEvents: "none" }}>%</span>
                    </div>
                  </div>
                </div>

                {/* Prix client */}
                <div style={{
                  position: "relative",
                  overflow: "hidden",
                  marginTop: 18,
                  background: "radial-gradient(120% 140% at 100% 0%, color-mix(in srgb, var(--ls-purple) 12%, transparent), transparent 55%), radial-gradient(120% 140% at 0% 100%, color-mix(in srgb, var(--ls-teal) 12%, transparent), transparent 55%), color-mix(in srgb, var(--ls-gold) 10%, transparent)",
                  border: "1px solid color-mix(in srgb, var(--ls-gold) 28%, transparent)",
                  borderRadius: 18,
                  padding: "16px 18px",
                }}>
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

                {/* Action principale : enregistrer la vente → rentabilité */}
                <button
                  type="button"
                  onClick={() => void validateSale()}
                  disabled={saving}
                  style={{
                    width: "100%",
                    marginTop: 16,
                    padding: 14,
                    borderRadius: 14,
                    border: "none",
                    background: "var(--ls-gold)",
                    color: "#1a1407",
                    fontFamily: "Syne, sans-serif",
                    fontWeight: 800,
                    fontSize: 14.5,
                    cursor: saving ? "wait" : "pointer",
                    opacity: saving ? 0.65 : 1,
                  }}
                >
                  {saving ? "Enregistrement…" : "✅ Valider la vente → Rentabilité"}
                </button>
                <div style={{ fontSize: 11.5, color: "var(--ls-text-hint)", textAlign: "center", marginTop: 7, lineHeight: 1.45 }}>
                  Crée le client (hors-app) et ajoute la vente à ta rentabilité.
                </div>

                {/* Actions secondaires */}
                <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
                  <button type="button" onClick={copyRecap} style={{ flex: 1, padding: 12, borderRadius: 14, border: "none", background: "linear-gradient(100deg,var(--ls-teal),var(--ls-purple))", color: "#fff", fontFamily: "Syne, sans-serif", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
                    📋 Copier le récap
                  </button>
                  <button type="button" onClick={reset} style={{ padding: "12px 16px", borderRadius: 14, border: "1px solid var(--ls-border)", background: "transparent", color: "var(--ls-text-muted)", fontWeight: 600, fontSize: 13, cursor: "pointer", fontFamily: "DM Sans, sans-serif" }}>
                    Réinitialiser
                  </button>
                </div>
              </>
            )}
          </div>
        </aside>
      </div>

      {/* Barre total flottante (mobile) — toujours visible pendant qu'on ajoute */}
      {hasItems ? (
        <button
          type="button"
          className="panier-mobilebar"
          onClick={() =>
            document.getElementById("panier-recap")?.scrollIntoView({ behavior: "smooth", block: "start" })
          }
          style={{
            position: "fixed",
            left: 10,
            right: 10,
            bottom: "calc(64px + env(safe-area-inset-bottom, 0px))",
            zIndex: 49,
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            padding: "12px 16px",
            borderRadius: 16,
            border: "1px solid var(--ls-border)",
            background: "color-mix(in srgb, var(--ls-surface) 88%, transparent)",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
            boxShadow: "0 10px 28px -10px rgba(0,0,0,0.45)",
            cursor: "pointer",
          }}
        >
          <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 18 }}>🛒</span>
            <span style={{ fontWeight: 700, fontSize: 13, color: "var(--ls-text)", fontFamily: "DM Sans, sans-serif" }}>
              {itemCount} article{itemCount > 1 ? "s" : ""}
            </span>
          </span>
          <span style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
            {disc > 0 ? (
              <span style={{ fontSize: 12, color: "var(--ls-text-hint)", textDecoration: "line-through" }}>{euro(totalPrice)}</span>
            ) : null}
            <span style={{ fontFamily: "Syne, sans-serif", fontWeight: 800, fontSize: 18, color: "var(--ls-gold)" }}>{euro(clientPrice)}</span>
            <span aria-hidden="true" style={{ fontSize: 15, color: "var(--ls-teal)" }}>↓</span>
          </span>
        </button>
      ) : null}
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
