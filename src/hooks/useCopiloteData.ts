// Chantier Co-pilote V4 (2026-04-24).
// Hook unique qui agrège tout ce dont la page /co-pilote a besoin :
// next action (RDV ou suivi protocole), agenda du jour, suivis pending,
// mini-stats (clients, semaine, conversion), PV mois + cible + %.
//
// Data dérivée exclusivement de useAppContext (pas de query supplémentaire),
// memoïsée par now (changement toutes les minutes via useLiveClock).

import { useMemo } from "react";
import { useAppContext } from "../context/AppContext";
import type { Client, FollowUp, Prospect } from "../types/domain";
import {
  daysRemainingInMonth,
  conversionRatePercent,
} from "../lib/utils/copiloteHelpers";

const DEFAULT_MONTHLY_PV_TARGET = 13_000;

export interface CopiloteNextAction {
  kind: "rdv" | "followup" | "none";
  clientId: string;
  clientName: string;
  title: string;
  subtitle?: string;
  location?: string;
  time?: Date;
  protocolDay?: number;
  isProspect?: boolean;
}

export interface CopiloteAgendaItem {
  kind: "rdv-client" | "rdv-prospect";
  id: string;
  clientId: string;
  name: string;
  type: string;
  time: Date;
}

export interface CopiloteFollowupItem {
  id: string;
  clientId: string;
  clientName: string;
  protocolDay: number;
  label: string;
  tone: "teal" | "coral" | "purple" | "gold" | "blue";
}

export interface CopiloteData {
  // Mood / counters
  totalEventsToday: number;
  todayAppointmentsCount: number;
  todayFollowupsCount: number;

  // Hero
  nextAction: CopiloteNextAction | null;

  // Agenda / suivis (max 3 préservés, reste comptabilisé dans moreCount)
  todayAgenda: CopiloteAgendaItem[];
  todayAgendaMoreCount: number;
  pendingFollowups: CopiloteFollowupItem[];
  pendingFollowupsMoreCount: number;

  // Bande stats
  monthlyPV: number;
  monthlyPVTarget: number;
  daysLeftInMonth: number;
  activeClientsCount: number;
  activeClientsDelta: number;
  weekAppointmentsCount: number;
  conversionRate: number;
}

function hasMetric(user: unknown): user is { monthly_pv_target?: number } {
  return typeof user === "object" && user !== null;
}

const PROTOCOL_TONES = ["teal", "coral", "purple", "gold", "blue"] as const;

export function useCopiloteData(now: Date, globalView: boolean = false): CopiloteData {
  const {
    currentUser,
    clients,
    followUps,
    prospects,
    pvTransactions,
    followUpProtocolLogs,
  } = useAppContext();

  return useMemo<CopiloteData>(() => {
    if (!currentUser) {
      return emptyData(now);
    }

    // Hotfix filtre Co-pilote (2026-04-24) : par défaut, TOUT LE MONDE
    // (admin compris) voit uniquement ses propres RDV / clients / suivis.
    // Un admin peut activer le toggle 'Vue globale' pour voir toute
    // l'équipe.
    const isAdmin = currentUser.role === "admin";
    const applyGlobal = isAdmin && globalView;
    const myClients: Client[] = applyGlobal
      ? clients
      : clients.filter((c) => c.distributorId === currentUser.id);
    const myClientIds = new Set(myClients.map((c) => c.id));

    const myFollowUps: FollowUp[] = applyGlobal
      ? followUps
      : followUps.filter((f) => myClientIds.has(f.clientId));
    const myProspects: Prospect[] = applyGlobal
      ? prospects
      : prospects.filter((p) => p.distributorId === currentUser.id);

    // ─── Today range ───────────────────────────────────────────────────────
    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);
    const endOfToday = new Date(startOfToday);
    endOfToday.setDate(endOfToday.getDate() + 1);

    const startOfWeek = new Date(startOfToday);
    // Monday = ISO (current day - dow offset)
    const dow = (startOfWeek.getDay() + 6) % 7;
    startOfWeek.setDate(startOfWeek.getDate() - dow);
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(endOfWeek.getDate() + 7);

    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // ─── Agenda du jour ────────────────────────────────────────────────────
    const todayAgendaRaw: CopiloteAgendaItem[] = [];

    for (const f of myFollowUps) {
      if (f.status !== "scheduled") continue;
      const d = new Date(f.dueDate);
      if (d >= startOfToday && d < endOfToday) {
        const client = myClients.find((c) => c.id === f.clientId);
        if (!client) continue;
        todayAgendaRaw.push({
          kind: "rdv-client",
          id: f.id,
          clientId: client.id,
          name: `${client.firstName} ${client.lastName}`.trim(),
          type: f.type || "Suivi",
          time: d,
        });
      }
    }

    for (const p of myProspects) {
      if (p.status !== "scheduled") continue;
      try {
        const d = new Date(p.rdvDate);
        if (d >= startOfToday && d < endOfToday) {
          todayAgendaRaw.push({
            kind: "rdv-prospect",
            id: p.id,
            clientId: p.id, // pas de fiche client, on renvoie vers /agenda
            name: `${p.firstName} ${p.lastName}`.trim(),
            type: "Prospect · 1er contact",
            time: d,
          });
        }
      } catch {
        // skip mauvaise date
      }
    }

    todayAgendaRaw.sort((a, b) => a.time.getTime() - b.time.getTime());
    const todayAgenda = todayAgendaRaw.slice(0, 3);
    const todayAgendaMoreCount = Math.max(0, todayAgendaRaw.length - 3);

    // ─── Suivis à faire (protocole) ─────────────────────────────────────────
    const loggedKey = (clientId: string, day: number) => `${clientId}::j${day}`;
    const loggedSet = new Set(
      followUpProtocolLogs.map((l) => loggedKey(l.clientId, daysFromStepId(l.stepId))),
    );

    const pendingFollowupsRaw: CopiloteFollowupItem[] = [];
    const PROTOCOL_DAYS = [1, 3, 7, 10] as const;

    for (const client of myClients) {
      // Prend la date du bilan initial (ou le plus ancien).
      const initial =
        client.assessments?.find((a) => a.type === "initial") ??
        [...(client.assessments ?? [])].sort(
          (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
        )[0];
      if (!initial) continue;
      const start = new Date(initial.date);
      start.setHours(0, 0, 0, 0);
      const today0 = new Date(startOfToday);
      const daysSince = Math.floor(
        (today0.getTime() - start.getTime()) / (1000 * 60 * 60 * 24),
      );
      if (daysSince < 0 || daysSince > 10) continue;

      for (const day of PROTOCOL_DAYS) {
        if (daysSince !== day) continue;
        if (loggedSet.has(loggedKey(client.id, day))) continue;
        const tone =
          PROTOCOL_TONES[PROTOCOL_DAYS.indexOf(day) % PROTOCOL_TONES.length];
        pendingFollowupsRaw.push({
          id: `${client.id}-j${day}`,
          clientId: client.id,
          clientName: `${client.firstName} ${client.lastName}`.trim(),
          protocolDay: day,
          label: labelForProtocolDay(day),
          tone,
        });
      }
    }

    const pendingFollowups = pendingFollowupsRaw.slice(0, 3);
    const pendingFollowupsMoreCount = Math.max(0, pendingFollowupsRaw.length - 3);

    // ─── Hero : prochain RDV SINON 1er suivi SINON null ────────────────────
    let nextAction: CopiloteNextAction | null = null;
    const upcomingToday = todayAgendaRaw.filter((a) => a.time.getTime() >= now.getTime());
    if (upcomingToday.length > 0) {
      const first = upcomingToday[0];
      nextAction = {
        kind: "rdv",
        clientId: first.clientId,
        clientName: first.name,
        title: first.type,
        time: first.time,
        isProspect: first.kind === "rdv-prospect",
      };
    } else if (pendingFollowupsRaw.length > 0) {
      const first = pendingFollowupsRaw[0];
      nextAction = {
        kind: "followup",
        clientId: first.clientId,
        clientName: first.clientName,
        title: `J+${first.protocolDay} · ${first.label}`,
        protocolDay: first.protocolDay,
      };
    }

    // ─── Stats week + month ────────────────────────────────────────────────
    const weekAppointmentsCount =
      myFollowUps.filter((f) => {
        if (f.status !== "scheduled") return false;
        const d = new Date(f.dueDate);
        return d >= startOfWeek && d < endOfWeek;
      }).length +
      myProspects.filter((p) => {
        if (p.status !== "scheduled") return false;
        try {
          const d = new Date(p.rdvDate);
          return d >= startOfWeek && d < endOfWeek;
        } catch {
          return false;
        }
      }).length;

    const monthlyPV = (isAdmin ? pvTransactions : pvTransactions.filter((t) => t.responsibleId === currentUser.id))
      .filter((t) => {
        const d = new Date(t.date);
        return d >= startOfMonth && d < endOfToday;
      })
      .reduce((acc, t) => acc + (t.pv || 0), 0);

    const monthlyPVTarget = hasMetric(currentUser)
      ? (currentUser.monthly_pv_target ?? DEFAULT_MONTHLY_PV_TARGET)
      : DEFAULT_MONTHLY_PV_TARGET;

    const activeClientsCount = myClients.filter(
      (c) => (c.lifecycleStatus ?? "active") === "active",
    ).length;

    const activeClientsDelta = myClients.filter((c) => {
      // Approximation : clients créés ce mois depuis createdAt si dispo.
      const createdAt = (c as unknown as { createdAt?: string }).createdAt;
      if (!createdAt) return false;
      const d = new Date(createdAt);
      return d >= startOfMonth && d < endOfToday;
    }).length;

    const assessmentsThisMonth = myClients.reduce((acc, c) => {
      const monthAssessments = (c.assessments ?? []).filter((a) => {
        const d = new Date(a.date);
        return d >= startOfMonth && d < endOfToday;
      });
      return acc + monthAssessments.length;
    }, 0);
    const conversionRate = conversionRatePercent(assessmentsThisMonth, activeClientsDelta);

    return {
      totalEventsToday: todayAgendaRaw.length + pendingFollowupsRaw.length,
      todayAppointmentsCount: todayAgendaRaw.length,
      todayFollowupsCount: pendingFollowupsRaw.length,
      nextAction,
      todayAgenda,
      todayAgendaMoreCount,
      pendingFollowups,
      pendingFollowupsMoreCount,
      monthlyPV,
      monthlyPVTarget,
      daysLeftInMonth: daysRemainingInMonth(now),
      activeClientsCount,
      activeClientsDelta,
      weekAppointmentsCount,
      conversionRate,
    };
  }, [
    clients,
    followUps,
    prospects,
    pvTransactions,
    followUpProtocolLogs,
    currentUser,
    now,
    globalView,
  ]);
}

function daysFromStepId(stepId: string): number {
  const n = parseInt(stepId.replace(/^j/i, ""), 10);
  return Number.isNaN(n) ? -1 : n;
}

function labelForProtocolDay(day: number): string {
  switch (day) {
    case 1:
      return "Premier shake";
    case 3:
      return "Ressentis";
    case 7:
      return "Bilan semaine";
    case 10:
      return "Ancrage";
    default:
      return "Suivi";
  }
}

function emptyData(now: Date): CopiloteData {
  return {
    totalEventsToday: 0,
    todayAppointmentsCount: 0,
    todayFollowupsCount: 0,
    nextAction: null,
    todayAgenda: [],
    todayAgendaMoreCount: 0,
    pendingFollowups: [],
    pendingFollowupsMoreCount: 0,
    monthlyPV: 0,
    monthlyPVTarget: DEFAULT_MONTHLY_PV_TARGET,
    daysLeftInMonth: daysRemainingInMonth(now),
    activeClientsCount: 0,
    activeClientsDelta: 0,
    weekAppointmentsCount: 0,
    conversionRate: 0,
  };
}
