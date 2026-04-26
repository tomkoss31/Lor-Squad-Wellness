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
import { isClientProgramStarted } from "./calculations";

// ─── Garde-fou éligibilité (Hotfix 2026-04-20) ───────────────────────────
// Le protocole est conçu pour le nurturing J+1 → J+10. Au-delà, un client
// sort du cadre "démarrage" et ne doit plus polluer les listes agrégées.

/** Statuts lifecycle qui excluent un client du protocole. */
const INACTIVE_LIFECYCLE_STATUSES = ["stopped", "lost", "paused"] as const;

/** Limite max en jours depuis le bilan initial — au-delà, on coupe. */
export const PROTOCOL_MAX_DAYS_ELIGIBLE = 10;

/** Raisons d'exclusion — utilisé pour afficher "voir pourquoi" sur la fiche. */
export type ProtocolIneligibilityReason =
  | "no_initial_assessment"
  | "too_old" // bilan initial > PROTOCOL_MAX_DAYS_ELIGIBLE jours
  | "lifecycle_inactive" // stopped / lost / paused
  | "not_started" // client pas encore démarré (started=false / lifecycle=not_started)
  | "no_program" // pas de programId ni de selectedProductIds
  | "no_body_scan"; // pas de poids mesuré > 0

export interface ProtocolEligibility {
  eligible: boolean;
  reasons: ProtocolIneligibilityReason[];
}

/**
 * Retourne le détail d'éligibilité d'un client au protocole.
 * Utilisé par la fiche client pour afficher une bande info explicite et
 * par getFollowUpsDue() pour exclure en amont.
 */
export function evaluateProtocolEligibility(
  client: Client,
  options?: { maxDays?: number; now?: Date }
): ProtocolEligibility {
  const maxDays = options?.maxDays ?? PROTOCOL_MAX_DAYS_ELIGIBLE;
  const now = options?.now ?? new Date();
  const reasons: ProtocolIneligibilityReason[] = [];

  // Garde-fou (Chantier "lifecycle primaire", 2026-04-26) :
  // delegue a isClientProgramStarted pour cohérence dans tout le code.
  // Cette fonction donne priorité absolue à lifecycle_status="not_started"
  // (champ manuel coach), ce qui neutralise les flags started/startDate
  // potentiellement faux positifs remplis par le flow bilan initial.
  if (!isClientProgramStarted(client)) {
    reasons.push("not_started");
    return { eligible: false, reasons };
  }

  // Filtre 1 : Date récente
  const initialDate = getInitialAssessmentDate(client);
  const initialAssessment =
    client.assessments?.find((a) => a.type === "initial") ??
    [...(client.assessments ?? [])].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    )[0];

  if (!initialDate || !initialAssessment) {
    reasons.push("no_initial_assessment");
    return { eligible: false, reasons };
  }

  const daysSinceInitial = computeDaysSinceInitial(initialDate, now);
  if (daysSinceInitial < 0 || daysSinceInitial > maxDays) {
    reasons.push("too_old");
  }

  // Filtre 2 : Lifecycle actif
  if (
    client.lifecycleStatus &&
    (INACTIVE_LIFECYCLE_STATUSES as readonly string[]).includes(client.lifecycleStatus)
  ) {
    reasons.push("lifecycle_inactive");
  }

  // Filtre 3 : Programme nutrition
  // Critère OR — on accepte soit un programId officiel, soit au moins 1
  // produit sélectionné dans le questionnaire (le client a démarré la
  // routine via le parcours bilan). Cela couvre les 2 flows existants :
  // (a) le bilan a assigné un programId (parcours "Programme démarré"),
  // (b) le questionnaire a retenu au moins 1 produit (parcours libre).
  const hasProgram = typeof initialAssessment.programId === "string" && initialAssessment.programId.trim().length > 0;
  const productIds = initialAssessment.questionnaire?.selectedProductIds;
  const hasProducts = Array.isArray(productIds) && productIds.length > 0;
  if (!hasProgram && !hasProducts) {
    reasons.push("no_program");
  }

  // Filtre 4 : Body scan avec poids valide
  const weight = initialAssessment.bodyScan?.weight;
  if (typeof weight !== "number" || Number.isNaN(weight) || weight <= 0) {
    reasons.push("no_body_scan");
  }

  return { eligible: reasons.length === 0, reasons };
}

/** Libellé FR pour une raison d'exclusion. */
export function labelForIneligibilityReason(reason: ProtocolIneligibilityReason): string {
  switch (reason) {
    case "no_initial_assessment":
      return "Pas de bilan initial";
    case "too_old":
      return `Bilan initial il y a plus de ${PROTOCOL_MAX_DAYS_ELIGIBLE} jours`;
    case "lifecycle_inactive":
      return "Client inactif (stoppé, perdu ou en pause)";
    case "not_started":
      return "Client pas encore démarré (programme à confirmer)";
    case "no_program":
      return "Pas de programme nutrition assigné";
    case "no_body_scan":
      return "Pas de body scan avec poids mesuré";
  }
}

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

  // Garde-fou éligibilité (Hotfix 2026-04-20) : on ne traite que les étapes
  // J+1 → J+10. J+14 reste disponible dans FOLLOW_UP_PROTOCOL pour le Guide
  // éducatif mais ne doit PAS apparaître dans dashboard/agenda.
  const ACTIVE_STEPS = FOLLOW_UP_PROTOCOL.filter((s) => s.dayOffset <= PROTOCOL_MAX_DAYS_ELIGIBLE);

  for (const client of clients) {
    if (client.distributorId !== currentUserId) continue;

    // Filtres d'éligibilité : trop vieux / inactif / pas de programme /
    // pas de body scan → le client est exclu entièrement des listes agrégées.
    const eligibility = evaluateProtocolEligibility(client, { now });
    if (!eligibility.eligible) continue;

    const initialDate = getInitialAssessmentDate(client);
    if (!initialDate) continue;

    const daysSince = computeDaysSinceInitial(initialDate, now);

    for (const step of ACTIVE_STEPS) {
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
