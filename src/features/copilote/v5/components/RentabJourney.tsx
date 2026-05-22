// =============================================================================
// RentabJourney — Phase D Co-pilote V5
//
// REFONTE V2 (2026-05-20, validée Thomas) :
// Widget HORIZONTAL "Tu gagnes X €" + jauge à droite avec marker
// projection. Click "Voir détail" navigate vers /rentabilite.
//
// La WalletCard (Apple Wallet style) est conservée mais déplacée en
// petit format sur la page /rentabilite (rappel visuel).
// =============================================================================

import { RentabilityHorizontalWidget } from "../../../../components/rentability/RentabilityHorizontalWidget";
import { RentabilityTeamLeaderboard } from "../../../../components/rentability/RentabilityTeamLeaderboard";

export function RentabJourney() {
  return (
    <section data-v5-rentab-journey style={{ padding: "16px 0" }}>
      <RentabilityHorizontalWidget />
      {/* Leaderboard team (admin only — chantier #10 polish 2026-05-22).
          Affiché sous le widget perso pour motivation/visibilité d'ensemble. */}
      <RentabilityTeamLeaderboard />
    </section>
  );
}
