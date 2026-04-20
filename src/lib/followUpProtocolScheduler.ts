// Chantier Protocole dans Agenda + Dashboard (2026-04-20)
// Helper partagé : calcule quels suivis du protocole sont dus/en retard
// pour un coach donné, à partir de ses clients et des logs déjà enregistrés.
//
// Règles métier :
// - Un client doit avoir un bilan initial (type === "initial" OU fallback
//   le plus ancien par date) pour avoir des suivis calculés.
// - Les clients avec lifecycle "stopped" ou "lost" sont exclus.
// - Les clients `freePvTracking === true` sont INCLUS (le suivi est
//   indépendant du tracking PV).
// - Les étapes déjà loggées dans follow_up_protocol_log pour ce client
//   sont exclues.
// - Scope : on ne regarde QUE les clients du coach courant (distributorId
//   === currentUserId). L'admin n'a pas de vue "équipe" sur ce widget.

import type { Client, FollowUpProtocolLog, FollowUpProtocolStepId } from "../types/domain";
import { FOLLOW_UP_PROTOCOL } from "../data/followUpProtocol";

export type FollowUpDueStatus =
  | "overdue_more" // en retard de 2+ jours
  | "overdue_1d" // en retard d'1 jour
  | "due_today" // à envoyer aujourd'hui
  | "upcoming"; // à venir (option)

export interface FollowUpDueItem {
  client: Client;
  stepId: FollowUpProtocolStepId;
  stepTitle: string;
  stepShortTitle: string;
  stepIconEmoji: string;
  dayOffset: number;
  /** Date ciblée pour l'envoi (initialAssessmentDate + dayOffset). */
  dueDate: Date;
  status: FollowUpDueStatus;
  /** 0 si today, 1 si overdue_1d, 2+ si overdue_more. Négatif si upcoming. */
  daysLate: number;
}

export interface GetFollowUpsDueOptions {
  includeUpcoming?: boolean;
  /** Horizon en jours pour les "à venir" (défaut : 14 — couvre J+14). */
  maxDaysUpcoming?: number;
  /** Override de "maintenant" pour tests / stabilisation mémo. */
  now?: Date;
}

export function getInitialAssessmentDate(client: Client): Date | null {
  const initial =
    client.assessments?.find((a) => a.type === "initial") ??
    [...(client.assessments ?? [])].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    )[0];
  if (!initial) return null;
  const d = new Date(initial.date);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Nombre de jours entiers depuis le bilan initial (basé sur le jour calendaire). */
export function computeDaysSinceInitial(initialDate: Date, today: Date = new Date()): number {
  const startInitial = new Date(initialDate);
  startInitial.setHours(0, 0, 0, 0);
  const startToday = new Date(today);
  startToday.setHours(0, 0, 0, 0);
  const diffMs = startToday.getTime() - startInitial.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Retourne les items de suivi dus pour un coach.
 * - Par défaut : seulement due_today + overdue_1d + overdue_more.
 * - Si `includeUpcoming`, inclut les étapes à venir jusqu'à `maxDaysUpcoming`.
 *
 * Tri : `overdue_more` → `overdue_1d` → `due_today` → `upcoming`,
 * puis par dueDate ascendante (les plus urgents d'abord).
 */
export function getFollowUpsDue(
  clients: Client[],
  currentUserId: string,
  protocolLogs: FollowUpProtocolLog[],
  options: GetFollowUpsDueOptions = {}
): FollowUpDueItem[] {
  const { includeUpcoming = false, maxDaysUpcoming = 14, now = new Date() } = options;
  const items: FollowUpDueItem[] = [];

  // Index logs par (clientId, stepId) pour un lookup O(1).
  const logKey = (clientId: string, stepId: FollowUpProtocolStepId) => `${clientId}::${stepId}`;
  const loggedSteps = new Set(protocolLogs.map((l) => logKey(l.clientId, l.stepId)));

  for (const client of clients) {
    if (client.distributorId !== currentUserId) continue;
    if (client.lifecycleStatus === "stopped" || client.lifecycleStatus === "lost") continue;

    const initialDate = getInitialAssessmentDate(client);
    if (!initialDate) continue;

    const daysSince = computeDaysSinceInitial(initialDate, now);

    for (const step of FOLLOW_UP_PROTOCOL) {
      if (loggedSteps.has(logKey(client.id, step.id))) continue;

      const daysLate = daysSince - step.dayOffset;
      let status: FollowUpDueStatus | null = null;
      if (daysLate === 0) status = "due_today";
      else if (daysLate === 1) status = "overdue_1d";
      else if (daysLate >= 2) status = "overdue_more";
      else if (includeUpcoming && daysLate < 0 && Math.abs(daysLate) <= maxDaysUpcoming) {
        status = "upcoming";
      }
      if (!status) continue;

      const dueDate = new Date(initialDate);
      dueDate.setDate(dueDate.getDate() + step.dayOffset);

      items.push({
        client,
        stepId: step.id,
        stepTitle: step.title,
        stepShortTitle: step.shortTitle,
        stepIconEmoji: step.iconEmoji,
        dayOffset: step.dayOffset,
        dueDate,
        status,
        daysLate,
      });
    }
  }

  // Tri priorité : retards d'abord, puis today, puis upcoming.
  const statusRank: Record<FollowUpDueStatus, number> = {
    overdue_more: 0,
    overdue_1d: 1,
    due_today: 2,
    upcoming: 3,
  };
  items.sort((a, b) => {
    const sr = statusRank[a.status] - statusRank[b.status];
    if (sr !== 0) return sr;
    return a.dueDate.getTime() - b.dueDate.getTime();
  });

  return items;
}

/** Regroupement par catégorie temporelle pour l'onglet Suivis (Agenda). */
export type FollowUpDueBucket = "aujourdhui" | "demain" | "semaine" | "avenir" | "retard";

export function bucketForDueItem(item: FollowUpDueItem): FollowUpDueBucket {
  if (item.status === "overdue_1d" || item.status === "overdue_more") return "retard";
  if (item.status === "due_today") return "aujourdhui";
  if (item.status === "upcoming") {
    if (item.daysLate === -1) return "demain";
    if (item.daysLate >= -7) return "semaine";
    return "avenir";
  }
  return "avenir";
}
