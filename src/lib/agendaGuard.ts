// =============================================================================
// agendaGuard — garde-fou disponibilité RDV (chantier 2026-06-04)
//
// Brique partagée par TOUS les flux de prise de RDV (bilan, suivi, agenda…).
// Vérifie qu'aucun RDV n'occupe déjà le créneau (±30 min) et, le cas échéant,
// demande confirmation au coach. UX validée Thomas : « avertir + autoriser »
// (on prévient mais on n'interdit pas — certains doublons sont volontaires).
//
// ⚠️ À n'appeler QUE lorsqu'un RDV concret est réellement saisi par le coach
// (jamais sur une date auto-suggérée ou un type de suite sans créneau, sinon
// alerte inutile — cf. demande Thomas).
// =============================================================================

import { checkAgendaConflict } from "../services/supabaseService";

/**
 * @returns `true` s'il faut PROCÉDER (pas de conflit, ou override confirmé),
 *          `false` si le coach annule pour changer l'heure.
 */
export async function confirmNoAgendaConflict(
  coachUserId: string | null | undefined,
  dueDateIso: string | null | undefined,
  excludeFollowUpId?: string | null,
  excludeProspectId?: string | null,
): Promise<boolean> {
  if (!coachUserId || !dueDateIso) return true;
  try {
    const conflict = await checkAgendaConflict(
      coachUserId,
      dueDateIso,
      excludeFollowUpId,
      excludeProspectId,
    );
    if (!conflict) return true;
    const when = new Date(conflict.dueDate).toLocaleString("fr-FR", {
      weekday: "short",
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
    return window.confirm(
      `⚠️ Créneau déjà pris\n\nTu as déjà un RDV avec ${conflict.clientName} le ${when}.\n\nPlanifier quand même ?`,
    );
  } catch (e) {
    // Jamais bloquer une validation sur une erreur réseau du check.
    console.warn("[agendaGuard] conflict check failed:", e);
    return true;
  }
}
