export type PvStatus =
  | "ok"
  | "watch"
  | "restock"
  | "inconsistent"
  | "follow-up";

export type PvTransactionType = "commande" | "reprise-sur-place";

export interface PvProgramOption {
  id: string;
  title: string;
  summary: string;
}

export interface PvProductCatalogItem {
  id: string;
  name: string;
  category: string;
  pv: number;
  price: number;
  estimatedDurationDays: number;
  recommendedProgram: string;
}

export interface PvProductUsage {
  id: string;
  productId: string;
  productName: string;
  quantityStart: number;
  startDate: string;
  estimatedDurationDays: number;
  estimatedRemainingDays: number;
  nextProbableOrderDate: string;
  pvPerUnit: number;
  pricePerUnit: number;
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
