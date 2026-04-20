import { useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAppContext } from "../context/AppContext";
import { getPortfolioMetrics } from "../lib/portfolio";
import { ProspectCard } from "../components/prospect/ProspectCard";
import { FollowUpsDueWidget } from "../components/dashboard/FollowUpsDueWidget";
import type { Prospect } from "../types/domain";

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Bonjour";
  if (h < 18) return "Bon après-midi";
  return "Bonsoir";
}

export function DashboardPage() {
  const { currentUser, users, clients, followUps, pvClientProducts, pvTransactions, clientMessages, prospects } = useAppContext();
  const navigate = useNavigate();

  if (!currentUser) return null;

  // Fix dashboard scope (2026-04-20) : le dashboard d'accueil est TOUJOURS une
  // vue personnelle, même pour admin. Le filtre "Toute l'équipe" existe
  // uniquement sur la page Agenda (module dédié).
  // - Les prospects du context sont "admin voit tout" → on re-filtre ici.
  // - Les clientMessages idem → on recompte les non-lus strictement perso.
  // - Les follow-ups passent déjà par getPortfolioMetrics(scope="personal")
  //   qui scope sur user.id uniquement — OK.
  const myProspects = useMemo(
    () => prospects.filter((p) => p.distributorId === currentUser.id),
    [prospects, currentUser.id]
  );
  const myUnreadMessageCount = useMemo(
    () => clientMessages.filter((m) => !m.read && m.distributor_id === currentUser.id).length,
    [clientMessages, currentUser.id]
  );

  // Scope : uniquement le périmètre du coach
  const rawMetrics = getPortfolioMetrics(currentUser, clients, followUps, users, "personal");

  // Chantier 3 — Lifecycle : exclure les clients morts des stats opérationnelles
  const deadClientIds = useMemo(
    () => new Set(rawMetrics.clients.filter((c) => c.lifecycleStatus === "stopped" || c.lifecycleStatus === "lost").map((c) => c.id)),
    [rawMetrics.clients]
  );

  const metrics = useMemo(() => ({
    clients: rawMetrics.clients.filter((c) => !deadClientIds.has(c.id)),
    scheduledFollowUps: rawMetrics.scheduledFollowUps.filter((f) => !deadClientIds.has(f.clientId)),
    relanceFollowUps: rawMetrics.relanceFollowUps.filter((f) => !deadClientIds.has(f.clientId)),
  }), [rawMetrics, deadClientIds]);

  const scopedClientIds = useMemo(() => new Set(metrics.clients.map((c) => c.id)), [metrics.clients]);

  // Free PV tracking (2026-04-20) : clients sous un autre superviseur, exclus
  // des listes de réassort (carte cockpit + priorités). On les garde visibles
  // dans le reste du dashboard (stats clients, RDV, etc.).
  const pvTrackedClientIds = useMemo(
    () => new Set(metrics.clients.filter((c) => !c.freePvTracking).map((c) => c.id)),
    [metrics.clients]
  );

  // Clients fragiles (non morts) du périmètre
  const fragileClients = useMemo(
    () => metrics.clients.filter((c) => c.isFragile === true).slice(0, 5),
    [metrics.clients]
  );

  // ─── Calculs tuiles ──────────────────────────────────────────────
  const todayStr = new Date().toISOString().slice(0, 10);

  const todayFollowUps = useMemo(
    () => metrics.scheduledFollowUps.filter((f) => f.dueDate?.slice(0, 10) === todayStr),
    [metrics.scheduledFollowUps, todayStr]
  );

  // Fix UX (2026-04-20) : inclure les RDV prospects du jour dans le compteur
  // "RDV aujourd'hui". Avant, on comptait uniquement les follow-ups clients,
  // alors que le widget "Agenda prospection" affichait déjà des prospects du
  // jour (valeur incohérente avec la carte cockpit).
  const todayProspects = useMemo(
    () =>
      myProspects.filter(
        (p) => p.status === "scheduled" && p.rdvDate?.slice(0, 10) === todayStr
      ),
    [myProspects, todayStr]
  );

  const todayRdvTotal = todayFollowUps.length + todayProspects.length;

  // Prochain RDV du jour : le plus tôt, tous types confondus.
  const nextRdvToday = useMemo(() => {
    const all: Array<{ date: string }> = [
      ...todayFollowUps.map((f) => ({ date: f.dueDate })),
      ...todayProspects.map((p) => ({ date: p.rdvDate })),
    ];
    return all.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0];
  }, [todayFollowUps, todayProspects]);

  const nextFollowUpToday = useMemo(
    () =>
      [...todayFollowUps].sort(
        (a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
      )[0],
    [todayFollowUps]
  );

  const overdueFollowUps = metrics.relanceFollowUps;

  const upcomingFollowUps = useMemo(
    () =>
      metrics.scheduledFollowUps.filter((f) => {
        const days = (new Date(f.dueDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
        return days >= 0 && days <= 7;
      }),
    [metrics.scheduledFollowUps]
  );

  const totalRelances = overdueFollowUps.length + upcomingFollowUps.length;

  const overdueReassorts = useMemo(() => {
    const now = new Date();
    return (pvClientProducts ?? [])
      // Free PV tracking (2026-04-20) : exclure les clients avec flag actif
      .filter((p) => p.active && pvTrackedClientIds.has(p.clientId))
      .map((p) => {
        const end = new Date(p.startDate);
        end.setDate(end.getDate() + p.durationReferenceDays);
        const daysRemaining = Math.floor((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        return { ...p, daysRemaining };
      })
      .filter((p) => p.daysRemaining < 0);
  }, [pvClientProducts, pvTrackedClientIds]);

  // ─── Top 3 priorités du jour ────────────────────────────────────
  const topPriorities = useMemo(() => {
    type Item = {
      type: string;
      clientId: string;
      clientName: string;
      subtitle: string;
      borderColor: string;
      subtitleColor: string;
      action: string;
      actionStyle: "primary" | "secondary" | "tertiary";
    };
    const items: Item[] = [];

    // 1. Le réassort le plus en retard
    const topReassort = [...overdueReassorts].sort((a, b) => (a.daysRemaining ?? 0) - (b.daysRemaining ?? 0))[0];
    if (topReassort) {
      const client = clients.find((c) => c.id === topReassort.clientId);
      items.push({
        type: "reassort",
        clientId: topReassort.clientId,
        clientName: client ? `${client.firstName} ${client.lastName}` : "Client inconnu",
        subtitle: `Réassort en retard · ${topReassort.productName}`,
        borderColor: "#DC2626",
        subtitleColor: "var(--ls-coral)",
        action: "Contacter",
        actionStyle: "primary",
      });
    }

    // 2. Prochain RDV du jour
    if (nextFollowUpToday) {
      const client = clients.find((c) => c.id === nextFollowUpToday.clientId);
      if (client) {
        items.push({
          type: "rdv",
          clientId: client.id,
          clientName: `${client.firstName} ${client.lastName}`,
          subtitle: `RDV aujourd'hui · ${new Date(nextFollowUpToday.dueDate).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}`,
          borderColor: "#B8922A",
          subtitleColor: "var(--ls-gold)",
          action: "Préparer",
          actionStyle: "secondary",
        });
      }
    }

    // 3. Premier client sans suivi planifié
    const clientWithoutFollowUp = metrics.clients.find(
      (c) => c.status === "active" && !followUps.some((f) => f.clientId === c.id && f.status === "scheduled")
    );
    if (clientWithoutFollowUp) {
      items.push({
        type: "planify",
        clientId: clientWithoutFollowUp.id,
        clientName: `${clientWithoutFollowUp.firstName} ${clientWithoutFollowUp.lastName}`,
        subtitle: "1er suivi à programmer",
        borderColor: "#0D9488",
        subtitleColor: "var(--ls-teal)",
        action: "Planifier",
        actionStyle: "tertiary",
      });
    }

    return items.slice(0, 3);
  }, [overdueReassorts, nextFollowUpToday, clients, metrics.clients, followUps]);

  // ─── Stats semaine ───────────────────────────────────────────────
  const weekStats = useMemo(() => {
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

    const newClientsWeek = metrics.clients.filter((c) => {
      if (!c.startDate) return false;
      return new Date(c.startDate).getTime() >= weekAgo;
    }).length;

    const assessmentsWeek = metrics.clients.reduce((total, c) => {
      return total + (c.assessments ?? []).filter((a) => a.date && new Date(a.date).getTime() >= weekAgo).length;
    }, 0);

    const thisMonth = new Date().getMonth();
    const thisYear = new Date().getFullYear();
    const pvMonth = (pvTransactions ?? [])
      .filter((t) => scopedClientIds.has(t.clientId))
      .reduce((sum, t) => {
        const d = new Date(t.date);
        if (d.getMonth() === thisMonth && d.getFullYear() === thisYear) {
          return sum + (t.pv ?? 0);
        }
        return sum;
      }, 0);

    return {
      newClients: newClientsWeek,
      pvMonth: pvMonth.toFixed(0),
      assessments: assessmentsWeek,
    };
  }, [metrics.clients, pvTransactions, scopedClientIds]);

  // Chantier Agenda : prospects du jour (scope personnel sur le dashboard)
  const prospectsToday = useMemo(() => {
    const today = new Date().toDateString();
    return myProspects
      .filter((p) => {
        try {
          return new Date(p.rdvDate).toDateString() === today;
        } catch { return false; }
      })
      .sort((a, b) => new Date(a.rdvDate).getTime() - new Date(b.rdvDate).getTime());
  }, [myProspects]);

  const prospectsTodayScheduled = prospectsToday.filter((p) => p.status === 'scheduled');
  const prospectsTodayDone = prospectsToday.filter((p) => p.status === 'done' || p.status === 'converted');

  // Chantier Cold : prospects à réchauffer (cold_until <= maintenant) — scope perso.
  const coldToWarm = useMemo(() => {
    const nowTime = Date.now();
    return myProspects
      .filter((p) => {
        if (p.status !== 'cold') return false;
        if (!p.coldUntil) return false;
        try {
          return new Date(p.coldUntil).getTime() <= nowTime;
        } catch { return false; }
      })
      .sort((a, b) => new Date(a.coldUntil ?? 0).getTime() - new Date(b.coldUntil ?? 0).getTime());
  }, [myProspects]);

  return (
    <div style={{ padding: "clamp(16px, 4vw, 28px)", maxWidth: 1200, margin: "0 auto", display: "flex", flexDirection: "column", gap: 20 }}>
      {/* HEADER */}
      <div className="dashboard-header" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 14 }}>
        <div>
          <h1 style={{ fontFamily: "Syne, sans-serif", fontWeight: 800, fontSize: "clamp(22px, 4vw, 30px)", color: "var(--ls-text)", margin: 0, letterSpacing: "-0.5px" }}>
            {greeting()}, {currentUser.name?.split(" ")[0] ?? "Coach"} ✦
          </h1>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6, fontSize: 13, color: "var(--ls-text-muted)", textTransform: "capitalize" }}>
            <div style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--ls-teal)" }} />
            {new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
          </div>
        </div>
        <Link
          to="/assessments/new"
          style={{
            padding: "11px 20px", background: "var(--ls-gold)", color: "#fff",
            border: "none", borderRadius: 12,
            fontFamily: "Syne, sans-serif", fontSize: 13, fontWeight: 700,
            cursor: "pointer", display: "flex", alignItems: "center", gap: 7,
            boxShadow: "0 2px 8px rgba(184,146,42,0.25)", textDecoration: "none",
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Nouveau bilan
        </Link>
      </div>

      {/* 4 TUILES COCKPIT */}
      <div className="dashboard-tiles" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
        <CockpitTile
          icon={<CalendarIcon />}
          value={todayRdvTotal}
          label="RDV aujourd'hui"
          subtitle={
            nextRdvToday
              ? todayProspects.length > 0 && todayFollowUps.length > 0
                ? `${todayFollowUps.length} client${todayFollowUps.length > 1 ? "s" : ""} · ${todayProspects.length} prospect${todayProspects.length > 1 ? "s" : ""}`
                : `Prochain à ${new Date(nextRdvToday.date).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}`
              : "Aucun RDV"
          }
          borderColor="#B8922A"
          iconColor="var(--ls-gold)"
          iconBg="rgba(184,146,42,0.1)"
          valueColor="var(--ls-gold)"
          onClick={() => navigate("/agenda?filter=today")}
        />
        <CockpitTile
          icon={<ClockIcon />}
          value={totalRelances}
          label="Relances à faire"
          subtitle={overdueFollowUps.length > 0 ? `${overdueFollowUps.length} en retard` : "Tout est à jour"}
          borderColor="#DC2626"
          iconColor="var(--ls-coral)"
          iconBg="rgba(220,38,38,0.08)"
          valueColor="var(--ls-coral)"
          onClick={() => navigate(`/distributors/${currentUser.id}`)}
        />
        <CockpitTile
          icon={<PackageIcon />}
          value={overdueReassorts.length}
          label="Réassorts"
          subtitle={overdueReassorts.length > 0 ? "À contacter" : "Tout est OK"}
          borderColor="#7C3AED"
          iconColor="var(--ls-purple)"
          iconBg="rgba(124,58,237,0.08)"
          valueColor="var(--ls-purple)"
          onClick={() => navigate("/pv")}
        />
        <CockpitTile
          icon={<MessageIcon />}
          value={myUnreadMessageCount}
          label="Messages"
          subtitle={myUnreadMessageCount > 0 ? "Non lus" : "Tout lu"}
          borderColor="#0D9488"
          iconColor="var(--ls-teal)"
          iconBg="rgba(13,148,136,0.08)"
          valueColor="var(--ls-teal)"
          onClick={() => navigate("/messages")}
        />
      </div>

      {/* BLOC PRIORITÉS */}
      {topPriorities.length > 0 && (
        <div style={{ background: "var(--ls-surface)", border: "1px solid var(--ls-border)", borderRadius: 14, padding: 20 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
            <div>
              <div style={{ fontSize: 9, letterSpacing: "2px", textTransform: "uppercase", color: "var(--ls-text-hint)", fontWeight: 500, marginBottom: 4, fontFamily: "DM Sans, sans-serif" }}>
                À faire maintenant
              </div>
              <div style={{ fontFamily: "Syne, sans-serif", fontWeight: 800, fontSize: 17, color: "var(--ls-text)" }}>
                Tes {topPriorities.length} priorité{topPriorities.length > 1 ? "s" : ""} du jour
              </div>
            </div>
            <Link
              to="/clients"
              style={{
                padding: "7px 14px", border: "1px solid var(--ls-border)",
                background: "transparent", color: "var(--ls-text-muted)",
                borderRadius: 9, fontSize: 11, cursor: "pointer",
                textDecoration: "none", fontFamily: "DM Sans, sans-serif",
              }}
            >
              Voir tout →
            </Link>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {topPriorities.map((item) => (
              <PriorityItem
                key={`${item.type}-${item.clientId}`}
                item={item}
                onAction={() => navigate(`/clients/${item.clientId}`)}
              />
            ))}
          </div>
        </div>
      )}

      {/* BLOC À RÉCHAUFFER (Chantier Cold 2026-04-19) */}
      {coldToWarm.length > 0 && (
        <ColdToWarmWidget
          items={coldToWarm.slice(0, 5)}
          total={coldToWarm.length}
          onOpenAgenda={() => navigate("/agenda?filter=today")}
        />
      )}

      {/* BLOC SUIVIS À FAIRE — Chantier Protocole Agenda+Dashboard (2026-04-20) */}
      <FollowUpsDueWidget />

      {/* BLOC AGENDA PROSPECTS DU JOUR */}
      <ProspectsTodayWidget
        todayScheduled={prospectsTodayScheduled}
        todayDone={prospectsTodayDone}
        onOpenAgenda={() => navigate("/agenda?filter=today")}
        onCreate={() => navigate("/agenda")}
      />

      {/* BLOC CLIENTS FRAGILES */}
      {fragileClients.length > 0 && (
        <div style={{
          background: "var(--ls-surface)",
          border: "1px solid rgba(220,38,38,0.15)",
          borderLeft: "3px solid var(--ls-coral)",
          borderRadius: 14,
          padding: 18,
        }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
            <div>
              <div style={{ fontSize: 9, letterSpacing: "2px", textTransform: "uppercase", color: "var(--ls-coral)", fontWeight: 600, marginBottom: 4 }}>
                ⚠ Attention particulière
              </div>
              <div style={{ fontFamily: "Syne, sans-serif", fontWeight: 800, fontSize: 16, color: "var(--ls-text)" }}>
                {fragileClients.length} client{fragileClients.length > 1 ? "s" : ""} fragile{fragileClients.length > 1 ? "s" : ""}
              </div>
            </div>
            <Link
              to="/clients?filter=fragile"
              style={{
                padding: "7px 14px", border: "1px solid var(--ls-border)",
                background: "transparent", color: "var(--ls-text-muted)",
                borderRadius: 9, fontSize: 11, cursor: "pointer",
                textDecoration: "none", fontFamily: "DM Sans, sans-serif",
              }}
            >
              Voir tous →
            </Link>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {fragileClients.map((c) => (
              <Link
                key={c.id}
                to={`/clients/${c.id}`}
                style={{
                  display: "flex", alignItems: "center", gap: 10,
                  padding: "10px 12px",
                  background: "var(--ls-surface2)",
                  borderRadius: 10,
                  textDecoration: "none", color: "inherit",
                }}
              >
                <span style={{
                  display: "inline-flex",
                  padding: "2px 8px",
                  borderRadius: 8,
                  fontSize: 10,
                  fontWeight: 600,
                  background: "rgba(220,38,38,0.12)",
                  color: "var(--ls-coral)",
                  flexShrink: 0,
                }}>⚠</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ls-text)" }}>
                    {c.firstName} {c.lastName}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--ls-text-muted)" }}>
                    {c.currentProgram || "Programme à confirmer"}
                  </div>
                </div>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--ls-text-hint)" strokeWidth="2">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* 3 STATS SEMAINE */}
      <div className="dashboard-week-stats" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
        <WeekStat label="Cette semaine" value={`+${weekStats.newClients}`} sub="nouveaux clients" valueColor="var(--ls-text)" subColor="var(--ls-teal)" />
        <WeekStat label="PV du mois" value={weekStats.pvMonth} sub="cumulés" valueColor="var(--ls-gold)" subColor="var(--ls-text-muted)" />
        <WeekStat label="Bilans faits" value={weekStats.assessments} sub="sur 7 jours" valueColor="var(--ls-text)" subColor="var(--ls-text-muted)" />
      </div>
    </div>
  );
}

// ─── Sous-composants ─────────────────────────────────────────────────
type CockpitTileProps = {
  icon: React.ReactNode;
  value: number | string;
  label: string;
  subtitle: string;
  borderColor: string;
  iconColor: string;
  iconBg: string;
  valueColor: string;
  onClick: () => void;
};

function CockpitTile({ icon, value, label, subtitle, borderColor, iconColor, iconBg, valueColor, onClick }: CockpitTileProps) {
  return (
    <div
      onClick={onClick}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-2px)";
        e.currentTarget.style.boxShadow = "0 8px 24px rgba(0,0,0,0.08)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow = "none";
      }}
      style={{
        background: "var(--ls-surface)",
        border: "1px solid var(--ls-border)",
        borderTop: `3px solid ${borderColor}`,
        borderRadius: 16, padding: 18,
        cursor: "pointer", transition: "all 0.2s",
        display: "flex", flexDirection: "column", gap: 10,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{
          width: 40, height: 40, borderRadius: 12,
          background: iconBg, color: iconColor,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          {icon}
        </div>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--ls-text-hint)" strokeWidth="2">
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </div>
      <div>
        <div style={{ fontFamily: "Syne, sans-serif", fontWeight: 800, fontSize: 32, color: valueColor, lineHeight: 1 }}>
          {value}
        </div>
        <div style={{ fontSize: 11, color: "var(--ls-text-hint)", textTransform: "uppercase", letterSpacing: "1px", fontWeight: 500, marginTop: 6 }}>
          {label}
        </div>
        <div style={{ fontSize: 12, color: "var(--ls-text-muted)", marginTop: 4 }}>
          {subtitle}
        </div>
      </div>
    </div>
  );
}

type PriorityItemData = {
  type: string;
  clientId: string;
  clientName: string;
  subtitle: string;
  borderColor: string;
  subtitleColor: string;
  action: string;
  actionStyle: "primary" | "secondary" | "tertiary";
};

function PriorityItem({ item, onAction }: { item: PriorityItemData; onAction: () => void }) {
  const initials = item.clientName.split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase();

  const actionStyles: Record<string, React.CSSProperties> = {
    primary: { background: "var(--ls-gold)", color: "#fff", border: "none" },
    secondary: { background: "transparent", color: "var(--ls-gold)", border: "1px solid var(--ls-gold)" },
    tertiary: { background: "transparent", color: "var(--ls-text-muted)", border: "1px solid var(--ls-border)" },
  };

  const avatarColors =
    item.borderColor === "#DC2626"
      ? { bg: "#FEE2E2", text: "#991B1B" }
      : item.borderColor === "#B8922A"
        ? { bg: "#FAEEDA", text: "#633806" }
        : { bg: "#CCFBF1", text: "#134E4A" };

  return (
    <div
      onClick={onAction}
      className="priority-item"
      style={{
        display: "flex", alignItems: "center", gap: 14,
        padding: "12px 14px",
        background: "var(--ls-surface2)",
        borderRadius: 11,
        borderLeft: `3px solid ${item.borderColor}`,
        cursor: "pointer",
      }}
    >
      <div style={{
        width: 36, height: 36, borderRadius: "50%",
        background: avatarColors.bg, color: avatarColors.text,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontFamily: "Syne, sans-serif", fontWeight: 800, fontSize: 12, flexShrink: 0,
      }}>
        {initials}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ls-text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {item.clientName}
        </div>
        <div style={{ fontSize: 11, color: item.subtitleColor, marginTop: 2 }}>
          {item.subtitle}
        </div>
      </div>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onAction();
        }}
        style={{
          padding: "7px 14px", borderRadius: 8,
          fontSize: 11, fontWeight: 600, cursor: "pointer",
          flexShrink: 0, fontFamily: "DM Sans, sans-serif",
          ...actionStyles[item.actionStyle],
        }}
      >
        {item.action}
      </button>
    </div>
  );
}

function WeekStat({ label, value, sub, valueColor, subColor }: { label: string; value: string | number; sub: string; valueColor: string; subColor: string }) {
  return (
    <div style={{ background: "var(--ls-surface)", border: "1px solid var(--ls-border)", borderRadius: 14, padding: "14px 16px" }}>
      <div style={{ fontSize: 10, color: "var(--ls-text-hint)", textTransform: "uppercase", letterSpacing: "1px", fontWeight: 500, marginBottom: 6 }}>
        {label}
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
        <div style={{ fontFamily: "Syne, sans-serif", fontWeight: 800, fontSize: 22, color: valueColor }}>{value}</div>
        <div style={{ fontSize: 11, color: subColor, fontWeight: 600 }}>{sub}</div>
      </div>
    </div>
  );
}

function CalendarIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

function PackageIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
      <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
      <line x1="12" y1="22.08" x2="12" y2="12" />
    </svg>
  );
}

function MessageIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}

// ─── Widget Agenda du jour (Chantier Prospects 2026-04-19) ──────────────
function ProspectsTodayWidget({
  todayScheduled,
  todayDone,
  onOpenAgenda,
  onCreate,
}: {
  todayScheduled: Prospect[];
  todayDone: Prospect[];
  onOpenAgenda: () => void;
  onCreate: () => void;
}) {
  const total = todayScheduled.length + todayDone.length;
  const nextThree = todayScheduled.slice(0, 3);

  return (
    <div
      style={{
        background: "var(--ls-surface)",
        border: "1px solid var(--ls-border)",
        borderRadius: 14,
        padding: 20,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14, flexWrap: "wrap", gap: 10 }}>
        <div>
          <div style={{ fontSize: 9, letterSpacing: "2px", textTransform: "uppercase", color: "var(--ls-text-hint)", fontWeight: 500, marginBottom: 4, fontFamily: "DM Sans, sans-serif" }}>
            Agenda prospection
          </div>
          <div style={{ fontFamily: "Syne, sans-serif", fontWeight: 800, fontSize: 17, color: "var(--ls-text)" }}>
            {total === 0
              ? "Aucun RDV aujourd'hui"
              : `Agenda du jour · ${todayScheduled.length} programmé${todayScheduled.length > 1 ? "s" : ""}`}
          </div>
          {todayDone.length > 0 && (
            <div style={{ fontSize: 11, color: "var(--ls-text-muted)", marginTop: 4 }}>
              {todayDone.length} effectué{todayDone.length > 1 ? "s" : ""} aujourd'hui
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={onOpenAgenda}
          style={{
            padding: "7px 14px", border: "1px solid var(--ls-border)",
            background: "transparent", color: "var(--ls-text-muted)",
            borderRadius: 9, fontSize: 11, cursor: "pointer",
            fontFamily: "DM Sans, sans-serif",
          }}
        >
          Voir tout →
        </button>
      </div>

      {nextThree.length === 0 ? (
        <div style={{ textAlign: "center", padding: "18px 0 8px" }}>
          <div style={{ fontSize: 12, color: "var(--ls-text-muted)", marginBottom: 10 }}>
            Aucun RDV prospection aujourd'hui.
          </div>
          <button
            type="button"
            onClick={onCreate}
            style={{
              padding: "8px 16px", background: "var(--ls-gold)", color: "var(--ls-bg)",
              border: "none", borderRadius: 10,
              fontFamily: "Syne, sans-serif", fontSize: 12, fontWeight: 700,
              cursor: "pointer",
            }}
          >
            + Nouveau RDV
          </button>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {nextThree.map((p) => (
            <ProspectCard
              key={p.id}
              prospect={p}
              onClick={() => onOpenAgenda()}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Widget À réchauffer (Chantier Cold 2026-04-19) ─────────────────────
function ColdToWarmWidget({
  items,
  total,
  onOpenAgenda,
}: {
  items: Prospect[];
  total: number;
  onOpenAgenda: () => void;
}) {
  function formatRelative(iso?: string): string {
    if (!iso) return "";
    try {
      const diff = Date.now() - new Date(iso).getTime();
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      if (days < 1) return "aujourd'hui";
      if (days < 7) return `il y a ${days} j`;
      if (days < 30) return `il y a ${Math.floor(days / 7)} sem`;
      if (days < 365) return `il y a ${Math.floor(days / 30)} mois`;
      return `il y a ${Math.floor(days / 365)} an${Math.floor(days / 365) > 1 ? "s" : ""}`;
    } catch { return ""; }
  }

  return (
    <div
      style={{
        background: "var(--ls-surface)",
        border: "1px solid color-mix(in srgb, var(--ls-teal) 30%, transparent)",
        borderLeft: "3px solid var(--ls-teal)",
        borderRadius: 14,
        padding: 18,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 9, letterSpacing: "2px", textTransform: "uppercase", color: "var(--ls-teal)", fontWeight: 600, marginBottom: 4 }}>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="2" x2="12" y2="22" />
              <line x1="2" y1="12" x2="22" y2="12" />
              <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
              <line x1="19.07" y1="4.93" x2="4.93" y2="19.07" />
            </svg>
            SUIVIS À REPRENDRE
          </div>
          <div style={{ fontFamily: "Syne, sans-serif", fontWeight: 800, fontSize: 17, color: "var(--ls-text)" }}>
            {total} prospect{total > 1 ? "s" : ""} à relancer aujourd'hui
          </div>
        </div>
        <button
          type="button"
          onClick={onOpenAgenda}
          style={{
            padding: "7px 14px", border: "1px solid var(--ls-border)",
            background: "transparent", color: "var(--ls-text-muted)",
            borderRadius: 9, fontSize: 11, cursor: "pointer",
            fontFamily: "DM Sans, sans-serif",
          }}
        >
          Voir tout →
        </button>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {items.map((p) => (
          <div
            key={p.id}
            style={{
              display: "flex", alignItems: "center", gap: 12,
              padding: "8px 12px",
              borderRadius: 10,
              background: "var(--ls-surface2)",
              fontSize: 13,
              fontFamily: "DM Sans, sans-serif",
            }}
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ color: "var(--ls-text)", fontWeight: 500 }}>
                {p.firstName} {p.lastName}
              </div>
              {p.coldReason && (
                <div style={{ fontSize: 11, color: "var(--ls-text-muted)", marginTop: 2, fontStyle: "italic", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  « {p.coldReason} »
                </div>
              )}
            </div>
            <div style={{ fontSize: 11, color: "var(--ls-text-hint)", whiteSpace: "nowrap" }}>
              {formatRelative(p.rdvDate)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
