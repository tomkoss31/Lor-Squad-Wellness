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
import { useNavigate } from "react-router-dom";
import type { RentabilityData, RentabilityTopClient } from "../../hooks/useUserRentability";
import { useRentabilityHistory, type MonthHistoryPoint } from "../../hooks/useRentabilityHistory";
import { BarChart } from "./shared/BarChart";
import { RentabilityPdfReport } from "./RentabilityPdfReport";
import { QuickSaleEditModal } from "./QuickSaleEditModal";
import { useAppContext } from "../../context/AppContext";

interface RentabilityDetailModalProps {
  data: RentabilityData;
  onClose: () => void;
  directMargin: number;
  downlineOverride: number;
  manualOverride: number;
  /** Override ventilé par membre downline (userId → EUR) — pour le détail
      « de qui vient le montant » dans le filtre Distri. */
  overridePerMember?: Map<string, number>;
  /** Active le crayon ✏️ d'édition des ventes (uniquement sur SA rentabilité). */
  editable?: boolean;
  /** Appelé après une édition réussie → la page refetch la RPC. */
  onEdited?: () => void;
}

type FilterTab = "all" | "public" | "vip" | "distri";

/** Shape minimale d'une ligne client affichée (sous-ensemble de RentabilityTopClient). */
type ClientRow = Pick<RentabilityTopClient, "client_id" | "client_name" | "revenue" | "is_vip">;

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
  overridePerMember,
  editable = false,
  onEdited,
}: RentabilityDetailModalProps) {
  const { currentUser, users, clients, pvClientProducts } = useAppContext();
  const navigate = useNavigate();

  // Liste COMPLÈTE des clients du mois (pas le top 5 de la RPC) pour l'édition.
  // Dérivée d'AppContext, scopée aux distributeurs du périmètre de la modale.
  const monthClients = useMemo<ClientRow[]>(() => {
    const monthKey = (data.month_start ?? "").slice(0, 7);
    const scope = new Set(data.scope_user_ids ?? []);
    const revByClient = new Map<string, number>();
    for (const p of pvClientProducts) {
      if (!p.active) continue;
      if ((p.startDate ?? "").slice(0, 7) !== monthKey) continue;
      const rev = (Number(p.pricePublicPerUnit) || 0) * (Number(p.quantityStart) || 0);
      if (rev <= 0) continue;
      revByClient.set(p.clientId, (revByClient.get(p.clientId) ?? 0) + rev);
    }
    const list: ClientRow[] = [];
    for (const c of clients) {
      if (!scope.has(c.distributorId)) continue;
      const revenue = revByClient.get(c.id);
      if (!revenue) continue;
      list.push({
        client_id: c.id,
        client_name: `${c.firstName} ${c.lastName}`.trim() || "Client",
        revenue,
        is_vip: (c.vipStatus ?? "none") !== "none",
      });
    }
    return list.sort((a, b) => b.revenue - a.revenue);
  }, [clients, pvClientProducts, data.month_start, data.scope_user_ids]);
  // Navigation depuis le Plan d'action : ferme la modale puis route.
  const handleNudgeNavigate = (route: string) => {
    onClose();
    navigate(route);
  };

  // Détail override par distributeur (résolu en noms), trié décroissant.
  const overrideBreakdown = useMemo(() => {
    if (!overridePerMember) return [];
    return [...overridePerMember.entries()]
      .filter(([, eur]) => eur > 0.5)
      .map(([id, eur]) => {
        const u = users.find((x) => x.id === id);
        return { id, name: u?.name?.trim() || "Distributeur", eur };
      })
      .sort((a, b) => b.eur - a.eur);
  }, [overridePerMember, users]);
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
      <style>{`
        @media (max-width: 720px) {
          .lr-rentab-modal {
            max-width: 100% !important;
            border-radius: 18px !important;
            max-height: calc(100dvh - 24px) !important;
          }
          .lr-rentab-modal-header {
            flex-direction: column !important;
            align-items: stretch !important;
            gap: 10px !important;
            padding: 14px 18px 12px !important;
          }
          .lr-rentab-modal-header > div:last-child {
            justify-content: space-between;
          }
          .lr-rentab-modal-body {
            padding: 14px 18px 18px !important;
            gap: 14px !important;
          }
          .lr-rentab-tabs-wrap { flex: 1; }
          .lr-rentab-export-btn { padding: 0 10px !important; }
        }
      `}</style>
      <div onClick={(e) => e.stopPropagation()} className="lr-rentab-modal" style={modalStyle}>
        {/* ─── Header ─────────────────────────────────────────────── */}
        <div className="lr-rentab-modal-header" style={headerStyle}>
          <div>
            <div className="lr-eyebrow">
              <span aria-hidden="true">⚡</span>
              Analyse détaillée
            </div>
            <div style={titleStyle}>Rentabilité · {monthLabel(data.month_start)}</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div className="lr-rentab-tabs-wrap" style={tabsWrapStyle}>
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
              className="lr-rentab-export-btn"
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
        <div className="lr-rentab-modal-body" style={bodyStyle}>
          {tab === "12m" ? (
            <TwelveMonthsView
              points={history.data}
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
              editableClients={monthClients}
              marginPct={data.margin_pct}
              overrideBreakdown={overrideBreakdown}
              editable={editable}
              onEdited={onEdited}
            />
          )}

          {/* Plan d'action — toujours visible */}
          <ActionPlan
            delta={total - data.prev_month_eur}
            prevMonthEur={data.prev_month_eur}
            daysLeft={data.days_in_month - data.days_elapsed}
            projection={data.projection_eur}
            downlineOverride={downlineOverride}
            onNavigate={handleNudgeNavigate}
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
  points,
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
  points: MonthHistoryPoint[];
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
  const peakValue = bars.length > 0 ? Math.max(...bars, 1) : 1;
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
            showValues
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

      {/* Récap mois par mois (demande Thomas 2026-06-13) : chaque mois lisible,
          montant + évolution vs mois précédent + mini-barre. Mois récent en haut. */}
      {!loading && points.length > 0 && (
        <div>
          <div style={{ ...miniLabelStyle, marginBottom: 10 }}>Récap mois par mois</div>
          <div style={{ display: "grid", gap: 6 }}>
            {points
              .map((p, i) => ({ p, i }))
              .reverse()
              .map(({ p, i }) => {
                const value = p.margin_eur;
                const prev = i > 0 ? points[i - 1].margin_eur : null;
                const delta = prev != null ? value - prev : null;
                const deltaPct =
                  prev != null && prev > 0 ? Math.round((delta! / prev) * 100) : null;
                const isCurrent = i === currentIdx;
                const isPeak = i === peakIdx && value > 0;
                return (
                  <div
                    key={p.month}
                    className="lr-card-2"
                    style={{
                      padding: "10px 14px",
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      border: isCurrent
                        ? "1px solid color-mix(in oklab, var(--ls-rentab-teal) 40%, transparent)"
                        : undefined,
                    }}
                  >
                    <span
                      style={{
                        width: 104,
                        flexShrink: 0,
                        fontFamily: "DM Sans, sans-serif",
                        fontSize: 13,
                        fontWeight: isCurrent ? 700 : 500,
                        color: isCurrent ? "var(--ls-rentab-ink)" : "var(--ls-rentab-ink-2)",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 5,
                      }}
                    >
                      {monthLabel(p.month)}
                      {isPeak && <span aria-hidden="true" title="Record">✦</span>}
                    </span>

                    {/* mini-barre relative au record */}
                    <div
                      style={{
                        flex: 1,
                        height: 6,
                        background: "var(--ls-rentab-bg-2)",
                        borderRadius: 999,
                        overflow: "hidden",
                        minWidth: 40,
                      }}
                    >
                      <div
                        style={{
                          width: `${Math.round((value / peakValue) * 100)}%`,
                          height: "100%",
                          background: isPeak
                            ? "var(--ls-rentab-gold)"
                            : isCurrent
                            ? "linear-gradient(90deg, var(--ls-rentab-teal), var(--ls-rentab-purple))"
                            : "var(--ls-rentab-ink-3)",
                          borderRadius: 999,
                        }}
                      />
                    </div>

                    {/* évolution vs mois précédent */}
                    {delta != null && Math.abs(delta) >= 1 ? (
                      <span
                        style={{
                          fontFamily: "DM Sans, sans-serif",
                          fontSize: 11.5,
                          fontWeight: 600,
                          whiteSpace: "nowrap",
                          color:
                            delta >= 0 ? "var(--ls-rentab-teal)" : "var(--ls-rentab-coral)",
                        }}
                      >
                        {delta >= 0 ? "↑" : "↓"} {deltaPct != null ? `${Math.abs(deltaPct)}%` : `${Math.round(Math.abs(delta))}€`}
                      </span>
                    ) : (
                      <span style={{ fontSize: 11.5, color: "var(--ls-rentab-ink-3)", whiteSpace: "nowrap" }}>—</span>
                    )}

                    <span
                      data-stealth
                      className="lr-num"
                      style={{
                        width: 78,
                        textAlign: "right",
                        flexShrink: 0,
                        fontFamily: "Syne, sans-serif",
                        fontWeight: 700,
                        fontSize: 15,
                        color: "var(--ls-rentab-ink)",
                      }}
                    >
                      {Math.round(value).toLocaleString("fr-FR")} €
                    </span>
                  </div>
                );
              })}
          </div>
        </div>
      )}
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
  editableClients,
  marginPct,
  overrideBreakdown,
  editable,
  onEdited,
}: {
  filter: FilterTab;
  setFilter: (f: FilterTab) => void;
  filtered: { label: string; total: number; revenue: number; share: number; count: number };
  directMargin: number;
  downlineOverride: number;
  manualOverride: number;
  total: number;
  topClients: ClientRow[];
  editableClients?: ClientRow[];
  marginPct: number;
  overrideBreakdown: { id: string; name: string; eur: number }[];
  editable?: boolean;
  onEdited?: () => void;
}) {
  const [showAllClients, setShowAllClients] = useState(false);
  const [showOverrideDetail, setShowOverrideDetail] = useState(false);
  const [editing, setEditing] = useState<{ id: string; name: string } | null>(null);
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

      {/* Top clients — dépliable (demande Thomas 2026-06-13 : flèche pour voir
          toute la liste, pas juste le top 3). La RPC plafonne à 5 clients. */}
      {(filter === "all" || filter === "public" || filter === "vip") && (() => {
        // En mode édition : liste COMPLÈTE des clients du mois (AppContext),
        // sinon le top 5 de la RPC (lecture seule).
        const source = editable && editableClients && editableClients.length > 0 ? editableClients : topClients;
        const list = source.filter((c) =>
          filter === "vip" ? c.is_vip : filter === "public" ? !c.is_vip : true,
        );
        if (list.length === 0) return null;
        const shown = showAllClients ? list : list.slice(0, 3);
        return (
          <div>
            <div style={{ ...miniLabelStyle, marginBottom: 10 }}>
              {filter === "vip" ? "Clients VIP" : filter === "public" ? "Clients grand public" : editable ? "Clients du mois — ✏️ modifiables" : "Top clients"}
            </div>
            <div style={{ display: "grid", gap: 8 }}>
              {shown.map((c, i) => (
                <div
                  key={c.client_id}
                  className="lr-card-2"
                  style={{ padding: "12px 16px", display: "flex", alignItems: "center", gap: 12 }}
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
                    {c.is_vip && <span aria-hidden="true" title="VIP" style={{ marginLeft: 6 }}>👑</span>}
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
                  {editable && (
                    <button
                      type="button"
                      onClick={() => setEditing({ id: c.client_id, name: c.client_name })}
                      aria-label={`Modifier la vente de ${c.client_name}`}
                      title="Modifier (nom, produits, quantités)"
                      style={{
                        width: 30,
                        height: 30,
                        flexShrink: 0,
                        borderRadius: 9,
                        border: "1px solid var(--ls-rentab-line)",
                        background: "var(--ls-rentab-bg-2)",
                        color: "var(--ls-rentab-ink-2)",
                        cursor: "pointer",
                        fontSize: 14,
                        lineHeight: 1,
                      }}
                    >
                      ✏️
                    </button>
                  )}
                </div>
              ))}
            </div>
            {list.length > 3 && (
              <ExpandToggle
                open={showAllClients}
                onClick={() => setShowAllClients((v) => !v)}
                closedLabel={`Voir tout (${list.length})`}
              />
            )}
          </div>
        );
      })()}

      {/* Détail override par distributeur — dépliable (demande Thomas 2026-06-13 :
          savoir de qui vient le montant override). */}
      {filter === "distri" && (
        <div>
          <div style={{ ...miniLabelStyle, marginBottom: 10 }}>D'où vient ton override</div>
          {overrideBreakdown.length === 0 ? (
            <div
              className="lr-card-2"
              style={{ padding: "14px 16px", fontFamily: "DM Sans, sans-serif", fontSize: 13, color: "var(--ls-rentab-ink-3)" }}
            >
              Aucun override ce mois — tes distributeurs n'ont pas encore généré de ventes.
            </div>
          ) : (
            <>
              <div style={{ display: "grid", gap: 8 }}>
                {(showOverrideDetail ? overrideBreakdown : overrideBreakdown.slice(0, 3)).map((m, i) => (
                  <div
                    key={m.id}
                    className="lr-card-2"
                    style={{ padding: "12px 16px", display: "flex", alignItems: "center", gap: 12 }}
                  >
                    <span
                      style={{
                        width: 24,
                        height: 24,
                        borderRadius: "50%",
                        background: i === 0 ? "var(--ls-rentab-purple-tint)" : "var(--ls-rentab-bg-2)",
                        color: i === 0 ? "var(--ls-rentab-purple)" : "var(--ls-rentab-ink-3)",
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
                      {m.name}
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
                      {Math.round(m.eur)} €
                    </span>
                  </div>
                ))}
              </div>
              {overrideBreakdown.length > 3 && (
                <ExpandToggle
                  open={showOverrideDetail}
                  onClick={() => setShowOverrideDetail((v) => !v)}
                  closedLabel={`Voir tout (${overrideBreakdown.length})`}
                />
              )}
            </>
          )}
        </div>
      )}

      {editing && (
        <QuickSaleEditModal
          clientId={editing.id}
          initialName={editing.name}
          onClose={() => setEditing(null)}
          onSaved={onEdited}
        />
      )}
    </>
  );
}

// Flèche dépliable réutilisable (chevron ▾ / ▴).
function ExpandToggle({ open, onClick, closedLabel }: { open: boolean; onClick: () => void; closedLabel: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        marginTop: 8,
        width: "100%",
        height: 34,
        borderRadius: 12,
        border: "1px solid var(--ls-rentab-line)",
        background: "var(--ls-rentab-bg-2)",
        color: "var(--ls-rentab-ink-2)",
        fontFamily: "DM Sans, sans-serif",
        fontSize: 12.5,
        fontWeight: 600,
        cursor: "pointer",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
      }}
    >
      <span aria-hidden="true" style={{ transition: "transform .15s", transform: open ? "rotate(180deg)" : "none" }}>▾</span>
      {open ? "Réduire" : closedLabel}
    </button>
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
  onNavigate,
}: {
  delta: number;
  prevMonthEur: number;
  daysLeft: number;
  projection: number;
  downlineOverride: number;
  onNavigate: (route: string) => void;
}) {
  // Heuristiques V1 — IA viendra plus tard (chantier Lor'Squad AI).
  // `route` = destination du CTA (les boutons étaient décoratifs avant 2026-06-14).
  const nudges: Array<{ id: string; title: string; body: string; cta: string; route: string; muted?: boolean }> = [];

  if (delta < 0 && prevMonthEur > 0) {
    const pct = Math.round((Math.abs(delta) / prevMonthEur) * 100);
    nudges.push({
      id: "decroche",
      title: `Tes ventes baissent de ${pct}% vs M-1`,
      body: "Relance tes clients dormants en priorité. Un message court suffit pour reconnecter.",
      cta: "Voir les dormants",
      route: "/clients?filter=inactive-30d",
    });
  }

  if (daysLeft > 0 && daysLeft <= 10 && projection > prevMonthEur * 1.15) {
    nudges.push({
      id: "explose",
      title: "Tu vas exploser ton mois 🚀",
      body: `À ce rythme tu finis à ${Math.round(projection).toLocaleString("fr-FR")}€ — pousse les ${daysLeft} derniers jours.`,
      cta: "Qui relancer",
      route: "/clients?filter=to-followup",
    });
  }

  if (downlineOverride === 0) {
    nudges.push({
      id: "team",
      title: "Tes distri n'ont rien généré ce mois",
      body: "Coach 1 distri cette semaine → +PV royalty pour toi et un boost pour eux.",
      cta: "Mon équipe",
      route: "/team",
      muted: true,
    });
  }

  if (nudges.length < 3 && daysLeft > 0) {
    nudges.push({
      id: "rdv",
      title: "Planifie 3 RDV bilan cette semaine",
      body: "Chaque bilan = 1 programme vendu en moyenne. Direct sur ta marge directe.",
      cta: "Nouveau bilan",
      route: "/assessments/new",
      muted: nudges.length > 0,
    });
  }

  if (nudges.length === 0) {
    nudges.push({
      id: "rien",
      title: "Tout est sous contrôle",
      body: "Reviens demain pour de nouveaux conseils. En attendant, prépare ton prochain bilan.",
      cta: "Nouveau bilan",
      route: "/assessments/new",
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
          <Nudge key={n.id} index={idx + 1} title={n.title} body={n.body} cta={n.cta} muted={n.muted} onClick={() => onNavigate(n.route)} />
        ))}
      </div>
    </div>
  );
}

function Nudge({ index, title, body, cta, muted, onClick }: { index: number; title: string; body: string; cta: string; muted?: boolean; onClick: () => void }) {
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
        onClick={onClick}
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
  maxHeight: "calc(100dvh - 40px)",
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
