// =============================================================================
// CoPiloteDispatcher — aiguille /co-pilote vers l'environnement BBC ou classic
// (chantier BBC Lot 1, 2026-07-24).
//
// - Coach classic : rend `classic` (le Co-pilote V5) à l'identique → zéro régression.
// - Coach BBC (club_model='bbc') : rend la coquille BBC.
// - Admin : pastille d'aperçu Classic/BBC (localStorage) pour la recette.
//
// Le Co-pilote V5 est passé en prop `classic` (élément déjà créé dans App.tsx)
// pour ne PAS le charger quand on est en BBC, et éviter tout import inutilisé.
// =============================================================================

import type { ReactNode } from "react";
import { useAppContext } from "../../context/AppContext";
import { useBbcMode } from "./useBbcMode";
import { BbcModeSwitch } from "./BbcModeSwitch";
import { BbcCoPilotePage } from "./BbcCoPilotePage";

interface CoPiloteDispatcherProps {
  classic: ReactNode;
}

export function CoPiloteDispatcher({ classic }: CoPiloteDispatcherProps) {
  const { currentUser } = useAppContext();
  const isAdmin = currentUser?.role === "admin";
  const bbc = useBbcMode(currentUser?.id, isAdmin);

  return (
    <>
      {isAdmin && (
        <BbcModeSwitch value={bbc.isBbc ? "bbc" : "classic"} onChange={(v) => bbc.setPreview(v)} />
      )}
      {bbc.isBbc ? (
        <BbcCoPilotePage club={bbc.activeClub} coachName={currentUser?.name} />
      ) : (
        classic
      )}
    </>
  );
}
