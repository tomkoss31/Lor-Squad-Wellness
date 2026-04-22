// Chantier Paramètres Admin (2026-04-23) — commit 6/7.
//
// Onglet Statistiques : KPIs globaux équipe + PV + activité. Query unique
// via RPC get_admin_stats() (SECURITY DEFINER, check is_admin) qui renvoie
// un jsonb avec toutes les sections. Plus graph PV 6 mois agrégé client-side.

import { useEffect, useMemo, useState } from "react";
import { Card } from "../ui/Card";
import { useAppContext } from "../../context/AppContext";
import { getSupabaseClient } from "../../services/supabaseClient";

interface AdminStats {
  team?: {
    total: number;
    active_month: number;
    new_month: number;
    retention_3m_pct: number | null;
  };
  clients?: {
    total: number;
    new_month: number;
    assessments_month: number;
    conversion_pct: number | null;
  };
  pv?: {
    month_total: number;
    top5: Array<{ id: string; name: string; pv: number }>;
  };
  activity?: {
    messages_month: number;
    protocol_sent_month: number;
  };
  generated_at?: string;
  error?: string;
}

export function StatistiquesTab() {
  const { pvTransactions } = useAppContext();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      setLoading(true);
      setError(null);
      try {
        const sb = await getSupabaseClient();
        if (!sb) throw new Error("Service indisponible.");
        const { data, error: rpcErr } = await sb.rpc("get_admin_stats");
        if (rpcErr) throw new Error(rpcErr.message);
        setStats(data as AdminStats);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Échec du chargement.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Graph PV 6 mois — agrégation client-side depuis le context (évite
  // une deuxième RPC). Note : si les transactions dépassent la pagination
  // de load, ça sera incomplet — acceptable pour un MVP.
  const pv6m = useMemo(() => {
    const now = new Date();
    const buckets = new Map<string, number>();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      buckets.set(d.toISOString().slice(0, 7), 0);
    }
    for (const t of pvTransactions) {
      const key = new Date(t.date).toISOString().slice(0, 7);
      if (buckets.has(key)) {
        buckets.set(key, (buckets.get(key) ?? 0) + (t.pv || 0));
      }
    }
    return Array.from(buckets.entries()).map(([month, pv]) => ({ month, pv }));
  }, [pvTransactions]);

  if (loading) {
    return (
      <Card>
        <p style={{ fontSize: 13, color: "var(--ls-text-muted)" }}>
          Chargement des statistiques…
        </p>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <p
          style={{
            padding: "10px 12px",
            borderRadius: 10,
            background: "rgba(251,113,133,0.12)",
            color: "#FBBFC8",
            fontSize: 13,
          }}
        >
          {error}
        </p>
      </Card>
    );
  }

  if (!stats) return null;

  if (stats.error) {
    return (
      <Card>
        <p style={{ fontSize: 13, color: "var(--ls-text-muted)" }}>
          {stats.error}. Exécute la migration SQL pour activer les stats.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Section title="Équipe">
        <StatGrid>
          <StatCell label="Distributeurs total" value={stats.team?.total ?? 0} />
          <StatCell label="Actifs ce mois" value={stats.team?.active_month ?? 0} />
          <StatCell label="Nouveaux ce mois" value={stats.team?.new_month ?? 0} />
          <StatCell
            label="Rétention 3 mois"
            value={stats.team?.retention_3m_pct != null ? `${stats.team.retention_3m_pct}%` : "—"}
          />
        </StatGrid>
      </Section>

      <Section title="Clients globaux">
        <StatGrid>
          <StatCell label="Clients total" value={stats.clients?.total ?? 0} />
          <StatCell label="Nouveaux ce mois" value={stats.clients?.new_month ?? 0} />
          <StatCell label="Bilans ce mois" value={stats.clients?.assessments_month ?? 0} />
          <StatCell
            label="Conversion prospects"
            value={stats.clients?.conversion_pct != null ? `${stats.clients.conversion_pct}%` : "—"}
          />
        </StatGrid>
      </Section>

      <Section title="PV">
        <StatGrid>
          <StatCell
            label="PV équipe ce mois"
            value={(stats.pv?.month_total ?? 0).toLocaleString("fr-FR")}
          />
        </StatGrid>

        <div style={{ marginTop: 14 }}>
          <p
            style={{
              fontSize: 11,
              letterSpacing: "0.05em",
              textTransform: "uppercase",
              color: "var(--ls-text-muted)",
              marginBottom: 8,
            }}
          >
            Top 5 du mois
          </p>
          {(stats.pv?.top5 ?? []).length === 0 ? (
            <p style={{ fontSize: 13, color: "var(--ls-text-hint)" }}>
              Aucune transaction ce mois.
            </p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {(stats.pv?.top5 ?? []).map((r, idx) => (
                <div
                  key={r.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "8px 12px",
                    borderRadius: 10,
                    background: "var(--ls-surface2)",
                    border: "1px solid var(--ls-border)",
                  }}
                >
                  <span
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: "50%",
                      background: idx === 0 ? "#C9A84C" : "var(--ls-surface)",
                      color: idx === 0 ? "#0B0D11" : "var(--ls-text-muted)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontFamily: "Syne, sans-serif",
                      fontWeight: 700,
                      fontSize: 11,
                      flexShrink: 0,
                    }}
                  >
                    {idx + 1}
                  </span>
                  <span style={{ flex: 1, fontSize: 13, color: "var(--ls-text)" }}>
                    {r.name}
                  </span>
                  <span
                    style={{
                      fontFamily: "Syne, sans-serif",
                      fontWeight: 700,
                      fontSize: 14,
                      color: "var(--ls-gold)",
                    }}
                  >
                    {r.pv.toLocaleString("fr-FR")} PV
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ marginTop: 18 }}>
          <p
            style={{
              fontSize: 11,
              letterSpacing: "0.05em",
              textTransform: "uppercase",
              color: "var(--ls-text-muted)",
              marginBottom: 8,
            }}
          >
            PV 6 derniers mois
          </p>
          <PvBarChart data={pv6m} />
        </div>
      </Section>

      <Section title="Activité">
        <StatGrid>
          <StatCell label="Messages ce mois" value={stats.activity?.messages_month ?? 0} />
          <StatCell
            label="Suivis protocole envoyés"
            value={stats.activity?.protocol_sent_month ?? 0}
          />
        </StatGrid>
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card className="space-y-4">
      <p className="eyebrow-label">{title}</p>
      {children}
    </Card>
  );
}

function StatGrid({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        display: "grid",
        gap: 10,
        gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
      }}
    >
      {children}
    </div>
  );
}

function StatCell({ label, value }: { label: string; value: string | number }) {
  return (
    <div
      style={{
        padding: "10px 12px",
        borderRadius: 10,
        background: "var(--ls-surface2)",
        border: "1px solid var(--ls-border)",
      }}
    >
      <div
        style={{
          fontSize: 10,
          letterSpacing: "0.05em",
          textTransform: "uppercase",
          color: "var(--ls-text-hint)",
          marginBottom: 4,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontFamily: "Syne, sans-serif",
          fontWeight: 500,
          fontSize: 22,
          color: "var(--ls-text)",
        }}
      >
        {value}
      </div>
    </div>
  );
}

function PvBarChart({ data }: { data: { month: string; pv: number }[] }) {
  if (data.length === 0) return null;
  const max = Math.max(1, ...data.map((d) => d.pv));
  const W = 520;
  const H = 140;
  const PAD_X = 16;
  const PAD_BOTTOM = 24;
  const barW = (W - PAD_X * 2) / data.length - 8;

  function labelMonth(iso: string): string {
    const [y, m] = iso.split("-");
    const d = new Date(Number(y), Number(m) - 1, 1);
    return d.toLocaleDateString("fr-FR", { month: "short" });
  }

  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ overflow: "visible" }}>
      {data.map((d, i) => {
        const x = PAD_X + i * ((W - PAD_X * 2) / data.length) + 4;
        const h = (d.pv / max) * (H - PAD_BOTTOM - 8);
        const y = H - PAD_BOTTOM - h;
        return (
          <g key={d.month}>
            <rect
              x={x}
              y={y}
              width={barW}
              height={h}
              rx={4}
              fill="#C9A84C"
              opacity={0.85}
            />
            {d.pv > 0 ? (
              <text
                x={x + barW / 2}
                y={y - 4}
                textAnchor="middle"
                fontSize="9"
                fill="var(--ls-text-muted)"
                fontFamily="DM Sans, sans-serif"
              >
                {d.pv.toLocaleString("fr-FR")}
              </text>
            ) : null}
            <text
              x={x + barW / 2}
              y={H - 6}
              textAnchor="middle"
              fontSize="10"
              fill="var(--ls-text-hint)"
              fontFamily="DM Sans, sans-serif"
            >
              {labelMonth(d.month)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
