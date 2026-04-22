// Chantier Refonte Navigation (2026-04-22) — placeholder commit 1, étoffé
// au commit suivant. Pour l'instant, renvoie vers le Dashboard existant
// pour garantir qu'aucune page 404 n'apparaît pendant la refonte.

import { DashboardPage } from "./DashboardPage";

export function CoPilotePage() {
  // Temporaire : l'ancien dashboard fait le job le temps que la nouvelle
  // home soit créée au commit suivant. Pas de redirect — on reste sur
  // /co-pilote pour que la sidebar le marque actif.
  return <DashboardPage />;
}
