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
export type TypeDeSuite = "rdv_fixe" | "message_rappel" | "relance_douce" | "suivi_libre";
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
  // Chantier bilan updates (2026-04-20)
  /** Si objectiveFocus === "Autre", texte libre saisi par le client. */
  customGoal?: string;
  /** Nombre de snacks / fast-food / restos par semaine (budget alimentation). */
  snacksFastFoodPerWeek?: number | null;
  /** Saveur de Formula 1 choisie lors de la dégustation (étape dédiée). */
  preferredFlavor?: string;
  // Chantier refonte étape 11 (2026-04-20)
  /** Consommation de lait (animal ou végétal) — oriente le distri sur PDM. */
  consumesMilk?: "yes" | "sometimes" | "no";
  /** Programme choisi par le client dans le tunnel de vente étape 11. */
  programChoice?: "discovery" | "premium" | "booster1" | "booster2";
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
  // Free PV tracking (2026-04-20) : client sous un autre superviseur, exclu
  // des listes de réassort (dashboard, suivi PV, alertes). Le reste (bilans,
  // RDV, body scan, messages) reste normal.
  freePvTracking?: boolean;
  // Chantier bilan updates (2026-04-20) : note libre "À savoir sur ce client"
  // (loisirs, préférences, anecdotes — cheval, piscine, Mars, etc.).
  // Distinct du champ notes qui est déjà utilisé pour les notes coach par bilan.
  generalNote?: string;
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

// ─── Protocole de suivi (Chantier 2026-04-20) ────────────────────────────
export type FollowUpProtocolStepId = "j1" | "j3" | "j7" | "j10" | "j14";

export interface FollowUpProtocolLog {
  id: string;
  clientId: string;
  coachId: string;
  stepId: FollowUpProtocolStepId;
  sentAt: string;
  notes?: string;
}

export interface ClientMessage {
  id: string;
  report_token?: string;
  client_id: string;
  client_name: string;
  distributor_id: string;
  // Chantier Messagerie client ↔ coach (2026-04-21) : +'rdv_request'.
  message_type: 'product_request' | 'recommendation' | 'rdv_request' | 'general';
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

// ─── Agenda Prospects (Chantier 2026-04-19) ─────────────────────────────
export type ProspectSource =
  | 'Meta Ads'
  | 'Instagram'
  | 'Facebook'
  | 'TikTok'
  | 'Bouche à oreille'
  | 'Parrainage'
  | 'Événement'
  | 'Autre';

export type ProspectStatus =
  | 'scheduled'   // RDV pris, à venir
  | 'done'        // RDV effectué mais pas encore converti
  | 'converted'   // devenu client
  | 'lost'        // pas intéressé
  | 'no_show'     // n'est pas venu
  | 'cancelled'   // RDV annulé
  | 'cold';       // à réchauffer plus tard (base froide)

export interface Prospect {
  id: string;
  firstName: string;
  lastName: string;
  phone?: string;
  email?: string;
  rdvDate: string;          // ISO timestamptz
  source: ProspectSource;
  sourceDetail?: string;
  note?: string;
  distributorId: string;
  status: ProspectStatus;
  convertedClientId?: string;
  coldUntil?: string;       // ISO — date à partir de laquelle réchauffer
  coldReason?: string;      // note contextuelle pour se souvenir au moment de réchauffer
  createdAt: string;
  updatedAt: string;
}

export interface ProspectFormInput {
  firstName: string;
  lastName: string;
  phone?: string;
  email?: string;
  rdvDate: string;
  source: ProspectSource;
  sourceDetail?: string;
  note?: string;
  distributorId: string;
}

export const PROSPECT_SOURCES: ProspectSource[] = [
  'Meta Ads',
  'Instagram',
  'Facebook',
  'TikTok',
  'Bouche à oreille',
  'Parrainage',
  'Événement',
  'Autre',
];

// Chantier UX modal (2026-04-19) : terminologie adoucie
// Les valeurs techniques (lost, no_show, cold) restent inchangées en DB,
// seuls les labels UI sont reformulés pour une approche Go Pro non forcée.
export const PROSPECT_STATUS_LABELS: Record<ProspectStatus, string> = {
  scheduled: 'À venir',
  done: 'Effectué',
  converted: 'Converti',
  lost: 'Pas intéressé',
  no_show: 'Pas venu',
  cancelled: 'Annulé',
  cold: 'À reprendre',
};
