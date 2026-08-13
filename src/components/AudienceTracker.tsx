// =============================================================================
// AudienceTracker — le SEUL endroit qui déclenche la mesure d'audience.
//
// Monté une fois dans le routeur, il voit passer toutes les navigations. Ce
// choix est délibéré : brancher la mesure page par page garantissait qu'on en
// oublie (les pages du club n'utilisent même pas `PublicShell`), et qu'une
// page ajoutée demain sorte des radars sans que personne ne le remarque.
//
// Il ne rend rien. Il ne mesure QUE les chemins publics reconnus — l'app
// coach ne produit aucune ligne (cf. `motifDe`, qui rend `null` ailleurs).
// =============================================================================

import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { demarrerAudience, noterPage } from "../lib/audience";

export function AudienceTracker() {
  const { pathname } = useLocation();

  useEffect(() => {
    demarrerAudience();
  }, []);

  useEffect(() => {
    noterPage(pathname);
  }, [pathname]);

  return null;
}
