// =============================================================================
// AnalyticsPdfReport — layout A4 pour export PDF (D V3 — 2026-04-28)
// =============================================================================
//
// Composant rendu off-screen (top: -99999px) avec dimensions A4 fixes
// (794×1123px @ 96dpi). Capture via html2canvas + export via jsPDF.
// 100 % statique : rend le contenu data passe en prop, pas d'interaction.
// =============================================================================

import { forwardRef } from "react";
import type { AdminAnalyticsPayload } from "../../hooks/useAdminAnalytics";

interface Props {
  data: AdminAnalyticsPayload;
  generatedAt: Date;
}

const A4_WIDTH = 794; // px @ 96dpi
const A4_HEIGHT = 1123;

export const AnalyticsPdfReport = forwardRef<HTMLDivElement, Props>(
  ({ data, generatedAt }, ref) => {
    const { kpi, funnel, top_produits, top_distri, tendance_12_mois, alertes } = data;
    const month = generatedAt.toLocaleDateString("fr-FR", {
      month: "long",
      year: "numeric",
    });

    return (
      <div
        ref={ref}
        style={{
          width: A4_WIDTH,
          minHeight: A4_HEIGHT,
          background: "#FFFFFF",
          padding: "48px 56px",
          fontFamily: "DM Sans, sans-serif",
          color: "#111827",
          boxSizing: "border-box",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            paddingBottom: 16,
            borderBottom: "2px solid #B8922A",
            marginBottom: 28,
          }}
        >
          <div>
            <div
              style={{
                fontSize: 11,
                letterSpacing: 2.5,
                textTransform: "uppercase",
                color: "#B8922A",
                fontWeight: 700,
                marginBottom: 6,
              }}
            >
              Lor&apos;Squad · Rapport mensuel
            </div>
            <h1
              style={{
                fontFamily: "Syne, serif",
                fontSize: 30,
                fontWeight: 600,
                color: "#111827",
                margin: 0,
                textTransform: "capitalize",
              }}
            >
              Pilotage business — {month}
            </h1>
          </div>
          <div
            style={{
              fontSize: 10,
              color: "#888",
              textAlign: "right",
              fontFamily: "DM Sans, sans-serif",
            }}
          >
            <div>Généré le</div>
            <div style={{ fontWeight: 700, color: "#5C4A0F", marginTop: 2 }}>
              {generatedAt.toLocaleDateString("fr-FR", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </div>
          </div>
        </div>

        {/* 4 KPIs */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: 12,
            marginBottom: 24,
          }}
        >
          <KpiBox
            label="Bilans ce mois"
            value={String(kpi.bilans_mois)}
            delta={kpi.bilans_delta_pct}
            tone="gold"
            emoji="📋"
          />
          <KpiBox
            label="Clients actifs"
            value={String(kpi.clients_actifs)}
            delta={
              kpi.clients_actifs_prev > 0
                ? Math.round(
                    (100 * (kpi.clients_actifs - kpi.clients_actifs_prev)) /
                      kpi.clients_actifs_prev * 10,
                  ) / 10
                : null
            }
            tone="teal"
            emoji="🔥"
          />
          <KpiBox
            label="PV ce mois"
            value={Math.round(kpi.pv_mois).toLocaleString("fr-FR")}
            delta={kpi.pv_delta_pct ?? null}
            tone="purple"
            emoji="💎"
          />
          <KpiBox
            label="Conversion"
            value={`${kpi.conversion_pct}%`}
            tone="coral"
            emoji="🎯"
          />
        </div>

        {/* Funnel */}
        <Section title="🔻 Funnel ce mois">
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: 8,
              padding: "12px 14px",
              background: "#FAFAFA",
              borderRadius: 10,
            }}
          >
            {[
              { label: "Bilans", value: funnel.bilans },
              { label: "Inscrits app", value: funnel.inscrits },
              { label: "Actifs ce mois", value: funnel.actifs },
              { label: "Actifs (30j)", value: funnel.actifs_30d },
            ].map((cell) => (
              <div key={cell.label} style={{ textAlign: "center" }}>
                <div
                  style={{
                    fontFamily: "Syne, serif",
                    fontSize: 24,
                    fontWeight: 700,
                    color: "#5C4A0F",
                    lineHeight: 1,
                  }}
                >
                  {cell.value}
                </div>
                <div
                  style={{
                    fontSize: 10,
                    color: "#6B6B62",
                    letterSpacing: 0.6,
                    textTransform: "uppercase",
                    marginTop: 4,
                  }}
                >
                  {cell.label}
                </div>
              </div>
            ))}
          </div>
        </Section>

        {/* Top produits + Top distri en grid 2 cols */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 16,
            marginBottom: 20,
          }}
        >
          <Section title="🏆 Top 5 produits">
            {top_produits.length === 0 ? (
              <Empty />
            ) : (
              <ol style={{ margin: 0, paddingLeft: 20, fontSize: 12 }}>
                {top_produits.map((p) => (
                  <li
                    key={p.name}
                    style={{
                      marginBottom: 4,
                      display: "flex",
                      justifyContent: "space-between",
                    }}
                  >
                    <span style={{ flex: 1 }}>{p.name}</span>
                    <span style={{ fontWeight: 700, color: "#B8922A" }}>
                      {Math.round(p.total_pv).toLocaleString("fr-FR")} PV
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </Section>

          <Section title="🥇 Top 3 distri">
            {top_distri.length === 0 ? (
              <Empty />
            ) : (
              <ol style={{ margin: 0, paddingLeft: 20, fontSize: 12 }}>
                {top_distri.map((d) => (
                  <li
                    key={d.id ?? d.name}
                    style={{
                      marginBottom: 4,
                      display: "flex",
                      justifyContent: "space-between",
                    }}
                  >
                    <span style={{ flex: 1 }}>{d.name}</span>
                    <span style={{ fontWeight: 700, color: "#0F6E56" }}>
                      {d.bilans} bilan{d.bilans > 1 ? "s" : ""}
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </Section>
        </div>

        {/* Tendance 12 mois (mini histogramme) */}
        <Section title="📈 Tendance bilans · 12 derniers mois">
          <TendanceMiniBars data={tendance_12_mois} />
        </Section>

        {/* Alertes */}
        {(alertes.distri_sans_bilan_14j > 0 || alertes.clients_pause_60j > 0) && (
          <Section title="⚠️ Alertes opérationnelles">
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {alertes.distri_sans_bilan_14j > 0 && (
                <div
                  style={{
                    padding: "10px 12px",
                    background: "#FFF4E5",
                    border: "1px solid #FCD89E",
                    borderRadius: 8,
                    fontSize: 12,
                    color: "#5C4A0F",
                  }}
                >
                  😴 {alertes.distri_sans_bilan_14j} distri sans bilan depuis 14 jours
                </div>
              )}
              {alertes.clients_pause_60j > 0 && (
                <div
                  style={{
                    padding: "10px 12px",
                    background: "#FEE2E2",
                    border: "1px solid #FCA5A5",
                    borderRadius: 8,
                    fontSize: 12,
                    color: "#991B1B",
                  }}
                >
                  🛑 {alertes.clients_pause_60j} client
                  {alertes.clients_pause_60j > 1 ? "s" : ""} en pause depuis ≥ 60 jours
                </div>
              )}
            </div>
          </Section>
        )}

        {/* Footer */}
        <div
          style={{
            marginTop: 32,
            paddingTop: 14,
            borderTop: "0.5px dashed rgba(184,146,42,0.30)",
            display: "flex",
            justifyContent: "space-between",
            fontSize: 9,
            color: "#888",
            letterSpacing: 0.4,
          }}
        >
          <span>Lor&apos;Squad Wellness · La Base — Verdun</span>
          <span>Rapport généré automatiquement</span>
        </div>
      </div>
    );
  },
);
AnalyticsPdfReport.displayName = "AnalyticsPdfReport";

// ─── Sous-composants ─────────────────────────────────────────────────────────

function KpiBox({
  label,
  value,
  delta,
  tone,
  emoji,
}: {
  label: string;
  value: string;
  delta?: number | null;
  tone: "gold" | "teal" | "purple" | "coral";
  emoji: string;
}) {
  const colors = {
    gold: { bg: "#FAF6E8", border: "#EFD9A1", text: "#5C4A0F" },
    teal: { bg: "#E6FAF6", border: "#5DDFC9", text: "#0F6E56" },
    purple: { bg: "#F0EEFA", border: "#B5ACDB", text: "#4C1D95" },
    coral: { bg: "#FFEEEE", border: "#FCA5A5", text: "#9F1239" },
  }[tone];

  return (
    <div
      style={{
        padding: "12px 12px",
        background: colors.bg,
        border: `1px solid ${colors.border}`,
        borderRadius: 10,
      }}
    >
      <div style={{ fontSize: 18, marginBottom: 4 }}>{emoji}</div>
      <div
        style={{
          fontSize: 9,
          letterSpacing: 0.6,
          textTransform: "uppercase",
          color: "#6B6B62",
          fontWeight: 600,
          marginBottom: 4,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontFamily: "Syne, serif",
          fontSize: 22,
          fontWeight: 700,
          color: colors.text,
          lineHeight: 1,
        }}
      >
        {value}
      </div>
      {typeof delta === "number" ? (
        <div
          style={{
            fontSize: 10,
            color: delta >= 0 ? "#0F6E56" : "#991B1B",
            fontWeight: 600,
            marginTop: 4,
          }}
        >
          {delta >= 0 ? "↑" : "↓"} {Math.abs(delta)}% vs M-1
        </div>
      ) : null}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <div
        style={{
          fontFamily: "Syne, serif",
          fontSize: 13,
          fontWeight: 700,
          color: "#5C4A0F",
          marginBottom: 10,
          letterSpacing: 0.3,
        }}
      >
        {title}
      </div>
      {children}
    </div>
  );
}

function Empty() {
  return (
    <div
      style={{
        padding: "12px 14px",
        background: "#FAFAFA",
        border: "0.5px dashed #DDD",
        borderRadius: 8,
        fontSize: 11,
        color: "#888",
        fontStyle: "italic",
      }}
    >
      Aucune donnée ce mois.
    </div>
  );
}

function TendanceMiniBars({
  data,
}: {
  data: AdminAnalyticsPayload["tendance_12_mois"];
}) {
  if (data.length === 0) {
    return <Empty />;
  }
  const max = Math.max(1, ...data.map((d) => d.bilans));
  return (
    <div
      style={{
        display: "flex",
        gap: 4,
        alignItems: "flex-end",
        height: 90,
        padding: "8px 6px",
        background: "#FAFAFA",
        borderRadius: 8,
      }}
    >
      {data.map((m) => {
        const heightPct = (m.bilans / max) * 100;
        const monthLabel = new Date(m.month_start).toLocaleDateString("fr-FR", {
          month: "short",
        });
        return (
          <div
            key={m.month_start}
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 3,
              height: "100%",
            }}
          >
            <div style={{ fontSize: 9, fontWeight: 700, color: "#5C4A0F" }}>
              {m.bilans > 0 ? m.bilans : ""}
            </div>
            <div
              style={{
                flex: 1,
                width: "100%",
                display: "flex",
                alignItems: "flex-end",
              }}
            >
              <div
                style={{
                  width: "100%",
                  height: `${Math.max(heightPct, 3)}%`,
                  background:
                    "linear-gradient(180deg, #EF9F27, #BA7517)",
                  borderRadius: "3px 3px 0 0",
                }}
              />
            </div>
            <div
              style={{
                fontSize: 8,
                color: "#888",
                textTransform: "uppercase",
                letterSpacing: 0.4,
              }}
            >
              {monthLabel}
            </div>
          </div>
        );
      })}
    </div>
  );
}
