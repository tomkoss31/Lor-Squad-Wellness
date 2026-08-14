// =============================================================================
// AudienceTracker — le SEUL endroit qui déclenche la mesure d'audience.
//
// Monté une fois dans le routeur, il voit passer toutes les navigations. Ce
// choix est délibéré : brancher la mesure page par page garantissait qu'on en
// oublie (les pages du club n'utilisent même pas `PublicShell`), et qu'une
// page ajoutée demain sorte des radars sans que personne ne le remarque.
//
// Même raisonnement pour les clics : plutôt que d'aller marquer chaque bouton
// à la main — donc en oublier, et casser l'historique dès qu'un libellé est
// réécrit — on écoute au niveau du document et on note « d'où vers où ». Les
// deux moitiés sont des motifs de la liste blanche, donc le nombre de clés
// possibles est borné par le code.
//
// Il ne rend rien. Il ne mesure QUE les chemins publics reconnus — l'app
// coach ne produit aucune ligne.
// =============================================================================

import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { demarrerAudience, noterClic, noterPage } from "../lib/audience";

export function AudienceTracker() {
  const { pathname } = useLocation();

  useEffect(() => {
    demarrerAudience();
  }, []);

  useEffect(() => {
    noterPage(pathname);
  }, [pathname]);

  useEffect(() => {
    const auClic = (e: MouseEvent) => {
      // `composedPath` plutôt que `e.target` : on clique presque toujours sur
      // un <span> ou une <img> À L'INTÉRIEUR du lien, jamais sur le lien
      // lui-même. Sans ça, la quasi-totalité des clics seraient manqués.
      const lien = e
        .composedPath()
        .find((n): n is HTMLAnchorElement => n instanceof HTMLAnchorElement && !!n.getAttribute("href"));
      if (!lien) return;

      const href = lien.getAttribute("href") ?? "";
      // Liens externes, ancres, mailto/tel : hors périmètre.
      if (!href.startsWith("/")) return;

      noterClic(pathname, href);
    };

    // En phase de CAPTURE : un `onClick` de React qui appelle
    // `stopPropagation` (fréquent sur les cartes cliquables) empêcherait
    // l'écouteur de bouillonnement de voir quoi que ce soit.
    document.addEventListener("click", auClic, { capture: true });
    return () => document.removeEventListener("click", auClic, { capture: true });
  }, [pathname]);

  return null;
}
