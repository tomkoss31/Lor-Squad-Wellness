// =============================================================================
// GhostFicheCleanupTab — outil de tri des fiches fantômes (chantier « panier
// conso » 2026-07-10).
//
// Contexte : avant le répertoire « ventes comptoir », le mode « Client direct »
// du Panier créait une VRAIE fiche `clients` par vente au comptoir. Résultat :
// des fiches sans bilan, sans suivi, qui polluent /clients. Cet outil les
// LISTE (candidats) pour que l'admin les supprime/garde LUI-MÊME. Rien n'est
// supprimé automatiquement.
//
// Détection = empreinte exacte de recordQuickSale : AUCUN bilan + au moins un
// produit dont programId === 'custom'. (Nom de famille vide = signal bonus.)
// =============================================================================

import { useMemo, useState } from "react";
import { useAppContext } from "../../context/AppContext";
import { useToast } from "../../context/ToastContext";

const euro = (n: number) =>
  n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";

interface Candidate {
  id: string;
  name: string;
  distributorName: string;
  startDate: string | null;
  noLastName: boolean;
  products: string[];
  total: number;
}

export function GhostFicheCleanupTab() {
  const { clients, pvClientProducts, deleteClient } = useAppContext();
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
      // 1) Aucun bilan (fiche jamais passée par un vrai rendez-vous).
      if ((c.assessments?.length ?? 0) > 0) continue;
      const prods = productsByClient.get(c.id) ?? [];
      // 2) Empreinte recordQuickSale : au moins un produit programId 'custom'.
      const custom = prods.filter((p) => p.programId === "custom");
      if (custom.length === 0) continue;
      const total = custom.reduce(
        (a, p) => a + (Number(p.quantityStart) || 1) * (Number(p.pricePublicPerUnit) || 0),
        0,
      );
      out.push({
        id: c.id,
        name: `${c.firstName} ${c.lastName}`.trim() || "Client direct",
        distributorName: c.distributorName || "—",
        startDate: c.startDate ?? null,
        noLastName: !(c.lastName ?? "").trim(),
        products: custom.map((p) => `${p.productName}${p.quantityStart > 1 ? ` ×${p.quantityStart}` : ""}`),
        total,
      });
    }
    // Plus récentes d'abord (par date de départ).
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
    if (!window.confirm(`Supprimer définitivement ${selected.size} fiche${selected.size > 1 ? "s" : ""} ? Le dossier et ses lignes produits seront retirés. Action irréversible.`)) return;
    setWorking(true);
    let ok = 0;
    let fail = 0;
    for (const id of selected) {
      try {
        await deleteClient(id);
        ok += 1;
      } catch {
        fail += 1;
      }
    }
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
        Ces fiches ont été créées par une ancienne « vente rapide » : <strong style={{ color: "var(--ls-text)" }}>aucun bilan</strong>, produits enregistrés en direct. Désormais les ventes comptoir vont dans le <strong style={{ color: "var(--ls-text)" }}>répertoire</strong> sans créer de fiche. Vérifie chaque ligne puis supprime celles que tu ne veux pas garder — <strong style={{ color: "var(--ls-coral)" }}>rien n'est supprimé automatiquement</strong>.
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
                      <span style={{ fontSize: 10.5, color: "var(--ls-coral)", background: "color-mix(in srgb, var(--ls-coral) 12%, transparent)", borderRadius: 999, padding: "2px 7px", fontWeight: 600 }}>sans bilan</span>
                    </div>
                    <div style={{ marginTop: 5, fontSize: 12, color: "var(--ls-text-muted)", lineHeight: 1.45 }}>
                      {c.products.slice(0, 6).join(", ")}{c.products.length > 6 ? "…" : ""}
                    </div>
                  </div>
                  <div style={{ flex: "0 0 auto", fontFamily: "Syne, sans-serif", fontWeight: 700, fontSize: 14, color: "var(--ls-gold)" }}>{euro(c.total)}</div>
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
