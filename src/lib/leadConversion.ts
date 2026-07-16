// =============================================================================
// leadConversion — helpers purs pour convertir un Lead bilan online
// (table online_bilans) en vraie fiche client (clients + assessment initial).
// Chantier #3 étape 3.1 (2026-06-03).
//
// Le bilan online collecte beaucoup moins qu'un bilan présentiel (pas de
// body scan / Tanita, pas de produits, programme non choisi). On construit
// donc un AssessmentRecord MINIMAL valide : le coach complète le reste plus
// tard via un vrai bilan sur la fiche. Ces factories évitent d'énumérer les
// ~40 champs obligatoires de AssessmentQuestionnaire à chaque appel.
// =============================================================================

import type {
  AssessmentQuestionnaire,
  BodyScanMetrics,
  Objective,
} from "../types/domain";

/**
 * Mappe les objectifs multi du bilan online (enum public) vers l'Objective
 * unique de l'app coach. weight_loss → perte de poids, mass_gain → prise de
 * masse. energy / sleep / wellbeing / perf_pro n'ont pas d'équivalent direct
 * → défaut perte de poids (le plus courant), éditable par le coach dans le
 * sandbox de conversion.
 */
export function mapOnlineObjective(objectives: string[]): Objective {
  if (objectives.includes("mass_gain")) return "mass-gain";
  if (objectives.includes("weight_loss")) return "weight-loss";
  return "weight-loss";
}

/** Libellé FR court d'un Objective — utilisé pour summary / objectiveFocus. */
export function objectiveLabel(objective: Objective): string {
  switch (objective) {
    case "weight-loss":
      return "Perte de poids";
    case "sport":
      return "Sport";
    case "mass-gain":
      return "Prise de masse";
    case "strength":
      return "Force";
    case "cutting":
      return "Sèche";
    case "endurance":
      return "Endurance";
    case "fitness":
      return "Fitness";
    case "competition":
      return "Compétition";
    default:
      return "Bien-être";
  }
}

/**
 * Body scan vide (toutes métriques à 0). Si un poids est fourni par le coach
 * lors de la conversion, il est posé → le client devient éligible au
 * protocole de suivi J+1/3/7/10 (qui exige un poids mesuré > 0).
 */
export function buildEmptyBodyScan(weight = 0): BodyScanMetrics {
  return {
    weight: Number.isFinite(weight) && weight > 0 ? weight : 0,
    bodyFat: 0,
    muscleMass: 0,
    hydration: 0,
    boneMass: 0,
    visceralFat: 0,
    bmr: 0,
    metabolicAge: 0,
  };
}

/**
 * Questionnaire vide mais structurellement valide (tous les champs
 * obligatoires posés). `overrides` permet de semer les quelques données
 * connues depuis le lead (objectiveFocus, motivation, targetWeight…).
 */
export function buildEmptyQuestionnaire(
  overrides: Partial<AssessmentQuestionnaire> = {},
): AssessmentQuestionnaire {
  return {
    healthStatus: "",
    healthNotes: "",
    allergies: "",
    transitStatus: "",
    pathologyContext: "",
    wakeUpTime: "",
    bedTime: "",
    sleepHours: 0,
    sleepQuality: "",
    napFrequency: "",
    breakfastFrequency: "",
    breakfastTime: "",
    breakfastContent: "",
    breakfastSatiety: "",
    firstMealTime: "",
    mealsPerDay: 0,
    regularMealTimes: "",
    lunchLocation: "",
    dinnerTiming: "",
    vegetablesDaily: "",
    proteinEachMeal: "",
    sugaryProducts: "",
    snackingFrequency: "",
    // Champs multi depuis 2026-07-16 (cf. src/lib/multiChoice.ts).
    snackingMoment: [],
    cravingsPreference: "",
    snackingTrigger: [],
    waterIntake: 0,
    drinksCoffee: "",
    coffeePerDay: 0,
    sweetDrinks: "",
    alcohol: "",
    lunchExample: "",
    dinnerExample: "",
    physicalActivity: "",
    activityType: "",
    sessionsPerWeek: 0,
    energyLevel: "",
    pastAttempts: "",
    hardestPart: "",
    mainBlocker: [],
    objectiveFocus: [],
    motivation: 0,
    desiredTimeline: "",
    recommendations: [],
    recommendationsContacted: false,
    ...overrides,
  };
}
