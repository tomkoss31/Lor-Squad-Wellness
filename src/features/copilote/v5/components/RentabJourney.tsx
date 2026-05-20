// =============================================================================
// RentabJourney — Phase D Co-pilote V5
//
// REFONTE 2026-05-20 (Chantier Rentabilité Premium V2) :
// Le widget devient la WalletCard premium (carte Apple Wallet dark
// cinematic avec flip 3D). L'ancien parcours horizontal est conservé
// dans `RentabJourney.legacy.tsx` au cas où Thomas voudrait revenir.
//
// Pour rollback rapide : remplacer le contenu de ce fichier par celui
// de `RentabJourney.legacy.tsx`.
// =============================================================================

import { RentabilityWalletCard } from "../../../../components/rentability/RentabilityWalletCard";

export function RentabJourney() {
  return (
    <section
      data-v5-rentab-journey
      style={{
        padding: "16px 4px",
        display: "flex",
        justifyContent: "center",
      }}
    >
      {/* interaction="navigate" : click sur la carte = ouvre /rentabilite
          (puisqu'on est sur Co-pilote, la carte est un widget aperçu).
          Le flip 3D est dispo sur la page rentabilité hero. */}
      <RentabilityWalletCard interaction="navigate" />
    </section>
  );
}
