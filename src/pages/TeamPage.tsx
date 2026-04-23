// Chantier Team Tree Lineage (2026-04-25).
// Refonte complète "Mon équipe" : arbre de parrainage interactif +
// fiche distri détaillée + classement mensuel + switch de période.
//
// Source de données : AppContext (users + clients + prospects + activityLogs).
// Aucune RPC Supabase — tout est calculé en JS client-side depuis les
// collections déjà chargées. Permet une navigation instantanée sans
// re-fetch au changement de distri sélectionné ou de période.
//
// Lignée : users.sponsor_id (déjà en DB). Racine = Thomas (root admin).
// RLS existante "users select self or admin" couvre déjà la visibilité
// (sponsor_id = auth.uid() OR is_admin()).

import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Card } from "../components/ui/Card";
import { PageHeading } from "../components/ui/PageHeading";
import { useAppContext } from "../context/AppContext";
import type { Client, Prospect, User } from "../types/domain";

// ─── Types ────────────────────────────────────────────────────────────────
type Period = "week" | "month" | "year";

interface TreeNode {
  user: User;
  children: TreeNode[];
  depth: number;
}

interface DistriStats {
  activeClients: number;
  activeClientsDelta: number; // new in period
  prospectsCount: number;
  prospectsHotCount: number;
  subteamCount: number;
  retentionProspectsPct: number | null;
  retentionClientsPct: number | null;
  retentionProspectsSample: { converted: number; total: number };
  retentionClientsSample: { stillActive: number; total: number };
}

// ─── Période helpers ──────────────────────────────────────────────────────
function getPeriodStart(period: Period): Date {
  const now = new Date();
  const d = new Date(now);
  if (period === "week") {
    const day = d.getDay() || 7; // Lundi = 1
    d.setDate(d.getDate() - (day - 1));
    d.setHours(0, 0, 0, 0);
  } else if (period === "month") {
    d.setDate(1);
    d.setHours(0, 0, 0, 0);
  } else {
    d.setMonth(0, 1);
    d.setHours(0, 0, 0, 0);
  }
  return d;
}

function periodLabel(period: Period): string {
  return period === "week" ? "cette semaine" : period === "month" ? "ce mois" : "cette année";
}

function periodDays(period: Period): number {
  return period === "week" ? 7 : period === "month" ? 30 : 365;
}

// ─── Build tree récursif ──────────────────────────────────────────────────
function buildTree(rootUser: User, allUsers: User[], depth = 0): TreeNode {
  const children = allUsers
    .filter((u) => u.sponsorId === rootUser.id && u.id !== rootUser.id)
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((child) => buildTree(child, allUsers, depth + 1));
  return { user: rootUser, children, depth };
}

function countDescendants(node: TreeNode): number {
  return node.children.reduce((sum, c) => sum + 1 + countDescendants(c), 0);
}

// ─── Calcul stats distri pour une période ─────────────────────────────────
function computeStats(
  userId: string,
  clients: Client[],
  prospects: Prospect[],
  allUsers: User[],
  period: Period,
): DistriStats {
  const periodStart = getPeriodStart(period);
  const periodStartMs = periodStart.getTime();

  const userClients = clients.filter((c) => c.distributorId === userId);
  const activeClients = userClients.filter(
    (c) => c.lifecycleStatus !== "lost" && c.lifecycleStatus !== "stopped",
  );

  const activeClientsDelta = userClients.filter((c) => {
    const startDate = c.startDate ?? null;
    if (!startDate) return false;
    return new Date(startDate).getTime() >= periodStartMs;
  }).length;

  const userProspects = prospects.filter((p) => p.distributorId === userId);
  const prospectsCount = userProspects.length;
  const prospectsHotCount = userProspects.filter(
    (p) => p.status === "scheduled" || p.status === "done",
  ).length;

  // Sous-équipe : descendants récursifs
  function countSubteam(parentId: string): number {
    const direct = allUsers.filter((u) => u.sponsorId === parentId && u.id !== parentId);
    return direct.reduce((sum, u) => sum + 1 + countSubteam(u.id), 0);
  }
  const subteamCount = countSubteam(userId);

  // Rétention prospects → clients sur la période
  const prospectsInPeriod = userProspects.filter(
    (p) => new Date(p.createdAt).getTime() >= periodStartMs,
  );
  const prospectsConverted = prospectsInPeriod.filter(
    (p) => p.status === "converted" || !!p.convertedClientId,
  );
  const retentionProspectsPct =
    prospectsInPeriod.length > 0
      ? Math.round((prospectsConverted.length / prospectsInPeriod.length) * 100)
      : null;

  // Fidélisation : clients actifs au début de la période, toujours actifs aujourd'hui
  const clientsActiveAtStart = userClients.filter((c) => {
    if (!c.startDate) return false;
    return new Date(c.startDate).getTime() < periodStartMs;
  });
  const stillActiveNow = clientsActiveAtStart.filter(
    (c) => c.lifecycleStatus !== "lost" && c.lifecycleStatus !== "stopped",
  );
  const retentionClientsPct =
    clientsActiveAtStart.length > 0
      ? Math.round((stillActiveNow.length / clientsActiveAtStart.length) * 100)
      : null;

  return {
    activeClients: activeClients.length,
    activeClientsDelta,
    prospectsCount,
    prospectsHotCount,
    subteamCount,
    retentionProspectsPct,
    retentionClientsPct,
    retentionProspectsSample: {
      converted: prospectsConverted.length,
      total: prospectsInPeriod.length,
    },
    retentionClientsSample: {
      stillActive: stillActiveNow.length,
      total: clientsActiveAtStart.length,
    },
  };
}

// ─── Score composite pour classement ──────────────────────────────────────
// +3 pts par nouveau client converti, +1 pt par nouveau prospect,
// bonus +2 pts si rétention > 60%.
function computeScore(stats: DistriStats): number {
  let s = stats.activeClientsDelta * 3;
  s += Math.max(
    0,
    stats.prospectsCount - Math.floor(stats.retentionProspectsSample.total - stats.prospectsCount),
  );
  // simplification : +1 par prospect de la période
  s += stats.retentionProspectsSample.total * 1;
  if ((stats.retentionProspectsPct ?? 0) > 60 || (stats.retentionClientsPct ?? 0) > 60) s += 2;
  return s;
}

// ─── Initiales pour avatar ────────────────────────────────────────────────
function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return "?";
  return (parts[0][0] ?? "") + (parts[1]?.[0] ?? "");
}

// ─── Composant principal ──────────────────────────────────────────────────
export function TeamPage() {
  const { currentUser, users, clients, prospects } = useAppContext();
  const [period, setPeriod] = useState<Period>("month");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Racine = admin connecté (Thomas ou Mélanie) ou le sponsor du user courant
  const rootUser: User | null = useMemo(() => {
    if (!currentUser) return null;
    if (currentUser.role === "admin") return currentUser;
    // Distri simple : remonter jusqu'à la racine de sa lignée
    let cursor: User | undefined = currentUser;
    const seen = new Set<string>();
    while (cursor?.sponsorId && !seen.has(cursor.id)) {
      seen.add(cursor.id);
      const parent = users.find((u) => u.id === cursor!.sponsorId);
      if (!parent) break;
      cursor = parent;
    }
    return cursor ?? currentUser;
  }, [currentUser, users]);

  const tree = useMemo(() => {
    if (!rootUser) return null;
    return buildTree(rootUser, users);
  }, [rootUser, users]);

  const teamSize = tree ? 1 + countDescendants(tree) : 0;

  // Distri sélectionné : par défaut le premier enfant direct de la racine, ou la racine
  const effectiveSelectedId =
    selectedId ?? tree?.children[0]?.user.id ?? rootUser?.id ?? null;

  const selectedUser = users.find((u) => u.id === effectiveSelectedId) ?? null;

  const selectedStats = useMemo(() => {
    if (!selectedUser) return null;
    return computeStats(selectedUser.id, clients, prospects, users, period);
  }, [selectedUser, clients, prospects, users, period]);

  // Classement top 3 : toute l'équipe (descendants + racine) triée par score
  const ranking = useMemo(() => {
    if (!tree) return [];
    const flat: User[] = [];
    function walk(n: TreeNode) {
      flat.push(n.user);
      n.children.forEach(walk);
    }
    walk(tree);
    return flat
      .filter((u) => u.id !== rootUser?.id)
      .map((u) => {
        const stats = computeStats(u.id, clients, prospects, users, period);
        return { user: u, stats, score: computeScore(stats) };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);
  }, [tree, rootUser, clients, prospects, users, period]);

  if (!currentUser || !rootUser || !tree) {
    return (
      <Card>
        <p className="text-sm text-[var(--ls-text)]">Chargement de l&apos;équipe…</p>
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      <PageHeading
        eyebrow="Ton organisation"
        title="Mon équipe"
        description="Arborescence de parrainage, stats par distri et classement du mois."
      />

      {/* ═══ Bloc Arbre ═══════════════════════════════════════════════════ */}
      <Card className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="eyebrow-label">Arborescence</p>
            <h2 className="mt-2 text-xl font-bold text-white" style={{ fontFamily: "Syne, sans-serif" }}>
              Mon équipe · {teamSize} distributeur{teamSize > 1 ? "s" : ""}
            </h2>
          </div>
          <PeriodSwitch value={period} onChange={setPeriod} />
        </div>

        {/* Arbre : racine + 1 niveau d'enfants + 1 niveau de petits-enfants */}
        <div
          className="team-tree"
          style={{
            overflowX: "auto",
            paddingBottom: 8,
          }}
        >
          <TreeLevel
            node={tree}
            isRoot
            selectedId={effectiveSelectedId}
            onSelect={setSelectedId}
          />
        </div>
      </Card>

      {/* ═══ Fiche distri sélectionné ════════════════════════════════════ */}
      {selectedUser && selectedStats ? (
        <DistributorDetailCard
          user={selectedUser}
          sponsor={users.find((u) => u.id === selectedUser.sponsorId) ?? null}
          stats={selectedStats}
          period={period}
          ranking={ranking}
          rootUserName={rootUser.name}
          clients={clients}
          prospects={prospects}
          allUsers={users}
        />
      ) : null}
    </div>
  );
}

// ═══ Composant : un niveau de l'arbre (récursif) ═════════════════════════
function TreeLevel({
  node,
  isRoot,
  selectedId,
  onSelect,
}: {
  node: TreeNode;
  isRoot?: boolean;
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 0 }}>
      <TreeCard
        node={node}
        isRoot={isRoot}
        isSelected={selectedId === node.user.id}
        onSelect={() => onSelect(node.user.id)}
      />
      {node.children.length > 0 ? (
        <>
          {/* Connecteur vertical */}
          <div
            aria-hidden="true"
            style={{
              width: 1,
              height: 16,
              background: "var(--ls-border)",
            }}
          />
          {/* Ligne horizontale si plusieurs enfants */}
          {node.children.length > 1 ? (
            <div
              aria-hidden="true"
              style={{
                height: 1,
                background: "var(--ls-border)",
                width: "100%",
                maxWidth: node.children.length * 160,
              }}
            />
          ) : null}
          <div
            style={{
              display: "flex",
              gap: 12,
              justifyContent: "center",
              flexWrap: "nowrap",
              paddingTop: node.children.length > 1 ? 16 : 0,
            }}
          >
            {node.children.map((child) => (
              <TreeLevel
                key={child.user.id}
                node={child}
                selectedId={selectedId}
                onSelect={onSelect}
              />
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}

// ═══ Card distri dans l'arbre ════════════════════════════════════════════
function TreeCard({
  node,
  isRoot,
  isSelected,
  onSelect,
}: {
  node: TreeNode;
  isRoot?: boolean;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const { clients, prospects } = useAppContext();
  const clientCount = clients.filter((c) => c.distributorId === node.user.id).length;
  const prospectCount = prospects.filter((p) => p.distributorId === node.user.id).length;

  const rootStyle: React.CSSProperties = isRoot
    ? {
        background:
          "linear-gradient(135deg, rgba(239,159,39,0.18), rgba(186,117,23,0.06))",
        border: "1px solid #BA7517",
        padding: "10px 16px",
        minWidth: 170,
      }
    : isSelected
      ? {
          background: "rgba(15,110,86,0.12)",
          border: "1px solid #0F6E56",
          boxShadow: "0 0 0 3px rgba(15,110,86,0.15)",
          padding: "8px 14px",
          minWidth: 150,
        }
      : {
          background: "var(--ls-surface)",
          border: "1px solid var(--ls-border)",
          padding: "8px 14px",
          minWidth: 150,
        };

  const avatarColor = isRoot
    ? "linear-gradient(135deg, #EF9F27, #BA7517)"
    : isSelected
      ? "#0F6E56"
      : "rgba(211,209,199,0.9)";
  const avatarText = isRoot ? "#fff" : isSelected ? "#fff" : "#444441";

  return (
    <button
      type="button"
      onClick={onSelect}
      role="button"
      tabIndex={0}
      style={{
        ...rootStyle,
        borderRadius: 12,
        cursor: "pointer",
        fontFamily: "inherit",
        color: "inherit",
        textAlign: "center",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 6,
        transition: "transform 150ms ease-out",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.transform = "translateY(-1px)")}
      onMouseLeave={(e) => (e.currentTarget.style.transform = "translateY(0)")}
    >
      <div
        style={{
          width: isRoot ? 40 : 32,
          height: isRoot ? 40 : 32,
          borderRadius: "50%",
          background: avatarColor,
          color: avatarText,
          fontFamily: "Syne, sans-serif",
          fontSize: isRoot ? 15 : 12,
          fontWeight: 700,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        {initialsOf(node.user.name)}
      </div>
      <div style={{ fontSize: isRoot ? 13 : 12, fontWeight: 600, color: "var(--ls-text)" }}>
        {node.user.name}
      </div>
      <div
        style={{
          fontSize: 10,
          color: isRoot ? "#854F0B" : "var(--ls-text-hint)",
          letterSpacing: "0.02em",
        }}
      >
        {isRoot ? `${node.user.title || "World Team"} · ${node.user.role === "admin" ? "Admin" : ""}`.trim() : node.user.title || "Distributeur"}
      </div>
      <div style={{ fontSize: 10, color: "var(--ls-text-muted)" }}>
        {clientCount} client{clientCount > 1 ? "s" : ""} · {prospectCount} prospect{prospectCount > 1 ? "s" : ""}
      </div>
    </button>
  );
}

// ═══ Switch de période ═══════════════════════════════════════════════════
function PeriodSwitch({ value, onChange }: { value: Period; onChange: (p: Period) => void }) {
  const options: Array<{ id: Period; label: string }> = [
    { id: "week", label: "Semaine" },
    { id: "month", label: "Mois" },
    { id: "year", label: "Année" },
  ];
  return (
    <div
      role="tablist"
      style={{
        display: "inline-flex",
        padding: 3,
        borderRadius: 10,
        background: "var(--ls-surface2)",
        border: "1px solid var(--ls-border)",
        gap: 2,
      }}
    >
      {options.map((o) => {
        const active = value === o.id;
        return (
          <button
            key={o.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(o.id)}
            style={{
              padding: "6px 14px",
              borderRadius: 7,
              border: "none",
              cursor: "pointer",
              fontSize: 12,
              fontWeight: active ? 600 : 500,
              fontFamily: "DM Sans, sans-serif",
              background: active ? "var(--ls-surface)" : "transparent",
              color: active ? "var(--ls-text)" : "var(--ls-text-muted)",
              transition: "background 150ms ease-out",
            }}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

// ═══ Fiche distri détaillée ══════════════════════════════════════════════
function DistributorDetailCard({
  user,
  sponsor,
  stats,
  period,
  ranking,
  rootUserName,
  clients,
  prospects,
  allUsers,
}: {
  user: User;
  sponsor: User | null;
  stats: DistriStats;
  period: Period;
  ranking: Array<{ user: User; stats: DistriStats; score: number }>;
  rootUserName: string;
  clients: Client[];
  prospects: Prospect[];
  allUsers: User[];
}) {
  // Badge actif si au moins 1 bilan/prospect récent dans la période
  const periodStart = getPeriodStart(period);
  const hasRecentActivity =
    clients.some(
      (c) =>
        c.distributorId === user.id &&
        c.startDate &&
        new Date(c.startDate).getTime() >= periodStart.getTime(),
    ) ||
    prospects.some(
      (p) =>
        p.distributorId === user.id &&
        new Date(p.createdAt).getTime() >= periodStart.getTime(),
    );

  const memberSince = user.createdAt
    ? new Date(user.createdAt).toLocaleDateString("fr-FR", { month: "long", year: "numeric" })
    : "—";

  // Activité récente (5 événements max) — nouveau bilan / nouveau prospect / parrainage
  const recentActivity = useMemo(() => {
    const events: Array<{ kind: string; label: string; date: string; color: string }> = [];
    clients
      .filter((c) => c.distributorId === user.id && c.startDate)
      .forEach((c) => {
        events.push({
          kind: "client",
          label: `Nouveau bilan · ${c.firstName} ${c.lastName[0] ?? ""}.`,
          date: c.startDate!,
          color: "#0F6E56",
        });
      });
    prospects
      .filter((p) => p.distributorId === user.id)
      .forEach((p) => {
        events.push({
          kind: "prospect",
          label: `Nouveau prospect · ${p.firstName} ${p.lastName[0] ?? ""}.`,
          date: p.createdAt,
          color: "#EF9F27",
        });
      });
    allUsers
      .filter((u) => u.sponsorId === user.id && u.createdAt)
      .forEach((u) => {
        events.push({
          kind: "sponsor",
          label: `A parrainé ${u.name} dans son équipe`,
          date: u.createdAt!,
          color: "#4285F4",
        });
      });
    return events
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 5);
  }, [user, clients, prospects, allUsers]);

  return (
    <Card style={{ borderTop: "2px solid #0F6E56" }} className="space-y-5">
      {/* Header fiche */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: "50%",
              background: "#0F6E56",
              color: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontFamily: "Syne, sans-serif",
              fontSize: 16,
              fontWeight: 700,
              flexShrink: 0,
            }}
          >
            {initialsOf(user.name)}
          </div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 600, color: "var(--ls-text)" }}>{user.name}</div>
            <div style={{ fontSize: 11, color: "var(--ls-text-muted)", marginTop: 2 }}>
              {user.title || "Distributeur"}
              {sponsor ? ` · Parrainé·e par ${sponsor.name}` : ""}
              {` · Depuis ${memberSince}`}
            </div>
          </div>
        </div>
        <StatusPill active={hasRecentActivity} />
      </div>

      {/* 3 KPI */}
      <div className="grid gap-2" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))" }}>
        <KpiCard
          label="Clients actifs"
          value={stats.activeClients}
          delta={
            stats.activeClientsDelta > 0
              ? `+${stats.activeClientsDelta} ${periodLabel(period)}`
              : undefined
          }
          deltaPositive={stats.activeClientsDelta > 0}
        />
        <KpiCard
          label="Prospects"
          value={stats.prospectsCount}
          sub={stats.prospectsHotCount > 0 ? `dont ${stats.prospectsHotCount} chauds` : "aucun chaud"}
        />
        <KpiCard
          label="Sous-équipe"
          value={stats.subteamCount}
          sub={stats.subteamCount > 0 ? "distri parrainés" : "aucun"}
        />
      </div>

      {/* 2 donuts */}
      <div className="grid gap-2" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))" }}>
        <DonutCard
          label="Rétention prospects → clients"
          value={stats.retentionProspectsPct}
          color="#0F6E56"
          hint={
            stats.retentionProspectsSample.total > 0
              ? `${stats.retentionProspectsSample.converted} prospects sur ${stats.retentionProspectsSample.total} convertis en clients`
              : `Aucun prospect ${periodLabel(period)}`
          }
        />
        <DonutCard
          label="Fidélisation clients"
          value={stats.retentionClientsPct}
          color="#BA7517"
          hint={
            stats.retentionClientsSample.total > 0
              ? `${stats.retentionClientsSample.stillActive} clients sur ${stats.retentionClientsSample.total} toujours actifs`
              : `Trop récent pour mesurer la fidélisation`
          }
        />
      </div>

      {/* Activité récente */}
      <div>
        <div
          style={{
            fontSize: 10,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: "var(--ls-text-hint)",
            fontWeight: 600,
            marginBottom: 8,
          }}
        >
          Activité récente ({periodDays(period)} derniers jours)
        </div>
        {recentActivity.length > 0 ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {recentActivity.map((ev, i) => (
              <ActivityRow key={i} label={ev.label} date={ev.date} color={ev.color} />
            ))}
          </div>
        ) : (
          <div
            style={{
              padding: "14px 16px",
              borderRadius: 10,
              background: "var(--ls-surface2)",
              fontSize: 12,
              color: "var(--ls-text-muted)",
              fontStyle: "italic",
            }}
          >
            En phase de démarrage · aucune activité à afficher pour {periodLabel(period)}.
          </div>
        )}
      </div>

      {/* Classement top 3 */}
      <div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 8,
          }}
        >
          <div
            style={{
              fontSize: 10,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "var(--ls-text-hint)",
              fontWeight: 600,
            }}
          >
            🏆 Classement · Équipe {rootUserName}
          </div>
          <div style={{ fontSize: 10, color: "var(--ls-gold)", fontWeight: 600 }}>
            {period === "week" ? "Semaine" : period === "month" ? "Mois" : "Année"} en cours
          </div>
        </div>
        {ranking.length > 0 ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {ranking.map((entry, i) => (
              <RankingRow key={entry.user.id} rank={i + 1} entry={entry} period={period} />
            ))}
          </div>
        ) : (
          <div
            style={{
              padding: "14px 16px",
              borderRadius: 10,
              background: "var(--ls-surface2)",
              fontSize: 12,
              color: "var(--ls-text-muted)",
              fontStyle: "italic",
            }}
          >
            Pas encore de classement — ajoute des distri à ton équipe pour commencer.
          </div>
        )}
      </div>

      {/* Footer : voir profil */}
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <Link
          to={`/distributors/${user.id}`}
          style={{
            fontSize: 12,
            color: "var(--ls-teal)",
            textDecoration: "none",
            fontWeight: 600,
          }}
        >
          Voir le profil complet →
        </Link>
      </div>
    </Card>
  );
}

// ═══ Sous-composants présentationnels ════════════════════════════════════
function StatusPill({ active }: { active: boolean }) {
  return (
    <div
      style={{
        padding: "4px 10px",
        borderRadius: 999,
        background: active ? "rgba(15,110,86,0.15)" : "rgba(180,178,169,0.2)",
        color: active ? "#0F6E56" : "var(--ls-text-hint)",
        fontSize: 11,
        fontWeight: 600,
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
      }}
    >
      <span
        aria-hidden="true"
        style={{
          width: 6,
          height: 6,
          borderRadius: "50%",
          background: active ? "#0F6E56" : "#B4B2A9",
        }}
      />
      {active ? "Active" : "Inactive"}
    </div>
  );
}

function KpiCard({
  label,
  value,
  delta,
  deltaPositive,
  sub,
}: {
  label: string;
  value: number | string;
  delta?: string;
  deltaPositive?: boolean;
  sub?: string;
}) {
  return (
    <div
      style={{
        padding: "12px 14px",
        borderRadius: 10,
        background: "var(--ls-surface2)",
        border: "1px solid var(--ls-border)",
      }}
    >
      <div
        style={{
          fontSize: 10,
          letterSpacing: "0.05em",
          textTransform: "uppercase",
          color: "var(--ls-text-hint)",
          fontWeight: 600,
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
          color: "var(--ls-text)",
          lineHeight: 1.1,
        }}
      >
        {value}
      </div>
      {delta ? (
        <div
          style={{
            fontSize: 10,
            color: deltaPositive ? "#0F6E56" : "var(--ls-text-hint)",
            marginTop: 2,
            fontWeight: 600,
          }}
        >
          {delta}
        </div>
      ) : null}
      {sub ? (
        <div style={{ fontSize: 10, color: "var(--ls-text-muted)", marginTop: 2 }}>{sub}</div>
      ) : null}
    </div>
  );
}

function DonutCard({
  label,
  value,
  color,
  hint,
}: {
  label: string;
  value: number | null;
  color: string;
  hint: string;
}) {
  const radius = 22;
  const circumference = 2 * Math.PI * radius;
  const pct = value ?? 0;
  const dashOffset = circumference * (1 - pct / 100);

  return (
    <div
      role="group"
      aria-label={`${label} ${value != null ? value + "%" : "non calculé"}`}
      style={{
        padding: "14px 16px",
        borderRadius: 10,
        background: "var(--ls-surface2)",
        border: "1px solid var(--ls-border)",
        display: "flex",
        alignItems: "center",
        gap: 14,
      }}
    >
      <div
        style={{
          fontSize: 10,
          letterSpacing: "0.05em",
          textTransform: "uppercase",
          color: "var(--ls-text-hint)",
          fontWeight: 600,
          position: "absolute",
          clip: "rect(0,0,0,0)",
        }}
      >
        {label}
      </div>
      <svg width="56" height="56" viewBox="0 0 56 56" aria-hidden="true">
        <circle cx="28" cy="28" r={radius} stroke="var(--ls-border)" strokeWidth="6" fill="none" />
        {value != null ? (
          <circle
            cx="28"
            cy="28"
            r={radius}
            stroke={color}
            strokeWidth="6"
            fill="none"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            transform="rotate(-90 28 28)"
          />
        ) : null}
        <text
          x="28"
          y="32"
          textAnchor="middle"
          fontFamily="Syne, sans-serif"
          fontSize="13"
          fontWeight="700"
          fill="var(--ls-text)"
        >
          {value != null ? `${value}%` : "—"}
        </text>
      </svg>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: "var(--ls-text)",
            lineHeight: 1.3,
            marginBottom: 3,
          }}
        >
          {label}
        </div>
        <div style={{ fontSize: 11, color: "var(--ls-text-muted)", lineHeight: 1.4 }}>{hint}</div>
      </div>
    </div>
  );
}

function ActivityRow({ label, date, color }: { label: string; date: string; color: string }) {
  const diffDays = Math.floor((Date.now() - new Date(date).getTime()) / (1000 * 60 * 60 * 24));
  const rel =
    diffDays < 1 ? "Aujourd'hui" : diffDays === 1 ? "Hier" : `Il y a ${diffDays} j`;
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "8px 12px",
        borderRadius: 8,
        background: "var(--ls-surface2)",
      }}
    >
      <span
        aria-hidden="true"
        style={{
          width: 6,
          height: 6,
          borderRadius: "50%",
          background: color,
          flexShrink: 0,
        }}
      />
      <div style={{ flex: 1, fontSize: 12, color: "var(--ls-text)" }}>{label}</div>
      <div style={{ fontSize: 10, color: "var(--ls-text-hint)" }}>{rel}</div>
    </div>
  );
}

function RankingRow({
  rank,
  entry,
}: {
  rank: number;
  entry: { user: User; stats: DistriStats; score: number };
  period: Period;
}) {
  const medal = rank === 1 ? "🥇" : rank === 2 ? "🥈" : "🥉";
  const bg =
    rank === 1
      ? "linear-gradient(90deg, rgba(239,159,39,0.15), rgba(239,159,39,0.02))"
      : "var(--ls-surface2)";
  const border = rank === 1 ? "3px solid #EF9F27" : "3px solid transparent";

  const stat = entry.stats;
  const metric =
    stat.activeClientsDelta > 0
      ? `+${stat.activeClientsDelta} client${stat.activeClientsDelta > 1 ? "s" : ""}`
      : stat.retentionProspectsSample.total > 0
        ? `+${stat.retentionProspectsSample.total} prospect${stat.retentionProspectsSample.total > 1 ? "s" : ""}`
        : "en phase de démarrage";
  const retention =
    stat.retentionProspectsPct != null ? ` · ${stat.retentionProspectsPct}% rétention` : "";

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "8px 12px",
        borderRadius: 8,
        background: bg,
        borderLeft: border,
      }}
    >
      <span aria-hidden="true" style={{ fontSize: 16 }}>
        {medal}
      </span>
      <div
        style={{
          width: 24,
          height: 24,
          borderRadius: "50%",
          background: "#0F6E56",
          color: "#fff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 10,
          fontFamily: "Syne, sans-serif",
          fontWeight: 700,
          flexShrink: 0,
        }}
      >
        {initialsOf(entry.user.name)}
      </div>
      <div style={{ flex: 1, fontSize: 12, fontWeight: 600, color: "var(--ls-text)" }}>
        {entry.user.name}
      </div>
      <div style={{ fontSize: 11, color: "var(--ls-text-muted)" }}>
        {metric}
        {retention}
      </div>
    </div>
  );
}
