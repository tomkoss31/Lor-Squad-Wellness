// =============================================================================
// useMaintenant — l'heure courante, VIVANTE (18/09/2026).
//
// Le club tourne sur une tablette au comptoir et sur le téléphone de la coach :
// l'app reste ouverte des heures, souvent toute la nuit. Or `Date.now()` lu au
// montage ne bouge plus. Conséquences vues en production le 18/09 :
//   · « TON PROCHAIN RENDEZ-VOUS » montrait un rendez-vous de 14 h 30 à 16 h 51 ;
//   · le lendemain matin, « Le matin » et L'agenda affichaient encore la veille.
//
// Un battement d'une minute, plus un rattrapage quand l'onglet revient au
// premier plan (iOS gèle les minuteurs d'un onglet caché : au réveil, le
// premier battement peut avoir des heures de retard).
// =============================================================================

import { useEffect, useState } from "react";

export function useMaintenant(periodeMs = 60_000): number {
  const [maintenant, setMaintenant] = useState(() => Date.now());
  useEffect(() => {
    const battre = () => setMaintenant(Date.now());
    const minuteur = window.setInterval(battre, periodeMs);
    const auReveil = () => {
      if (!document.hidden) battre();
    };
    document.addEventListener("visibilitychange", auReveil);
    window.addEventListener("focus", battre);
    return () => {
      window.clearInterval(minuteur);
      document.removeEventListener("visibilitychange", auReveil);
      window.removeEventListener("focus", battre);
    };
  }, [periodeMs]);
  return maintenant;
}
