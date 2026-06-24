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
import { pvProductCatalog, buildPvTrackingRecords } from "../data/pvCatalog";
import { useToast } from "../context/ToastContext";
import { useAppContext } from "../context/AppContext";
import { recordQuickSale } from "../services/supabaseService";
import type { Client } from "../types/domain";
import type { PvClientTransaction } from "../types/pv";

const euro = (n: number) =>
  n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";
const pvf = (n: number) => n.toLocaleString("fr-FR", { maximumFractionDigits: 2 });
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

/** Regroupe les catégories texte-libre du catalogue en buckets lisibles. */
function bucket(cat: string): string {
  const c = (cat ?? "").toLowerCase();
  // Soins & Sport en tête : ces familles contiennent parfois des mots
  // génériques (« sport / hydratation », « soin / corps ») qui seraient sinon
  // happés par Hydratation/Routine. On les attrape d'abord.
  if (/soin|skin|visage|peau|corps|cheveux|collag|beaut/.test(c)) return "Soins";
  if (/sport|muscle|creatine|cr7|rebuild|achieve|prolong|h24/.test(c)) return "Sport";
  if (/shake|repas|formula 1/.test(c)) return "Shakes";
  if (/prot/.test(c)) return "Protéines";
  if (/hydrat|th[eé]|aloe/.test(c)) return "Hydratation";
  if (/g[eé]lul/.test(c)) return "Gélules";
  if (/energie|énergie|liftoff|workout|booster/.test(c)) return "Boosters";
  if (/fibre|digest|transit|microbiotic/.test(c)) return "Digestion";
  if (/sommeil|night/.test(c)) return "Sommeil";
  if (/encas|en-cas|chips|snack|barre/.test(c)) return "Snacks";
  if (/complement|vitamine|omega|mineral|immun|vascul|gummies|enfant|concentration/.test(c)) return "Compléments";
  if (/calcium|visceral|routine|cal/.test(c)) return "Routine";
  return "Autres";
}

const CAT_ORDER = ["Shakes", "Protéines", "Hydratation", "Sport", "Boosters", "Gélules", "Digestion", "Snacks", "Sommeil", "Compléments", "Routine", "Soins", "Autres"];

// Emoji par produit (même logique que le ticket du bilan) → identité visuelle.
const PRODUCT_EMOJI_MAP: Array<{ match: RegExp; emoji: string }> = [
  { match: /formula\s*1|f1\b|boisson nutritionnelle/i, emoji: "🥛" },
  { match: /melange.*proteine|formula\s*3|ppp\b|pdm/i, emoji: "💪" },
  { match: /formula\s*2|multivit/i, emoji: "💊" },
  { match: /hl\s*\/?\s*skin/i, emoji: "💎" },
  { match: /serum|sérum|cr[èe]me|hydratant|masque|gommage|exfoliant|lotion|nettoyant|contour|tension|niacinamide|fps|tonique/i, emoji: "🧴" },
  { match: /savon|shampoing|shampooing|apr[èe]s-shampoing|gel apaisant/i, emoji: "🧴" },
  { match: /aloe/i, emoji: "🌿" },
  { match: /\bthe\b|th[eé]|tea\b/i, emoji: "🍵" },
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
  Sport: "var(--ls-teal)",
  Boosters: "var(--ls-gold)",
  Gélules: "var(--ls-purple)",
  Digestion: "var(--ls-teal)",
  Snacks: "var(--ls-coral)",
  Sommeil: "var(--ls-purple)",
  Compléments: "var(--ls-gold)",
  Routine: "var(--ls-gold)",
  Soins: "var(--ls-coral)",
  Autres: "var(--ls-text-muted)",
};
const bucketColor = (b: string) => BUCKET_COLOR[b] ?? "var(--ls-teal)";

// Emoji par catégorie (cohérent avec l'univers produits de l'app).
const CAT_EMOJI: Record<string, string> = {
  Tous: "🛍️",
  Shakes: "🥤",
  Protéines: "💪",
  Hydratation: "💧",
  Sport: "💪",
  Boosters: "⚡",
  Gélules: "💊",
  Digestion: "🌾",
  Snacks: "🍫",
  Sommeil: "🌙",
  Compléments: "🛡️",
  Routine: "✨",
  Soins: "💎",
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
  const { currentUser, reloadClients, clients, addPvTransaction, pvTransactions, pvClientProducts } = useAppContext();
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState("");
  const [cat, setCat] = useState("Tous");
  const [cart, setCart] = useState<Record<string, number>>({});
  const [discount, setDiscount] = useState(0);
  const [customText, setCustomText] = useState("");
  const [clientName, setClientName] = useState("");
  // Attribution de la vente (2026-06-24) : client existant (→ atterrit sur sa
  // fiche + son app + rentabilité, même chemin que le réassort) OU client direct
  // (vente rapide hors-app). Règle : pas de validation sans attribution.
  const [attribMode, setAttribMode] = useState<"existing" | "direct">("existing");
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [saleType, setSaleType] = useState<"commande" | "reprise-sur-place">("commande");
  const [delayDays, setDelayDays] = useState(0);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerQuery, setPickerQuery] = useState("");
  const [onlyMine, setOnlyMine] = useState(true);
  // Accordéons : une fois l'attribution / la remise choisie, on replie en
  // résumé compact pour que le bas du panier (prix + valider) reste visible.
  const [attribOpen, setAttribOpen] = useState(true);
  const [remiseOpen, setRemiseOpen] = useState(false);

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

  // PV cumulé par client (pour l'afficher sous le nom dans le sélecteur).
  // Même source que la rentabilité / fiche PV → chiffre cohérent partout.
  const pvByClient = useMemo(() => {
    const m = new Map<string, number>();
    try {
      for (const r of buildPvTrackingRecords(clients, pvTransactions, pvClientProducts)) {
        m.set(r.clientId, r.pvCumulative);
      }
    } catch {
      /* tracking indisponible → on n'affiche juste pas le PV */
    }
    return m;
  }, [clients, pvTransactions, pvClientProducts]);

  const isVipClient = (c: Client) =>
    Boolean(c.vipStartedAt) || (c.vipStatus != null && c.vipStatus !== "none");

  // Attribution prête = client existant choisi OU nom direct saisi.
  const attribReady = attribMode === "existing" ? !!selectedClient : !!clientName.trim();

  // Liste du sélecteur de client : par défaut les clients du distri connecté
  // (Mélanie voit les siens), l'admin peut basculer « Tous ». Mes clients d'abord.
  const myId = currentUser?.id;
  const pickerClients = useMemo(() => {
    const q = pickerQuery.trim().toLowerCase();
    const base = clients.filter((c) => (onlyMine ? c.distributorId === myId : true));
    const matched = q
      ? base.filter((c) => `${c.firstName} ${c.lastName}`.toLowerCase().includes(q))
      : base;
    return [...matched].sort((a, b) => {
      const ao = a.distributorId === myId ? 0 : 1;
      const bo = b.distributorId === myId ? 0 : 1;
      if (ao !== bo) return ao - bo;
      return `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`);
    });
  }, [clients, onlyMine, pickerQuery, myId]);

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
    setAttribMode("existing");
    setSelectedClient(null);
    setSaleType("commande");
    setDelayDays(0);
    setPickerQuery("");
    setAttribOpen(true);
    setRemiseOpen(false);
  };

  const attribName =
    attribMode === "existing" && selectedClient
      ? selectedClient.firstName
      : clientName.trim();

  function copyRecap() {
    if (!hasItems) return;
    const body = lines.map((p) => `• ${p.name} × ${cart[p.id]} — ${euro(p.price * cart[p.id])}`).join("\n");
    const hello = attribName ? `Coucou ${attribName} 🌿` : "Coucou 🌿";
    let txt = `${hello} voici la sélection qu'on a préparée ensemble :\n\n${body}\n\nTotal : ${euro(totalPrice)}`;
    if (disc > 0) txt += `\nAvec ta remise de ${disc} % : ${euro(clientPrice)}\nTu économises ${euro(savings)} 🎉`;
    txt += `\n\nDis-moi si tu veux ajuster quelque chose, je suis là 💛`;
    void navigator.clipboard?.writeText(txt).then(() =>
      push({ tone: "success", title: "Récap copié", message: "Prêt à coller dans ta messagerie." }),
    );
  }

  // Valider la vente. Deux chemins selon l'attribution :
  //  • Client existant → addPvTransaction par ligne (MÊME chemin que le réassort) :
  //    atterrit sur sa fiche + son app + rentabilité, incrémenté à l'identique.
  //    « Sur son compte » = commande (PV au client) ; « Sur place » = 0 PV pour
  //    le client mais le € remonte quand même dans la rentabilité du distri.
  //  • Client direct → recordQuickSale (vente rapide hors-app).
  // Règle ferme : pas de validation sans attribution (client existant OU nom).
  async function validateSale() {
    if (!hasItems || saving) return;
    if (!currentUser) {
      push({ tone: "error", title: "Connecte-toi", message: "Session expirée, reconnecte-toi." });
      return;
    }
    if (attribMode === "existing" && !selectedClient) {
      push({ tone: "error", title: "Choisis un client", message: "Sélectionne un client existant (ou passe en « Client direct »)." });
      return;
    }
    if (attribMode === "direct" && !clientName.trim()) {
      push({ tone: "error", title: "Nom requis", message: "Ajoute le nom du client (ou choisis un client existant)." });
      return;
    }
    setSaving(true);
    try {
      if (attribMode === "existing" && selectedClient) {
        const now = new Date().toISOString();
        const startOverride =
          saleType === "commande" && delayDays > 0
            ? new Date(Date.now() + delayDays * 24 * 3600 * 1000).toISOString()
            : undefined;
        const respId = selectedClient.distributorId || currentUser.id;
        const respName = selectedClient.distributorName || currentUser.name;
        const isPlace = saleType === "reprise-sur-place";
        const fullName = `${selectedClient.firstName} ${selectedClient.lastName}`.trim();
        for (let i = 0; i < lines.length; i += 1) {
          const p = lines[i];
          const qty = cart[p.id];
          const tx: PvClientTransaction = {
            id: `local-${Date.now()}-${i}`,
            date: now,
            clientId: selectedClient.id,
            clientName: fullName,
            responsibleId: respId,
            responsibleName: respName,
            productId: p.id,
            productName: p.name,
            quantity: qty,
            // Sur place = 0 PV pour le client (déjà compté au comptoir) ; le prix
            // reste enregistré → rentabilité € inchangée.
            pv: isPlace ? 0 : Number((p.pv * qty).toFixed(2)),
            price: Number((p.price * qty).toFixed(2)),
            type: saleType,
            note: isPlace
              ? `Vente sur place (panier) — ${lines.length} ligne${lines.length > 1 ? "s" : ""}`
              : `Commande (panier) — ${lines.length} ligne${lines.length > 1 ? "s" : ""}${startOverride ? ` · cure démarre J+${delayDays}` : ""}`,
            ...(startOverride ? { startDateOverride: startOverride } : {}),
          };
          await addPvTransaction(tx);
        }
        push({
          tone: "success",
          title: isPlace ? "Vente sur place enregistrée 🏪" : `+${totalPV.toFixed(1)} PV pour ${selectedClient.firstName} 🎉`,
          message: `${lines.length} produit${lines.length > 1 ? "s" : ""} sur la fiche de ${selectedClient.firstName}.`,
        });
        reset();
        navigate(`/clients/${selectedClient.id}`);
      } else {
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
          message: `${clientName.trim()} ajouté·e à ta rentabilité.`,
        });
        reset();
        navigate("/rentabilite");
      }
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
        /* Scrollbar fine premium sur le récap */
        .panier-aside { scrollbar-width: thin; scrollbar-color: color-mix(in srgb, var(--ls-text-hint) 32%, transparent) transparent; }
        .panier-aside::-webkit-scrollbar { width: 8px; }
        .panier-aside::-webkit-scrollbar-thumb { background: color-mix(in srgb, var(--ls-text-hint) 30%, transparent); border-radius: 999px; }
        .panier-aside::-webkit-scrollbar-track { background: transparent; }
        /* CTA premium */
        .panier-cta { transition: transform .15s ease, filter .15s ease, box-shadow .15s ease; }
        .panier-cta:not(:disabled):hover { transform: translateY(-1px); filter: brightness(1.05); }
        .panier-cta:not(:disabled):active { transform: translateY(0); }
        @media (max-width: 760px) {
          .panier-title { font-size: 26px; }
          .panier-lead { display: none; }
          .panier-aside { position: static !important; flex: 1 1 100% !important; max-height: none !important; overflow: visible !important; }
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
        <aside id="panier-recap" style={{ flex: "0 0 372px", maxWidth: "100%", position: "sticky", top: 16, alignSelf: "flex-start", maxHeight: "calc(100dvh - 112px)", overflowY: "auto", paddingBottom: 14 }} className="panier-aside">
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
                {/* Attribution de la vente — accordéon (replié une fois choisi) */}
                <div style={{ marginBottom: 14, borderRadius: 16, background: "var(--ls-surface2)", border: "1px solid var(--ls-border)", overflow: "hidden" }}>
                  {/* En-tête cliquable = résumé + chevron */}
                  <button
                    type="button"
                    onClick={() => setAttribOpen((o) => !o)}
                    style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "11px 12px", background: "transparent", border: "none", cursor: "pointer", textAlign: "left" }}
                  >
                    {attribReady ? (
                      <>
                        <div style={{ width: 32, height: 32, flex: "0 0 auto", borderRadius: 999, background: attribMode === "existing" ? "var(--ls-teal)" : "var(--ls-purple)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontFamily: "Syne, sans-serif", fontSize: 12 }}>
                          {attribMode === "existing" && selectedClient ? `${selectedClient.firstName.charAt(0)}${selectedClient.lastName.charAt(0)}` : "✍️"}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 700, fontSize: 13.5, color: "var(--ls-text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                            {attribMode === "existing" && selectedClient ? (
                              <>{isVipClient(selectedClient) ? <span style={{ color: "var(--ls-gold)" }}>⭐ </span> : null}{selectedClient.firstName} {selectedClient.lastName}</>
                            ) : clientName.trim()}
                          </div>
                          <div style={{ fontSize: 11, color: "var(--ls-text-hint)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                            {attribMode === "existing"
                              ? `${saleType === "commande" ? "💳 Sur son compte" : "🏪 Sur place"}${saleType === "commande" ? ` · ${delayDays === 0 ? "Aujourd'hui" : `+${delayDays} j`}` : ""}`
                              : "Vente rapide hors-app"}
                          </div>
                        </div>
                      </>
                    ) : (
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: 13.5, color: "var(--ls-text)" }}>👤 À qui est cette vente ?</div>
                        <div style={{ fontSize: 11, color: "var(--ls-text-hint)" }}>Obligatoire pour valider</div>
                      </div>
                    )}
                    <span aria-hidden="true" style={{ flex: "0 0 auto", color: "var(--ls-text-hint)", fontSize: 11, transform: attribOpen ? "rotate(180deg)" : "none", transition: "transform .2s ease" }}>▼</span>
                  </button>

                  {/* Corps déroulable */}
                  {attribOpen ? (
                    <div style={{ padding: "2px 12px 12px" }}>
                      <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
                        {([["existing", "👤 Client existant"], ["direct", "✍️ Client direct"]] as Array<["existing" | "direct", string]>).map(([m, l]) => {
                          const on = attribMode === m;
                          return (
                            <button key={m} type="button" onClick={() => setAttribMode(m)} style={{ flex: 1, padding: "8px 10px", borderRadius: 10, fontSize: 12.5, fontWeight: 700, cursor: "pointer", fontFamily: "DM Sans, sans-serif", border: on ? "1px solid transparent" : "1px solid var(--ls-border)", background: on ? "var(--ls-teal)" : "var(--ls-surface)", color: on ? "#fff" : "var(--ls-text-muted)" }}>{l}</button>
                          );
                        })}
                      </div>

                      {attribMode === "existing" ? (
                        selectedClient ? (
                          <>
                            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                              <div style={{ width: 34, height: 34, borderRadius: 999, background: "var(--ls-teal)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontFamily: "Syne, sans-serif", fontSize: 13 }}>
                                {selectedClient.firstName.charAt(0)}{selectedClient.lastName.charAt(0)}
                              </div>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontWeight: 700, fontSize: 14, color: "var(--ls-text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                  {isVipClient(selectedClient) ? <span title="Client VIP" style={{ color: "var(--ls-gold)" }}>⭐ </span> : null}{selectedClient.firstName} {selectedClient.lastName}
                                </div>
                                <div style={{ fontSize: 11.5, color: "var(--ls-text-hint)" }}>
                                  {(() => {
                                    const pv = pvByClient.get(selectedClient.id);
                                    const pvTxt = pv && pv > 0 ? `${Math.round(pv)} PV` : "";
                                    return [pvTxt, selectedClient.distributorName || ""].filter(Boolean).join(" · ") || "—";
                                  })()}
                                </div>
                              </div>
                              <button type="button" onClick={() => { setSelectedClient(null); setPickerOpen(true); }} style={{ background: "none", border: "none", color: "var(--ls-teal)", fontSize: 12.5, fontWeight: 600, cursor: "pointer" }}>Changer</button>
                            </div>

                            <div style={{ display: "flex", gap: 6, marginBottom: saleType === "commande" ? 12 : 0 }}>
                              {([["commande", "💳 Sur son compte"], ["reprise-sur-place", "🏪 Sur place"]] as Array<["commande" | "reprise-sur-place", string]>).map(([v, l]) => {
                                const on = saleType === v;
                                return (
                                  <button key={v} type="button" onClick={() => setSaleType(v)} style={{ flex: 1, padding: "7px 8px", borderRadius: 10, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "DM Sans, sans-serif", border: on ? "1px solid transparent" : "1px solid var(--ls-border)", background: on ? "var(--ls-gold)" : "var(--ls-surface)", color: on ? "#1a1407" : "var(--ls-text-muted)" }}>{l}</button>
                                );
                              })}
                            </div>

                            {saleType === "commande" ? (
                              <div>
                                <div style={{ fontSize: 11, color: "var(--ls-text-hint)", marginBottom: 6 }}>Démarrage de la cure</div>
                                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                                  {([[0, "Aujourd'hui"], [3, "+3 j"], [5, "+5 j"], [7, "+7 j"]] as Array<[number, string]>).map(([d, l]) => {
                                    const on = delayDays === d;
                                    return (
                                      <button key={d} type="button" onClick={() => setDelayDays(d)} style={{ padding: "6px 10px", borderRadius: 999, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "DM Sans, sans-serif", border: on ? "1px solid var(--ls-teal)" : "1px solid var(--ls-border)", background: on ? "color-mix(in srgb, var(--ls-teal) 14%, transparent)" : "var(--ls-surface)", color: on ? "var(--ls-teal)" : "var(--ls-text-muted)" }}>{l}</button>
                                    );
                                  })}
                                </div>
                              </div>
                            ) : null}

                            <button type="button" onClick={() => setAttribOpen(false)} style={{ width: "100%", marginTop: 12, padding: "8px", borderRadius: 10, border: "none", background: "var(--ls-surface)", color: "var(--ls-teal)", fontSize: 12.5, fontWeight: 700, cursor: "pointer", fontFamily: "DM Sans, sans-serif" }}>✓ OK, replier</button>
                          </>
                        ) : (
                          <button type="button" onClick={() => setPickerOpen(true)} style={{ width: "100%", padding: "11px 12px", borderRadius: 12, border: "1px dashed var(--ls-border)", background: "var(--ls-surface)", color: "var(--ls-text)", fontSize: 13.5, fontWeight: 600, cursor: "pointer", fontFamily: "DM Sans, sans-serif" }}>
                            👤 Choisir un client…
                          </button>
                        )
                      ) : (
                        <input
                          value={clientName}
                          onChange={(e) => setClientName(e.target.value)}
                          onBlur={() => { if (clientName.trim()) setAttribOpen(false); }}
                          placeholder="Nom du client (ex : Marie D.)"
                          style={{ width: "100%", boxSizing: "border-box", padding: "10px 12px", borderRadius: 12, border: "1px solid var(--ls-border)", background: "var(--ls-input-bg)", color: "var(--ls-text)", fontSize: 14, fontFamily: "DM Sans, sans-serif", outline: "none" }}
                        />
                      )}
                    </div>
                  ) : null}
                </div>

                <div style={{ margin: "0 -4px", padding: "0 4px" }}>
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

                {/* Remise — accordéon (repliée par défaut, optionnelle) */}
                <div style={{ marginTop: 16, borderRadius: 16, background: "var(--ls-surface2)", border: "1px solid var(--ls-border)", overflow: "hidden" }}>
                  <button type="button" onClick={() => setRemiseOpen((o) => !o)} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, padding: "11px 12px", background: "transparent", border: "none", cursor: "pointer" }}>
                    <span style={{ color: "var(--ls-text-muted)", fontSize: 13, fontWeight: 600 }}>Remise client</span>
                    <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: disc > 0 ? "var(--ls-gold)" : "var(--ls-text-hint)" }}>{disc > 0 ? `−${disc} %` : "Aucune"}</span>
                      <span aria-hidden="true" style={{ color: "var(--ls-text-hint)", fontSize: 11, transform: remiseOpen ? "rotate(180deg)" : "none", transition: "transform .2s ease" }}>▼</span>
                    </span>
                  </button>
                  {remiseOpen ? (
                    <div style={{ padding: "2px 12px 12px" }}>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 7, alignItems: "center" }}>
                        {[5, 10, 15, 25, 35].map((v) => {
                          const on = discount === v && customText === "";
                          return (
                            <button
                              key={v}
                              type="button"
                              onClick={() => { if (on) { setDiscount(0); } else { setDiscount(v); setCustomText(""); } }}
                              style={{ padding: "7px 13px", borderRadius: 999, fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "Syne, sans-serif", border: on ? "1px solid transparent" : "1px solid var(--ls-border)", background: on ? "var(--ls-text)" : "var(--ls-surface)", color: on ? "var(--ls-bg)" : "var(--ls-text-muted)" }}
                            >
                              {v} %
                            </button>
                          );
                        })}
                        {disc > 0 ? (
                          <button type="button" onClick={() => { setDiscount(0); setCustomText(""); }} style={{ background: "none", border: "none", color: "var(--ls-teal)", fontSize: 12.5, fontWeight: 600, cursor: "pointer", padding: "0 4px" }}>✕ Enlever</button>
                        ) : null}
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 11 }}>
                        <span style={{ fontSize: 12.5, color: "var(--ls-text-muted)" }}>ou saisis&nbsp;:</span>
                        <div style={{ position: "relative" }}>
                          <input
                            value={customText}
                            onChange={(e) => { const v = e.target.value; setCustomText(v); setDiscount(clamp(parseFloat(v.replace(",", ".")) || 0, 0, 100)); }}
                            placeholder="ex : 8"
                            inputMode="decimal"
                            aria-label="Remise personnalisée en pourcentage"
                            style={{ width: 104, boxSizing: "border-box", padding: "9px 28px 9px 12px", borderRadius: 12, border: customText ? "1px solid var(--ls-teal)" : "1px solid var(--ls-border)", background: "var(--ls-input-bg)", color: "var(--ls-text)", fontSize: 14, fontWeight: 600, outline: "none" }}
                          />
                          <span style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", color: "var(--ls-text-muted)", fontSize: 14, fontWeight: 600, pointerEvents: "none" }}>%</span>
                        </div>
                      </div>
                    </div>
                  ) : null}
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

                {/* Action principale : enregistrer la vente */}
                {(() => {
                  const blocked = saving || !attribReady;
                  return (
                    <>
                      <button
                        type="button"
                        className="panier-cta"
                        onClick={() => void validateSale()}
                        disabled={blocked}
                        style={{
                          width: "100%",
                          marginTop: 16,
                          padding: 15,
                          borderRadius: 14,
                          border: "none",
                          background: blocked
                            ? "var(--ls-surface2)"
                            : "linear-gradient(135deg, #EFB23C 0%, #C98A1E 100%)",
                          color: blocked ? "var(--ls-text-hint)" : "#1a1407",
                          fontFamily: "Syne, sans-serif",
                          fontWeight: 800,
                          fontSize: 15,
                          letterSpacing: "-0.01em",
                          cursor: blocked ? "not-allowed" : "pointer",
                          boxShadow: blocked ? "none" : "0 10px 22px -10px rgba(186,117,23,0.6)",
                        }}
                      >
                        {saving
                          ? "Enregistrement…"
                          : attribMode === "existing"
                            ? "✅ Valider → fiche client"
                            : "✅ Valider la vente → Rentabilité"}
                      </button>
                      <div style={{ fontSize: 11.5, color: "var(--ls-text-hint)", textAlign: "center", marginTop: 7, lineHeight: 1.45 }}>
                        {!attribReady
                          ? "Choisis un client (existant ou direct) pour valider."
                          : attribMode === "existing"
                            ? `Enregistré sur la fiche de ${selectedClient?.firstName} + ta rentabilité.`
                            : "Crée le client (hors-app) et ajoute la vente à ta rentabilité."}
                      </div>
                    </>
                  );
                })()}

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

      {/* Sélecteur de client existant */}
      {pickerOpen ? (
        // eslint-disable-next-line jsx-a11y/no-static-element-interactions, jsx-a11y/click-events-have-key-events
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Choisir un client"
          onClick={(e) => { if (e.target === e.currentTarget) setPickerOpen(false); }}
          style={{ position: "fixed", inset: 0, zIndex: 9000, background: "color-mix(in srgb, var(--ls-bg) 70%, transparent)", backdropFilter: "blur(6px)", WebkitBackdropFilter: "blur(6px)", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px 12px", fontFamily: "DM Sans, sans-serif" }}
        >
          <div style={{ width: "100%", maxWidth: 460, maxHeight: "86vh", display: "flex", flexDirection: "column", background: "var(--ls-surface)", border: "1px solid var(--ls-border)", borderRadius: 20, overflow: "hidden", boxShadow: "0 24px 64px -16px rgba(0,0,0,0.45)" }}>
            <div style={{ padding: "16px 18px", borderBottom: "1px solid var(--ls-border)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
              <span style={{ fontFamily: "Syne, sans-serif", fontWeight: 800, fontSize: 17, color: "var(--ls-text)" }}>Choisir un client</span>
              <button type="button" onClick={() => setPickerOpen(false)} aria-label="Fermer" style={{ width: 32, height: 32, borderRadius: 999, border: "1px solid var(--ls-border)", background: "var(--ls-surface2)", color: "var(--ls-text-muted)", cursor: "pointer", fontSize: 15 }}>✕</button>
            </div>
            <div style={{ padding: "12px 18px", borderBottom: "1px solid var(--ls-border)", display: "flex", flexDirection: "column", gap: 10 }}>
              <input
                value={pickerQuery}
                onChange={(e) => setPickerQuery(e.target.value)}
                placeholder="Rechercher un client…"
                autoFocus
                style={{ width: "100%", boxSizing: "border-box", padding: "10px 12px", borderRadius: 12, border: "1px solid var(--ls-border)", background: "var(--ls-input-bg)", color: "var(--ls-text)", fontSize: 14, outline: "none" }}
              />
              <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, color: "var(--ls-text-muted)", cursor: "pointer" }}>
                <input type="checkbox" checked={onlyMine} onChange={(e) => setOnlyMine(e.target.checked)} />
                Seulement mes clients
              </label>
            </div>
            <div style={{ flex: 1, overflowY: "auto", WebkitOverflowScrolling: "touch", padding: "8px 10px" }}>
              {pickerClients.length === 0 ? (
                <div style={{ textAlign: "center", padding: "30px 16px", color: "var(--ls-text-muted)", fontSize: 13.5 }}>Aucun client trouvé.</div>
              ) : (
                pickerClients.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => { setSelectedClient(c); setAttribMode("existing"); setPickerOpen(false); setPickerQuery(""); setAttribOpen(false); }}
                    style={{ width: "100%", display: "flex", alignItems: "center", gap: 11, padding: "10px 12px", borderRadius: 12, border: "none", background: "transparent", cursor: "pointer", textAlign: "left" }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = "var(--ls-surface2)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                  >
                    <div style={{ width: 36, height: 36, flex: "0 0 auto", borderRadius: 999, background: c.distributorId === myId ? "var(--ls-teal)" : "var(--ls-surface2)", color: c.distributorId === myId ? "#fff" : "var(--ls-text-muted)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontFamily: "Syne, sans-serif", fontSize: 13, border: c.distributorId === myId ? "none" : "1px solid var(--ls-border)" }}>
                      {c.firstName.charAt(0)}{c.lastName.charAt(0)}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: 14, color: "var(--ls-text)", display: "flex", alignItems: "center", gap: 5, minWidth: 0 }}>
                        {isVipClient(c) ? <span title="Client VIP" style={{ color: "var(--ls-gold)", flex: "0 0 auto" }}>⭐</span> : null}
                        <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.firstName} {c.lastName}</span>
                      </div>
                      <div style={{ fontSize: 11.5, color: "var(--ls-text-hint)" }}>
                        {(() => {
                          const pv = pvByClient.get(c.id);
                          const pvTxt = pv && pv > 0 ? `${Math.round(pv)} PV` : "";
                          return [pvTxt, c.distributorName || ""].filter(Boolean).join(" · ") || "—";
                        })()}
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
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
