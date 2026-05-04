// Chantier Team Tree Lineage (2026-04-25).
// Refonte complète "Mon équipe" : arbre de parrainage interactif +
// fiche distri détaillée + classement mensuel + switch de période.
//
// V2 (2026-04-25) : bascule sur les 3 RPCs SQL agrégées (get_team_tree,
// get_distributor_stats, get_team_ranking) — perf scalable, une source
// de vérité. Fallback JS supprimé ; en cas d'erreur RPC l'utilisateur
// voit un bandeau explicite.

import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Card } from "../components/ui/Card";
// PageHeading remplace par PremiumHero (2026-04-29)
import { PremiumHero } from "../components/ui/PremiumHero";
import { AcademyLeaderboard } from "../features/academy/components/AcademyLeaderboard";
import { WeeklyBilansChallenge } from "../features/gamification/components/WeeklyBilansChallenge";
import { MonthlySeasonCard } from "../features/gamification/components/MonthlySeasonCard";
import { WeeklyRecapCard } from "../features/gamification/components/WeeklyRecapCard";
import { useAppContext } from "../context/AppContext";
import type { Client, Prospect } from "../types/domain";
import { DistriQuickModal } from "../components/team/DistriQuickModal";
// Hub équipe centralisé (2026-05-04) — 5 onglets : Vue d'ensemble (XP),
// Engagement, Apprentissage, Arbre lignée, Gamification.
import { useTeamEngagement } from "../hooks/useTeamEngagement";
import { XpPodium } from "../components/team/XpPodium";
import { EngagementTable } from "../components/team/EngagementTable";
import { LearningGrid } from "../components/team/LearningGrid";
import { TeamMemberDrilldownModal } from "../components/team/TeamMemberDrilldownModal";
import {
  useTeamTree,
  useDistributorStats,
  useTeamRanking,
  useCoupleTeamTree,
  useCoupleDistributorStats,
  type Period,
  type TeamTreeRow,
  type TeamRankingEntry,
} from "../hooks/useTeamData";
import {
  COUPLE_DISPLAY_NAME,
  COUPLE_INITIALS,
  COUPLE_SUBTITLE,
  COUPLE_VIRTUAL_ID,
  isCoupleVirtualId,
  resolveCoupleUserIds,
} from "../config/teamConfig";

// ─── Tree builder à partir des rows RPC plates ────────────────────────────
interface TreeNode {
  row: TeamTreeRow;
  children: TreeNode[];
}

function buildTreeFromRows(rows: TeamTreeRow[], rootId: string): TreeNode | null {
  const byId = new Map(rows.map((r) => [r.user_id, r] as const));
  const rootRow = byId.get(rootId);
  if (!rootRow) return null;

  function buildNode(id: string): TreeNode {
    const row = byId.get(id)!;
    const children = rows
      .filter((r) => r.parent_id === id && r.user_id !== id)
      .map((r) => buildNode(r.user_id));
    return { row, children };
  }
  return buildNode(rootId);
}

function periodLabel(period: Period): string {
  return period === "week" ? "cette semaine" : period === "month" ? "ce mois" : "cette année";
}

function periodDays(period: Period): number {
  return period === "week" ? 7 : period === "month" ? 30 : 365;
}

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return "?";
  return (parts[0][0] ?? "") + (parts[1]?.[0] ?? "");
}

// ═══ Composant principal ═════════════════════════════════════════════════
// Hub équipe (2026-05-04) : ajout de 3 onglets pour centraliser le pilotage
// (overview XP, engagement par distri, apprentissage Academy + Formation).
// Les 2 anciens onglets (team = arbre, gamification) restent compatibles.
type TeamTab = "overview" | "engagement" | "learning" | "team" | "gamification";

export function TeamPage() {
  const { currentUser, users, clients, prospects, followUps } = useAppContext();
  const [period, setPeriod] = useState<Period>("month");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  // Quick modal au click sur un distri (Thomas demande UX simplifiee 2026-04-29)
  const [quickModalUserId, setQuickModalUserId] = useState<string | null>(null);
  // Hub équipe (2026-05-04) : 5 onglets, défaut "overview" pour donner la
  // vue d'ensemble en premier (KPIs + podium XP).
  const [activeTab, setActiveTab] = useState<TeamTab>("overview");
  // Drill-down modale au click sur un membre (depuis n'importe quel onglet).
  const [drilldownMemberId, setDrilldownMemberId] = useState<string | null>(null);

  // Chantier Team Couple Display (2026-04-26) : si Thomas + Mélanie sont
  // résolus dans `users`, on bascule en "couple mode" — 1 seule card
  // racine au lieu de 2, stats agrégées, ranking dédupliqué.
  const coupleMemberIds = useMemo(() => resolveCoupleUserIds(users), [users]);
  const coupleActive = coupleMemberIds.length >= 2;

  // Racine = admin connecté OU racine remontée de la lignée pour un distri
  const rootUser = useMemo(() => {
    if (!currentUser) return null;
    if (currentUser.role === "admin") return currentUser;
    let cursor = currentUser;
    const seen = new Set<string>();
    while (cursor?.sponsorId && !seen.has(cursor.id)) {
      seen.add(cursor.id);
      const parent = users.find((u) => u.id === cursor.sponsorId);
      if (!parent) break;
      cursor = parent;
    }
    return cursor ?? currentUser;
  }, [currentUser, users]);

  const rootId = rootUser?.id ?? null;
  // Si le currentUser est dans le couple, on affiche le tree "fusionné"
  // des 2 membres. Sinon on reste sur le tree classique du rootUser.
  const currentUserIsCoupleMember =
    coupleActive && currentUser != null && coupleMemberIds.includes(currentUser.id);
  const useCoupleMode = coupleActive && currentUserIsCoupleMember;

  // Fetch des 2 trees via les RPCs puis merge (couple mode) ou single tree.
  const {
    rows: singleRows,
    loading: singleLoading,
    error: singleError,
  } = useTeamTree(useCoupleMode ? null : rootId);
  const {
    rows: coupleRawRows,
    loading: coupleLoading,
    error: coupleError,
  } = useCoupleTeamTree(useCoupleMode ? coupleMemberIds : []);

  // En couple mode, on transforme les rows :
  // - on retire les 2 rows "Thomas" et "Mélanie"
  // - on insère une row virtuelle COUPLE_VIRTUAL_ID avec stats agrégées
  // - on re-parent les enfants directs des 2 membres vers le virtual id
  const rows = useMemo<TeamTreeRow[]>(() => {
    if (!useCoupleMode) return singleRows;
    if (coupleRawRows.length === 0) return [];
    const memberIdSet = new Set(coupleMemberIds);
    const memberRows = coupleRawRows.filter((r) => memberIdSet.has(r.user_id));
    const otherRows = coupleRawRows.filter((r) => !memberIdSet.has(r.user_id));

    // Agrégation des stats sur la row virtuelle
    const virtualRow: TeamTreeRow = {
      user_id: COUPLE_VIRTUAL_ID,
      parent_id: null,
      depth: 0,
      name: COUPLE_DISPLAY_NAME,
      email: memberRows.map((r) => r.email).join(" · "),
      role: "admin",
      title: COUPLE_SUBTITLE,
      active: memberRows.some((r) => r.active),
      created_at: memberRows.reduce<string>((oldest, r) => {
        if (!oldest) return r.created_at;
        return new Date(r.created_at).getTime() < new Date(oldest).getTime() ? r.created_at : oldest;
      }, memberRows[0]?.created_at ?? new Date().toISOString()),
      clients_count: memberRows.reduce((s, r) => s + r.clients_count, 0),
      active_clients_count: memberRows.reduce((s, r) => s + r.active_clients_count, 0),
      prospects_count: memberRows.reduce((s, r) => s + r.prospects_count, 0),
      subteam_count: otherRows.length, // nb de distri effectivement affichés
    };

    // Re-parent : les enfants directs pointent vers le virtual id
    const reparented = otherRows.map<TeamTreeRow>((r) => ({
      ...r,
      parent_id: memberIdSet.has(r.parent_id ?? "") ? COUPLE_VIRTUAL_ID : r.parent_id,
    }));

    return [virtualRow, ...reparented];
  }, [useCoupleMode, singleRows, coupleRawRows, coupleMemberIds]);

  const effectiveRootId = useCoupleMode ? COUPLE_VIRTUAL_ID : rootId;
  const treeLoading = useCoupleMode ? coupleLoading : singleLoading;
  const treeError = useCoupleMode ? coupleError : singleError;

  const tree = useMemo(
    () => (effectiveRootId ? buildTreeFromRows(rows, effectiveRootId) : null),
    [rows, effectiveRootId]
  );

  const effectiveSelectedId = selectedId ?? tree?.children[0]?.row.user_id ?? effectiveRootId ?? null;

  const selectedRow = rows.find((r) => r.user_id === effectiveSelectedId) ?? null;
  const selectedIsCouple = isCoupleVirtualId(effectiveSelectedId);

  // Stats : fetch couple agrégé OU single distri selon sélection
  const { stats: singleStats } = useDistributorStats(
    selectedIsCouple ? null : effectiveSelectedId,
    period
  );
  const { stats: coupleStats } = useCoupleDistributorStats(
    selectedIsCouple ? coupleMemberIds : [],
    period
  );
  const selectedStats = selectedIsCouple ? coupleStats : singleStats;

  // Classement : si couple mode, on fetch le ranking du membre "racine"
  // (Thomas par convention = premier ID) puis on dédup/merge les entrées
  // du couple en une seule entrée virtuelle.
  const rankingRootId = useCoupleMode ? coupleMemberIds[0] ?? null : rootId;
  const { ranking: rawRanking } = useTeamRanking(rankingRootId, period, 5);
  const ranking = useMemo<TeamRankingEntry[]>(() => {
    if (!useCoupleMode) return rawRanking.slice(0, 3);
    const memberIdSet = new Set(coupleMemberIds);
    const coupleEntries = rawRanking.filter((e) => memberIdSet.has(e.user_id));
    const otherEntries = rawRanking.filter((e) => !memberIdSet.has(e.user_id));
    if (coupleEntries.length === 0) return otherEntries.slice(0, 3);
    // Merge les 2 entrées couple en une seule (somme delta, somme prospects,
    // retention pondéré simplifié = moyenne si les 2 non nulls).
    const merged: TeamRankingEntry = {
      user_id: COUPLE_VIRTUAL_ID,
      name: COUPLE_DISPLAY_NAME,
      clients_delta: coupleEntries.reduce((s, e) => s + e.clients_delta, 0),
      prospects_period: coupleEntries.reduce((s, e) => s + e.prospects_period, 0),
      retention_prospects_pct: (() => {
        const vals = coupleEntries.map((e) => e.retention_prospects_pct).filter((v): v is number => v != null);
        return vals.length ? Math.round(vals.reduce((s, v) => s + v, 0) / vals.length) : null;
      })(),
      retention_clients_pct: (() => {
        const vals = coupleEntries.map((e) => e.retention_clients_pct).filter((v): v is number => v != null);
        return vals.length ? Math.round(vals.reduce((s, v) => s + v, 0) / vals.length) : null;
      })(),
      score: coupleEntries.reduce((s, e) => s + e.score, 0),
    };
    // Re-trie par score desc
    return [merged, ...otherEntries].sort((a, b) => b.score - a.score).slice(0, 3);
  }, [useCoupleMode, rawRanking, coupleMemberIds]);

  // Hub équipe (2026-05-04) : engagement aggregé pour tous les membres du
  // sous-arbre. Sert pour onglets Vue d'ensemble, Engagement, Apprentissage.
  const engagementRootId = useCoupleMode ? coupleMemberIds[0] ?? rootId : rootId;
  const { members: engagementMembers, loading: engagementLoading } =
    useTeamEngagement(engagementRootId);
  const drilldownMember = drilldownMemberId
    ? engagementMembers.find((m) => m.user_id === drilldownMemberId) ?? null
    : null;

  if (!currentUser || !rootUser) {
    return (
      <Card>
        <p className="text-sm text-[var(--ls-text)]">Chargement de l&apos;équipe…</p>
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      <PremiumHero
        identity="teal"
        eyebrow="Mon équipe · ton organisation"
        titleAccent="Ton équipe"
        titleSuffix=" 👥"
        subtitle="Arborescence de parrainage, stats par distri et classement du mois."
      />

      {/* Tabs hub équipe (2026-05-04) — 5 onglets pour centraliser le pilotage */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {([
          { key: "overview" as TeamTab, label: "Vue d'ensemble", icon: "🏆", color: "var(--ls-gold)" },
          { key: "engagement" as TeamTab, label: "Engagement", icon: "🔥", color: "var(--ls-coral)" },
          { key: "learning" as TeamTab, label: "Apprentissage", icon: "🎓", color: "var(--ls-purple)" },
          { key: "team" as TeamTab, label: "Arbre lignée", icon: "🌳", color: "var(--ls-teal)" },
          { key: "gamification" as TeamTab, label: "Gamification", icon: "🎮", color: "var(--ls-gold)" },
        ]).map((t) => {
          const isActive = activeTab === t.key;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setActiveTab(t.key)}
              style={{
                padding: "9px 16px",
                borderRadius: 999,
                border: isActive
                  ? `0.5px solid color-mix(in srgb, ${t.color} 50%, transparent)`
                  : "0.5px solid var(--ls-border)",
                background: isActive
                  ? `linear-gradient(135deg, color-mix(in srgb, ${t.color} 14%, var(--ls-surface)) 0%, var(--ls-surface) 100%)`
                  : "var(--ls-surface)",
                cursor: "pointer",
                fontSize: 13,
                fontFamily: "DM Sans, sans-serif",
                fontWeight: isActive ? 700 : 500,
                color: isActive ? t.color : "var(--ls-text-muted)",
                display: "flex",
                alignItems: "center",
                gap: 7,
                transition: "transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease",
                boxShadow: isActive ? `0 4px 12px -4px color-mix(in srgb, ${t.color} 30%, transparent)` : "none",
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.transform = "translateY(-1px)";
                  e.currentTarget.style.borderColor = `color-mix(in srgb, ${t.color} 30%, var(--ls-border))`;
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.transform = "none";
                  e.currentTarget.style.borderColor = "var(--ls-border)";
                }
              }}
            >
              <span aria-hidden="true" style={{ fontSize: 14 }}>{t.icon}</span>
              {t.label}
            </button>
          );
        })}
      </div>

      {/* ═══ Onglet Vue d'ensemble (NEW 2026-05-04) — KPIs + podium XP ════ */}
      {activeTab === "overview" ? (
        <>
          <TeamHeroStats
            membersCount={rows.length}
            teamClients={(() => {
              const memberIds = new Set(rows.map((r) => r.user_id));
              return clients.filter((c) => memberIds.has(c.distributorId));
            })()}
            teamProspects={(() => {
              const memberIds = new Set(rows.map((r) => r.user_id));
              return prospects.filter((p) => memberIds.has(p.distributorId));
            })()}
          />

          <Card className="space-y-4">
            <div>
              <p className="eyebrow-label">🏆 Top 3 engagement</p>
              <h2 className="mt-2 text-xl font-bold text-white" style={{ fontFamily: "Syne, sans-serif" }}>
                Le podium XP de ton équipe
              </h2>
              <p style={{ marginTop: 6, fontSize: 13, color: "var(--ls-text-muted)" }}>
                Classement par XP totaux : Academy + bilans + RDV + messages + formation + connexions quotidiennes.
                Click sur un membre pour le détail complet.
              </p>
            </div>
            {engagementLoading ? (
              <div style={{ padding: "30px 20px", textAlign: "center", color: "var(--ls-text-muted)", fontSize: 13 }}>
                Chargement…
              </div>
            ) : (
              <XpPodium
                members={engagementMembers}
                excludeRootId={engagementRootId}
                onMemberClick={setDrilldownMemberId}
              />
            )}
          </Card>
        </>
      ) : null}

      {/* ═══ Onglet Engagement (NEW 2026-05-04) — table sortable ══════════ */}
      {activeTab === "engagement" ? (
        <Card className="space-y-4">
          <div>
            <p className="eyebrow-label">🔥 Pilotage engagement</p>
            <h2 className="mt-2 text-xl font-bold text-white" style={{ fontFamily: "Syne, sans-serif" }}>
              Qui se connecte, qui agit, qui décroche
            </h2>
            <p style={{ marginTop: 6, fontSize: 13, color: "var(--ls-text-muted)" }}>
              Filtre par statut, trie par colonne. Click sur une ligne pour voir le détail complet du membre.
            </p>
          </div>
          {engagementLoading ? (
            <div style={{ padding: "30px 20px", textAlign: "center", color: "var(--ls-text-muted)", fontSize: 13 }}>
              Chargement…
            </div>
          ) : (
            <EngagementTable
              members={engagementMembers}
              excludeRootId={engagementRootId}
              onMemberClick={setDrilldownMemberId}
            />
          )}
        </Card>
      ) : null}

      {/* ═══ Onglet Apprentissage (NEW 2026-05-04) — Academy + Formation ══ */}
      {activeTab === "learning" ? (
        <>
          <Card className="space-y-4">
            <div>
              <p className="eyebrow-label">🎓 Progression de l'équipe</p>
              <h2 className="mt-2 text-xl font-bold text-white" style={{ fontFamily: "Syne, sans-serif" }}>
                Academy & Formation par membre
              </h2>
              <p style={{ marginTop: 6, fontSize: 13, color: "var(--ls-text-muted)" }}>
                Visualise en 1 vue la progression Academy (12 sections) et Formation pyramide (N1/N2/N3).
                Click sur une carte pour voir le détail XP + activité.
              </p>
            </div>
            {engagementLoading ? (
              <div style={{ padding: "30px 20px", textAlign: "center", color: "var(--ls-text-muted)", fontSize: 13 }}>
                Chargement…
              </div>
            ) : (
              <LearningGrid
                members={engagementMembers}
                excludeRootId={engagementRootId}
                onMemberClick={setDrilldownMemberId}
              />
            )}
          </Card>

          {/* Leaderboard Academy classique (déplacé depuis l'onglet Équipe). */}
          <AcademyLeaderboard />
        </>
      ) : null}

      {/* ═══ Onglet Arbre lignée — arbre + fiche détail (existant) ══════ */}
      {activeTab === "team" ? (
        <>

      {/* Hero stats équipe (premium dashboard 2026-04-29) */}
      <TeamHeroStats
        membersCount={rows.length}
        teamClients={(() => {
          const memberIds = new Set(rows.map((r) => r.user_id));
          return clients.filter((c) => memberIds.has(c.distributorId));
        })()}
        teamProspects={(() => {
          const memberIds = new Set(rows.map((r) => r.user_id));
          return prospects.filter((p) => memberIds.has(p.distributorId));
        })()}
      />

      {treeError ? (
        <div
          role="alert"
          style={{
            padding: "14px 16px",
            borderRadius: 12,
            background: "rgba(220,38,38,0.12)",
            border: "1px solid rgba(220,38,38,0.4)",
            color: "#FCA5A5",
            fontSize: 13,
            lineHeight: 1.5,
          }}
        >
          <strong style={{ color: "#FEE2E2" }}>⚠ RPC indisponible — </strong>
          {treeError}
        </div>
      ) : null}

      {/* ═══ Bloc Arbre ═══════════════════════════════════════════════════ */}
      <Card className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="eyebrow-label">Arborescence</p>
            <h2 className="mt-2 text-xl font-bold text-white" style={{ fontFamily: "Syne, sans-serif" }}>
              Mon équipe · {rows.length} distributeur{rows.length > 1 ? "s" : ""}
            </h2>
          </div>
          <PeriodSwitch value={period} onChange={setPeriod} />
        </div>

        {treeLoading && !tree ? (
          <div
            style={{
              padding: "24px 16px",
              textAlign: "center",
              color: "var(--ls-text-muted)",
              fontSize: 13,
            }}
          >
            Chargement de l&apos;arbre…
          </div>
        ) : tree ? (
          <div className="team-tree" style={{ overflowX: "auto", paddingBottom: 8 }}>
            <TreeLevel
              node={tree}
              isRoot
              selectedId={effectiveSelectedId}
              onSelect={(id) => {
                setSelectedId(id);
                // Quick modal au click si admin (V3.1 — 2026-04-29 :
                // ouvre AUSSI sur la couple virtuelle, le modal gere le switch).
                if (currentUser?.role === "admin") {
                  setQuickModalUserId(id);
                }
              }}
            />
          </div>
        ) : (
          <div style={{ fontSize: 13, color: "var(--ls-text-muted)" }}>
            Arbre indisponible pour l&apos;instant.
          </div>
        )}
      </Card>

      {/* ═══ Fiche distri sélectionné ════════════════════════════════════ */}
      {selectedRow ? (
        <DistributorDetailCard
          row={selectedRow}
          sponsorName={
            selectedRow.parent_id && !isCoupleVirtualId(selectedRow.parent_id)
              ? rows.find((r) => r.user_id === selectedRow.parent_id)?.name ?? null
              : null
          }
          stats={selectedStats}
          period={period}
          ranking={ranking}
          rootUserName={useCoupleMode ? COUPLE_DISPLAY_NAME : rootUser.name}
          isCouple={isCoupleVirtualId(selectedRow.user_id)}
          hasRecentActivity={(() => {
            const ids = isCoupleVirtualId(selectedRow.user_id) ? coupleMemberIds : [selectedRow.user_id];
            return ids.some((id) => hasRecentActivityFromContext(id, clients, prospects, period));
          })()}
          activity={(() => {
            const ids = isCoupleVirtualId(selectedRow.user_id) ? coupleMemberIds : [selectedRow.user_id];
            const merged = ids.flatMap((id) => buildRecentActivity(id, clients, prospects, users));
            return merged
              .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
              .slice(0, 5);
          })()}
        />
      ) : null}

      {/* Note 2026-05-04 : AcademyLeaderboard déplacé dans l'onglet
          Apprentissage (cohérence pédagogique). */}

        </>
      ) : null}

      {/* ═══ Onglet Gamification — challenges + saison + recap ═════════ */}
      {activeTab === "gamification" ? (
        <>
          {/* Recap semaine derniere partageable — bilan equipe top du tab */}
          <WeeklyRecapCard />

          {/* Challenge hebdo bilans — focus court terme */}
          <WeeklyBilansChallenge />

          {/* Saison mensuelle — focus moyen terme */}
          <MonthlySeasonCard />
        </>
      ) : null}

      {/* Quick modal au click sur un distri (admin only) — V3.1 2026-04-29
          Si couple virtuelle, on passe les 2 membres pour le switch interne. */}
      {quickModalUserId && (() => {
        // Cas couple virtuelle : recuperer Thomas + Melanie depuis coupleMemberIds
        if (isCoupleVirtualId(quickModalUserId)) {
          const members = coupleMemberIds
            .map((mid) => users.find((u) => u.id === mid))
            .filter((u): u is NonNullable<typeof u> => !!u);
          if (members.length === 0) return null;
          // user = 1er membre par defaut, mais le modal gere le switch
          return (
            <DistriQuickModal
              user={members[0]}
              clients={clients}
              followUps={followUps}
              onClose={() => setQuickModalUserId(null)}
              coupleMembers={members}
            />
          );
        }
        const targetUser = users.find((u) => u.id === quickModalUserId);
        if (!targetUser) return null;
        return (
          <DistriQuickModal
            user={targetUser}
            clients={clients}
            followUps={followUps}
            onClose={() => setQuickModalUserId(null)}
          />
        );
      })()}

      {/* Drill-down membre (2026-05-04) — déclenché depuis Vue d'ensemble,
          Engagement ou Apprentissage. Affiche XP breakdown + Academy +
          Formation + Activité + Engagement + CTA fiche complète. */}
      <TeamMemberDrilldownModal
        member={drilldownMember}
        onClose={() => setDrilldownMemberId(null)}
      />
    </div>
  );
}

// Helper : activité récente depuis AppContext (plus léger que RPC dédiée)
function hasRecentActivityFromContext(
  userId: string,
  clients: ReturnType<typeof useAppContext>["clients"],
  prospects: ReturnType<typeof useAppContext>["prospects"],
  period: Period,
): boolean {
  const periodStart = (() => {
    const d = new Date();
    if (period === "week") {
      const day = d.getDay() || 7;
      d.setDate(d.getDate() - (day - 1));
    } else if (period === "month") {
      d.setDate(1);
    } else {
      d.setMonth(0, 1);
    }
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  })();
  return (
    clients.some(
      (c) =>
        c.distributorId === userId &&
        c.startDate &&
        new Date(c.startDate).getTime() >= periodStart,
    ) ||
    prospects.some(
      (p) => p.distributorId === userId && new Date(p.createdAt).getTime() >= periodStart,
    )
  );
}

function buildRecentActivity(
  userId: string,
  clients: ReturnType<typeof useAppContext>["clients"],
  prospects: ReturnType<typeof useAppContext>["prospects"],
  allUsers: ReturnType<typeof useAppContext>["users"],
): Array<{ label: string; date: string; color: string }> {
  const events: Array<{ label: string; date: string; color: string }> = [];
  clients
    .filter((c) => c.distributorId === userId && c.startDate)
    .forEach((c) => {
      events.push({
        label: `Nouveau bilan · ${c.firstName} ${c.lastName[0] ?? ""}.`,
        date: c.startDate!,
        color: "#0F6E56",
      });
    });
  prospects
    .filter((p) => p.distributorId === userId)
    .forEach((p) => {
      events.push({
        label: `Nouveau prospect · ${p.firstName} ${p.lastName[0] ?? ""}.`,
        date: p.createdAt,
        color: "#EF9F27",
      });
    });
  allUsers
    .filter((u) => u.sponsorId === userId && u.createdAt)
    .forEach((u) => {
      events.push({
        label: `A parrainé ${u.name} dans son équipe`,
        date: u.createdAt!,
        color: "#4285F4",
      });
    });
  return events
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5);
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
        isSelected={selectedId === node.row.user_id}
        onSelect={() => onSelect(node.row.user_id)}
      />
      {node.children.length > 0 ? (
        <>
          <div aria-hidden="true" style={{ width: 1, height: 16, background: "var(--ls-border)" }} />
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
                key={child.row.user_id}
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
  const row = node.row;
  const isCouple = isCoupleVirtualId(row.user_id);
  const rootStyle: React.CSSProperties = isRoot
    ? {
        background: "linear-gradient(135deg, rgba(239,159,39,0.18), rgba(186,117,23,0.06))",
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
  const avatarLabel = isCouple ? COUPLE_INITIALS : initialsOf(row.name);

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
          fontSize: isRoot ? (isCouple ? 13 : 15) : 12,
          fontWeight: 700,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          letterSpacing: isCouple ? "0.02em" : undefined,
        }}
        aria-label={isCouple ? `Couple ${row.name}` : row.name}
      >
        {avatarLabel}
      </div>
      <div style={{ fontSize: isRoot ? 13 : 12, fontWeight: 600, color: "var(--ls-text)" }}>
        {row.name}
      </div>
      <div
        style={{
          fontSize: 10,
          color: isRoot ? "#854F0B" : "var(--ls-text-hint)",
          letterSpacing: "0.02em",
        }}
      >
        {isRoot ? `${row.title || "World Team"} · ${row.role === "admin" ? "Admin" : ""}`.trim() : row.title || "Distributeur"}
      </div>
      <div style={{ fontSize: 10, color: "var(--ls-text-muted)" }}>
        {row.clients_count} client{row.clients_count > 1 ? "s" : ""} · {row.prospects_count} prospect{row.prospects_count > 1 ? "s" : ""}
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
  row,
  sponsorName,
  stats,
  period,
  ranking,
  rootUserName,
  isCouple,
  hasRecentActivity,
  activity,
}: {
  row: TeamTreeRow;
  sponsorName: string | null;
  stats: ReturnType<typeof useDistributorStats>["stats"];
  period: Period;
  ranking: TeamRankingEntry[];
  rootUserName: string;
  isCouple: boolean;
  hasRecentActivity: boolean;
  activity: Array<{ label: string; date: string; color: string }>;
}) {
  const memberSince = row.created_at
    ? new Date(row.created_at).toLocaleDateString("fr-FR", { month: "long", year: "numeric" })
    : "—";

  return (
    <Card style={{ borderTop: isCouple ? "2px solid #BA7517" : "2px solid #0F6E56" }} className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: "50%",
              background: isCouple
                ? "linear-gradient(135deg, #EF9F27, #BA7517)"
                : "#0F6E56",
              color: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontFamily: "Syne, sans-serif",
              fontSize: isCouple ? 14 : 16,
              fontWeight: 700,
              flexShrink: 0,
              letterSpacing: isCouple ? "0.02em" : undefined,
            }}
          >
            {isCouple ? COUPLE_INITIALS : initialsOf(row.name)}
          </div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 600, color: "var(--ls-text)" }}>{row.name}</div>
            <div style={{ fontSize: 11, color: "var(--ls-text-muted)", marginTop: 2 }}>
              {row.title || "Distributeur"}
              {sponsorName ? ` · Parrainé·e par ${sponsorName}` : ""}
              {!isCouple && row.created_at ? ` · Depuis ${memberSince}` : ""}
            </div>
          </div>
        </div>
        <StatusPill active={hasRecentActivity} />
      </div>

      {/* 3 KPI */}
      <div className="grid gap-2" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))" }}>
        <KpiCard
          label="Clients actifs"
          value={stats?.active_clients_count ?? row.active_clients_count}
          delta={
            stats && stats.active_clients_delta > 0
              ? `+${stats.active_clients_delta} ${periodLabel(period)}`
              : undefined
          }
          deltaPositive={Boolean(stats && stats.active_clients_delta > 0)}
        />
        <KpiCard
          label="Prospects"
          value={stats?.prospects_count ?? row.prospects_count}
          sub={
            stats && stats.prospects_hot_count > 0
              ? `dont ${stats.prospects_hot_count} chauds`
              : "aucun chaud"
          }
        />
        <KpiCard
          label="Sous-équipe"
          value={stats?.subteam_count ?? row.subteam_count}
          sub={
            (stats?.subteam_count ?? row.subteam_count) > 0 ? "distri parrainés" : "aucun"
          }
        />
      </div>

      {/* 2 donuts */}
      <div className="grid gap-2" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))" }}>
        <DonutCard
          label="Rétention prospects → clients"
          value={stats?.retention_prospects_pct != null ? Number(stats.retention_prospects_pct) : null}
          color="#0F6E56"
          hint={
            stats && stats.retention_prospects_total > 0
              ? `${stats.retention_prospects_converted} prospects sur ${stats.retention_prospects_total} convertis en clients`
              : `Aucun prospect ${periodLabel(period)}`
          }
        />
        <DonutCard
          label="Fidélisation clients"
          value={stats?.retention_clients_pct != null ? Number(stats.retention_clients_pct) : null}
          color="#BA7517"
          hint={
            stats && stats.retention_clients_total > 0
              ? `${stats.retention_clients_still_active} clients sur ${stats.retention_clients_total} toujours actifs`
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
        {activity.length > 0 ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {activity.map((ev, i) => (
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
              <RankingRow key={entry.user_id} rank={i + 1} entry={entry} />
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

      {/* Footer : voir profil (caché pour la row couple virtuelle — pas de
          route /distributors/couple:... côté router) */}
      {!isCouple ? (
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <Link
            to={`/distributors/${row.user_id}`}
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
      ) : null}
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
  const rel = diffDays < 1 ? "Aujourd'hui" : diffDays === 1 ? "Hier" : `Il y a ${diffDays} j`;
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

function RankingRow({ rank, entry }: { rank: number; entry: TeamRankingEntry }) {
  const entryIsCouple = isCoupleVirtualId(entry.user_id);
  const medal = rank === 1 ? "🥇" : rank === 2 ? "🥈" : "🥉";
  const bg =
    rank === 1
      ? "linear-gradient(90deg, rgba(239,159,39,0.15), rgba(239,159,39,0.02))"
      : "var(--ls-surface2)";
  const border = rank === 1 ? "3px solid #EF9F27" : "3px solid transparent";

  const metric =
    entry.clients_delta > 0
      ? `+${entry.clients_delta} client${entry.clients_delta > 1 ? "s" : ""}`
      : entry.prospects_period > 0
        ? `+${entry.prospects_period} prospect${entry.prospects_period > 1 ? "s" : ""}`
        : "en phase de démarrage";
  const retention =
    entry.retention_prospects_pct != null ? ` · ${entry.retention_prospects_pct}% rétention` : "";

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
      <span aria-hidden="true" style={{ fontSize: 16 }}>{medal}</span>
      <div
        style={{
          width: 24,
          height: 24,
          borderRadius: "50%",
          background: entryIsCouple ? "linear-gradient(135deg, #EF9F27, #BA7517)" : "#0F6E56",
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
        {entryIsCouple ? COUPLE_INITIALS : initialsOf(entry.name)}
      </div>
      <div style={{ flex: 1, fontSize: 12, fontWeight: 600, color: "var(--ls-text)" }}>
        {entry.name}
      </div>
      <div style={{ fontSize: 11, color: "var(--ls-text-muted)" }}>
        {metric}
        {retention}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// TeamHeroStats — bandeau dashboard premium en haut de l'onglet Équipe
// ═══════════════════════════════════════════════════════════════════════

function TeamHeroStats({
  membersCount,
  teamClients,
  teamProspects,
}: {
  membersCount: number;
  teamClients: Client[];
  teamProspects: Prospect[];
}) {
  const activeClients = teamClients.filter((c) => c.lifecycleStatus === "active").length;
  const fragileClients = teamClients.filter((c) => c.lifecycleStatus === "paused" || c.lifecycleStatus === "stopped").length;
  const upcomingProspects = teamProspects.filter((p) => p.status === "scheduled").length;

  const stats: Array<{ label: string; value: number | string; emoji: string; color: string }> = [
    { label: "Membres équipe", value: membersCount, emoji: "👥", color: "#B8922A" },
    { label: "Clients actifs", value: activeClients, emoji: "🌱", color: "#1D9E75" },
    { label: "Prospects programmés", value: upcomingProspects, emoji: "🎯", color: "#7F77DD" },
    { label: "À ré-engager", value: fragileClients, emoji: "⚡", color: "#D85A30" },
  ];

  return (
    <div
      style={{
        background: "linear-gradient(135deg, rgba(184,146,42,0.10) 0%, rgba(127,119,221,0.06) 100%)",
        border: "0.5px solid rgba(184,146,42,0.30)",
        borderRadius: 16,
        padding: 22,
      }}
    >
      <div style={{ marginBottom: 16 }}>
        <p
          style={{
            fontSize: 11,
            color: "var(--ls-text-muted)",
            textTransform: "uppercase",
            letterSpacing: "0.06em",
            margin: 0,
            fontWeight: 600,
          }}
        >
          🎯 Vue d&apos;ensemble équipe
        </p>
        <h2
          style={{
            fontFamily: "Syne, sans-serif",
            fontSize: 22,
            fontWeight: 500,
            margin: "4px 0 0",
            color: "var(--ls-text)",
          }}
        >
          Ton équipe en chiffres
        </h2>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
          gap: 12,
        }}
      >
        {stats.map((s) => (
          // eslint-disable-next-line jsx-a11y/no-static-element-interactions -- Hover effect only
          <div
            key={s.label}
            style={{
              background: "var(--ls-surface)",
              border: "0.5px solid var(--ls-border)",
              borderRadius: 12,
              padding: "14px 16px",
              transition: "transform 200ms ease-out, box-shadow 200ms ease-out",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-2px)";
              e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.08)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = "none";
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
              <span style={{ fontSize: 18 }}>{s.emoji}</span>
              <span
                style={{
                  fontSize: 10,
                  color: "var(--ls-text-muted)",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  fontWeight: 600,
                  fontFamily: "DM Sans, sans-serif",
                }}
              >
                {s.label}
              </span>
            </div>
            <p
              style={{
                fontFamily: "Syne, sans-serif",
                fontSize: 28,
                fontWeight: 600,
                color: s.color,
                margin: 0,
                lineHeight: 1,
              }}
            >
              {s.value}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
