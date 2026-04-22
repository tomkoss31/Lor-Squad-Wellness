// Chantier Refonte Navigation (2026-04-22) — commit 2/5.
//
// Nouveau dashboard "Co-pilote". Structure :
//   - Header live clock + salutation + bouton "+ Nouveau bilan" top-right
//   - 3 badges "d'un coup d'œil" (clients actifs, dossiers, PV mois)
//   - Grid 2x2 KPI cards (RDV aujourd'hui, messages non lus, suivis à
//     faire, PV mois avec objectif)
//   - Graph SVG courbe des PV sur 30 jours
//
// Aucune dépendance à la logique métier (calculations/portfolio) :
//   tout est dérivé de useAppContext (clients, followUps, clientMessages,
//   pvTransactions, prospects, currentUser) + de l'heure locale.

import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAppContext } from "../context/AppContext";
import { PageHeading } from "../components/ui/PageHeading";
import { InboxWidget } from "../components/copilote/InboxWidget";

function useLiveClock(): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(id);
  }, []);
  return now;
}

function formatDateLong(d: Date): string {
  return d.toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatTimeShort(d: Date): string {
  return d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

function greetingFor(d: Date): string {
  const h = d.getHours();
  if (h < 6) return "Bonne nuit";
  if (h < 12) return "Bonjour";
  if (h < 18) return "Bon après-midi";
  return "Bonsoir";
}

export function CoPilotePage() {
  const {
    currentUser,
    clients,
    followUps,
    clientMessages,
    pvTransactions,
    prospects,
  } = useAppContext();
  const now = useLiveClock();

  // ─── Derived stats (scopées au user courant) ──────────────────────────
  const stats = useMemo(() => {
    if (!currentUser) {
      return {
        activeClients: 0,
        totalClients: 0,
        pvMonth: 0,
        todayRdvCount: 0,
        nextRdvTime: null as string | null,
        unreadCount: 0,
        pendingFollowups: 0,
      };
    }

    const isAdmin = currentUser.role === "admin";
    const myClients = isAdmin
      ? clients
      : clients.filter((c) => c.distributorId === currentUser.id);
    const myFollowUps = isAdmin
      ? followUps
      : followUps.filter((f) => myClients.some((c) => c.id === f.clientId));
    const myMessages = clientMessages.filter((m) => {
      const senderLabel = m.sender ?? "client";
      if (senderLabel !== "client") return false;
      return (
        isAdmin ||
        m.distributor_id === currentUser.id ||
        m.distributor_id === currentUser.name
      );
    });
    const myProspects = isAdmin
      ? prospects
      : prospects.filter((p) => p.distributorId === currentUser.id);

    // Clients actifs : lifecycle_status === 'active' ou par défaut actif.
    const activeClients = myClients.filter(
      (c) => (c.lifecycleStatus ?? "active") === "active",
    ).length;

    // PV du mois en cours.
    const y = now.getFullYear();
    const m = now.getMonth();
    const myTxns = isAdmin
      ? pvTransactions
      : pvTransactions.filter((t) => t.responsibleId === currentUser.id);
    const pvMonth = myTxns
      .filter((t) => {
        const d = new Date(t.date);
        return d.getFullYear() === y && d.getMonth() === m;
      })
      .reduce((acc, t) => acc + (t.pv || 0), 0);

    // RDV du jour (follow-ups + prospects).
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todayFollowUps = myFollowUps.filter((f) => {
      if (f.status !== "scheduled") return false;
      const d = new Date(f.dueDate);
      return d >= today && d < tomorrow;
    });
    const todayProspects = myProspects.filter((p) => {
      if (p.status !== "scheduled") return false;
      try {
        const d = new Date(p.rdvDate);
        return d >= today && d < tomorrow;
      } catch {
        return false;
      }
    });

    // Plus proche RDV à venir (aujourd'hui compris).
    const upcomingDates: Date[] = [
      ...todayFollowUps.map((f) => new Date(f.dueDate)),
      ...todayProspects.map((p) => new Date(p.rdvDate)),
    ]
      .filter((d) => !Number.isNaN(d.getTime()) && d >= now)
      .sort((a, b) => a.getTime() - b.getTime());

    const nextRdvTime = upcomingDates[0]
      ? formatTimeShort(upcomingDates[0])
      : null;

    const unreadCount = myMessages.filter((m) => !m.read).length;

    // Suivis à faire = follow-ups scheduled + follow-ups en relance.
    const pendingFollowups = myFollowUps.filter(
      (f) => f.status === "pending" || f.status === "scheduled",
    ).length;

    return {
      activeClients,
      totalClients: myClients.length,
      pvMonth,
      todayRdvCount: todayFollowUps.length + todayProspects.length,
      nextRdvTime,
      unreadCount,
      pendingFollowups,
    };
  }, [
    clients,
    followUps,
    clientMessages,
    pvTransactions,
    prospects,
    currentUser,
    now,
  ]);

  // ─── Graph 30 jours : PV par jour ─────────────────────────────────────
  const graphPoints = useMemo(() => {
    if (!currentUser) return [] as { date: string; pv: number }[];
    const isAdmin = currentUser.role === "admin";
    const myTxns = isAdmin
      ? pvTransactions
      : pvTransactions.filter((t) => t.responsibleId === currentUser.id);

    const byDay = new Map<string, number>();
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - 29);

    // Init toutes les cases à 0 pour avoir 30 points exacts.
    for (let i = 0; i < 30; i++) {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      byDay.set(d.toISOString().slice(0, 10), 0);
    }

    for (const t of myTxns) {
      const d = new Date(t.date);
      if (d < start || d > now) continue;
      const key = d.toISOString().slice(0, 10);
      byDay.set(key, (byDay.get(key) ?? 0) + (t.pv || 0));
    }

    return Array.from(byDay.entries())
      .sort((a, b) => (a[0] < b[0] ? -1 : 1))
      .map(([date, pv]) => ({ date, pv }));
  }, [pvTransactions, currentUser, now]);

  const firstName = useMemo(() => {
    if (!currentUser?.name) return "";
    return currentUser.name.split(/\s+/)[0] ?? "";
  }, [currentUser?.name]);

  const displayDate = formatDateLong(now);
  const displayTime = formatTimeShort(now);
  const greeting = greetingFor(now);

  return (
    <div className="space-y-6">
      <PageHeading
        eyebrow={`${displayDate} · ${displayTime}`}
        title={`${greeting}${firstName ? ` ${firstName}` : ""}`}
        description="Ton tableau de bord du jour — un coup d'œil, et tu repars actionner."
      />

      {/* Badges d'un coup d'œil */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: 12,
        }}
      >
        <Badge label="Clients actifs" value={stats.activeClients} tone="teal" />
        <Badge label="Dossiers total" value={stats.totalClients} tone="purple" />
        <Badge label="PV du mois" value={stats.pvMonth.toLocaleString("fr-FR")} tone="gold" />
      </div>

      {/* Grid 2x2 KPI cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 14,
        }}
      >
        <KpiCard
          label="RDV Aujourd'hui"
          value={stats.todayRdvCount}
          sub={stats.nextRdvTime ? `Prochain à ${stats.nextRdvTime}` : "Aucun RDV prévu"}
          linkTo="/agenda"
        />
        <KpiCard
          label="Messages non lus"
          value={stats.unreadCount}
          sub={stats.unreadCount > 0 ? "Ouvre la messagerie" : "Boîte à jour"}
          linkTo="/messages"
        />
        <KpiCard
          label="Suivis à faire"
          value={stats.pendingFollowups}
          sub="Relances + RDV planifiés"
          linkTo="/agenda"
        />
        <KpiCard
          label="PV du mois"
          value={stats.pvMonth.toLocaleString("fr-FR")}
          sub="Volume sur 30 jours"
          linkTo="/pv"
        />
      </div>

      {/* Chantier Messagerie finalisée (2026-04-23) : widget "À traiter"
          entre les KPI cards et le graph, pour remonter les demandes en
          attente avant la vue stats. */}
      <InboxWidget />

      {/* Graph 30 jours */}
      <Graph30Days points={graphPoints} />
    </div>
  );
}

// ─── Sub-components ─────────────────────────────────────────────────────

function Badge({
  label,
  value,
  tone,
}: {
  label: string;
  value: string | number;
  tone: "teal" | "purple" | "gold";
}) {
  const palette =
    tone === "teal"
      ? { bg: "rgba(45,212,191,0.08)", color: "#0F6E56", border: "rgba(45,212,191,0.25)" }
      : tone === "purple"
        ? { bg: "rgba(124,58,237,0.08)", color: "#6D28D9", border: "rgba(124,58,237,0.25)" }
        : { bg: "rgba(201,168,76,0.1)", color: "#8B6F2A", border: "rgba(201,168,76,0.3)" };
  return (
    <div
      style={{
        padding: "12px 14px",
        borderRadius: 14,
        background: palette.bg,
        border: `1px solid ${palette.border}`,
      }}
    >
      <div
        style={{
          fontSize: 10,
          letterSpacing: "1.5px",
          textTransform: "uppercase",
          color: palette.color,
          fontWeight: 700,
          marginBottom: 6,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontFamily: "Syne, sans-serif",
          fontWeight: 700,
          fontSize: 22,
          color: palette.color,
        }}
      >
        {value}
      </div>
    </div>
  );
}

function KpiCard({
  label,
  value,
  sub,
  linkTo,
}: {
  label: string;
  value: string | number;
  sub: string;
  linkTo: string;
}) {
  return (
    <Link
      to={linkTo}
      style={{
        display: "block",
        padding: 16,
        borderRadius: 16,
        background: "var(--ls-surface)",
        border: "1px solid var(--ls-border)",
        textDecoration: "none",
        color: "var(--ls-text)",
        transition: "all 0.15s",
      }}
    >
      <div
        style={{
          fontSize: 11,
          letterSpacing: "0.05em",
          textTransform: "uppercase",
          color: "var(--ls-text-muted)",
          fontWeight: 500,
          marginBottom: 10,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontFamily: "Syne, sans-serif",
          fontWeight: 500,
          fontSize: 26,
          color: "var(--ls-text)",
          lineHeight: 1,
          marginBottom: 8,
        }}
      >
        {value}
      </div>
      <div style={{ fontSize: 11, color: "var(--ls-text-hint)" }}>{sub}</div>
    </Link>
  );
}

function Graph30Days({ points }: { points: { date: string; pv: number }[] }) {
  if (points.length === 0) {
    return null;
  }

  const W = 600;
  const H = 120;
  const PAD = 20;
  const max = Math.max(1, ...points.map((p) => p.pv));
  const step = (W - PAD * 2) / Math.max(1, points.length - 1);

  const coords = points.map((p, i) => ({
    x: PAD + i * step,
    y: H - PAD - (p.pv / max) * (H - PAD * 2),
    pv: p.pv,
    date: p.date,
  }));
  const path = coords
    .map((c, i) => `${i === 0 ? "M" : "L"} ${c.x.toFixed(1)} ${c.y.toFixed(1)}`)
    .join(" ");

  const lastDate = points[points.length - 1].date;
  const firstDate = points[0].date;

  function labelDate(iso: string): string {
    const d = new Date(iso);
    return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
  }

  return (
    <div
      style={{
        padding: 18,
        borderRadius: 16,
        background: "var(--ls-surface)",
        border: "1px solid var(--ls-border)",
      }}
    >
      <div
        style={{
          fontSize: 11,
          letterSpacing: "0.05em",
          textTransform: "uppercase",
          color: "var(--ls-text-muted)",
          fontWeight: 500,
          marginBottom: 10,
        }}
      >
        PV sur 30 jours
      </div>
      <svg
        width="100%"
        viewBox={`0 0 ${W} ${H}`}
        style={{ display: "block", overflow: "visible" }}
      >
        <defs>
          <linearGradient id="pv-gradient" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="rgba(201,168,76,0.3)" />
            <stop offset="100%" stopColor="rgba(201,168,76,0)" />
          </linearGradient>
        </defs>
        {/* Aire sous la courbe */}
        <path
          d={`${path} L ${coords[coords.length - 1].x} ${H - PAD} L ${coords[0].x} ${H - PAD} Z`}
          fill="url(#pv-gradient)"
        />
        {/* Ligne */}
        <path
          d={path}
          fill="none"
          stroke="#C9A84C"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Points */}
        {coords.map((c, i) => (
          <circle
            key={i}
            cx={c.x}
            cy={c.y}
            r={c.pv > 0 ? 2.5 : 1.2}
            fill="#C9A84C"
          />
        ))}
      </svg>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginTop: 8,
          fontSize: 10,
          color: "var(--ls-text-hint)",
        }}
      >
        <span>{labelDate(firstDate)}</span>
        <span>{labelDate(lastDate)}</span>
      </div>
    </div>
  );
}
