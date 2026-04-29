import { useDeferredValue, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Card } from "../components/ui/Card";
import { DistributorBadge } from "../components/client/DistributorBadge";
import { useAppContext } from "../context/AppContext";
import { canAccessPortfolioUser } from "../lib/auth";
import {
  getActivePortfolioUsers,
  getClientActiveFollowUp,
  getGroupedClientsByMonth,
  getPortfolioMetrics,
} from "../lib/portfolio";
import { formatDate, formatDateTime, getFirstAssessment } from "../lib/calculations";
import type { Client, FollowUp, User } from "../types/domain";
import { AcademyAdminPanel } from "../features/academy/components/AcademyAdminPanel";
import { UserActivityPanel } from "../features/gamification/components/UserActivityPanel";

const statusTone: Record<string, { label: string; tone: "active" | "pending" | "follow-up" }> = {
  active: { label: "Actif", tone: "active" },
  pending: { label: "En attente", tone: "pending" },
  "follow-up": { label: "À relancer", tone: "follow-up" },
};

export function DistributorPortfolioPage() {
  const { distributorId } = useParams();
  const navigate = useNavigate();
  const { currentUser, users, visibleClients, visibleFollowUps } = useAppContext();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "pending" | "follow-up">("all");
  const deferredSearch = useDeferredValue(search);
  // Onglets fiche distri (V3 — 2026-04-29) : 2 onglets pour eviter surcharge.
  const [activeTab, setActiveTab] = useState<"overview" | "activity">("overview");

  if (!currentUser || !distributorId) return null;

  const targetUser = users.find((u) => u.id === distributorId) ?? null;
  if (!canAccessPortfolioUser(currentUser, targetUser)) {
    return (
      <Card>
        <p className="text-lg text-white">Ce portefeuille n&apos;est pas accessible avec cet accès.</p>
      </Card>
    );
  }

  const portfolioUsers = getActivePortfolioUsers(users, visibleClients, currentUser);
  const portfolioUser =
    portfolioUsers.find((u) => u.id === distributorId) ??
    (currentUser.id === distributorId ? currentUser : null);
  if (!portfolioUser) {
    return (
      <Card>
        <p className="text-lg text-white">Responsable introuvable pour ce portefeuille.</p>
      </Card>
    );
  }

  const portfolioMetrics = getPortfolioMetrics(
    portfolioUser,
    visibleClients,
    visibleFollowUps,
    users,
    portfolioUser.role === "referent" ? "network" : "personal"
  );

  // Compteurs pour les pills (basés sur l'ensemble du portefeuille, pas sur filteredClients
  // pour que les compteurs restent stables quand on change de filtre)
  const counts = {
    all: portfolioMetrics.clients.length,
    active: portfolioMetrics.clients.filter((c) => c.status === "active").length,
    pending: portfolioMetrics.clients.filter((c) => c.status === "pending").length,
    followUp: portfolioMetrics.clients.filter((c) => c.status === "follow-up").length,
  };

  const normalizedSearch = deferredSearch.trim().toLowerCase();
  const filteredClients = portfolioMetrics.clients.filter((client) => {
    const first = getFirstAssessment(client);
    const matchesStatus = statusFilter === "all" || client.status === statusFilter;
    const matchesSearch =
      !normalizedSearch ||
      `${client.firstName} ${client.lastName} ${client.city ?? ""} ${client.currentProgram} ${first.questionnaire.referredByName ?? ""}`
        .toLowerCase()
        .includes(normalizedSearch);
    return matchesStatus && matchesSearch;
  });

  const groupedClients = getGroupedClientsByMonth(filteredClients);

  return (
    <div className="ls-portfolio-page">
      {/* 1. Header row : flèche retour + titre */}
      <header className="ls-portfolio-header-row">
        <button
          type="button"
          onClick={() => navigate(-1)}
          aria-label="Retour"
          className="ls-portfolio-header-row__back"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <div>
          <span className="ls-portfolio-header-row__eyebrow">Portefeuille client</span>
          <h1 className="ls-portfolio-header-row__title">{portfolioUser.name}</h1>
        </div>
      </header>

      {/* 2. Hero : identité + stats inline + CTA */}
      <Card className="ls-portfolio-hero">
        <div className="ls-portfolio-hero__identity">
          <DistributorBadge user={portfolioUser} compact />
          <div>
            <span className="ls-portfolio-header-row__eyebrow">Responsable</span>
            <h2>{portfolioUser.name}</h2>
            <div className="ls-portfolio-hero__meta">
              <RoleBadge role={portfolioUser.role} />
              <span>{portfolioUser.title || "Lor'Squad Wellness"}</span>
            </div>
          </div>
        </div>

        <div className="ls-portfolio-hero__stats">
          <StatInline label="Clients" value={portfolioMetrics.clients.length} tone="gold" />
          <div className="ls-portfolio-hero__divider" />
          <StatInline label="RDV" value={portfolioMetrics.scheduledFollowUps.length} tone="teal" />
          <div className="ls-portfolio-hero__divider" />
          <StatInline label="Relances" value={portfolioMetrics.relanceFollowUps.length} tone="coral" />
        </div>

        <Link to="/clients" className="ls-portfolio-hero__cta">
          Voir base ↗
        </Link>
      </Card>

      {/* Onglets fiche distri — V3 2026-04-29 (admin uniquement pour Activite) */}
      {currentUser.role === "admin" ? (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 4 }}>
          {([
            { key: "overview" as const, label: "Vue d'ensemble", emoji: "📋", color: "var(--ls-gold)" },
            { key: "activity" as const, label: "Activité", emoji: "📊", color: "var(--ls-teal)" },
          ]).map((t) => {
            const isActive = activeTab === t.key;
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => setActiveTab(t.key)}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 7,
                  padding: "9px 16px",
                  borderRadius: 999,
                  border: isActive
                    ? `0.5px solid color-mix(in srgb, ${t.color} 50%, transparent)`
                    : "0.5px solid var(--ls-border)",
                  background: isActive
                    ? `linear-gradient(135deg, color-mix(in srgb, ${t.color} 14%, var(--ls-surface)) 0%, var(--ls-surface) 100%)`
                    : "var(--ls-surface)",
                  color: isActive ? t.color : "var(--ls-text-muted)",
                  fontSize: 13,
                  fontFamily: "DM Sans, sans-serif",
                  fontWeight: isActive ? 700 : 500,
                  cursor: "pointer",
                  transition: "transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease",
                  boxShadow: isActive ? `0 4px 12px -4px color-mix(in srgb, ${t.color} 30%, transparent)` : "none",
                }}
                onMouseEnter={(e) => {
                  if (!isActive) e.currentTarget.style.transform = "translateY(-1px)";
                }}
                onMouseLeave={(e) => {
                  if (!isActive) e.currentTarget.style.transform = "none";
                }}
              >
                <span aria-hidden style={{ fontSize: 14 }}>{t.emoji}</span>
                {t.label}
              </button>
            );
          })}
        </div>
      ) : null}

      {/* Onglet ACTIVITE (admin only) ─────────────────────────────────────── */}
      {activeTab === "activity" && currentUser.role === "admin" ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: 4 }}>
          <UserActivityPanel userId={portfolioUser.id} />
          <AcademyAdminPanel
            userId={portfolioUser.id}
            displayName={portfolioUser.name}
          />
        </div>
      ) : null}

      {/* Onglet VUE D'ENSEMBLE (defaut, ou si non-admin) ────────────────── */}
      {(activeTab === "overview" || currentUser.role !== "admin") && (
      <>
      {/* 3. Barre filtres : pills + search */}
      <div className="ls-portfolio-filters">
        <FilterPill label="Tous" count={counts.all} active={statusFilter === "all"} tone="gold" onClick={() => setStatusFilter("all")} />
        <FilterPill label="Actifs" count={counts.active} active={statusFilter === "active"} tone="teal" onClick={() => setStatusFilter("active")} />
        <FilterPill label="En attente" count={counts.pending} active={statusFilter === "pending"} tone="gold-soft" onClick={() => setStatusFilter("pending")} />
        <FilterPill label="À relancer" count={counts.followUp} active={statusFilter === "follow-up"} tone="coral" onClick={() => setStatusFilter("follow-up")} />

        <div className="ls-portfolio-search">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher un client…"
          />
        </div>
      </div>

      {/* 4. Liste clients groupée par mois */}
      <div className="ls-portfolio-list">
        {groupedClients.length === 0 ? (
          <Card>
            <div style={{ padding: "20px 4px" }}>
              <p className="text-2xl text-white" style={{ margin: 0 }}>Aucun dossier sur ce filtre</p>
              <p className="text-sm leading-6 text-[var(--ls-text-muted)]" style={{ marginTop: 8 }}>
                Ajuste la recherche ou le statut pour retrouver un dossier plus vite.
              </p>
            </div>
          </Card>
        ) : (
          groupedClients.map((group) => (
            <section key={group.key} className="ls-portfolio-month">
              <div className="ls-portfolio-month__header">
                <span>{group.label}</span>
                <span>· {group.clients.length} client{group.clients.length > 1 ? "s" : ""}</span>
              </div>
              <div className="ls-portfolio-month__rows">
                {group.clients.map((client) => (
                  <ClientRow key={client.id} client={client} followUps={visibleFollowUps} />
                ))}
              </div>
            </section>
          ))
        )}
      </div>

      </>
      )}
      {/* AcademyAdminPanel deplace dans l'onglet Activite (V3 2026-04-29).
          Reserve admin via le check du onglet activeTab===activity ci-dessus. */}
    </div>
  );
}

// ─── Sous-composants ──────────────────────────────────────────────────

function StatInline({ label, value, tone }: { label: string; value: number; tone: "gold" | "teal" | "coral" }) {
  return (
    <div className="ls-stat-inline" data-tone={tone}>
      <span className="ls-stat-inline__value">{value}</span>
      <span className="ls-stat-inline__label">{label}</span>
    </div>
  );
}

type FilterPillTone = "gold" | "teal" | "gold-soft" | "coral";
function FilterPill({
  label, count, active, tone, onClick,
}: {
  label: string; count: number; active: boolean; tone: FilterPillTone; onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      data-tone={tone}
      data-active={active}
      className="ls-filter-pill"
    >
      <span className="ls-filter-pill__label">{label}</span>
      <span className="ls-filter-pill__count">{count}</span>
    </button>
  );
}

function RoleBadge({ role }: { role: User["role"] }) {
  const label = role === "admin" ? "Admin" : role === "referent" ? "Référent" : "Distributeur";
  return (
    <span className="ls-role-badge" data-role={role}>
      {label}
    </span>
  );
}

function ClientRow({ client, followUps }: { client: Client; followUps: FollowUp[] }) {
  const status = statusTone[client.status] ?? { label: client.status, tone: "active" as const };
  const activeFollowUp = getClientActiveFollowUp(client, followUps);
  // Fix bug B : si activeFollowUp est null (client stopped/lost/paused), on
  // ne doit PAS retomber sur client.nextFollowUp qui contient la date stale.
  // Sujet C : idem pour les clients en suivi libre (freeFollowUp=true).
  const isLifecycleHidden =
    client.lifecycleStatus === 'stopped'
    || client.lifecycleStatus === 'lost'
    || client.lifecycleStatus === 'paused'
    || client.freeFollowUp === true;
  const nextDate = isLifecycleHidden
    ? null
    : activeFollowUp?.dueDate ?? client.nextFollowUp ?? null;

  return (
    <Link to={`/clients/${client.id}`} className="ls-client-row" data-status={status.tone}>
      <div className="ls-client-row__main">
        <div className="ls-client-row__name">
          {client.firstName} {client.lastName}
        </div>
        <div className="ls-client-row__meta">
          {client.currentProgram && <span>{client.currentProgram}</span>}
          {client.currentProgram && client.city && <span> · </span>}
          {client.city && <span>{client.city}</span>}
        </div>
      </div>
      <div className="ls-client-row__side">
        <span className="ls-client-row__status">{status.label}</span>
        {nextDate && (
          <span className="ls-client-row__date">
            {activeFollowUp ? formatDateTime(nextDate) : formatDate(nextDate)}
          </span>
        )}
        <svg className="ls-client-row__chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </div>
    </Link>
  );
}
