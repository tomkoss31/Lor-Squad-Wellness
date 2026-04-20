import { useState, type ReactNode } from "react";
import { lazy } from "react";
import { Suspense } from "react";
import { StepRail } from "../components/assessment/StepRail";
import { useEffect } from "react";
import { useRef } from "react";
import { Component, type ErrorInfo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { RecapModal } from "../components/assessment/RecapModal";
import { getSupabaseClient } from "../services/supabaseClient";
import { BodyFatInsightCard } from "../components/body-scan/BodyFatInsightCard";
import { MuscleMassInsightCard } from "../components/body-scan/MuscleMassInsightCard";
import { HydrationVisceralInsightCard } from "../components/body-scan/HydrationVisceralInsightCard";
import { BodyScanRadar } from "../components/body-scan/BodyScanRadar";
import { ProgramBoosterCard } from "../components/programs/ProgramBoosterCard";
import { ProgramCard } from "../components/programs/ProgramCard";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { PageHeading } from "../components/ui/PageHeading";
import { StatusBadge } from "../components/ui/StatusBadge";
import { useAppContext } from "../context/AppContext";
import { useToast, buildSupabaseErrorToast } from "../context/ToastContext";
import { getAccessibleOwnerIds, getRoleLabel, isAdmin } from "../lib/auth";
import {
  estimateBodyFatKg,
  estimateHydrationKg,
  estimateMuscleMassPercent,
  normalizeDateTimeLocalInputValue,
  serializeDateTimeForStorage,
} from "../lib/calculations";
import { buildAssessmentRecommendationPlan } from "../lib/assessmentRecommendations";
import type { BiologicalSex, BreakfastAnalysis, DecisionClient, MessageALaisser, Objective, RecommendationLead, TypeDeSuite } from "../types/domain";
import { BreakfastStorySlider, DEFAULT_BREAKFAST_ANALYSIS } from "../components/education/BreakfastStorySlider";

type AssessmentForm = {
  assessmentDate: string;
  referredByName: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  sex: BiologicalSex;
  age: number;
  height: number;
  job: string;
  currentClothingSize: string;
  targetClothingSize: string;
  city: string;
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
  mealsPerDay: number;
  firstMealTime: string;
  regularMealTimes: string;
  lunchLocation: string;
  dinnerTiming: string;
  lunchExample: string;
  dinnerExample: string;
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
  physicalActivity: string;
  activityType: string;
  sessionsPerWeek: number;
  energyLevel: string;
  pastAttempts: string;
  hardestPart: string;
  mainBlocker: string;
  objectiveFocus: string;
  /** Chantier bilan updates (2026-04-20) : texte libre si objectiveFocus === "Autre". */
  customGoal: string;
  /** Chantier bilan updates (2026-04-20) : snacks/fast-food/resto par semaine. */
  snacksFastFoodPerWeek: number | null;
  /** Chantier bilan updates (2026-04-20) : saveur Formula 1 choisie au tasting. */
  preferredFlavor: string;
  /** Chantier refonte étape 11 (2026-04-20). */
  consumesMilk: "yes" | "sometimes" | "no" | "";
  programChoice: "discovery" | "premium" | "booster1" | "booster2";
  targetWeight: number;
  motivation: number;
  desiredTimeline: string;
  weight: number;
  bodyFat: number;
  muscleMass: number;
  hydration: number;
  boneMass: number;
  visceralFat: number;
  bmr: number;
  metabolicAge: number;
  objective: Objective;
  selectedProgramId: string;
  afterAssessmentAction: "started" | "pending";
  nextFollowUp: string;
  comment: string;
  recommendations: RecommendationLead[];
  recommendationsContacted: boolean;
  detectedNeedIds: string[];
  selectedProductIds: string[];
  // Étape 13 — Chantier 1
  decisionClient: DecisionClient | null;
  typeDeSuite: TypeDeSuite | null;
  messageALaisser: MessageALaisser | null;
  // Étape 9 — Chantier 6 (story petit-déjeuner)
  breakfastAnalysis: BreakfastAnalysis;
};

interface AssessmentDraftPayload {
  form: AssessmentForm;
  currentStep: number;
  assignedUserId: string;
  savedAt: string;
}

const ASSESSMENT_DRAFT_KEY = "lor-squad-wellness-assessment-draft-v1";

function padDatePart(value: number) {
  return String(value).padStart(2, "0");
}

function toDateInputValue(date: Date) {
  return `${date.getFullYear()}-${padDatePart(date.getMonth() + 1)}-${padDatePart(date.getDate())}`;
}

function toDateTimeLocalValue(date: Date) {
  return `${toDateInputValue(date)}T${padDatePart(date.getHours())}:${padDatePart(date.getMinutes())}`;
}

function getCurrentDateTimeValue() {
  return toDateTimeLocalValue(new Date());
}

function getDefaultNextFollowUpDateTime() {
  const baseDate = new Date();
  baseDate.setDate(baseDate.getDate() + 14);
  baseDate.setHours(10, 0, 0, 0);
  return toDateTimeLocalValue(baseDate);
}

function createEmptyRecommendations(count = 10): RecommendationLead[] {
  return Array.from({ length: count }, () => ({ name: "", contact: "" }));
}

function normalizeRecommendations(
  recommendations: RecommendationLead[] | undefined,
  count = 10
) {
  const base = createEmptyRecommendations(count);
  if (!recommendations?.length) {
    return base;
  }

  return base.map((item, index) => ({
    ...item,
    ...(recommendations[index] ?? {})
  }));
}

const initialForm: AssessmentForm = {
  assessmentDate: getCurrentDateTimeValue(),
  referredByName: "",
  firstName: "",
  lastName: "",
  phone: "",
  email: "",
  sex: "female",
  age: 0,
  height: 0,
  job: "",
  currentClothingSize: "",
  targetClothingSize: "",
  city: "",
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
  mealsPerDay: 0,
  firstMealTime: "",
  regularMealTimes: "",
  lunchLocation: "",
  dinnerTiming: "",
  lunchExample: "",
  dinnerExample: "",
  vegetablesDaily: "",
  proteinEachMeal: "",
  sugaryProducts: "",
  snackingFrequency: "",
  snackingMoment: "",
  cravingsPreference: "",
  snackingTrigger: "",
  waterIntake: 0,
  drinksCoffee: "",
  coffeePerDay: 0,
  sweetDrinks: "",
  alcohol: "",
  physicalActivity: "",
  activityType: "",
  sessionsPerWeek: 0,
  energyLevel: "",
  pastAttempts: "",
  hardestPart: "",
  mainBlocker: "",
  objectiveFocus: "",
  customGoal: "",
  snacksFastFoodPerWeek: null,
  preferredFlavor: "",
  consumesMilk: "" as "yes" | "sometimes" | "no" | "",
  programChoice: "premium" as "discovery" | "premium" | "booster1" | "booster2",
  targetWeight: 0,
  motivation: 0,
  desiredTimeline: "3 mois",
  weight: 0,
  bodyFat: 0,
  muscleMass: 0,
  hydration: 0,
  boneMass: 0,
  visceralFat: 0,
  bmr: 0,
  metabolicAge: 0,
  objective: "weight-loss",
  selectedProgramId: "",
  afterAssessmentAction: "started",
  nextFollowUp: getDefaultNextFollowUpDateTime(),
  comment: "",
  recommendations: createEmptyRecommendations(),
  recommendationsContacted: false,
  detectedNeedIds: [],
  selectedProductIds: [],
  decisionClient: null,
  typeDeSuite: "rdv_fixe",
  messageALaisser: null,
  breakfastAnalysis: DEFAULT_BREAKFAST_ANALYSIS
};

function readAssessmentDraft(): AssessmentDraftPayload | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(ASSESSMENT_DRAFT_KEY);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as Partial<AssessmentDraftPayload>;
    if (!parsed.form) {
      return null;
    }

    return {
      form: {
        ...initialForm,
        ...parsed.form,
        assessmentDate: normalizeDateTimeLocalInputValue(parsed.form.assessmentDate),
        nextFollowUp: normalizeDateTimeLocalInputValue(parsed.form.nextFollowUp ?? initialForm.nextFollowUp),
        recommendations: normalizeRecommendations(parsed.form.recommendations),
        recommendationsContacted: parsed.form.recommendationsContacted ?? false,
        // Fallback si draft antérieur au Chantier 6 (pas de breakfastAnalysis ou partiel)
        breakfastAnalysis: {
          ...DEFAULT_BREAKFAST_ANALYSIS,
          ...(parsed.form.breakfastAnalysis ?? {})
        }
      },
      currentStep:
        typeof parsed.currentStep === "number"
          ? Math.min(Math.max(parsed.currentStep, 0), steps.length - 1)
          : 0,
      assignedUserId: parsed.assignedUserId ?? "",
      savedAt: parsed.savedAt ?? new Date().toISOString()
    };
  } catch (error) {
    console.error("Lecture du brouillon bilan impossible.", error);
    return null;
  }
}

function persistAssessmentDraft(payload: AssessmentDraftPayload) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(ASSESSMENT_DRAFT_KEY, JSON.stringify(payload));
  } catch (error) {
    console.error("Sauvegarde du brouillon bilan impossible.", error);
  }
}

function clearAssessmentDraft() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(ASSESSMENT_DRAFT_KEY);
}

// Chantier bilan updates (2026-04-20) : renommage + insertion + suppression.
// - étape "Routine matin" → "Notre concept de rééquilibrage alimentaire"
// - suppression de "Hydratation & routine du matin"
// - insertion de "Dégustation" et "Reconnaissance" après "Petit-déjeuner"
const steps = [
  "Informations client",             // 0
  "Habitudes de vie et repas",       // 1
  "Qualité alimentaire et boissons", // 2
  "Santé, objectif, activité et freins", // 3
  "Composition des repas",           // 4
  "Body scan",                       // 5
  "Références de suivi",             // 6
  "Recommandations",                 // 7
  "Petit-déjeuner",                  // 8
  "Dégustation",                     // 9  (NEW)
  "Reconnaissance",                  // 10 (NEW)
  "Notre concept de rééquilibrage alimentaire", // 11 (renommé de "Routine matin")
  "Programme proposé",               // 12 (inchangé — chantier dédié plus tard)
  "Suite du suivi",                  // 13 (ancien "Hydratation" supprimé)
  "Résumé du rendez-vous"            // 14
];

const timelineOptions = [
  "1 mois",
  "2 mois",
  "3 mois",
  "4 mois",
  "5 mois",
  "6 mois",
  "9 mois"
];

const PROGRAM_INCLUDED_PRODUCT_IDS: Record<string, string[]> = {
  "p-discovery": ["aloe-vera", "the-51g", "formula-1"],
  "p-premium": ["aloe-vera", "the-51g", "formula-1", "pdm"],
  "p-booster-1": ["aloe-vera", "the-51g", "formula-1", "pdm", "multifibres"],
  "p-booster-2": ["aloe-vera", "the-51g", "formula-1", "pdm", "phyto-brule-graisse"]
};

const LazyMorningRoutineCard = lazy(() =>
  import("../components/education/MorningRoutineCard").then((module) => ({
    default: module.MorningRoutineCard
  }))
);


export function NewAssessmentPage() {
  const navigate = useNavigate();
  const { programs, users, currentUser, createClientWithInitialAssessment, prospects, updateProspect } = useAppContext();
  const { push: pushToast } = useToast();
  const [searchParams] = useSearchParams();
  const prospectId = searchParams.get("prospectId");
  const sourceProspect = prospectId ? prospects.find((p) => p.id === prospectId) : undefined;
  const stepRailRef = useRef<HTMLDivElement | null>(null);
  const [form, setForm] = useState(initialForm);
  const [currentStep, setCurrentStep] = useState(0);
  const [saveError, setSaveError] = useState("");
  const [showRecapModal, setShowRecapModal] = useState(false);
  const [recapToken, setRecapToken] = useState("");
  const [recapClientName, setRecapClientName] = useState("");
  const [assignedUserId, setAssignedUserId] = useState("");
  const [draftReady, setDraftReady] = useState(false);
  // Chantier Prospects : suivi des champs pré-remplis par le prospect (surlignés en vert
  // tant qu'ils n'ont pas été modifiés manuellement).
  const [prefilledFields, setPrefilledFields] = useState<{
    firstName: boolean; lastName: boolean; phone: boolean; email: boolean;
  }>({ firstName: false, lastName: false, phone: false, email: false });

  useEffect(() => {
    const draft = readAssessmentDraft();
    if (draft) {
      setForm(draft.form);
      setCurrentStep(draft.currentStep);
      setAssignedUserId(draft.assignedUserId);
    }

    // Pré-remplissage depuis prospect (priorité sur le draft local si params URL)
    if (sourceProspect) {
      setForm((prev) => ({
        ...prev,
        firstName: sourceProspect.firstName || prev.firstName,
        lastName: sourceProspect.lastName || prev.lastName,
        phone: sourceProspect.phone || prev.phone,
        email: sourceProspect.email || prev.email,
      }));
      setPrefilledFields({
        firstName: !!sourceProspect.firstName,
        lastName: !!sourceProspect.lastName,
        phone: !!sourceProspect.phone,
        email: !!sourceProspect.email,
      });
      // Assigner le distributeur du prospect si admin
      if (currentUser?.role === 'admin') {
        setAssignedUserId(sourceProspect.distributorId);
      }
    }

    setDraftReady(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prospectId]);

  const goToStep = (nextStep: number) => {
    setCurrentStep(Math.min(Math.max(nextStep, 0), steps.length - 1));
  };

  const goToPreviousStep = () => {
    goToStep(currentStep - 1);
  };

  const [stepWarning, setStepWarning] = useState("");

  const goToNextStep = () => {
    setStepWarning("");

    // Validation étape 0 — infos client
    if (currentStep === 0) {
      if (!form.firstName.trim() || !form.lastName.trim()) {
        setStepWarning("Prénom et nom du client sont obligatoires pour continuer.");
        return;
      }
      if (!form.objectiveFocus) {
        setStepWarning("Choisis un objectif principal pour le client.");
        return;
      }
    }

    // Validation étape 5 — body scan (poids minimum)
    if (currentStep === 5) {
      if (!form.weight || form.weight <= 0) {
        setStepWarning("Le poids est nécessaire pour le body scan. Tu peux le compléter plus tard si besoin.");
      }
    }

    // Étape 10 — programme optionnel (pas de validation bloquante)

    goToStep(currentStep + 1);
  };

  useEffect(() => {
    const stepRailTop = stepRailRef.current
      ? stepRailRef.current.getBoundingClientRect().top + window.scrollY - 12
      : 0;

    window.scrollTo({
      top: Math.max(stepRailTop, 0),
      behavior: currentStep === 0 ? "auto" : "smooth"
    });
  }, [currentStep]);

  useEffect(() => {
    if (!currentUser) {
      return;
    }

    setAssignedUserId((previous) => previous || currentUser.id);
  }, [currentUser]);

  useEffect(() => {
    if (!draftReady) {
      return;
    }

    persistAssessmentDraft({
      form,
      currentStep,
      assignedUserId,
      savedAt: new Date().toISOString()
    });
  }, [assignedUserId, currentStep, draftReady, form]);

  const assignableOwnerIds = currentUser
    ? getAccessibleOwnerIds(currentUser, users)
    : new Set<string>();
  const assignableOwners = users.filter(
    (user) => user.active && assignableOwnerIds.has(user.id)
  );
  const assignedUser =
    assignableOwners.find((user) => user.id === assignedUserId) ??
    currentUser ??
    null;

  const currentPrograms = programs.filter((program) => program.category === form.objective);
  const mainPrograms = currentPrograms.filter((program) => program.kind !== "booster");
  const boosterPrograms = currentPrograms.filter((program) => program.kind === "booster");
  const selectedProgram =
    mainPrograms.find((program) => program.id === form.selectedProgramId) ?? null;
  const startsImmediately = form.afterAssessmentAction === "started";
  const bodyFatKg = estimateBodyFatKg(form.weight, form.bodyFat);
  const musclePercent = estimateMuscleMassPercent(form.weight, form.muscleMass);
  const hydrationKg = estimateHydrationKg(form.weight, form.hydration);
  const bodyFatTarget = getBodyFatTargetRange(form.sex, form.objective);
  const hydrationReference = getHydrationReference(form.sex);
  const weightTargetLabel =
    form.objective === "weight-loss" && form.targetWeight > 0
      ? `${formatValue(form.targetWeight, "kg")}`
      : form.objective === "sport"
        ? "Base a consolider"
        : "À définir";
  const weightGapLabel =
    form.objective === "weight-loss" && form.targetWeight > 0
      ? form.weight > form.targetWeight
        ? `${formatSignedValue(form.targetWeight - form.weight, "kg")}`
        : "Dans la cible"
      : "Base du jour";
  const bodyFatTargetLabel = `${bodyFatTarget.min}-${bodyFatTarget.max} %`;
  const bodyFatGapLabel = getRangeGapLabel(form.bodyFat, bodyFatTarget, "%");
  const hydrationTargetLabel = `${hydrationReference.min}-${hydrationReference.max} %`;
  const hydrationGapLabel = getRangeGapLabel(form.hydration, hydrationReference, "%");
  const visceralTargetLabel = "0-6";
  const visceralGapLabel =
    form.visceralFat > 6 ? `+${formatRawNumber(form.visceralFat - 6)}` : "Dans le repère";
  const comparisonRows = [
    {
      label: "Poids",
      initial: formatValue(form.weight, "kg"),
      current: formatValue(form.weight, "kg"),
      target: weightTargetLabel,
      gap: weightGapLabel,
      priority:
        form.objective === "weight-loss" && form.targetWeight > 0
          ? form.weight > form.targetWeight
            ? "A reduire progressivement"
            : "Dans l'objectif"
          : "Base de référence",
      tone: "blue" as const
    },
    {
      label: "Masse grasse",
      initial: `${formatRawNumber(form.bodyFat)} %`,
      current: `${formatRawNumber(form.bodyFat)} %`,
      target: bodyFatTargetLabel,
      gap: bodyFatGapLabel,
      priority: getBodyFatPriority(form.bodyFat, bodyFatTarget),
      tone: "red" as const
    },
    {
      label: "Masse musculaire",
      initial: formatValue(form.muscleMass, "kg"),
      current: formatValue(form.muscleMass, "kg"),
      target: form.objective === "sport" ? "A developper" : "A preserver",
      gap: `${formatRawNumber(musclePercent)} % du poids`,
      priority:
        form.objective === "sport" ? "A soutenir dans le suivi" : "A preserver",
      tone: "green" as const
    },
    {
      label: "Hydratation",
      initial: `${formatRawNumber(form.hydration)} %`,
      current: `${formatRawNumber(form.hydration)} %`,
      target: hydrationTargetLabel,
      gap: hydrationGapLabel,
      priority: getHydrationPriority(form.hydration, hydrationReference),
      tone: "blue" as const
    },
    {
      label: "Graisse viscérale",
      initial: formatRawNumber(form.visceralFat),
      current: formatRawNumber(form.visceralFat),
      target: visceralTargetLabel,
      gap: visceralGapLabel,
      priority: getVisceralPriority(form.visceralFat),
      tone: "amber" as const
    }
  ];
  const recommendationPlan = buildAssessmentRecommendationPlan({
    sex: form.sex,
    objective: form.objective,
    sleepHours: form.sleepHours,
    sleepQuality: form.sleepQuality,
    breakfastFrequency: form.breakfastFrequency,
    breakfastSatiety: form.breakfastSatiety,
    regularMealTimes: form.regularMealTimes,
    proteinEachMeal: form.proteinEachMeal,
    sugaryProducts: form.sugaryProducts,
    snackingFrequency: form.snackingFrequency,
    snackingMoment: form.snackingMoment,
    cravingsPreference: form.cravingsPreference,
    snackingTrigger: form.snackingTrigger,
    waterIntake: form.waterIntake,
    energyLevel: form.energyLevel,
    transitStatus: form.transitStatus,
    healthNotes: form.healthNotes,
    pathologyContext: form.pathologyContext,
    weight: form.weight,
    muscleMass: form.muscleMass,
    hydration: form.hydration,
    boneMass: form.boneMass,
    visceralFat: form.visceralFat
  });
  const defaultSuggestedProductIds = recommendationPlan.needs
    .flatMap((need) => need.products.slice(0, 1).map((product) => product.id))
    .filter((productId, index, array) => array.indexOf(productId) === index);
  const effectiveSelectedProductIds =
    form.selectedProductIds.length > 0 ? form.selectedProductIds : defaultSuggestedProductIds;
  const allRecommendableProducts = [
    ...recommendationPlan.needs.flatMap((need) => need.products),
    ...recommendationPlan.optionalUpsells,
  ];
  const selectedRecommendationProducts = allRecommendableProducts
    .filter(
      (product, index, array) =>
        effectiveSelectedProductIds.includes(product.id) &&
        array.findIndex((item) => item.id === product.id) === index
    );
  const recommendedProgram =
    mainPrograms.find((program) => program.id === recommendationPlan.recommendedProgramId) ??
    null;
  const activeProgram = selectedProgram ?? recommendedProgram;
  const displayedProgramPrice = selectedProgram?.price ?? recommendedProgram?.price ?? "";
  const displayedProgramPriceValue = parsePriceValue(displayedProgramPrice);
  const includedProgramProductIds = activeProgram
    ? new Set(PROGRAM_INCLUDED_PRODUCT_IDS[activeProgram.id] ?? [])
    : new Set<string>();
  const addOnProducts = selectedRecommendationProducts.filter(
    (product) => !includedProgramProductIds.has(product.id)
  );
  const addOnProductsTotalPrice = Number(
    addOnProducts.reduce((total, product) => total + product.prixPublic, 0).toFixed(2)
  );
  const addOnProductsTotalPv = Number(
    addOnProducts.reduce((total, product) => total + product.pv, 0).toFixed(2)
  );
  const estimatedClientTotal = Number(
    (
      displayedProgramPriceValue +
      (addOnProducts.length ? addOnProductsTotalPrice : 0)
    ).toFixed(2)
  );

  useEffect(() => {
    if (currentStep !== 10) {
      return;
    }

    if (form.selectedProductIds.length || !defaultSuggestedProductIds.length) {
      return;
    }

    update("selectedProductIds", defaultSuggestedProductIds);
  }, [currentStep, defaultSuggestedProductIds, form.selectedProductIds.length]);




  function update<K extends keyof AssessmentForm>(key: K, value: AssessmentForm[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    // Prospects : retirer le flag pré-rempli dès que le coach édite le champ
    if (key === 'firstName' || key === 'lastName' || key === 'phone' || key === 'email') {
      setPrefilledFields((prev) => ({ ...prev, [key]: false }));
    }
  }

  function updateRecommendation(index: number, field: keyof RecommendationLead, value: string) {
    setForm((prev) => ({
      ...prev,
      recommendations: prev.recommendations.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [field]: value } : item
      )
    }));
  }

  function toggleSelectedProduct(productId: string) {
    setForm((previous) => {
      const nextSelected = previous.selectedProductIds.includes(productId)
        ? previous.selectedProductIds.filter((id) => id !== productId)
        : [...previous.selectedProductIds, productId];

      return {
        ...previous,
        selectedProductIds: nextSelected
      };
    });
  }


  function updateObjectiveFocus(value: string) {
    update("objectiveFocus", value);
    update("objective", value === "Prise de masse" ? "sport" : "weight-loss");
    update("selectedProgramId", "");
  }

  function buildQuestionnaire() {
    return {
      referredByName: form.referredByName.trim() || undefined,
      currentClothingSize: form.currentClothingSize || undefined,
      targetClothingSize: form.targetClothingSize || undefined,
      detectedNeedIds: recommendationPlan.needs.map((need) => need.id),
      selectedProductIds: effectiveSelectedProductIds,
      healthStatus: form.healthStatus,
      healthNotes: form.healthNotes,
      allergies: form.allergies,
      transitStatus: form.transitStatus,
      pathologyContext: form.pathologyContext,
      wakeUpTime: form.wakeUpTime,
      bedTime: form.bedTime,
      sleepHours: form.sleepHours,
      sleepQuality: form.sleepQuality,
      napFrequency: form.napFrequency,
      breakfastFrequency: form.breakfastFrequency,
      breakfastTime: form.breakfastTime,
      breakfastContent: form.breakfastContent,
      breakfastSatiety: form.breakfastSatiety,
      firstMealTime: form.firstMealTime,
      mealsPerDay: form.mealsPerDay,
      regularMealTimes: form.regularMealTimes,
      lunchLocation: form.lunchLocation,
      dinnerTiming: form.dinnerTiming,
      vegetablesDaily: form.vegetablesDaily,
      proteinEachMeal: form.proteinEachMeal,
      sugaryProducts: form.sugaryProducts,
      snackingFrequency: form.snackingFrequency,
      snackingMoment: form.snackingMoment,
      cravingsPreference: form.cravingsPreference,
      snackingTrigger: form.snackingTrigger,
      waterIntake: form.waterIntake,
      drinksCoffee: form.drinksCoffee,
      coffeePerDay: form.coffeePerDay,
      sweetDrinks: form.sweetDrinks,
      alcohol: form.alcohol,
      lunchExample: form.lunchExample,
      dinnerExample: form.dinnerExample,
      physicalActivity: form.physicalActivity,
      activityType: form.activityType,
      sessionsPerWeek: form.sessionsPerWeek,
      energyLevel: form.energyLevel,
      pastAttempts: form.pastAttempts,
      hardestPart: form.hardestPart,
      mainBlocker: form.mainBlocker,
      objectiveFocus: form.objectiveFocus,
      targetWeight: form.targetWeight > 0 ? form.targetWeight : undefined,
      motivation: form.motivation,
      desiredTimeline: form.desiredTimeline,
      // Chantier bilan updates (2026-04-20)
      customGoal: form.customGoal?.trim() || undefined,
      snacksFastFoodPerWeek:
        form.snacksFastFoodPerWeek != null && form.snacksFastFoodPerWeek >= 0
          ? form.snacksFastFoodPerWeek
          : null,
      preferredFlavor: form.preferredFlavor?.trim() || undefined,
      consumesMilk: form.consumesMilk ? form.consumesMilk : undefined,
      programChoice: form.programChoice,
      recommendations: form.recommendations.filter(
        (item) => item.name.trim() || item.contact.trim()
      ),
      recommendationsContacted: form.recommendationsContacted,
      // Étape 9 (Chantier 6) — story petit-déjeuner
      breakfastAnalysis: form.breakfastAnalysis
    };
  }

  async function handleSaveAssessment() {
    if (!form.firstName.trim() || !form.lastName.trim()) {
      setSaveError("Renseigne au minimum le prenom et le nom du client.");
      goToStep(0);
      return;
    }

    if (!form.phone.trim()) {
      setSaveError("Le numéro de téléphone est obligatoire.");
      goToStep(0);
      return;
    }

    if (!form.email.trim()) {
      setSaveError("L'adresse email est obligatoire.");
      goToStep(0);
      return;
    }

    if (!form.objectiveFocus.trim()) {
      setSaveError("Choisis d'abord l'objectif principal du client.");
      goToStep(0);
      return;
    }

    // Programme optionnel — pas de validation bloquante

    const assessmentDate = form.assessmentDate || getCurrentDateTimeValue();
    // Sujet C — "Suivi libre" : client actif mais hors agenda. La colonne
    // clients.next_follow_up est NOT NULL dans le schema, on y met donc une
    // date neutre (J+14) jamais affichée à l'utilisateur (masquée par
    // getClientActiveFollowUp / ClientsPage / DistributorPortfolio).
    const isFreeFollowUp = form.typeDeSuite === "suivi_libre";
    const nextFollowUp = serializeDateTimeForStorage(
      form.nextFollowUp || getDefaultNextFollowUpDateTime(),
      10
    );
    const programTitle = selectedProgram?.title ?? "Programme a confirmer";
    const programId = startsImmediately ? selectedProgram?.id : undefined;
    const clientStatus = startsImmediately ? "active" : "pending";
    const followUpType = startsImmediately ? "Premier suivi" : "Relance après bilan";
    const followUpStatus = startsImmediately ? "scheduled" : "pending";
    const assessment = {
      id: `a-${Date.now()}`,
      date: assessmentDate,
      type: "initial" as const,
      objective: form.objective,
      programId,
      programTitle,
      summary: startsImmediately
        ? `Premier bilan oriente ${form.objectiveFocus.toLowerCase()} avec mise en place du ${programTitle.toLowerCase()}.`
        : `Premier bilan oriente ${form.objectiveFocus.toLowerCase()} sans demarrage immediat, relance a prevoir.`,
      notes:
        form.comment.trim() ||
        (startsImmediately
          ? "Le client repart avec un cadre simple, un programme clair et un prochain suivi déjà pose."
          : "Le client repart avec un bilan clair, sans demarrage immediat, et une relance déjà prevue."),
      nextFollowUp,
      bodyScan: {
        weight: form.weight,
        bodyFat: form.bodyFat,
        muscleMass: form.muscleMass,
        hydration: form.hydration,
        boneMass: form.boneMass,
        visceralFat: form.visceralFat,
        bmr: form.bmr,
        metabolicAge: form.metabolicAge
      },
      questionnaire: buildQuestionnaire(),
      pedagogicalFocus:
        form.objective === "sport"
          ? ["Hydratation", "Routine matin", "Assiette sport"]
          : ["Hydratation", "Routine matin", "Assiette perte de poids"],
      // Étape 13 — Chantier 1 (Matrice B)
      decisionClient: form.decisionClient,
      typeDeSuite: form.typeDeSuite,
      messageALaisser: form.messageALaisser
    };

    try {
      const clientId = await createClientWithInitialAssessment({
        client: {
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
          sex: form.sex,
          phone: form.phone.trim(),
          email: form.email.trim().toLowerCase(),
          age: form.age,
          height: form.height,
          job: form.job.trim() || "Non renseigné",
          city: form.city.trim() || undefined,
          distributorId: assignedUser?.id ?? currentUser?.id ?? "u-local-admin",
          distributorName: assignedUser?.name ?? currentUser?.name ?? "Lor'Squad Wellness",
          objective: form.objective
        },
        assessment,
        clientStatus,
        currentProgram: startsImmediately ? programTitle : "",
        pvProgramId: startsImmediately ? selectedProgram?.id : undefined,
        started: startsImmediately,
        nextFollowUp,
        followUpType,
        followUpStatus,
        notes:
          form.comment.trim() ||
          (startsImmediately
            ? "Nouveau client cree depuis le bilan initial. La suite est déjà fixee."
            : "Bilan enregistre sans demarrage. Une relance est a prevoir."),
        afterAssessmentAction: form.afterAssessmentAction,
        freeFollowUp: isFreeFollowUp
      });

      setSaveError("");

      // Chantier Prospects : si le bilan provient d'un prospect, on le convertit.
      if (sourceProspect) {
        try {
          await updateProspect(sourceProspect.id, {
            status: 'converted',
            convertedClientId: clientId,
          });
          pushToast({
            tone: "success",
            title: "Prospect converti en client ✓",
            message: `${sourceProspect.firstName} ${sourceProspect.lastName} est désormais dans ta base clients.`,
          });
        } catch (convErr) {
          // Non-fatal : le client est créé, seule la MAJ du prospect a échoué.
          console.error('Prospect conversion error:', convErr);
        }
      }

      // Créer récap Supabase pour QR code.
      // Site 2 du durcissement audit L1 (le plus critique) :
      //   - si l'insert échoue, le bilan lui-même est enregistré (addFollowUpAssessment
      //     au-dessus a déjà tourné), MAIS on ne vide PAS le draft local pour permettre
      //     une régénération via la fiche client.
      //   - on remonte l'erreur en toast explicite.
      try {
        const sb = await getSupabaseClient();
        if (sb) {
          const { data: recapData, error: recapError } = await sb
            .from('client_recaps')
            .insert({
              client_id: clientId,
              coach_name: currentUser?.name ?? 'Coach',
              client_first_name: form.firstName?.trim() ?? '',
              client_last_name: form.lastName?.trim() ?? '',
              assessment_date: new Date().toISOString(),
              program_title: programTitle || null,
              objective: form.objectiveFocus || null,
              body_scan: {
                weight: form.weight || null,
                bodyFat: form.bodyFat || null,
                muscleMass: form.muscleMass || null,
                hydration: form.hydration || null,
                visceralFat: form.visceralFat || null,
                metabolicAge: form.metabolicAge || null,
              },
              recommendations: selectedRecommendationProducts
                .slice(0, 5)
                .map(p => ({ name: p.name, shortBenefit: p.shortBenefit ?? '' })),
              referrals: [],
            })
            .select('token')
            .single();

          if (recapError) throw recapError;

          if (recapData?.token) {
            clearAssessmentDraft();
            setRecapToken(recapData.token);
            setRecapClientName(`${form.firstName?.trim()} ${form.lastName?.trim()}`);
            setShowRecapModal(true);
            return; // Modal handles navigation
          }
        }

        // Pas de Supabase ou pas de token renvoyé → mode local, on nettoie le draft
        clearAssessmentDraft();
        navigate(`/clients/${clientId}`);
      } catch (recapErr) {
        // Bilan enregistré, mais recap KO. On NE nettoie PAS le draft pour permettre
        // une régénération depuis la fiche client.
        console.error('Recap creation error:', recapErr);
        pushToast(buildSupabaseErrorToast(
          recapErr,
          "Le bilan est enregistré, mais le lien client n'a pas été généré. " +
          "Tu peux le régénérer depuis la fiche client (onglet Actions > Accès client)."
        ));
        navigate(`/clients/${clientId}`);
      }
    } catch (error) {
      setSaveError(
        error instanceof Error
          ? error.message
          : "Impossible d'enregistrer le bilan pour le moment."
      );
    }
  }


  return (
    <div className="space-y-6">
      <PageHeading
        eyebrow="Nouveau bilan"
        title="Bilan guidé"
        description="Un parcours clair pour conduire le rendez-vous, relire les habitudes et poser la suite."
      />

      {/* Chantier Prospects : bandeau persistant avec la note du prospect */}
      {sourceProspect && (
        <div
          style={{
            background: "color-mix(in srgb, var(--ls-teal) 8%, transparent)",
            borderLeft: "4px solid var(--ls-teal)",
            borderRadius: 10,
            padding: "12px 16px",
            fontFamily: "'DM Sans', sans-serif",
            marginBottom: 4,
          }}
        >
          <div style={{ fontSize: 10, letterSpacing: "2px", textTransform: "uppercase", color: "var(--ls-teal)", fontWeight: 600, marginBottom: 4 }}>
            ✦ Bilan issu du prospect {sourceProspect.source}
          </div>
          {sourceProspect.note && (
            <div style={{ fontSize: 13, color: "var(--ls-text)", lineHeight: 1.5 }}>
              {sourceProspect.note}
            </div>
          )}
          {!sourceProspect.note && (
            <div style={{ fontSize: 12, color: "var(--ls-text-muted)" }}>
              Prospect sans note. Les coordonnées ont été pré-remplies sur l'étape 1.
            </div>
          )}
        </div>
      )}

      <div ref={stepRailRef} className="step-rail-wrapper" style={{ position: 'sticky', top: 0, zIndex: 40, paddingTop: 8, paddingBottom: 8 }}>
        <StepRail currentStep={currentStep} steps={steps} onStepClick={goToStep} />
      </div>

      <div className="grid gap-4">
        <Card className="space-y-5">
          <div className="hidden md:flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="eyebrow-label">Étape {currentStep + 1} / {steps.length}</p>
              <h2 className="mt-3 text-3xl md:text-4xl">{steps[currentStep]}</h2>
            </div>
            <StatusBadge
              label={form.objective === "sport" ? "Parcours sport" : "Parcours accompagnement"}
              tone={form.objective === "sport" ? "green" : "blue"}
            />
          </div>

          {currentStep === 0 && (
              <div className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="Prenom" value={form.firstName} onChange={(v) => update("firstName", v)} prefilled={prefilledFields.firstName} />
                  <Field label="Nom" value={form.lastName} onChange={(v) => update("lastName", v)} prefilled={prefilledFields.lastName} />
                  <Field label="Téléphone *" value={form.phone} onChange={(v) => update("phone", v)} prefilled={prefilledFields.phone} />
                  <Field label="Email *" value={form.email} onChange={(v) => update("email", v)} prefilled={prefilledFields.email} />
                  <Field label="Invité par / recommandé par" value={form.referredByName} onChange={(v) => update("referredByName", v)} />
                  <Field
                    label="Date et heure du bilan initial"
                    type="datetime-local"
                    value={form.assessmentDate}
                    onChange={(v) => update("assessmentDate", v)}
                  />
                  {currentUser?.role === "admin" ? (
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-[var(--ls-text-muted)]">
                        Responsable du dossier
                      </label>
                      <select
                        value={assignedUserId}
                        onChange={(event) => setAssignedUserId(event.target.value)}
                      >
                        {assignableOwners.map((user) => (
                          <option key={user.id} value={user.id}>
                            {user.name} - {getRoleLabel(user.role)}
                          </option>
                        ))}
                      </select>
                      {!isAdmin(currentUser) ? (
                        <p className="text-xs leading-6 text-[var(--ls-text-muted)]">
                          Tu peux attribuer le dossier a toi-meme ou a un distributeur de ton equipe.
                        </p>
                      ) : null}
                    </div>
                  ) : null}
                  <ChoiceGroup
                    label="Sexe"
                    value={form.sex}
                    options={["female", "male"]}
                    onChange={(v) => update("sex", v as BiologicalSex)}
                    formatOption={(option) => (option === "male" ? "Homme" : "Femme")}
                  />
                  <Field label="Age" type="number" value={form.age} onChange={(v) => update("age", Number(v))} />
                  <Field label="Taille (cm)" type="number" value={form.height} onChange={(v) => update("height", Number(v))} />
                  <Field label="Profession" value={form.job} onChange={(v) => update("job", v)} />
                  <Field label="Ville" value={form.city} onChange={(v) => update("city", v)} />
                </div>

                <SectionBlock
                  title="Bloc 0 - Objectif et antecedents"
                  description="Poser le cap des le debut et noter tout point sante a respecter."
                >
                  <div className="grid gap-4 md:grid-cols-2">
                    <ChoiceGroup
                      label="Objectif principal"
                      value={form.objectiveFocus}
                      options={["Perte de poids", "Prise de masse", "Energie", "Remise en forme", "Autre"]}
                      onChange={updateObjectiveFocus}
                    />
                    <TimelineChoiceField
                      label="Delai souhaite"
                      value={form.desiredTimeline}
                      options={timelineOptions}
                      onChange={(v) => update("desiredTimeline", v)}
                    />
                  </div>
                  {/* Chantier bilan updates (2026-04-20) : texte libre si "Autre" */}
                  {form.objectiveFocus === "Autre" && (
                    <AreaField
                      label="Précise ton objectif"
                      value={form.customGoal ?? ""}
                      onChange={(v) => update("customGoal", v)}
                    />
                  )}
                  <div className="grid gap-4 md:grid-cols-2">
                    <ChoiceGroup
                      label="Sante / traitement"
                      value={form.healthStatus}
                      options={["RAS", "Traitement en cours", "Pathologie connue", "Avis medical a respecter"]}
                      onChange={(v) => update("healthStatus", v)}
                    />
                    <AreaField
                      label="Antecedents / precision utile"
                      value={form.healthNotes}
                      onChange={(v) => update("healthNotes", v)}
                    />
                  </div>
                  {form.objective === "weight-loss" && (
                    <Field
                      label="Poids cible (kg)"
                      type="number"
                      step="0.1"
                      value={form.targetWeight}
                      onChange={(v) => update("targetWeight", Number(v))}
                    />
                  )}
                  {/* Chantier bilan updates (2026-04-20) : taille vêtement déplacée
                      après le poids cible (ordre visuel plus logique). */}
                  <div className="grid gap-4 md:grid-cols-2">
                    <ClothingSizeSelect
                      label="Taille vêtement actuelle"
                      value={form.currentClothingSize}
                      sex={form.sex}
                      onChange={(v) => update("currentClothingSize", v)}
                    />
                    <ClothingSizeSelect
                      label="Taille vêtement cible"
                      value={form.targetClothingSize}
                      sex={form.sex}
                      onChange={(v) => update("targetClothingSize", v)}
                    />
                  </div>
                  <div className="space-y-3 rounded-[24px] bg-[var(--ls-surface2)] p-4">
                    <div className="flex items-center justify-between gap-3">
                      <label className="text-sm font-medium text-[var(--ls-text-muted)]">Motivation</label>
                      <span className="text-sm font-semibold text-white">{form.motivation}/10</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={10}
                      value={form.motivation}
                      onChange={(event) => update("motivation", Number(event.target.value))}
                    />
                  </div>
                </SectionBlock>
              </div>
            )}

          {currentStep === 1 && (
            <div className="space-y-4">
              <SectionBlock title="Bloc 1 - Rythme de vie" description="Comprendre le rythme reel avant de parler alimentation.">
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <Field label="Heure de lever" type="time" value={form.wakeUpTime} onChange={(v) => update("wakeUpTime", v)} />
                  <Field label="Heure de coucher" type="time" value={form.bedTime} onChange={(v) => update("bedTime", v)} />
                  <Field label="Heures de sommeil" type="number" step="0.5" value={form.sleepHours} onChange={(v) => update("sleepHours", Number(v))} />
                  <ChoiceGroup label="Qualité du sommeil" value={form.sleepQuality} options={["Très bonne", "Bonne", "Moyenne", "Mauvaise"]} onChange={(v) => update("sleepQuality", v)} />
                </div>
                {/* Calculateur sommeil auto */}
                {form.bedTime && form.wakeUpTime ? (() => {
                  const [bh, bm] = form.bedTime.split(':').map(Number)
                  const [wh, wm] = form.wakeUpTime.split(':').map(Number)
                  let bedMin = bh * 60 + bm, wakeMin = wh * 60 + wm
                  if (wakeMin <= bedMin) wakeMin += 24 * 60
                  const hours = (wakeMin - bedMin) / 60
                  const quality = hours >= 7 && hours <= 9 ? 'optimal' : hours >= 6 ? 'correct' : 'insuffisant'
                  const qColors: Record<string, string> = { optimal: '#2DD4BF', correct: '#C9A84C', insuffisant: '#FB7185' }
                  const color = qColors[quality]
                  return (
                    <div style={{ background: 'var(--ls-surface)', border: `1px solid ${color}30`, borderRadius: 12, padding: 14, display: 'flex', alignItems: 'center', gap: 14 }}>
                      <div style={{ textAlign: 'center', flexShrink: 0 }}>
                        <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 28, fontWeight: 800, color, lineHeight: 1 }}>{hours.toFixed(1)}h</div>
                        <div style={{ fontSize: 10, color: 'var(--ls-text-hint)', marginTop: 2 }}>de sommeil</div>
                      </div>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color, marginBottom: 2 }}>
                          {quality === 'optimal' ? 'Sommeil optimal' : quality === 'correct' ? 'Sommeil correct' : 'Sommeil insuffisant'}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--ls-text-muted)', lineHeight: 1.5 }}>
                          {quality === 'optimal' ? 'Entre 7h et 9h — idéal pour la récupération et la gestion du poids.'
                            : quality === 'correct' ? 'Correct mais en dessous des recommandations. Night Mode peut aider.'
                            : 'Moins de 6h — impacte la prise de poids et la récupération. Night Mode recommandé.'}
                        </div>
                      </div>
                    </div>
                  )
                })() : null}
                <ChoiceGroup label="Sieste en journee" value={form.napFrequency} options={["Jamais", "Parfois", "Souvent"]} onChange={(v) => update("napFrequency", v)} />
              </SectionBlock>

              <SectionBlock title="Bloc 2 - Petit-dejeuner" description="Faire ressortir si le matin soutient vraiment la journee.">
                <div className="grid gap-4 md:grid-cols-2">
                  <ChoiceGroup label="Petit-dejeuner tous les jours" value={form.breakfastFrequency} options={["Oui", "Non", "Parfois"]} onChange={(v) => update("breakfastFrequency", v)} />
                  <Field label="Heure du petit-dejeuner" type="time" value={form.breakfastTime} onChange={(v) => update("breakfastTime", v)} />
                  <AreaField label="Que consommes-tu le matin ?" value={form.breakfastContent} onChange={(v) => update("breakfastContent", v)} />
                  <ChoiceGroup label="Tient jusqu'au repas suivant" value={form.breakfastSatiety} options={["Oui", "Non", "Pas toujours"]} onChange={(v) => update("breakfastSatiety", v)} />
                </div>
              </SectionBlock>

              <SectionBlock title="Bloc 3 - Organisation des repas" description="Chercher la regularite sans entrer dans trop de detail.">
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <ChoiceGroup label="Repas par jour" value={String(form.mealsPerDay)} options={["1", "2", "3", "4 ou plus"]} onChange={(v) => update("mealsPerDay", v === "4 ou plus" ? 4 : Number(v))} />
                  <Field label="Premier vrai repas" type="time" value={form.firstMealTime} onChange={(v) => update("firstMealTime", v)} />
                  <ChoiceGroup label="Heures régulières" value={form.regularMealTimes} options={["Oui", "Non", "Pas toujours"]} onChange={(v) => update("regularMealTimes", v)} />
                  <ChoiceGroup label="Midi" value={form.lunchLocation} options={["A la maison", "Au travail", "Au restaurant", "Sur le pouce"]} onChange={(v) => update("lunchLocation", v)} />
                </div>
                <ChoiceGroup label="Le soir" value={form.dinnerTiming} options={["Tot", "Normalement", "Tard"]} onChange={(v) => update("dinnerTiming", v)} />
                {/* Chantier bilan updates (2026-04-20) : snacks/fast-food/resto — budget alim */}
                <div className="space-y-2">
                  <label className="ls-field-label">Nombre de snacks / fast-food / resto par semaine</label>
                  <input
                    type="number"
                    min={0}
                    max={30}
                    placeholder="Ex : 3"
                    value={form.snacksFastFoodPerWeek ?? ""}
                    onChange={(event) => {
                      const str = event.target.value.trim();
                      if (str === "") { update("snacksFastFoodPerWeek", null); return; }
                      const n = Number(str);
                      if (Number.isNaN(n) || n < 0) { update("snacksFastFoodPerWeek", null); return; }
                      update("snacksFastFoodPerWeek", Math.min(30, Math.max(0, n)));
                    }}
                    className="ls-input"
                  />
                  <p style={{ fontSize: 11, color: "var(--ls-text-hint)", margin: 0 }}>
                    Nous servira à calculer ton budget alimentation plus tard.
                  </p>
                </div>
              </SectionBlock>
            </div>
          )}

          {currentStep === 2 && (
            <div className="space-y-4">
              <SectionBlock title="Bloc 4 - Qualite alimentaire" description="Faire decrire rapidement le midi et le soir puis evaluer les bases.">
                <div className="grid gap-4 md:grid-cols-2">
                  <AreaField label="Repas type du midi" value={form.lunchExample} onChange={(v) => update("lunchExample", v)} />
                  <AreaField label="Repas type du soir" value={form.dinnerExample} onChange={(v) => update("dinnerExample", v)} />
                  <ChoiceGroup label="Legumes chaque jour" value={form.vegetablesDaily} options={["Oui", "Non", "Pas assez"]} onChange={(v) => update("vegetablesDaily", v)} />
                  <ChoiceGroup label="Protéines à chaque repas" value={form.proteinEachMeal} options={["Oui", "Non", "Pas toujours"]} onChange={(v) => update("proteinEachMeal", v)} />
                </div>
                <ChoiceGroup
                  label="À quelle fréquence consommes-tu des produits sucrés ou ultra-transformés ? (sodas, plats préparés, bonbons)"
                  value={form.sugaryProducts}
                  options={["Rarement", "Parfois", "Souvent", "Très souvent"]}
                  onChange={(v) => update("sugaryProducts", v)}
                />
              </SectionBlock>

              <SectionBlock title="Bloc 5 - Grignotage et fringales" description="Faire ressortir le vrai moment de craquage et la cause la plus frequente.">
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <ChoiceGroup label="Grignotage" value={form.snackingFrequency} options={["Jamais", "Parfois", "Souvent"]} onChange={(v) => update("snackingFrequency", v)} />
                  <ChoiceGroup label="Moment" value={form.snackingMoment} options={["Matin", "Apres-midi", "Soir", "Nuit"]} onChange={(v) => update("snackingMoment", v)} />
                  <ChoiceGroup label="Attirance" value={form.cravingsPreference} options={["Sucré", "Salé", "Les deux"]} onChange={(v) => update("cravingsPreference", v)} />
                  <ChoiceGroup label="Cause frequente" value={form.snackingTrigger} options={["Faim", "Stress", "Habitude", "Fatigue", "Ennui", "Emotions"]} onChange={(v) => update("snackingTrigger", v)} />
                </div>
              </SectionBlock>

              <SectionBlock title="Bloc 6 - Hydratation et boissons" description="Rester sur les volumes et les habitudes qui changent vraiment la lecture.">
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <Field label="Eau par jour (L)" type="number" step="0.1" value={form.waterIntake} onChange={(v) => update("waterIntake", Number(v))} />
                  <ChoiceGroup label="Cafe" value={form.drinksCoffee} options={["Oui", "Non"]} onChange={(v) => update("drinksCoffee", v)} />
                  <Field label="Cafes par jour" type="number" value={form.coffeePerDay} onChange={(v) => update("coffeePerDay", Number(v))} />
                  <ChoiceGroup label="Boissons sucrées" value={form.sweetDrinks} options={["Jamais", "Parfois", "Souvent"]} onChange={(v) => update("sweetDrinks", v)} />
                </div>
                <ChoiceGroup label="Alcool" value={form.alcohol} options={["Jamais", "Occasionnellement", "Chaque semaine", "Souvent"]} onChange={(v) => update("alcohol", v)} />
              </SectionBlock>
            </div>
          )}

          {currentStep === 3 && (
              <div className="space-y-4">
              <SectionBlock title="Bloc 7 - Allergies, transit et contexte pathologique" description="Ajouter seulement les points sante utiles pour cadrer l'accompagnement.">
                <div className="grid gap-4 md:grid-cols-2">
                  <Field
                    label="Allergies / intolerances"
                    value={form.allergies}
                    onChange={(v) => update("allergies", v)}
                  />
                  <ChoiceGroup
                    label="Niveau du transit"
                    value={form.transitStatus}
                    options={["Normal", "Lent", "Irregulier", "Sensible"]}
                    onChange={(v) => update("transitStatus", v)}
                  />
                  <AreaField
                    label="Contexte pathologique utile"
                    value={form.pathologyContext}
                    onChange={(v) => update("pathologyContext", v)}
                  />
                  <AreaField
                    label="Point sante a surveiller"
                    value={form.healthNotes}
                    onChange={(v) => update("healthNotes", v)}
                  />
                </div>
              </SectionBlock>

              <SectionBlock title="Bloc 8 - Activité et forme" description="Chercher le niveau réel d'activité et d'énergie.">
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <ChoiceGroup label="Activité physique" value={form.physicalActivity} options={["Oui", "Non"]} onChange={(v) => update("physicalActivity", v)} />
                  <Field label="Si oui, laquelle ?" value={form.activityType} onChange={(v) => update("activityType", v)} />
                  <Field label="Seances / semaine" type="number" value={form.sessionsPerWeek} onChange={(v) => update("sessionsPerWeek", Number(v))} />
                  <ChoiceGroup label="Niveau d'énergie" value={form.energyLevel} options={["Très bon", "Bon", "Moyen", "Faible"]} onChange={(v) => update("energyLevel", v)} />
                </div>
              </SectionBlock>

              <SectionBlock title="Bloc 9 - Historique et blocages" description="Faire apparaître ce qui a déjà été tenté et ce qui bloque aujourd'hui.">
                <div className="grid gap-4 md:grid-cols-2">
                  <AreaField label="Tentatives passees" value={form.pastAttempts} onChange={(v) => update("pastAttempts", v)} />
                  <AreaField label="Le plus difficile jusqu'ici" value={form.hardestPart} onChange={(v) => update("hardestPart", v)} />
                </div>
                <ChoiceGroup label="Blocage principal" value={form.mainBlocker} options={["Manque de temps", "Motivation", "Organisation", "Grignotage", "Fatigue", "Manque de repères", "Autre"]} onChange={(v) => update("mainBlocker", v)} />
              </SectionBlock>
              </div>
            )}

          {currentStep === 4 && (() => {
            const mealConfigs: Record<string, { title: string; legumes: number; proteines: number; glucides: number; message: string }> = {
              'weight-loss': { title: 'Assiette perte de poids', legumes: 50, proteines: 25, glucides: 25, message: 'La moitié de ton assiette en légumes te donnera du volume et de la satiété sans excès de calories.' },
              'sport': { title: 'Assiette prise de masse', legumes: 30, proteines: 40, glucides: 30, message: 'Plus de protéines et de glucides pour nourrir la croissance musculaire. Les légumes restent présents pour la récupération.' },
            }
            const cfg = mealConfigs[form.objective] ?? { title: 'Assiette équilibrée', legumes: 40, proteines: 30, glucides: 30, message: 'Un repas équilibré couvre tous tes besoins nutritionnels sans effort de calcul.' }

            return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <div style={{ fontSize: 9, letterSpacing: '2px', textTransform: 'uppercase', color: 'var(--ls-text-hint)', fontWeight: 500, marginBottom: 6 }}>Assiette type</div>
                <h2 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 'clamp(20px, 4vw, 26px)', color: 'var(--ls-text)', margin: '0 0 8px' }}>{cfg.title}</h2>
                <p style={{ fontSize: 13, color: 'var(--ls-text-muted)', lineHeight: 1.7, margin: 0, maxWidth: 520 }}>Construisons une assiette simple que tu peux reproduire tous les jours, sans te peser, sans calculer.</p>
              </div>

              <div style={{ background: 'var(--ls-surface)', border: '1px solid var(--ls-border)', borderRadius: 16, padding: 20 }}>
                <div className="plate-row" style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
                  <PlateChartSvg legumes={cfg.legumes} proteines={cfg.proteines} glucides={cfg.glucides} />
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10, minWidth: 180 }}>
                    <MacroCardItem color="#0D9488" bg="rgba(13,148,136,0.07)" border="rgba(13,148,136,0.15)" label="Légumes" pct={cfg.legumes} desc="Volume, satiété, fibres" fraction="½" />
                    <MacroCardItem color="var(--ls-gold)" bg="rgba(184,146,42,0.07)" border="rgba(184,146,42,0.15)" label="Protéines" pct={cfg.proteines} desc="Muscles, satiété longue" fraction="¼" />
                    <MacroCardItem color="#7C3AED" bg="rgba(124,58,237,0.06)" border="rgba(124,58,237,0.12)" label="Glucides" pct={cfg.glucides} desc="Énergie, récupération" fraction="¼" />
                  </div>
                </div>
                <div style={{ marginTop: 16, padding: '12px 14px', background: 'var(--ls-surface2)', borderRadius: 10, fontSize: 12, color: 'var(--ls-text-muted)', lineHeight: 1.7 }}>{cfg.message}</div>
              </div>

              <div style={{ background: 'var(--ls-surface)', border: '1px solid var(--ls-border)', borderRadius: 16, padding: 20 }}>
                <div style={{ fontSize: 9, letterSpacing: '2px', textTransform: 'uppercase', color: 'var(--ls-text-hint)', fontWeight: 500, marginBottom: 14 }}>Exemples concrets</div>
                {[
                  { color: '#0D9488', bg: 'rgba(13,148,136,0.08)', label: 'Légumes · la moitié', items: ['Salade verte', 'Courgettes', 'Brocolis', 'Tomates', 'Carottes', 'Poivrons', 'Concombre'] },
                  { color: '#B8922A', bg: 'rgba(184,146,42,0.08)', label: 'Protéines · un quart', items: ['Poulet grillé', 'Œufs', 'Thon', 'Saumon', 'Dinde', 'Tofu', 'Légumineuses'] },
                  { color: '#7C3AED', bg: 'rgba(124,58,237,0.07)', label: 'Glucides · un quart', items: ['Riz complet', 'Patate douce', 'Quinoa', 'Pain complet', 'Pâtes complètes', 'Lentilles'] },
                ].map(({ color, bg, label, items }, i) => (
                  <div key={label} style={{ borderTop: i > 0 ? '1px solid var(--ls-border)' : 'none', paddingTop: i > 0 ? 14 : 0, marginTop: i > 0 ? 14 : 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                      <div style={{ width: 8, height: 8, borderRadius: 2, background: color, flexShrink: 0 }} />
                      <span style={{ fontSize: 12, fontWeight: 600, color }}>{label}</span>
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, paddingLeft: 16 }}>
                      {items.map(item => (
                        <span key={item} style={{ fontSize: 11, padding: '4px 10px', borderRadius: 20, background: bg, color }}>{item}</span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ background: 'linear-gradient(135deg, rgba(184,146,42,0.08), rgba(184,146,42,0.04))', border: '1px solid rgba(184,146,42,0.2)', borderRadius: 16, padding: '18px 20px', display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                <div style={{ width: 38, height: 38, background: 'var(--ls-gold)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 2px 8px rgba(184,146,42,0.25)' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                </div>
                <div>
                  <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 14, color: 'var(--ls-text)', marginBottom: 6 }}>La règle des 3 doigts</div>
                  <div style={{ fontSize: 12, color: 'var(--ls-text-muted)', lineHeight: 1.75 }}>
                    Pas besoin de peser. Utilise ta main comme repère :<br/>
                    <span style={{ color: 'var(--ls-gold)', fontWeight: 600 }}>Protéines</span> = 1 paume · <span style={{ color: '#7C3AED', fontWeight: 600 }}>Glucides</span> = 1 poing fermé · <span style={{ color: '#0D9488', fontWeight: 600 }}>Légumes</span> = 2 mains ouvertes
                  </div>
                </div>
              </div>
            </div>
            )
          })()}

          {currentStep === 5 && (
            <div className="space-y-4">
              {/* Saisie body scan — grille claire */}
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                {[
                  { label: 'Poids (kg)', key: 'weight', icon: '⚖️', color: 'var(--ls-gold)' },
                  { label: 'Masse grasse (%)', key: 'bodyFat', icon: '🔥', color: 'var(--ls-coral)', step: '0.1' },
                  { label: 'Masse musculaire (kg)', key: 'muscleMass', icon: '💪', color: 'var(--ls-teal)', step: '0.1' },
                  { label: 'Hydratation (%)', key: 'hydration', icon: '💧', color: 'var(--ls-purple)', step: '0.1' },
                  { label: 'Masse osseuse (kg)', key: 'boneMass', icon: '🦴', color: 'var(--ls-text-muted)', step: '0.1' },
                  { label: 'Graisse viscérale', key: 'visceralFat', icon: '🫀', color: 'var(--ls-coral)' },
                  { label: 'BMR (kcal)', key: 'bmr', icon: '⚡', color: 'var(--ls-gold)' },
                  { label: 'Âge métabolique', key: 'metabolicAge', icon: '🧬', color: 'var(--ls-purple)' },
                ].map(({ label, key, icon, color, step }) => (
                  <div key={key} style={{ background: 'var(--ls-surface)', border: '1px solid var(--ls-border)', borderTop: `2px solid ${color}`, borderRadius: 14, padding: '14px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                      <span style={{ fontSize: 16 }}>{icon}</span>
                      <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--ls-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</span>
                    </div>
                    <div className="body-scan-big-input">
                      <DecimalInput
                        value={(form as Record<string, unknown>)[key] as number || 0}
                        onChange={(v) => update(key as keyof typeof form, Number(v) as never)}
                        step={step}
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* Résumé rapide calculé */}
              {form.weight > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, padding: '14px 0' }}>
                  {form.bodyFat > 0 && (
                    <div style={{ fontSize: 12, color: 'var(--ls-text-muted)', background: 'var(--ls-surface2)', padding: '6px 14px', borderRadius: 20, border: '1px solid var(--ls-border)' }}>
                      MG : <strong style={{ color: 'var(--ls-text)' }}>{bodyFatKg} kg</strong> ({form.bodyFat}%)
                    </div>
                  )}
                  {form.muscleMass > 0 && (
                    <div style={{ fontSize: 12, color: 'var(--ls-text-muted)', background: 'var(--ls-surface2)', padding: '6px 14px', borderRadius: 20, border: '1px solid var(--ls-border)' }}>
                      Muscle : <strong style={{ color: 'var(--ls-text)' }}>{formatRawNumber(musclePercent)}%</strong> ({form.muscleMass} kg)
                    </div>
                  )}
                  {form.hydration > 0 && (
                    <div style={{ fontSize: 12, color: 'var(--ls-text-muted)', background: 'var(--ls-surface2)', padding: '6px 14px', borderRadius: 20, border: '1px solid var(--ls-border)' }}>
                      Hydrat. : <strong style={{ color: form.hydration < 50 ? 'var(--ls-coral)' : 'var(--ls-text)' }}>{form.hydration}%</strong> ({hydrationKg} kg)
                    </div>
                  )}
                  {form.visceralFat > 0 && (
                    <div style={{ fontSize: 12, color: 'var(--ls-text-muted)', background: 'var(--ls-surface2)', padding: '6px 14px', borderRadius: 20, border: '1px solid var(--ls-border)' }}>
                      Viscéral : <strong style={{ color: form.visceralFat >= 13 ? 'var(--ls-coral)' : form.visceralFat >= 9 ? '#F59E0B' : 'var(--ls-teal)' }}>{form.visceralFat}</strong>/30
                    </div>
                  )}
                  {form.metabolicAge > 0 && (
                    <div style={{ fontSize: 12, color: 'var(--ls-text-muted)', background: 'var(--ls-surface2)', padding: '6px 14px', borderRadius: 20, border: '1px solid var(--ls-border)' }}>
                      Âge métabo : <strong style={{ color: 'var(--ls-text)' }}>{form.metabolicAge} ans</strong>
                    </div>
                  )}
                </div>
              )}

              {/* Jauges body scan */}
              {form.weight > 0 && form.bodyFat > 0 && (
                <BodyFatInsightCard
                  current={{ weight: form.weight, percent: form.bodyFat }}
                  objective={form.objective}
                  sex={form.sex}
                />
              )}

              {form.weight > 0 && form.muscleMass > 0 && (
                <MuscleMassInsightCard
                  current={{ weight: form.weight, muscleMass: form.muscleMass }}
                />
              )}

              {form.weight > 0 && form.hydration > 0 && (
                <HydrationVisceralInsightCard
                  weight={form.weight}
                  hydrationPercent={form.hydration}
                  visceralFat={form.visceralFat}
                  sex={form.sex}
                />
              )}

              {/* Radar synthèse */}
              {form.weight > 0 && (
                <Card className="flex items-center justify-center py-6">
                  <BodyScanRadar
                    size={280}
                    metrics={[
                      { label: 'Poids', value: form.weight, max: 120, color: '#C9A84C' },
                      { label: 'M. grasse', value: form.bodyFat, max: 50, color: '#FB7185' },
                      { label: 'Muscle', value: form.muscleMass, max: 60, color: '#2DD4BF' },
                      { label: 'Hydrat.', value: form.hydration, max: 80, color: '#A78BFA' },
                      { label: 'Viscéral', value: form.visceralFat, max: 30, color: '#FB7185' },
                    ]}
                  />
                </Card>
              )}
            </div>
          )}

          {currentStep === 6 && (
            <div className="space-y-4">
              <Card className="space-y-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="max-w-3xl">
                    <p className="eyebrow-label">Références de suivi</p>
                    <h2 className="mt-3 text-3xl text-white md:text-[2.6rem]">
                      Lecture simple des valeurs de départ et des priorités
                    </h2>
                    <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--ls-text-muted)]">
                      On compare la base du jour, la cible et les ecarts utiles pour rendre le suivi
                      plus simple a expliquer.
                    </p>
                  </div>
                  <StatusBadge label="Lecture comparative" tone="green" />
                </div>

                <div className="grid gap-3">
                  {comparisonRows.map((row) => (
                    <ReferenceComparisonRow
                      key={row.label}
                      label={row.label}
                      initial={row.initial}
                      current={row.current}
                      target={row.target}
                      gap={row.gap}
                      priority={row.priority}
                      tone={row.tone}
                    />
                  ))}
                </div>

              </Card>
            </div>
          )}

            {currentStep === 7 && (
              <RecommendationStepCard
                recommendations={form.recommendations}
                recommendationsContacted={form.recommendationsContacted}
                onChange={updateRecommendation}
                onToggleContacted={(value) => update("recommendationsContacted", value)}
              />
            )}

          {currentStep === 8 && (
            <VisualStepBoundary title="Petit-dejeuner">
              <BreakfastStorySlider
                breakfastContent={form.breakfastContent}
                analysis={form.breakfastAnalysis}
                onAnalysisChange={(next) => update("breakfastAnalysis", next)}
              />
            </VisualStepBoundary>
          )}

          {/* ─── Étape 9 : Dégustation (Chantier bilan updates 2026-04-20) ─── */}
          {currentStep === 9 && (
            <VisualStepBoundary title="Place à la dégustation">
              <Card className="space-y-5">
                <div>
                  <p className="eyebrow-label">Dégustation</p>
                  <h2 className="mt-2 text-2xl" style={{ fontFamily: "Syne, sans-serif", color: "var(--ls-text)" }}>
                    Je vais te faire goûter notre délicieux petit-déj, tu préfères quelle saveur ?
                  </h2>
                </div>
                <div style={{ display: "flex", justifyContent: "center" }}>
                  <img
                    src="/images/assessment/saveurs-formula1.png"
                    alt="Saveurs Formula 1 disponibles"
                    style={{ maxWidth: 500, width: "100%", height: "auto", borderRadius: 14 }}
                    onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                  />
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center" }}>
                  {[
                    "Vanille Onctueuse",
                    "Délice de Fraise",
                    "Cookie Crunch",
                    "Crème de Banane",
                    "Café Latte",
                    "Chocolat Gourmand",
                    "Menthe Chocolat",
                  ].map((flavor) => {
                    const active = form.preferredFlavor === flavor;
                    return (
                      <button
                        key={flavor}
                        type="button"
                        onClick={() => update("preferredFlavor", active ? "" : flavor)}
                        className={`ls-pill${active ? " ls-pill--selected" : ""}`}
                      >
                        {flavor}
                      </button>
                    );
                  })}
                </div>
                <p style={{ fontSize: 12, color: "var(--ls-text-hint)", textAlign: "center", margin: 0 }}>
                  Sélection facultative — tu peux passer à l'étape suivante.
                </p>
              </Card>
            </VisualStepBoundary>
          )}

          {/* ─── Étape 10 : Reconnaissance (placeholder — à remplir) ─── */}
          {currentStep === 10 && (
            <VisualStepBoundary title="Reconnaissance">
              <Card className="space-y-4">
                <div>
                  <p className="eyebrow-label">Reconnaissance</p>
                  <h2 className="mt-2 text-2xl" style={{ fontFamily: "Syne, sans-serif", color: "var(--ls-text)" }}>
                    À remplir prochainement
                  </h2>
                </div>
                <p style={{ fontSize: 14, color: "var(--ls-text-muted)", lineHeight: 1.6, margin: 0 }}>
                  Contenu en cours de préparation. Tu peux passer à l'étape suivante.
                </p>
              </Card>
            </VisualStepBoundary>
          )}

          {/* ─── Étape 11 : Notre concept de rééquilibrage alimentaire
                (renommé depuis "Routine matin" — Chantier bilan updates 2026-04-20) ─── */}
          {currentStep === 11 && (
            <VisualStepBoundary title="Notre concept de rééquilibrage alimentaire">
              <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}>
                <img
                  src="/images/assessment/petit-dejeuner-concept.png"
                  alt="Notre concept de rééquilibrage alimentaire"
                  style={{ maxWidth: 900, width: "100%", height: "auto", borderRadius: 14 }}
                  onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                />
              </div>
              <Suspense fallback={<StepVisualLoadingCard label="Chargement du concept" />}>
                <LazyMorningRoutineCard />
              </Suspense>
            </VisualStepBoundary>
          )}

          {currentStep === 12 && (
            <div className="space-y-4">
              <Card className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="eyebrow-label">Suite après le bilan</p>
                    <p className="mt-2 text-2xl text-white">La personne démarre maintenant ou revient plus tard ?</p>
                  </div>
                  <StatusBadge
                    label={startsImmediately ? "Demarrage maintenant" : "Bilan sans demarrage"}
                    tone={startsImmediately ? "green" : "amber"}
                  />
                </div>
                <ChoiceGroup
                  label="Décision du jour"
                  value={form.afterAssessmentAction}
                  options={["Demarrage maintenant", "A relancer / ne demarre pas aujourd'hui"]}
                  onChange={(value) =>
                    update(
                      "afterAssessmentAction",
                      value === "Demarrage maintenant" ? "started" : "pending"
                    )
                  }
                />
                {!startsImmediately ? (
                  <p className="text-sm leading-6 text-[var(--ls-text-muted)]">
                    Le bilan sera enregistre, la personne apparaitra en attente dans les dossiers,
                    et elle ne comptera pas dans le module PV tant qu&apos;aucun programme n&apos;est demarre.
                  </p>
                ) : null}
              </Card>

              <Card className="space-y-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="eyebrow-label">Lecture besoins</p>
                    <p className="mt-2 text-2xl text-white">Ce que le bilan fait ressortir en priorite</p>
                  </div>
                  <StatusBadge
                    label={`${recommendationPlan.needs.length} besoin${recommendationPlan.needs.length > 1 ? "s" : ""}`}
                    tone={recommendationPlan.needs.length ? "green" : "blue"}
                  />
                </div>

                {recommendationPlan.needs.length ? (
                  <div className="space-y-4">
                      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
                        <div className="space-y-4">
                          {recommendationPlan.needs.map((need) => (
                          <NeedProductGroup
                            key={`products-${need.id}`}
                            title={need.label}
                            summary={need.summary}
                            reasonLabel={need.reasonLabel}
                            products={need.products}
                            selectedProductIds={effectiveSelectedProductIds}
                            onToggleProduct={toggleSelectedProduct}
                          />
                        ))}
                      </div>
                      <ClientTotalCalculatorCard
                        programTitle={activeProgram?.title ?? "Programme a confirmer"}
                        displayedProgramPrice={displayedProgramPrice}
                        includedComposition={activeProgram?.composition ?? []}
                        addOnProducts={addOnProducts}
                        addOnProductsTotalPrice={addOnProductsTotalPrice}
                        addOnProductsTotalPv={addOnProductsTotalPv}
                        estimatedClientTotal={estimatedClientTotal}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="rounded-[24px] bg-[var(--ls-surface2)] p-5 text-sm leading-7 text-[var(--ls-text-muted)]">
                    Le bilan ne fait pas encore ressortir une priorite forte. On peut partir sur une
                    base simple, puis personnaliser au premier suivi.
                  </div>
                )}
              </Card>

              <div className="rounded-[24px] bg-[rgba(45,212,191,0.1)] p-4">
                <p className="eyebrow-label text-[#2DD4BF]/80">Programme conseille</p>
                <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xl text-white">
                      {recommendedProgram?.title ?? "Base a confirmer"}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-[var(--ls-text)]">
                      {recommendationPlan.recommendedProgramReason}
                    </p>
                  </div>
                  <span className="rounded-full bg-[rgba(45,212,191,0.12)] px-4 py-2 text-sm font-semibold text-[#2DD4BF]">
                    {recommendedProgram?.price ?? "A ajuster"}
                  </span>
                </div>
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                {mainPrograms.map((program) => (
                  <ProgramCard key={program.id} program={program} selected={form.selectedProgramId === program.id} onSelect={() => update("selectedProgramId", program.id)} />
                ))}
              </div>
                {boosterPrograms.length ? (
                  <div className="rounded-[24px] border border-white/10 bg-[var(--ls-bg)]/80 p-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="eyebrow-label">
                        Options pour booster les resultats
                      </p>
                      <p className="mt-2 text-2xl text-white">
                        Ajouter seulement ce qui sert vraiment le profil sport
                      </p>
                    </div>
                    <StatusBadge label="Options sport" tone="green" />
                  </div>
                  <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {boosterPrograms.map((program) => (
                      <ProgramBoosterCard key={program.id} program={program} />
                    ))}
                  </div>
                  </div>
                ) : null}
                {recommendationPlan.optionalUpsells.length ? (
                  <Card className="space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="eyebrow-label">Options en plus si besoin</p>
                        <p className="mt-2 text-2xl text-white">Quelques ajouts utiles sans alourdir la base</p>
                      </div>
                      <StatusBadge label={`${recommendationPlan.optionalUpsells.length} option${recommendationPlan.optionalUpsells.length > 1 ? "s" : ""}`} tone="blue" />
                    </div>
                    <div className="grid gap-3">
                      {recommendationPlan.optionalUpsells.map((product) => (
                        <SuggestedProductCard
                          key={`upsell-${product.id}`}
                          name={product.name}
                          shortBenefit={product.shortBenefit}
                          pv={product.pv}
                          prixPublic={product.prixPublic}
                          dureeReferenceJours={product.dureeReferenceJours}
                          quantityLabel={product.quantityLabel}
                          selected={effectiveSelectedProductIds.includes(product.id)}
                          onToggle={() => toggleSelectedProduct(product.id)}
                        />
                      ))}
                    </div>
                  </Card>
                ) : null}
              </div>
            )}

          {/* Ancien step Hydratation supprimé — Chantier bilan updates (2026-04-20) */}

          {currentStep === 13 && (
            <div className="space-y-4">
              {/* Mini-résumé bilan pour contexte */}
              <div className="rounded-[16px] border border-[rgba(201,168,76,0.15)] bg-[rgba(201,168,76,0.04)] p-4">
                <div className="mb-3 text-[10px] font-semibold uppercase tracking-[0.15em] text-[#C9A84C]">✦ Résumé du bilan</div>
                <div className="flex flex-wrap gap-4">
                  {form.objectiveFocus && (
                    <div><span className="text-[11px] text-[var(--ls-text-hint)]">Objectif</span><p className="text-sm font-semibold text-[var(--ls-text)]">{form.objectiveFocus}</p></div>
                  )}
                  {form.weight > 0 && (
                    <div><span className="text-[11px] text-[var(--ls-text-hint)]">Poids</span><p className="text-sm font-semibold text-[#C9A84C]">{form.weight} kg</p></div>
                  )}
                  {form.targetWeight > 0 && (
                    <div><span className="text-[11px] text-[var(--ls-text-hint)]">Objectif poids</span><p className="text-sm font-semibold text-[#2DD4BF]">{form.targetWeight} kg</p></div>
                  )}
                  {form.selectedProgramId && (
                    <div><span className="text-[11px] text-[var(--ls-text-hint)]">Programme</span><p className="text-sm font-semibold text-[var(--ls-text)]">{form.selectedProgramId}</p></div>
                  )}
                  {form.afterAssessmentAction && (
                    <div><span className="text-[11px] text-[var(--ls-text-hint)]">Démarrage</span><p className="text-sm font-semibold" style={{ color: form.afterAssessmentAction === 'started' ? '#2DD4BF' : '#C9A84C' }}>{form.afterAssessmentAction === 'started' ? 'Immédiat' : 'À relancer'}</p></div>
                  )}
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <ChoiceGroup
                  label="Décision client"
                  value={form.decisionClient === "partant" ? "Partant" : form.decisionClient === "a_rassurer" ? "A rassurer" : form.decisionClient === "a_confirmer" ? "A confirmer" : ""}
                  options={["Partant", "A rassurer", "A confirmer"]}
                  onChange={(v) =>
                    update(
                      "decisionClient",
                      v === "Partant" ? "partant" : v === "A rassurer" ? "a_rassurer" : "a_confirmer"
                    )
                  }
                />
                <ChoiceGroup
                  label="Type de suite"
                  value={
                    form.typeDeSuite === "rdv_fixe" ? "Rendez-vous fixe" :
                    form.typeDeSuite === "message_rappel" ? "Message de rappel" :
                    form.typeDeSuite === "relance_douce" ? "Relance douce" :
                    form.typeDeSuite === "suivi_libre" ? "Suivi libre" : ""
                  }
                  options={["Rendez-vous fixe", "Message de rappel", "Relance douce", "Suivi libre"]}
                  onChange={(v) =>
                    update(
                      "typeDeSuite",
                      v === "Rendez-vous fixe" ? "rdv_fixe" :
                      v === "Message de rappel" ? "message_rappel" :
                      v === "Relance douce" ? "relance_douce" :
                      "suivi_libre"
                    )
                  }
                />
                <ChoiceGroup
                  label="Message à laisser"
                  value={form.messageALaisser === "simple" ? "Simple" : form.messageALaisser === "progressif" ? "Progressif" : form.messageALaisser === "cadre_clair" ? "Cadre clair" : ""}
                  options={["Simple", "Progressif", "Cadre clair"]}
                  onChange={(v) =>
                    update(
                      "messageALaisser",
                      v === "Simple" ? "simple" : v === "Progressif" ? "progressif" : "cadre_clair"
                    )
                  }
                />
              </div>
              <p className="text-[11px] text-[var(--ls-text-muted)]">
                Ce choix affecte le statut du client dans ta base (actif / pas démarré / fragile).
              </p>
              {form.typeDeSuite === "suivi_libre" && (
                <div
                  style={{
                    padding: "10px 14px",
                    borderRadius: 12,
                    background: "color-mix(in srgb, var(--ls-gold) 8%, transparent)",
                    border: "1px solid color-mix(in srgb, var(--ls-gold) 25%, transparent)",
                    fontSize: 12,
                    color: "var(--ls-text)",
                    lineHeight: 1.5,
                  }}
                >
                  <strong style={{ color: "var(--ls-gold)" }}>✦ Suivi libre sélectionné.</strong>{" "}
                  Ce client sera actif mais sans rappel automatique dans ton agenda.
                  Tu pourras le rebasculer en suivi planifié depuis sa fiche (onglet Actions → Cycle de vie).
                </div>
              )}
              <div className="grid gap-4 md:grid-cols-2">
                <Field
                  label={form.typeDeSuite === "suivi_libre" ? "Prochain rendez-vous (facultatif)" : "Prochain rendez-vous"}
                  type="datetime-local"
                  value={form.nextFollowUp}
                  onChange={(v) => update("nextFollowUp", v)}
                  disabled={form.typeDeSuite === "suivi_libre"}
                />
                <AreaField
                  label="Commentaire libre"
                  value={form.comment}
                  onChange={(v) => update("comment", v)}
                />
              </div>
            </div>
          )}

          {currentStep === 14 && (
            <div className="space-y-4">
              <Card className="space-y-5 bg-[linear-gradient(180deg,rgba(15,23,42,0.32),rgba(15,23,42,0.52))]">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="max-w-3xl">
                    <p className="eyebrow-label">Conclusion du rendez-vous</p>
                    <p className="mt-3 text-4xl text-white">Une proposition claire, un cap simple et une suite déjà visible.</p>
                    <p className="mt-3 text-sm leading-7 text-[var(--ls-text-muted)]">
                      Cette synthese aide a reformuler le plan, confirmer le programme et terminer
                      le rendez-vous avec une direction nette.
                    </p>
                  </div>
                  <StatusBadge
                    label={startsImmediately ? "Pret a presenter" : "Pret a relancer"}
                    tone={startsImmediately ? "green" : "amber"}
                  />
                </div>

                  <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
                    <div className="space-y-4">
                    <div className="rounded-[28px] bg-[var(--ls-bg)]/60 p-5">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="eyebrow-label">Besoins detectes</p>
                          <p className="mt-3 text-3xl text-white">
                            Ce qui ressort du bilan pour lancer la routine
                          </p>
                        </div>
                        <StatusBadge
                          label={`${recommendationPlan.needs.length} priorite${recommendationPlan.needs.length > 1 ? "s" : ""}`}
                          tone={recommendationPlan.needs.length ? "green" : "blue"}
                        />
                      </div>

                      {recommendationPlan.needs.length ? (
                        <div className="mt-5 space-y-4">
                            {recommendationPlan.needs.map((need) => (
                              <NeedProductGroup
                                key={`summary-products-${need.id}`}
                              title={need.label}
                              summary={need.summary}
                              reasonLabel={need.reasonLabel}
                              products={need.products}
                              selectedProductIds={effectiveSelectedProductIds}
                              onToggleProduct={toggleSelectedProduct}
                            />
                          ))}
                        </div>
                      ) : (
                        <div className="mt-5 rounded-[22px] bg-[var(--ls-surface2)] px-4 py-4 text-sm leading-6 text-[var(--ls-text)]">
                          Une base simple suffit pour le moment. Les produits se personaliseront
                          au besoin dans le suivi.
                        </div>
                      )}
                    </div>

                    <div className="rounded-[28px] bg-[var(--ls-bg)]/60 p-5">
                      <p className="eyebrow-label">Programme conseille</p>
                      <div className="mt-4 flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="text-3xl text-white">
                            {selectedProgram?.title ?? recommendedProgram?.title ?? "Programme a confirmer"}
                          </p>
                          <p className="mt-2 text-sm leading-6 text-[var(--ls-text-muted)]">
                            {selectedProgram?.summary ??
                              recommendationPlan.recommendedProgramReason}
                          </p>
                        </div>
                        <span className="rounded-full bg-[rgba(45,212,191,0.1)] px-4 py-2 text-lg font-semibold text-[#2DD4BF]">
                          {selectedProgram?.price ?? recommendedProgram?.price ?? "Relance"}
                        </span>
                      </div>
                      <div className="mt-5 grid gap-3 md:grid-cols-3">
                        {(selectedProgram?.benefits ??
                          recommendedProgram?.benefits ?? [
                            "Base simple a demarrer",
                            "Routine facile a expliquer",
                            "Personnalisation possible ensuite"
                          ]).map((benefit) => (
                          <div
                            key={benefit}
                            className="rounded-[22px] bg-[var(--ls-surface2)] px-4 py-4 text-sm leading-6 text-[var(--ls-text)]"
                          >
                            {benefit}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                    <div className="grid gap-4">
                      <ClientTotalCalculatorCard
                        programTitle={activeProgram?.title ?? "Programme a confirmer"}
                      displayedProgramPrice={displayedProgramPrice}
                      includedComposition={activeProgram?.composition ?? []}
                      addOnProducts={addOnProducts}
                      addOnProductsTotalPrice={addOnProductsTotalPrice}
                      addOnProductsTotalPv={addOnProductsTotalPv}
                        estimatedClientTotal={estimatedClientTotal}
                      />
                      {recommendationPlan.optionalUpsells.length ? (
                        <Card className="space-y-4">
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                              <p className="eyebrow-label">Options en plus si besoin</p>
                              <p className="mt-2 text-xl text-white">Ajouts légers a proposer seulement si ca colle</p>
                            </div>
                            <StatusBadge label={`${recommendationPlan.optionalUpsells.length} option${recommendationPlan.optionalUpsells.length > 1 ? "s" : ""}`} tone="blue" />
                          </div>
                          <div className="grid gap-3">
                            {recommendationPlan.optionalUpsells.map((product) => (
                              <SuggestedProductCard
                                key={`summary-upsell-${product.id}`}
                                name={product.name}
                                shortBenefit={product.shortBenefit}
                                pv={product.pv}
                                prixPublic={product.prixPublic}
                                dureeReferenceJours={product.dureeReferenceJours}
                                quantityLabel={product.quantityLabel}
                                selected={effectiveSelectedProductIds.includes(product.id)}
                                onToggle={() => toggleSelectedProduct(product.id)}
                              />
                            ))}
                          </div>
                        </Card>
                      ) : null}
                    </div>
                  </div>
                </Card>

              {/* QR Code récap client */}
              <Card className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="eyebrow-label">Récap client</p>
                    <p className="mt-2 text-lg font-bold text-white" style={{ fontFamily: 'Syne, sans-serif' }}>
                      QR Code à scanner
                    </p>
                    <p className="mt-1 text-sm text-[var(--ls-text-muted)]">
                      Le client scanne ce code avec son téléphone pour voir son récap de bilan.
                    </p>
                  </div>
                  <div style={{
                    width: 120, height: 120, borderRadius: 14, background: 'var(--ls-surface2)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    <div style={{ textAlign: 'center', padding: 8 }}>
                      <div style={{ fontSize: 28, marginBottom: 4 }}>📱</div>
                      <div style={{ fontSize: 9, color: 'var(--ls-text-hint)', lineHeight: 1.3 }}>
                        QR disponible<br/>après enregistrement
                      </div>
                    </div>
                  </div>
                </div>
                <p className="text-[11px] text-[var(--ls-text-hint)]">
                  Le lien récap sera généré automatiquement à l'enregistrement du bilan. Le client pourra consulter ses résultats depuis son téléphone.
                </p>
              </Card>

              <div className="rounded-[24px] bg-[rgba(45,212,191,0.08)] p-5">
                <p className="eyebrow-label text-[#2DD4BF]/80">Formulation conseillee</p>
                <div className="mt-4 grid gap-2 md:grid-cols-3">
                  <ClosingLine text="On part sur une routine simple, claire et coherente avec ton objectif." />
                  <ClosingLine text="Les repères du jour servent à rendre le plan plus facile à suivre dès maintenant." />
                  <ClosingLine text="On se revoit au prochain rendez-vous pour relire les premiers effets et ajuster si besoin." />
                </div>
              </div>

              <BodyFatInsightCard
                current={{ weight: form.weight, percent: form.bodyFat }}
                objective={form.objective}
                sex={form.sex}
              />

              <MuscleMassInsightCard
                current={{ weight: form.weight, muscleMass: form.muscleMass }}
              />
            </div>
          )}

          {/* Avertissement validation */}
          {stepWarning && (
            <div className="rounded-[14px] border border-[rgba(201,168,76,0.25)] bg-[rgba(201,168,76,0.08)] px-4 py-3 text-sm text-[#C9A84C]">
              {stepWarning}
            </div>
          )}

          <div className="hidden items-center justify-between gap-3 border-t border-white/10 pt-4 md:flex">
            <Button variant="ghost" onClick={goToPreviousStep} disabled={currentStep === 0}>
              Etape precedente
            </Button>
            <div className="flex flex-wrap gap-3">
              <Button variant="secondary" onClick={() => void handleSaveAssessment()}>
                Enregistrer le bilan
              </Button>
              <Button onClick={goToNextStep} disabled={currentStep === steps.length - 1}>
                Etape suivante
              </Button>
            </div>
          </div>
          <div className="sticky bottom-20 lg:bottom-3 z-20 -mx-1 mt-2 rounded-[24px] p-3 md:hidden" style={{ background: 'var(--ls-surface)', borderTop: '1px solid var(--ls-border)', color: 'var(--ls-text)', boxShadow: '0 -4px 16px rgba(0,0,0,0.08)' }}>
            <div className="mb-3 flex items-center justify-between gap-3 px-1">
              <p className="text-[11px] uppercase tracking-[0.22em]" style={{ color: 'var(--ls-text-hint)' }}>
                Étape {currentStep + 1} / {steps.length}
              </p>
              <p className="text-xs" style={{ color: 'var(--ls-text-muted)' }}>{steps[currentStep]}</p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="ghost"
                className="w-full justify-center"
                onClick={goToPreviousStep}
                disabled={currentStep === 0}
              >
                Précédente
              </Button>
              <Button
                className="w-full justify-center"
                onClick={goToNextStep}
                disabled={currentStep === steps.length - 1}
              >
                Suivante
              </Button>
            </div>
            <Button variant="secondary" className="mt-2 w-full justify-center" onClick={() => void handleSaveAssessment()}>
              Enregistrer le bilan
            </Button>
          </div>
          {saveError ? (
            <div className="rounded-[20px] border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">
              {saveError}
            </div>
          ) : null}
        </Card>

      </div>

      {showRecapModal && recapToken && (
        <RecapModal
          clientName={recapClientName}
          recapToken={recapToken}
          onClose={() => { setShowRecapModal(false); navigate('/clients'); }}
        />
      )}
    </div>
    );
  }

function StepVisualLoadingCard({ label }: { label: string }) {
  return (
    <Card className="space-y-4">
      <p className="eyebrow-label">Chargement</p>
      <div className="rounded-[28px] bg-[var(--ls-surface2)] p-6">
        <div className="h-64 rounded-[22px] bg-[linear-gradient(135deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02))]" />
        <p className="mt-4 text-sm text-[var(--ls-text-muted)]">{label}</p>
      </div>
    </Card>
  );
}

class VisualStepBoundary extends Component<
  { title: string; children: ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(`Visual step failed: ${this.props.title}`, error, info);
  }

  private handleRetry = () => {
    this.setState({ hasError: false });
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <Card className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="eyebrow-label">Incident de chargement</p>
            <h3 className="mt-2 text-2xl text-white">{this.props.title}</h3>
          </div>
          <StatusBadge label="Brouillon conserve" tone="amber" />
        </div>
        <div className="rounded-[24px] bg-[var(--ls-surface2)] p-5">
          <p className="text-sm leading-7 text-[var(--ls-text-muted)]">
            Le visuel n&apos;a pas pu s&apos;afficher correctement. Les valeurs déjà saisies sont
            gardees automatiquement, tu peux reessayer sans perdre le bilan en cours.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Button type="button" onClick={this.handleRetry}>
              Recharger le visuel
            </Button>
          </div>
        </div>
      </Card>
    );
  }
}

function RecommendationStepCard({
  recommendations,
  recommendationsContacted,
  onChange,
  onToggleContacted
}: {
  recommendations: RecommendationLead[];
  recommendationsContacted: boolean;
  onChange: (index: number, field: keyof RecommendationLead, value: string) => void;
  onToggleContacted: (value: boolean) => void;
}) {
  const filledRecommendations = recommendations.filter(
    (item) => item.name.trim() || item.contact.trim()
  ).length;

    return (
        <div className="space-y-5">
          <Card className="space-y-5 bg-[linear-gradient(180deg,rgba(15,23,42,0.24),rgba(15,23,42,0.56))]">
            <div className="max-w-4xl">
              <p className="eyebrow-label">Moment smoothie & recommandations</p>
              <h2 className="mt-3 max-w-3xl text-2xl leading-tight text-white md:text-[2.5rem]">
                A qui aimerais-tu offrir ce moment bien-etre et nutrition ?
              </h2>
            </div>
          </Card>

        <Card className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="eyebrow-label">Liste nominative</p>
              <p className="mt-2 text-3xl text-white">Les personnes a qui offrir l&apos;experience</p>
              <p className="mt-2 max-w-3xl text-sm leading-7 text-[var(--ls-text-muted)]">
                Note simplement un prenom et un contact par ligne.
              </p>
            </div>
            <StatusBadge label={`${filledRecommendations}/10`} tone="amber" />
          </div>

          <label className="flex items-center justify-between gap-3 rounded-[22px] border border-white/10 bg-[var(--ls-surface2)] px-4 py-4">
            <div>
              <p className="text-sm font-medium text-white">Recommandations contactées</p>
              <p className="mt-1 text-sm text-[var(--ls-text-muted)]">
                Coche ici quand les contacts de ce bilan ont déjà été repris.
              </p>
            </div>
            <input
              type="checkbox"
              className="h-5 w-5 rounded border-white/15 bg-slate-950/30"
              checked={recommendationsContacted}
              onChange={(event) => onToggleContacted(event.target.checked)}
            />
          </label>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-[22px] bg-amber-400/[0.08] px-5 py-4">
              <p className="eyebrow-label text-amber-100/70">Palier cadeau 1</p>
              <p className="mt-2 text-xl text-white">A partir de 5 noms</p>
              <p className="mt-2 text-sm leading-6 text-[var(--ls-text-muted)]">Premier repère cadeau.</p>
            </div>
            <div className="rounded-[22px] bg-[rgba(201,168,76,0.08)] px-5 py-4">
              <p className="eyebrow-label text-[#2DD4BF]/70">Palier cadeau 2</p>
              <p className="mt-2 text-xl text-white">A partir de 10 noms</p>
              <p className="mt-2 text-sm leading-6 text-[var(--ls-text-muted)]">Deuxieme repère cadeau.</p>
            </div>
          </div>

        <div className="grid gap-4">
          {recommendations.map((item, index) => (
            <div key={`recommendation-${index}`} className="space-y-4">
              {(index === 5 || index === 9) && (
                <div
                  className={`rounded-[20px] px-4 py-3 text-sm ${
                    index === 5
                      ? "bg-amber-400/[0.08] text-amber-50"
                      : "bg-[rgba(201,168,76,0.08)] text-[#F0C96A]"
                  }`}
                  >
                    {index === 5
                      ? "Palier cadeau 1 atteint."
                      : "Palier cadeau 2 atteint."}
                  </div>
                )}
              <div className="grid gap-4 rounded-[26px] bg-[linear-gradient(180deg,rgba(2,6,23,0.4),rgba(15,23,42,0.28))] p-5 lg:grid-cols-[110px_1.1fr_1.3fr]">
                <div className="flex min-h-[72px] items-center justify-center rounded-[20px] bg-[var(--ls-surface2)] px-4 py-3 text-base font-semibold text-white">
                  Reco {index + 1}
                </div>
                <RecommendationLineField
                  label="Nom / prenom"
                  value={item.name}
                  onChange={(value) => onChange(index, "name", value)}
                />
                <RecommendationLineField
                  label="Numero de telephone ou reseau"
                  value={item.contact}
                  onChange={(value) => onChange(index, "contact", value)}
                />
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function RecommendationLineField({
  label,
  value,
  onChange
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block space-y-3">
      <span className="text-sm font-medium text-[var(--ls-text-muted)]">{label}</span>
      <div className="relative rounded-[20px] bg-white/[0.02] px-4 py-4">
        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="w-full border-0 bg-transparent px-0 pb-2 text-base text-white placeholder:text-[var(--ls-text-hint)] focus:outline-none focus:ring-0"
          placeholder="Noter ici"
        />
        <div className="pointer-events-none absolute bottom-3 left-4 right-4 h-px bg-[linear-gradient(90deg,rgba(255,255,255,0.25),rgba(255,255,255,0.06))]" />
      </div>
    </label>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  step,
  disabled = false,
  prefilled = false
}: {
  label: string;
  value: string | number;
  onChange: (value: string) => void;
  type?: string;
  step?: string;
  disabled?: boolean;
  prefilled?: boolean;
}) {
  // Chantier Prospects : style vert visible pour les champs pré-remplis depuis
  // un prospect. Se dissipe dès que le coach édite le champ (prefilledFields[key]→false).
  const prefillStyle: React.CSSProperties | undefined = prefilled
    ? {
        background: "color-mix(in srgb, var(--ls-teal) 14%, transparent)",
        color: "var(--ls-teal)",
        border: "1px solid var(--ls-teal)",
        fontWeight: 600,
      }
    : undefined;
  const inputClassName = type === "time" ? "ls-input-time" : undefined;
  return (
    <div className="space-y-2" style={disabled ? { opacity: 0.5 } : undefined}>
      <label className="ls-field-label">
        {label}{prefilled && <span style={{ marginLeft: 6, fontSize: 10, color: "var(--ls-teal)" }}>✦ pré-rempli</span>}
      </label>
      {type === "number" ? (
        <DecimalInput value={Number(value) || 0} onChange={onChange} step={step} />
      ) : (
        <input
          type={type}
          step={step}
          value={value}
          disabled={disabled}
          onChange={(event) => onChange(event.target.value)}
          className={inputClassName}
          style={prefillStyle}
        />
      )}
    </div>
  );
}

function ClothingSizeSelect({
  label,
  value,
  sex,
  onChange,
}: {
  label: string;
  value: string;
  sex: BiologicalSex;
  onChange: (value: string) => void;
}) {
  const femaleSizes = [34, 36, 38, 40, 42, 44, 46, 48, 50, 52, 54, 56];
  const maleSizes = [38, 40, 42, 44, 46, 48, 50, 52, 54, 56, 58, 60];
  const sizes =
    sex === "female" ? femaleSizes : sex === "male" ? maleSizes : Array.from(new Set([...femaleSizes, ...maleSizes])).sort((a, b) => a - b);

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-[var(--ls-text-muted)]">{label}</label>
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">— Choisir —</option>
        {sizes.map((size) => (
          <option key={size} value={size}>{size}</option>
        ))}
      </select>
    </div>
  );
}

function DecimalInput({
  value,
  onChange,
  step
}: {
  value: number;
  onChange: (value: string) => void;
  step?: string;
}) {
  const [draft, setDraft] = useState(formatEditableNumber(value));

  useEffect(() => {
    setDraft(formatEditableNumber(value));
  }, [value]);

  return (
    <input
      type="text"
      inputMode="decimal"
      pattern="[0-9]*[.,]?[0-9]*"
      placeholder="—"
      value={draft}
      onFocus={(e) => e.currentTarget.select()}
      onChange={(event) => {
        const nextValue = event.target.value.replace(/\s+/g, "");
        if (!/^\d*([.,]\d*)?$/.test(nextValue)) {
          return;
        }

        setDraft(nextValue);
        const normalized = nextValue.replace(",", ".");
        if (normalized === "" || normalized === ".") {
          onChange("0");
          return;
        }

        onChange(normalized);
      }}
      onBlur={() => {
        const normalized = draft.replace(",", ".");
        if (normalized === "" || normalized === ".") {
          setDraft("");
          onChange("0");
          return;
        }

        const parsed = Number(normalized);
        if (Number.isNaN(parsed)) {
          setDraft(formatEditableNumber(value));
          return;
        }

        const formatted = formatEditableNumber(parsed);
        setDraft(formatted);
        onChange(formatted);
      }}
      step={step}
    />
  );
}

function AreaField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void; }) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-[var(--ls-text-muted)]">{label}</label>
      <textarea rows={4} value={value} onChange={(event) => onChange(event.target.value)} />
    </div>
  );
}

function ChoiceGroup({
  label,
  value,
  options,
  onChange,
  formatOption
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
  formatOption?: (value: string) => string;
}) {
  return (
    <div className="space-y-2">
      <label className="ls-field-label">{label}</label>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const isSelected = value === option;
          return (
            <button
              key={option}
              type="button"
              onClick={() => onChange(option)}
              className={`ls-pill${isSelected ? " ls-pill--selected" : ""}`}
              aria-pressed={isSelected}
            >
              {isSelected && (
                <svg className="ls-pill__check" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              )}
              {formatOption ? formatOption(option) : option}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function NeedProductGroup({
  title,
  summary,
  reasonLabel,
  products,
  selectedProductIds,
  onToggleProduct
  }: {
    title: string;
    summary: string;
    reasonLabel: string;
    products: Array<{
      id: string;
      name: string;
      shortBenefit: string;
      pv: number;
      prixPublic: number;
      dureeReferenceJours: number;
      quantityLabel?: string;
      reasonLabel: string;
    }>;
    selectedProductIds: string[];
    onToggleProduct: (productId: string) => void;
}) {
  if (!products.length) {
    return null;
  }

  return (
    <div className="rounded-[22px] border border-white/10 bg-white/[0.02] p-4">
      <div className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="max-w-3xl space-y-2">
            <div className="flex flex-wrap items-center gap-3">
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[var(--ls-text-muted)]">
                {title}
              </p>
              <StatusBadge label={`${products.length} repere${products.length > 1 ? "s" : ""}`} tone="blue" />
            </div>
            <p className="text-lg font-medium text-white">{summary}</p>
            <p className="text-sm leading-6 text-[var(--ls-text-muted)]">{reasonLabel}</p>
          </div>
        </div>
        <div className="grid gap-3">
          {products.map((product) => (
            <SuggestedProductCard
              key={product.id}
              name={product.name}
              shortBenefit={product.shortBenefit}
              pv={product.pv}
              prixPublic={product.prixPublic}
              dureeReferenceJours={product.dureeReferenceJours}
              quantityLabel={product.quantityLabel}
              selected={selectedProductIds.includes(product.id)}
              onToggle={() => onToggleProduct(product.id)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function SuggestedProductCard({
  name,
  shortBenefit,
  pv,
  prixPublic,
  dureeReferenceJours,
  quantityLabel,
  selected,
  onToggle
}: {
  name: string;
  shortBenefit: string;
  pv: number;
  prixPublic: number;
  dureeReferenceJours: number;
  quantityLabel?: string;
  selected: boolean;
  onToggle: () => void;
}) {
  return (
    <div
      className={`rounded-[20px] p-3.5 transition ${
        selected
          ? "border border-[rgba(45,212,191,0.25)] bg-[rgba(45,212,191,0.09)]"
          : "bg-[var(--ls-surface2)]"
      }`}
    >
      <div className="flex h-full flex-col gap-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-1.5">
            <p className="text-lg font-semibold text-white">{name}</p>
            <p className="text-sm leading-6 text-[var(--ls-text-muted)]">{shortBenefit}</p>
          </div>
          <button
            type="button"
            onClick={onToggle}
            className={`inline-flex min-h-[34px] shrink-0 items-center justify-center rounded-full px-3.5 py-1.5 text-sm font-semibold transition ${
              selected
                ? "bg-white text-[#0B0D11]"
                : "border border-white/10 bg-[var(--ls-surface2)] text-white hover:bg-white/[0.08]"
            }`}
          >
            {selected ? "Retenu" : "Retenir"}
          </button>
        </div>
        <div className="mt-auto flex flex-wrap items-center gap-2">
          {quantityLabel ? (
            <span className="rounded-full bg-[var(--ls-surface2)] px-3 py-1 text-sm font-medium text-[var(--ls-text)]">
              {quantityLabel}
            </span>
          ) : null}
          <span className="rounded-full bg-[var(--ls-surface2)] px-3 py-1 text-sm font-medium text-[var(--ls-text)]">
            {dureeReferenceJours} jours
          </span>
          <span className="rounded-full bg-[rgba(45,212,191,0.1)] px-3 py-1 text-sm font-semibold text-[#2DD4BF]">
            {formatPriceEuro(prixPublic)}
          </span>
          <span className="rounded-full bg-[rgba(45,212,191,0.1)] px-3 py-1 text-sm font-semibold text-[#2DD4BF]">
            {formatPv(pv)}
          </span>
        </div>
      </div>
    </div>
  );
}

function TimelineChoiceField({
  label,
  value,
  options,
  onChange
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  const isCustom = Boolean(value && !options.includes(value));

  return (
    <div className="space-y-3">
      <label className="ls-field-label">{label}</label>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const isActive = value === option;
          return (
            <button
              key={option}
              type="button"
              onClick={() => onChange(option)}
              className={`ls-pill${isActive ? " ls-pill--selected" : ""}`}
              aria-pressed={isActive}
            >
              {isActive && (
                <svg className="ls-pill__check" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              )}
              {option}
            </button>
          );
        })}
        <button
          type="button"
          onClick={() => {
            if (!isCustom) {
              onChange("");
            }
          }}
          className={`ls-pill${isCustom ? " ls-pill--selected" : ""}`}
          aria-pressed={isCustom}
          style={!isCustom ? { borderStyle: "dashed" } : undefined}
        >
          {isCustom && (
            <svg className="ls-pill__check" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          )}
          Choix libre
        </button>
      </div>
      <input
        value={isCustom ? value : ""}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Ex : 2 mois, 4 mois, 5 mois"
      />
      <p className="text-xs leading-6 text-[var(--ls-text-muted)]">
        Tu peux choisir un délai rapide ou écrire librement un cap simple comme 2 mois, 4 mois ou
        5 mois.
      </p>
    </div>
  );
}

function SectionBlock({ title, description, children }: { title: string; description: string; children: ReactNode; }) {
  return (
    <div className="rounded-[24px] bg-[var(--ls-surface2)] p-5">
      <h3 className="ls-block-title">{title}</h3>
      <p className="ls-block-desc">{description}</p>
      <div className="space-y-4">{children}</div>
    </div>
  );
}



function ClosingLine({ text }: { text: string }) {
  return <div className="rounded-2xl bg-[var(--ls-bg)]/60 px-4 py-3 text-sm leading-6 text-white">{text}</div>;
}

function SummaryHighlightCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[22px] bg-[var(--ls-surface2)] px-4 py-4">
      <p className="text-[11px] font-medium text-[var(--ls-text-hint)]">{label}</p>
      <p className="mt-3 text-lg font-semibold text-white">{value}</p>
    </div>
  );
}

function ClientTotalCalculatorCard({
  programTitle,
  displayedProgramPrice,
  includedComposition,
  addOnProducts,
  addOnProductsTotalPrice,
  addOnProductsTotalPv,
  estimatedClientTotal
}: {
  programTitle: string;
  displayedProgramPrice: string;
  includedComposition: string[];
  addOnProducts: Array<{
    id: string;
    name: string;
    prixPublic: number;
    pv: number;
  }>;
  addOnProductsTotalPrice: number;
  addOnProductsTotalPv: number;
  estimatedClientTotal: number;
}) {
  return (
      <div className="rounded-[28px] border border-[rgba(201,168,76,0.16)] bg-gradient-to-br from-[rgba(201,168,76,0.12)] via-slate-950/24 to-[rgba(45,212,191,0.06)] p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="eyebrow-label text-[#2DD4BF]/80">Lecture simple</p>
            <p className="mt-2 text-2xl text-white">Ticket du jour</p>
          </div>
          <StatusBadge label={addOnProducts.length ? "Programme + ajouts" : "Programme seul"} tone="blue" />
        </div>

      <div className="mt-5 space-y-3">
        <div className="rounded-[22px] bg-[var(--ls-surface2)] px-4 py-4">
          <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-[var(--ls-text-hint)]">Base choisie</p>
            <div className="mt-3 flex items-start justify-between gap-3">
              <div>
                <p className="text-lg font-semibold text-white">{programTitle}</p>
                <p className="mt-2 text-sm leading-6 text-[var(--ls-text-muted)]">
                  {includedComposition.length ? includedComposition.join(" • ") : "Composition a confirmer"}
                </p>
              </div>
              <span className="rounded-full bg-[var(--ls-surface2)] px-3 py-1.5 text-sm font-semibold text-white">
                {displayedProgramPrice || "A confirmer"}
              </span>
            </div>
            <div className="mt-3 flex items-center justify-between gap-3 rounded-[16px] bg-slate-950/22 px-3.5 py-2.5">
              <p className="text-sm text-[var(--ls-text-muted)]">Base choisie</p>
              <p className="text-sm font-semibold text-white">{displayedProgramPrice || "A confirmer"}</p>
            </div>
          </div>

        <div className="rounded-[22px] bg-[var(--ls-surface2)] px-4 py-4">
          <div className="flex items-center justify-between gap-3">
              <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-[var(--ls-text-hint)]">Ajouts</p>
            <span className="text-sm font-semibold text-white">{addOnProducts.length}</span>
          </div>
          {addOnProducts.length ? (
            <div className="mt-3 space-y-2">
                {addOnProducts.map((product) => (
                  <div
                    key={product.id}
                    className="flex items-center justify-between gap-3 rounded-[16px] bg-[var(--ls-bg)]/60 px-3.5 py-3"
                  >
                    <div>
                      <p className="text-sm font-semibold text-white">{product.name}</p>
                      <p className="mt-1 text-xs text-[var(--ls-text-muted)]">{formatPv(product.pv)}</p>
                    </div>
                    <p className="text-sm font-semibold text-[#2DD4BF]">+ {formatPriceEuro(product.prixPublic)}</p>
                  </div>
                ))}
              </div>
          ) : (
            <p className="mt-3 text-sm leading-6 text-[var(--ls-text-muted)]">
              Aucun supplément ajouté pour l&apos;instant.
            </p>
          )}
        </div>

          <div className="grid gap-3 md:grid-cols-3">
            <SummaryHighlightCard label="Base choisie" value={displayedProgramPrice || "A confirmer"} />
            <SummaryHighlightCard label="Total ajouts" value={addOnProducts.length ? formatPriceEuro(addOnProductsTotalPrice) : "0.00 EUR"} />
            <SummaryHighlightCard label="PV ajouts" value={addOnProducts.length ? formatPv(addOnProductsTotalPv) : "0.00 PV"} />
          </div>

          <div className="rounded-[22px] border border-[rgba(45,212,191,0.18)] bg-[rgba(45,212,191,0.1)] px-4 py-4">
            <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-[#2DD4BF]/70">Total a prevoir aujourd&apos;hui</p>
            <div className="mt-3 flex items-center justify-between gap-3">
              <p className="text-base text-[#2DD4BF]">Base choisie + ajouts</p>
              <p className="text-2xl font-semibold text-white">
                {estimatedClientTotal > 0 ? formatPriceEuro(estimatedClientTotal) : "A definir"}
              </p>
          </div>
        </div>
      </div>
    </div>
  );
}


function ReferenceComparisonRow({
  label,
  initial,
  current,
  target,
  gap,
  priority,
  tone
}: {
  label: string;
  initial: string;
  current: string;
  target: string;
  gap: string;
  priority: string;
  tone: "blue" | "green" | "amber" | "red";
}) {
  const toneClass =
    tone === "green"
      ? "bg-[rgba(45,212,191,0.1)] text-[#2DD4BF]"
      : tone === "red"
        ? "bg-rose-400/10 text-rose-100"
        : tone === "amber"
          ? "bg-amber-400/10 text-amber-100"
          : "bg-[rgba(45,212,191,0.1)] text-[#2DD4BF]";

  return (
    <div className="grid gap-3 rounded-[24px] border border-white/10 bg-[var(--ls-surface2)] px-4 py-4 md:grid-cols-[1.1fr_repeat(4,minmax(0,0.8fr))_minmax(0,1fr)] md:items-center">
      <div>
        <p className="text-base font-semibold text-white">{label}</p>
      </div>
      <ReferenceDatum label="Depart" value={initial} />
      <ReferenceDatum label="Aujourd'hui" value={current} />
      <ReferenceDatum label="Cible" value={target} />
      <ReferenceDatum label="Ecart" value={gap} />
      <div className="rounded-[18px] bg-[var(--ls-bg)]/60 px-3.5 py-3">
        <p className="text-[11px] font-medium text-[var(--ls-text-hint)]">Priorite</p>
        <p className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${toneClass}`}>
          {priority}
        </p>
      </div>
    </div>
  );
}

function ReferenceDatum({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[18px] bg-[var(--ls-bg)]/60 px-3.5 py-3">
      <p className="text-[11px] font-medium text-[var(--ls-text-hint)]">{label}</p>
      <p className="mt-2 text-sm font-semibold text-white">{value}</p>
    </div>
  );
}

function getBodyFatTargetRange(sex: BiologicalSex, objective: Objective) {
  if (sex === "male") {
    if (objective === "sport") {
      return { min: 10, max: 15 };
    }

    if (objective === "weight-loss") {
      return { min: 14, max: 20 };
    }

    return { min: 12, max: 20 };
  }

  if (objective === "sport") {
    return { min: 18, max: 24 };
  }

  if (objective === "weight-loss") {
    return { min: 24, max: 30 };
  }

  return { min: 22, max: 30 };
}

function getHydrationReference(sex: BiologicalSex) {
  if (sex === "male") {
    return { min: 50, max: 65 };
  }

  return { min: 45, max: 60 };
}

function getRangeGapLabel(value: number, range: { min: number; max: number }, unit: string) {
  if (value < range.min) {
    return `${formatSignedValue(value - range.min, unit)}`;
  }

  if (value > range.max) {
    return `${formatSignedValue(value - range.max, unit)}`;
  }

  return "Dans la cible";
}

function getBodyFatPriority(value: number, range: { min: number; max: number }) {
  if (value > range.max) {
    return "A reduire progressivement";
  }

  if (value < range.min) {
    return "A surveiller";
  }

  return "Dans la cible";
}

function getHydrationPriority(value: number, range: { min: number; max: number }) {
  if (value < range.min) {
    return "Hydratation a renforcer";
  }

  if (value > range.max) {
    return "Lecture a surveiller";
  }

  return "Hydratation stable";
}

function getVisceralPriority(value: number) {
  if (value <= 6) {
    return "Repère sain";
  }

  if (value <= 12) {
    return "A surveiller";
  }

  return "Priorite de suivi";
}

function formatRawNumber(value: number) {
  if (!Number.isFinite(value)) {
    return "0";
  }

  const rounded = Number(value.toFixed(1));
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

function formatEditableNumber(value: number) {
  if (!Number.isFinite(value) || value === 0) {
    return "";
  }

  const asString = String(value);
  return asString.endsWith(".0") ? asString.slice(0, -2) : asString;
}

function formatPriceEuro(value: number) {
  return `${value.toFixed(2)} EUR`;
}

function formatPv(value: number) {
  return `${value.toFixed(2)} PV`;
}

function parsePriceValue(value: string) {
  const normalized = String(value)
    .replace(",", ".")
    .match(/-?\d+(?:\.\d+)?/g);

  if (!normalized?.length) {
    return 0;
  }

  return normalized
    .map((part) => Number(part))
    .filter((part) => Number.isFinite(part))
    .reduce((total, part) => total + part, 0);
}

function formatValue(value: number, unit: string) {
  return `${formatRawNumber(value)} ${unit}`;
}

function formatSignedValue(value: number, unit: string) {
  const rounded = Number(value.toFixed(1));
  if (Math.abs(rounded) < 0.05) {
    return `0 ${unit}`;
  }

  const prefix = rounded > 0 ? "+" : "";
  return `${prefix}${formatRawNumber(rounded)} ${unit}`;
}


function PlateChartSvg({ legumes, proteines, glucides }: { legumes: number; proteines: number; glucides: number }) {
  const total = legumes + proteines + glucides
  const toRad = (pct: number) => (pct / total) * 2 * Math.PI
  const R = 80, cx = 90, cy = 90
  function slice(startAngle: number, pct: number, color: string) {
    const endAngle = startAngle + toRad(pct)
    const x1 = cx + R * Math.sin(startAngle), y1 = cy - R * Math.cos(startAngle)
    const x2 = cx + R * Math.sin(endAngle), y2 = cy - R * Math.cos(endAngle)
    const largeArc = pct / total > 0.5 ? 1 : 0
    return <path d={`M ${cx} ${cy} L ${x1.toFixed(1)} ${y1.toFixed(1)} A ${R} ${R} 0 ${largeArc} 1 ${x2.toFixed(1)} ${y2.toFixed(1)} Z`} fill={color} opacity={0.85} />
  }
  const a1 = 0, a2 = a1 + toRad(legumes), a3 = a2 + toRad(proteines)
  return (
    <svg width="180" height="180" viewBox="0 0 180 180" style={{ flexShrink: 0 }}>
      <circle cx={cx} cy={cy} r={R + 4} fill="var(--ls-surface2)" stroke="var(--ls-border)" strokeWidth="1"/>
      {slice(a1, legumes, '#0D9488')}
      {slice(a2, proteines, '#B8922A')}
      {slice(a3, glucides, '#7C3AED')}
      <circle cx={cx} cy={cy} r={36} fill="var(--ls-surface)"/>
      <circle cx={cx} cy={cy} r={R + 4} fill="none" stroke="var(--ls-border)" strokeWidth="1.5"/>
      <text x={cx} y={cy - 4} textAnchor="middle" fontSize="9" fill="var(--ls-text-hint)">Mon</text>
      <text x={cx} y={cy + 8} textAnchor="middle" fontSize="9" fill="var(--ls-text-hint)">assiette</text>
    </svg>
  )
}

function MacroCardItem({ color, bg, border, label, pct, desc, fraction }: { color: string; bg: string; border: string; label: string; pct: number; desc: string; fraction: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 13px', background: bg, border: `1px solid ${border}`, borderRadius: 12 }}>
      <div style={{ width: 10, height: 10, borderRadius: 3, background: color, flexShrink: 0 }}/>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 11, color, fontWeight: 600, marginBottom: 1 }}>{label} · {pct}%</div>
        <div style={{ fontSize: 11, color: 'var(--ls-text-muted)' }}>{desc}</div>
      </div>
      <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 22, fontWeight: 800, color, flexShrink: 0 }}>{fraction}</div>
    </div>
  )
}
