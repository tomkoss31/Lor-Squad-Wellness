import { useEffect, useMemo, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { buildPvTrackingRecords } from "../data/mockPvModule";
import { formatDate } from "../lib/calculations";
import { PvClientFullPage } from "../components/pv/PvClientFullPage";
import { useAppContext } from "../context/AppContext";
import type { PvClientTrackingRecord } from "../types/pv";

export function PvClientsPage() {
  const { currentUser, clients, visibleClients, pvTransactions, pvClientProducts } = useAppContext();
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "ok" | "relaunch" | "overdue">("all");
  const [responsibleFilter, setResponsibleFilter] = useState(
    currentUser?.role === "admin" ? searchParams.get("responsable") ?? "all" : "all"
  );
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);

  if (!currentUser) return null;

  const isAdmin = currentUser.role === "admin";
  const sourceClients = isAdmin ? clients : visibleClients;

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

  // Stats globales (sur records non filtrés)
  const stats = useMemo(() => {
    const now = new Date();
    const monthlyPv = records.reduce((sum, r) => sum + (r.monthlyPv ?? 0), 0);
    const overdue = records.filter((r) => r.status === "restock" || r.status === "inconsistent").length;
    const toRelaunch = records.filter((r) => r.status === "watch" || r.status === "follow-up").length;
    return {
      totalClients: records.length,
      pvMonth: monthlyPv,
      toRelaunch,
      overdue,
      now,
    };
  }, [records]);

  // Sync URL
  const selectedRecord =
    filteredRecords.find((r) => r.clientId === selectedClientId) ?? null;

  useEffect(() => {
    const queryClientId = searchParams.get("client");
    if (queryClientId && records.some((r) => r.clientId === queryClientId)) {
      setSelectedClientId(queryClientId);
    }
  }, [records, searchParams]);

  function handleSelectClient(clientId: string) {
    setSelectedClientId(clientId);
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set("client", clientId);
    setSearchParams(nextParams, { replace: true });
  }

  function handleCloseDetails() {
    setSelectedClientId(null);
    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete("client");
    setSearchParams(nextParams, { replace: true });
  }

  function handleResponsibleChange(value: string) {
    setResponsibleFilter(value);
    const nextParams = new URLSearchParams(searchParams);
    if (value === "all") nextParams.delete("responsable");
    else nextParams.set("responsable", value);
    setSearchParams(nextParams, { replace: true });
  }

  // ─── Vue FICHE pleine page ────────────────────────────────────────
  if (selectedClientId && selectedRecord) {
    return (
      <div style={{ padding: "clamp(16px, 4vw, 28px)", maxWidth: 1200, margin: "0 auto" }}>
        <PvClientFullPage record={selectedRecord} onClose={handleCloseDetails} />
      </div>
    );
  }

  // ─── Vue TABLEAU ─────────────────────────────────────────────────
  return (
    <div style={{ padding: "clamp(16px, 4vw, 28px)", maxWidth: 1200, margin: "0 auto" }}>
      <PvPageHeader totalClients={filteredRecords.length} />

      <PvStatsGrid stats={stats} />

      {/* Filtre portefeuille admin */}
      {isAdmin && responsibleOptions.length > 1 && (
        <div style={{ marginBottom: 14 }}>
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

      <PvSearchFilters
        search={search}
        onSearchChange={setSearch}
        status={statusFilter}
        onStatusChange={(v) => setStatusFilter(v as typeof statusFilter)}
      />

      <PvClientsTable records={filteredRecords} onSelect={handleSelectClient} />

      {filteredRecords.length === 0 && (
        <div style={{ marginTop: 16, padding: "32px 20px", textAlign: "center", color: "var(--ls-text-hint)", fontSize: 13, background: "var(--ls-surface)", border: "1px solid var(--ls-border)", borderRadius: 14 }}>
          Aucun client ne correspond aux filtres en cours.
        </div>
      )}
    </div>
  );
}

// ─── Sous-composants ────────────────────────────────────────────────
function PvPageHeader({ totalClients }: { totalClients: number }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ fontSize: 9, letterSpacing: "2px", textTransform: "uppercase", color: "var(--ls-text-hint)", fontWeight: 500, marginBottom: 6, fontFamily: "DM Sans, sans-serif" }}>
        Suivi PV
      </div>
      <h1 style={{ fontFamily: "Syne, sans-serif", fontWeight: 800, fontSize: "clamp(20px, 4vw, 26px)", color: "var(--ls-text)", margin: "0 0 6px", letterSpacing: "-0.3px" }}>
        Vue globale des clients actifs
      </h1>
      <p style={{ fontSize: 13, color: "var(--ls-text-muted)", margin: 0 }}>
        {totalClients} client{totalClients > 1 ? "s" : ""} en programme — clique sur un client pour voir ses produits
      </p>
    </div>
  );
}

function PvStatsGrid({ stats }: { stats: { totalClients: number; pvMonth: number; toRelaunch: number; overdue: number } }) {
  const cards = [
    { label: "Clients actifs", value: stats.totalClients, color: "var(--ls-text)", border: "var(--ls-border2)" },
    { label: "PV ce mois", value: stats.pvMonth.toFixed(0), color: "var(--ls-teal)", border: "#0D9488" },
    { label: "À relancer", value: stats.toRelaunch, color: "var(--ls-gold)", border: "#B8922A" },
    { label: "En retard", value: stats.overdue, color: "var(--ls-coral)", border: "#DC2626" },
  ];
  return (
    <div className="pv-stats-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr) auto", gap: 12, marginBottom: 16 }}>
      {cards.map(({ label, value, color, border }) => (
        <div key={label} style={{ background: "var(--ls-surface)", border: "1px solid var(--ls-border)", borderTop: `2px solid ${border}`, borderRadius: 14, padding: "14px 16px" }}>
          <div style={{ fontSize: 9, letterSpacing: "2px", textTransform: "uppercase", color: "var(--ls-text-hint)", fontWeight: 500, marginBottom: 6, fontFamily: "DM Sans, sans-serif" }}>
            {label}
          </div>
          <div style={{ fontFamily: "Syne, sans-serif", fontWeight: 800, fontSize: 22, color }}>
            {value}
          </div>
        </div>
      ))}
      <Link
        to="/pv/orders?type=commande"
        style={{
          padding: "0 20px", border: "none", background: "var(--ls-gold)",
          color: "#fff", borderRadius: 14, fontFamily: "Syne, sans-serif",
          fontSize: 13, fontWeight: 700, cursor: "pointer",
          display: "flex", alignItems: "center", gap: 8,
          boxShadow: "0 2px 8px rgba(184,146,42,0.25)",
          whiteSpace: "nowrap", textDecoration: "none",
        }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
        Ajouter une commande
      </Link>
    </div>
  );
}

function PvSearchFilters({ search, onSearchChange, status, onStatusChange }: { search: string; onSearchChange: (s: string) => void; status: string; onStatusChange: (s: string) => void }) {
  return (
    <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
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

function PvClientsTable({ records, onSelect }: { records: PvClientTrackingRecord[]; onSelect: (id: string) => void }) {
  return (
    <div style={{ background: "var(--ls-surface)", border: "1px solid var(--ls-border)", borderRadius: 14, overflow: "hidden" }}>
      {/* Header */}
      <div className="pv-table-header" style={{ display: "flex", padding: "12px 16px", borderBottom: "1px solid var(--ls-border)", background: "var(--ls-surface2)" }}>
        <div style={{ flex: 2, fontSize: 9, letterSpacing: "2px", textTransform: "uppercase", color: "var(--ls-text-hint)", fontWeight: 500 }}>Client</div>
        <div className="pv-col-hide-mobile" style={{ flex: 1.5, fontSize: 9, letterSpacing: "2px", textTransform: "uppercase", color: "var(--ls-text-hint)", fontWeight: 500 }}>Programme</div>
        <div style={{ flex: 1, fontSize: 9, letterSpacing: "2px", textTransform: "uppercase", color: "var(--ls-text-hint)", fontWeight: 500 }}>PV cumulés</div>
        <div className="pv-col-hide-mobile" style={{ flex: 1, fontSize: 9, letterSpacing: "2px", textTransform: "uppercase", color: "var(--ls-text-hint)", fontWeight: 500 }}>Jours</div>
        <div style={{ width: 90, fontSize: 9, letterSpacing: "2px", textTransform: "uppercase", color: "var(--ls-text-hint)", fontWeight: 500 }}>Statut</div>
      </div>

      {records.map((r, i) => {
        const statusInfo = getStatusInfo(r.status);
        return (
          <div
            key={r.clientId}
            onClick={() => onSelect(r.clientId)}
            onMouseEnter={(e) => { e.currentTarget.style.background = "var(--ls-surface2)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
            style={{
              display: "flex", alignItems: "center",
              padding: "13px 16px",
              borderBottom: i < records.length - 1 ? "1px solid var(--ls-border)" : "none",
              cursor: "pointer", transition: "background 0.15s",
            }}
          >
            <div style={{ flex: 2, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 500, color: "var(--ls-text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {r.clientName}
              </div>
              <div style={{ fontSize: 11, color: "var(--ls-text-hint)", marginTop: 2 }}>
                Suivi le {formatDate(r.lastFollowUpDate)} · {r.activeProducts?.length ?? 0} produit{(r.activeProducts?.length ?? 0) > 1 ? "s" : ""}
              </div>
            </div>
            <div className="pv-col-hide-mobile" style={{ flex: 1.5, fontSize: 12, color: "var(--ls-text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", paddingRight: 8 }}>
              {r.program ?? "—"}
            </div>
            <div style={{ flex: 1, fontFamily: "Syne, sans-serif", fontSize: 14, fontWeight: 700, color: "var(--ls-text)" }}>
              {(r.pvCumulative ?? 0).toFixed(0)}
            </div>
            <div className="pv-col-hide-mobile" style={{ flex: 1, fontSize: 12, color: r.daysSinceStart > 60 ? "var(--ls-coral)" : r.daysSinceStart > 30 ? "var(--ls-gold)" : "var(--ls-text-muted)" }}>
              {r.daysSinceStart ?? 0} j
            </div>
            <div style={{ width: 90 }}>
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
