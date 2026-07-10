// =============================================================================
// VentesComptoirPage — répertoire des ventes comptoir (chantier « panier conso »
// 2026-07-10).
//
// Remplace l'ancien « Client direct » qui créait une fiche fantôme. Ici : un
// simple DOSSIER daté, filtrable par MOIS, des commandes prises au comptoir,
// SANS fiche client. Totaux CA + PV du mois. Suppression possible.
//
// Source : consumption_orders (RLS : les siennes, ou toutes si admin) via
// listConsumptionOrders / deleteConsumptionOrder. Tokens var(--ls-*) → suit le
// thème clair/sombre de l'app.
// =============================================================================

import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAppContext } from "../context/AppContext";
import { useToast } from "../context/ToastContext";
import {
  listConsumptionOrders,
  deleteConsumptionOrder,
  type ConsumptionOrder,
} from "../services/supabaseService";

const euro = (n: number) =>
  n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";
const pvf = (n: number) => n.toLocaleString("fr-FR", { maximumFractionDigits: 1 });

// Liste des 12 derniers mois (YYYY-MM) pour le sélecteur.
function recentMonths(count = 12): { iso: string; label: string }[] {
  const out: { iso: string; label: string }[] = [];
  const base = new Date();
  for (let i = 0; i < count; i += 1) {
    const d = new Date(base.getFullYear(), base.getMonth() - i, 1);
    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = d.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
    out.push({ iso, label: label.charAt(0).toUpperCase() + label.slice(1) });
  }
  return out;
}

function fmtDate(iso: string): string {
  try {
    return new Date(`${iso}T12:00:00`).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
  } catch {
    return iso;
  }
}

export function VentesComptoirPage() {
  const { currentUser } = useAppContext();
  const { push } = useToast();
  const navigate = useNavigate();

  const isAdmin = currentUser?.role === "admin";
  const months = useMemo(() => recentMonths(12), []);
  const [monthIso, setMonthIso] = useState(months[0]?.iso ?? "");
  const [scopeAll, setScopeAll] = useState(false); // admin : toutes les ventes de l'équipe
  const [orders, setOrders] = useState<ConsumptionOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!currentUser) return;
    setLoading(true);
    try {
      const rows = await listConsumptionOrders({
        distributorId: isAdmin && scopeAll ? null : currentUser.id,
        monthIso,
      });
      setOrders(rows);
    } catch (e) {
      push({ tone: "error", title: "Chargement impossible", message: e instanceof Error ? e.message : "Réessaie." });
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, [currentUser, isAdmin, scopeAll, monthIso, push]);

  useEffect(() => {
    void load();
  }, [load]);

  const totals = useMemo(() => {
    return orders.reduce(
      (a, o) => {
        a.price += o.totalPrice;
        a.pv += o.totalPv;
        a.count += 1;
        return a;
      },
      { price: 0, pv: 0, count: 0 },
    );
  }, [orders]);

  async function handleDelete(o: ConsumptionOrder) {
    if (deletingId) return;
    const who = o.customerLabel ? ` (${o.customerLabel})` : "";
    if (!window.confirm(`Supprimer cette vente comptoir du ${fmtDate(o.saleDate)}${who} ? Cette action est définitive.`)) return;
    setDeletingId(o.id);
    try {
      await deleteConsumptionOrder(o.id);
      setOrders((prev) => prev.filter((x) => x.id !== o.id));
      push({ tone: "success", title: "Vente supprimée" });
    } catch (e) {
      push({ tone: "error", title: "Suppression impossible", message: e instanceof Error ? e.message : "Réessaie." });
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "4px 4px 90px" }}>
      {/* Hero */}
      <div style={{ fontFamily: "Syne, sans-serif", fontSize: 11, fontWeight: 700, letterSpacing: 2.4, textTransform: "uppercase", color: "var(--ls-text-muted)" }}>
        La Base 360 · Répertoire
      </div>
      <h1 style={{ fontFamily: "Syne, sans-serif", fontWeight: 800, fontSize: "clamp(26px, 5vw, 40px)", lineHeight: 1.04, letterSpacing: "-1.2px", margin: "6px 0 0", color: "var(--ls-text)" }}>
        Ventes <span style={{ color: "var(--ls-teal)" }}>comptoir</span>
      </h1>
      <p style={{ margin: "8px 0 22px", color: "var(--ls-text-muted)", fontSize: 14.5, maxWidth: 560, fontFamily: "DM Sans, sans-serif", lineHeight: 1.5 }}>
        Les commandes prises au comptoir, classées par mois — <strong style={{ color: "var(--ls-text)" }}>sans créer de fiche client</strong>. Le total du mois remonte dans ta rentabilité.
      </p>

      {/* Barre : mois + scope admin + CTA nouvelle vente */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center", marginBottom: 18 }}>
        <div style={{ position: "relative" }}>
          <select
            value={monthIso}
            onChange={(e) => setMonthIso(e.target.value)}
            aria-label="Filtrer par mois"
            style={{ appearance: "none", WebkitAppearance: "none", MozAppearance: "none", padding: "10px 36px 10px 14px", borderRadius: 12, border: "1px solid var(--ls-border)", background: "var(--ls-input-bg)", color: "var(--ls-text)", fontSize: 14, fontWeight: 600, fontFamily: "DM Sans, sans-serif", outline: "none", cursor: "pointer" }}
          >
            {months.map((m) => (
              <option key={m.iso} value={m.iso}>📅 {m.label}</option>
            ))}
          </select>
          <span aria-hidden="true" style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", color: "var(--ls-text-muted)", fontSize: 11, pointerEvents: "none" }}>▾</span>
        </div>

        {isAdmin && (
          <button
            type="button"
            onClick={() => setScopeAll((v) => !v)}
            style={{ padding: "9px 14px", borderRadius: 12, fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "DM Sans, sans-serif", border: scopeAll ? "1px solid transparent" : "1px solid var(--ls-border)", background: scopeAll ? "var(--ls-purple)" : "var(--ls-surface)", color: scopeAll ? "#fff" : "var(--ls-text-muted)" }}
          >
            {scopeAll ? "👥 Toute l'équipe" : "👤 Mes ventes"}
          </button>
        )}

        <div style={{ flex: 1 }} />

        <button
          type="button"
          onClick={() => navigate("/panier")}
          className="panier-cta"
          style={{ padding: "10px 16px", borderRadius: 12, border: "none", background: "var(--ls-teal)", color: "#fff", fontSize: 13.5, fontWeight: 700, cursor: "pointer", fontFamily: "DM Sans, sans-serif" }}
        >
          ＋ Nouvelle vente
        </button>
      </div>

      {/* Totaux du mois */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12, marginBottom: 20 }}>
        <StatBox label="Chiffre d'affaires" value={euro(totals.price)} accent="var(--ls-gold)" />
        <StatBox label="PV du mois" value={pvf(totals.pv)} accent="var(--ls-teal)" />
        <StatBox label="Commandes" value={String(totals.count)} accent="var(--ls-purple)" />
      </div>

      {/* Liste */}
      {loading ? (
        <div style={{ padding: "40px 0", textAlign: "center", color: "var(--ls-text-muted)", fontFamily: "DM Sans, sans-serif", fontSize: 14 }}>
          Chargement…
        </div>
      ) : orders.length === 0 ? (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: 10, padding: "44px 16px", background: "var(--ls-surface)", border: "1px dashed var(--ls-border)", borderRadius: 18 }}>
          <div style={{ fontSize: 30 }}>🏪</div>
          <div style={{ fontFamily: "Syne, sans-serif", fontWeight: 700, fontSize: 16, color: "var(--ls-text)" }}>Aucune vente ce mois-ci</div>
          <div style={{ color: "var(--ls-text-muted)", fontSize: 13.5, maxWidth: 320, lineHeight: 1.5 }}>
            Compose un panier et choisis « 🏪 Vente comptoir » pour l'enregistrer ici, sans créer de fiche.
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {orders.map((o) => (
            <div key={o.id} style={{ background: "var(--ls-surface)", border: "1px solid var(--ls-border)", borderRadius: 16, padding: "14px 16px" }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                {/* Date pastille */}
                <div style={{ flex: "0 0 auto", width: 46, textAlign: "center" }}>
                  <div style={{ fontFamily: "Syne, sans-serif", fontWeight: 800, fontSize: 15, color: "var(--ls-teal)", lineHeight: 1 }}>{fmtDate(o.saleDate).split(" ")[0]}</div>
                  <div style={{ fontSize: 10.5, color: "var(--ls-text-hint)", textTransform: "uppercase", letterSpacing: 0.5 }}>{fmtDate(o.saleDate).split(" ")[1] ?? ""}</div>
                </div>
                {/* Contenu */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <span style={{ fontFamily: "Syne, sans-serif", fontWeight: 700, fontSize: 14.5, color: "var(--ls-text)" }}>
                      {o.customerLabel || "Vente comptoir"}
                    </span>
                    {isAdmin && scopeAll && o.distributorName ? (
                      <span style={{ fontSize: 11, color: "var(--ls-text-hint)" }}>· {o.distributorName}</span>
                    ) : null}
                  </div>
                  <div style={{ marginTop: 6, display: "flex", flexWrap: "wrap", gap: 5 }}>
                    {o.lines.map((l, i) => (
                      <span key={i} style={{ fontSize: 12, color: "var(--ls-text-muted)", background: "var(--ls-surface2)", border: "1px solid var(--ls-border)", borderRadius: 999, padding: "3px 9px" }}>
                        {l.name}{l.quantity > 1 ? ` ×${l.quantity}` : ""}
                      </span>
                    ))}
                  </div>
                </div>
                {/* Totaux + suppr */}
                <div style={{ flex: "0 0 auto", textAlign: "right" }}>
                  <div style={{ fontFamily: "Syne, sans-serif", fontWeight: 800, fontSize: 16, color: "var(--ls-gold)" }}>{euro(o.totalPrice)}</div>
                  <div style={{ fontSize: 11.5, color: "var(--ls-teal)", fontWeight: 600 }}>{pvf(o.totalPv)} PV</div>
                  <button
                    type="button"
                    onClick={() => void handleDelete(o)}
                    disabled={deletingId === o.id}
                    aria-label="Supprimer cette vente"
                    style={{ marginTop: 6, background: "none", border: "none", color: "var(--ls-text-hint)", fontSize: 12, fontWeight: 600, cursor: deletingId === o.id ? "wait" : "pointer", padding: 0 }}
                  >
                    {deletingId === o.id ? "…" : "🗑 Supprimer"}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function StatBox({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div style={{ background: "var(--ls-surface)", border: "1px solid var(--ls-border)", borderRadius: 14, padding: "14px 16px", position: "relative", overflow: "hidden" }}>
      <span aria-hidden="true" style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 3, background: accent }} />
      <div style={{ fontSize: 12, color: "var(--ls-text-muted)", fontFamily: "DM Sans, sans-serif" }}>{label}</div>
      <div style={{ fontFamily: "Syne, sans-serif", fontWeight: 800, fontSize: 22, color: "var(--ls-text)", marginTop: 4 }}>{value}</div>
    </div>
  );
}

export default VentesComptoirPage;
