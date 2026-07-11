// =============================================================================
// GhostFicheCleanupTab — tri des fiches fantômes issues de l'ancien « panier /
// client direct » (chantier panier conso 2026-07-10, MAJ migration 2026-07-11).
//
// AVANT : le mode « Client direct » du Panier créait une VRAIE fiche `clients`
// par vente comptoir → fiches sans bilan qui polluent /clients.
//
// Les ventes de ces fiches ont été MIGRÉES vers « Ventes comptoir »
// (consumption_orders) → la rentabilité est préservée. Il reste à supprimer les
// fiches (désormais vides). La suppression passe par la RPC
// migrate_and_delete_ghost_client : si une fiche a encore des produits (non
// migrée), elle les bascule en vente comptoir AVANT de supprimer → zéro perte.
//
// Détection = empreinte de recordQuickSale : AUCUN bilan + nom de famille vide.
// =============================================================================

import { useMemo, useState } from "react";
import { useAppContext } from "../../context/AppContext";
import { useToast } from "../../context/ToastContext";
import { getSupabaseClient } from "../../services/supabaseClient";

const euro = (n: number) =>
  n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";

interface Candidate {
  id: string;
  name: string;
  distributorName: string;
  startDate: string | null;
  products: string[];
  total: number;
  migrated: boolean; // true = déjà basculée en Ventes comptoir (fiche vide)
}

export function GhostFicheCleanupTab() {
  const { clients, pvClientProducts, reloadClients } = useAppContext();
  const { push } = useToast();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [working, setWorking] = useState(false);

  const candidates = useMemo<Candidate[]>(() => {
    const productsByClient = new Map<string, typeof pvClientProducts>();
    for (const p of pvClientProducts) {
      const arr = productsByClient.get(p.clientId) ?? [];
      arr.push(p);
      productsByClient.set(p.clientId, arr);
    }
    const out: Candidate[] = [];
    for (const c of clients) {
      // 1) Aucun bilan + 2) nom de famille vide = signature exacte d'une vente
      // rapide (recordQuickSale). On ne touche jamais aux vraies fiches.
      if ((c.assessments?.length ?? 0) > 0) continue;
      if ((c.lastName ?? "").trim() !== "") continue;
      const custom = (productsByClient.get(c.id) ?? []).filter((p) => p.programId === "custom");
      const total = custom.reduce(
        (a, p) => a + (Number(p.quantityStart) || 1) * (Number(p.pricePublicPerUnit) || 0),
        0,
      );
      out.push({
        id: c.id,
        name: `${c.firstName} ${c.lastName}`.trim() || "Client direct",
        distributorName: c.distributorName || "—",
        startDate: c.startDate ?? null,
        products: custom.map((p) => `${p.productName}${p.quantityStart > 1 ? ` ×${p.quantityStart}` : ""}`),
        total,
        migrated: custom.length === 0, // fiche déjà vidée → vente déjà dans le répertoire
      });
    }
    return out.sort((a, b) => (b.startDate ?? "").localeCompare(a.startDate ?? ""));
  }, [clients, pvClientProducts]);

  const allSelected = candidates.length > 0 && selected.size === candidates.length;

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }
  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(candidates.map((c) => c.id)));
  }

  async function deleteSelected() {
    if (working || selected.size === 0) return;
    if (!window.confirm(`Supprimer ${selected.size} fiche${selected.size > 1 ? "s" : ""} ? Les ventes restent dans « Ventes comptoir ». Action irréversible pour la fiche.`)) return;
    setWorking(true);
    const sb = await getSupabaseClient();
    let ok = 0;
    let fail = 0;
    if (sb) {
      for (const id of selected) {
        // RPC : migre tout produit restant en vente comptoir PUIS supprime.
        const { error } = await sb.rpc("migrate_and_delete_ghost_client", { p_client_id: id });
        if (error) fail += 1;
        else ok += 1;
      }
    } else {
      fail = selected.size;
    }
    await reloadClients();
    setSelected(new Set());
    setWorking(false);
    push({
      tone: fail === 0 ? "success" : "error",
      title: fail === 0 ? `${ok} fiche${ok > 1 ? "s" : ""} supprimée${ok > 1 ? "s" : ""}` : `${ok} supprimée(s), ${fail} en échec`,
    });
  }

  return (
    <div style={{ maxWidth: 760 }}>
      <div style={{ fontFamily: "Syne, sans-serif", fontWeight: 700, fontSize: 16, color: "var(--ls-text)", marginBottom: 6 }}>
        🧹 Fiches issues d'une vente comptoir
      </div>
      <p style={{ margin: "0 0 14px", fontSize: 13.5, color: "var(--ls-text-muted)", lineHeight: 1.55, fontFamily: "DM Sans, sans-serif" }}>
        Ces fiches ont été créées par l'ancienne « vente rapide » : <strong style={{ color: "var(--ls-text)" }}>aucun bilan</strong>. Leurs ventes ont été <strong style={{ color: "var(--ls-teal)" }}>basculées dans « Ventes comptoir »</strong> — ta rentabilité est préservée. Il ne reste qu'à supprimer les fiches vides. <strong style={{ color: "var(--ls-text)" }}>Rien n'est perdu</strong> : si une fiche a encore des produits, ils sont d'abord rebasculés en vente comptoir avant suppression.
      </p>

      {candidates.length === 0 ? (
        <div style={{ padding: "28px 16px", textAlign: "center", background: "var(--ls-surface)", border: "1px dashed var(--ls-border)", borderRadius: 14, color: "var(--ls-text-muted)", fontSize: 14 }}>
          ✅ Aucune fiche fantôme détectée. Rien à nettoyer.
        </div>
      ) : (
        <>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 10, flexWrap: "wrap" }}>
            <label style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--ls-text)", cursor: "pointer", fontFamily: "DM Sans, sans-serif" }}>
              <input type="checkbox" checked={allSelected} onChange={toggleAll} />
              Tout sélectionner ({candidates.length})
            </label>
            <button
              type="button"
              onClick={() => void deleteSelected()}
              disabled={working || selected.size === 0}
              style={{ padding: "8px 14px", borderRadius: 10, border: "none", cursor: working || selected.size === 0 ? "not-allowed" : "pointer", fontSize: 13, fontWeight: 700, fontFamily: "DM Sans, sans-serif", background: selected.size === 0 ? "var(--ls-surface2)" : "var(--ls-coral)", color: selected.size === 0 ? "var(--ls-text-muted)" : "#fff", opacity: working ? 0.6 : 1 }}
            >
              {working ? "Suppression…" : `🗑 Supprimer la sélection (${selected.size})`}
            </button>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {candidates.map((c) => {
              const on = selected.has(c.id);
              return (
                <div key={c.id} style={{ display: "flex", alignItems: "flex-start", gap: 11, background: "var(--ls-surface)", border: `1px solid ${on ? "color-mix(in srgb, var(--ls-coral) 45%, transparent)" : "var(--ls-border)"}`, borderRadius: 12, padding: "11px 13px" }}>
                  <input type="checkbox" checked={on} onChange={() => toggle(c.id)} style={{ marginTop: 3 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <span style={{ fontWeight: 700, fontSize: 14, color: "var(--ls-text)", fontFamily: "DM Sans, sans-serif" }}>{c.name}</span>
                      <span style={{ fontSize: 11, color: "var(--ls-text-hint)" }}>· {c.distributorName}</span>
                      {c.startDate ? <span style={{ fontSize: 11, color: "var(--ls-text-hint)" }}>· {c.startDate}</span> : null}
                      {c.migrated ? (
                        <span style={{ fontSize: 10.5, color: "var(--ls-teal)", background: "color-mix(in srgb, var(--ls-teal) 12%, transparent)", borderRadius: 999, padding: "2px 7px", fontWeight: 600 }}>✓ déjà en Ventes comptoir</span>
                      ) : (
                        <span style={{ fontSize: 10.5, color: "var(--ls-gold)", background: "color-mix(in srgb, var(--ls-gold) 14%, transparent)", borderRadius: 999, padding: "2px 7px", fontWeight: 600 }}>à basculer ({euro(c.total)})</span>
                      )}
                    </div>
                    {c.products.length > 0 ? (
                      <div style={{ marginTop: 5, fontSize: 12, color: "var(--ls-text-muted)", lineHeight: 1.45 }}>
                        {c.products.slice(0, 6).join(", ")}{c.products.length > 6 ? "…" : ""}
                      </div>
                    ) : (
                      <div style={{ marginTop: 5, fontSize: 12, color: "var(--ls-text-hint)", fontStyle: "italic" }}>Fiche vide — vente déjà enregistrée dans le répertoire.</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

export default GhostFicheCleanupTab;
