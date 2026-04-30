import { startTransition, useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "../components/ui/Button";
import { ConfirmDialog } from "../components/ui/ConfirmDialog";
import { EmptyState } from "../components/ui/EmptyState";
// PageHeading remplace par le hero premium (2026-04-29)
import { ProspectCard } from "../components/prospect/ProspectCard";
import { ProspectFormModal } from "../components/prospect/ProspectFormModal";
import { useAppContext } from "../context/AppContext";
import { useGlobalView } from "../hooks/useGlobalView";
// GlobalViewToggle retire 2026-04-29 — toggle inutile en haut d'agenda
import { useToast, buildSupabaseErrorToast } from "../context/ToastContext";
import { createGoogleCalendarLink } from "../lib/googleCalendar";
import type { Client, FollowUp, Prospect, ProspectStatus } from "../types/domain";
import { PROSPECT_STATUS_LABELS } from "../types/domain";
import { getFollowUpsDue, type FollowUpDueItem } from "../lib/followUpProtocolScheduler";
import { FOLLOW_UP_PROTOCOL, type FollowUpStep } from "../data/followUpProtocol";
import { logSupabaseFollowUpProtocolStep } from "../services/supabaseService";
import { FollowUpStepModal } from "../components/follow-up/FollowUpStepModal";
import { LegalFooter } from "../components/ui/LegalFooter";

type DateFilter = "today" | "week" | "all";
type StatusFilter = "upcoming" | "done" | "converted" | "cold" | "lost_no_show" | "all";
// Chantier Agenda unifié (2026-04-20) : onglets au-dessus des filtres date/statut
// + onglet Suivis ajouté dans le chantier Protocole Agenda+Dashboard.
type EntityFilter = "all" | "clients" | "prospects" | "followups";

// Entrée unifiée pour la liste : follow-up client, prospect, OU suivi protocole.
type AgendaEntry =
  | { kind: "client"; id: string; date: string; distributorId: string; followUp: FollowUp; client: Client }
  | { kind: "prospect"; id: string; date: string; distributorId: string; prospect: Prospect }
  | { kind: "protocol"; id: string; date: string; distributorId: string; due: FollowUpDueItem };

function startOfDay(d: Date): Date {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function endOfDay(d: Date): Date {
  const copy = new Date(d);
  copy.setHours(23, 59, 59, 999);
  return copy;
}

function endOfWeek(d: Date): Date {
  // Dimanche soir de la semaine en cours (convention française)
  const copy = new Date(d);
  const day = copy.getDay(); // 0=Dim, 1=Lun...
  const daysUntilSunday = day === 0 ? 0 : 7 - day;
  copy.setDate(copy.getDate() + daysUntilSunday);
  copy.setHours(23, 59, 59, 999);
  return copy;
}

function startOfWeek(d: Date): Date {
  // Lundi 00:00 de la semaine en cours (convention française)
  const copy = new Date(d);
  const day = copy.getDay(); // 0=Dim, 1=Lun, 2=Mar...
  const daysSinceMonday = day === 0 ? 6 : day - 1;
  copy.setDate(copy.getDate() - daysSinceMonday);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function matchesStatusFilter(p: Prospect, f: StatusFilter): boolean {
  switch (f) {
    case "upcoming": return p.status === "scheduled";
    case "done": return p.status === "done";
    case "converted": return p.status === "converted";
    case "cold": return p.status === "cold";
    case "lost_no_show": return p.status === "lost" || p.status === "no_show" || p.status === "cancelled";
    case "all": return true;
  }
}

function groupLabel(dateIso: string, today: Date): string {
  const d = new Date(dateIso);
  const todayStart = startOfDay(today);
  const tomorrowStart = new Date(todayStart);
  tomorrowStart.setDate(tomorrowStart.getDate() + 1);
  const weekEnd = endOfWeek(today);

  const dayStart = startOfDay(d);

  if (dayStart.getTime() === todayStart.getTime()) return "Aujourd'hui";
  if (dayStart.getTime() === tomorrowStart.getTime()) return "Demain";
  if (d < todayStart) return "Passés";
  if (d <= weekEnd) return "Cette semaine";
  return "Plus tard";
}

const GROUP_ORDER = ["Aujourd'hui", "Demain", "Cette semaine", "Plus tard", "Passés"];

const AGENDA_FILTER_KEY = "lorsquad.agenda.filter";
const AGENDA_ENTITY_KEY = "lorsquad.agenda.entity-filter";

export function AgendaPage() {
  const {
    prospects, clients, followUps, users, currentUser,
    deleteProspect, updateProspect,
    followUpProtocolLogs, refreshFollowUpProtocolLogs,
  } = useAppContext();
  const { push: pushToast } = useToast();
  const navigate = useNavigate();

  // Nav Dashboard → Agenda (Chantier 3 / 2026-04-20) : si on arrive via
  // ?filter=today (depuis la carte Dashboard "RDV aujourd'hui" ou "Agenda du
  // jour"), pré-sélectionner le filtre journée. ?tab=followups arrive depuis
  // le widget "Voir tout les suivis" du dashboard.
  const [searchParams] = useSearchParams();
  const initialDateFilter: DateFilter = searchParams.get("filter") === "today" ? "today" : "all";
  const initialEntityFromQuery = searchParams.get("tab") === "followups" ? "followups" : null;
  const [dateFilter, setDateFilter] = useState<DateFilter>(initialDateFilter);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("upcoming");
  // Chantier Cold (2026-04-19) : filtre admin par distributeur.
  // "mine" = RDV du user connecté · "all" = toute l'équipe · "<uuid>" = un distri précis
  const [agendaFilter, setAgendaFilter] = useState<string>(() => {
    try {
      return localStorage.getItem(AGENDA_FILTER_KEY) ?? (currentUser?.role === "admin" ? "mine" : "all");
    } catch {
      return currentUser?.role === "admin" ? "mine" : "all";
    }
  });
  // Chantier Agenda unifié (2026-04-20) : onglet entité (tous / clients /
  // prospects / suivis). La query ?tab=followups prime sur localStorage.
  const [entityFilter, setEntityFilter] = useState<EntityFilter>(() => {
    if (initialEntityFromQuery) return initialEntityFromQuery;
    try {
      const stored = localStorage.getItem(AGENDA_ENTITY_KEY);
      if (stored === "all" || stored === "clients" || stored === "prospects" || stored === "followups") return stored;
    } catch { /* ignore */ }
    return "all";
  });
  // Chantier Protocole Agenda+Dashboard (2026-04-20) : popup suivi modale
  const [openProtocol, setOpenProtocol] = useState<FollowUpDueItem | null>(null);
  const [protocolBusy, setProtocolBusy] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Prospect | undefined>(undefined);
  const [detailProspect, setDetailProspect] = useState<Prospect | null>(null);

  useEffect(() => {
    try { localStorage.setItem(AGENDA_FILTER_KEY, agendaFilter); } catch { /* ignore */ }
  }, [agendaFilter]);

  // Chantier Quick Wins (2026-04-24) : sync avec toggle global partagé
  // (Co-pilote / Messagerie / Clients / PV). Admin ON → all, OFF → mine.
  const [globalView] = useGlobalView();
  useEffect(() => {
    if (currentUser?.role === "admin") {
      setAgendaFilter(globalView ? "all" : "mine");
    }
  }, [globalView, currentUser?.role]);
  useEffect(() => {
    try { localStorage.setItem(AGENDA_ENTITY_KEY, entityFilter); } catch { /* ignore */ }
  }, [entityFilter]);

  // Perf (2026-04-20) : on NE créé plus `const now = new Date()` dans le body
  // du composant. Chaque render créait une nouvelle référence Date qui cassait
  // les deps de `filtered`/`grouped` → invalidation systématique des memos.
  // Les bornes (todayStart, todayEnd, weekEnd) sont désormais calculées à
  // l'intérieur de chaque memo, sans être exposées dans les deps.

  // ─── Scope distributeur commun (prospects + clients) ─────────────────
  // Détermine si un distributorId entre dans le périmètre actif.
  const isInScope = useCallback((distributorId: string): boolean => {
    if (!currentUser) return false;
    if (currentUser.role !== "admin") return distributorId === currentUser.id;
    if (agendaFilter === "all") return true;
    if (agendaFilter === "mine") return distributorId === currentUser.id;
    return distributorId === agendaFilter;
  }, [currentUser, agendaFilter]);

  // Prospects scopés (conservé pour TeamStatsWidget)
  const distributorFilteredProspects = useMemo(
    () => prospects.filter((p) => isInScope(p.distributorId)),
    [prospects, isInScope]
  );

  // ─── Construction des entrées unifiées (prospects + follow-ups clients) ───
  // Chantier Agenda unifié (2026-04-20) :
  // - Prospects : on filtre par status (scheduled / done / cold / etc.)
  // - Clients : on prend les follow-ups avec status "scheduled" ou "pending"
  //   et on retrouve le client via clientsById pour distributorId + nom.
  const clientsById = useMemo(() => new Map(clients.map((c) => [c.id, c])), [clients]);

  const agendaEntries = useMemo(() => {
    const now = new Date();
    const todayStart = startOfDay(now);
    const todayEnd = endOfDay(now);
    const weekEnd = endOfWeek(now);

    const entries: AgendaEntry[] = [];

    // 1. Prospects
    if (entityFilter === "all" || entityFilter === "prospects") {
      for (const p of prospects) {
        if (!isInScope(p.distributorId)) continue;
        if (!matchesStatusFilter(p, statusFilter)) continue;
        const d = new Date(p.rdvDate);
        if (Number.isNaN(d.getTime())) continue;
        if (dateFilter === "today" && !(d >= todayStart && d <= todayEnd)) continue;
        if (dateFilter === "week" && !(d >= todayStart && d <= weekEnd)) continue;
        entries.push({ kind: "prospect", id: p.id, date: p.rdvDate, distributorId: p.distributorId, prospect: p });
      }
    }

    // 2. Follow-ups clients
    if (entityFilter === "all" || entityFilter === "clients") {
      for (const fu of followUps) {
        // On ne prend que les follow-ups "actifs" sur l'agenda
        if (fu.status !== "scheduled" && fu.status !== "pending") continue;
        const client = clientsById.get(fu.clientId);
        if (!client) continue;
        if (!isInScope(client.distributorId)) continue;
        // Exclure les clients morts (lifecycle stopped / lost)
        if (client.lifecycleStatus === "stopped" || client.lifecycleStatus === "lost") continue;
        const d = new Date(fu.dueDate);
        if (Number.isNaN(d.getTime())) continue;
        if (dateFilter === "today" && !(d >= todayStart && d <= todayEnd)) continue;
        if (dateFilter === "week" && !(d >= todayStart && d <= weekEnd)) continue;
        entries.push({ kind: "client", id: fu.id, date: fu.dueDate, distributorId: client.distributorId, followUp: fu, client });
      }
    }

    // 3. Suivis protocole — Chantier Protocole Agenda+Dashboard (2026-04-20)
    // Scope strictement personnel (getFollowUpsDue filtre déjà sur currentUserId).
    // includeUpcoming=true pour que l'onglet Suivis montre aussi les prochains.
    if ((entityFilter === "all" || entityFilter === "followups") && currentUser) {
      const dueItems = getFollowUpsDue(clients, currentUser.id, followUpProtocolLogs, {
        now,
        includeUpcoming: true,
        maxDaysUpcoming: 30,
      });
      for (const item of dueItems) {
        // Filtre date uniforme avec le reste (today/week) — un suivi en retard
        // d'hier reste visible aujourd'hui.
        const d = item.dueDate;
        if (dateFilter === "today") {
          const isTodayOrLate = item.status === "due_today" || item.status === "overdue_1d" || item.status === "overdue_more";
          if (!isTodayOrLate) continue;
        } else if (dateFilter === "week") {
          // Visible si dû aujourd'hui, en retard, ou dû dans la semaine courante.
          const inRange = d >= todayStart && d <= weekEnd;
          const isLate = item.status === "overdue_1d" || item.status === "overdue_more";
          if (!inRange && !isLate) continue;
        }
        entries.push({
          kind: "protocol",
          id: `${item.client.id}-${item.stepId}`,
          date: item.dueDate.toISOString(),
          distributorId: item.client.distributorId,
          due: item,
        });
      }
    }

    return entries;
  }, [entityFilter, prospects, followUps, clientsById, isInScope, statusFilter, dateFilter, clients, currentUser, followUpProtocolLogs]);

  const grouped = useMemo(() => {
    const now = new Date();
    const map = new Map<string, AgendaEntry[]>();
    agendaEntries.forEach((entry) => {
      const g = groupLabel(entry.date, now);
      if (!map.has(g)) map.set(g, []);
      map.get(g)!.push(entry);
    });
    for (const arr of map.values()) {
      arr.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    }
    return GROUP_ORDER.filter((g) => map.has(g)).map((g) => ({ label: g, items: map.get(g)! }));
  }, [agendaEntries]);

  // Prochain RDV imminent (2026-04-29) — pour le hero countdown card
  const nextRdv = useMemo(() => {
    const now = Date.now();
    const future = agendaEntries
      .filter((e) => new Date(e.date).getTime() > now)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    return future[0] ?? null;
  }, [agendaEntries]);

  // Compteurs pour les onglets — scopés et filtrés par date mais pas par status
  // (le status filter est "prospect-only", on ne veut pas qu'il fausse le compte client).
  const entityCounts = useMemo(() => {
    const now = new Date();
    const todayStart = startOfDay(now);
    const todayEnd = endOfDay(now);
    const weekEnd = endOfWeek(now);
    const inDateRange = (iso: string): boolean => {
      const d = new Date(iso);
      if (Number.isNaN(d.getTime())) return false;
      if (dateFilter === "today") return d >= todayStart && d <= todayEnd;
      if (dateFilter === "week") return d >= todayStart && d <= weekEnd;
      return true;
    };
    let clientCount = 0;
    let prospectCount = 0;
    for (const fu of followUps) {
      if (fu.status !== "scheduled" && fu.status !== "pending") continue;
      const c = clientsById.get(fu.clientId);
      if (!c || !isInScope(c.distributorId)) continue;
      if (c.lifecycleStatus === "stopped" || c.lifecycleStatus === "lost") continue;
      if (!inDateRange(fu.dueDate)) continue;
      clientCount += 1;
    }
    for (const p of prospects) {
      if (!isInScope(p.distributorId)) continue;
      if (!matchesStatusFilter(p, statusFilter)) continue;
      if (!inDateRange(p.rdvDate)) continue;
      prospectCount += 1;
    }
    // Suivis protocole — Chantier Protocole Agenda+Dashboard (2026-04-20).
    let protocolCount = 0;
    if (currentUser) {
      const dueItems = getFollowUpsDue(clients, currentUser.id, followUpProtocolLogs, {
        now,
        includeUpcoming: true,
        maxDaysUpcoming: 30,
      });
      for (const item of dueItems) {
        if (dateFilter === "today") {
          if (item.status === "due_today" || item.status === "overdue_1d" || item.status === "overdue_more") protocolCount += 1;
        } else if (dateFilter === "week") {
          const inRange = item.dueDate >= todayStart && item.dueDate <= weekEnd;
          const isLate = item.status === "overdue_1d" || item.status === "overdue_more";
          if (inRange || isLate) protocolCount += 1;
        } else {
          protocolCount += 1;
        }
      }
    }
    return {
      clients: clientCount,
      prospects: prospectCount,
      followups: protocolCount,
      all: clientCount + prospectCount + protocolCount,
    };
  }, [followUps, prospects, clientsById, isInScope, statusFilter, dateFilter, clients, currentUser, followUpProtocolLogs]);

  // Perf (2026-04-20) : lookup O(1) par distributorId au lieu d'un `users.find`
  // linéaire par carte à chaque render. Stable tant que la liste users ne change pas.
  const ownerNameMap = useMemo(
    () => new Map(users.map((u) => [u.id, u.name])),
    [users]
  );

  // Perf (2026-04-20) : handler stable pour ProspectCard.onClick. Sans ça,
  // la flèche inline était recréée à chaque render, défaisant React.memo côté carte.
  const handleCardClick = useCallback((prospect: Prospect) => {
    setDetailProspect(prospect);
  }, []);

  const handleQuickStatus = useCallback(async (prospect: Prospect, nextStatus: ProspectStatus) => {
    try {
      await updateProspect(prospect.id, { status: nextStatus });
      pushToast({ tone: "success", title: `Statut → ${PROSPECT_STATUS_LABELS[nextStatus]}` });
      setDetailProspect(null);
    } catch (err) {
      pushToast(buildSupabaseErrorToast(err, "Impossible de mettre à jour le statut."));
    }
  }, [updateProspect, pushToast]);

  // Chantier Cold : mettre en froid avec date de réchauffement + raison
  const handleSetCold = useCallback(async (prospect: Prospect, coldUntil: string, coldReason: string) => {
    try {
      await updateProspect(prospect.id, {
        status: "cold",
        coldUntil,
        coldReason: coldReason.trim() || undefined,
      });
      pushToast({
        tone: "success",
        title: "Prospect en pause ❄️",
        message: `À reprendre après le ${new Date(coldUntil).toLocaleDateString("fr-FR")}.`,
      });
      setDetailProspect(null);
    } catch (err) {
      pushToast(buildSupabaseErrorToast(err, "Impossible de mettre le prospect en pause."));
    }
  }, [updateProspect, pushToast]);

  // Réactiver un prospect cold : status → scheduled + cold_until + cold_reason à null
  const handleReactivate = useCallback(async (prospect: Prospect) => {
    try {
      await updateProspect(prospect.id, {
        status: "scheduled",
        coldUntil: null as unknown as string,
        coldReason: null as unknown as string,
      });
      pushToast({ tone: "success", title: "Prospect réactivé", message: "Pense à fixer une date de RDV." });
      // Perf (2026-04-20) : React 18 n'autobatch pas après un await hors d'un
      // event handler natif. startTransition regroupe les 3 setState en une seule
      // passe de render au lieu de 3, évitant des recomputes memo en cascade.
      startTransition(() => {
        setDetailProspect(null);
        setEditing(prospect);
        setShowForm(true);
      });
    } catch (err) {
      pushToast(buildSupabaseErrorToast(err, "Impossible de réactiver le prospect."));
    }
  }, [updateProspect, pushToast]);

  // Audit 2026-04-30 : remplacement window.confirm par ConfirmDialog
  // (modale custom theme-aware, ne bloque plus le thread principal).
  const [confirmDelete, setConfirmDelete] = useState<Prospect | null>(null);

  const performDelete = useCallback(async (prospect: Prospect) => {
    try {
      await deleteProspect(prospect.id);
      pushToast({ tone: "success", title: "RDV supprimé" });
      setDetailProspect(null);
    } catch (err) {
      pushToast(buildSupabaseErrorToast(err, "Impossible de supprimer ce prospect."));
    }
  }, [deleteProspect, pushToast]);

  const handleDelete = useCallback((prospect: Prospect) => {
    setConfirmDelete(prospect);
  }, []);

  // Gradient time-of-day pour le hero (refonte premium 2026-04-29).
  // Reuse meme logique que ClockHeader pour coherence visuelle.
  const heroHour = new Date().getHours();
  const heroGradient = (() => {
    if (heroHour >= 5 && heroHour < 8)
      return { primary: "#FFB088", secondary: "#FF8866", tertiary: "#EF9F27", glow: "rgba(255,176,136,0.30)" };
    if (heroHour >= 8 && heroHour < 11)
      return { primary: "#FFD56B", secondary: "#EF9F27", tertiary: "#BA7517", glow: "rgba(239,159,39,0.28)" };
    if (heroHour >= 11 && heroHour < 14)
      return { primary: "#EF9F27", secondary: "#BA7517", tertiary: "#0D9488", glow: "rgba(13,148,136,0.22)" };
    if (heroHour >= 14 && heroHour < 17)
      return { primary: "#EF9F27", secondary: "#BA7517", tertiary: "#5C3A05", glow: "rgba(186,117,23,0.28)" };
    if (heroHour >= 17 && heroHour < 20)
      return { primary: "#FF6B6B", secondary: "#BA7517", tertiary: "#7C3AED", glow: "rgba(255,107,107,0.25)" };
    if (heroHour >= 20 && heroHour < 23)
      return { primary: "#C084FC", secondary: "#7C3AED", tertiary: "#BA7517", glow: "rgba(192,132,252,0.25)" };
    return { primary: "#A5B4FC", secondary: "#818CF8", tertiary: "#7C3AED", glow: "rgba(165,180,252,0.25)" };
  })();

  // Counts pour le hero header (calcules apres les useMemo des filtres)
  const heroTodayCount = entityCounts.all > 0 ? entityCounts.all : 0;

  return (
    <div className="space-y-5">
      {/* Hero PREMIUM AGENDA V1 (2026-04-29) — gradient time-of-day + stats inline + CTA glow */}
      <style>{`
        @keyframes ls-agenda-hero-mesh {
          0% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(-10px, 6px) scale(1.05); }
          100% { transform: translate(8px, -4px) scale(1); }
        }
        @keyframes ls-agenda-hero-shine {
          0%, 100% { transform: translateX(-50%); opacity: 0; }
          50% { transform: translateX(150%); opacity: 0.6; }
        }
        @keyframes ls-agenda-cta-glow {
          0%, 100% { box-shadow: 0 4px 16px rgba(186,117,23,0.30); }
          50% { box-shadow: 0 6px 24px rgba(186,117,23,0.55), 0 0 0 4px rgba(239,159,39,0.10); }
        }
        @keyframes ls-agenda-fade-in {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes ls-pulse-imminent {
          0%, 100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(255,107,107,0.5); }
          50% { transform: scale(1.04); box-shadow: 0 0 0 4px rgba(255,107,107,0); }
        }
        @keyframes ls-rdv-card-in {
          from { opacity: 0; transform: translateX(-8px); }
          to { opacity: 1; transform: translateX(0); }
        }
        .ls-rdv-card { animation: ls-rdv-card-in 380ms cubic-bezier(0.16, 1, 0.3, 1) both; }
        @media (prefers-reduced-motion: reduce) {
          .ls-rdv-card, .ls-pulse-imminent { animation: none !important; }
        }
        .ls-agenda-hero {
          position: relative;
          overflow: hidden;
          padding: 26px 28px;
          border-radius: 24px;
          background: var(--ls-surface);
          border: 0.5px solid var(--ls-border);
          box-shadow: 0 1px 0 0 ${heroGradient.glow}, 0 12px 36px -12px rgba(0,0,0,0.10);
        }
        .ls-agenda-mesh {
          position: absolute; inset: -20%; opacity: 0.55; pointer-events: none;
          animation: ls-agenda-hero-mesh 20s ease-in-out infinite alternate;
          background:
            radial-gradient(circle at 0% 0%, ${heroGradient.glow} 0%, transparent 45%),
            radial-gradient(circle at 100% 100%, ${heroGradient.glow} 0%, transparent 50%),
            radial-gradient(circle at 100% 0%, color-mix(in srgb, ${heroGradient.tertiary} 25%, transparent) 0%, transparent 60%);
        }
        .ls-agenda-shine {
          position: absolute; top: 0; height: 100%; width: 50%; left: 0;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.10), transparent);
          animation: ls-agenda-hero-shine 8s ease-in-out infinite;
          pointer-events: none;
        }
        .ls-agenda-cta {
          position: relative;
          background: linear-gradient(135deg, ${heroGradient.primary} 0%, ${heroGradient.secondary} 100%);
          color: white !important;
          border: none !important;
          padding: 14px 22px !important;
          border-radius: 12px !important;
          font-size: 14px !important;
          font-weight: 700 !important;
          font-family: "Syne", serif !important;
          letter-spacing: 0.3px;
          cursor: pointer;
          animation: ls-agenda-cta-glow 4s ease-in-out infinite;
          transition: transform 0.18s ease;
        }
        .ls-agenda-cta:hover { transform: translateY(-2px); }
        .ls-agenda-stat {
          animation: ls-agenda-fade-in 480ms cubic-bezier(0.16, 1, 0.3, 1) both;
          transition: transform 0.18s ease, box-shadow 0.18s ease;
        }
        .ls-agenda-stat:hover { transform: translateY(-2px); }
        .ls-agenda-stat:nth-child(1) { animation-delay: 50ms; }
        .ls-agenda-stat:nth-child(2) { animation-delay: 130ms; }
        .ls-agenda-stat:nth-child(3) { animation-delay: 210ms; }
        @media (prefers-reduced-motion: reduce) {
          .ls-agenda-mesh, .ls-agenda-shine, .ls-agenda-cta, .ls-agenda-stat {
            animation: none !important;
            transition: none !important;
          }
        }
      `}</style>

      <div className="ls-agenda-hero">
        <div className="ls-agenda-mesh" aria-hidden="true" />
        <div className="ls-agenda-shine" aria-hidden="true" />

        <div style={{ position: "relative", display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 24, flexWrap: "wrap", marginBottom: 18 }}>
          <div style={{ flex: 1, minWidth: 240 }}>
            <div
              style={{
                fontSize: 10,
                letterSpacing: 2,
                textTransform: "uppercase",
                fontWeight: 700,
                color: heroGradient.secondary,
                marginBottom: 6,
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <span
                style={{
                  display: "inline-block",
                  width: 6,
                  height: 6,
                  borderRadius: 999,
                  background: heroGradient.primary,
                  boxShadow: `0 0 8px ${heroGradient.glow}`,
                }}
              />
              Agenda · {new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}
            </div>
            <h1
              style={{
                fontFamily: "Syne, serif",
                fontSize: 32,
                fontWeight: 800,
                color: "var(--ls-text)",
                lineHeight: 1.05,
                letterSpacing: "-0.02em",
                margin: 0,
              }}
            >
              <span
                style={{
                  background: `linear-gradient(135deg, ${heroGradient.primary} 0%, ${heroGradient.secondary} 60%, ${heroGradient.tertiary} 100%)`,
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                Tes RDV
              </span>{" "}
              du moment ✨
            </h1>
            <p
              style={{
                fontSize: 13,
                color: "var(--ls-text-muted)",
                marginTop: 6,
                marginBottom: 0,
                fontFamily: "DM Sans, sans-serif",
              }}
            >
              {heroTodayCount} entrée{heroTodayCount > 1 ? "s" : ""} dans l&apos;agenda · clients, prospects, suivis sur une seule vue.
            </p>
          </div>

          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8, position: "relative" }}>
            <button
              type="button"
              onClick={() => { setEditing(undefined); setShowForm(true); }}
              data-tour-id="agenda-new-rdv"
              className="ls-agenda-cta"
            >
              ✨ + Nouveau RDV
            </button>
            <Link
              to="/"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                padding: "5px 10px",
                borderRadius: 8,
                background: "color-mix(in srgb, var(--ls-teal) 7%, transparent)",
                border: "0.5px solid color-mix(in srgb, var(--ls-teal) 20%, transparent)",
                color: "var(--ls-teal)",
                fontSize: 11,
                fontWeight: 500,
                textDecoration: "none",
                fontFamily: "DM Sans, sans-serif",
              }}
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 3h7v7H3zM14 3h7v5h-7zM14 12h7v9h-7zM3 14h7v7H3z" />
              </svg>
              Voir mes priorités →
            </Link>
          </div>
        </div>

        {/* 3 stats horizontaux dans le hero */}
        <div
          style={{
            position: "relative",
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 10,
          }}
        >
          {[
            { icon: "📅", label: "Aujourd'hui", value: prospects.filter((p) => {
              const d = new Date(p.rdvDate);
              const t = new Date();
              return d.toDateString() === t.toDateString();
            }).length + clients.filter((c) => {
              if (!c.nextFollowUp) return false;
              const d = new Date(c.nextFollowUp);
              const t = new Date();
              return d.toDateString() === t.toDateString();
            }).length, color: heroGradient.primary },
            { icon: "📆", label: "Cette semaine", value: entityCounts.all, color: heroGradient.secondary },
            { icon: "🎯", label: "Suivis", value: entityCounts.followups, color: heroGradient.tertiary },
          ].map((s) => (
            <div
              key={s.label}
              className="ls-agenda-stat"
              style={{
                background: "color-mix(in srgb, var(--ls-surface) 95%, transparent)",
                border: `0.5px solid color-mix(in srgb, ${s.color} 25%, var(--ls-border))`,
                borderRadius: 14,
                padding: "10px 14px",
                display: "flex",
                alignItems: "center",
                gap: 10,
                backdropFilter: "blur(8px)",
                WebkitBackdropFilter: "blur(8px)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = `0 6px 18px -8px ${heroGradient.glow}`;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = "none";
              }}
            >
              <span style={{ fontSize: 22 }}>{s.icon}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 9, letterSpacing: 1.4, textTransform: "uppercase", color: "var(--ls-text-hint)", fontWeight: 700 }}>
                  {s.label}
                </div>
                <div
                  style={{
                    fontFamily: "Syne, serif",
                    fontSize: 22,
                    fontWeight: 800,
                    color: s.color,
                    lineHeight: 1,
                    letterSpacing: "-0.02em",
                  }}
                >
                  {s.value}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Prochain RDV countdown V2 (2026-04-29) — hero card flottant si <12h */}
      {nextRdv && (() => {
        const ms = new Date(nextRdv.date).getTime() - Date.now();
        if (ms <= 0 || ms > 12 * 60 * 60 * 1000) return null; // <12h only
        const h = Math.floor(ms / (60 * 60 * 1000));
        const m = Math.floor((ms % (60 * 60 * 1000)) / (60 * 1000));
        const labelTime = h > 0 ? `${h}h ${m}m` : `${m} min`;
        const name = nextRdv.kind === "client"
          ? `${nextRdv.client.firstName} ${nextRdv.client.lastName}`
          : nextRdv.kind === "prospect"
            ? `${nextRdv.prospect.firstName} ${nextRdv.prospect.lastName}`
            : `${nextRdv.due.client.firstName} ${nextRdv.due.client.lastName}`;
        const subtitle = nextRdv.kind === "client"
          ? (nextRdv.followUp.type || "Suivi")
          : nextRdv.kind === "prospect"
            ? "Prospect · 1er contact"
            : `${nextRdv.due.stepIconEmoji} ${nextRdv.due.stepShortTitle}`;
        const initials = name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();
        const targetUrl = nextRdv.kind === "client"
          ? `/clients/${nextRdv.client.id}`
          : nextRdv.kind === "protocol"
            ? `/clients/${nextRdv.due.client.id}`
            : "#";
        return (
          <Link
            to={targetUrl}
            style={{
              position: "relative",
              display: "flex",
              alignItems: "center",
              gap: 16,
              padding: "16px 22px",
              background: "linear-gradient(135deg, color-mix(in srgb, var(--ls-coral) 14%, var(--ls-surface)) 0%, color-mix(in srgb, var(--ls-gold) 8%, var(--ls-surface)) 100%)",
              border: "0.5px solid color-mix(in srgb, var(--ls-coral) 40%, var(--ls-border))",
              borderRadius: 18,
              textDecoration: "none",
              color: "inherit",
              boxShadow: "0 8px 24px -10px rgba(255,107,107,0.30)",
              overflow: "hidden",
            }}
          >
            <div
              aria-hidden="true"
              style={{
                position: "absolute",
                top: -50,
                right: -50,
                width: 180,
                height: 180,
                background: "radial-gradient(circle, rgba(255,107,107,0.25) 0%, transparent 70%)",
                pointerEvents: "none",
              }}
            />
            <div
              style={{
                fontSize: 32,
                animation: "ls-pulse-imminent 2s ease-in-out infinite",
              }}
            >
              ⏰
            </div>
            <div
              style={{
                width: 50,
                height: 50,
                borderRadius: 14,
                background: "linear-gradient(135deg, #FF6B6B 0%, #BA7517 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "white",
                fontFamily: "Syne, serif",
                fontWeight: 800,
                fontSize: 16,
                flexShrink: 0,
                boxShadow: "0 4px 14px rgba(255,107,107,0.40)",
              }}
            >
              {initials}
            </div>
            <div style={{ flex: 1, minWidth: 0, position: "relative" }}>
              <div
                style={{
                  fontSize: 9.5,
                  letterSpacing: 1.6,
                  textTransform: "uppercase",
                  fontWeight: 800,
                  color: "var(--ls-coral)",
                  marginBottom: 2,
                }}
              >
                🔥 Prochain RDV · dans {labelTime}
              </div>
              <div
                style={{
                  fontFamily: "Syne, serif",
                  fontSize: 20,
                  fontWeight: 800,
                  color: "var(--ls-text)",
                  letterSpacing: "-0.02em",
                  lineHeight: 1.1,
                }}
              >
                {name}
              </div>
              <div style={{ fontSize: 12, color: "var(--ls-text-muted)", marginTop: 2 }}>
                {subtitle} · {new Date(nextRdv.date).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
              </div>
            </div>
            <span
              style={{
                fontSize: 16,
                color: "var(--ls-coral)",
                fontWeight: 800,
                opacity: 0.7,
                flexShrink: 0,
              }}
            >
              →
            </span>
          </Link>
        );
      })()}

      {/* Dropdown distributeur — admin only — refonte premium 2026-04-29 */}
      {currentUser?.role === "admin" && (
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "8px 12px 8px 14px",
            background: "var(--ls-surface)",
            border: "0.5px solid var(--ls-border)",
            borderRadius: 999,
            width: "fit-content",
          }}
        >
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: 1.4,
              textTransform: "uppercase",
              color: "var(--ls-text-hint)",
              fontFamily: "DM Sans, sans-serif",
            }}
          >
            👁️ Vue
          </span>
          <select
            value={agendaFilter}
            onChange={(e) => setAgendaFilter(e.target.value)}
            style={{
              border: "none",
              background: "transparent",
              fontSize: 12.5,
              fontWeight: 600,
              fontFamily: "DM Sans, sans-serif",
              color: "var(--ls-text)",
              cursor: "pointer",
              outline: "none",
              padding: "2px 6px",
            }}
          >
            <option value="mine">🏠 Mes RDV</option>
            <option value="all">👥 Toute l&apos;équipe</option>
            {users.filter((u) => u.active && u.id !== currentUser.id).map((u) => (
              <option key={u.id} value={u.id}>
                👤 {u.name} · {u.role === "admin" ? "Admin" : u.role === "referent" ? "Référent" : "Distri"}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Stats équipe — admin only + mode "Toute l'équipe" */}
      {currentUser?.role === "admin" && agendaFilter === "all" && (
        <TeamStatsWidget prospects={distributorFilteredProspects} />
      )}

      {/* Onglets entité (Chantier Agenda unifié 2026-04-20) */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }} data-tour-id="agenda-filters">

        <EntityTab
          label="Tous"
          count={entityCounts.all}
          active={entityFilter === "all"}
          onClick={() => setEntityFilter("all")}
          dot={null}
        />
        <EntityTab
          label="Clients"
          count={entityCounts.clients}
          active={entityFilter === "clients"}
          onClick={() => setEntityFilter("clients")}
          dot="var(--ls-gold)"
        />
        <EntityTab
          label="Prospects"
          count={entityCounts.prospects}
          active={entityFilter === "prospects"}
          onClick={() => setEntityFilter("prospects")}
          dot="var(--ls-purple)"
        />
        <EntityTab
          label="Suivis"
          count={entityCounts.followups}
          active={entityFilter === "followups"}
          onClick={() => setEntityFilter("followups")}
          dot="var(--ls-teal)"
        />
      </div>

      {/* Filtres refonte premium (2026-04-29) — 2 sections labellees, pas de
          conteneur Card lourd. Eyebrows uppercase + chips compacts. */}
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div>
          <div
            style={{
              fontSize: 9.5,
              letterSpacing: 1.6,
              textTransform: "uppercase",
              fontWeight: 700,
              color: "var(--ls-text-hint)",
              marginBottom: 8,
              display: "flex",
              alignItems: "center",
              gap: 5,
            }}
          >
            <span style={{ fontSize: 11 }}>📅</span> Période
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {([
              { key: "today" as DateFilter, label: "Aujourd'hui" },
              { key: "week"  as DateFilter, label: "Cette semaine" },
              { key: "all"   as DateFilter, label: "Tous" },
            ]).map((f) => (
              <FilterPill
                key={f.key}
                label={f.label}
                active={dateFilter === f.key}
                onClick={() => setDateFilter(f.key)}
              />
            ))}
          </div>
        </div>

        <div>
          <div
            style={{
              fontSize: 9.5,
              letterSpacing: 1.6,
              textTransform: "uppercase",
              fontWeight: 700,
              color: "var(--ls-text-hint)",
              marginBottom: 8,
              display: "flex",
              alignItems: "center",
              gap: 5,
            }}
          >
            <span style={{ fontSize: 11 }}>📊</span> Statut
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {([
              { key: "upcoming"    as StatusFilter, label: "À venir" },
              { key: "done"        as StatusFilter, label: "Effectués" },
              { key: "converted"   as StatusFilter, label: "Convertis" },
              { key: "cold"        as StatusFilter, label: "❄️ En pause" },
              { key: "lost_no_show" as StatusFilter, label: "Pas venus / Pas intéressés" },
              { key: "all"         as StatusFilter, label: "Tous statuts" },
            ]).map((f) => (
              <FilterPill
                key={f.key}
                label={f.label}
                active={statusFilter === f.key}
                onClick={() => setStatusFilter(f.key)}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Liste groupée — rendu unifié clients + prospects */}
      <div data-tour-id="agenda-upcoming">
      {grouped.length === 0 ? (
        <EmptyState
          emoji={
            entityFilter === "clients" ? "🌿"
            : entityFilter === "prospects" ? "🎯"
            : entityFilter === "followups" ? "📋"
            : "☀️"
          }
          title={
            entityFilter === "clients" ? "Pas de suivi client programmé"
            : entityFilter === "prospects" ? "Aucun RDV prospect à venir"
            : entityFilter === "followups" ? "Aucun suivi en cours"
            : "Agenda libre — profite ou prospecte 😏"
          }
          description={
            entityFilter === "clients"
              ? "Tes clients sont à jour sur cette période. Profites-en pour relancer un dormant ou écrire un message d'encouragement."
              : entityFilter === "prospects"
              ? "Pas de prospect au planning. Un nouveau RDV = une chance de plus de transformer ton CA ce mois-ci."
              : entityFilter === "followups"
              ? "Les suivis démarrent automatiquement après un bilan initial avec programme + body scan, jusqu'à 10 jours."
              : "Aucun RDV sur cette période. Change de filtre, ou crée un RDV prospect maintenant."
          }
          ctaLabel={
            entityFilter !== "clients" && entityFilter !== "followups"
              ? "+ Nouveau RDV"
              : undefined
          }
          onCta={
            entityFilter !== "clients" && entityFilter !== "followups"
              ? () => { setEditing(undefined); setShowForm(true); }
              : undefined
          }
        />
      ) : (
        grouped.map(({ label, items }) => (
          <div key={label} className="space-y-2">
            <div style={{ fontSize: 11, letterSpacing: "2px", textTransform: "uppercase", color: "var(--ls-text-hint)", fontWeight: 500, marginLeft: 4 }}>
              {label} · {items.length} RDV
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {items.map((entry) => {
                if (entry.kind === "prospect") {
                  return (
                    <div key={`p-${entry.id}`} style={{ display: "flex", alignItems: "stretch" }}>
                      <div style={{ width: 3, borderRadius: "3px 0 0 3px", background: "var(--ls-purple)", flexShrink: 0 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <ProspectCard
                          prospect={entry.prospect}
                          ownerName={currentUser?.role === "admin" ? ownerNameMap.get(entry.distributorId) : undefined}
                          showDate={label !== "Aujourd'hui" && label !== "Demain"}
                          onClick={handleCardClick}
                        />
                      </div>
                    </div>
                  );
                }
                if (entry.kind === "client") {
                  return (
                    <ClientFollowUpCard
                      key={`c-${entry.id}`}
                      followUp={entry.followUp}
                      client={entry.client}
                      ownerName={currentUser?.role === "admin" ? ownerNameMap.get(entry.distributorId) : undefined}
                      showDate={label !== "Aujourd'hui" && label !== "Demain"}
                    />
                  );
                }
                // kind === "protocol"
                return (
                  <ProtocolAgendaCard
                    key={`proto-${entry.id}`}
                    item={entry.due}
                    showDate={label !== "Aujourd'hui" && label !== "Demain"}
                    onOpen={() => setOpenProtocol(entry.due)}
                  />
                );
              })}
            </div>
          </div>
        ))
      )}
      </div>

      {/* Audit 2026-04-30 : ConfirmDialog remplace window.confirm pour le delete prospect */}
      <ConfirmDialog
        open={confirmDelete !== null}
        title={confirmDelete ? `Supprimer le RDV de ${confirmDelete.firstName} ${confirmDelete.lastName} ?` : ""}
        message="Cette action est irréversible. Le prospect et ses notes seront perdus."
        confirmLabel="Supprimer"
        cancelLabel="Annuler"
        tone="danger"
        onConfirm={() => {
          if (confirmDelete) {
            void performDelete(confirmDelete);
            setConfirmDelete(null);
          }
        }}
        onCancel={() => setConfirmDelete(null)}
      />

      {/* Form modal */}
      {showForm && (
        <ProspectFormModal
          initial={editing}
          onClose={() => { setShowForm(false); setEditing(undefined); }}
          onSaved={() => {
            pushToast({
              tone: "success",
              title: editing ? "RDV mis à jour" : "RDV créé",
            });
          }}
        />
      )}

      {/* Détail prospect */}
      {detailProspect && (
        <ProspectDetailModal
          prospect={detailProspect}
          onClose={() => setDetailProspect(null)}
          onEdit={() => {
            // Perf (2026-04-20) : batch les 3 setState en une seule passe de render.
            startTransition(() => {
              setEditing(detailProspect);
              setShowForm(true);
              setDetailProspect(null);
            });
          }}
          onStartAssessment={() => navigate(`/assessments/new?prospectId=${detailProspect.id}`)}
          onOpenClient={() => {
            if (detailProspect.convertedClientId) navigate(`/clients/${detailProspect.convertedClientId}`);
          }}
          onChangeStatus={(status) => handleQuickStatus(detailProspect, status)}
          onSetCold={(until, reason) => handleSetCold(detailProspect, until, reason)}
          onReactivate={() => handleReactivate(detailProspect)}
          onDelete={() => handleDelete(detailProspect)}
        />
      )}

      {/* Modal protocole — Chantier Protocole Agenda+Dashboard (2026-04-20) */}
      {openProtocol && (() => {
        const step: FollowUpStep | undefined = FOLLOW_UP_PROTOCOL.find((s) => s.id === openProtocol.stepId);
        if (!step) return null;
        const existingLog = followUpProtocolLogs.find(
          (l) => l.clientId === openProtocol.client.id && l.stepId === openProtocol.stepId
        );
        return (
          <FollowUpStepModal
            step={step}
            client={openProtocol.client}
            existingLog={existingLog}
            onClose={() => setOpenProtocol(null)}
            onMarkSent={async () => {
              if (!currentUser) return;
              setProtocolBusy(true);
              try {
                await logSupabaseFollowUpProtocolStep({
                  clientId: openProtocol.client.id,
                  coachId: currentUser.id,
                  stepId: openProtocol.stepId,
                });
                await refreshFollowUpProtocolLogs();
                pushToast({ tone: "success", title: `${openProtocol.stepShortTitle} marqué envoyé ✓` });
                setOpenProtocol(null);
              } catch (err) {
                pushToast(
                  buildSupabaseErrorToast(
                    err,
                    "Impossible d'enregistrer l'envoi. Vérifie la migration follow_up_protocol_log."
                  )
                );
              } finally {
                setProtocolBusy(false);
              }
            }}
            busy={protocolBusy}
          />
        );
      })()}
      <LegalFooter />
    </div>
  );
}

// ─── Carte RDV protocole (agenda unifié / onglet Suivis) ─────────────────
function ProtocolAgendaCard({
  item,
  showDate,
  onOpen,
}: {
  item: FollowUpDueItem;
  showDate: boolean;
  onOpen: () => void;
}) {
  const timeLabel = (() => {
    try {
      return item.dueDate.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
    } catch {
      return "—";
    }
  })();
  const isLate = item.status === "overdue_1d" || item.status === "overdue_more";
  const lateLabel = item.status === "overdue_1d"
    ? "En retard 1j"
    : item.status === "overdue_more"
      ? `En retard ${item.daysLate}j`
      : null;

  // Premium V2 (2026-04-29) — gradient teal, hover lift, avatar
  const initials = (item.client.firstName?.[0] ?? "") + (item.client.lastName?.[0] ?? "");
  const accentColor = isLate ? "var(--ls-coral)" : "var(--ls-teal)";
  const accentGlow = isLate ? "rgba(220,38,38,0.30)" : "rgba(13,148,136,0.30)";
  const accentBg = isLate
    ? "linear-gradient(135deg, color-mix(in srgb, var(--ls-coral) 5%, var(--ls-surface)) 0%, var(--ls-surface) 60%)"
    : "linear-gradient(135deg, color-mix(in srgb, var(--ls-teal) 5%, var(--ls-surface)) 0%, var(--ls-surface) 60%)";
  const accentGradient = isLate
    ? "linear-gradient(180deg, #FF6B6B 0%, #DC2626 100%)"
    : "linear-gradient(180deg, #2DD4BF 0%, #0D9488 100%)";

  return (
    <button
      type="button"
      onClick={onOpen}
      className="ls-rdv-card"
      style={{
        position: "relative",
        width: "100%",
        display: "flex",
        alignItems: "center",
        gap: 14,
        padding: "14px 16px 14px 18px",
        background: accentBg,
        border: `0.5px solid color-mix(in srgb, ${accentColor} 30%, var(--ls-border))`,
        borderRadius: 16,
        color: "inherit",
        cursor: "pointer",
        fontFamily: "DM Sans, sans-serif",
        textAlign: "left",
        overflow: "hidden",
        transition: "transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-2px)";
        e.currentTarget.style.boxShadow = `0 8px 22px -10px ${accentGlow}`;
        e.currentTarget.style.borderColor = `color-mix(in srgb, ${accentColor} 60%, var(--ls-border))`;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "none";
        e.currentTarget.style.boxShadow = "none";
        e.currentTarget.style.borderColor = `color-mix(in srgb, ${accentColor} 30%, var(--ls-border))`;
      }}
    >
      {/* Border-left gradient */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          bottom: 0,
          width: 4,
          background: accentGradient,
          borderRadius: "16px 0 0 16px",
        }}
      />

      {/* Date pill */}
      <div
        style={{
          minWidth: 64,
          textAlign: "center",
          flexShrink: 0,
          padding: "8px 6px",
          background: `color-mix(in srgb, ${accentColor} 8%, var(--ls-surface2))`,
          border: `0.5px solid color-mix(in srgb, ${accentColor} 30%, transparent)`,
          borderRadius: 10,
        }}
      >
        <div
          style={{
            fontFamily: "Syne, serif",
            fontWeight: 800,
            fontSize: 14,
            color: accentColor,
            lineHeight: 1.1,
            letterSpacing: "-0.02em",
          }}
        >
          J+{item.dayOffset}
        </div>
        {showDate && (
          <div style={{ fontSize: 10, color: "var(--ls-text-hint)", marginTop: 2, fontWeight: 500 }}>
            {timeLabel}
          </div>
        )}
      </div>

      {/* Avatar gradient teal/coral */}
      <div
        style={{
          width: 38,
          height: 38,
          borderRadius: 12,
          background: accentGradient,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "white",
          fontFamily: "Syne, serif",
          fontWeight: 800,
          fontSize: 13,
          flexShrink: 0,
          boxShadow: `0 2px 8px ${accentGlow}`,
          letterSpacing: "-0.02em",
        }}
      >
        {initials.toUpperCase()}
      </div>

      {/* Infos */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            fontSize: 14,
            fontWeight: 700,
            color: "var(--ls-text)",
            marginBottom: 2,
            fontFamily: "Syne, serif",
            letterSpacing: "-0.01em",
            flexWrap: "wrap",
          }}
        >
          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {item.client.firstName} {item.client.lastName}
          </span>
          {lateLabel && (
            <span
              style={{
                padding: "2px 7px",
                borderRadius: 999,
                fontSize: 9,
                fontWeight: 800,
                background: "linear-gradient(135deg, #FF6B6B 0%, #DC2626 100%)",
                color: "white",
                letterSpacing: 0.4,
                animation: "ls-pulse-imminent 2s ease-in-out infinite",
              }}
            >
              ⚠ {lateLabel.toUpperCase()}
            </span>
          )}
        </div>
        <div
          style={{
            fontSize: 11,
            color: "var(--ls-text-muted)",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {item.stepIconEmoji} {item.stepShortTitle}
        </div>
      </div>

      {/* Badge */}
      <span
        style={{
          flexShrink: 0,
          padding: "3px 9px",
          borderRadius: 999,
          fontSize: 9.5,
          fontWeight: 800,
          letterSpacing: 0.4,
          background: `color-mix(in srgb, ${accentColor} 12%, transparent)`,
          color: accentColor,
          border: `0.5px solid color-mix(in srgb, ${accentColor} 35%, transparent)`,
          textTransform: "uppercase",
        }}
      >
        Suivi
      </span>

      {/* Chevron */}
      <span
        aria-hidden="true"
        style={{
          fontSize: 14,
          color: "var(--ls-text-hint)",
          opacity: 0.5,
          flexShrink: 0,
          marginLeft: 2,
        }}
      >
        →
      </span>
    </button>
  );
}

// ─── Onglet entité (Agenda unifié) ────────────────────────────────────────
function EntityTab({
  label, count, active, onClick, dot,
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
  dot: string | null;
}) {
  // Premium V2 (2026-04-29) : chip pill avec gradient subtil quand actif,
  // counter pill colore, hover lift, anim d'apparition.
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        padding: "9px 16px",
        fontSize: 13,
        fontWeight: active ? 700 : 500,
        fontFamily: "DM Sans, sans-serif",
        cursor: "pointer",
        background: active && dot
          ? `linear-gradient(135deg, color-mix(in srgb, ${dot} 14%, var(--ls-surface)) 0%, var(--ls-surface) 100%)`
          : active
            ? "linear-gradient(135deg, color-mix(in srgb, var(--ls-gold) 14%, var(--ls-surface)) 0%, var(--ls-surface) 100%)"
            : "var(--ls-surface)",
        border: active && dot
          ? `0.5px solid color-mix(in srgb, ${dot} 50%, transparent)`
          : active
            ? "0.5px solid color-mix(in srgb, var(--ls-gold) 50%, transparent)"
            : "0.5px solid var(--ls-border)",
        borderRadius: 999,
        color: active ? (dot ?? "var(--ls-gold)") : "var(--ls-text-muted)",
        transition: "transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease",
        boxShadow: active && dot ? `0 4px 12px -4px color-mix(in srgb, ${dot} 30%, transparent)` : "none",
      }}
      onMouseEnter={(e) => {
        if (!active) {
          e.currentTarget.style.transform = "translateY(-1px)";
          e.currentTarget.style.borderColor = "color-mix(in srgb, var(--ls-gold) 30%, var(--ls-border))";
        }
      }}
      onMouseLeave={(e) => {
        if (!active) {
          e.currentTarget.style.transform = "none";
          e.currentTarget.style.borderColor = "var(--ls-border)";
        }
      }}
    >
      {dot && (
        <span
          style={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: dot,
            flexShrink: 0,
            display: "inline-block",
            boxShadow: active ? `0 0 0 3px color-mix(in srgb, ${dot} 20%, transparent)` : "none",
          }}
        />
      )}
      <span>{label}</span>
      <span
        style={{
          fontSize: 11,
          padding: "2px 9px",
          borderRadius: 999,
          fontWeight: 800,
          fontFamily: "Syne, serif",
          background: active
            ? "var(--ls-bg)"
            : "var(--ls-surface2)",
          color: active ? (dot ?? "var(--ls-gold)") : "var(--ls-text-muted)",
          border: active ? `0.5px solid ${dot ?? "var(--ls-gold)"}` : "0.5px solid transparent",
          minWidth: 22,
          textAlign: "center",
          letterSpacing: -0.2,
        }}
      >
        {count}
      </span>
    </button>
  );
}

// ─── Carte RDV client (agenda unifié) — V2 PREMIUM 2026-04-29 ──────────────
function ClientFollowUpCard({
  followUp, client, ownerName, showDate,
}: {
  followUp: FollowUp;
  client: Client;
  ownerName?: string;
  showDate: boolean;
}) {
  const timeLabel = (() => {
    try {
      const d = new Date(followUp.dueDate);
      return d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
    } catch { return "—"; }
  })();
  const dateLabel = (() => {
    try {
      const d = new Date(followUp.dueDate);
      return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
    } catch { return "—"; }
  })();

  // Detection imminent (<24h) ou aujourd'hui pour badge "🔥"
  const dueDate = new Date(followUp.dueDate);
  const now = new Date();
  const isToday = dueDate.toDateString() === now.toDateString();
  const isImminent = !Number.isNaN(dueDate.getTime()) && (dueDate.getTime() - now.getTime()) < 24 * 60 * 60 * 1000 && (dueDate.getTime() - now.getTime()) > 0;
  const initials = (client.firstName?.[0] ?? "") + (client.lastName?.[0] ?? "");

  return (
    <Link
      to={`/clients/${client.id}`}
      className="ls-rdv-card ls-rdv-card-client"
      style={{
        position: "relative",
        display: "flex",
        alignItems: "center",
        gap: 14,
        padding: "14px 16px 14px 18px",
        background:
          "linear-gradient(135deg, color-mix(in srgb, var(--ls-gold) 5%, var(--ls-surface)) 0%, var(--ls-surface) 60%)",
        border: "0.5px solid color-mix(in srgb, var(--ls-gold) 30%, var(--ls-border))",
        borderRadius: 16,
        textDecoration: "none",
        color: "inherit",
        cursor: "pointer",
        overflow: "hidden",
        transition: "transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-2px)";
        e.currentTarget.style.boxShadow = "0 8px 22px -10px rgba(184,146,42,0.35)";
        e.currentTarget.style.borderColor = "color-mix(in srgb, var(--ls-gold) 60%, var(--ls-border))";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "none";
        e.currentTarget.style.boxShadow = "none";
        e.currentTarget.style.borderColor = "color-mix(in srgb, var(--ls-gold) 30%, var(--ls-border))";
      }}
    >
      {/* Border-left gold gradient */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          bottom: 0,
          width: 4,
          background: "linear-gradient(180deg, #EF9F27 0%, #BA7517 100%)",
          borderRadius: "16px 0 0 16px",
        }}
      />

      {/* Date/heure pill */}
      <div
        style={{
          minWidth: 64,
          textAlign: "center",
          flexShrink: 0,
          padding: "8px 6px",
          background: "color-mix(in srgb, var(--ls-gold) 8%, var(--ls-surface2))",
          border: "0.5px solid color-mix(in srgb, var(--ls-gold) 30%, transparent)",
          borderRadius: 10,
        }}
      >
        <div
          style={{
            fontFamily: "Syne, serif",
            fontWeight: 800,
            fontSize: 14,
            color: "var(--ls-gold)",
            lineHeight: 1.1,
            letterSpacing: "-0.02em",
          }}
        >
          {showDate ? dateLabel : timeLabel}
        </div>
        {showDate && (
          <div style={{ fontSize: 10, color: "var(--ls-text-hint)", marginTop: 2, fontWeight: 500 }}>
            {timeLabel}
          </div>
        )}
      </div>

      {/* Avatar gradient gold */}
      <div
        style={{
          width: 38,
          height: 38,
          borderRadius: 12,
          background: "linear-gradient(135deg, #EF9F27 0%, #BA7517 100%)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "white",
          fontFamily: "Syne, serif",
          fontWeight: 800,
          fontSize: 13,
          flexShrink: 0,
          boxShadow: "0 2px 8px rgba(186,117,23,0.30)",
          letterSpacing: "-0.02em",
        }}
      >
        {initials.toUpperCase()}
      </div>

      {/* Infos */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            fontSize: 14,
            fontWeight: 700,
            color: "var(--ls-text)",
            marginBottom: 2,
            fontFamily: "Syne, serif",
            letterSpacing: "-0.01em",
          }}
        >
          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {client.firstName} {client.lastName}
          </span>
          {isToday && (
            <span
              style={{
                fontSize: 9,
                fontWeight: 800,
                padding: "2px 7px",
                borderRadius: 999,
                background: "linear-gradient(135deg, #FF6B6B 0%, #BA7517 100%)",
                color: "white",
                letterSpacing: 0.4,
                flexShrink: 0,
                animation: "ls-pulse-imminent 2s ease-in-out infinite",
              }}
            >
              🔥 AUJOURD&apos;HUI
            </span>
          )}
          {!isToday && isImminent && (
            <span
              style={{
                fontSize: 9,
                fontWeight: 800,
                padding: "2px 7px",
                borderRadius: 999,
                background: "rgba(255,107,107,0.14)",
                color: "var(--ls-coral)",
                letterSpacing: 0.4,
                flexShrink: 0,
              }}
            >
              ⏰ &lt;24H
            </span>
          )}
        </div>
        <div
          style={{
            fontSize: 11,
            color: "var(--ls-text-muted)",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {followUp.type || "Suivi"}
          {followUp.programTitle ? ` · ${followUp.programTitle}` : ""}
          {ownerName ? ` · ${ownerName}` : ""}
        </div>
      </div>

      {/* Badge type */}
      <span
        style={{
          flexShrink: 0,
          padding: "3px 9px",
          borderRadius: 999,
          fontSize: 9.5,
          fontWeight: 800,
          letterSpacing: 0.4,
          background: "rgba(184,146,42,0.14)",
          color: "var(--ls-gold)",
          border: "0.5px solid color-mix(in srgb, var(--ls-gold) 35%, transparent)",
          textTransform: "uppercase",
          fontFamily: "DM Sans, sans-serif",
        }}
      >
        Client
      </span>

      {/* Chevron */}
      <span
        aria-hidden="true"
        style={{
          fontSize: 14,
          color: "var(--ls-text-hint)",
          opacity: 0.5,
          flexShrink: 0,
          marginLeft: 2,
        }}
      >
        →
      </span>
    </Link>
  );
}

function FilterPill({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  // Premium V2 FilterPill (2026-04-29) — gold subtle hover gradient
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        fontSize: 12,
        padding: "7px 14px",
        background: active
          ? "linear-gradient(135deg, color-mix(in srgb, var(--ls-gold) 12%, var(--ls-surface)) 0%, var(--ls-surface) 100%)"
          : "var(--ls-surface)",
        border: active
          ? "0.5px solid color-mix(in srgb, var(--ls-gold) 50%, transparent)"
          : "0.5px solid var(--ls-border)",
        color: active ? "var(--ls-gold)" : "var(--ls-text-muted)",
        fontWeight: active ? 700 : 500,
        fontFamily: "DM Sans, sans-serif",
        borderRadius: 999,
        cursor: "pointer",
        boxShadow: active ? "0 2px 8px -3px rgba(184,146,42,0.30)" : "none",
        transition: "transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease",
      }}
      onMouseEnter={(e) => {
        if (!active) {
          e.currentTarget.style.transform = "translateY(-1px)";
          e.currentTarget.style.borderColor = "color-mix(in srgb, var(--ls-gold) 30%, var(--ls-border))";
        }
      }}
      onMouseLeave={(e) => {
        if (!active) {
          e.currentTarget.style.transform = "none";
          e.currentTarget.style.borderColor = "var(--ls-border)";
        }
      }}
    >
      {label}
    </button>
  );
}

function ProspectDetailModal({
  prospect,
  onClose,
  onEdit,
  onStartAssessment,
  onOpenClient,
  onChangeStatus,
  onSetCold,
  onReactivate,
  onDelete,
}: {
  prospect: Prospect;
  onClose: () => void;
  onEdit: () => void;
  onStartAssessment: () => void;
  onOpenClient: () => void;
  onChangeStatus: (status: ProspectStatus) => void;
  onSetCold: (coldUntil: string, coldReason: string) => void;
  onReactivate: () => void;
  onDelete: () => void;
}) {
  const [showColdForm, setShowColdForm] = useState(false);
  // Perf (2026-04-20) : mémoïsé pour éviter le recalcul à chaque render de la modal.
  const defaultColdDate = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 90); // +90 jours par défaut
    return d.toISOString().slice(0, 10);
  }, []);
  const [coldDate, setColdDate] = useState(defaultColdDate);
  const [coldReason, setColdReason] = useState("");
  const rdvDisplay = (() => {
    try {
      return new Date(prospect.rdvDate).toLocaleString("fr-FR", {
        weekday: "long", day: "2-digit", month: "long", year: "numeric",
        hour: "2-digit", minute: "2-digit",
      });
    } catch { return prospect.rdvDate; }
  })();

  // Chantier UX modal (2026-04-19) : export Google Agenda
  function handleAddToGoogleCalendar() {
    const title = `RDV prospection — ${prospect.firstName} ${prospect.lastName}`;
    const startDate = new Date(prospect.rdvDate);
    if (Number.isNaN(startDate.getTime())) return;
    const endDate = new Date(startDate.getTime() + 60 * 60 * 1000); // +1h

    const description = [
      prospect.note ? `Note : ${prospect.note}` : null,
      prospect.phone ? `Tél : ${prospect.phone}` : null,
      prospect.email ? `Email : ${prospect.email}` : null,
      `Source : ${prospect.source}${prospect.sourceDetail ? ` (${prospect.sourceDetail})` : ""}`,
    ].filter(Boolean).join("\n");

    const url = createGoogleCalendarLink({ title, startDate, endDate, description });
    window.open(url, "_blank");
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      tabIndex={0}
      onClick={onClose}
      onKeyDown={(e) => { if (e.key === 'Escape') onClose(); }}
      style={{
        position: "fixed", inset: 0,
        background: "rgba(0,0,0,0.55)", zIndex: 10000,
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 16, fontFamily: "'DM Sans', sans-serif",
      }}
    >
      <div
        role="presentation"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
        style={{
          background: "var(--ls-surface)", borderRadius: 14,
          width: "100%", maxWidth: 480, padding: 22,
          border: "1px solid var(--ls-border)",
          boxShadow: "0 20px 60px rgba(0,0,0,0.35)",
        }}
      >
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 14, gap: 12 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 20, color: "var(--ls-text)" }}>
              {prospect.firstName} {prospect.lastName}
            </div>
            <div style={{ fontSize: 12, color: "var(--ls-text-muted)", marginTop: 2 }}>
              {rdvDisplay}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            style={{ flexShrink: 0, background: "transparent", border: "none", color: "var(--ls-text-muted)", fontSize: 22, cursor: "pointer", padding: 4, lineHeight: 1 }}
          >×</button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
          {prospect.phone && <InfoRow label="Téléphone" value={prospect.phone} />}
          {prospect.email && <InfoRow label="Email" value={prospect.email} />}
          <InfoRow label="Source" value={`${prospect.source}${prospect.sourceDetail ? ` · ${prospect.sourceDetail}` : ""}`} />
          <InfoRow label="Statut" value={PROSPECT_STATUS_LABELS[prospect.status]} />
          {prospect.note && (
            <div style={{ padding: 12, borderRadius: 10, background: "var(--ls-surface2)", border: "1px solid var(--ls-border)" }}>
              <div style={{ fontSize: 10, letterSpacing: "1px", textTransform: "uppercase", color: "var(--ls-text-hint)", fontWeight: 500, marginBottom: 4 }}>Note</div>
              <div style={{ fontSize: 13, color: "var(--ls-text)", lineHeight: 1.5 }}>{prospect.note}</div>
            </div>
          )}
          {/* Prospect en pause : date de reprise + contexte */}
          {prospect.status === "cold" && (
            <div style={{ padding: 12, borderRadius: 10, background: "color-mix(in srgb, var(--ls-teal) 7%, transparent)", border: "1px solid color-mix(in srgb, var(--ls-teal) 25%, transparent)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 10, letterSpacing: "1px", textTransform: "uppercase", color: "var(--ls-teal)", fontWeight: 600, marginBottom: 4 }}>
                <SnowflakeIcon /> En pause
              </div>
              {prospect.coldUntil && (
                <div style={{ fontSize: 13, color: "var(--ls-text)", marginBottom: 4 }}>
                  À reprendre à partir du {new Date(prospect.coldUntil).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" })}
                </div>
              )}
              {prospect.coldReason && (
                <div style={{ fontSize: 12, color: "var(--ls-text-muted)", lineHeight: 1.5, fontStyle: "italic" }}>
                  « {prospect.coldReason} »
                </div>
              )}
            </div>
          )}
        </div>

        {/* Actions primaires selon statut */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 8 }}>
          {prospect.status === "scheduled" && (
            <Button onClick={onStartAssessment} className="flex-1">
              Commencer son bilan
            </Button>
          )}
          {prospect.status === "done" && (
            <Button onClick={onStartAssessment} className="flex-1">
              Convertir en client
            </Button>
          )}
          {prospect.status === "converted" && prospect.convertedClientId && (
            <Button onClick={onOpenClient} className="flex-1">
              Ouvrir la fiche client →
            </Button>
          )}
          {prospect.status === "cold" && (
            <Button onClick={onReactivate} className="flex-1">
              Planifier un RDV →
            </Button>
          )}
        </div>

        {/* CTA secondaire teal — Ajouter à mon agenda Google (RDV futurs uniquement).
            Chantier UX modal (2026-04-20) : remonté depuis le header pour en faire
            une action visible sous le CTA principal gold. */}
        {prospect.status === "scheduled" && (
          <button
            type="button"
            onClick={handleAddToGoogleCalendar}
            style={{
              width: "100%",
              padding: "12px 16px",
              marginTop: 10,
              background: "var(--ls-teal)",
              color: "#0B0D11",
              border: "none",
              borderRadius: 10,
              fontFamily: "'DM Sans', sans-serif",
              fontWeight: 600,
              fontSize: 14,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              cursor: "pointer",
              transition: "opacity 150ms",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.opacity = "0.9"; }}
            onMouseLeave={(e) => { e.currentTarget.style.opacity = "1"; }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            Ajouter à mon agenda
          </button>
        )}

        {/* Mini-formulaire "Mettre en pause" */}
        {showColdForm && (
          <div style={{
            marginTop: 12, padding: 14, borderRadius: 10,
            background: "color-mix(in srgb, var(--ls-teal) 6%, transparent)",
            border: "1px solid color-mix(in srgb, var(--ls-teal) 25%, transparent)",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, letterSpacing: "1px", textTransform: "uppercase", color: "var(--ls-teal)", fontWeight: 600, marginBottom: 6 }}>
              <SnowflakeIcon /> Mettre en pause
            </div>
            <p style={{ fontSize: 12, color: "var(--ls-text-muted)", marginBottom: 12, lineHeight: 1.5 }}>
              On note ce contact pour le reprendre plus tard. Choisis la date à laquelle tu veux le relancer.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div>
                <label className="ls-field-label">Date de reprise</label>
                <input
                  type="date"
                  value={coldDate}
                  onChange={(e) => setColdDate(e.target.value)}
                  className="ls-input-time"
                  style={{ width: "100%" }}
                />
              </div>
              <div>
                <label className="ls-field-label">Contexte (facultatif)</label>
                <textarea
                  value={coldReason}
                  onChange={(e) => setColdReason(e.target.value)}
                  rows={2}
                  placeholder="ex : budget serré, relancer en septembre"
                  className="ls-input"
                  style={{ resize: "vertical" }}
                />
              </div>
              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                <button
                  type="button"
                  onClick={() => setShowColdForm(false)}
                  style={{ padding: "7px 14px", borderRadius: 9, border: "1px solid var(--ls-border)", background: "transparent", color: "var(--ls-text-muted)", fontSize: 12, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const iso = new Date(coldDate + "T09:00:00").toISOString();
                    onSetCold(iso, coldReason);
                  }}
                  style={{ padding: "7px 14px", borderRadius: 9, border: "none", background: "var(--ls-teal)", color: "var(--ls-bg)", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}
                >
                  Confirmer
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Actions secondaires en 2 sections hiérarchisées */}
        {prospect.status !== "converted" && !showColdForm && (
          <div style={{ marginTop: 10, paddingTop: 14, borderTop: "1px solid var(--ls-border)", display: "flex", flexDirection: "column", gap: 14 }}>
            {/* Après le RDV : actions positives/neutres */}
            <div>
              <div style={{ fontSize: 11, letterSpacing: "0.5px", color: "var(--ls-text-muted)", marginBottom: 8, fontFamily: "'DM Sans', sans-serif" }}>
                Après le RDV :
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {prospect.status !== "done" && (
                  <SmallStatusBtn label="Effectué" onClick={() => onChangeStatus("done")} />
                )}
                <SmallStatusBtn
                  label="✓ Converti"
                  onClick={onStartAssessment}
                  tone="positive"
                />
                {prospect.status !== "cold" && (
                  <SmallStatusBtn
                    label="Mettre en pause"
                    icon={<SnowflakeIcon />}
                    onClick={() => setShowColdForm(true)}
                    tone="neutral"
                  />
                )}
              </div>
            </div>

            {/* Sinon : actions négatives */}
            <div>
              <div style={{ fontSize: 11, letterSpacing: "0.5px", color: "var(--ls-text-muted)", marginBottom: 8, fontFamily: "'DM Sans', sans-serif" }}>
                Sinon :
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {prospect.status !== "no_show" && (
                  <SmallStatusBtn label="Pas venu" onClick={() => onChangeStatus("no_show")} tone="soft-negative" />
                )}
                {prospect.status !== "lost" && (
                  <SmallStatusBtn label="Pas intéressé" onClick={() => onChangeStatus("lost")} tone="soft-negative" />
                )}
                {prospect.status !== "cancelled" && (
                  <SmallStatusBtn label="Annulé" onClick={() => onChangeStatus("cancelled")} tone="soft-negative" />
                )}
              </div>
            </div>
          </div>
        )}

        {/* Administration — footer discret */}
        <div style={{ display: "flex", gap: 8, justifyContent: "space-between", alignItems: "center", marginTop: 18, paddingTop: 12, borderTop: "1px solid var(--ls-border)" }}>
          <button
            type="button"
            onClick={onEdit}
            style={{ background: "transparent", border: "none", color: "var(--ls-text-muted)", fontSize: 12, cursor: "pointer", padding: "6px 10px", fontFamily: "'DM Sans', sans-serif", textDecoration: "underline", textUnderlineOffset: 3 }}
          >
            Modifier
          </button>
          <button
            type="button"
            onClick={onDelete}
            style={{ background: "transparent", border: "none", color: "var(--ls-coral)", fontSize: 12, cursor: "pointer", padding: "6px 10px", fontFamily: "'DM Sans', sans-serif", textDecoration: "underline", textUnderlineOffset: 3 }}
          >
            Supprimer
          </button>
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 10, fontSize: 13 }}>
      <span style={{ color: "var(--ls-text-muted)" }}>{label}</span>
      <span style={{ color: "var(--ls-text)", fontWeight: 500, textAlign: "right" }}>{value}</span>
    </div>
  );
}

type SmallStatusBtnTone = "default" | "positive" | "neutral" | "soft-negative";

function SmallStatusBtn({
  label,
  onClick,
  tone = "default",
  icon,
}: {
  label: string;
  onClick: () => void;
  tone?: SmallStatusBtnTone;
  icon?: React.ReactNode;
}) {
  const hoverColorByTone: Record<SmallStatusBtnTone, string> = {
    default: "var(--ls-text)",
    positive: "var(--ls-teal)",
    neutral: "var(--ls-teal)",
    "soft-negative": "var(--ls-coral)",
  };
  const hoverColor = hoverColorByTone[tone];
  const iconColor = tone === "neutral" ? "var(--ls-teal)" : "currentColor";

  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        fontSize: 12,
        padding: "6px 12px",
        borderRadius: 999,
        background: "transparent",
        border: "1.5px solid var(--ls-border)",
        color: "var(--ls-text)",
        cursor: "pointer",
        fontFamily: "'DM Sans', sans-serif",
        fontWeight: 400,
        transition: "border-color 150ms, color 150ms, background 150ms",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = hoverColor;
        e.currentTarget.style.color = hoverColor;
        e.currentTarget.style.background = `color-mix(in srgb, ${hoverColor} 7%, transparent)`;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = "var(--ls-border)";
        e.currentTarget.style.color = "var(--ls-text)";
        e.currentTarget.style.background = "transparent";
      }}
    >
      {icon && (
        <span style={{ display: "inline-flex", color: iconColor }}>{icon}</span>
      )}
      {label}
    </button>
  );
}

function SnowflakeIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="2" x2="12" y2="22" />
      <line x1="2" y1="12" x2="22" y2="12" />
      <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
      <line x1="19.07" y1="4.93" x2="4.93" y2="19.07" />
    </svg>
  );
}

// ─── Stats équipe cette semaine (admin only, mode "Toute l'équipe") ──────
function TeamStatsWidget({ prospects }: { prospects: Prospect[] }) {
  const stats = useMemo(() => {
    const weekStart = startOfWeek(new Date());
    const weekEnd = endOfWeek(new Date());
    const thisWeek = prospects.filter((p) => {
      try {
        const d = new Date(p.rdvDate);
        return d >= weekStart && d <= weekEnd;
      } catch { return false; }
    });
    const total = thisWeek.length;
    const converted = thisWeek.filter((p) => p.status === "converted").length;
    const cold = thisWeek.filter((p) => p.status === "cold").length;
    const noShow = thisWeek.filter((p) => p.status === "no_show").length;
    const conversionRate = total > 0 ? Math.round((converted / total) * 100) : 0;
    return { total, converted, cold, noShow, conversionRate };
  }, [prospects]);

  return (
    <div
      style={{
        background: "var(--ls-surface)",
        border: "1px solid var(--ls-border)",
        borderRadius: 14,
        padding: 18,
      }}
    >
      <div style={{ fontSize: 9, letterSpacing: "2px", textTransform: "uppercase", color: "var(--ls-text-hint)", fontWeight: 500, marginBottom: 14, fontFamily: "'DM Sans', sans-serif" }}>
        Cette semaine · Toute l'équipe
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
        <StatTile icon="📅" value={stats.total} label="RDV" />
        <StatTile icon="✓" value={stats.converted} label="Convertis" accent="var(--ls-teal)" />
        <StatTile icon="❄" value={stats.cold} label="En pause" accent="var(--ls-teal)" />
        <StatTile icon="❌" value={stats.noShow} label="Pas venus" accent="var(--ls-coral)" />
      </div>
      <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid var(--ls-border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: 12, color: "var(--ls-text-muted)", fontFamily: "'DM Sans', sans-serif" }}>
          Taux de conversion
        </span>
        <span
          style={{
            fontFamily: "Syne, sans-serif",
            fontWeight: 700,
            fontSize: 18,
            color: stats.conversionRate >= 40 ? "var(--ls-teal)" : stats.conversionRate >= 20 ? "var(--ls-gold)" : "var(--ls-text-muted)",
          }}
        >
          {stats.conversionRate}%
        </span>
      </div>
    </div>
  );
}

function StatTile({ icon, value, label, accent }: { icon: string; value: number; label: string; accent?: string }) {
  return (
    <div
      style={{
        background: "var(--ls-surface2)",
        borderRadius: 10,
        padding: "10px 12px",
        textAlign: "center",
      }}
    >
      <div style={{ fontSize: 16, marginBottom: 4 }}>{icon}</div>
      <div
        style={{
          fontFamily: "Syne, sans-serif",
          fontWeight: 700,
          fontSize: 24,
          color: accent ?? "var(--ls-text)",
          lineHeight: 1,
        }}
      >
        {value}
      </div>
      <div style={{ fontSize: 11, color: "var(--ls-text-muted)", marginTop: 4, fontFamily: "'DM Sans', sans-serif" }}>
        {label}
      </div>
    </div>
  );
}
