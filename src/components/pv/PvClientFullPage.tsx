import { useState } from "react";
import { Link } from "react-router-dom";
import type { PvClientTrackingRecord, PvProductUsage, PvClientTransaction, PvTransactionType } from "../../types/pv";
import { useAppContext } from "../../context/AppContext";
import { pvProductCatalog, getPvTypeLabel } from "../../data/pvCatalog";

type Tab = "products" | "history";

function formatDateLocal(d: string | Date | null | undefined) {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
  } catch {
    return "—";
  }
}

export function PvClientFullPage({ record, onClose }: { record: PvClientTrackingRecord; onClose: () => void }) {
  const [activeTab, setActiveTab] = useState<Tab>("products");
  const [showOrderForm, setShowOrderForm] = useState(false);

  const nameParts = (record.clientName ?? "").trim().split(/\s+/);
  const firstName = nameParts[0] ?? "";
  const lastName = nameParts.slice(1).join(" ") || "";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Bouton retour */}
      <button
        onClick={onClose}
        style={{
          display: "flex", alignItems: "center", gap: 8,
          padding: "9px 14px", borderRadius: 9,
          border: "1px solid var(--ls-border)", background: "var(--ls-surface)",
          color: "var(--ls-text-muted)", fontSize: 12, cursor: "pointer",
          fontFamily: "DM Sans, sans-serif", alignSelf: "flex-start",
        }}
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="15 18 9 12 15 6" />
        </svg>
        Retour à la liste
      </button>

      {/* Header client */}
      <div className="pv-fullpage-header" style={{
        background: "var(--ls-surface)", border: "1px solid var(--ls-border)",
        borderRadius: 14, padding: "18px 20px",
        display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap",
      }}>
        <div style={{
          width: 52, height: 52, borderRadius: "50%",
          background: "rgba(184,146,42,0.15)",
          border: "2px solid rgba(184,146,42,0.25)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontFamily: "Syne, sans-serif", fontWeight: 800, fontSize: 16,
          color: "var(--ls-gold)", flexShrink: 0,
        }}>
          {firstName[0]}{lastName[0]}
        </div>
        <div style={{ flex: 1, minWidth: 180 }}>
          <div style={{ fontFamily: "Syne, sans-serif", fontWeight: 800, fontSize: 20, color: "var(--ls-text)" }}>
            {record.clientName}
          </div>
          <div style={{ fontSize: 12, color: "var(--ls-text-hint)", marginTop: 2 }}>
            {record.program ?? "Programme"} · Coach {record.responsibleName ?? "—"}
          </div>
        </div>
        <Link
          to={`/clients/${record.clientId}`}
          style={{
            padding: "9px 14px", borderRadius: 10,
            border: "1px solid var(--ls-border)", background: "var(--ls-surface2)",
            color: "var(--ls-text-muted)", fontSize: 12, fontWeight: 500,
            textDecoration: "none", fontFamily: "DM Sans, sans-serif",
          }}
        >
          Ouvrir dossier complet →
        </Link>
      </div>

      {/* Card onglets + contenu */}
      <div style={{ background: "var(--ls-surface)", border: "1px solid var(--ls-border)", borderRadius: 14, overflow: "hidden" }}>
        <div style={{ display: "flex", borderBottom: "1px solid var(--ls-border)" }}>
          {(
            [
              { key: "products", label: "Produits actifs" },
              { key: "history", label: "Historique" },
            ] as const
          ).map(({ key, label }) => {
            const isActive = activeTab === key;
            return (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                style={{
                  flex: 1, padding: "14px", border: "none", background: "transparent",
                  color: isActive ? "var(--ls-gold)" : "var(--ls-text-muted)",
                  fontSize: 13, fontWeight: isActive ? 600 : 400, cursor: "pointer",
                  borderBottom: isActive ? "2px solid var(--ls-gold)" : "2px solid transparent",
                  marginBottom: -1, fontFamily: "DM Sans, sans-serif", transition: "all 0.15s",
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
            onToggleOrderForm={() => setShowOrderForm(!showOrderForm)}
          />
        )}
        {activeTab === "history" && <HistoryTab record={record} />}
      </div>
    </div>
  );
}

// ─── ONGLET PRODUITS ─────────────────────────────────────────────────────
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
    <div style={{ padding: 18 }}>
      {!showOrderForm ? (
        <button
          onClick={onToggleOrderForm}
          style={{
            width: "100%", padding: "12px", borderRadius: 11, border: "none",
            background: "var(--ls-gold)", color: "#fff",
            fontSize: 13, fontWeight: 700, cursor: "pointer",
            fontFamily: "Syne, sans-serif", marginBottom: 14,
            display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
            boxShadow: "0 2px 8px rgba(184,146,42,0.25)",
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Nouvelle commande pour ce client
        </button>
      ) : (
        <InlineOrderForm record={record} onClose={onToggleOrderForm} />
      )}

      {products.length === 0 ? (
        <div style={{ padding: "40px 20px", textAlign: "center", color: "var(--ls-text-hint)", fontSize: 13 }}>
          Aucun produit actif pour ce client.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {products.map((p) => (
            <ProductCard key={p.id} p={p} />
          ))}
        </div>
      )}
    </div>
  );
}

function ProductCard({ p }: { p: PvProductUsage }) {
  const remaining = p.estimatedRemainingDays;
  const color =
    remaining < 0 ? "var(--ls-coral)" : remaining < 7 ? "var(--ls-gold)" : "var(--ls-teal)";
  const bg =
    remaining < 0 ? "rgba(220,38,38,0.1)" : remaining < 7 ? "rgba(184,146,42,0.1)" : "rgba(13,148,136,0.1)";
  const label = remaining < 0 ? "Dépassé" : remaining < 7 ? "Bientôt fini" : "OK";

  return (
    <div style={{
      background: "var(--ls-surface2)", border: "1px solid var(--ls-border)",
      borderRadius: 12, padding: 14,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10, flexWrap: "wrap" }}>
        <div style={{ width: 8, height: 8, borderRadius: "50%", background: color, flexShrink: 0 }} />
        <div style={{ flex: 1, minWidth: 140 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ls-text)" }}>{p.productName}</div>
          <div style={{ fontSize: 11, color: "var(--ls-text-hint)", marginTop: 2 }}>
            {p.quantityStart} {p.quantiteLabel ? `· ${p.quantiteLabel}` : ""} · Démarré le {formatDateLocal(p.startDate)}
          </div>
        </div>
        <span style={{
          display: "inline-flex", padding: "3px 10px", borderRadius: 10,
          fontSize: 10, fontWeight: 600, background: bg, color,
        }}>
          {label}
        </span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10, fontSize: 11 }}>
        <div>
          <div style={{ color: "var(--ls-text-hint)", marginBottom: 2 }}>Reste estimé</div>
          <div style={{ fontWeight: 600, color: "var(--ls-text)" }}>
            {remaining} jour{Math.abs(remaining) > 1 ? "s" : ""}
          </div>
        </div>
        <div>
          <div style={{ color: "var(--ls-text-hint)", marginBottom: 2 }}>Prochaine commande</div>
          <div style={{ fontWeight: 600, color: "var(--ls-gold)" }}>{formatDateLocal(p.nextProbableOrderDate)}</div>
        </div>
      </div>
    </div>
  );
}

// ─── FORMULAIRE INLINE COMMANDE ─────────────────────────────────────────
// Chantier bilan updates (2026-04-20) : jusqu'à 6 lignes produits par
// commande. Chaque ligne = produit + quantité. Date + type communs à
// toute la commande. Submit = boucle addPvTransaction pour chaque ligne.
const MAX_ORDER_LINES = 6;

interface OrderLine {
  id: string;
  productId: string;
  quantity: string;
}

function createEmptyLine(initialProductId: string): OrderLine {
  return {
    id: `line-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    productId: initialProductId,
    quantity: "1",
  };
}

function InlineOrderForm({ record, onClose }: { record: PvClientTrackingRecord; onClose: () => void }) {
  const { addPvTransaction } = useAppContext();
  const initialProduct = pvProductCatalog.find((p) => p.active) ?? pvProductCatalog[0];
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [type, setType] = useState<PvTransactionType>("commande");
  const [lines, setLines] = useState<OrderLine[]>(() => [createEmptyLine(initialProduct?.id ?? "")]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string>("");

  function updateLine(lineId: string, patch: Partial<OrderLine>) {
    setLines((prev) => prev.map((l) => (l.id === lineId ? { ...l, ...patch } : l)));
  }
  function removeLine(lineId: string) {
    setLines((prev) => (prev.length > 1 ? prev.filter((l) => l.id !== lineId) : prev));
  }
  function addLine() {
    setLines((prev) =>
      prev.length < MAX_ORDER_LINES ? [...prev, createEmptyLine(initialProduct?.id ?? "")] : prev
    );
  }

  // Totaux agrégés sur toutes les lignes
  const { totalPv, totalPrice } = (() => {
    let pv = 0;
    let price = 0;
    for (const line of lines) {
      const product = pvProductCatalog.find((p) => p.id === line.productId);
      const qty = Number(line.quantity || 0);
      if (!product || !qty) continue;
      pv += product.pv * qty;
      price += product.pricePublic * qty;
    }
    return { totalPv: Number(pv.toFixed(2)), totalPrice: Number(price.toFixed(2)) };
  })();

  async function handleSubmit() {
    // Validation : au moins 1 ligne avec qty > 0
    const valid: Array<{ line: OrderLine; product: (typeof pvProductCatalog)[number]; qty: number }> = [];
    for (const line of lines) {
      const qty = Number(line.quantity);
      if (!qty || qty <= 0) continue;
      const product = pvProductCatalog.find((p) => p.id === line.productId);
      if (!product) continue;
      valid.push({ line, product, qty });
    }
    if (valid.length === 0) {
      setError("Ajoute au moins un produit avec une quantité > 0.");
      return;
    }

    setError("");
    setSubmitting(true);
    try {
      // Boucle d'INSERT — on incrémente un nano-offset pour l'id local afin
      // d'éviter les doublons.
      for (let i = 0; i < valid.length; i += 1) {
        const { product, qty } = valid[i];
        const tx: PvClientTransaction = {
          id: `local-${Date.now()}-${i}`,
          date,
          clientId: record.clientId,
          clientName: record.clientName,
          responsibleId: record.responsibleId,
          responsibleName: record.responsibleName,
          productId: product.id,
          productName: product.name,
          quantity: qty,
          pv: Number((product.pv * qty).toFixed(2)),
          price: Number((product.pricePublic * qty).toFixed(2)),
          type,
          note: type === "commande"
            ? `Commande multi-produits (${valid.length} ligne${valid.length > 1 ? "s" : ""}) depuis la fiche client`
            : `Reprise sur place (${valid.length} ligne${valid.length > 1 ? "s" : ""}) depuis la fiche client`,
        };
        await addPvTransaction(tx);
      }
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Impossible d'enregistrer la commande.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={{
      background: "var(--ls-surface2)", border: "1.5px solid var(--ls-gold)",
      borderRadius: 12, padding: 16, marginBottom: 14,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <div style={{ fontFamily: "Syne, sans-serif", fontWeight: 700, fontSize: 14, color: "var(--ls-text)" }}>
          Nouvelle commande ({lines.length}/{MAX_ORDER_LINES} ligne{lines.length > 1 ? "s" : ""})
        </div>
        <button
          onClick={onClose}
          style={{ background: "transparent", border: "none", color: "var(--ls-text-hint)", fontSize: 22, cursor: "pointer", padding: 0, lineHeight: 1 }}
          aria-label="Fermer"
        >
          ×
        </button>
      </div>

      {/* Date + Type (communs) */}
      <div className="pv-form-grid" style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10, marginBottom: 12 }}>
        <FormField label="Date">
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={inputStyle} />
        </FormField>
        <FormField label="Type">
          <select value={type} onChange={(e) => setType(e.target.value as PvTransactionType)} style={inputStyle}>
            <option value="commande">Commande</option>
            <option value="reprise-sur-place">Reprise sur place</option>
          </select>
        </FormField>
      </div>

      {/* Lignes produits */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 10 }}>
        {lines.map((line, idx) => (
          <div
            key={line.id}
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(0, 1fr) 90px auto",
              gap: 8,
              alignItems: "center",
              padding: 10,
              borderRadius: 9,
              background: "var(--ls-surface)",
              border: "1px solid var(--ls-border)",
            }}
          >
            <select
              value={line.productId}
              onChange={(e) => updateLine(line.id, { productId: e.target.value })}
              style={inputStyle}
              aria-label={`Produit ligne ${idx + 1}`}
            >
              {pvProductCatalog.filter((p) => p.active).map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
            <input
              type="number"
              min="1"
              value={line.quantity}
              onChange={(e) => updateLine(line.id, { quantity: e.target.value })}
              style={inputStyle}
              aria-label={`Quantité ligne ${idx + 1}`}
            />
            <button
              type="button"
              onClick={() => removeLine(line.id)}
              disabled={lines.length === 1}
              aria-label={`Supprimer ligne ${idx + 1}`}
              style={{
                background: "transparent",
                border: "1px solid var(--ls-border)",
                color: lines.length === 1 ? "var(--ls-text-hint)" : "var(--ls-coral)",
                borderRadius: 8,
                padding: "6px 10px",
                fontSize: 14,
                cursor: lines.length === 1 ? "not-allowed" : "pointer",
                opacity: lines.length === 1 ? 0.5 : 1,
              }}
            >
              ×
            </button>
          </div>
        ))}
      </div>

      {/* Ajouter ligne */}
      {lines.length < MAX_ORDER_LINES && (
        <button
          type="button"
          onClick={addLine}
          style={{
            width: "100%",
            padding: 10,
            borderRadius: 9,
            border: "1.5px dashed var(--ls-border2)",
            background: "transparent",
            color: "var(--ls-gold)",
            fontSize: 12,
            fontWeight: 600,
            cursor: "pointer",
            fontFamily: "'DM Sans', sans-serif",
            marginBottom: 14,
          }}
        >
          + Ajouter une ligne produit
        </button>
      )}
      {lines.length >= MAX_ORDER_LINES && (
        <p style={{ fontSize: 11, color: "var(--ls-text-hint)", textAlign: "center", margin: "0 0 14px" }}>
          Maximum {MAX_ORDER_LINES} produits par commande.
        </p>
      )}

      {/* Totaux live */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10, marginBottom: 14, padding: 10, background: "var(--ls-surface)", borderRadius: 9 }}>
        <div style={{ fontSize: 11, color: "var(--ls-text-hint)" }}>
          PV total : <strong style={{ color: "var(--ls-gold)", fontSize: 13 }}>{totalPv.toFixed(2)} PV</strong>
        </div>
        <div style={{ fontSize: 11, color: "var(--ls-text-hint)" }}>
          Prix total : <strong style={{ color: "var(--ls-text)", fontSize: 13 }}>{totalPrice.toFixed(2)} €</strong>
        </div>
      </div>

      {error && (
        <div style={{ padding: "8px 12px", borderRadius: 9, background: "rgba(220,38,38,0.08)", border: "1px solid rgba(220,38,38,0.2)", color: "var(--ls-coral)", fontSize: 12, marginBottom: 10 }}>
          {error}
        </div>
      )}

      <div style={{ display: "flex", gap: 8 }}>
        <button
          onClick={onClose}
          style={{
            flex: 1, padding: "10px", borderRadius: 9,
            border: "1px solid var(--ls-border)", background: "transparent",
            color: "var(--ls-text-muted)", fontSize: 12, cursor: "pointer",
            fontFamily: "DM Sans, sans-serif",
          }}
        >
          Annuler
        </button>
        <button
          onClick={() => void handleSubmit()}
          disabled={submitting}
          style={{
            flex: 2, padding: "10px", borderRadius: 9, border: "none",
            background: "var(--ls-gold)", color: "#fff",
            fontSize: 12, fontWeight: 700,
            cursor: submitting ? "wait" : "pointer",
            fontFamily: "Syne, sans-serif", opacity: submitting ? 0.7 : 1,
          }}
        >
          {submitting ? "Enregistrement..." : "Enregistrer la commande"}
        </button>
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "9px 11px",
  border: "1px solid var(--ls-border)",
  borderRadius: 8,
  fontFamily: "DM Sans, sans-serif",
  fontSize: 14,
  background: "var(--ls-surface)",
  color: "var(--ls-text)",
  outline: "none",
};

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ fontSize: 9, letterSpacing: "1.5px", textTransform: "uppercase", color: "var(--ls-text-hint)", fontWeight: 500, marginBottom: 5, fontFamily: "DM Sans, sans-serif" }}>
        {label}
      </div>
      {children}
    </div>
  );
}

// ─── ONGLET HISTORIQUE ──────────────────────────────────────────────────
function HistoryTab({ record }: { record: PvClientTrackingRecord }) {
  const transactions = record.transactions ?? [];
  if (transactions.length === 0) {
    return (
      <div style={{ padding: "40px 20px", textAlign: "center", color: "var(--ls-text-hint)", fontSize: 13 }}>
        Aucune transaction pour ce client.
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
            display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap",
            padding: "14px 18px",
            borderBottom: i < transactions.length - 1 ? "1px solid var(--ls-border)" : "none",
          }}
        >
          <div style={{ width: 90, fontSize: 11, color: "var(--ls-text-hint)", flexShrink: 0 }}>
            {formatDateLocal(tx.date)}
          </div>
          <div style={{ flex: 1, minWidth: 140 }}>
            <div style={{ fontSize: 13, fontWeight: 500, color: "var(--ls-text)" }}>{tx.productName}</div>
            <div style={{ fontSize: 10, color: "var(--ls-text-hint)" }}>
              {getPvTypeLabel(tx.type)} · Qté {tx.quantity}
            </div>
          </div>
          <div style={{ fontFamily: "Syne, sans-serif", fontSize: 14, fontWeight: 700, color: "var(--ls-gold)" }}>
            {tx.pv?.toFixed(2)} PV
          </div>
        </div>
      ))}
    </div>
  );
}
