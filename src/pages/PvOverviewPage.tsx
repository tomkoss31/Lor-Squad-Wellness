import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { buildPvTrackingRecords } from "../data/pvCatalog";
import { formatDate } from "../lib/calculations";
// PvModuleHeader remplace par PremiumHero (2026-04-29)
import { PremiumHero } from "../components/ui/PremiumHero";
import { LegalFooter } from "../components/ui/LegalFooter";
import { PvClientFullPage } from "../components/pv/PvClientFullPage";
import { PvActionPlanCard } from "../components/copilote/PvActionPlanCard";
import { PvKanban } from "../components/pv/PvKanban";
import { usePvActionPlan } from "../hooks/usePvActionPlan";
import { usePvCheckedTracker } from "../hooks/usePvCheckedTracker";
import { usePvColumnOverride } from "../hooks/usePvColumnOverride";
import { useAppContext } from "../context/AppContext";
import type { PvClientTrackingRecord } from "../types/pv";

export function PvOverviewPage() {
  const { currentUser, clients, visibleClients, pvTransactions, pvClientProducts } = useAppContext();
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "ok" | "relaunch" | "overdue">("all");
  // Filtre responsable (2026-04-29) : par defaut admin filtre sur LUI-MEME
  // (= "Thomas voit Thomas direct, pas tout l'arbre"). Override possible via
  // query param ?responsable=X (drilldown Analytics) ou via le selecteur UI.
  const [responsibleFilter, setResponsibleFilter] = useState(() => {
    const fromQuery = searchParams.get("responsable");
    if (fromQuery) return fromQuery;
    if (currentUser?.role === "admin") return currentUser?.id ?? "all";
    return "all"; // distri normaux ne voient deja que les leurs (visibleClients)
  });
  const [selectedClientId, setSelectedClientId] = useState<string | null>(
    searchParams.get("client")
  );

  // Sync inverse (2026-04-29) : si l'URL change vers /pv?client=X via un Link
  // interne (ex: depuis Plan PV en haut), on update selectedClientId pour
  // ouvrir la fiche. Sans ca, le composant ne re-mount pas et state reste null.
  useEffect(() => {
    const fromUrl = searchParams.get("client");
    if (fromUrl !== selectedClientId) {
      setSelectedClientId(fromUrl);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // Toggle Liste / Kanban (2026-04-29) — persiste en localStorage
  const [viewMode, setViewMode] = useState<"list" | "kanban">(() => {
    if (typeof window === "undefined") return "list";
    const stored = window.localStorage.getItem("lor-squad-pv-view-mode");
    return stored === "kanban" ? "kanban" : "list";
  });
  function handleViewModeChange(mode: "list" | "kanban") {
    setViewMode(mode);
    try {
      window.localStorage.setItem("lor-squad-pv-view-mode", mode);
    } catch {
      // ignore quota errors
    }
  }
  // Plan PV (utile a la fois pour l'encart en haut + pour categoriser le kanban)
  const planQuery = usePvActionPlan(currentUser?.id ?? null);

  // Tracker "verifie PV" (2026-04-29) : marque chaque ouverture de fiche
  // pour afficher un badge "vu" sur la liste + kanban.
  const { isChecked, markChecked } = usePvCheckedTracker();

  // Override manuel des colonnes Kanban (2026-04-29) : permet de forcer
  // un client en "OK" meme si le calcul auto dit "A relancer".
  const { getOverride, setOverride, clearOverride } = usePvColumnOverride();
  useEffect(() => {
    if (selectedClientId) markChecked(selectedClientId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedClientId]);

  // Hooks AVANT l'early return (rules-of-hooks / chantier nuit 2026-04-20).
  const isAdmin = currentUser?.role === "admin";
  // Chantier tri priorité (2026-04-24) : l'admin voit TOUS les clients
  // de l'arborescence, mais les siens sont triés EN PREMIER dans la
  // liste. Plus de toggle. Free PV tracking exclus comme avant.
  const sourceClients = useMemo(
    () => {
      const base = isAdmin ? clients : visibleClients;
      const filtered = base.filter((c) => !c.freePvTracking);
      if (isAdmin && currentUser?.id) {
        return [...filtered].sort((a, b) => {
          const aMine = a.distributorId === currentUser.id ? 0 : 1;
          const bMine = b.distributorId === currentUser.id ? 0 : 1;
          if (aMine !== bMine) return aMine - bMine;
          return (a.lastName || "").localeCompare(b.lastName || "", "fr");
        });
      }
      return filtered;
    },
    [isAdmin, currentUser?.id, clients, visibleClients]
  );

  const records = useMemo(
    () => buildPvTrackingRecords(sourceClients, pvTransactions, pvClientProducts),
    [pvClientProducts, pvTransactions, sourceClients]
  );

  const responsibleOptions = useMemo(
    () => [...new Map(records.map((r) => [r.responsibleId, r.responsibleName])).entries()].map(([id, name]) => ({ id, name })),
    [records]
  );

  const filteredRecords = useMemo(
    () =>
      records.filter((r) => {
        const s = search.trim().toLowerCase();
        const matchesSearch = !s || `${r.clientName} ${r.program} ${r.responsibleName}`.toLowerCase().includes(s);
        const matchesResponsible = !isAdmin || responsibleFilter === "all" || r.responsibleId === responsibleFilter;
        const matchesStatus =
          statusFilter === "all"
            ? true
            : statusFilter === "overdue"
              ? r.status === "restock" || r.status === "inconsistent"
              : statusFilter === "relaunch"
                ? r.status === "watch" || r.status === "follow-up"
                : r.status === "ok";
        return matchesSearch && matchesResponsible && matchesStatus;
      }),
    [records, search, statusFilter, responsibleFilter, isAdmin]
  );

  const stats = useMemo(() => {
    const monthlyPv = records.reduce((sum, r) => sum + (r.monthlyPv ?? 0), 0);
    const overdue = records.filter((r) => r.status === "restock" || r.status === "inconsistent").length;
    const toRelaunch = records.filter((r) => r.status === "watch" || r.status === "follow-up").length;
    return {
      totalClients: records.length,
      pvMonth: monthlyPv,
      toRelaunch,
      overdue,
    };
  }, [records]);

  // Record synthetique fallback (2026-04-29) : si le client est dans la base
  // mais sans record (pas started / pas de programme) — typiquement ceux de
  // la section "Silencieux a recontacter" du Plan PV — on construit un record
  // vide pour que PvClientFullPage puisse s'ouvrir et permettre une 1ere
  // commande quand meme.
  const selectedRecord = useMemo<PvClientTrackingRecord | null>(() => {
    if (!selectedClientId) return null;
    const found = records.find((r) => r.clientId === selectedClientId);
    if (found) return found;
    // Fallback : cherche le client dans la base
    const client = clients.find((c) => c.id === selectedClientId);
    if (!client) return null;
    return {
      clientId: client.id,
      clientName: `${client.firstName} ${client.lastName}`,
      responsibleId: client.distributorId,
      responsibleName: client.distributorName,
      programId: "",
      program: client.currentProgram || "Pas encore demarre",
      status: "ok" as const,
      startDate: client.startDate ?? new Date().toISOString(),
      lastFollowUpDate: new Date().toISOString(),
      lastOrderDate: client.startDate ?? new Date().toISOString(),
      daysSinceStart: 0,
      estimatedRemainingDays: 0,
      nextProbableOrderDate: new Date().toISOString(),
      pvCumulative: 0,
      monthlyPv: 0,
      activeProducts: [],
      transactions: [],
    };
  }, [records, clients, selectedClientId]);

  // Sync ?client= avec selectedClientId
  useEffect(() => {
    const next = new URLSearchParams(searchParams);
    if (selectedClientId) next.set("client", selectedClientId);
    else next.delete("client");
    setSearchParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedClientId]);

  function handleResponsibleChange(value: string) {
    setResponsibleFilter(value);
    const next = new URLSearchParams(searchParams);
    if (value === "all") next.delete("responsable");
    else next.set("responsable", value);
    setSearchParams(next, { replace: true });
  }

  // Early return APRÈS les hooks.
  if (!currentUser) return null;

  return (
    <div style={{ padding: "clamp(16px, 4vw, 28px)", maxWidth: 1200, margin: "0 auto", display: "flex", flexDirection: "column", gap: 20 }}>
      <PremiumHero
        identity="gold"
        eyebrow={`Suivi PV · ${stats.totalClients} client${stats.totalClients > 1 ? "s" : ""} actif${stats.totalClients > 1 ? "s" : ""}`}
        titleAccent="Ton suivi"
        titleSuffix=" PV 🎯"
        subtitle="Gere les commandes, les cures et les relances client par client."
      />

      {/* Plan d'action PV (déplacé du Co-pilote, 2026-04-29) — toujours
          visible ici car c'est l'endroit naturel pour piloter le volume.
          Sur le dashboard, seul un bandeau alerte conditionnel subsiste. */}
      {!selectedClientId && currentUser?.id ? (
        <PvActionPlanCard userId={currentUser.id} />
      ) : null}

      {/* Vue FICHE pleine page */}
      {selectedClientId && selectedRecord && (
        <PvClientFullPage record={selectedRecord} onClose={() => setSelectedClientId(null)} />
      )}

      {/* Vue TABLEAU */}
      {(!selectedClientId || !selectedRecord) && (
        <>
          <PvStatsGrid stats={stats} />

          {isAdmin && responsibleOptions.length > 1 && (
            <div>
              <select
                value={responsibleFilter}
                onChange={(e) => handleResponsibleChange(e.target.value)}
                style={{
                  padding: "10px 14px", borderRadius: 10,
                  border: "1px solid var(--ls-border)", background: "var(--ls-input-bg)",
                  color: "var(--ls-text-muted)", fontSize: 13, fontFamily: "DM Sans, sans-serif",
                  cursor: "pointer", minWidth: 220, outline: "none",
                }}
              >
                <option value="all">Tous les portefeuilles</option>
                {responsibleOptions.map((o) => (
                  <option key={o.id} value={o.id}>{o.name}</option>
                ))}
              </select>
            </div>
          )}

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
            <PvSearchFilters
              search={search}
              onSearchChange={setSearch}
              status={statusFilter}
              onStatusChange={(v) => setStatusFilter(v as typeof statusFilter)}
            />
            {/* Toggle Liste / Kanban (2026-04-29) */}
            <div
              style={{
                display: "inline-flex",
                gap: 2,
                padding: 3,
                background: "var(--ls-surface2)",
                border: "0.5px solid var(--ls-border)",
                borderRadius: 10,
                flexShrink: 0,
              }}
            >
              <button
                type="button"
                onClick={() => handleViewModeChange("list")}
                aria-pressed={viewMode === "list"}
                title="Vue liste"
                style={{
                  padding: "6px 12px",
                  borderRadius: 7,
                  border: "none",
                  fontSize: 11,
                  fontWeight: 500,
                  cursor: "pointer",
                  background: viewMode === "list" ? "var(--ls-surface)" : "transparent",
                  color: viewMode === "list" ? "var(--ls-text)" : "var(--ls-text-muted)",
                  boxShadow: viewMode === "list" ? "0 1px 3px rgba(0,0,0,0.06)" : "none",
                  fontFamily: "DM Sans, sans-serif",
                }}
              >
                ☰ Liste
              </button>
              <button
                type="button"
                onClick={() => handleViewModeChange("kanban")}
                aria-pressed={viewMode === "kanban"}
                title="Vue Kanban"
                style={{
                  padding: "6px 12px",
                  borderRadius: 7,
                  border: "none",
                  fontSize: 11,
                  fontWeight: 500,
                  cursor: "pointer",
                  background: viewMode === "kanban" ? "var(--ls-surface)" : "transparent",
                  color: viewMode === "kanban" ? "var(--ls-text)" : "var(--ls-text-muted)",
                  boxShadow: viewMode === "kanban" ? "0 1px 3px rgba(0,0,0,0.06)" : "none",
                  fontFamily: "DM Sans, sans-serif",
                }}
              >
                ⚏ Kanban
              </button>
            </div>
          </div>

          {viewMode === "list" ? (
            <PvClientsTable
              records={filteredRecords}
              selectedId={selectedClientId}
              onSelect={setSelectedClientId}
              isAdmin={isAdmin}
              currentUserId={currentUser?.id ?? null}
              isChecked={isChecked}
            />
          ) : (
            <PvKanban
              records={filteredRecords}
              plan={planQuery.data}
              isAdmin={isAdmin}
              currentUserId={currentUser?.id ?? null}
              onSelectClient={setSelectedClientId}
              isChecked={isChecked}
              getOverride={getOverride}
              setOverride={setOverride}
              clearOverride={clearOverride}
            />
          )}

          {viewMode === "list" && filteredRecords.length === 0 && (
            <div style={{ padding: "32px 20px", textAlign: "center", color: "var(--ls-text-hint)", fontSize: 13, background: "var(--ls-surface)", border: "1px solid var(--ls-border)", borderRadius: 14 }}>
              Aucun client ne correspond aux filtres en cours.
            </div>
          )}
        </>
      )}
      <LegalFooter />
    </div>
  );
}

// ─── Sous-composants ────────────────────────────────────────────────────

function PvStatsGrid({ stats }: { stats: { totalClients: number; pvMonth: number; toRelaunch: number; overdue: number } }) {
  const cards = [
    { label: "Clients actifs", value: stats.totalClients, borderColor: "transparent", textColor: "var(--ls-text)" },
    { label: "PV ce mois", value: stats.pvMonth.toFixed(0), borderColor: "#0D9488", textColor: "var(--ls-teal)" },
    { label: "À relancer", value: stats.toRelaunch, borderColor: "#B8922A", textColor: "var(--ls-gold)" },
    { label: "En retard", value: stats.overdue, borderColor: "#DC2626", textColor: "var(--ls-coral)" },
  ];
  return (
    <div className="pv-stats-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
      {cards.map(({ label, value, borderColor, textColor }) => (
        <div key={label} style={{
          background: "var(--ls-surface)",
          border: "1px solid var(--ls-border)",
          borderTop: borderColor !== "transparent" ? `2px solid ${borderColor}` : "1px solid var(--ls-border)",
          borderRadius: 14,
          padding: "14px 16px",
        }}>
          <div style={{ fontSize: 9, letterSpacing: "2px", textTransform: "uppercase", color: "var(--ls-text-hint)", fontWeight: 500, marginBottom: 6, fontFamily: "DM Sans, sans-serif" }}>
            {label}
          </div>
          <div style={{ fontFamily: "Syne, sans-serif", fontWeight: 800, fontSize: 22, color: textColor, lineHeight: 1 }}>
            {value}
          </div>
        </div>
      ))}
    </div>
  );
}

function PvSearchFilters({ search, onSearchChange, status, onStatusChange }: { search: string; onSearchChange: (s: string) => void; status: string; onStatusChange: (s: string) => void }) {
  return (
    <div className="pv-filters" style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
      <div style={{ flex: 1, position: "relative", minWidth: 200 }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--ls-text-hint)" strokeWidth="1.5"
          style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)" }}>
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Rechercher un client..."
          style={{
            width: "100%", padding: "11px 14px 11px 36px",
            border: "1px solid var(--ls-border)", borderRadius: 10,
            fontFamily: "DM Sans, sans-serif", fontSize: 14,
            background: "var(--ls-input-bg)", color: "var(--ls-text)",
            outline: "none",
          }}
        />
      </div>
      <select
        value={status}
        onChange={(e) => onStatusChange(e.target.value)}
        style={{
          padding: "11px 14px", border: "1px solid var(--ls-border)",
          borderRadius: 10, fontFamily: "DM Sans, sans-serif", fontSize: 13,
          background: "var(--ls-input-bg)", color: "var(--ls-text-muted)",
          outline: "none", cursor: "pointer", minWidth: 180,
        }}
      >
        <option value="all">Tous les statuts</option>
        <option value="ok">OK</option>
        <option value="relaunch">À relancer</option>
        <option value="overdue">En retard</option>
      </select>
    </div>
  );
}

function PvClientsTable({ records, selectedId, onSelect, isAdmin, currentUserId, isChecked }: { records: PvClientTrackingRecord[]; selectedId: string | null; onSelect: (id: string) => void; isAdmin: boolean; currentUserId: string | null; isChecked: (clientId: string) => boolean }) {
  return (
    <div style={{ background: "var(--ls-surface)", border: "1px solid var(--ls-border)", borderRadius: 14, overflow: "hidden" }}>
      <div className="pv-table-header" style={{ display: "flex", padding: "12px 16px", borderBottom: "1px solid var(--ls-border)", background: "var(--ls-surface2)" }}>
        <div style={{ flex: 2, fontSize: 9, letterSpacing: "2px", textTransform: "uppercase", color: "var(--ls-text-hint)", fontWeight: 500 }}>Client</div>
        <div style={{ flex: 1.5, fontSize: 9, letterSpacing: "2px", textTransform: "uppercase", color: "var(--ls-text-hint)", fontWeight: 500 }}>Programme</div>
        <div style={{ flex: 1, fontSize: 9, letterSpacing: "2px", textTransform: "uppercase", color: "var(--ls-text-hint)", fontWeight: 500 }}>PV cumulés</div>
        <div style={{ flex: 1, fontSize: 9, letterSpacing: "2px", textTransform: "uppercase", color: "var(--ls-text-hint)", fontWeight: 500 }}>Jours</div>
        <div style={{ width: 90, fontSize: 9, letterSpacing: "2px", textTransform: "uppercase", color: "var(--ls-text-hint)", fontWeight: 500 }}>Statut</div>
      </div>

      {records.map((r, i) => {
        const isSelected = r.clientId === selectedId;
        const statusInfo = getStatusInfo(r.status);
        return (
          <div
            key={r.clientId}
            className="pv-table-row"
            role="button"
            tabIndex={0}
            onClick={() => onSelect(r.clientId)}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(r.clientId); } }}
            onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.background = "var(--ls-surface2)"; }}
            onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.background = "transparent"; }}
            style={{
              display: "flex",
              alignItems: "center",
              padding: "13px 16px",
              borderBottom: i < records.length - 1 ? "1px solid var(--ls-border)" : "none",
              cursor: "pointer",
              transition: "all 0.15s",
              background: isSelected ? "rgba(184,146,42,0.06)" : "transparent",
              borderLeft: isSelected ? "3px solid var(--ls-gold)" : "3px solid transparent",
              paddingLeft: isSelected ? 13 : 16,
              gap: 8,
            }}
          >
            <div className="pv-cell-client" style={{ flex: 2, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: isSelected ? 600 : 500, color: isSelected ? "var(--ls-gold)" : "var(--ls-text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {r.clientName}
                </span>
                {/* Chantier tri priorité (2026-04-24) : badge MIEN admin */}
                {isAdmin && r.responsibleId === currentUserId ? (
                  <span
                    title="Ton client"
                    style={{
                      padding: "1px 6px",
                      borderRadius: 8,
                      fontSize: 9,
                      fontWeight: 700,
                      background: "rgba(239,159,39,0.14)",
                      color: "#BA7517",
                      flexShrink: 0,
                      letterSpacing: "0.04em",
                    }}
                  >
                    MIEN
                  </span>
                ) : null}
                {/* Badge "vu" PV (2026-04-29) : checke depuis localStorage <7j */}
                {isChecked(r.clientId) ? (
                  <span
                    title="Vérifié récemment (< 7j)"
                    style={{
                      padding: "1px 7px",
                      borderRadius: 8,
                      fontSize: 9,
                      fontWeight: 700,
                      background: "rgba(13,148,136,0.14)",
                      color: "var(--ls-teal)",
                      flexShrink: 0,
                      letterSpacing: "0.04em",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 3,
                    }}
                  >
                    ✓ VU
                  </span>
                ) : null}
              </div>
              <div style={{ fontSize: 11, color: "var(--ls-text-hint)", marginTop: 2 }}>
                Suivi le {formatDate(r.lastFollowUpDate)} · {r.activeProducts?.length ?? 0} produit{(r.activeProducts?.length ?? 0) > 1 ? "s" : ""}
              </div>
            </div>
            <div className="pv-cell-program" style={{ flex: 1.5, fontSize: 12, color: "var(--ls-text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", paddingRight: 8 }}>
              {r.program ?? "—"}
            </div>
            <div className="pv-cell-pv" style={{ flex: 1, fontFamily: "Syne, sans-serif", fontSize: 14, fontWeight: 700, color: isSelected ? "var(--ls-gold)" : "var(--ls-text)" }}>
              {(r.pvCumulative ?? 0).toFixed(0)}
            </div>
            <div className="pv-cell-days" style={{ flex: 1, fontSize: 12, color: r.daysSinceStart > 60 ? "var(--ls-coral)" : r.daysSinceStart > 30 ? "var(--ls-gold)" : "var(--ls-text-muted)" }}>
              {r.daysSinceStart ?? 0} j
            </div>
            <div className="pv-cell-status" style={{ width: 90 }}>
              <span style={{
                display: "inline-flex", alignItems: "center",
                padding: "3px 10px", borderRadius: 10,
                fontSize: 10, fontWeight: 600,
                background: statusInfo.bg, color: statusInfo.color,
              }}>
                {statusInfo.label}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function getStatusInfo(status: PvClientTrackingRecord["status"]) {
  switch (status) {
    case "restock":
    case "inconsistent":
      return { label: "Retard", bg: "rgba(220,38,38,0.1)", color: "var(--ls-coral)" };
    case "watch":
    case "follow-up":
      return { label: "À relancer", bg: "rgba(184,146,42,0.1)", color: "var(--ls-gold)" };
    case "ok":
    default:
      return { label: "OK", bg: "rgba(13,148,136,0.1)", color: "var(--ls-teal)" };
  }
}
