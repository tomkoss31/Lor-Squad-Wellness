// Chantier RDV grâce 15 min (2026-04-27).
// Constantes temporelles partagées (front uniquement).

/**
 * Période de grâce après l'heure prévue d'un RDV.
 *
 * Pendant ces 15 minutes, le RDV reste considéré comme "à venir / en cours"
 * partout dans l'app coach :
 *  - hero "prochain RDV" du dashboard Co-pilote
 *  - cas plan_rdv du hook useClientPriorityAction
 *
 * Au-delà de la grâce, le comportement actuel reprend (RDV considéré comme
 * passé, le bandeau "Planifier un RDV" peut redevenir visible).
 *
 * Usage type :
 *   const isUpcomingOrInProgress =
 *     scheduledTs + RDV_GRACE_PERIOD_MS > Date.now();
 */
export const RDV_GRACE_PERIOD_MS = 15 * 60 * 1000;
