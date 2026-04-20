import { useEffect, useState } from "react";
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
function InlineOrderForm({ record, onClose }: { record: PvClientTrackingRecord; onClose: () => void }) {
  const { addPvTransaction } = useAppContext();
  const initialProduct = pvProductCatalog.find((p) => p.active) ?? pvProductCatalog[0];
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [productId, setProductId] = useState(initialProduct?.id ?? "");
  const [quantity, setQuantity] = useState("1");
  const [type, setType] = useState<PvTransactionType>("commande");
  const [pv, setPv] = useState(initialProduct ? String(initialProduct.pv) : "0");
  const [price, setPrice] = useState(initialProduct ? String(initialProduct.pricePublic) : "0");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    const p = pvProductCatalog.find((x) => x.id === productId);
    if (p) {
      setPv(String(p.pv));
      setPrice(String(p.pricePublic));
    }
  }, [productId]);

  const totalPv = Number((Number(pv || 0) * Number(quantity || 0)).toFixed(2));
  const totalPrice = Number((Number(price || 0) * Number(quantity || 0)).toFixed(2));

  async function handleSubmit() {
    const qty = Number(quantity);
    if (!qty || qty <= 0) {
      setError("La quantité doit être supérieure à 0.");
      return;
    }
    const selectedProduct = pvProductCatalog.find((p) => p.id === productId);
    if (!selectedProduct) {
      setError("Produit introuvable.");
      return;
    }

    setError("");
    setSubmitting(true);
    try {
      const tx: PvClientTransaction = {
        id: `local-${Date.now()}`,
        date,
        clientId: record.clientId,
        clientName: record.clientName,
        responsibleId: record.responsibleId,
        responsibleName: record.responsibleName,
        productId: selectedProduct.id,
        productName: selectedProduct.name,
        quantity: qty,
        pv: totalPv,
        price: totalPrice,
        type,
        note: type === "commande" ? "Commande ajoutée depuis la fiche client" : "Reprise sur place ajoutée depuis la fiche client",
      };
      await addPvTransaction(tx);
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
          Nouvelle commande
        </div>
        <button
          onClick={onClose}
          style={{ background: "transparent", border: "none", color: "var(--ls-text-hint)", fontSize: 22, cursor: "pointer", padding: 0, lineHeight: 1 }}
          aria-label="Fermer"
        >
          ×
        </button>
      </div>

      <div className="pv-form-grid" style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10, marginBottom: 10 }}>
        <FormField label="Date">
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={inputStyle} />
        </FormField>
        <FormField label="Type">
          <select value={type} onChange={(e) => setType(e.target.value as PvTransactionType)} style={inputStyle}>
            <option value="commande">Commande</option>
            <option value="reprise-sur-place">Reprise sur place</option>
          </select>
        </FormField>
        <FormField label="Produit">
          <select value={productId} onChange={(e) => setProductId(e.target.value)} style={inputStyle}>
            {pvProductCatalog.filter((p) => p.active).map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </FormField>
        <FormField label="Quantité">
          <input type="number" min="1" value={quantity} onChange={(e) => setQuantity(e.target.value)} style={inputStyle} />
        </FormField>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10, marginBottom: 14, padding: 10, background: "var(--ls-surface)", borderRadius: 9 }}>
        <div style={{ fontSize: 11, color: "var(--ls-text-hint)" }}>
          PV total : <strong style={{ color: "var(--ls-gold)", fontSize: 13 }}>{totalPv.toFixed(2)} PV</strong>
        </div>
        <div style={{ fontSize: 11, color: "var(--ls-text-hint)" }}>
          Prix : <strong style={{ color: "var(--ls-text)", fontSize: 13 }}>{totalPrice.toFixed(2)} €</strong>
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
