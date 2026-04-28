// Chantier Refonte Actions premium (2026-04-26).
// Hook qui calcule l'action prioritaire à afficher dans la carte gold
// "À FAIRE MAINTENANT" de l'onglet Actions. Logique descendante — premier
// match gagne.
//
// Ordre de priorité :
//   1. plan_rdv              — aucun RDV futur + dernier contact > 7j OU 1 seul bilan
//   2. complete_initial      — height=0 OU age=0 OU weight premier bilan absent
//   3. send_followup         — protocole 14j avec ≥1 point en retard > 2j (et !free_follow_up)
//   4. request_share_consent — client ≥2 bilans mais !public_share_consent
//   5. ok                    — tout est à jour (fallback teal)

import { useMemo } from "react";
import type { Client, FollowUp } from "../types/domain";
import { RDV_GRACE_PERIOD_MS } from "../lib/timeConstants";
import { isClientProgramStarted } from "../lib/calculations";
import { getClientActiveFollowUp } from "../lib/portfolio";

export type PriorityActionType =
  | "plan_rdv"
  | "complete_initial"
  | "send_followup"
  | "request_share_consent"
  | "ok";

export interface PriorityAction {
  type: PriorityActionType;
  icon: string;
  title: string;
  meta: string;
  ctaLabel: string;
  colorScheme: "gold" | "teal";
}

function daysBetween(a: Date, b: Date): number {
  return Math.floor((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
}

export function computePriorityAction(
  client: Client,
  followUps: FollowUp[],
): PriorityAction {
  const now = new Date();
  const assessmentsCount = client.assessments?.length ?? 0;
  const initialAssessment = client.assessments?.find((a) => a.type === "initial");
  // Garde-fou (Chantier 2026-04-27) : aligne sur evaluateProtocolEligibility.
  // Les cas complete_initial / send_followup / request_share_consent n'ont
  // de sens QUE si le client est démarré. Sinon, le bloc "Action prioritaire"
  // affichait à tort "J+3 · Ressentis" pour des prospects "Programme à
  // confirmer" (cas Ethan Feron). plan_rdv reste actif (légitime de planifier
  // un RDV même pour un client non démarré).
  const isStarted = isClientProgramStarted(client);
  const latestAssessment = [...(client.assessments ?? [])].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  )[0];

  // ─── 1. plan_rdv ─────────────────────────────────────────────────────
  // Chantier RDV grâce (2026-04-27) : un RDV reste "upcoming" jusqu'à
  // 15 min après son heure prévue → empêche le bandeau "Planifier un RDV"
  // d'apparaître alors que le coach est en train de faire le RDV.
  //
  // Fix doublon RDV (2026-04-27) : on délègue à getClientActiveFollowUp
  // qui couvre à la fois les rows réelles `follow_ups` ET le fallback
  // synthétique sur `client.nextFollowUp`. Avant, ce hook ne lisait que
  // les rows → divergence avec la card "PROCHAIN RDV" affichée par
  // ActionsRdvBlock (qui passe par getClientActiveFollowUp). Résultat :
  // un client avec `clients.next_follow_up` renseigné mais aucune row
  // active dans `follow_ups` voyait le bandeau "Planifier un RDV"
  // s'afficher EN MÊME TEMPS que la card "PROCHAIN RDV demain".
  const active = getClientActiveFollowUp(client, followUps);
  const upcomingRdv =
    active && new Date(active.dueDate).getTime() + RDV_GRACE_PERIOD_MS > now.getTime()
      ? active
      : null;

  const lastContactDate = latestAssessment?.date
    ? new Date(latestAssessment.date)
    : null;
  const daysSinceContact = lastContactDate ? daysBetween(lastContactDate, now) : 999;

  if (!upcomingRdv && (daysSinceContact > 7 || assessmentsCount === 1)) {
    return {
      type: "plan_rdv",
      icon: "📅",
      title: "Planifier un rendez-vous",
      meta:
        assessmentsCount === 0
          ? "Aucun RDV programmé · dossier vide"
          : `Aucun RDV programmé · dernier contact il y a ${daysSinceContact} j`,
      ctaLabel: "Planifier →",
      colorScheme: "gold",
    };
  }

  // ─── 2. complete_initial ─────────────────────────────────────────────
  const missingFields: string[] = [];
  if (!client.age || client.age === 0) missingFields.push("âge");
  if (!client.height || client.height === 0) missingFields.push("taille");
  if (!initialAssessment?.bodyScan?.weight || initialAssessment.bodyScan.weight === 0) {
    missingFields.push("poids initial");
  }
  if (isStarted && missingFields.length > 0) {
    return {
      type: "complete_initial",
      icon: "⚠️",
      title: "Compléter le bilan de départ",
      meta: `Champs manquants : ${missingFields.join(", ")}`,
      ctaLabel: "Compléter →",
      colorScheme: "gold",
    };
  }

  // ─── 3. send_followup ────────────────────────────────────────────────
  // Points clés protocole : J+1 (message bienvenue), J+3 (ressentis),
  // J+7 (VIP), J+10 (check-in énergie), J+14 (RDV confirmation).
  //
  // Fix 2026-04-27 : ancre alignée sur `initialAssessment.date` (même ancre
  // que `followUpProtocolScheduler.getInitialAssessmentDate`). Avant,
  // `client.startDate` était utilisé, mais ce champ n'est rempli que quand
  // le coach coche "démarre maintenant" dans le bilan initial. Résultat :
  // pour un client avec un bilan mais sans cette coche, le scheduler
  // détectait J+X (via assessment.date) alors que ce hook sautait la
  // branche send_followup → incohérence dashboard Co-pilote ↔ fiche.
  const startAnchorDate = initialAssessment?.date ?? client.startDate;
  if (isStarted && !client.freeFollowUp && startAnchorDate) {
    const startDate = new Date(startAnchorDate);
    const daysSinceStart = daysBetween(startDate, now);
    const checkpoints = [1, 3, 7, 10, 14];
    const overduePoints = checkpoints.filter((day) => daysSinceStart > day + 2);
    // Simplifié : on affiche si ≥1 checkpoint est dépassé de > 2j et qu'on a
    // un startDate — le suivi détaillé est dans l'onglet Vue complète.
    if (overduePoints.length > 0 && daysSinceStart <= 20) {
      return {
        type: "send_followup",
        icon: "⏰",
        title: "Envoyer les messages de suivi",
        meta: `${overduePoints.length} point${overduePoints.length > 1 ? "s" : ""} de contact en retard`,
        ctaLabel: "Voir →",
        colorScheme: "gold",
      };
    }
  }

  // ─── 4. request_share_consent ────────────────────────────────────────
  if (isStarted && !client.publicShareConsent && assessmentsCount >= 2) {
    return {
      type: "request_share_consent",
      icon: "📤",
      title: "Demander l'accord de partage public",
      meta: `Client avec ${assessmentsCount} bilans · transformation partageable`,
      ctaLabel: "Demander →",
      colorScheme: "gold",
    };
  }

  // ─── 5. fallback ok ──────────────────────────────────────────────────
  return {
    type: "ok",
    icon: "✓",
    title: "Tout est à jour",
    meta: "Aucune action urgente sur ce dossier",
    ctaLabel: "Voir le programme →",
    colorScheme: "teal",
  };
}

export function useClientPriorityAction(
  client: Client,
  followUps: FollowUp[],
): PriorityAction {
  return useMemo(() => computePriorityAction(client, followUps), [client, followUps]);
}
