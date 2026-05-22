// =============================================================================
// RentabilityDetailModal — Refonte Premium V2 (chantier 2026-05-20)
//
// Modale d'analyse poussée (overlay sur la page /rentabilite).
// 2 vues :
//   - "Vue mois courant"  → filtres pivot (Tous / Publics / VIP / Distri) +
//                            composition breakdown (marge directe / overrides)
//   - "Vue 12 mois"       → BarChart avec record (gold) + courant (gradient)
//                            + 3 annotations contextuelles auto-computed
//
// Plan d'action en bas : 3 nudges heuristiques (basé sur delta vs M-1,
// daysLeft, presence downline). IA = chantier futur Lor'Squad AI.
//
// Source design : docs/mockups/rentabilite-design-v2/.../modale.jsx
// =============================================================================

import { useMemo, useRef, useState, useEffect } from "react";
import type { RentabilityData, RentabilityTopClient } from "../../hooks/useUserRentability";
import { useRentabilityHistory } from "../../hooks/useRentabilityHistory";
import { BarChart } from "./shared/BarChart";
import { RentabilityPdfReport } from "./RentabilityPdfReport";
import { useAppContext } from "../../context/AppContext";

interface RentabilityDetailModalProps {
  data: RentabilityData;
  onClose: () => void;
  directMargin: number;
  downlineOverride: number;
  manualOverride: number;
}

type FilterTab = "all" | "public" | "vip" | "distri";

function monthLabel(iso: string): string {
  try {
    const d = new Date(iso + "T12:00:00Z");
    const f = new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric" }).format(d);
    return f.charAt(0).toUpperCase() + f.slice(1);
  } catch {
    return "";
  }
}

function shortMonth(iso: string): string {
  try {
    const d = new Date(iso + "T12:00:00Z");
    return new Intl.DateTimeFormat("fr-FR", { month: "short" }).format(d).replace(".", "");
  } catch {
    return "";
  }
}

export function RentabilityDetailModal({
  data,
  onClose,
  directMargin,
  downlineOverride,
  manualOverride,
}: RentabilityDetailModalProps) {
  const { currentUser } = useAppContext();
  const total = directMargin + downlineOverride + manualOverride;
  const [tab, setTab] = useState<"mois" | "12m">("12m");
  const [filter, setFilter] = useState<FilterTab>("all");
  // Export PDF (chantier #8 polish 2026-05-22)
  const [exporting, setExporting] = useState(false);
  const pdfRef = useRef<HTMLDivElement | null>(null);

  async function handleExportPdf() {
    if (!pdfRef.current) return;
    setExporting(true);
    try {
      const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
        import("html2canvas"),
        import("jspdf"),
      ]);
      const canvas = await html2canvas(pdfRef.current, {
        scale: 2,
        backgroundColor: "#FFFFFF",
        useCORS: true,
        logging: false,
      });
      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4", compress: true });
      const imgData = canvas.toDataURL("image/jpeg", 0.92);
      pdf.addImage(imgData, "JPEG", 0, 0, 210, 297, undefined, "FAST");
      const safeName = (currentUser?.name ?? "rapport").toLowerCase().replace(/[^a-z0-9]+/g, "-");
      const monthShort = data.month_start.slice(0, 7);
      pdf.save(`rentabilite-${safeName}-${monthShort}.pdf`);
    } catch (err) {
      console.error("[rentab pdf export]", err);
    } finally {
      setExporting(false);
    }
  }

  // Lock body scroll
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  const history = useRentabilityHistory(data.scope_user_ids, 12);

  // Filtres mois courant
  const filtered = useMemo(() => {
    if (filter === "public") {
      return {
        label: "Grand public",
        total: data.margin_public_eur,
        revenue: data.revenue_public,
        share: total > 0 ? data.margin_public_eur / total : 0,
        count: data.clients_public_count,
      };
    }
    if (filter === "vip") {
      return {
        label: "VIP / récurrents",
        total: data.margin_vip_eur,
        revenue: data.revenue_vip,
        share: total > 0 ? data.margin_vip_eur / total : 0,
        count: data.clients_vip_count,
      };
    }
    if (filter === "distri") {
      const distriTotal = downlineOverride + manualOverride;
      return {
        label: "Distri (overrides)",
        total: distriTotal,
        revenue: distriTotal, // overrides = revenu net direct
        share: total > 0 ? distriTotal / total : 0,
        count: 0, // pas de count exact ici, on agrège
      };
    }
    return {
      label: "Tous publics",
      total: total,
      revenue: data.revenue_brut,
      share: 1,
      count: data.clients_public_count + data.clients_vip_count,
    };
  }, [filter, data, total, downlineOverride, manualOverride]);

  // Calculs pour la vue 12 mois
  const historyBars = useMemo(() => history.data.map((p) => p.margin_eur), [history.data]);
  const historyLabels = useMemo(() => history.data.map((p) => shortMonth(p.month)), [history.data]);
  const peakIdx = useMemo(() => {
    if (historyBars.length === 0) return -1;
    let max = -Infinity;
    let idx = -1;
    historyBars.forEach((v, i) => {
      if (v > max) {
        max = v;
        idx = i;
      }
    });
    return idx;
  }, [historyBars]);
  const currentIdx = historyBars.length - 1;
  const sum12 = historyBars.reduce((a, b) => a + b, 0);
  const avg = historyBars.length > 0 ? sum12 / historyBars.length : 0;
  const last6 = historyBars.slice(-6);
  const prev6 = historyBars.slice(-12, -6);
  const last6Sum = last6.reduce((a, b) => a + b, 0);
  const prev6Sum = prev6.reduce((a, b) => a + b, 0);
  const trendPct = prev6Sum > 0 ? Math.round(((last6Sum - prev6Sum) / prev6Sum) * 100) : 0;

  return (
    <div
      className="lr"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
      style={overlayStyle}
    >
      <div onClick={(e) => e.stopPropagation()} style={modalStyle}>
        {/* ─── Header ─────────────────────────────────────────────── */}
        <div style={headerStyle}>
          <div>
            <div className="lr-eyebrow">
              <span aria-hidden="true">⚡</span>
              Analyse détaillée
            </div>
            <div style={titleStyle}>Rentabilité · {monthLabel(data.month_start)}</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={tabsWrapStyle}>
              <TabPill active={tab === "mois"} onClick={() => setTab("mois")}>
                Vue mois courant
              </TabPill>
              <TabPill active={tab === "12m"} onClick={() => setTab("12m")}>
                Vue 12 mois
              </TabPill>
            </div>
            <button
              type="button"
              onClick={handleExportPdf}
              disabled={exporting}
              title="Export PDF A4"
              style={exportBtnStyle}
            >
              {exporting ? "..." : "📄 PDF"}
            </button>
            <button onClick={onClose} aria-label="Fermer" style={closeBtnStyle} type="button">
              ×
            </button>
          </div>
        </div>

        {/* ─── Body ───────────────────────────────────────────────── */}
        <div style={bodyStyle}>
          {tab === "12m" ? (
            <TwelveMonthsView
              bars={historyBars}
              labels={historyLabels}
              peakIdx={peakIdx}
              currentIdx={currentIdx}
              sum12={sum12}
              avg={avg}
              trendPct={trendPct}
              loading={history.loading}
              currentMonthLabel={monthLabel(data.month_start)}
              daysLeft={data.days_in_month - data.days_elapsed}
              projection={data.projection_eur}
            />
          ) : (
            <CurrentMonthView
              filter={filter}
              setFilter={setFilter}
              filtered={filtered}
              directMargin={directMargin}
              downlineOverride={downlineOverride}
              manualOverride={manualOverride}
              total={total}
              topClients={data.top_clients ?? []}
              marginPct={data.margin_pct}
            />
          )}

          {/* Plan d'action — toujours visible */}
          <ActionPlan
            delta={total - data.prev_month_eur}
            prevMonthEur={data.prev_month_eur}
            daysLeft={data.days_in_month - data.days_elapsed}
            projection={data.projection_eur}
            downlineOverride={downlineOverride}
          />
        </div>
      </div>

      {/* PDF rendu off-screen pour capture html2canvas (chantier #8) */}
      <div style={{ position: "fixed", left: -99999, top: -99999, pointerEvents: "none" }} aria-hidden="true">
        <RentabilityPdfReport
          ref={pdfRef}
          data={data}
          directMargin={directMargin}
          downlineOverride={downlineOverride}
          manualOverride={manualOverride}
          coachName={currentUser?.name ?? "Coach"}
          generatedAt={new Date()}
        />
      </div>
    </div>
  );
}

// ─── Sous-composants ────────────────────────────────────────────────────────

function TabPill({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        height: 28,
        padding: "0 14px",
        borderRadius: 999,
        border: "none",
        cursor: "pointer",
        background: active ? "var(--ls-rentab-bg-1)" : "transparent",
        color: active ? "var(--ls-rentab-ink)" : "var(--ls-rentab-ink-3)",
        fontFamily: "DM Sans, sans-serif",
        fontSize: 12.5,
        fontWeight: 600,
        boxShadow: active ? "var(--ls-rentab-shadow-sm)" : "none",
        transition: "all .15s",
      }}
    >
      {children}
    </button>
  );
}

function FilterChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        height: 28,
        padding: "0 12px",
        borderRadius: 999,
        border: `1px solid ${active ? "transparent" : "var(--ls-rentab-line-2)"}`,
        background: active ? "var(--ls-rentab-ink)" : "var(--ls-rentab-bg-1)",
        color: active ? "var(--ls-rentab-bg-1)" : "var(--ls-rentab-ink-2)",
        fontFamily: "DM Sans, sans-serif",
        fontWeight: 500,
        fontSize: 12.5,
        cursor: "pointer",
        transition: "all .15s",
      }}
    >
      {children}
    </button>
  );
}

function TwelveMonthsView({
  bars,
  labels,
  peakIdx,
  currentIdx,
  sum12,
  avg,
  trendPct,
  loading,
  currentMonthLabel,
  daysLeft,
  projection,
}: {
  bars: number[];
  labels: string[];
  peakIdx: number;
  currentIdx: number;
  sum12: number;
  avg: number;
  trendPct: number;
  loading: boolean;
  currentMonthLabel: string;
  daysLeft: number;
  projection: number;
}) {
  return (
    <>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div>
          <div style={miniLabelStyle}>Sur 12 mois</div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginTop: 6 }}>
            <span
              data-stealth
              className="lr-num"
              style={{
                fontFamily: "Syne, sans-serif",
                fontWeight: 700,
                fontSize: 36,
                color: "var(--ls-rentab-ink)",
                letterSpacing: "-0.01em",
              }}
            >
              {Math.round(sum12).toLocaleString("fr-FR")} €
            </span>
            <span style={{ fontFamily: "DM Sans, sans-serif", fontSize: 12, color: "var(--ls-rentab-ink-3)" }}>
              cumul net · moy. {Math.round(avg).toLocaleString("fr-FR")} €/mois
            </span>
          </div>
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {peakIdx >= 0 && bars[peakIdx] > 0 && (
            <span className="lr-chip lr-chip--gold">
              <span aria-hidden="true">✦</span>
              Record · {labels[peakIdx]} {Math.round(bars[peakIdx]).toLocaleString("fr-FR")}€
            </span>
          )}
          {trendPct !== 0 && (
            <span className={`lr-chip ${trendPct >= 0 ? "lr-chip--teal" : "lr-chip--coral"}`}>
              <span aria-hidden="true">{trendPct >= 0 ? "↑" : "↓"}</span>
              Tendance {trendPct >= 0 ? "+" : ""}{trendPct}% /6m
            </span>
          )}
        </div>
      </div>

      <div className="lr-card-2" style={{ padding: 18 }}>
        {loading ? (
          <div style={{ textAlign: "center", padding: 40, color: "var(--ls-rentab-ink-3)", fontSize: 13 }}>
            Chargement historique…
          </div>
        ) : bars.length === 0 ? (
          <div style={{ textAlign: "center", padding: 40, color: "var(--ls-rentab-ink-3)", fontSize: 13 }}>
            Pas encore d'historique. Tes futurs mois s'afficheront ici.
          </div>
        ) : (
          <BarChart
            data={bars}
            labels={labels}
            width={680}
            height={220}
            current={currentIdx}
            peak={peakIdx}
          />
        )}
      </div>

      {/* Annotations auto-computed */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 10 }}>
        {peakIdx >= 0 && peakIdx !== currentIdx && bars[peakIdx] > 0 && (
          <Annotation
            when={labels[peakIdx]}
            title="Record"
            body={`${Math.round(bars[peakIdx]).toLocaleString("fr-FR")}€ — ton plus gros mois sur la période.`}
            tone="gold"
          />
        )}
        {trendPct > 10 && (
          <Annotation
            when="6 derniers mois"
            title="Tendance haussière"
            body={`+${trendPct}% vs 6 mois précédents. Continue ce rythme.`}
            tone="teal"
          />
        )}
        {trendPct < -10 && (
          <Annotation
            when="6 derniers mois"
            title="Décrochage"
            body={`${trendPct}% vs 6 mois précédents. Relance tes clients dormants.`}
            tone="purple"
          />
        )}
        <Annotation
          when={shortMonth(new Date().toISOString().slice(0, 10))}
          title="En cours"
          body={`${currentMonthLabel} · ${daysLeft > 0 ? `${daysLeft} j restants · projection ${Math.round(projection).toLocaleString("fr-FR")} €` : "mois écoulé"}`}
          tone="teal"
        />
      </div>
    </>
  );
}

function CurrentMonthView({
  filter,
  setFilter,
  filtered,
  directMargin,
  downlineOverride,
  manualOverride,
  total,
  topClients,
  marginPct,
}: {
  filter: FilterTab;
  setFilter: (f: FilterTab) => void;
  filtered: { label: string; total: number; revenue: number; share: number; count: number };
  directMargin: number;
  downlineOverride: number;
  manualOverride: number;
  total: number;
  topClients: RentabilityTopClient[];
  marginPct: number;
}) {
  return (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <span
          style={{
            fontFamily: "DM Sans, sans-serif",
            fontSize: 12,
            color: "var(--ls-rentab-ink-3)",
            marginRight: 4,
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
          }}
        >
          <span aria-hidden="true">▾</span>
          Pivot
        </span>
        <FilterChip active={filter === "all"} onClick={() => setFilter("all")}>Tous</FilterChip>
        <FilterChip active={filter === "public"} onClick={() => setFilter("public")}>Publics</FilterChip>
        <FilterChip active={filter === "vip"} onClick={() => setFilter("vip")}>VIP</FilterChip>
        <FilterChip active={filter === "distri"} onClick={() => setFilter("distri")}>
          Distri (overrides)
        </FilterChip>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 14 }}>
        <div className="lr-card-2" style={{ padding: 22 }}>
          <div style={miniLabelStyle}>{filtered.label}</div>
          <div
            data-stealth
            className="lr-num"
            style={{
              fontFamily: "Syne, sans-serif",
              fontStyle: "italic",
              fontWeight: 700,
              fontSize: 52,
              color: "var(--ls-rentab-ink)",
              marginTop: 8,
              letterSpacing: "-0.02em",
              lineHeight: 1,
            }}
          >
            {Math.round(filtered.total).toLocaleString("fr-FR")}
            <span style={{ fontSize: 30, marginLeft: 2 }}>€</span>
          </div>
          <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span className="lr-chip lr-chip--teal">{Math.round(filtered.share * 100)}% du total</span>
            <span style={{ fontFamily: "DM Sans, sans-serif", fontSize: 12, color: "var(--ls-rentab-ink-3)" }}>
              {filtered.count > 0 && `${filtered.count} ${filter === "distri" ? "ligne" : "client"}${filtered.count > 1 ? "s" : ""}`}
            </span>
          </div>
          <div style={{ marginTop: 18, height: 8, background: "var(--ls-rentab-bg-2)", borderRadius: 999, overflow: "hidden" }}>
            <div
              style={{
                width: `${Math.round(filtered.share * 100)}%`,
                height: "100%",
                background: "linear-gradient(90deg, var(--ls-rentab-teal), var(--ls-rentab-purple))",
                borderRadius: 999,
                transition: "width 600ms var(--ls-rentab-ease-out)",
              }}
            />
          </div>
          {filter === "all" && (
            <div style={{ marginTop: 12, fontFamily: "DM Sans, sans-serif", fontSize: 12, color: "var(--ls-rentab-ink-3)" }}>
              Marge perso retail : {Math.round(marginPct)}%
            </div>
          )}
        </div>

        <div className="lr-card-2" style={{ padding: 18, display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={miniLabelStyle}>Composition</div>
          <CompoRow label="Marge directe" value={directMargin} pct={total > 0 ? directMargin / total : 0} color="var(--ls-rentab-teal)" />
          <CompoRow label="Override équipe" value={downlineOverride} pct={total > 0 ? downlineOverride / total : 0} color="var(--ls-rentab-purple)" />
          <CompoRow label="Override hors-app" value={manualOverride} pct={total > 0 ? manualOverride / total : 0} color="var(--ls-rentab-purple-soft)" />
        </div>
      </div>

      {/* Top 3 clients (si pertinent pour ce filtre) */}
      {(filter === "all" || filter === "public" || filter === "vip") && topClients.length > 0 && (
        <div>
          <div style={{ ...miniLabelStyle, marginBottom: 10 }}>Top 3 clients</div>
          <div style={{ display: "grid", gap: 8 }}>
            {topClients
              .filter((c) => (filter === "vip" ? c.is_vip : filter === "public" ? !c.is_vip : true))
              .slice(0, 3)
              .map((c, i) => (
                <div
                  key={c.client_id}
                  className="lr-card-2"
                  style={{
                    padding: "12px 16px",
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                  }}
                >
                  <span
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: "50%",
                      background: i === 0 ? "var(--ls-rentab-gold-tint)" : "var(--ls-rentab-bg-2)",
                      color: i === 0 ? "var(--ls-rentab-gold)" : "var(--ls-rentab-ink-3)",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontFamily: "Syne, sans-serif",
                      fontWeight: 700,
                      fontSize: 12,
                    }}
                  >
                    #{i + 1}
                  </span>
                  <span style={{ flex: 1, fontFamily: "DM Sans, sans-serif", fontSize: 13.5, color: "var(--ls-rentab-ink)" }}>
                    {c.client_name}
                  </span>
                  <span
                    data-stealth
                    className="lr-num"
                    style={{
                      fontFamily: "Syne, sans-serif",
                      fontStyle: "italic",
                      fontWeight: 700,
                      fontSize: 18,
                      color: "var(--ls-rentab-ink)",
                    }}
                  >
                    {Math.round(c.revenue)} €
                  </span>
                </div>
              ))}
          </div>
        </div>
      )}
    </>
  );
}

function CompoRow({ label, value, pct, color }: { label: string; value: number; pct: number; color: string }) {
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
        <span style={{ fontFamily: "DM Sans, sans-serif", fontSize: 12.5, color: "var(--ls-rentab-ink-2)" }}>{label}</span>
        <span style={{ fontFamily: "DM Sans, sans-serif", fontSize: 12, color: "var(--ls-rentab-ink-3)" }}>
          <strong
            data-stealth
            className="lr-num"
            style={{ color: "var(--ls-rentab-ink)", fontWeight: 600, marginRight: 6 }}
          >
            {Math.round(value).toLocaleString("fr-FR")} €
          </strong>
          {Math.round(pct * 100)}%
        </span>
      </div>
      <div style={{ height: 6, background: "var(--ls-rentab-bg-2)", borderRadius: 999, overflow: "hidden" }}>
        <div
          style={{
            width: `${pct * 100}%`,
            height: "100%",
            background: color,
            borderRadius: 999,
            transition: "width 600ms var(--ls-rentab-ease-out)",
          }}
        />
      </div>
    </div>
  );
}

function Annotation({ when, title, body, tone }: { when: string; title: string; body: string; tone: "gold" | "purple" | "teal" }) {
  const tones: Record<typeof tone, { bg: string; color: string }> = {
    gold: { bg: "var(--ls-rentab-gold-tint)", color: "var(--ls-rentab-gold)" },
    purple: { bg: "var(--ls-rentab-purple-tint)", color: "var(--ls-rentab-purple)" },
    teal: { bg: "var(--ls-rentab-teal-tint)", color: "var(--ls-rentab-teal)" },
  };
  const t = tones[tone];
  return (
    <div className="lr-card-2" style={{ padding: 14 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, flexWrap: "wrap" }}>
        <span
          style={{
            height: 22,
            padding: "0 8px",
            borderRadius: 999,
            background: t.bg,
            color: t.color,
            fontFamily: "DM Sans, sans-serif",
            fontSize: 11,
            fontWeight: 600,
            display: "inline-flex",
            alignItems: "center",
          }}
        >
          {when}
        </span>
        <span style={{ fontFamily: "DM Sans, sans-serif", fontSize: 13, fontWeight: 600, color: "var(--ls-rentab-ink)" }}>
          {title}
        </span>
      </div>
      <div style={{ fontFamily: "DM Sans, sans-serif", fontSize: 12, color: "var(--ls-rentab-ink-3)", lineHeight: 1.5 }}>
        {body}
      </div>
    </div>
  );
}

// ─── Plan d'action — nudges heuristiques V1 ─────────────────────────────────
function ActionPlan({
  delta,
  prevMonthEur,
  daysLeft,
  projection,
  downlineOverride,
}: {
  delta: number;
  prevMonthEur: number;
  daysLeft: number;
  projection: number;
  downlineOverride: number;
}) {
  // Heuristiques V1 — IA viendra plus tard (chantier Lor'Squad AI)
  const nudges: Array<{ id: string; title: string; body: string; cta: string; muted?: boolean }> = [];

  if (delta < 0 && prevMonthEur > 0) {
    const pct = Math.round((Math.abs(delta) / prevMonthEur) * 100);
    nudges.push({
      id: "decroche",
      title: `Tes ventes baissent de ${pct}% vs M-1`,
      body: "Relance tes 3 clients dormants en priorité. Un message court suffit pour reconnecter.",
      cta: "Voir les dormants",
    });
  }

  if (daysLeft > 0 && daysLeft <= 10 && projection > prevMonthEur * 1.15) {
    nudges.push({
      id: "explose",
      title: "Tu vas exploser ton mois 🚀",
      body: `À ce rythme tu finis à ${Math.round(projection).toLocaleString("fr-FR")}€ — pousse les ${daysLeft} derniers jours.`,
      cta: "Continuer",
    });
  }

  if (downlineOverride === 0) {
    nudges.push({
      id: "team",
      title: "Tes distri n'ont rien généré ce mois",
      body: "Coach 1 distri cette semaine → +PV royalty pour toi et un boost pour eux.",
      cta: "Mon équipe",
      muted: true,
    });
  }

  if (nudges.length < 3 && daysLeft > 0) {
    nudges.push({
      id: "rdv",
      title: "Planifie 3 RDV bilan cette semaine",
      body: "Chaque bilan = 1 programme vendu en moyenne. Direct sur ta marge directe.",
      cta: "Nouveau bilan",
      muted: nudges.length > 0,
    });
  }

  if (nudges.length === 0) {
    nudges.push({
      id: "rien",
      title: "Tout est sous contrôle",
      body: "Reviens demain pour de nouveaux conseils. En attendant, prépare ton prochain bilan.",
      cta: "Nouveau bilan",
      muted: true,
    });
  }

  return (
    <div
      style={{
        background:
          "linear-gradient(140deg, var(--ls-rentab-gold-tint), transparent 70%), var(--ls-rentab-bg-1)",
        border: "1px solid color-mix(in oklab, var(--ls-rentab-gold) 24%, transparent)",
        borderRadius: 22,
        padding: "18px 22px",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12, flexWrap: "wrap" }}>
        <span
          aria-hidden="true"
          style={{
            width: 28,
            height: 28,
            borderRadius: 8,
            background: "color-mix(in oklab, var(--ls-rentab-gold) 18%, transparent)",
            color: "var(--ls-rentab-gold)",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 14,
          }}
        >
          🎯
        </span>
        <div style={{ fontFamily: "Syne, sans-serif", fontWeight: 600, fontSize: 17, color: "var(--ls-rentab-ink)" }}>
          Plan d'action
        </div>
        <span className="lr-chip" style={{ height: 22, padding: "0 8px", fontSize: 10.5 }}>
          {nudges.length} nudge{nudges.length > 1 ? "s" : ""} contextuels
        </span>
      </div>
      <div style={{ display: "grid", gap: 10 }}>
        {nudges.slice(0, 3).map((n, idx) => (
          <Nudge key={n.id} index={idx + 1} title={n.title} body={n.body} cta={n.cta} muted={n.muted} />
        ))}
      </div>
    </div>
  );
}

function Nudge({ index, title, body, cta, muted }: { index: number; title: string; body: string; cta: string; muted?: boolean }) {
  return (
    <div
      className="lr-card-2"
      style={{
        padding: "12px 14px",
        display: "flex",
        alignItems: "center",
        gap: 14,
        opacity: muted ? 0.85 : 1,
      }}
    >
      <span
        style={{
          width: 26,
          height: 26,
          borderRadius: 999,
          background: "var(--ls-rentab-bg-2)",
          color: "var(--ls-rentab-ink-2)",
          fontFamily: "Syne, sans-serif",
          fontWeight: 700,
          fontStyle: "italic",
          fontSize: 13,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        {index}
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: "DM Sans, sans-serif", fontWeight: 600, fontSize: 13.5, color: "var(--ls-rentab-ink)" }}>
          {title}
        </div>
        <div style={{ fontFamily: "DM Sans, sans-serif", fontSize: 12.5, color: "var(--ls-rentab-ink-3)", marginTop: 2 }}>
          {body}
        </div>
      </div>
      <button
        type="button"
        className="lr-cta"
        style={{ height: 30, padding: "0 12px", fontSize: 12 }}
      >
        {cta}
        <span aria-hidden="true">→</span>
      </button>
    </div>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────

const overlayStyle: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "color-mix(in oklab, var(--ls-rentab-ink) 50%, transparent)",
  backdropFilter: "blur(8px)",
  WebkitBackdropFilter: "blur(8px)",
  zIndex: 9999,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "20px 16px",
  overflowY: "auto",
};

const modalStyle: React.CSSProperties = {
  position: "relative",
  width: "100%",
  maxWidth: 920,
  maxHeight: "calc(100vh - 40px)",
  display: "flex",
  flexDirection: "column",
  background: "var(--ls-rentab-bg-1)",
  border: "1px solid var(--ls-rentab-line)",
  borderRadius: 28,
  boxShadow: "var(--ls-rentab-shadow-lg)",
  overflow: "hidden",
};

const headerStyle: React.CSSProperties = {
  padding: "20px 26px 16px",
  borderBottom: "1px solid var(--ls-rentab-line)",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 18,
  flexWrap: "wrap",
};

const titleStyle: React.CSSProperties = {
  fontFamily: "Syne, sans-serif",
  fontWeight: 600,
  fontSize: 22,
  color: "var(--ls-rentab-ink)",
  letterSpacing: "-0.01em",
  marginTop: 4,
};

const tabsWrapStyle: React.CSSProperties = {
  display: "inline-flex",
  padding: 3,
  gap: 2,
  background: "var(--ls-rentab-bg-2)",
  borderRadius: 999,
  border: "1px solid var(--ls-rentab-line)",
};

const exportBtnStyle: React.CSSProperties = {
  height: 34,
  padding: "0 12px",
  borderRadius: 999,
  border: "0.5px solid var(--ls-rentab-line)",
  background: "var(--ls-rentab-bg-2)",
  color: "var(--ls-rentab-ink-2)",
  fontFamily: "DM Sans, sans-serif",
  fontSize: 12,
  fontWeight: 600,
  cursor: "pointer",
  whiteSpace: "nowrap",
};

const closeBtnStyle: React.CSSProperties = {
  width: 34,
  height: 34,
  borderRadius: 999,
  background: "var(--ls-rentab-bg-2)",
  border: "1px solid var(--ls-rentab-line)",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
  color: "var(--ls-rentab-ink-2)",
  fontSize: 18,
};

const bodyStyle: React.CSSProperties = {
  padding: "20px 26px 24px",
  flex: 1,
  overflowY: "auto",
  display: "flex",
  flexDirection: "column",
  gap: 20,
};

const miniLabelStyle: React.CSSProperties = {
  fontFamily: "DM Sans, sans-serif",
  fontSize: 11,
  letterSpacing: "0.14em",
  textTransform: "uppercase",
  color: "var(--ls-rentab-ink-3)",
};
