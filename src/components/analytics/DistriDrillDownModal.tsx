// =============================================================================
// DistriDrillDownModal — detail d un distri (D V2 — 2026-04-28)
// =============================================================================
//
// Click sur un distri dans Top Distri → ouvre une modale avec :
//   - Total clients du distri (par lifecycle)
//   - PV personnel ce mois + 6 derniers mois
//   - Bilans realises ce mois
//   - Lien rapide vers /clients?owner=<distri> et /clients/<id> top
//
// Les donnees viennent de useAppContext (clients + pvTransactions). Pas
// de RPC supplementaire — l admin a deja toutes les donnees en memoire.
// =============================================================================

import { useMemo } from "react";
import { useAppContext } from "../../context/AppContext";
import type { Client, LifecycleStatus, User } from "../../types/domain";

interface Props {
  distriId: string;
  distriName: string;
  onClose: () => void;
  onGoToClients: () => void;
}

export function DistriDrillDownModal({
  distriId,
  distriName,
  onClose,
  onGoToClients,
}: Props) {
  const { clients, users, pvTransactions } = useAppContext();

  const distri = useMemo<User | undefined>(
    () => users.find((u) => u.id === distriId),
    [users, distriId],
  );

  const distriClients = useMemo<Client[]>(
    () => clients.filter((c) => c.distributorId === distriId),
    [clients, distriId],
  );

  const stats = useMemo(() => {
    const lifecycleCounts: Record<LifecycleStatus | "fragile", number> = {
      active: 0,
      not_started: 0,
      paused: 0,
      stopped: 0,
      lost: 0,
      fragile: 0,
    };
    distriClients.forEach((c) => {
      const lc = c.lifecycleStatus ?? "active";
      lifecycleCounts[lc] = (lifecycleCounts[lc] ?? 0) + 1;
      if (c.isFragile) lifecycleCounts.fragile += 1;
    });

    // Bilans realises ce mois (count assessments dont la date >= 1er du mois courant).
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const bilansMois = distriClients.reduce((acc, c) => {
      if (!c.assessments) return acc;
      return acc + c.assessments.filter((a) => new Date(a.date) >= monthStart).length;
    }, 0);

    return {
      totalClients: distriClients.length,
      lifecycleCounts,
      bilansMois,
    };
  }, [distriClients]);

  // PV mois courant + 5 mois precedents.
  const pvByMonth = useMemo(() => {
    const result: { monthLabel: string; total: number }[] = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const ref = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
      const total = pvTransactions
        .filter((t) => {
          if (t.responsibleId !== distriId) return false;
          const d = new Date(t.date);
          return d >= ref && d < monthEnd;
        })
        .reduce((acc, t) => acc + (t.pv ?? 0), 0);
      result.push({
        monthLabel: ref.toLocaleDateString("fr-FR", { month: "short" }),
        total: Math.round(total),
      });
    }
    return result;
  }, [pvTransactions, distriId]);

  const pvMaxMonth = useMemo(
    () => Math.max(1, ...pvByMonth.map((p) => p.total)),
    [pvByMonth],
  );

  // Top 3 clients du distri par PV mois courant.
  const topClientsByPv = useMemo(() => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const map = new Map<string, number>();
    pvTransactions.forEach((t) => {
      if (t.responsibleId !== distriId) return;
      if (new Date(t.date) < monthStart) return;
      map.set(t.clientId, (map.get(t.clientId) ?? 0) + (t.pv ?? 0));
    });
    return Array.from(map.entries())
      .map(([clientId, pv]) => {
        const c = distriClients.find((cc) => cc.id === clientId);
        return {
          clientId,
          name: c ? `${c.firstName} ${c.lastName}` : "Client supprimé",
          pv: Math.round(pv),
        };
      })
      .sort((a, b) => b.pv - a.pv)
      .slice(0, 3);
  }, [pvTransactions, distriId, distriClients]);

  return (
    // Audit a11y 2026-04-30 : backdrop souris (ESC clavier au niveau dialog).
    <div
      role="presentation"
      aria-hidden="true"
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100,
        background: "rgba(0,0,0,0.45)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
    >
      {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events -- stopPropagation only, dialog role on element */}
      <div
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={`Détail distributeur ${distriName}`}
        style={{
          width: "100%",
          maxWidth: 640,
          maxHeight: "90vh",
          overflowY: "auto",
          background: "var(--ls-surface)",
          border: "0.5px solid var(--ls-border)",
          borderRadius: 16,
          boxShadow: "0 20px 60px rgba(0,0,0,0.30)",
          fontFamily: "DM Sans, sans-serif",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "18px 22px",
            borderBottom: "0.5px solid var(--ls-border)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: 12,
          }}
        >
          <div>
            <div
              style={{
                fontSize: 10,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                fontWeight: 700,
                color: "var(--ls-text-hint)",
                marginBottom: 4,
              }}
            >
              Drill-down distributeur
            </div>
            <div
              style={{
                fontFamily: "Syne, sans-serif",
                fontSize: 22,
                fontWeight: 600,
                color: "var(--ls-text)",
              }}
            >
              {distriName}
            </div>
            {distri ? (
              <div style={{ fontSize: 11, color: "var(--ls-text-muted)", marginTop: 2 }}>
                {distri.role === "admin" ? "Administrateur" : distri.role === "referent" ? "Référent" : "Distributeur"}
                {distri.title ? ` · ${distri.title}` : ""}
              </div>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            style={{
              background: "transparent",
              border: "none",
              fontSize: 22,
              color: "var(--ls-text-muted)",
              cursor: "pointer",
              lineHeight: 1,
              padding: 4,
            }}
          >
            ×
          </button>
        </div>

        <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 18 }}>
          {/* KPIs */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
              gap: 10,
            }}
          >
            <KpiCell label="Clients" value={stats.totalClients} tone="gold" />
            <KpiCell label="Actifs" value={stats.lifecycleCounts.active} tone="teal" />
            <KpiCell label="En pause" value={stats.lifecycleCounts.paused} tone="purple" />
            <KpiCell label="Bilans ce mois" value={stats.bilansMois} tone="coral" />
          </div>

          {/* PV 6 mois */}
          <div>
            <div
              style={{
                fontSize: 10,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                fontWeight: 700,
                color: "var(--ls-text-hint)",
                marginBottom: 8,
              }}
            >
              PV personnel · 6 derniers mois
            </div>
            <div
              style={{
                display: "flex",
                gap: 6,
                alignItems: "flex-end",
                height: 120,
                padding: "10px",
                background: "var(--ls-surface2)",
                borderRadius: 10,
                border: "0.5px solid var(--ls-border)",
              }}
            >
              {pvByMonth.map((m, idx) => {
                const isCurrent = idx === pvByMonth.length - 1;
                const heightPct = (m.total / pvMaxMonth) * 100;
                return (
                  <div
                    key={`${m.monthLabel}-${idx}`}
                    style={{
                      flex: 1,
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: 4,
                      height: "100%",
                    }}
                  >
                    <div
                      style={{
                        fontSize: 10,
                        fontWeight: 600,
                        color: isCurrent ? "var(--ls-gold)" : "var(--ls-text-muted)",
                      }}
                    >
                      {m.total > 0 ? m.total.toLocaleString("fr-FR") : ""}
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
                          height: `${Math.max(heightPct, 2)}%`,
                          background: isCurrent
                            ? "linear-gradient(180deg, var(--ls-gold), color-mix(in srgb, var(--ls-gold) 70%, var(--ls-coral)))"
                            : "color-mix(in srgb, var(--ls-gold) 25%, var(--ls-surface))",
                          borderRadius: "4px 4px 0 0",
                          transition: "height 400ms ease",
                        }}
                      />
                    </div>
                    <div
                      style={{
                        fontSize: 9,
                        color: "var(--ls-text-hint)",
                        textTransform: "uppercase",
                        letterSpacing: 0.5,
                      }}
                    >
                      {m.monthLabel}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Top clients */}
          <div>
            <div
              style={{
                fontSize: 10,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                fontWeight: 700,
                color: "var(--ls-text-hint)",
                marginBottom: 8,
              }}
            >
              Top 3 clients ce mois (par PV)
            </div>
            {topClientsByPv.length === 0 ? (
              <div
                style={{
                  padding: "12px 14px",
                  fontSize: 12,
                  color: "var(--ls-text-muted)",
                  background: "var(--ls-surface2)",
                  borderRadius: 9,
                  fontStyle: "italic",
                }}
              >
                Aucune commande client ce mois.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {topClientsByPv.map((c, idx) => (
                  <div
                    key={c.clientId}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: "8px 12px",
                      background: "var(--ls-surface2)",
                      border: "0.5px solid var(--ls-border)",
                      borderRadius: 9,
                    }}
                  >
                    <span
                      style={{
                        width: 22,
                        height: 22,
                        borderRadius: "50%",
                        background: idx === 0 ? "var(--ls-gold)" : "var(--ls-surface)",
                        color: idx === 0 ? "var(--ls-bg)" : "var(--ls-text-muted)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 11,
                        fontWeight: 700,
                        fontFamily: "Syne, sans-serif",
                        flexShrink: 0,
                      }}
                    >
                      {idx + 1}
                    </span>
                    <div style={{ flex: 1, fontSize: 13, color: "var(--ls-text)" }}>
                      {c.name}
                    </div>
                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: 700,
                        color: "var(--ls-gold)",
                        fontFamily: "Syne, sans-serif",
                      }}
                    >
                      {c.pv.toLocaleString("fr-FR")} PV
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Lifecycle breakdown */}
          <div>
            <div
              style={{
                fontSize: 10,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                fontWeight: 700,
                color: "var(--ls-text-hint)",
                marginBottom: 8,
              }}
            >
              Répartition lifecycle
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {[
                { id: "active", label: "Actifs", tone: "teal" },
                { id: "not_started", label: "Pas démarrés", tone: "gold" },
                { id: "paused", label: "En pause", tone: "purple" },
                { id: "stopped", label: "Arrêtés", tone: "coral" },
                { id: "lost", label: "Perdus", tone: "coral" },
                { id: "fragile", label: "⚠ Fragiles", tone: "coral" },
              ].map((lc) => {
                const count =
                  stats.lifecycleCounts[lc.id as LifecycleStatus | "fragile"] ?? 0;
                if (count === 0) return null;
                return (
                  <div
                    key={lc.id}
                    style={{
                      padding: "6px 12px",
                      background: `color-mix(in srgb, var(--ls-${lc.tone}) 12%, transparent)`,
                      border: `0.5px solid color-mix(in srgb, var(--ls-${lc.tone}) 35%, transparent)`,
                      borderRadius: 7,
                      fontSize: 11,
                      fontFamily: "DM Sans, sans-serif",
                    }}
                  >
                    <span style={{ color: `var(--ls-${lc.tone})`, fontWeight: 700, marginRight: 5 }}>
                      {count}
                    </span>
                    <span style={{ color: "var(--ls-text-muted)" }}>{lc.label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: "12px 16px",
            borderTop: "0.5px solid var(--ls-border)",
            background: "var(--ls-surface2)",
            display: "flex",
            justifyContent: "space-between",
            gap: 8,
            flexWrap: "wrap",
          }}
        >
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: "8px 14px",
              background: "transparent",
              border: "0.5px solid var(--ls-border)",
              borderRadius: 8,
              fontSize: 12,
              color: "var(--ls-text-muted)",
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            Fermer
          </button>
          <button
            type="button"
            onClick={onGoToClients}
            style={{
              padding: "8px 16px",
              background: "linear-gradient(135deg, var(--ls-gold), color-mix(in srgb, var(--ls-gold) 70%, var(--ls-coral)))",
              border: "none",
              borderRadius: 8,
              fontSize: 12,
              color: "white",
              fontWeight: 700,
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            Voir ses clients →
          </button>
        </div>
      </div>
    </div>
  );
}

function KpiCell({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "gold" | "teal" | "purple" | "coral";
}) {
  return (
    <div
      style={{
        padding: "12px 14px",
        background: "var(--ls-surface2)",
        border: `0.5px solid color-mix(in srgb, var(--ls-${tone}) 30%, transparent)`,
        borderTop: `2px solid var(--ls-${tone})`,
        borderRadius: 10,
      }}
    >
      <div
        style={{
          fontSize: 9,
          letterSpacing: 1.5,
          textTransform: "uppercase",
          fontWeight: 600,
          color: "var(--ls-text-hint)",
          marginBottom: 4,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontFamily: "Syne, sans-serif",
          fontSize: 22,
          fontWeight: 700,
          color: `var(--ls-${tone})`,
          lineHeight: 1,
        }}
      >
        {value}
      </div>
    </div>
  );
}
