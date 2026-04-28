// =============================================================================
// VipProgramTab — onglet Paramètres "Programme VIP" pour les coachs
// =============================================================================
//
// Wrapper léger autour du composant partagé VipProgramDoc (qui est aussi
// utilisé par la modale d'aide depuis la fiche client).
// =============================================================================

import { VipProgramDoc } from "../../features/client-vip/VipProgramDoc";

export function VipProgramTab() {
  return <VipProgramDoc />;
}
