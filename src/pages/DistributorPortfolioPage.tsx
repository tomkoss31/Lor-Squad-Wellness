// =============================================================================
// DistributorPortfolioPage — Fiche distri unifiée
// =============================================================================
// Chantier #13 sous-vague A.3 (2026-05-18) : refonte avec 5 onglets qui
// reutilisent les composants partages src/components/distributor-blocks/
// (eux-memes utilises dans la modale drill-down /team).
//
// Avant 2026-05-18 : 2 onglets (overview clients + activity admin).
// Maintenant : Vue d'ensemble / Clients / PV & Rentabilité / Activité /
// Parametres distri — selon role.
// =============================================================================

import { useDeferredValue, useMemo, useState } from "react";
import { useToast } from "../context/ToastContext";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Card } from "../components/ui/Card";
import { DistributorBadge } from "../components/client/DistributorBadge";
import { useAppContext } from "../context/AppContext";
import { useTeamEngagement } from "../hooks/useTeamEngagement";
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
import {
  ActiviteRecenteBlock,
  ApprentissageBlock,
  CompteActifBlock,
  EngagementBlock,
  EngagementTotalBlock,
  ProgressionRangBlock,
  RangHerbalifeBlock,
} from "../components/distributor-blocks";
import { TeamMemberDrilldownModal } from "../components/team/TeamMemberDrilldownModal";
import { currentMonthIso } from "../lib/herbalifeFormulas";
import { RankPinBadge } from "../components/rank/RankPinBadge";
import { PilotageLevelBadge } from "../components/team/PilotageLevelBadge";
import type { HerbalifeRank } from "../types/domain";

const statusTone: Record<string, { label: string; tone: "active" | "pending" | "follow-up" }> = {
  active: { label: "Actif", tone: "active" },
  pending: { label: "En attente", tone: "pending" },
  "follow-up": { label: "À relancer", tone: "follow-up" },
};

type TabKey = "overview" | "clients" | "pv" | "activity" | "settings";

interface TabDef {
  key: TabKey;
  label: string;
  emoji: string;
  color: string;
  adminOnly?: boolean;
}

const TABS_FULL: TabDef[] = [
  { key: "overview", label: "Vue d'ensemble", emoji: "📊", color: "var(--ls-gold)" },
  { key: "clients", label: "Clients", emoji: "👥", color: "var(--ls-teal)" },
  { key: "pv", label: "PV & Rentabilité", emoji: "💰", color: "var(--ls-gold)", adminOnly: true },
  { key: "activity", label: "Activité", emoji: "📝", color: "var(--ls-teal)", adminOnly: true },
  { key: "settings", label: "Paramètres distri", emoji: "⚙️", color: "var(--ls-coral)", adminOnly: true },
];

export function DistributorPortfolioPage() {
  const { distributorId } = useParams();
  const navigate = useNavigate();
  const { currentUser, users, visibleClients, visibleFollowUps, refreshAfterFreeze } =
    useAppContext();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "pending" | "follow-up">(
    "all",
  );
  const deferredSearch = useDeferredValue(search);
  const [activeTab, setActiveTab] = useState<TabKey>("overview");
  const [drilldownOpen, setDrilldownOpen] = useState(false);
  // Selecteur mois pour onglet PV (13A.4)
  const [pvMonth, setPvMonth] = useState<string>(() => currentMonthIso());

  // Recupere le member engagement (XP/Academy/Formation/...) depuis l'arbre
  // du currentUser. Si le distri n'est pas dans son arbre (rare cas admin
  // qui visite un user out-of-tree), member sera null et la vue d'ensemble
  // riche n'apparaitra pas (fallback : clients tab par defaut).
  const { members } = useTeamEngagement(currentUser?.id ?? null);
  const member = useMemo(
    () => members.find((m) => m.user_id === distributorId) ?? null,
    [members, distributorId],
  );

  if (!currentUser || !distributorId) return null;

  const targetUser = users.find((u) => u.id === distributorId) ?? null;
  if (!canAccessPortfolioUser(currentUser, targetUser)) {
    return (
      <Card>
        <p className="text-lg text-white">Ce portefeuille n&apos;est pas accessible avec cet accès.</p>
      </Card>
    );
  }

  // Cas externe (passif ou hors-app) : pas de portefeuille client par design.
  // Ces distri n'ont pas accès à l'app coach — Thomas/Mélanie les tracke
  // uniquement pour leur PV mensuel + la remontée override sur la rentab.
  // On affiche une info dédiée + lien vers /arborescence-herbalife.
  if (targetUser?.isExternal || targetUser?.isPassiveSupervisor) {
    const isPassive = !!targetUser?.isPassiveSupervisor;
    return (
      <Card className="space-y-4" style={{ padding: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 28 }}>{isPassive ? "🔗" : "🌳"}</span>
          <div style={{ flex: 1 }}>
            <h2 style={{ fontFamily: "Syne, sans-serif", fontSize: 20, fontWeight: 700, color: "var(--ls-text)", margin: 0 }}>
              {targetUser.name}
            </h2>
            <p style={{ fontSize: 12.5, color: "var(--ls-text-muted)", margin: "4px 0 0" }}>
              {isPassive
                ? "Supervisor passif · Accès Light (rentab + équipe)"
                : "Distri externe (hors-app) · Tracké pour PV mensuel uniquement"}
              {targetUser.currentRank && ` · ${targetUser.currentRank}`}
            </p>
          </div>
          {/* Toggle upgrade vers distri actif (admin only) */}
          {isPassive && currentUser.role === "admin" && (
            <PassiveUpgradeButton userId={targetUser.id} userName={targetUser.name} />
          )}
        </div>
        <div style={{
          padding: 16,
          background: "color-mix(in srgb, var(--ls-teal) 8%, var(--ls-surface2))",
          border: "1px solid color-mix(in srgb, var(--ls-teal) 30%, transparent)",
          borderRadius: 12,
          fontSize: 13.5,
          color: "var(--ls-text)",
          lineHeight: 1.6,
        }}>
          {isPassive ? (
            <>
              <strong>Ce distri se connecte avec ses identifiants</strong> (email + password)
              et voit une interface allégée : sa rentabilité, l'équipe, la formation, la messagerie.
              Pas d'accès aux fiches clients (par design).
            </>
          ) : (
            <>
              <strong>Ce distri n'est pas sur l'app.</strong><br />
              C'est un membre de ta downline Herbalife historique ajouté manuellement
              pour reconstruire ton arborescence. Tu saisis ses PV mensuels et son
              override remonte automatiquement dans ta rentabilité.
            </>
          )}
          <br /><br />
          ➜ Pour saisir ses PV mensuels, va dans{" "}
          <a
            href="/parametres/arborescence-herbalife"
            style={{ color: "var(--ls-teal)", fontWeight: 600, textDecoration: "underline" }}
          >
            Paramètres &gt; Arborescence Herbalife
          </a>.
        </div>
      </Card>
    );
  }

  const portfolioUsers = getActivePortfolioUsers(users, visibleClients, currentUser);
  // Fallback (fix 2026-05-28) : si l'user existe et que le viewer a le droit
  // d'y accéder (canAccessPortfolioUser déjà checked ligne 100), on l'affiche
  // même s'il n'est pas dans getActivePortfolioUsers — cas des distri tout
  // juste inscrits qui n'ont pas encore de client (Sébastien Zanardi 28/05).
  // La page gère gracieusement l'absence de clients (counts à 0, empty state).
  const portfolioUser =
    portfolioUsers.find((u) => u.id === distributorId) ??
    (currentUser.id === distributorId ? currentUser : null) ??
    targetUser;
  if (!portfolioUser) {
    return (
      <Card>
        <p className="text-lg text-white">Responsable introuvable pour ce portefeuille.</p>
      </Card>
    );
  }

  const fullUser = users.find((u) => u.id === distributorId) ?? null;
  const isAdmin = currentUser.role === "admin";
  const isSelf = currentUser.id === distributorId;
  const canEditRankPv = isAdmin && !isSelf;
  const canToggleFreeze = isAdmin && !isSelf;

  const visibleTabs = TABS_FULL.filter((t) => !t.adminOnly || isAdmin);

  const portfolioMetrics = getPortfolioMetrics(
    portfolioUser,
    visibleClients,
    visibleFollowUps,
    users,
    portfolioUser.role === "referent" ? "network" : "personal",
  );

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

  const refresh = async () => {
    await refreshAfterFreeze?.();
  };

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
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <div>
          <span className="ls-portfolio-header-row__eyebrow">Fiche distri</span>
          <h1 className="ls-portfolio-header-row__title">{portfolioUser.name}</h1>
        </div>
      </header>

      {/* 2. Hero : identité + stats inline + CTAs */}
      <Card className="ls-portfolio-hero">
        <div className="ls-portfolio-hero__identity">
          <DistributorBadge user={portfolioUser} compact />
          <div>
            <span className="ls-portfolio-header-row__eyebrow">Responsable</span>
            <h2 style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <span>{portfolioUser.name}</span>
              {portfolioUser.currentRank && (
                <RankPinBadge
                  rank={portfolioUser.currentRank as HerbalifeRank}
                  size="sm"
                  showLabel
                />
              )}
            </h2>
            <div className="ls-portfolio-hero__meta">
              <RoleBadge role={portfolioUser.role} />
              <span>{portfolioUser.title || "La Base 360"}</span>
              {/* Moteur d'équipe PR3 : niveau de pilotage dérivé + override admin. */}
              <PilotageLevelBadge userId={portfolioUser.id} editable={isAdmin} />
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

        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
          {/* 13A.5 — Bouton Apercu rapide : ouvre la modale drilldown */}
          {member && (
            <button
              type="button"
              onClick={() => setDrilldownOpen(true)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "8px 14px",
                background: "color-mix(in srgb, var(--ls-teal) 12%, transparent)",
                border: "1px solid color-mix(in srgb, var(--ls-teal) 40%, transparent)",
                color: "var(--ls-teal)",
                borderRadius: 8,
                fontSize: 12,
                fontFamily: "DM Sans, sans-serif",
                fontWeight: 600,
                cursor: "pointer",
              }}
              title="Voir la modale drilldown rapide (utile pour switcher entre distri sans recharger la page)"
            >
              ⚡ Aperçu rapide
            </button>
          )}
          <Link to="/clients" className="ls-portfolio-hero__cta">
            Voir base ↗
          </Link>
          <Link
            to={`/distributors/${portfolioUser.id}/charte`}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "8px 14px",
              background: "rgba(184, 146, 42, 0.14)",
              border: "1px solid rgba(184, 146, 42, 0.4)",
              color: "#B8922A",
              borderRadius: 8,
              fontSize: 12,
              fontFamily: "DM Sans, sans-serif",
              fontWeight: 600,
              textDecoration: "none",
            }}
          >
            ✦ Charte
          </Link>
        </div>
      </Card>

      {/* Onglets */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", margin: "4px 0 8px" }}>
        {visibleTabs.map((t) => {
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
                boxShadow: isActive
                  ? `0 4px 12px -4px color-mix(in srgb, ${t.color} 30%, transparent)`
                  : "none",
              }}
              onMouseEnter={(e) => {
                if (!isActive) e.currentTarget.style.transform = "translateY(-1px)";
              }}
              onMouseLeave={(e) => {
                if (!isActive) e.currentTarget.style.transform = "none";
              }}
            >
              <span aria-hidden style={{ fontSize: 14 }}>
                {t.emoji}
              </span>
              {t.label}
            </button>
          );
        })}
      </div>

      {/* ─── Onglet VUE D'ENSEMBLE ──────────────────────────────────────── */}
      {activeTab === "overview" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {member ? (
            <>
              <EngagementTotalBlock member={member} />
              <ApprentissageBlock member={member} />
              <ActiviteRecenteBlock member={member} />
              <EngagementBlock member={member} />
            </>
          ) : (
            <Card>
              <p
                style={{
                  margin: 0,
                  color: "var(--ls-text-muted)",
                  fontSize: 13,
                  lineHeight: 1.5,
                }}
              >
                Pas de métriques engagement disponibles pour ce distri (hors de ton sous-arbre
                équipe).
              </p>
            </Card>
          )}
        </div>
      )}

      {/* ─── Onglet CLIENTS ─────────────────────────────────────────────── */}
      {activeTab === "clients" && (
        <>
          <div className="ls-portfolio-filters">
            <FilterPill
              label="Tous"
              count={counts.all}
              active={statusFilter === "all"}
              tone="gold"
              onClick={() => setStatusFilter("all")}
            />
            <FilterPill
              label="Actifs"
              count={counts.active}
              active={statusFilter === "active"}
              tone="teal"
              onClick={() => setStatusFilter("active")}
            />
            <FilterPill
              label="En attente"
              count={counts.pending}
              active={statusFilter === "pending"}
              tone="gold-soft"
              onClick={() => setStatusFilter("pending")}
            />
            <FilterPill
              label="À relancer"
              count={counts.followUp}
              active={statusFilter === "follow-up"}
              tone="coral"
              onClick={() => setStatusFilter("follow-up")}
            />
            <div className="ls-portfolio-search">
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              >
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
          <div className="ls-portfolio-list">
            {groupedClients.length === 0 ? (
              <Card>
                <div style={{ padding: "20px 4px" }}>
                  <p className="text-2xl text-white" style={{ margin: 0 }}>
                    Aucun dossier sur ce filtre
                  </p>
                  <p
                    className="text-sm leading-6 text-[var(--ls-text-muted)]"
                    style={{ marginTop: 8 }}
                  >
                    Ajuste la recherche ou le statut pour retrouver un dossier plus vite.
                  </p>
                </div>
              </Card>
            ) : (
              groupedClients.map((group) => (
                <section key={group.key} className="ls-portfolio-month">
                  <div className="ls-portfolio-month__header">
                    <span>{group.label}</span>
                    <span>
                      · {group.clients.length} client{group.clients.length > 1 ? "s" : ""}
                    </span>
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

      {/* ─── Onglet PV & RENTABILITE (admin only) ───────────────────────── */}
      {activeTab === "pv" && isAdmin && (
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {/* Selecteur mois (13A.4) */}
          <MonthSelector value={pvMonth} onChange={setPvMonth} />
          {canEditRankPv ? (
            <>
              <RangHerbalifeBlock
                memberId={distributorId}
                memberName={portfolioUser.name}
                fullUser={fullUser}
                onApplied={refresh}
              />
              <ProgressionRangBlock
                memberId={distributorId}
                fullUser={fullUser}
                monthIso={pvMonth}
              />
              {/* Raccourci PV (consolidation 2026-06-14) : l'édition des PV
                  (override Bizworks + hors-app) vit désormais dans l'onglet
                  « PV équipe » de Rentabilité — source unique, zéro double-saisie. */}
              <button
                type="button"
                onClick={() => navigate(`/rentabilite?tab=pv-equipe&member=${distributorId}`)}
                style={{
                  width: "100%",
                  textAlign: "left",
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "14px 16px",
                  borderRadius: 14,
                  background: "color-mix(in srgb, var(--ls-teal) 8%, var(--ls-surface))",
                  border: "1px solid color-mix(in srgb, var(--ls-teal) 28%, var(--ls-border))",
                  cursor: "pointer",
                }}
              >
                <span aria-hidden="true" style={{ fontSize: 22 }}>📊</span>
                <span style={{ flex: 1 }}>
                  <span style={{ display: "block", fontWeight: 700, fontSize: 14, color: "var(--ls-text)", fontFamily: "DM Sans, sans-serif" }}>
                    Gérer les PV
                  </span>
                  <span style={{ display: "block", fontSize: 12, color: "var(--ls-text-muted)", marginTop: 2 }}>
                    Override Bizworks + saisie hors-app → onglet « PV équipe »
                  </span>
                </span>
                <span aria-hidden="true" style={{ color: "var(--ls-teal)", fontWeight: 700 }}>→</span>
              </button>
            </>
          ) : (
            <Card>
              <p style={{ margin: 0, color: "var(--ls-text-muted)", fontSize: 13 }}>
                Edition rang / PV indisponible pour ton propre compte.
              </p>
            </Card>
          )}
        </div>
      )}

      {/* ─── Onglet ACTIVITE (admin only) ───────────────────────────────── */}
      {activeTab === "activity" && isAdmin && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <UserActivityPanel userId={portfolioUser.id} />
          <AcademyAdminPanel userId={portfolioUser.id} displayName={portfolioUser.name} />
        </div>
      )}

      {/* ─── Onglet PARAMETRES DISTRI (admin only) ──────────────────────── */}
      {activeTab === "settings" && isAdmin && (
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {canToggleFreeze ? (
            <CompteActifBlock
              memberId={distributorId}
              memberName={portfolioUser.name}
              fullUser={fullUser}
              onApplied={refresh}
            />
          ) : (
            <Card>
              <p style={{ margin: 0, color: "var(--ls-text-muted)", fontSize: 13 }}>
                Tu ne peux pas geler ton propre compte.
              </p>
            </Card>
          )}
          <Card style={{ marginTop: 4 }}>
            <h3 style={{ margin: 0, fontSize: 13, fontFamily: "Syne, sans-serif", fontWeight: 700 }}>
              ✦ Charte d&apos;engagement
            </h3>
            <p
              style={{
                margin: "6px 0 12px",
                color: "var(--ls-text-muted)",
                fontSize: 12,
                lineHeight: 1.5,
              }}
            >
              Consulte ou édite la charte du distri (engagements + signature).
            </p>
            <Link
              to={`/distributors/${portfolioUser.id}/charte`}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "8px 14px",
                background: "rgba(184, 146, 42, 0.14)",
                border: "1px solid rgba(184, 146, 42, 0.4)",
                color: "#B8922A",
                borderRadius: 8,
                fontSize: 12,
                fontFamily: "DM Sans, sans-serif",
                fontWeight: 600,
                textDecoration: "none",
              }}
            >
              Ouvrir la charte →
            </Link>
          </Card>
        </div>
      )}

      {/* Modale drilldown (13A.5) */}
      {drilldownOpen && member && (
        <TeamMemberDrilldownModal member={member} onClose={() => setDrilldownOpen(false)} />
      )}
    </div>
  );
}

// ─── Sous-composants ──────────────────────────────────────────────────

function MonthSelector({ value, onChange }: { value: string; onChange: (m: string) => void }) {
  // Genere les 12 derniers mois (YYYY-MM) y compris le mois courant
  const months = useMemo(() => {
    const now = new Date();
    const out: { iso: string; label: string }[] = [];
    for (let i = 0; i < 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const label = d.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
      out.push({ iso, label });
    }
    return out;
  }, []);

  return (
    <Card style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
      <span style={{ fontSize: 12, color: "var(--ls-text-muted)", fontWeight: 600 }}>
        Mois affiché :
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          padding: "7px 10px",
          borderRadius: 8,
          border: "1px solid var(--ls-border)",
          background: "var(--ls-surface)",
          color: "var(--ls-text)",
          fontSize: 13,
          fontFamily: "Inter, system-ui, sans-serif",
          cursor: "pointer",
          textTransform: "capitalize",
        }}
      >
        {months.map((m) => (
          <option key={m.iso} value={m.iso}>
            {m.label}
          </option>
        ))}
      </select>
    </Card>
  );
}

function StatInline({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "gold" | "teal" | "coral";
}) {
  return (
    <div className="ls-stat-inline" data-tone={tone}>
      <span className="ls-stat-inline__value">{value}</span>
      <span className="ls-stat-inline__label">{label}</span>
    </div>
  );
}

type FilterPillTone = "gold" | "teal" | "gold-soft" | "coral";
function FilterPill({
  label,
  count,
  active,
  tone,
  onClick,
}: {
  label: string;
  count: number;
  active: boolean;
  tone: FilterPillTone;
  onClick: () => void;
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
  const isLifecycleHidden =
    client.lifecycleStatus === "stopped" ||
    client.lifecycleStatus === "lost" ||
    client.lifecycleStatus === "paused" ||
    client.freeFollowUp === true;
  const nextDate = isLifecycleHidden
    ? null
    : (activeFollowUp?.dueDate ?? client.nextFollowUp ?? null);

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
        <svg
          className="ls-client-row__chevron"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </div>
    </Link>
  );
}

// =============================================================================
// PassiveUpgradeButton — Toggle "Convertir en distri actif" (admin only)
// Chantier Light V2 2026-05-22.
// =============================================================================
function PassiveUpgradeButton({ userId, userName }: { userId: string; userName: string }) {
  const [confirming, setConfirming] = useState(false);
  const [upgrading, setUpgrading] = useState(false);
  const { push: pushToast } = useToast();

  const handleUpgrade = async () => {
    setUpgrading(true);
    try {
      const { upgradePassiveToActive } = await import("../services/supabaseService");
      const res = await upgradePassiveToActive(userId);
      if (res.ok) {
        pushToast({ tone: "success", title: `${userName} est maintenant un distri actif.` });
        // Reload pour refresh users[] dans tout l'app (refetchUsers non exposé)
        setTimeout(() => { window.location.reload(); }, 800);
      } else {
        pushToast({ tone: "error", title: res.error });
      }
    } finally {
      setUpgrading(false);
    }
  };

  if (confirming) {
    return (
      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
        <span style={{ fontSize: 12, color: "var(--ls-text-muted)" }}>Sûr ?</span>
        <button
          type="button"
          onClick={handleUpgrade}
          disabled={upgrading}
          style={{
            padding: "8px 14px",
            borderRadius: 10,
            border: "none",
            background: "linear-gradient(135deg, var(--ls-teal), var(--ls-gold))",
            color: "#fff",
            fontFamily: "DM Sans, sans-serif",
            fontSize: 12.5,
            fontWeight: 700,
            cursor: upgrading ? "wait" : "pointer",
          }}
        >
          {upgrading ? "…" : "✓ Oui, activer"}
        </button>
        <button
          type="button"
          onClick={() => setConfirming(false)}
          disabled={upgrading}
          style={{
            padding: "8px 12px",
            borderRadius: 10,
            border: "1px solid var(--ls-border)",
            background: "var(--ls-surface2)",
            color: "var(--ls-text-muted)",
            fontFamily: "DM Sans, sans-serif",
            fontSize: 12.5,
            cursor: "pointer",
          }}
        >
          Annuler
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setConfirming(true)}
      title="Donne accès complet à l'app (fiches clients, agenda, etc.)"
      style={{
        padding: "8px 14px",
        borderRadius: 10,
        border: "1px solid color-mix(in srgb, var(--ls-gold) 40%, transparent)",
        background: "color-mix(in srgb, var(--ls-gold) 8%, transparent)",
        color: "var(--ls-gold)",
        fontFamily: "DM Sans, sans-serif",
        fontSize: 12.5,
        fontWeight: 700,
        cursor: "pointer",
        whiteSpace: "nowrap",
      }}
    >
      ⬆ Upgrade actif
    </button>
  );
}
