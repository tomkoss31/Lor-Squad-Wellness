import { useDeferredValue, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { PageHeading } from "../components/ui/PageHeading";
import { useAppContext } from "../context/AppContext";
import { getAccessibleOwnerIds } from "../lib/auth";
import {
  getActivePortfolioUsers,
  getPortfolioOwnerIds,
  getPortfolioMetrics,
  isRelanceFollowUp,
} from "../lib/portfolio";
import { formatDateTime } from "../lib/calculations";
import type { User, Client, LifecycleStatus } from "../types/domain";
import { LIFECYCLE_LABELS, LIFECYCLE_TONES } from "../types/domain";

export function ClientsPage() {
  const { currentUser, users, visibleClients, visibleFollowUps, setClientLifecycleStatus } = useAppContext();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | LifecycleStatus | "fragile">("all");
  const [ownerFilter, setOwnerFilter] = useState("all");
  const deferredSearch = useDeferredValue(search);

  // Chantier 5 — Batch lifecycle
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkStatus, setBulkStatus] = useState<LifecycleStatus>("stopped");
  const [bulkApplying, setBulkApplying] = useState(false);
  const [bulkFeedback, setBulkFeedback] = useState<string>("");

  function toggleClient(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAllVisible(ids: string[]) {
    setSelectedIds((prev) => {
      const allSelected = ids.every((id) => prev.has(id));
      if (allSelected) return new Set();
      return new Set(ids);
    });
  }

  async function handleBulkApply() {
    if (selectedIds.size === 0) return;
    setBulkApplying(true);
    setBulkFeedback("");
    const ids = Array.from(selectedIds);
    let ok = 0, fail = 0;
    for (const id of ids) {
      try {
        await setClientLifecycleStatus(id, bulkStatus);
        ok++;
      } catch {
        fail++;
      }
    }
    setBulkApplying(false);
    setSelectedIds(new Set());
    setBulkFeedback(
      fail === 0
        ? `✓ ${ok} client${ok > 1 ? "s" : ""} mis à jour`
        : `${ok} OK · ${fail} échec${fail > 1 ? "s" : ""}`
    );
    setTimeout(() => setBulkFeedback(""), 3500);
  }

  const portfolioUsers = useMemo(
    () => (currentUser ? getActivePortfolioUsers(users, visibleClients, currentUser) : []),
    [currentUser, users, visibleClients]
  );
  const ownerTabs = currentUser
    ? portfolioUsers.filter((user) => getAccessibleOwnerIds(currentUser, users).has(user.id))
    : [];
  const selectedOwner =
    ownerFilter === "all" ? null : ownerTabs.find((u) => u.id === ownerFilter) ?? null;
  const selectedOwnerIds =
    selectedOwner && currentUser
      ? getPortfolioOwnerIds(
          selectedOwner,
          users,
          selectedOwner.role === "referent" ? "network" : "personal"
        )
      : null;

  const normalizedSearch = deferredSearch.trim().toLowerCase();
  const filteredClients = useMemo(() => {
    return visibleClients.filter((client) => {
      const matchesOwner =
        ownerFilter === "all" || (selectedOwnerIds ? selectedOwnerIds.has(client.distributorId) : false);
      const effectiveLifecycle: LifecycleStatus = client.lifecycleStatus ?? (client.started ? "active" : "not_started");
      const matchesStatus =
        statusFilter === "all"
          ? true
          : statusFilter === "fragile"
            ? client.isFragile === true
            : effectiveLifecycle === statusFilter;
      const matchesSearch =
        !normalizedSearch ||
        `${client.firstName} ${client.lastName} ${client.city ?? ""} ${client.currentProgram}`
          .toLowerCase()
          .includes(normalizedSearch);
      return matchesOwner && matchesStatus && matchesSearch;
    });
  }, [normalizedSearch, ownerFilter, selectedOwnerIds, statusFilter, visibleClients]);

  // Relances visibles pour le filtre courant
  const visibleRelanceCount = useMemo(() => {
    const clientIds = new Set(filteredClients.map((c) => c.id));
    return visibleFollowUps.filter((fu) => clientIds.has(fu.clientId) && isRelanceFollowUp(fu)).length;
  }, [filteredClients, visibleFollowUps]);

  if (!currentUser) return null;

  return (
    <div style={{
      padding: "clamp(16px, 4vw, 28px)",
      maxWidth: 1200, margin: "0 auto",
      display: "flex", flexDirection: "column", gap: 18,
    }}>
      <PageHeading
        eyebrow="Clients"
        title="Base clients"
        description={`${filteredClients.length} dossier${filteredClients.length > 1 ? "s" : ""} · recherche, responsables et fiche détaillée.`}
      />

      {/* 3 STATS COMPACTES */}
      <div className="clients-stats-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
        {[
          { label: "Visibles", value: filteredClients.length, borderColor: "#0D9488", textColor: "var(--ls-teal)", sub: "Résultat du filtre" },
          { label: "Responsables", value: ownerTabs.length, borderColor: "#B8922A", textColor: "var(--ls-gold)", sub: "Portefeuilles actifs" },
          { label: "Relances", value: visibleRelanceCount, borderColor: "#DC2626", textColor: "var(--ls-coral)", sub: "À reprendre" },
        ].map(({ label, value, borderColor, textColor, sub }) => (
          <div key={label} style={{
            background: "var(--ls-surface)",
            border: "1px solid var(--ls-border)",
            borderTop: `2px solid ${borderColor}`,
            borderRadius: 14,
            padding: "14px 16px",
          }}>
            <div style={{ fontSize: 9, letterSpacing: "2px", textTransform: "uppercase", color: "var(--ls-text-hint)", fontWeight: 500, marginBottom: 6, fontFamily: "DM Sans, sans-serif" }}>
              {label}
            </div>
            <div style={{ fontFamily: "Syne, sans-serif", fontWeight: 800, fontSize: 22, color: textColor, lineHeight: 1, marginBottom: 4 }}>
              {value}
            </div>
            <div style={{ fontSize: 10, color: "var(--ls-text-hint)" }}>{sub}</div>
          </div>
        ))}
      </div>

      {/* BARRE RECHERCHE + FILTRE STATUT */}
      <div className="clients-search-bar" style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: 220, position: "relative" }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--ls-text-hint)" strokeWidth="1.5"
            style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)" }}>
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Nom, ville, programme..."
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
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as "all" | LifecycleStatus | "fragile")}
          style={{
            padding: "11px 14px", border: "1px solid var(--ls-border)",
            borderRadius: 10, fontFamily: "DM Sans, sans-serif", fontSize: 13,
            background: "var(--ls-input-bg)", color: "var(--ls-text-muted)",
            outline: "none", cursor: "pointer", minWidth: 180,
          }}
        >
          <option value="all">Tous les statuts</option>
          <option value="active">Actifs</option>
          <option value="not_started">Pas démarrés</option>
          <option value="paused">En pause</option>
          <option value="stopped">Arrêtés</option>
          <option value="lost">Perdus</option>
          <option value="fragile">⚠ Fragiles</option>
        </select>
      </div>

      {/* PILLS RESPONSABLES */}
      {ownerTabs.length > 0 && (
        <div>
          <div style={{ fontSize: 9, letterSpacing: "2px", textTransform: "uppercase", color: "var(--ls-text-hint)", fontWeight: 500, marginBottom: 8, fontFamily: "DM Sans, sans-serif" }}>
            Filtrer par responsable
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {/* Pill "Toute la base" */}
            <button
              onClick={() => setOwnerFilter("all")}
              style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                padding: "7px 12px", borderRadius: 20,
                background: ownerFilter === "all" ? "rgba(184,146,42,0.08)" : "var(--ls-surface)",
                border: ownerFilter === "all" ? "1px solid var(--ls-gold)" : "1px solid var(--ls-border)",
                color: ownerFilter === "all" ? "var(--ls-gold)" : "var(--ls-text-muted)",
                fontSize: 11, fontWeight: ownerFilter === "all" ? 600 : 400,
                cursor: "pointer", whiteSpace: "nowrap", fontFamily: "DM Sans, sans-serif",
                transition: "all 0.15s",
              }}
            >
              Toute la base · {visibleClients.length}
            </button>

            {ownerTabs.map((owner) => {
              const isActive = ownerFilter === owner.id;
              const ownerMetrics = getPortfolioMetrics(
                owner, visibleClients, visibleFollowUps, users,
                owner.role === "referent" ? "network" : "personal"
              );
              const avatar = getOwnerAvatarColors(owner.role);
              return (
                <button
                  key={owner.id}
                  onClick={() => setOwnerFilter(owner.id)}
                  style={{
                    display: "inline-flex", alignItems: "center", gap: 7,
                    padding: "6px 12px 6px 6px", borderRadius: 20,
                    background: isActive ? "rgba(184,146,42,0.08)" : "var(--ls-surface)",
                    border: isActive ? "1px solid var(--ls-gold)" : "1px solid var(--ls-border)",
                    color: isActive ? "var(--ls-gold)" : "var(--ls-text-muted)",
                    fontSize: 11, fontWeight: isActive ? 600 : 400,
                    cursor: "pointer", whiteSpace: "nowrap", fontFamily: "DM Sans, sans-serif",
                    transition: "all 0.15s",
                  }}
                >
                  <span style={{
                    width: 22, height: 22, borderRadius: "50%",
                    background: avatar.bg, color: avatar.text,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontFamily: "Syne, sans-serif", fontWeight: 800, fontSize: 9,
                  }}>
                    {getInitials(owner.name)}
                  </span>
                  {owner.name} · {ownerMetrics.clients.length}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* TOOLBAR BATCH LIFECYCLE (si au moins 1 sélectionné) */}
      {selectedIds.size > 0 && (
        <div style={{
          position: "sticky",
          top: 8,
          zIndex: 20,
          background: "var(--ls-surface)",
          border: "1.5px solid var(--ls-gold)",
          borderRadius: 12,
          padding: "12px 14px",
          display: "flex",
          alignItems: "center",
          gap: 10,
          flexWrap: "wrap",
          boxShadow: "0 6px 20px rgba(184,146,42,0.15)",
        }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ls-gold)", fontFamily: "DM Sans, sans-serif" }}>
            {selectedIds.size} sélectionné{selectedIds.size > 1 ? "s" : ""}
          </div>
          <span style={{ fontSize: 11, color: "var(--ls-text-muted)" }}>→ changer le statut en</span>
          <select
            value={bulkStatus}
            onChange={(e) => setBulkStatus(e.target.value as LifecycleStatus)}
            style={{
              padding: "8px 12px",
              border: "1px solid var(--ls-border)",
              borderRadius: 9,
              fontSize: 12,
              background: "var(--ls-input-bg)",
              color: "var(--ls-text)",
              fontFamily: "DM Sans, sans-serif",
              cursor: "pointer",
              outline: "none",
            }}
          >
            <option value="active">Actif</option>
            <option value="not_started">Pas démarré</option>
            <option value="paused">En pause</option>
            <option value="stopped">Arrêté</option>
            <option value="lost">Perdu</option>
          </select>
          <button
            type="button"
            onClick={() => void handleBulkApply()}
            disabled={bulkApplying}
            style={{
              padding: "8px 16px",
              border: "none",
              background: "var(--ls-gold)",
              color: "#fff",
              borderRadius: 9,
              fontSize: 12,
              fontWeight: 700,
              cursor: bulkApplying ? "wait" : "pointer",
              fontFamily: "Syne, sans-serif",
            }}
          >
            {bulkApplying ? "Application..." : "Appliquer"}
          </button>
          <button
            type="button"
            onClick={() => setSelectedIds(new Set())}
            style={{
              padding: "8px 12px",
              border: "1px solid var(--ls-border)",
              background: "transparent",
              color: "var(--ls-text-muted)",
              borderRadius: 9,
              fontSize: 11,
              cursor: "pointer",
              fontFamily: "DM Sans, sans-serif",
              marginLeft: "auto",
            }}
          >
            Désélectionner
          </button>
        </div>
      )}
      {bulkFeedback && (
        <div style={{
          padding: "8px 12px",
          borderRadius: 9,
          background: bulkFeedback.startsWith("✓") ? "rgba(13,148,136,0.08)" : "rgba(220,38,38,0.08)",
          border: bulkFeedback.startsWith("✓") ? "1px solid rgba(13,148,136,0.2)" : "1px solid rgba(220,38,38,0.2)",
          color: bulkFeedback.startsWith("✓") ? "var(--ls-teal)" : "var(--ls-coral)",
          fontSize: 12,
          fontFamily: "DM Sans, sans-serif",
        }}>
          {bulkFeedback}
        </div>
      )}

      {/* TABLEAU CLIENTS */}
      {filteredClients.length === 0 ? (
        <div style={{
          background: "var(--ls-surface)", border: "1px solid var(--ls-border)",
          borderRadius: 14, padding: "40px 20px",
          textAlign: "center", color: "var(--ls-text-hint)", fontSize: 13,
        }}>
          Aucun client sur ce filtre.
          <div style={{ marginTop: 12 }}>
            <Link to="/assessments/new" style={{ color: "var(--ls-gold)", textDecoration: "none", fontWeight: 600, fontSize: 13 }}>
              → Lancer un premier bilan
            </Link>
          </div>
        </div>
      ) : (
        <div style={{ background: "var(--ls-surface)", border: "1px solid var(--ls-border)", borderRadius: 14, overflow: "hidden" }}>
          {/* Header */}
          <div className="clients-table-header" style={{ display: "flex", alignItems: "center", padding: "12px 16px", borderBottom: "1px solid var(--ls-border)", background: "var(--ls-surface2)", gap: 8 }}>
            <input
              type="checkbox"
              checked={filteredClients.length > 0 && filteredClients.every((c) => selectedIds.has(c.id))}
              onChange={() => toggleAllVisible(filteredClients.map((c) => c.id))}
              title="Tout sélectionner"
              style={{ width: 16, height: 16, cursor: "pointer", accentColor: "var(--ls-gold)", flexShrink: 0 }}
            />
            <div style={{ flex: 2, fontSize: 9, letterSpacing: "2px", textTransform: "uppercase", color: "var(--ls-text-hint)", fontWeight: 500 }}>Client</div>
            <div style={{ flex: 1.5, fontSize: 9, letterSpacing: "2px", textTransform: "uppercase", color: "var(--ls-text-hint)", fontWeight: 500 }}>Programme</div>
            <div style={{ flex: 1, fontSize: 9, letterSpacing: "2px", textTransform: "uppercase", color: "var(--ls-text-hint)", fontWeight: 500 }}>Responsable</div>
            <div style={{ flex: 1.3, fontSize: 9, letterSpacing: "2px", textTransform: "uppercase", color: "var(--ls-text-hint)", fontWeight: 500 }}>Prochain suivi</div>
            <div style={{ width: 90, fontSize: 9, letterSpacing: "2px", textTransform: "uppercase", color: "var(--ls-text-hint)", fontWeight: 500 }}>Statut</div>
          </div>

          {filteredClients.map((client, i) => {
            const owner = users.find((u) => u.id === client.distributorId);
            const nextFollowUp = client.nextFollowUp;
            const statusInfo = getClientStatusInfo(client, nextFollowUp);
            const avatar = owner ? getOwnerAvatarColors(owner.role) : { bg: "var(--ls-surface2)", text: "var(--ls-text-muted)" };
            const isSelected = selectedIds.has(client.id);

            return (
              <div
                key={client.id}
                style={{
                  display: "flex", alignItems: "center",
                  padding: "0 0 0 16px",
                  borderBottom: i < filteredClients.length - 1 ? "1px solid var(--ls-border)" : "none",
                  background: isSelected ? "rgba(184,146,42,0.04)" : "transparent",
                }}
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={(e) => {
                    e.stopPropagation();
                    toggleClient(client.id);
                  }}
                  onClick={(e) => e.stopPropagation()}
                  style={{ width: 16, height: 16, cursor: "pointer", accentColor: "var(--ls-gold)", flexShrink: 0, marginRight: 8 }}
                />
              <Link
                to={`/clients/${client.id}`}
                className="clients-table-row"
                style={{
                  flex: 1,
                  display: "flex", alignItems: "center",
                  padding: "14px 16px 14px 0",
                  cursor: "pointer", transition: "all 0.15s",
                  background: "transparent",
                  textDecoration: "none", color: "inherit",
                  gap: 8, flexWrap: "wrap",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(184,146,42,0.06)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "transparent";
                }}
              >
                {/* Client */}
                <div className="clients-cell-client" style={{ flex: 2, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: "var(--ls-text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {client.firstName} {client.lastName}
                    </span>
                    {client.isFragile && (
                      <span
                        title="Client fragile"
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          padding: "1px 6px",
                          borderRadius: 8,
                          fontSize: 9,
                          fontWeight: 600,
                          background: "rgba(220,38,38,0.12)",
                          color: "var(--ls-coral)",
                          flexShrink: 0,
                        }}
                      >
                        ⚠
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--ls-text-hint)", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {client.city ?? "Non renseigné"}
                    {client.assessments?.length ? ` · ${client.assessments.length} bilan${client.assessments.length > 1 ? "s" : ""}` : ""}
                  </div>
                </div>

                {/* Programme */}
                <div className="clients-cell-program" style={{ flex: 1.5, fontSize: 12, color: "var(--ls-text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {client.currentProgram || "—"}
                </div>

                {/* Responsable */}
                <div className="clients-cell-owner" style={{ flex: 1, display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
                  <div style={{
                    width: 22, height: 22, borderRadius: "50%",
                    background: avatar.bg, color: avatar.text,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontFamily: "Syne, sans-serif", fontWeight: 800, fontSize: 9,
                    flexShrink: 0,
                  }}>
                    {owner ? getInitials(owner.name) : "?"}
                  </div>
                  <span style={{ fontSize: 12, color: "var(--ls-text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {owner?.name ?? "Non assigné"}
                  </span>
                </div>

                {/* Prochain suivi */}
                <div className="clients-cell-followup" style={{ flex: 1.3 }}>
                  {nextFollowUp ? (
                    <>
                      <div style={{ fontSize: 12, fontWeight: 600, color: isOverdue(nextFollowUp) ? "var(--ls-coral)" : "var(--ls-text)" }}>
                        {isOverdue(nextFollowUp) ? "En retard" : formatDateTime(nextFollowUp)}
                      </div>
                      <div style={{ fontSize: 10, color: isOverdue(nextFollowUp) ? "var(--ls-coral)" : "var(--ls-text-hint)", marginTop: 2 }}>
                        {getRelativeTime(nextFollowUp)}
                      </div>
                    </>
                  ) : (
                    <div style={{ fontSize: 11, color: "var(--ls-text-hint)" }}>Aucun suivi planifié</div>
                  )}
                </div>

                {/* Statut */}
                <div className="clients-cell-status" style={{ width: 90 }}>
                  <span style={{
                    display: "inline-flex", alignItems: "center",
                    padding: "3px 10px", borderRadius: 10,
                    fontSize: 10, fontWeight: 600,
                    background: statusInfo.bg, color: statusInfo.color,
                  }}>
                    {statusInfo.label}
                  </span>
                </div>
              </Link>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────
function getInitials(name: string): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

function getOwnerAvatarColors(role: User["role"]) {
  switch (role) {
    case "admin":
      return { bg: "#E6F1FB", text: "#0C447C" };
    case "referent":
      return { bg: "#FAEEDA", text: "#633806" };
    case "distributor":
    default:
      return { bg: "#EAF3DE", text: "#27500A" };
  }
}

const LIFECYCLE_TONE_TO_COLORS: Record<"teal" | "gold" | "muted" | "coral", { bg: string; color: string }> = {
  teal:  { bg: "rgba(13,148,136,0.1)",  color: "var(--ls-teal)" },
  gold:  { bg: "rgba(184,146,42,0.1)",  color: "var(--ls-gold)" },
  muted: { bg: "var(--ls-surface2)",    color: "var(--ls-text-muted)" },
  coral: { bg: "rgba(220,38,38,0.1)",   color: "var(--ls-coral)" },
};

function getClientStatusInfo(client: Client, nextFollowUp: string | undefined) {
  // Priorité 1 : lifecycle stopped/lost → label direct
  const lifecycle: LifecycleStatus = client.lifecycleStatus ?? (client.started ? "active" : "not_started");
  if (lifecycle === "stopped" || lifecycle === "lost" || lifecycle === "paused") {
    const colors = LIFECYCLE_TONE_TO_COLORS[LIFECYCLE_TONES[lifecycle]];
    return { label: LIFECYCLE_LABELS[lifecycle], bg: colors.bg, color: colors.color };
  }
  // Priorité 2 : RDV urgent ou en retard
  if (nextFollowUp && isOverdue(nextFollowUp)) {
    return { label: "Relance", bg: "rgba(220,38,38,0.1)", color: "var(--ls-coral)" };
  }
  if (nextFollowUp) {
    const daysUntil = getDaysUntil(nextFollowUp);
    if (daysUntil !== null && daysUntil <= 2) {
      return { label: "RDV", bg: "rgba(184,146,42,0.1)", color: "var(--ls-gold)" };
    }
  }
  // Priorité 3 : lifecycle basique
  const colors = LIFECYCLE_TONE_TO_COLORS[LIFECYCLE_TONES[lifecycle]];
  return { label: LIFECYCLE_LABELS[lifecycle], bg: colors.bg, color: colors.color };
}

function isOverdue(dateStr: string | undefined): boolean {
  if (!dateStr) return false;
  return new Date(dateStr).getTime() < Date.now();
}

function getDaysUntil(dateStr: string | undefined): number | null {
  if (!dateStr) return null;
  const diff = new Date(dateStr).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function getRelativeTime(dateStr: string | undefined): string {
  if (!dateStr) return "—";
  const days = getDaysUntil(dateStr);
  if (days === null) return "—";
  if (days < 0) return `depuis ${Math.abs(days)} j`;
  if (days === 0) return "aujourd'hui";
  if (days === 1) return "demain";
  if (days < 30) return `dans ${days} jours`;
  const months = Math.floor(days / 30);
  return `dans ${months} mois`;
}
