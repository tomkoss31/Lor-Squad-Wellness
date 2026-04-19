export type UserRole = "admin" | "referent" | "distributor";

// ─── Lifecycle status (Matrice B — Chantier 1) ──────────────────────────
export type LifecycleStatus =
  | "active"
  | "not_started"
  | "paused"
  | "stopped"
  | "lost";

export const LIFECYCLE_LABELS: Record<LifecycleStatus, string> = {
  active: "Actif",
  not_started: "Pas démarré",
  paused: "En pause",
  stopped: "Arrêté",
  lost: "Perdu",
};

export const LIFECYCLE_TONES: Record<LifecycleStatus, "teal" | "gold" | "muted" | "coral"> = {
  active: "teal",
  not_started: "gold",
  paused: "muted",
  stopped: "coral",
  lost: "coral",
};

export const isDeadLifecycle = (s: LifecycleStatus): boolean =>
  s === "stopped" || s === "lost";

export const isActiveLifecycle = (s: LifecycleStatus): boolean =>
  s === "active" || s === "not_started" || s === "paused";

// ─── Étape 13 du bilan — choix structurés ───────────────────────────────
export type DecisionClient = "partant" | "a_rassurer" | "a_confirmer";
export type TypeDeSuite = "rdv_fixe" | "message_rappel" | "relance_douce";
export type MessageALaisser = "simple" | "progressif" | "cadre_clair";

// ─── Petit-déjeuner story (Chantier 6) ─────────────────────────────────
export interface BreakfastAnalysis {
  sucres: number;       // 0-100
  proteines: number;    // 0-100
  hydratation: number;  // 0-100
  fibres: number;       // 0-100
}

export type Objective = "weight-loss" | "sport";

export type ProgramCategory = "weight-loss" | "sport";

export type AssessmentType = "initial" | "follow-up";

export type BiologicalSex = "female" | "male";

export interface RecommendationLead {
  name: string;
  contact: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  mockPassword?: string;
  role: UserRole;
  sponsorId?: string;
  sponsorName?: string;
  active: boolean;
  title: string;
  phone?: string;
  telegram?: string;
  createdAt?: string;
  lastAccessAt?: string;
}

export interface AuthSession {
  userId: string;
  role: UserRole;
  authMode: "mock" | "supabase";
  issuedAt: string;
  accessScope: "all-clients" | "team-clients" | "owned-clients";
}

export interface BodyScanMetrics {
  weight: number;
  bodyFat: number;
  muscleMass: number;
  hydration: number;
  boneMass: number;
  visceralFat: number;
  bmr: number;
  metabolicAge: number;
}

export interface AssessmentQuestionnaire {
  referredByName?: string;
  currentClothingSize?: string;
  targetClothingSize?: string;
  optionalProductsUsed?: string;
  detectedNeedIds?: string[];
  selectedProductIds?: string[];
  healthStatus: string;
  healthNotes: string;
  allergies: string;
  transitStatus: string;
  pathologyContext: string;
  wakeUpTime: string;
  bedTime: string;
  sleepHours: number;
  sleepQuality: string;
  napFrequency: string;
  breakfastFrequency: string;
  breakfastTime: string;
  breakfastContent: string;
  breakfastSatiety: string;
  firstMealTime: string;
  mealsPerDay: number;
  regularMealTimes: string;
  lunchLocation: string;
  dinnerTiming: string;
  vegetablesDaily: string;
  proteinEachMeal: string;
  sugaryProducts: string;
  snackingFrequency: string;
  snackingMoment: string;
  cravingsPreference: string;
  snackingTrigger: string;
  waterIntake: number;
  drinksCoffee: string;
  coffeePerDay: number;
  sweetDrinks: string;
  alcohol: string;
  lunchExample: string;
  dinnerExample: string;
  physicalActivity: string;
  activityType: string;
  sessionsPerWeek: number;
  energyLevel: string;
  pastAttempts: string;
  hardestPart: string;
  mainBlocker: string;
  objectiveFocus: string;
  targetWeight?: number;
  motivation: number;
  desiredTimeline: string;
  recommendations: RecommendationLead[];
  recommendationsContacted: boolean;
  // Étape 9 story petit-déjeuner (Chantier 6)
  breakfastAnalysis?: BreakfastAnalysis;
}

export interface AssessmentRecord {
  id: string;
  date: string;
  type: AssessmentType;
  objective: Objective;
  programId?: string;
  programTitle: string;
  summary: string;
  notes: string;
  nextFollowUp?: string;
  bodyScan: BodyScanMetrics;
  questionnaire: AssessmentQuestionnaire;
  pedagogicalFocus: string[];
  // Étape 13 du bilan (Chantier 1)
  decisionClient?: DecisionClient | null;
  typeDeSuite?: TypeDeSuite | null;
  messageALaisser?: MessageALaisser | null;
}

export interface Client {
  id: string;
  firstName: string;
  lastName: string;
  sex: BiologicalSex;
  phone: string;
  email: string;
  age: number;
  height: number;
  job: string;
  city?: string;
  distributorId: string;
  distributorName: string;
  status: "active" | "pending" | "follow-up";
  objective: Objective;
  currentProgram: string;
  pvProgramId?: string;
  started: boolean;
  startDate?: string;
  nextFollowUp: string;
  notes: string;
  assessments: AssessmentRecord[];
  // Lifecycle (Chantier 1 — Matrice B)
  lifecycleStatus?: LifecycleStatus;
  isFragile?: boolean;
  lifecycleUpdatedAt?: string;
  lifecycleUpdatedBy?: string | null;
  // Suivi libre (Sujet C — 2026-04-19) : client actif mais hors agenda auto
  freeFollowUp?: boolean;
}

export interface FollowUp {
  id: string;
  clientId: string;
  clientName: string;
  dueDate: string;
  type: string;
  status: "scheduled" | "pending" | "completed" | "dismissed" | "inactive";
  programTitle: string;
  lastAssessmentDate: string;
}

export type ActivityLogAction =
  | "user-created"
  | "user-updated"
  | "user-status-updated"
  | "client-created"
  | "client-reassigned"
  | "client-deleted"
  | "assessment-created"
  | "assessment-updated"
  | "schedule-updated";

export interface ActivityLog {
  id: string;
  createdAt: string;
  action: ActivityLogAction;
  actorId: string;
  actorName: string;
  ownerUserId?: string;
  clientId?: string;
  clientName?: string;
  targetUserId?: string;
  targetUserName?: string;
  summary: string;
  detail?: string;
}

export interface ClientMessage {
  id: string;
  report_token?: string;
  client_id: string;
  client_name: string;
  distributor_id: string;
  message_type: 'product_request' | 'recommendation' | 'general';
  product_name?: string;
  message?: string;
  client_contact?: string;
  read: boolean;
  created_at: string;
}

export interface Program {
  id: string;
  title: string;
  category: ProgramCategory;
  kind?: "main" | "booster";
  price: string;
  summary: string;
  benefits: string[];
  composition?: string[];
  previewImage?: string;
  previewPosition?: string;
  note?: string;
  accent: "blue" | "green" | "red";
  badge: string;
}

export interface VisualCardContent {
  id: string;
  title: string;
  description: string;
  kind: "info" | "comparison" | "routine" | "focus";
  points: string[];
  accent: "blue" | "green" | "red";
}

export interface BodyScanDelta {
  weight: number;
  bodyFat: number;
  muscleMass: number;
  hydration: number;
  boneMass: number;
  visceralFat: number;
  bmr: number;
  metabolicAge: number;
}

export interface WeightLossPlan {
  targetWeight: number | null;
  remainingKg: number;
  dailyGrams: number;
  isAchieved: boolean;
  days: number;
}

export interface WeightLossPaceInsight {
  label: string;
  description: string;
  tone: "blue" | "green" | "amber" | "red";
}
