// =============================================================================
// QuickSaleEditModal — édition d'une vente depuis Rentabilité → Analyse détaillée
// (chantier 2026-06-15, demande Thomas/Victoria).
//
// Ouvert via le crayon ✏️ sur un client du mois en cours. Permet de :
//   - corriger le nom du client (ex : nom oublié à la saisie du panier),
//   - ajuster les quantités, ajouter / retirer des produits,
//   - voir le total.
// Sauvegarde via updateQuickSale (réconciliation client + pv_client_products).
//
// Les produits actuels viennent d'AppContext.pvClientProducts (pas de fetch
// direct). Le catalogue d'ajout = pvProductCatalog. Tokens var(--ls-*).
// =============================================================================

import { useMemo, useState } from "react";
import { useAppContext } from "../../context/AppContext";
import { useToast } from "../../context/ToastContext";
import { pvProductCatalog } from "../../data/pvCatalog";
import { updateQuickSale } from "../../services/supabaseService";

interface Line {
  id: string;
  name: string;
  price: number;
  pv: number;
  qty: number;
}

const euro = (n: number) =>
  n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";
const pvf = (n: number) => n.toLocaleString("fr-FR", { maximumFractionDigits: 2 });

// Facteur VIP (= ce que le client paie). Mêmes valeurs que la RPC rentabilité.
const VIP_FACTOR: Record<string, number> = {
  ambassador: 0.5835,
  gold: 0.636,
  silver: 0.7189,
  bronze: 0.8018,
};
const VIP_LABEL: Record<string, string> = {
  ambassador: "Ambassadeur",
  gold: "Gold",
  silver: "Silver",
  bronze: "Bronze",
};

export function QuickSaleEditModal({
  clientId,
  initialName,
  monthKey,
  onClose,
  onSaved,
}: {
  clientId: string;
  initialName: string;
  /** YYYY-MM : ne montre que les produits de ce mois (cohérent avec la liste). */
  monthKey?: string;
  onClose: () => void;
  onSaved?: () => void;
}) {
  const { currentUser, clients, pvClientProducts, reloadClients } = useAppContext();
  const { push } = useToast();

  // Statut VIP du client → remise appliquée (affichage du prix réellement payé).
  const vipStatus = clients.find((c) => c.id === clientId)?.vipStatus ?? "none";
  const vipFactor = VIP_FACTOR[vipStatus] ?? 1;
  const isVip = vipFactor < 1;

  const [name, setName] = useState(initialName === "Client direct" ? "" : initialName);
  const [query, setQuery] = useState("");
  const [saving, setSaving] = useState(false);

  // Lignes initiales depuis les produits actifs de ce client.
  const [lines, setLines] = useState<Record<string, Line>>(() => {
    const map: Record<string, Line> = {};
    for (const p of pvClientProducts) {
      if (p.clientId !== clientId || !p.active) continue;
      // Cohérent avec la liste rentabilité : on n'édite que le mois courant.
      if (monthKey && (p.startDate ?? "").slice(0, 7) !== monthKey) continue;
      map[p.productId] = {
        id: p.productId,
        name: p.productName,
        price: Number(p.pricePublicPerUnit) || 0,
        pv: Number(p.pvPerUnit) || 0,
        qty: Number(p.quantityStart) || 1,
      };
    }
    return map;
  });

  const lineList = useMemo(() => Object.values(lines), [lines]);
  const total = lineList.reduce((a, l) => a + l.price * l.qty, 0);
  const totalPv = lineList.reduce((a, l) => a + l.pv * l.qty, 0);

  const catalogResults = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return pvProductCatalog
      .filter((p) => p.active && p.pricePublic > 0 && p.name.toLowerCase().includes(q) && !lines[p.id])
      .slice(0, 6);
  }, [query, lines]);

  const setQty = (id: string, delta: number) =>
    setLines((prev) => {
      const l = prev[id];
      if (!l) return prev;
      const qty = l.qty + delta;
      if (qty <= 0) {
        const next = { ...prev };
        delete next[id];
        return next;
      }
      return { ...prev, [id]: { ...l, qty } };
    });

  const removeLine = (id: string) =>
    setLines((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });

  const addProduct = (p: { id: string; name: string; pricePublic: number; pv: number }) => {
    setLines((prev) => ({
      ...prev,
      [p.id]: { id: p.id, name: p.name, price: p.pricePublic, pv: p.pv, qty: 1 },
    }));
    setQuery("");
  };

  async function save() {
    if (!currentUser || saving) return;
    setSaving(true);
    try {
      await updateQuickSale({
        clientId,
        clientName: name,
        distributorId: currentUser.id,
        distributorName: currentUser.name,
        lines: lineList.map((l) => ({ id: l.id, name: l.name, price: l.price, pv: l.pv, quantity: l.qty })),
      });
      await reloadClients();
      push({ tone: "success", title: "Vente modifiée", message: "Ta rentabilité est à jour." });
      onSaved?.();
      onClose();
    } catch (e) {
      push({ tone: "error", title: "Erreur", message: e instanceof Error ? e.message : "Réessaie." });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 10010,
        background: "rgba(0,0,0,0.55)",
        backdropFilter: "blur(6px)",
        WebkitBackdropFilter: "blur(6px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: 460,
          maxHeight: "calc(100dvh - 32px)",
          overflowY: "auto",
          background: "var(--ls-surface)",
          border: "1px solid var(--ls-border)",
          borderRadius: 18,
          padding: 20,
          fontFamily: "DM Sans, sans-serif",
          boxShadow: "0 20px 60px rgba(0,0,0,0.4)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <span style={{ fontFamily: "Syne, sans-serif", fontWeight: 700, fontSize: 17, color: "var(--ls-text)" }}>
            ✏️ Modifier la vente
          </span>
          <button type="button" onClick={onClose} aria-label="Fermer" style={{ border: "none", background: "transparent", fontSize: 20, color: "var(--ls-text-muted)", cursor: "pointer", lineHeight: 1 }}>×</button>
        </div>

        {/* Nom */}
        <label style={{ display: "block", marginBottom: 14 }}>
          <span style={{ display: "block", fontSize: 11.5, fontWeight: 600, color: "var(--ls-text-muted)", marginBottom: 5 }}>Nom du client</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex : Tom Aubert"
            style={inputStyle}
          />
        </label>

        {/* Produits */}
        <div style={{ fontSize: 11.5, fontWeight: 600, color: "var(--ls-text-muted)", marginBottom: 8 }}>Produits</div>
        {lineList.length === 0 ? (
          <div style={{ fontSize: 13, color: "var(--ls-text-hint)", fontStyle: "italic", padding: "10px 0" }}>
            Aucun produit — ajoutes-en un ci-dessous.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {lineList.map((l) => (
              <div key={l.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 11px", background: "var(--ls-surface2)", border: "1px solid var(--ls-border)", borderRadius: 12 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 600, color: "var(--ls-text)", lineHeight: 1.25 }}>{l.name}</div>
                  <div style={{ fontSize: 11.5, color: "var(--ls-teal)", marginTop: 2 }}>{euro(l.price)} · {l.pv} PV</div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <button type="button" onClick={() => setQty(l.id, -1)} aria-label="Moins" style={stepBtn}>−</button>
                  <span style={{ minWidth: 18, textAlign: "center", fontFamily: "Syne, sans-serif", fontWeight: 700, fontSize: 14, color: "var(--ls-text)" }}>{l.qty}</span>
                  <button type="button" onClick={() => setQty(l.id, 1)} aria-label="Plus" style={stepBtn}>＋</button>
                </div>
                <button type="button" onClick={() => removeLine(l.id)} aria-label="Retirer" style={{ border: "none", background: "transparent", color: "var(--ls-text-hint)", fontSize: 15, cursor: "pointer" }}>✕</button>
              </div>
            ))}
          </div>
        )}

        {/* Ajout produit */}
        <div style={{ marginTop: 12, position: "relative" }}>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="+ Ajouter un produit…"
            style={inputStyle}
          />
          {catalogResults.length > 0 ? (
            <div style={{ marginTop: 6, display: "flex", flexDirection: "column", gap: 4, border: "1px solid var(--ls-border)", borderRadius: 12, overflow: "hidden", background: "var(--ls-surface)" }}>
              {catalogResults.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => addProduct({ id: p.id, name: p.name, pricePublic: p.pricePublic, pv: p.pv })}
                  style={{ display: "flex", justifyContent: "space-between", gap: 10, padding: "9px 12px", border: "none", background: "transparent", cursor: "pointer", textAlign: "left", fontSize: 13, color: "var(--ls-text)" }}
                >
                  <span style={{ flex: 1, minWidth: 0 }}>{p.name}</span>
                  <span style={{ color: "var(--ls-gold)", fontWeight: 700 }}>{euro(p.pricePublic)}</span>
                </button>
              ))}
            </div>
          ) : null}
        </div>

        {/* Total */}
        <div style={{ marginTop: 16, paddingTop: 14, borderTop: "1px solid var(--ls-border)" }}>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
            <span style={{ fontSize: 13, color: "var(--ls-text-muted)" }}>
              Total catalogue <span style={{ color: "var(--ls-text-hint)" }}>({pvf(totalPv)} PV)</span>
            </span>
            <span style={{ fontFamily: "Syne, sans-serif", fontWeight: 800, fontSize: 24, color: "var(--ls-gold)" }}>{euro(total)}</span>
          </div>
          {isVip ? (
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginTop: 6 }}>
              <span style={{ fontSize: 12, color: "var(--ls-teal)", fontWeight: 600 }}>
                👑 Prix VIP {VIP_LABEL[vipStatus] ?? ""} (−{Math.round((1 - vipFactor) * 100)} %)
              </span>
              <span style={{ fontFamily: "Syne, sans-serif", fontWeight: 700, fontSize: 16, color: "var(--ls-teal)" }}>
                {euro(total * vipFactor)}
              </span>
            </div>
          ) : null}
        </div>

        {/* Actions */}
        <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
          <button
            type="button"
            onClick={() => void save()}
            disabled={saving}
            style={{ flex: 1, padding: 13, borderRadius: 13, border: "none", background: "var(--ls-gold)", color: "#1a1407", fontFamily: "Syne, sans-serif", fontWeight: 800, fontSize: 14, cursor: saving ? "wait" : "pointer", opacity: saving ? 0.65 : 1 }}
          >
            {saving ? "Enregistrement…" : "Enregistrer"}
          </button>
          <button type="button" onClick={onClose} style={{ padding: "13px 16px", borderRadius: 13, border: "1px solid var(--ls-border)", background: "transparent", color: "var(--ls-text-muted)", fontWeight: 600, fontSize: 13, cursor: "pointer" }}>
            Annuler
          </button>
        </div>
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  padding: "10px 12px",
  borderRadius: 12,
  border: "1px solid var(--ls-border)",
  background: "var(--ls-input-bg)",
  color: "var(--ls-text)",
  fontSize: 14,
  fontFamily: "DM Sans, sans-serif",
  outline: "none",
};

const stepBtn: React.CSSProperties = {
  width: 30,
  height: 28,
  borderRadius: 8,
  border: "1px solid var(--ls-border)",
  background: "var(--ls-surface)",
  color: "var(--ls-text)",
  fontSize: 16,
  lineHeight: 1,
  cursor: "pointer",
};
