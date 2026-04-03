export type PvStatus =
  | "ok"
  | "watch"
  | "restock"
  | "inconsistent"
  | "follow-up";

export type PvTransactionType = "commande" | "reprise-sur-place";

export type PvProductStatus = "ok" | "watch" | "restock" | "inconsistent";

export interface PvProgramOption {
  id: string;
  title: string;
  alias?: string[];
  summary: string;
  pricePublic: number;
  includedProductIds: string[];
  mainReferenceDurationDays: number;
  active: boolean;
}

export interface PvProductCatalogItem {
  id: string;
  name: string;
  category: string;
  pricePublic: number;
  pv: number;
  quantiteLabel: string;
  dureeReferenceJours: number;
  noteMetier?: string;
  recommendedProgram: string;
  active: boolean;
}

export interface PvClientProductRecord {
  id: string;
  clientId: string;
  responsibleId: string;
  responsibleName: string;
  programId: string;
  productId: string;
  productName: string;
  quantityStart: number;
  startDate: string;
  durationReferenceDays: number;
  pvPerUnit: number;
  pricePublicPerUnit: number;
  quantiteLabel: string;
  noteMetier?: string;
  active: boolean;
}

export interface PvProductUsage {
  id: string;
  recordId: string;
  programId: string;
  productId: string;
  productName: string;
  quantityStart: number;
  startDate: string;
  durationReferenceDays: number;
  estimatedRemainingDays: number;
  nextProbableOrderDate: string;
  pvPerUnit: number;
  pricePublicPerUnit: number;
  quantiteLabel: string;
  noteMetier?: string;
  status: PvProductStatus;
}

export interface PvClientTransaction {
  id: string;
  date: string;
  clientId: string;
  clientName: string;
  responsibleId: string;
  responsibleName: string;
  productId: string;
  productName: string;
  quantity: number;
  pv: number;
  price: number;
  type: PvTransactionType;
  note: string;
}

export interface PvClientTrackingRecord {
  clientId: string;
  clientName: string;
  responsibleId: string;
  responsibleName: string;
  programId: string;
  program: string;
  status: PvStatus;
  startDate: string;
  lastFollowUpDate: string;
  lastOrderDate: string;
  daysSinceStart: number;
  estimatedRemainingDays: number;
  nextProbableOrderDate: string;
  pvCumulative: number;
  monthlyPv: number;
  activeProducts: PvProductUsage[];
  transactions: PvClientTransaction[];
}
