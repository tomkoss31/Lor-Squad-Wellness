// =============================================================================
// PvClientFullPage — fiche client Suivi PV (refonte premium 2026-04-29)
// =============================================================================
//
// Architecture :
//   - Header gradient gold + stats chips (produits, PV mois, dernière cmd)
//   - Tabs Produits actifs / Historique
//   - Bouton "Nouvelle commande" gold premium → ouvre PremiumOrderBuilder
//   - PremiumOrderBuilder : catalogue cards visuel avec catégories + panier
//     en bas avec total live + bouton gradient "Enregistrer"
//   - Active products affichés avec progress bar de cure
//   - Confettis émojis à la confirmation commande
// =============================================================================

import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import type {
  PvClientTrackingRecord,
  PvProductUsage,
  PvClientTransaction,
  PvTransactionType,
} from "../../types/pv";
import { useAppContext } from "../../context/AppContext";
import { useToast } from "../../context/ToastContext";
import { pvProductCatalog, getPvTypeLabel } from "../../data/pvCatalog";

type Tab = "products" | "history";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDateLocal(d: string | Date | null | undefined) {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "—";
  }
}

function relativeDays(d: string | Date | null | undefined): string {
  if (!d) return "—";
  const date = new Date(d);
  if (Number.isNaN(date.getTime())) return "—";
  const ms = Date.now() - date.getTime();
  const days = Math.floor(ms / (1000 * 60 * 60 * 24));
  if (days <= 0) return "aujourd'hui";
  if (days === 1) return "hier";
  if (days < 30) return `il y a ${days}j`;
  if (days < 365) return `il y a ${Math.floor(days / 30)} mois`;
  return `il y a ${Math.floor(days / 365)} an${Math.floor(days / 365) > 1 ? "s" : ""}`;
}

// Catégorisation des produits du catalogue avec emoji + ordre d'affichage.
// 2026-04-29 : élargi pour matcher le catalogue PDF Herbalife mars 2026
// (gels, vitamines, kids, packs, oméga, etc).
const CATEGORY_GROUPS: Array<{ id: string; label: string; emoji: string; matches: (cat: string) => boolean }> = [
  { id: "shake", label: "Shakes & repas", emoji: "🥤", matches: (c) => c.includes("shake") || c.includes("repas") },
  { id: "proteine", label: "Protéines", emoji: "💪", matches: (c) => c.includes("prot") },
  { id: "aloe", label: "Aloe Vera", emoji: "🌵", matches: (c) => c.includes("aloe") },
  { id: "hydratation", label: "Hydratation & thé", emoji: "💧", matches: (c) => c.includes("hydrat") || c.includes("routine") },
  { id: "energie", label: "Énergie", emoji: "⚡", matches: (c) => c.includes("energ") || c.includes("énerg") || c.includes("concentration") },
  { id: "sport", label: "Sport & muscle", emoji: "🏋️", matches: (c) => c.includes("sport") || c.includes("muscle") || c.includes("collagen") },
  { id: "encas", label: "En-cas", emoji: "🍫", matches: (c) => c.includes("encas") || c.includes("en-cas") },
  { id: "digestif", label: "Digestif & fibres", emoji: "🌿", matches: (c) => c.includes("digest") || c.includes("fibres") || c.includes("visceral") },
  { id: "sommeil", label: "Sommeil & calme", emoji: "🌙", matches: (c) => c.includes("sommeil") },
  { id: "kids", label: "Enfants", emoji: "🧒", matches: (c) => c.includes("kids") },
  { id: "vitamines", label: "Vitamines & gels", emoji: "💊", matches: (c) => c.includes("vitamines") || c.includes("gels") || c.includes("mineraux") || c.includes("minéraux") || c.includes("omega") || c.includes("vasculaire") || c.includes("complements") || c.includes("compléments") },
  { id: "gelules", label: "Gélules & phyto", emoji: "🌱", matches: (c) => c.includes("gelule") || c.includes("gélule") || c.includes("phyto") || c.includes("immunit") },
  { id: "calcium", label: "Calcium", emoji: "🦴", matches: (c) => c.includes("calcium") },
  { id: "packs", label: "Packs", emoji: "🎁", matches: (c) => c.includes("pack") || c.includes("découverte") || c.includes("decouverte") },
  { id: "autres", label: "Autres", emoji: "✨", matches: () => true },
];

function categorize(catLabel: string): { id: string; emoji: string } {
  const c = (catLabel ?? "").toLowerCase();
  for (const g of CATEGORY_GROUPS) {
    if (g.matches(c)) return { id: g.id, emoji: g.emoji };
  }
  return { id: "autres", emoji: "✨" };
}

// ─── Composant principal ─────────────────────────────────────────────────────

export function PvClientFullPage({
  record,
  onClose,
}: {
  record: PvClientTrackingRecord;
  onClose: () => void;
}) {
  const [activeTab, setActiveTab] = useState<Tab>("products");
  const [showOrderForm, setShowOrderForm] = useState(false);

  const nameParts = (record.clientName ?? "").trim().split(/\s+/);
  const firstName = nameParts[0] ?? "";
  const lastName = nameParts.slice(1).join(" ") || "";

  const productsCount = record.activeProducts?.length ?? 0;

  // PV cumulés ce mois (sum transactions du mois en cours)
  const pvThisMonth = useMemo(() => {
    const start = new Date();
    start.setDate(1);
    start.setHours(0, 0, 0, 0);
    return (record.transactions ?? [])
      .filter((tx) => new Date(tx.date) >= start)
      .reduce((sum, tx) => sum + (tx.pv ?? 0), 0);
  }, [record.transactions]);

  const lastOrderDate = useMemo(() => {
    if (!record.transactions || record.transactions.length === 0) return null;
    const sorted = [...record.transactions].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );
    return sorted[0]?.date ?? null;
  }, [record.transactions]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, fontFamily: "DM Sans, sans-serif" }}>
      {/* Bouton retour */}
      <button
        onClick={onClose}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "9px 14px",
          borderRadius: 9,
          border: "1px solid var(--ls-border)",
          background: "var(--ls-surface)",
          color: "var(--ls-text-muted)",
          fontSize: 12,
          cursor: "pointer",
          alignSelf: "flex-start",
        }}
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="15 18 9 12 15 6" />
        </svg>
        Retour à la liste
      </button>

      {/* Header premium gradient gold */}
      <div
        style={{
          background:
            "linear-gradient(135deg, color-mix(in srgb, var(--ls-gold) 12%, var(--ls-surface)) 0%, var(--ls-surface) 60%)",
          border: "0.5px solid color-mix(in srgb, var(--ls-gold) 35%, var(--ls-border))",
          borderRadius: 18,
          padding: "20px 22px",
          boxShadow: "0 4px 20px rgba(184,146,42,0.10)",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Glow gold subtil top-right */}
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            top: -40,
            right: -40,
            width: 160,
            height: 160,
            background: "radial-gradient(circle, rgba(184,146,42,0.18) 0%, transparent 70%)",
            pointerEvents: "none",
          }}
        />

        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 14, position: "relative", flexWrap: "wrap" }}>
          {/* Avatar */}
          <div
            style={{
              width: 60,
              height: 60,
              borderRadius: 16,
              background: "linear-gradient(135deg, #EF9F27 0%, #BA7517 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontFamily: "Syne, serif",
              fontWeight: 800,
              fontSize: 22,
              color: "white",
              boxShadow: "0 4px 14px rgba(186,117,23,0.40)",
              flexShrink: 0,
            }}
          >
            {(firstName[0] ?? "") + (lastName[0] ?? "")}
          </div>
          {/* Nom + meta */}
          <div style={{ flex: 1, minWidth: 200 }}>
            <h1
              style={{
                fontFamily: "Syne, serif",
                fontWeight: 800,
                fontSize: 24,
                color: "var(--ls-text)",
                margin: 0,
                lineHeight: 1.1,
              }}
            >
              {record.clientName}
            </h1>
            <div style={{ fontSize: 12, color: "var(--ls-text-muted)", marginTop: 4 }}>
              {record.program ?? "Programme"} · Coach {record.responsibleName ?? "—"}
            </div>
          </div>
          {/* Lien vers fiche client */}
          <Link
            to={`/clients/${record.clientId}`}
            style={{
              padding: "9px 14px",
              borderRadius: 10,
              border: "0.5px solid var(--ls-border)",
              background: "var(--ls-surface)",
              color: "var(--ls-text-muted)",
              fontSize: 12,
              fontWeight: 500,
              textDecoration: "none",
            }}
          >
            Dossier complet →
          </Link>
        </div>

        {/* Stats chips */}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 8,
            position: "relative",
          }}
        >
          <StatChip
            label="Produits actifs"
            value={String(productsCount)}
            tone="teal"
          />
          <StatChip
            label="PV ce mois"
            value={pvThisMonth.toFixed(1)}
            tone="gold"
          />
          <StatChip
            label="Dernière commande"
            value={lastOrderDate ? relativeDays(lastOrderDate) : "—"}
            tone="purple"
          />
        </div>
      </div>

      {/* Tabs */}
      <div
        style={{
          background: "var(--ls-surface)",
          border: "0.5px solid var(--ls-border)",
          borderRadius: 14,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            display: "flex",
            borderBottom: "1px solid var(--ls-border)",
            background: "var(--ls-surface2)",
          }}
        >
          {(
            [
              { id: "products" as Tab, label: "Produits actifs" },
              { id: "history" as Tab, label: "Historique" },
            ]
          ).map(({ id, label }) => {
            const isActive = activeTab === id;
            return (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                style={{
                  flex: 1,
                  padding: "14px 16px",
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  fontSize: 13,
                  fontWeight: isActive ? 700 : 500,
                  color: isActive ? "var(--ls-gold)" : "var(--ls-text-muted)",
                  borderBottom: isActive ? "2px solid var(--ls-gold)" : "2px solid transparent",
                  marginBottom: -1,
                  fontFamily: "Syne, serif",
                  transition: "all 0.15s",
                }}
              >
                {label}
              </button>
            );
          })}
        </div>

        {activeTab === "products" && (
          <ProductsTab
            record={record}
            showOrderForm={showOrderForm}
            onToggleOrderForm={() => setShowOrderForm((v) => !v)}
          />
        )}
        {activeTab === "history" && <HistoryTab record={record} />}
      </div>
    </div>
  );
}

// ─── StatChip ────────────────────────────────────────────────────────────────

function StatChip({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "gold" | "teal" | "purple";
}) {
  const colorVar = `var(--ls-${tone})`;
  return (
    <div
      style={{
        padding: "8px 14px",
        background: "var(--ls-surface)",
        border: `0.5px solid color-mix(in srgb, ${colorVar} 35%, transparent)`,
        borderRadius: 10,
        display: "flex",
        flexDirection: "column",
        gap: 2,
        minWidth: 110,
      }}
    >
      <span style={{ fontSize: 9, letterSpacing: 1.4, textTransform: "uppercase", color: "var(--ls-text-hint)", fontWeight: 600 }}>
        {label}
      </span>
      <span
        style={{
          fontFamily: "Syne, serif",
          fontSize: 16,
          fontWeight: 800,
          color: colorVar,
          lineHeight: 1,
        }}
      >
        {value}
      </span>
    </div>
  );
}

// ─── ONGLET PRODUITS ─────────────────────────────────────────────────────────

function ProductsTab({
  record,
  showOrderForm,
  onToggleOrderForm,
}: {
  record: PvClientTrackingRecord;
  showOrderForm: boolean;
  onToggleOrderForm: () => void;
}) {
  const products = record.activeProducts ?? [];

  return (
    <div style={{ padding: 20 }}>
      {!showOrderForm ? (
        <button
          onClick={onToggleOrderForm}
          style={{
            width: "100%",
            padding: "14px 18px",
            borderRadius: 12,
            border: "none",
            background: "linear-gradient(135deg, #EF9F27 0%, #BA7517 100%)",
            color: "#fff",
            fontSize: 14,
            fontWeight: 700,
            cursor: "pointer",
            fontFamily: "Syne, serif",
            marginBottom: 16,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            boxShadow: "0 4px 14px rgba(186,117,23,0.40)",
            transition: "transform 0.15s, box-shadow 0.15s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = "translateY(-1px)";
            e.currentTarget.style.boxShadow = "0 6px 18px rgba(186,117,23,0.50)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "none";
            e.currentTarget.style.boxShadow = "0 4px 14px rgba(186,117,23,0.40)";
          }}
        >
          <span style={{ fontSize: 16 }}>🛒</span>
          Nouvelle commande pour ce client
        </button>
      ) : (
        <PremiumOrderBuilder record={record} onClose={onToggleOrderForm} />
      )}

      {products.length === 0 ? (
        <div
          style={{
            padding: "40px 20px",
            textAlign: "center",
            color: "var(--ls-text-hint)",
            fontSize: 13,
            background: "var(--ls-surface2)",
            borderRadius: 12,
            border: "0.5px dashed var(--ls-border)",
          }}
        >
          🌱 Aucun produit actif pour ce client.
          <br />
          <span style={{ fontSize: 11, marginTop: 4, display: "inline-block" }}>
            Enregistre une 1ère commande pour commencer le suivi.
          </span>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {products.map((p) => (
            <ActiveProductCard key={p.id} p={p} />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Card produit actif avec progress bar de cure ────────────────────────────

function ActiveProductCard({ p }: { p: PvProductUsage }) {
  const remaining = p.estimatedRemainingDays;
  const total = p.durationReferenceDays ?? 21;
  const elapsed = Math.max(0, total - Math.max(0, remaining));
  const ratio = total > 0 ? Math.min(1, Math.max(0, elapsed / total)) : 0;

  const tone = remaining < 0 ? "coral" : remaining < 7 ? "gold" : "teal";
  const color = `var(--ls-${tone})`;
  const bg = `color-mix(in srgb, ${color} 10%, transparent)`;
  const label = remaining < 0 ? "Dépassé" : remaining < 7 ? "Bientôt fini" : "OK";
  // PvProductUsage n'a pas de category — on la cherche dans le catalogue
  const catalogProduct = pvProductCatalog.find((c) => c.id === p.productId);
  const cat = categorize(catalogProduct?.category ?? "");

  return (
    // eslint-disable-next-line jsx-a11y/no-static-element-interactions -- Hover effect only
    <div
      style={{
        background: "var(--ls-surface)",
        border: `0.5px solid color-mix(in srgb, ${color} 30%, var(--ls-border))`,
        borderLeft: `3px solid ${color}`,
        borderRadius: 14,
        padding: 16,
        transition: "transform 0.15s, box-shadow 0.15s",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-1px)";
        e.currentTarget.style.boxShadow = `0 4px 14px color-mix(in srgb, ${color} 18%, transparent)`;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "none";
        e.currentTarget.style.boxShadow = "none";
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10, flexWrap: "wrap" }}>
        <div
          style={{
            width: 38,
            height: 38,
            borderRadius: 10,
            background: bg,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 18,
            flexShrink: 0,
          }}
        >
          {cat.emoji}
        </div>
        <div style={{ flex: 1, minWidth: 140 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "var(--ls-text)", fontFamily: "Syne, serif" }}>
            {p.productName}
          </div>
          <div style={{ fontSize: 11, color: "var(--ls-text-hint)", marginTop: 2 }}>
            {p.quantityStart} {p.quantiteLabel ? `· ${p.quantiteLabel}` : ""} · Démarré le {formatDateLocal(p.startDate)}
          </div>
        </div>
        <span
          style={{
            display: "inline-flex",
            padding: "4px 11px",
            borderRadius: 999,
            fontSize: 10,
            fontWeight: 700,
            background: bg,
            color,
            textTransform: "uppercase",
            letterSpacing: 0.6,
          }}
        >
          {label}
        </span>
      </div>

      {/* Progress bar de cure */}
      <div style={{ marginBottom: 10 }}>
        <div
          style={{
            height: 8,
            background: "color-mix(in srgb, var(--ls-border) 70%, transparent)",
            borderRadius: 4,
            overflow: "hidden",
            position: "relative",
          }}
        >
          <div
            style={{
              width: `${Math.round(ratio * 100)}%`,
              height: "100%",
              background: `linear-gradient(90deg, ${color} 0%, color-mix(in srgb, ${color} 70%, white) 100%)`,
              transition: "width 600ms cubic-bezier(0.4, 0, 0.2, 1)",
            }}
          />
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: 10,
            color: "var(--ls-text-hint)",
            marginTop: 4,
          }}
        >
          <span>{Math.round(ratio * 100)}% de cure consommée</span>
          <span>
            {remaining >= 0 ? `${remaining}j restants` : `${Math.abs(remaining)}j de retard`}
          </span>
        </div>
      </div>

      {/* Footer reste / next */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10, fontSize: 11 }}>
        <div>
          <div style={{ color: "var(--ls-text-hint)", marginBottom: 2, fontSize: 9, letterSpacing: 1.2, textTransform: "uppercase", fontWeight: 600 }}>
            Reste estimé
          </div>
          <div style={{ fontWeight: 700, color: "var(--ls-text)", fontFamily: "Syne, serif", fontSize: 13 }}>
            {remaining} jour{Math.abs(remaining) > 1 ? "s" : ""}
          </div>
        </div>
        <div>
          <div style={{ color: "var(--ls-text-hint)", marginBottom: 2, fontSize: 9, letterSpacing: 1.2, textTransform: "uppercase", fontWeight: 600 }}>
            Prochaine commande
          </div>
          <div style={{ fontWeight: 700, color: "var(--ls-gold)", fontFamily: "Syne, serif", fontSize: 13 }}>
            {formatDateLocal(p.nextProbableOrderDate)}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── PREMIUM ORDER BUILDER (panier visuel) ───────────────────────────────────

const MAX_ORDER_LINES = 12; // augmenté de 6 à 12 dans la refonte

interface CartLine {
  productId: string;
  quantity: number;
}

function PremiumOrderBuilder({
  record,
  onClose,
}: {
  record: PvClientTrackingRecord;
  onClose: () => void;
}) {
  const { addPvTransaction, currentUser } = useAppContext();
  const { push: pushToast } = useToast();

  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [type, setType] = useState<PvTransactionType>("commande");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string>("");
  const [confettiVisible, setConfettiVisible] = useState(false);

  // Delai de reception (2026-04-29) : la cure demarre N jours apres la date
  // de commande. 0 = aujourd'hui (livraison instantanee = sur place), 3-7j
  // = livraison standard. "custom" = pickadate dedie.
  const [deliveryDelay, setDeliveryDelay] = useState<number>(0);
  const [customStartDate, setCustomStartDate] = useState<string>("");

  // Calcule la date de demarrage effective (= date commande + delai).
  // Si customStartDate est defini (mode custom), c'est lui qui gagne.
  const effectiveStartDate = useMemo(() => {
    if (customStartDate) return customStartDate;
    if (deliveryDelay <= 0) return date;
    const d = new Date(date);
    if (Number.isNaN(d.getTime())) return date;
    d.setDate(d.getDate() + deliveryDelay);
    return d.toISOString().slice(0, 10);
  }, [date, deliveryDelay, customStartDate]);

  const isStartDateDifferent = effectiveStartDate !== date;

  const activeProducts = useMemo(() => pvProductCatalog.filter((p) => p.active), []);

  const productsByCategory = useMemo(() => {
    const map = new Map<string, typeof activeProducts>();
    for (const p of activeProducts) {
      const cat = categorize(p.category ?? "").id;
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat)!.push(p);
    }
    return map;
  }, [activeProducts]);

  const visibleProducts = useMemo(() => {
    if (activeCategory === "all") return activeProducts;
    return productsByCategory.get(activeCategory) ?? [];
  }, [activeCategory, activeProducts, productsByCategory]);

  // ─── Cart actions ─────────────────────────────────────────────────────────
  function addToCart(productId: string) {
    setCart((prev) => {
      const existing = prev.find((l) => l.productId === productId);
      if (existing) {
        return prev.map((l) =>
          l.productId === productId ? { ...l, quantity: Math.min(99, l.quantity + 1) } : l,
        );
      }
      if (prev.length >= MAX_ORDER_LINES) return prev;
      return [...prev, { productId, quantity: 1 }];
    });
  }
  function setQuantity(productId: string, delta: number) {
    setCart((prev) =>
      prev
        .map((l) =>
          l.productId === productId ? { ...l, quantity: Math.max(0, Math.min(99, l.quantity + delta)) } : l,
        )
        .filter((l) => l.quantity > 0),
    );
  }
  function removeFromCart(productId: string) {
    setCart((prev) => prev.filter((l) => l.productId !== productId));
  }

  const totals = useMemo(() => {
    let pv = 0;
    let price = 0;
    for (const line of cart) {
      const product = pvProductCatalog.find((p) => p.id === line.productId);
      if (!product) continue;
      pv += product.pv * line.quantity;
      price += product.pricePublic * line.quantity;
    }
    return { pv: Number(pv.toFixed(2)), price: Number(price.toFixed(2)) };
  }, [cart]);

  // ─── Submit ──────────────────────────────────────────────────────────────
  async function handleSubmit() {
    if (cart.length === 0) {
      setError("Sélectionne au moins un produit dans le catalogue.");
      return;
    }
    setError("");
    setSubmitting(true);

    // Fallback responsable (2026-04-29) : si record synthetique sans
    // distributorId valide (cas Sylvie Chaumont sans tracking actif),
    // on utilise currentUser pour ne pas faire planter l'INSERT.
    const safeResponsibleId =
      record.responsibleId && record.responsibleId.length > 0
        ? record.responsibleId
        : currentUser?.id ?? "";
    const safeResponsibleName =
      record.responsibleName && record.responsibleName.length > 0
        ? record.responsibleName
        : currentUser?.name ?? "Coach";

    if (!safeResponsibleId) {
      setError("Impossible d'identifier le coach responsable. Reconnecte-toi puis réessaie.");
      setSubmitting(false);
      return;
    }

    try {
      for (let i = 0; i < cart.length; i += 1) {
        const line = cart[i];
        const product = pvProductCatalog.find((p) => p.id === line.productId);
        if (!product) continue;
        const tx: PvClientTransaction = {
          id: `local-${Date.now()}-${i}`,
          date,
          clientId: record.clientId,
          clientName: record.clientName,
          responsibleId: safeResponsibleId,
          responsibleName: safeResponsibleName,
          productId: product.id,
          productName: product.name,
          quantity: line.quantity,
          pv: Number((product.pv * line.quantity).toFixed(2)),
          price: Number((product.pricePublic * line.quantity).toFixed(2)),
          type,
          note:
            type === "commande"
              ? `Commande multi-produits (${cart.length} ligne${cart.length > 1 ? "s" : ""}) depuis la fiche PV${isStartDateDifferent ? ` · cure demarre le ${effectiveStartDate}` : ""}`
              : `Reprise sur place (${cart.length} ligne${cart.length > 1 ? "s" : ""}) depuis la fiche PV`,
          // Delai reception (2026-04-29) : la cure demarre a la livraison, pas
          // a la commande. Si pas de delai, fallback sur date dans AppContext.
          ...(isStartDateDifferent ? { startDateOverride: effectiveStartDate } : {}),
        };
        await addPvTransaction(tx);
      }
      // Confettis + toast premium
      setConfettiVisible(true);
      pushToast({
        tone: "success",
        title: `+${totals.pv.toFixed(1)} PV enregistrés 🎉`,
        message: `${cart.length} produit${cart.length > 1 ? "s" : ""} pour ${record.clientName}`,
      });
      // Laisse les confettis tourner 1.2s avant de fermer
      window.setTimeout(() => {
        setConfettiVisible(false);
        onClose();
      }, 1200);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Impossible d'enregistrer la commande.";
      setError(msg);
      setSubmitting(false);
      // Toast aussi pour qu'on voie l'erreur meme sans scroller (2026-04-29).
      pushToast({
        tone: "error",
        title: "Échec enregistrement commande",
        message: msg,
      });
      // Log console pour diagnostic
      console.warn("[PvClientFullPage] addPvTransaction failed:", e);
    }
  }

  return (
    <div
      className="pv-order-builder"
      style={{
        background:
          "linear-gradient(180deg, color-mix(in srgb, var(--ls-gold) 4%, var(--ls-surface2)) 0%, var(--ls-surface2) 100%)",
        border: "1px solid color-mix(in srgb, var(--ls-gold) 30%, var(--ls-border))",
        borderRadius: 14,
        padding: 18,
        marginBottom: 18,
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Polish CSS injecte (2026-04-29) : slide-in du builder, pulse du badge
          panier, shimmer sur le bouton submit, bounce sur le total. */}
      <style>{`
        .pv-order-builder { animation: pv-slide-in 360ms cubic-bezier(0.4, 0, 0.2, 1); }
        @keyframes pv-slide-in {
          from { opacity: 0; transform: translateY(-12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .pv-cart-badge { animation: pv-pulse 320ms ease-out; }
        @keyframes pv-pulse {
          0% { transform: scale(1); }
          50% { transform: scale(1.25); box-shadow: 0 0 0 6px rgba(184,146,42,0.25); }
          100% { transform: scale(1); }
        }
        .pv-cart-total { animation: pv-bounce 280ms cubic-bezier(0.2, 0.8, 0.2, 1); }
        @keyframes pv-bounce {
          0% { transform: scale(1); }
          40% { transform: scale(1.06); }
          100% { transform: scale(1); }
        }
        .pv-submit-glow {
          position: relative;
          overflow: hidden;
        }
        .pv-submit-glow::before {
          content: '';
          position: absolute;
          top: 0; left: -100%;
          width: 100%; height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.35), transparent);
          animation: pv-shimmer 2400ms ease-in-out infinite;
        }
        @keyframes pv-shimmer {
          0% { left: -100%; }
          50% { left: 100%; }
          100% { left: 100%; }
        }
        .pv-catalog-card { transition: transform 0.15s, box-shadow 0.15s, border-color 0.15s; }
        .pv-catalog-card:hover { transform: translateY(-2px) scale(1.02); }
        .pv-catalog-card.is-selected { border-color: var(--ls-gold) !important; box-shadow: 0 0 0 2px color-mix(in srgb, var(--ls-gold) 25%, transparent); }
      `}</style>
      {confettiVisible ? <ConfettiOverlay /> : null}

      {/* Header form */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div>
          <div
            style={{
              fontFamily: "Syne, serif",
              fontWeight: 800,
              fontSize: 18,
              color: "var(--ls-text)",
            }}
          >
            🛒 Nouvelle commande
          </div>
          <div style={{ fontSize: 11, color: "var(--ls-text-muted)", marginTop: 2 }}>
            Pour {record.clientName} · sélectionne dans le catalogue
          </div>
        </div>
        <button
          onClick={onClose}
          style={{
            background: "transparent",
            border: "none",
            color: "var(--ls-text-hint)",
            fontSize: 24,
            cursor: "pointer",
            padding: 4,
            lineHeight: 1,
          }}
          aria-label="Fermer"
        >
          ×
        </button>
      </div>

      {/* Date + Type chips */}
      <div style={{ display: "flex", gap: 12, marginBottom: 14, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 11, color: "var(--ls-text-muted)" }}>📅</span>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            style={{
              padding: "8px 10px",
              border: "0.5px solid var(--ls-border)",
              borderRadius: 8,
              fontFamily: "DM Sans, sans-serif",
              fontSize: 13,
              background: "var(--ls-surface)",
              color: "var(--ls-text)",
              outline: "none",
            }}
          />
        </div>
        <div style={{ display: "inline-flex", gap: 4, padding: 3, background: "var(--ls-surface)", borderRadius: 10, border: "0.5px solid var(--ls-border)" }}>
          {(["commande", "reprise-sur-place"] as PvTransactionType[]).map((t) => {
            const active = type === t;
            return (
              <button
                key={t}
                type="button"
                onClick={() => setType(t)}
                style={{
                  padding: "6px 12px",
                  border: "none",
                  background: active ? "var(--ls-gold)" : "transparent",
                  color: active ? "white" : "var(--ls-text-muted)",
                  fontSize: 11,
                  fontWeight: 600,
                  borderRadius: 7,
                  cursor: "pointer",
                  fontFamily: "DM Sans, sans-serif",
                }}
              >
                {t === "commande" ? "🛒 Commande" : "🏪 Sur place"}
              </button>
            );
          })}
        </div>
      </div>

      {/* Delai reception (2026-04-29) — la cure demarre a la livraison */}
      {type === "commande" ? (
        <div
          style={{
            background: "var(--ls-surface)",
            border: "0.5px solid var(--ls-border)",
            borderRadius: 12,
            padding: "10px 14px",
            marginBottom: 14,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 10,
              flexWrap: "wrap",
              marginBottom: 8,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 14 }}>🚚</span>
              <span
                style={{
                  fontSize: 10,
                  letterSpacing: 1.4,
                  textTransform: "uppercase",
                  color: "var(--ls-text-hint)",
                  fontWeight: 700,
                }}
              >
                Délai de réception
              </span>
            </div>
            {isStartDateDifferent ? (
              <span
                style={{
                  fontSize: 11,
                  color: "var(--ls-teal)",
                  fontFamily: "Syne, serif",
                  fontWeight: 700,
                }}
              >
                Cure démarre le{" "}
                {new Date(effectiveStartDate).toLocaleDateString("fr-FR", {
                  day: "numeric",
                  month: "short",
                })}
              </span>
            ) : null}
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {[
              { value: 0, label: "🏠 Aujourd'hui" },
              { value: 3, label: "+3 jours" },
              { value: 5, label: "+5 jours" },
              { value: 7, label: "+7 jours" },
            ].map((opt) => {
              const active = !customStartDate && deliveryDelay === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    setDeliveryDelay(opt.value);
                    setCustomStartDate("");
                  }}
                  style={{
                    padding: "6px 12px",
                    borderRadius: 999,
                    border: active ? "0.5px solid var(--ls-teal)" : "0.5px solid var(--ls-border)",
                    background: active
                      ? "color-mix(in srgb, var(--ls-teal) 12%, var(--ls-surface))"
                      : "var(--ls-surface)",
                    color: active ? "var(--ls-teal)" : "var(--ls-text-muted)",
                    fontSize: 11,
                    fontWeight: active ? 700 : 500,
                    cursor: "pointer",
                    fontFamily: "DM Sans, sans-serif",
                  }}
                >
                  {opt.label}
                </button>
              );
            })}
            <input
              type="date"
              value={customStartDate}
              min={date}
              onChange={(e) => {
                setCustomStartDate(e.target.value);
                setDeliveryDelay(0);
              }}
              style={{
                padding: "6px 10px",
                borderRadius: 999,
                border: customStartDate
                  ? "0.5px solid var(--ls-teal)"
                  : "0.5px solid var(--ls-border)",
                background: customStartDate
                  ? "color-mix(in srgb, var(--ls-teal) 12%, var(--ls-surface))"
                  : "var(--ls-surface)",
                color: customStartDate ? "var(--ls-teal)" : "var(--ls-text-muted)",
                fontSize: 11,
                fontFamily: "DM Sans, sans-serif",
                outline: "none",
              }}
            />
          </div>
        </div>
      ) : null}

      {/* Catégories */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
        <CategoryChip label="✨ Tout" active={activeCategory === "all"} onClick={() => setActiveCategory("all")} count={activeProducts.length} />
        {CATEGORY_GROUPS.filter((g) => g.id !== "autres" && (productsByCategory.get(g.id)?.length ?? 0) > 0).map((g) => (
          <CategoryChip
            key={g.id}
            label={`${g.emoji} ${g.label}`}
            active={activeCategory === g.id}
            onClick={() => setActiveCategory(g.id)}
            count={productsByCategory.get(g.id)?.length ?? 0}
          />
        ))}
      </div>

      {/* Catalogue grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))",
          gap: 10,
          marginBottom: 16,
          maxHeight: 380,
          overflowY: "auto",
          padding: 4,
        }}
      >
        {visibleProducts.map((p) => {
          const inCart = cart.find((l) => l.productId === p.id);
          const cat = categorize(p.category ?? "");
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => addToCart(p.id)}
              className={`pv-catalog-card${inCart ? " is-selected" : ""}`}
              style={{
                position: "relative",
                background: inCart ? "color-mix(in srgb, var(--ls-gold) 8%, var(--ls-surface))" : "var(--ls-surface)",
                border: "0.5px solid var(--ls-border)",
                borderRadius: 12,
                padding: "12px 12px 10px",
                cursor: "pointer",
                textAlign: "left",
                fontFamily: "DM Sans, sans-serif",
                display: "flex",
                flexDirection: "column",
                gap: 6,
                minHeight: 110,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6 }}>
                <span style={{ fontSize: 22 }}>{cat.emoji}</span>
                {inCart ? (
                  <span
                    key={`badge-${inCart.quantity}`}
                    className="pv-cart-badge"
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      padding: "2px 8px",
                      borderRadius: 999,
                      background: "var(--ls-gold)",
                      color: "white",
                      fontFamily: "Syne, serif",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 3,
                    }}
                  >
                    ✓ ×{inCart.quantity}
                  </span>
                ) : null}
              </div>
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: "var(--ls-text)",
                  lineHeight: 1.25,
                  fontFamily: "Syne, serif",
                }}
              >
                {p.name}
              </div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginTop: "auto" }}>
                <span
                  style={{
                    fontFamily: "Syne, serif",
                    fontWeight: 800,
                    fontSize: 14,
                    color: "var(--ls-gold)",
                  }}
                >
                  {p.pv.toFixed(1)} PV
                </span>
                <span style={{ fontSize: 11, color: "var(--ls-text-muted)" }}>
                  {p.pricePublic.toFixed(0)}€
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Panier */}
      {cart.length > 0 ? (
        <div
          style={{
            background: "var(--ls-surface)",
            border: "1px solid color-mix(in srgb, var(--ls-gold) 30%, var(--ls-border))",
            borderRadius: 12,
            padding: 14,
            marginBottom: 12,
          }}
        >
          <div
            style={{
              fontSize: 10,
              letterSpacing: 1.4,
              textTransform: "uppercase",
              color: "var(--ls-text-hint)",
              fontWeight: 700,
              marginBottom: 10,
            }}
          >
            🛍️ Panier — {cart.length} produit{cart.length > 1 ? "s" : ""}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {cart.map((line) => {
              const product = pvProductCatalog.find((p) => p.id === line.productId);
              if (!product) return null;
              const cat = categorize(product.category ?? "");
              return (
                <div
                  key={line.productId}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "10px 12px",
                    background: "var(--ls-surface2)",
                    borderRadius: 10,
                    border: "0.5px solid var(--ls-border)",
                  }}
                >
                  <span style={{ fontSize: 18 }}>{cat.emoji}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 600, color: "var(--ls-text)" }}>
                      {product.name}
                    </div>
                    <div style={{ fontSize: 10, color: "var(--ls-text-hint)", marginTop: 1 }}>
                      {(product.pv * line.quantity).toFixed(1)} PV ·{" "}
                      {(product.pricePublic * line.quantity).toFixed(2)}€
                    </div>
                  </div>
                  {/* Stepper qty */}
                  <div style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                    <button
                      type="button"
                      onClick={() => setQuantity(line.productId, -1)}
                      aria-label="Diminuer"
                      style={stepperBtnStyle}
                    >
                      −
                    </button>
                    <span
                      style={{
                        minWidth: 28,
                        textAlign: "center",
                        fontFamily: "Syne, serif",
                        fontWeight: 800,
                        fontSize: 14,
                        color: "var(--ls-text)",
                      }}
                    >
                      {line.quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => setQuantity(line.productId, +1)}
                      aria-label="Augmenter"
                      style={stepperBtnStyle}
                    >
                      +
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeFromCart(line.productId)}
                    aria-label="Retirer"
                    style={{
                      background: "transparent",
                      border: "none",
                      color: "var(--ls-coral)",
                      fontSize: 18,
                      cursor: "pointer",
                      padding: 4,
                      lineHeight: 1,
                    }}
                  >
                    ×
                  </button>
                </div>
              );
            })}
          </div>

          {/* Totals */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginTop: 12,
              padding: "10px 12px",
              background:
                "linear-gradient(90deg, color-mix(in srgb, var(--ls-gold) 8%, transparent) 0%, transparent 100%)",
              borderRadius: 10,
              border: "0.5px dashed color-mix(in srgb, var(--ls-gold) 35%, transparent)",
            }}
          >
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <span style={{ fontSize: 9, letterSpacing: 1.2, textTransform: "uppercase", color: "var(--ls-text-hint)", fontWeight: 600 }}>
                Total
              </span>
              <div
                key={`total-${totals.pv}`}
                className="pv-cart-total"
                style={{ display: "flex", alignItems: "baseline", gap: 10 }}
              >
                <span style={{ fontFamily: "Syne, serif", fontWeight: 800, fontSize: 22, color: "var(--ls-gold)" }}>
                  {totals.pv.toFixed(1)} PV
                </span>
                <span style={{ fontSize: 13, color: "var(--ls-text-muted)" }}>
                  {totals.price.toFixed(2)} €
                </span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div
          style={{
            padding: "16px 14px",
            background: "var(--ls-surface)",
            border: "0.5px dashed var(--ls-border)",
            borderRadius: 12,
            textAlign: "center",
            fontSize: 12,
            color: "var(--ls-text-hint)",
            marginBottom: 12,
            fontStyle: "italic",
          }}
        >
          🛍️ Panier vide — clique sur les produits du catalogue pour les ajouter
        </div>
      )}

      {/* Error */}
      {error ? (
        <div
          style={{
            padding: "10px 14px",
            borderRadius: 10,
            background: "color-mix(in srgb, var(--ls-coral) 8%, transparent)",
            border: "0.5px solid color-mix(in srgb, var(--ls-coral) 30%, transparent)",
            color: "var(--ls-coral)",
            fontSize: 12,
            marginBottom: 10,
          }}
        >
          {error}
        </div>
      ) : null}

      {/* Actions */}
      <div style={{ display: "flex", gap: 10 }}>
        <button
          onClick={onClose}
          style={{
            flex: 1,
            padding: "12px",
            borderRadius: 10,
            border: "0.5px solid var(--ls-border)",
            background: "transparent",
            color: "var(--ls-text-muted)",
            fontSize: 13,
            cursor: "pointer",
            fontFamily: "DM Sans, sans-serif",
            fontWeight: 500,
          }}
        >
          Annuler
        </button>
        <button
          onClick={() => void handleSubmit()}
          disabled={submitting || cart.length === 0}
          className={cart.length > 0 && !submitting ? "pv-submit-glow" : ""}
          style={{
            flex: 2,
            padding: "12px",
            borderRadius: 10,
            border: "none",
            background:
              cart.length === 0
                ? "var(--ls-border)"
                : "linear-gradient(135deg, #EF9F27 0%, #BA7517 100%)",
            color: "#fff",
            fontSize: 13,
            fontWeight: 700,
            cursor: submitting ? "wait" : cart.length === 0 ? "not-allowed" : "pointer",
            fontFamily: "Syne, serif",
            opacity: submitting ? 0.7 : 1,
            boxShadow: cart.length > 0 ? "0 4px 14px rgba(186,117,23,0.40)" : "none",
            transition: "all 0.15s",
            position: "relative",
            zIndex: 1,
          }}
        >
          <span style={{ position: "relative", zIndex: 2 }}>
            {submitting ? "Enregistrement…" : `Enregistrer ${cart.length > 0 ? `(${totals.pv.toFixed(1)} PV)` : ""}`}
          </span>
        </button>
      </div>
    </div>
  );
}

const stepperBtnStyle: React.CSSProperties = {
  width: 28,
  height: 28,
  borderRadius: 8,
  border: "0.5px solid var(--ls-border)",
  background: "var(--ls-surface)",
  color: "var(--ls-text)",
  fontSize: 16,
  fontWeight: 700,
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 0,
  lineHeight: 1,
  fontFamily: "Syne, serif",
};

// ─── Confetti overlay (simple emoji rain) ────────────────────────────────────

function ConfettiOverlay() {
  const emojis = useMemo(() => {
    const items: { e: string; left: number; delay: number; rot: number }[] = [];
    const set = ["🎉", "✨", "💰", "🎊", "⭐"];
    for (let i = 0; i < 24; i += 1) {
      items.push({
        e: set[i % set.length],
        left: Math.random() * 100,
        delay: Math.random() * 400,
        rot: Math.random() * 360,
      });
    }
    return items;
  }, []);
  return (
    <div
      aria-hidden="true"
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        overflow: "hidden",
        zIndex: 5,
      }}
    >
      {emojis.map((c, i) => (
        <span
          key={i}
          style={{
            position: "absolute",
            top: -20,
            left: `${c.left}%`,
            fontSize: 22 + (i % 3) * 4,
            transform: `rotate(${c.rot}deg)`,
            animation: `pv-confetti-fall 1100ms ease-in ${c.delay}ms forwards`,
          }}
        >
          {c.e}
        </span>
      ))}
      <style>
        {`@keyframes pv-confetti-fall {
          0% { transform: translateY(-20px) rotate(0deg); opacity: 1; }
          100% { transform: translateY(420px) rotate(540deg); opacity: 0; }
        }`}
      </style>
    </div>
  );
}

// ─── Category chip ───────────────────────────────────────────────────────────

function CategoryChip({
  label,
  active,
  onClick,
  count,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  count: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: "6px 12px",
        borderRadius: 999,
        border: active ? "0.5px solid var(--ls-gold)" : "0.5px solid var(--ls-border)",
        background: active ? "color-mix(in srgb, var(--ls-gold) 12%, var(--ls-surface))" : "var(--ls-surface)",
        color: active ? "var(--ls-gold)" : "var(--ls-text-muted)",
        fontSize: 11,
        fontWeight: active ? 700 : 500,
        cursor: "pointer",
        fontFamily: "DM Sans, sans-serif",
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        transition: "all 0.12s",
      }}
    >
      {label}
      <span
        style={{
          fontSize: 9,
          padding: "1px 6px",
          borderRadius: 999,
          background: active ? "var(--ls-gold)" : "var(--ls-surface2)",
          color: active ? "white" : "var(--ls-text-hint)",
          fontWeight: 700,
        }}
      >
        {count}
      </span>
    </button>
  );
}

// ─── ONGLET HISTORIQUE ───────────────────────────────────────────────────────

function HistoryTab({ record }: { record: PvClientTrackingRecord }) {
  const transactions = record.transactions ?? [];
  if (transactions.length === 0) {
    return (
      <div
        style={{
          padding: "40px 20px",
          textAlign: "center",
          color: "var(--ls-text-hint)",
          fontSize: 13,
        }}
      >
        📭 Aucune transaction pour ce client.
      </div>
    );
  }
  return (
    <div>
      {transactions.map((tx, i) => (
        <div
          key={tx.id ?? i}
          className="pv-history-row"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            flexWrap: "wrap",
            padding: "14px 18px",
            borderBottom: i < transactions.length - 1 ? "1px solid var(--ls-border)" : "none",
          }}
        >
          <div style={{ width: 90, fontSize: 11, color: "var(--ls-text-hint)", flexShrink: 0 }}>
            {formatDateLocal(tx.date)}
          </div>
          <div style={{ flex: 1, minWidth: 140 }}>
            <div style={{ fontSize: 13, fontWeight: 500, color: "var(--ls-text)" }}>
              {tx.productName}
            </div>
            <div style={{ fontSize: 10, color: "var(--ls-text-hint)" }}>
              {getPvTypeLabel(tx.type)} · Qté {tx.quantity}
            </div>
          </div>
          <div
            style={{
              fontFamily: "Syne, sans-serif",
              fontSize: 14,
              fontWeight: 700,
              color: "var(--ls-gold)",
            }}
          >
            {tx.pv?.toFixed(2)} PV
          </div>
          <div style={{ fontSize: 11, color: "var(--ls-text-muted)", width: 60, textAlign: "right" }}>
            {tx.price?.toFixed(2)} €
          </div>
        </div>
      ))}
    </div>
  );
}
