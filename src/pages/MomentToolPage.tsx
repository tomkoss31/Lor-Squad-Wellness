// =============================================================================
// MomentToolPage — wrapper de route des « outils du moment » (2026-08-06).
//
// Résout la clé d'outil (prop `toolKey` pour les routes nommées comme
// /outils/pare-objections, sinon le param :tool de /outils/moment/:tool) puis
// rend l'écran générique. Clé inconnue → retour à la Boîte à outils.
// =============================================================================

import { Navigate, useParams } from "react-router-dom";
import { MomentToolScreen } from "../components/toolkit/MomentToolScreen";
import { getMomentTool } from "../data/momentTools";

export function MomentToolPage({ toolKey }: { toolKey?: string }) {
  const params = useParams();
  const def = getMomentTool(toolKey ?? params.tool);
  if (!def) return <Navigate to="/formation/boite-a-outils" replace />;
  return <MomentToolScreen def={def} />;
}
