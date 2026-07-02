// =============================================================================
// NoalyUsageCard — conso Noaly (2026-06-15, enrichi 2026-07-02).
//
// Affiche la conso IA depuis `ai_usage_log`. Enrichissement (demande Thomas) :
//   - toggle « Ce mois » / « Année » (conso annuelle),
//   - en mode Année : évolution mois par mois (mini-barres),
//   - pour l'admin : répartition par membre de l'équipe sur la période.
// RLS : admin = tout, chacun = sa conso.
// =============================================================================

import { useEffect, useMemo, useState } from "react";
import { useAppContext } from "../../context/AppContext";
import { getSupabaseClient } from "../../services/supabaseClient";
import { JargonTip } from "../ui/JargonTip";

interface Row {
  user_id: string | null;
  input_tokens: number | null;
  output_tokens: number | null;
  cost_eur: number | null;
  created_at: string;
}

type Period = "month" | "year";

export function NoalyUsageCard() {
  const { currentUser, users } = useAppContext();
  const isAdmin = currentUser?.role === "admin";
  const [period, setPeriod] = useState<Period>("month");
  const [rows, setRows] = useState<Row[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      const sb = await getSupabaseClient();
      if (!sb || !currentUser?.id) { setLoading(false); return; }
      const now = new Date();
      const start =
        period === "month"
          ? new Date(now.getFullYear(), now.getMonth(), 1)
          : new Date(now.getFullYear(), now.getMonth() - 11, 1); // 12 mois glissants
      let q = sb
        .from("ai_usage_log")
        .select("user_id, input_tokens, output_tokens, cost_eur, created_at")
        .gte("created_at", start.toISOString());
      // Non-admin : ne voit que sa propre conso (la RLS le forcerait de toute
      // façon, mais on filtre côté requête pour être explicite).
      if (!isAdmin) q = q.eq("user_id", currentUser.id);
      const { data, error } = await q;
      if (cancelled) return;
      setRows(error || !data ? [] : (data as Row[]));
      setLoading(false);
    }
    void load();
    return () => { cancelled = true; };
  }, [currentUser?.id, isAdmin, period]);

  const agg = useMemo(() => {
    const list = rows ?? [];
    let calls = 0, tokens = 0, cost = 0;
    for (const r of list) {
      calls += 1;
      tokens += (r.input_tokens ?? 0) + (r.output_tokens ?? 0);
      cost += Number(r.cost_eur ?? 0);
    }
    // Évolution par mois (mode année).
    const byMonth = new Map<string, number>();
    for (const r of list) {
      const key = r.created_at.slice(0, 7); // YYYY-MM
      byMonth.set(key, (byMonth.get(key) ?? 0) + Number(r.cost_eur ?? 0));
    }
    const now = new Date();
    const months: { key: string; label: string; cost: number }[] = [];
    for (let i = 11; i >= 0; i -= 1) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      months.push({
        key,
        label: d.toLocaleDateString("fr-FR", { month: "short" }),
        cost: byMonth.get(key) ?? 0,
      });
    }
    // Répartition par membre (admin).
    const byMember = new Map<string, number>();
    for (const r of list) {
      if (!r.user_id) continue;
      byMember.set(r.user_id, (byMember.get(r.user_id) ?? 0) + Number(r.cost_eur ?? 0));
    }
    const members = [...byMember.entries()]
      .map(([id, c]) => ({ id, name: users.find((u) => u.id === id)?.name ?? "—", cost: c }))
      .sort((a, b) => b.cost - a.cost);
    return { calls, tokens, cost, months, members };
  }, [rows, users]);

  const maxMonth = Math.max(...agg.months.map((m) => m.cost), 0.0001);
  const maxMember = Math.max(...agg.members.map((m) => m.cost), 0.0001);
  const eur = (n: number) => `${n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;

  return (
    <div style={cardStyle}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12, flexWrap: "wrap" }}>
        <div aria-hidden="true" style={{ width: 30, height: 30, borderRadius: 9, flex: "0 0 auto", background: "linear-gradient(135deg, var(--ls-purple), var(--ls-teal))", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15 }}>✨</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: "Syne, sans-serif", fontWeight: 700, fontSize: 15, color: "var(--ls-text)" }}>Noaly · conso IA<JargonTip term="noaly" /></div>
          <div style={{ fontSize: 12, color: "var(--ls-text-muted)" }}>{period === "month" ? "Ce mois" : "12 derniers mois"}{isAdmin ? " · équipe" : ""}</div>
        </div>
        {/* Toggle période */}
        <div style={{ display: "flex", gap: 4, background: "var(--ls-surface2)", borderRadius: 10, padding: 3 }}>
          {(["month", "year"] as Period[]).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPeriod(p)}
              style={{
                padding: "6px 12px",
                borderRadius: 8,
                border: "none",
                cursor: "pointer",
                fontFamily: "DM Sans, sans-serif",
                fontSize: 12,
                fontWeight: 700,
                background: period === p ? "var(--ls-teal)" : "transparent",
                color: period === p ? "var(--ls-bg)" : "var(--ls-text-muted)",
              }}
            >
              {p === "month" ? "Ce mois" : "Année"}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div style={{ fontSize: 13, color: "var(--ls-text-muted)", padding: "10px 0" }}>Chargement…</div>
      ) : (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
            <Stat label="Appels" value={agg.calls.toLocaleString("fr-FR")} />
            <Stat label="Tokens" value={agg.tokens.toLocaleString("fr-FR")} />
            <Stat label="Coût" value={eur(agg.cost)} accent />
          </div>

          {/* Évolution mois par mois (mode année) */}
          {period === "year" ? (
            <div style={{ marginTop: 16 }}>
              <div style={sectionLabel}>Évolution mensuelle</div>
              <div style={{ display: "flex", alignItems: "flex-end", gap: 4, height: 72, marginTop: 8 }}>
                {agg.months.map((m) => (
                  <div key={m.key} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }} title={`${m.label} : ${eur(m.cost)}`}>
                    <div
                      style={{
                        width: "100%",
                        height: `${Math.max(3, (m.cost / maxMonth) * 56)}px`,
                        borderRadius: 5,
                        background: m.cost > 0 ? "linear-gradient(180deg, var(--ls-teal), color-mix(in srgb, var(--ls-teal) 55%, transparent))" : "var(--ls-border)",
                      }}
                    />
                    <span style={{ fontSize: 9, color: "var(--ls-text-hint)", textTransform: "capitalize" }}>{m.label}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {/* Répartition par membre (admin) */}
          {isAdmin && agg.members.length > 0 ? (
            <div style={{ marginTop: 16 }}>
              <div style={sectionLabel}>Par membre de l'équipe</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 7, marginTop: 8 }}>
                {agg.members.slice(0, 8).map((m) => (
                  <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontSize: 12.5, color: "var(--ls-text)", width: 110, flex: "0 0 auto", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.name}</span>
                    <div style={{ flex: 1, height: 8, borderRadius: 4, background: "var(--ls-surface2)", overflow: "hidden" }}>
                      <div style={{ width: `${(m.cost / maxMember) * 100}%`, height: "100%", background: "linear-gradient(90deg, var(--ls-purple), var(--ls-teal))" }} />
                    </div>
                    <span style={{ fontSize: 12, fontWeight: 700, color: "var(--ls-text)", width: 64, flex: "0 0 auto", textAlign: "right" }}>{eur(m.cost)}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </>
      )}

      <div style={{ fontSize: 11.5, color: "var(--ls-text-hint)", marginTop: 14, lineHeight: 1.45 }}>
        Chaque échange avec Noaly (assistant IA) est compté ici. Le coût est estimé d'après les tokens consommés.
      </div>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div style={{ background: "var(--ls-surface2)", borderRadius: 12, padding: "12px 10px", textAlign: "center" }}>
      <div style={{ fontFamily: "Syne, sans-serif", fontWeight: 800, fontSize: 19, color: accent ? "var(--ls-gold)" : "var(--ls-text)", lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 10, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--ls-text-hint)", marginTop: 5, fontWeight: 600 }}>{label}</div>
    </div>
  );
}

const sectionLabel: React.CSSProperties = {
  fontFamily: "'JetBrains Mono', monospace",
  fontSize: 10.5,
  letterSpacing: "0.1em",
  textTransform: "uppercase",
  color: "var(--ls-text-hint)",
  fontWeight: 600,
};

const cardStyle: React.CSSProperties = {
  background: "var(--ls-surface)",
  border: "1px solid var(--ls-border)",
  borderRadius: 16,
  padding: "16px 18px",
};
