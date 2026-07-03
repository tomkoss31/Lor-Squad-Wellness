// =============================================================================
// ProductDrilldownModal — Chantier Polish Analytics (2026-05-26).
// Modale drill-down d'un Top Produit Analytics : liste clients ayant la
// commande active + total PV + quantité totale.
// =============================================================================

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { getSupabaseClient } from "../../services/supabaseClient";

interface Props {
  productName: string;
  onClose: () => void;
}

interface ClientLine {
  client_id: string;
  client_name: string;
  quantity: number;
  pv_total: number;
  start_date: string | null;
}

export function ProductDrilldownModal({ productName, onClose }: Props) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lines, setLines] = useState<ClientLine[]>([]);
  // Tendance achats 6 mois (unités commandées par mois) — 2026-06-14.
  const [trend, setTrend] = useState<{ label: string; value: number }[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const sb = await getSupabaseClient();
        if (!sb) throw new Error("Service indisponible.");
        // Récupère toutes les commandes actives sur ce produit
        const { data, error: err } = await sb
          .from("pv_client_products")
          .select("client_id, quantity, pv_total, start_date, product_name, clients(first_name, last_name)")
          .eq("active", true)
          .eq("product_name", productName)
          .order("start_date", { ascending: false })
          .limit(200);
        if (err) throw err;
        if (cancelled) return;
        const rows = (data ?? []) as Array<{
          client_id: string;
          quantity: number;
          pv_total: number;
          start_date: string | null;
          clients?: { first_name?: string | null; last_name?: string | null } | null;
        }>;
        setLines(
          rows.map((r) => ({
            client_id: r.client_id,
            client_name:
              [r.clients?.first_name, r.clients?.last_name].filter(Boolean).join(" ").trim() ||
              "Client inconnu",
            quantity: r.quantity ?? 1,
            pv_total: r.pv_total ?? 0,
            start_date: r.start_date,
          })),
        );

        // Tendance 6 mois : unités commandées par mois (toutes commandes, pas
        // seulement actives) sur ce produit.
        const now = new Date();
        const buckets = Array.from({ length: 6 }, (_, i) => {
          const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
          return {
            key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
            label: d.toLocaleDateString("fr-FR", { month: "short" }).replace(".", ""),
            value: 0,
          };
        });
        const { data: trendData } = await sb
          .from("pv_client_products")
          .select("start_date, quantity")
          .eq("product_name", productName)
          .gte("start_date", `${buckets[0].key}-01`)
          .limit(2000);
        for (const tr of (trendData ?? []) as Array<{ start_date: string | null; quantity: number | null }>) {
          if (!tr.start_date) continue;
          const b = buckets.find((x) => x.key === tr.start_date!.slice(0, 7));
          if (b) b.value += tr.quantity ?? 1;
        }
        if (!cancelled) setTrend(buckets.map((b) => ({ label: b.label, value: b.value })));
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Erreur inconnue.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [productName]);

  const totals = useMemo(
    () => ({
      clients: lines.length,
      quantity: lines.reduce((s, l) => s + l.quantity, 0),
      pv: lines.reduce((s, l) => s + l.pv_total, 0),
    }),
    [lines],
  );

  return (
    <div role="dialog" aria-modal="true" style={overlay} onClick={onClose}>
      <div style={modal} onClick={(e) => e.stopPropagation()}>
        <button type="button" onClick={onClose} aria-label="Fermer" style={closeBtn}>
          ×
        </button>

        <h2 style={titleStyle}>
          <span style={{ fontSize: 22, marginRight: 6 }}>🏆</span>
          {productName}
        </h2>
        <p style={subtitleStyle}>Clients avec une commande active sur ce produit</p>

        {loading && <p style={{ color: "var(--ls-text-muted)", padding: 12 }}>Chargement…</p>}

        {error && (
          <p style={{ color: "var(--ls-coral)", padding: 12, background: "rgba(251,113,133,0.08)", borderRadius: 10 }}>
            ⚠️ {error}
          </p>
        )}

        {!loading && !error && (
          <>
            {/* Stats globales */}
            <div style={statsRow}>
              <Stat label="Clients" value={totals.clients} />
              <Stat label="Quantité totale" value={totals.quantity} />
              <Stat label="PV total" value={totals.pv} accent />
            </div>

            {/* Tendance achats 6 mois */}
            {trend.some((t) => t.value > 0) && (
              <div style={{ marginBottom: 18 }}>
                <div style={{ fontSize: 11, color: "var(--ls-text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 700, marginBottom: 10 }}>
                  Tendance achats · 6 mois
                </div>
                <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: 92, padding: "0 2px" }}>
                  {(() => {
                    const max = Math.max(...trend.map((x) => x.value), 1);
                    return trend.map((t, i) => {
                      const h = Math.round((t.value / max) * 60);
                      return (
                        <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                          <div style={{ fontSize: 11, fontWeight: 700, color: "var(--ls-text)", fontFamily: "Syne, sans-serif", minHeight: 14 }}>
                            {t.value > 0 ? t.value : ""}
                          </div>
                          <div
                            style={{
                              width: "100%",
                              maxWidth: 28,
                              height: Math.max(h, 3),
                              borderRadius: 6,
                              background: t.value > 0 ? "var(--ls-gold)" : "var(--ls-surface2)",
                              transition: "height 400ms ease",
                            }}
                          />
                          <div style={{ fontSize: 10, color: "var(--ls-text-muted)" }}>{t.label}</div>
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>
            )}

            {/* Liste */}
            {lines.length === 0 ? (
              <div style={emptyBox}>Aucun client n'a ce produit en commande active.</div>
            ) : (
              <div style={list}>
                {lines.map((l) => (
                  <div key={`${l.client_id}-${l.start_date ?? "x"}`} style={row}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, color: "var(--ls-text)", fontSize: 14 }}>{l.client_name}</div>
                      {l.start_date && (
                        <div style={{ fontSize: 11, color: "var(--ls-text-muted)" }}>
                          depuis {new Date(l.start_date).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" })}
                        </div>
                      )}
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 13, color: "var(--ls-text)" }}>
                        × {l.quantity}
                      </div>
                      <div style={{ fontSize: 12, color: "var(--ls-gold)", fontWeight: 600, fontFamily: "Syne, sans-serif" }}>
                        {l.pv_total} PV
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  return (
    <div style={statBox}>
      <div style={{ fontSize: 11, color: "var(--ls-text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 700 }}>
        {label}
      </div>
      <div
        style={{
          fontSize: 22,
          fontWeight: 800,
          fontFamily: "Syne, sans-serif",
          color: accent ? "var(--ls-gold)" : "var(--ls-text)",
          marginTop: 4,
        }}
      >
        {value}
      </div>
    </div>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────
const overlay: CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "color-mix(in srgb, var(--ls-bg) 80%, transparent)",
  backdropFilter: "blur(6px)",
  WebkitBackdropFilter: "blur(6px)",
  zIndex: 9999,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "20px 16px",
  overflowY: "auto",
};

const modal: CSSProperties = {
  position: "relative",
  width: "100%",
  maxWidth: 520,
  maxHeight: "calc(100dvh - 40px)",
  overflowY: "auto",
  background: "var(--ls-surface)",
  border: "0.5px solid var(--ls-border)",
  borderRadius: 18,
  padding: "24px 22px",
  boxShadow: "0 24px 72px color-mix(in srgb, var(--ls-text) 20%, transparent)",
};

const closeBtn: CSSProperties = {
  position: "absolute",
  top: 12,
  right: 14,
  width: 32,
  height: 32,
  borderRadius: 10,
  background: "transparent",
  border: "none",
  color: "var(--ls-text-muted)",
  fontSize: 24,
  cursor: "pointer",
  lineHeight: 1,
};

const titleStyle: CSSProperties = {
  margin: "0 30px 6px 0",
  fontFamily: "Syne, sans-serif",
  fontSize: 20,
  fontWeight: 800,
  color: "var(--ls-text)",
};

const subtitleStyle: CSSProperties = {
  margin: "0 0 18px",
  fontSize: 13,
  color: "var(--ls-text-muted)",
};

const statsRow: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(3, 1fr)",
  gap: 10,
  marginBottom: 18,
};

const statBox: CSSProperties = {
  background: "var(--ls-surface2)",
  border: "0.5px solid var(--ls-border)",
  borderRadius: 12,
  padding: "10px 12px",
};

const list: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 8,
};

const row: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 12,
  padding: "10px 12px",
  background: "var(--ls-surface2)",
  border: "0.5px solid var(--ls-border)",
  borderRadius: 10,
};

const emptyBox: CSSProperties = {
  padding: 24,
  textAlign: "center",
  color: "var(--ls-text-muted)",
  fontSize: 13,
  fontStyle: "italic",
  background: "var(--ls-surface2)",
  borderRadius: 12,
  border: "1px dashed var(--ls-border)",
};
