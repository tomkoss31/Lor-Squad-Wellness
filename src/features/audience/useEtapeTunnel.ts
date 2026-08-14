// =============================================================================
// useEtapeTunnel — poser une étape de tunnel depuis une page, en une ligne.
//
// Les quatre tunnels publics (bilan en ligne, réserver au club, rejoindre
// l'équipe, colis) comptent leurs étapes différemment : un `step` numérique,
// un nom d'écran, une liste dynamique. Ce hook absorbe cette diversité pour
// que chaque page n'ait qu'à dire « je suis à telle étape ».
//
// Le rang fige l'ordre d'affichage de l'entonnoir : il ne doit JAMAIS changer
// pour une étape existante, sinon l'historique se réordonne tout seul et les
// chutes calculées deviennent fausses. Ajouter une étape au milieu du tunnel
// demande donc de renuméroter volontairement — et d'accepter que l'avant et
// l'après ne soient plus comparables.
// =============================================================================

import { useEffect } from "react";
import { noterEtape } from "../../lib/audience";

/**
 * @param tunnel  clé stable du tunnel (`bilan`, `reserver-club`, …)
 * @param etape   étape ATTEINTE, ou `null` quand il n'y a rien à noter
 * @param rang    position dans l'entonnoir, figée dans le temps
 */
export function useEtapeTunnel(tunnel: string, etape: string | null, rang: number): void {
  useEffect(() => {
    if (!etape) return;
    noterEtape(tunnel, etape, rang);
    // `noterEtape` déduplique par session : repasser par une étape déjà vue
    // ne recompte pas la personne.
  }, [tunnel, etape, rang]);
}
