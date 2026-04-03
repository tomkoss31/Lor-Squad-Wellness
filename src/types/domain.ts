export type UserRole = "admin" | "referent" | "distributor";

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
  optionalProductsUsed?: string;
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
}

export interface FollowUp {
  id: string;
  clientId: string;
  clientName: string;
  dueDate: string;
  type: string;
  status: "scheduled" | "pending";
  programTitle: string;
  lastAssessmentDate: string;
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
