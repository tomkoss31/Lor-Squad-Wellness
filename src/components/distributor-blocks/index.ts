// =============================================================================
// distributor-blocks — exports partages entre TeamMemberDrilldownModal
// et la page enrichie /distributors/:id (Chantier #13, 2026-05-18).
// =============================================================================

export { EngagementTotalBlock } from "./EngagementTotalBlock";
export { ApprentissageBlock } from "./ApprentissageBlock";
export { ActiviteRecenteBlock } from "./ActiviteRecenteBlock";
export { EngagementBlock } from "./EngagementBlock";
export { RangHerbalifeBlock } from "./RangHerbalifeBlock";
export { ProgressionRangBlock } from "./ProgressionRangBlock";
export { PvBizworksBlock } from "./PvBizworksBlock";
export { CompteActifBlock } from "./CompteActifBlock";

// Primitives partagees (utilisable si la page veut composer manuellement)
export {
  SectionTitle,
  BreakdownRow,
  MetricCard,
  PvTierRow,
  PrimaryActionButton,
  AdminCard,
  formatRelativeFR,
  twoColGridStyle,
  threeColGridStyle,
} from "./_shared";
