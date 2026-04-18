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
import type { User, Client } from "../types/domain";

export function ClientsPage() {
  const { currentUser, users, visibleClients, visibleFollowUps } = useAppContext();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "pending" | "follow-up">("all");
  const [ownerFilter, setOwnerFilter] = useState("all");
  const deferredSearch = useDeferredValue(search);

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
      const matchesStatus = statusFilter === "all" || client.status === statusFilter;
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
          onChange={(e) => setStatusFilter(e.target.value as "all" | "active" | "pending" | "follow-up")}
          style={{
            padding: "11px 14px", border: "1px solid var(--ls-border)",
            borderRadius: 10, fontFamily: "DM Sans, sans-serif", fontSize: 13,
            background: "var(--ls-input-bg)", color: "var(--ls-text-muted)",
            outline: "none", cursor: "pointer", minWidth: 180,
          }}
        >
          <option value="all">Tous les statuts</option>
          <option value="active">Actifs</option>
          <option value="pending">En attente</option>
          <option value="follow-up">À relancer</option>
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
          <div className="clients-table-header" style={{ display: "flex", padding: "12px 16px", borderBottom: "1px solid var(--ls-border)", background: "var(--ls-surface2)" }}>
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

            return (
              <Link
                key={client.id}
                to={`/clients/${client.id}`}
                className="clients-table-row"
                style={{
                  display: "flex", alignItems: "center",
                  padding: "14px 16px",
                  borderBottom: i < filteredClients.length - 1 ? "1px solid var(--ls-border)" : "none",
                  cursor: "pointer", transition: "all 0.15s",
                  background: "transparent", borderLeft: "3px solid transparent",
                  paddingLeft: 16, textDecoration: "none", color: "inherit",
                  gap: 8, flexWrap: "wrap",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(184,146,42,0.06)";
                  e.currentTarget.style.borderLeft = "3px solid var(--ls-gold)";
                  e.currentTarget.style.paddingLeft = "13px";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "transparent";
                  e.currentTarget.style.borderLeft = "3px solid transparent";
                  e.currentTarget.style.paddingLeft = "16px";
                }}
              >
                {/* Client */}
                <div className="clients-cell-client" style={{ flex: 2, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: "var(--ls-text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {client.firstName} {client.lastName}
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

function getClientStatusInfo(client: Client, nextFollowUp: string | undefined) {
  if (nextFollowUp && isOverdue(nextFollowUp)) {
    return { label: "Relance", bg: "rgba(220,38,38,0.1)", color: "var(--ls-coral)" };
  }
  if (nextFollowUp) {
    const daysUntil = getDaysUntil(nextFollowUp);
    if (daysUntil !== null && daysUntil <= 2) {
      return { label: "RDV", bg: "rgba(184,146,42,0.1)", color: "var(--ls-gold)" };
    }
  }
  if (client.status === "pending") {
    return { label: "En attente", bg: "rgba(124,58,237,0.1)", color: "var(--ls-purple)" };
  }
  if (client.status === "follow-up") {
    return { label: "Classé", bg: "var(--ls-surface2)", color: "var(--ls-text-muted)" };
  }
  return { label: "Actif", bg: "rgba(13,148,136,0.1)", color: "var(--ls-teal)" };
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
