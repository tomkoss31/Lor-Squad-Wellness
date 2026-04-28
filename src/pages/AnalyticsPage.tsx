// =============================================================================
// AnalyticsPage — dashboard admin metriques (Chantier D, 2026-04-29)
// =============================================================================
//
// Vue admin /analytics avec :
//   - 4 KPI cards en haut (bilans / clients actifs / PV mois / conversion)
//   - Funnel conversion bilan -> inscrit -> actif
//   - Tendance 12 mois (mini-bars SVG natif)
//   - Top 5 produits du mois
//   - Top 3 distri du mois
//   - 2 alertes operationnelles
//
// Pas de dep externe (recharts/chart.js) : SVG inline minimal pour la
// tendance. Loading skeleton pendant le fetch.
// =============================================================================

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
  Cell,
  type TooltipProps,
} from "recharts";
import { PageHeading } from "../components/ui/PageHeading";
import {
  useAdminAnalytics,
  type AdminAnalyticsPayload,
} from "../hooks/useAdminAnalytics";
import { DistriDrillDownModal } from "../components/analytics/DistriDrillDownModal";

export function AnalyticsPage() {
  const { data, loading, error, reload } = useAdminAnalytics();

  return (
    <div className="space-y-5">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
        <PageHeading
          eyebrow="Analytics"
          title="Pilotage business"
          description="KPI, conversions, top produits & distri (admin only)."
        />
        <button
          type="button"
          onClick={reload}
          disabled={loading}
          style={{
            padding: "8px 14px",
            border: "0.5px solid var(--ls-border)",
            borderRadius: 10,
            background: "var(--ls-surface)",
            color: "var(--ls-text-muted)",
            fontSize: 12,
            fontFamily: "DM Sans, sans-serif",
            cursor: loading ? "wait" : "pointer",
            marginTop: 8,
          }}
        >
          {loading ? "..." : "↻ Actualiser"}
        </button>
      </div>

      {error && (
        <div
          style={{
            padding: "12px 14px",
            background: "color-mix(in srgb, var(--ls-coral) 8%, transparent)",
            border: "1px solid color-mix(in srgb, var(--ls-coral) 30%, transparent)",
            borderRadius: 10,
            color: "var(--ls-coral)",
            fontSize: 13,
          }}
        >
          ⚠️ Erreur chargement : {error}
        </div>
      )}

      {loading && !data && <AnalyticsSkeleton />}

      {data && <AnalyticsContent data={data} />}
    </div>
  );
}

function AnalyticsSkeleton() {
  return (
    <div
      style={{
        display: "grid",
        gap: 14,
        gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
      }}
    >
      {[1, 2, 3, 4].map((i) => (
        <div
          key={i}
          style={{
            background: "var(--ls-surface2)",
            borderRadius: 12,
            height: 100,
            animation: "pulse 1.5s ease-in-out infinite",
          }}
        />
      ))}
    </div>
  );
}

function AnalyticsContent({ data }: { data: AdminAnalyticsPayload }) {
  const { kpi, funnel, top_produits, top_distri, tendance_12_mois, alertes } = data;
  const navigate = useNavigate();
  // D V2 (2026-04-28) : drill-down distri.
  const [drillDownDistri, setDrillDownDistri] = useState<{
    id: string;
    name: string;
  } | null>(null);

  return (
    <>
      {/* KPI cards */}
      <div
        style={{
          display: "grid",
          gap: 12,
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
        }}
      >
        <KpiCard
          label="Bilans ce mois"
          value={kpi.bilans_mois}
          delta={kpi.bilans_delta_pct}
          deltaSuffix="vs M-1"
          tone="gold"
          emoji="📋"
        />
        <KpiCard
          label="Clients actifs"
          value={kpi.clients_actifs}
          delta={
            kpi.clients_actifs_prev > 0
              ? Math.round(
                  (100 * (kpi.clients_actifs - kpi.clients_actifs_prev)) /
                    kpi.clients_actifs_prev * 10,
                ) / 10
              : null
          }
          deltaSuffix="vs M-1"
          tone="teal"
          emoji="🔥"
        />
        <KpiCard
          label="PV ce mois"
          value={Math.round(kpi.pv_mois).toLocaleString("fr-FR")}
          delta={kpi.pv_delta_pct ?? null}
          deltaSuffix="vs M-1"
          tone="purple"
          emoji="💎"
          isText
        />
        <KpiCard
          label="Conversion"
          value={`${kpi.conversion_pct}%`}
          subtitle="Prospects → clients"
          tone="coral"
          emoji="🎯"
          isText
        />
      </div>

      {/* Tendance 12 mois */}
      <Card title="📈 Tendance bilans · 12 mois">
        <TendanceChart data={tendance_12_mois} />
      </Card>

      {/* Funnel + Top produits + Top distri */}
      <div
        style={{
          display: "grid",
          gap: 14,
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
        }}
      >
        <Card title="🔻 Funnel ce mois">
          <FunnelView funnel={funnel} />
        </Card>
        <Card title="🏆 Top 5 produits">
          {top_produits.length === 0 ? (
            <EmptyHint text="Aucune commande active ce mois." />
          ) : (
            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 8 }}>
              {top_produits.map((p) => (
                <li
                  key={p.name}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "8px 12px",
                    background: "var(--ls-surface2)",
                    borderRadius: 8,
                    fontSize: 13,
                  }}
                >
                  <span style={{ color: "var(--ls-text)" }}>{p.name}</span>
                  <span style={{ color: "var(--ls-gold)", fontWeight: 600, fontFamily: "Syne, serif" }}>
                    {p.total_pv} PV
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card title="🥇 Top 3 distri">
          {top_distri.length === 0 ? (
            <EmptyHint text="Aucun bilan ce mois." />
          ) : (
            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 8 }}>
              {top_distri.map((d, i) => {
                const medals = ["🥇", "🥈", "🥉"];
                const clickable = !!d.id;
                const inner = (
                  <>
                    <span style={{ fontSize: 16 }}>{medals[i] ?? "·"}</span>
                    <span style={{ color: "var(--ls-text)", flex: 1, textAlign: "left" }}>{d.name}</span>
                    <span style={{ color: "var(--ls-teal)", fontWeight: 600 }}>
                      {d.bilans} bilan{d.bilans > 1 ? "s" : ""}
                    </span>
                    {clickable ? (
                      <span
                        style={{
                          fontSize: 10,
                          color: "var(--ls-text-hint)",
                          marginLeft: 4,
                        }}
                        aria-hidden="true"
                      >
                        →
                      </span>
                    ) : null}
                  </>
                );
                return clickable ? (
                  <li key={d.id} style={{ listStyle: "none", margin: 0, padding: 0 }}>
                    <button
                      type="button"
                      onClick={() => setDrillDownDistri({ id: d.id!, name: d.name })}
                      title={`Voir le détail de ${d.name}`}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        width: "100%",
                        padding: "8px 12px",
                        background: "var(--ls-surface2)",
                        border: "0.5px solid var(--ls-border)",
                        borderRadius: 8,
                        fontSize: 13,
                        cursor: "pointer",
                        fontFamily: "inherit",
                        transition: "background 120ms ease",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background =
                          "color-mix(in srgb, var(--ls-gold) 6%, var(--ls-surface2))";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = "var(--ls-surface2)";
                      }}
                    >
                      {inner}
                    </button>
                  </li>
                ) : (
                  <li
                    key={d.name}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: "8px 12px",
                      background: "var(--ls-surface2)",
                      borderRadius: 8,
                      fontSize: 13,
                    }}
                  >
                    {inner}
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>

      {/* Alertes */}
      {(alertes.distri_sans_bilan_14j > 0 || alertes.clients_pause_60j > 0) && (
        <Card title="⚠️ Alertes opérationnelles">
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {alertes.distri_sans_bilan_14j > 0 && (
              <AlertRow
                emoji="😴"
                text={`${alertes.distri_sans_bilan_14j} distri sans bilan depuis 14 jours`}
                cta="Voir équipe"
                href="/team"
              />
            )}
            {alertes.clients_pause_60j > 0 && (
              <AlertRow
                emoji="🛑"
                text={`${alertes.clients_pause_60j} client${alertes.clients_pause_60j > 1 ? "s" : ""} en pause depuis ≥60 jours`}
                cta="Voir clients"
                href="/clients"
              />
            )}
          </div>
        </Card>
      )}

      {/* D V2 (2026-04-28) : modale drill-down distri. */}
      {drillDownDistri ? (
        <DistriDrillDownModal
          distriId={drillDownDistri.id}
          distriName={drillDownDistri.name}
          onClose={() => setDrillDownDistri(null)}
          onGoToClients={() => {
            const id = drillDownDistri.id;
            setDrillDownDistri(null);
            navigate(`/clients?owner=${encodeURIComponent(id)}`);
          }}
        />
      ) : null}
    </>
  );
}

// ─── Sous-composants ────────────────────────────────────────────────────────

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div
      style={{
        background: "var(--ls-surface)",
        border: "0.5px solid var(--ls-border)",
        borderRadius: 14,
        padding: 18,
      }}
    >
      <h2
        style={{
          fontFamily: "Syne, Georgia, serif",
          fontSize: 16,
          fontWeight: 500,
          margin: "0 0 14px 0",
          color: "var(--ls-text)",
        }}
      >
        {title}
      </h2>
      {children}
    </div>
  );
}

function KpiCard({
  label,
  value,
  delta,
  deltaSuffix,
  subtitle,
  tone,
  emoji,
  isText,
}: {
  label: string;
  value: number | string;
  delta?: number | null;
  deltaSuffix?: string;
  subtitle?: string;
  tone: "gold" | "teal" | "purple" | "coral";
  emoji: string;
  isText?: boolean;
}) {
  const colors = {
    gold: { bg: "color-mix(in srgb, var(--ls-gold) 6%, transparent)", border: "var(--ls-gold)", text: "var(--ls-gold)" },
    teal: { bg: "color-mix(in srgb, var(--ls-teal) 6%, transparent)", border: "var(--ls-teal)", text: "var(--ls-teal)" },
    purple: { bg: "color-mix(in srgb, var(--ls-purple) 6%, transparent)", border: "var(--ls-purple)", text: "var(--ls-purple)" },
    coral: { bg: "color-mix(in srgb, var(--ls-coral) 6%, transparent)", border: "var(--ls-coral)", text: "var(--ls-coral)" },
  }[tone];

  const deltaColor = delta == null
    ? "var(--ls-text-hint)"
    : delta > 0 ? "var(--ls-teal)" : delta < 0 ? "var(--ls-coral)" : "var(--ls-text-hint)";
  const deltaSign = delta == null ? "" : delta > 0 ? "+" : "";

  return (
    <div
      style={{
        background: colors.bg,
        border: `1px solid ${colors.border}30`,
        borderRadius: 14,
        padding: 16,
        display: "flex",
        flexDirection: "column",
        gap: 6,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 11, color: "var(--ls-text-muted)", letterSpacing: 0.4, textTransform: "uppercase" }}>
          {label}
        </span>
        <span style={{ fontSize: 18 }}>{emoji}</span>
      </div>
      <div
        style={{
          fontFamily: "Syne, Georgia, serif",
          fontSize: isText ? 22 : 32,
          fontWeight: 500,
          color: colors.text,
          lineHeight: 1.1,
        }}
      >
        {value}
      </div>
      {(delta != null || subtitle) && (
        <div style={{ fontSize: 11, color: subtitle ? "var(--ls-text-muted)" : deltaColor, marginTop: 2 }}>
          {delta != null ? `${deltaSign}${delta}% ${deltaSuffix ?? ""}` : subtitle}
        </div>
      )}
    </div>
  );
}

function TendanceChart({ data }: { data: { month_start: string; bilans: number }[] }) {
  if (data.length === 0) {
    return <EmptyHint text="Pas encore de données." />;
  }

  const formatted = data.map((d) => ({
    month: formatMonthLabel(d.month_start),
    bilans: d.bilans,
    rawDate: d.month_start,
  }));

  return (
    <div style={{ width: "100%", height: 220 }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={formatted} margin={{ top: 10, right: 12, left: -8, bottom: 0 }}>
          <defs>
            <linearGradient id="goldGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#B8922A" stopOpacity={0.5} />
              <stop offset="100%" stopColor="#B8922A" stopOpacity={0.04} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="2 4" stroke="var(--ls-border)" vertical={false} />
          <XAxis
            dataKey="month"
            tick={{ fontSize: 10, fill: "var(--ls-text-hint)" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            allowDecimals={false}
            tick={{ fontSize: 10, fill: "var(--ls-text-hint)" }}
            axisLine={false}
            tickLine={false}
            width={32}
          />
          <Tooltip content={<ChartTooltip />} cursor={{ stroke: "var(--ls-gold)", strokeOpacity: 0.3 }} />
          <Area
            type="monotone"
            dataKey="bilans"
            stroke="#B8922A"
            strokeWidth={2.5}
            fill="url(#goldGradient)"
            dot={{ fill: "#B8922A", r: 3, strokeWidth: 0 }}
            activeDot={{ r: 5, stroke: "#fff", strokeWidth: 2 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function ChartTooltip(props: TooltipProps<number, string>) {
  // Recharts 3.x : on cast via unknown pour bypass la signature readonly.
  const cast = props as unknown as {
    active?: boolean;
    payload?: ReadonlyArray<{ value: number; payload?: { month?: string } }>;
  };
  const { active, payload } = cast;
  if (!active || !payload || payload.length === 0) return null;
  const item = payload[0];
  return (
    <div
      style={{
        background: "var(--ls-surface)",
        border: "0.5px solid var(--ls-border)",
        borderRadius: 8,
        padding: "8px 12px",
        boxShadow: "0 6px 16px rgba(0,0,0,0.08)",
        fontSize: 12,
        fontFamily: "DM Sans, sans-serif",
      }}
    >
      <div style={{ color: "var(--ls-text-muted)", marginBottom: 2 }}>{item.payload?.month}</div>
      <div style={{ color: "var(--ls-gold)", fontWeight: 600, fontFamily: "Syne, serif", fontSize: 14 }}>
        {item.value} bilan{Number(item.value) > 1 ? "s" : ""}
      </div>
    </div>
  );
}

function FunnelView({ funnel }: { funnel: { bilans: number; inscrits: number; actifs: number; actifs_30d: number } }) {
  const data = [
    { name: "Bilans", value: funnel.bilans, color: "#B8922A" },
    { name: "Inscrits", value: funnel.inscrits, color: "#0D9488" },
    { name: "Actifs", value: funnel.actifs, color: "#A78BFA" },
    { name: "≥30j", value: funnel.actifs_30d, color: "#FB7185" },
  ];

  return (
    <div style={{ width: "100%", height: 200 }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 5, right: 30, left: 0, bottom: 0 }}>
          <XAxis type="number" hide allowDecimals={false} />
          <YAxis
            type="category"
            dataKey="name"
            tick={{ fontSize: 11, fill: "var(--ls-text-muted)" }}
            axisLine={false}
            tickLine={false}
            width={70}
          />
          <Tooltip
            content={(props) => {
              const cast = props as unknown as { active?: boolean; payload?: ReadonlyArray<{ value: number; payload?: { name?: string } }> };
              const { active, payload } = cast;
              if (!active || !payload || payload.length === 0) return null;
              const item = payload[0];
              return (
                <div style={{
                  background: "var(--ls-surface)",
                  border: "0.5px solid var(--ls-border)",
                  borderRadius: 8,
                  padding: "6px 10px",
                  fontSize: 12,
                  boxShadow: "0 4px 12px rgba(0,0,0,0.06)",
                }}>
                  <strong>{item.payload?.name}</strong> : {item.value}
                </div>
              );
            }}
            cursor={{ fill: "transparent" }}
          />
          <Bar dataKey="value" radius={[0, 6, 6, 0]} barSize={22}>
            {data.map((entry) => (
              <Cell key={entry.name} fill={entry.color} fillOpacity={0.85} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function AlertRow({ emoji, text, cta, href }: { emoji: string; text: string; cta: string; href: string }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "10px 12px",
        background: "color-mix(in srgb, var(--ls-coral) 6%, transparent)",
        border: "1px solid color-mix(in srgb, var(--ls-coral) 25%, transparent)",
        borderRadius: 10,
      }}
    >
      <span style={{ fontSize: 18 }}>{emoji}</span>
      <span style={{ flex: 1, fontSize: 13, color: "var(--ls-text)" }}>{text}</span>
      <a
        href={href}
        style={{
          fontSize: 12,
          color: "var(--ls-coral)",
          fontWeight: 600,
          textDecoration: "none",
        }}
      >
        {cta} →
      </a>
    </div>
  );
}

function EmptyHint({ text }: { text: string }) {
  return (
    <div style={{ padding: "20px 0", textAlign: "center", color: "var(--ls-text-hint)", fontSize: 12, fontStyle: "italic" }}>
      {text}
    </div>
  );
}

function formatMonthLabel(iso: string | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("fr-FR", { month: "short", year: "2-digit" });
}
