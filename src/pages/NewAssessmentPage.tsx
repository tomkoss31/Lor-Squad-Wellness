import { useState, type ReactNode } from "react";
import { lazy } from "react";
import { Suspense } from "react";
import { StepRail } from "../components/assessment/StepRail";
import { useEffect } from "react";
import { useRef } from "react";
import { Component, type ErrorInfo } from "react";
import { useNavigate } from "react-router-dom";
import { BodyFatInsightCard } from "../components/body-scan/BodyFatInsightCard";
import { HydrationVisceralInsightCard } from "../components/body-scan/HydrationVisceralInsightCard";
import { MuscleMassInsightCard } from "../components/body-scan/MuscleMassInsightCard";
import { PlateGuideCard } from "../components/education/PlateGuideCard";
import { ProgramBoosterCard } from "../components/programs/ProgramBoosterCard";
import { WeightGoalInsightCard } from "../components/education/WeightGoalInsightCard";
import { ProgramCard } from "../components/programs/ProgramCard";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { PageHeading } from "../components/ui/PageHeading";
import { StatusBadge } from "../components/ui/StatusBadge";
import { useAppContext } from "../context/AppContext";
import { getAccessibleOwnerIds, getRoleLabel, isAdmin } from "../lib/auth";
import {
  calculateProteinRange,
  calculateWaterNeed,
  estimateBodyFatKg,
  estimateHydrationKg,
  estimateMuscleMassPercent,
  formatDateTime,
  normalizeDateTimeLocalInputValue,
  serializeDateTimeForStorage,
  getWeightLossPaceInsight,
  getWeightLossPlan,
  normalizeTimelineLabel
} from "../lib/calculations";
import { buildAssessmentRecommendationPlan } from "../lib/assessmentRecommendations";
import type { BiologicalSex, Objective, RecommendationLead } from "../types/domain";

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
  selectedProductIds: []
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
        recommendationsContacted: parsed.form.recommendationsContacted ?? false
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

const steps = [
  "Informations client",
  "Habitudes de vie et repas",
  "Qualité alimentaire et boissons",
  "Santé, objectif, activité et freins",
  "Composition des repas",
  "Body scan",
  "Références de suivi",
  "Recommandations",
  "Petit-déjeuner",
  "Routine matin",
  "Programme proposé",
  "Hydratation & routine du matin",
  "Suite du suivi",
  "Résumé du rendez-vous"
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

const LazyBreakfastComparison = lazy(() =>
  import("../components/education/BreakfastComparison").then((module) => ({
    default: module.BreakfastComparison
  }))
);

const LazyMorningRoutineCard = lazy(() =>
  import("../components/education/MorningRoutineCard").then((module) => ({
    default: module.MorningRoutineCard
  }))
);

const LazyHydrationRoutinePrimerCard = lazy(() =>
  import("../components/education/HydrationRoutinePrimerCard").then((module) => ({
    default: module.HydrationRoutinePrimerCard
  }))
);

export function NewAssessmentPage() {
  const navigate = useNavigate();
  const { programs, users, currentUser, createClientWithInitialAssessment } = useAppContext();
  const stepRailRef = useRef<HTMLDivElement | null>(null);
  const [form, setForm] = useState(initialForm);
  const [currentStep, setCurrentStep] = useState(0);
  const [saveError, setSaveError] = useState("");
  const [assignedUserId, setAssignedUserId] = useState("");
  const [draftReady, setDraftReady] = useState(false);

  useEffect(() => {
    const draft = readAssessmentDraft();
    if (draft) {
      setForm(draft.form);
      setCurrentStep(draft.currentStep);
      setAssignedUserId(draft.assignedUserId);
    }

    setDraftReady(true);
  }, []);

  const goToStep = (nextStep: number) => {
    setCurrentStep(Math.min(Math.max(nextStep, 0), steps.length - 1));
  };

  const goToPreviousStep = () => {
    goToStep(currentStep - 1);
  };

  const goToNextStep = () => {
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
  const waterNeed = calculateWaterNeed(form.weight);
  const timelineLabel = normalizeTimelineLabel(form.desiredTimeline);
  const proteinRange = calculateProteinRange(form.weight, form.objective, form.desiredTimeline);
  const bodyFatKg = estimateBodyFatKg(form.weight, form.bodyFat);
  const musclePercent = estimateMuscleMassPercent(form.weight, form.muscleMass);
  const hydrationKg = estimateHydrationKg(form.weight, form.hydration);
  const weightLossPlan = getWeightLossPlan(form.weight, form.targetWeight, form.desiredTimeline);
  const weightLossPace = getWeightLossPaceInsight(weightLossPlan);
  const weeklyWeightTarget =
    form.objective === "weight-loss" &&
    !weightLossPlan.isAchieved &&
    weightLossPlan.targetWeight != null &&
    weightLossPlan.days > 0
      ? Number(((weightLossPlan.remainingKg / weightLossPlan.days) * 7).toFixed(1))
      : 0;
  const bodyScanAttention =
    form.hydration < 50
      ? "Hydratation a renforcer en priorite."
      : form.bodyFat > 28 && form.objective !== "sport"
        ? "La masse grasse sera un bon repere de progression."
        : form.muscleMass < 28 && form.objective === "sport"
          ? "La masse musculaire sera le point a suivre de pres."
          : "Le suivi pourra surtout s'appuyer sur la regularite du plan.";
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
    form.visceralFat > 6 ? `+${formatRawNumber(form.visceralFat - 6)}` : "Dans le repere";
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
  const supportReferences = [
    {
      label: "Objectif eau quotidien",
      value: `${formatRawNumber(waterNeed)} L / jour`
    },
    {
      label: "Protéines conseillées",
      value: proteinRange
    },
    {
      label: "Délai retenu",
      value: timelineLabel
    }
  ];
  const bodyScanExpressItems = [
    { label: "Poids", value: formatValue(form.weight, "kg") },
    { label: "Masse grasse", value: `${formatRawNumber(form.bodyFat)} %` },
    { label: "Masse musculaire", value: formatValue(form.muscleMass, "kg") },
    { label: "Hydratation", value: `${formatRawNumber(form.hydration)} %` },
    { label: "Viscérale", value: formatRawNumber(form.visceralFat) }
  ];
  const followUpPriorities = [
    getHydrationPriority(form.hydration, hydrationReference),
    form.objective === "sport" ? "Masse musculaire a developper" : "Masse musculaire a preserver",
    getVisceralPriority(form.visceralFat),
    getBodyFatPriority(form.bodyFat, bodyFatTarget)
  ].filter((value, index, values) => values.indexOf(value) === index);
  const recommendationCount = form.recommendations.filter(
    (item) => item.name.trim() || item.contact.trim()
  ).length;
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
  const selectedRecommendationProducts = recommendationPlan.needs
    .flatMap((need) => need.products)
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
  const shouldHideStepSidebar = currentStep === 10 || currentStep === 13;

  useEffect(() => {
    if (currentStep !== 10) {
      return;
    }

    if (form.selectedProductIds.length || !defaultSuggestedProductIds.length) {
      return;
    }

    update("selectedProductIds", defaultSuggestedProductIds);
  }, [currentStep, defaultSuggestedProductIds, form.selectedProductIds.length]);

  const prompts =
    currentStep === 1
      ? [
          "On commence par comprendre le rythme de vie avant de parler de programme.",
          "Le petit-dejeuner et l'organisation des repas donnent souvent la cle du rendez-vous.",
          "Chercher ce qui est tenable dans la vraie vie, pas la perfection."
        ]
      : currentStep === 2
        ? [
            "Faire decrire simplement le midi, le soir et les moments de grignotage.",
            "Repère utile : eau, café, boissons sucrées et alcool changent souvent la lecture.",
            "Ne pas multiplier les details, rester sur les habitudes qui reviennent."
          ]
        : currentStep === 3
          ? [
              "On affine ici avec les points sante utiles a connaitre sans casser le rythme du rendez-vous.",
              "Allergies, transit et contexte pathologique servent a poser un cadre simple et securisant.",
              "Ensuite, on relie l'activite et les freins a l'accompagnement."
            ]
          : currentStep === 4
            ? [
                "Avant le body scan, donner déjà un repère concret sur la composition des repas.",
                "L'assiette doit aider le client a visualiser quoi mettre dans son quotidien.",
                "Rester simple: volume, proteines, glucides bien places."
              ]
          : currentStep === 5
            ? [
                "Toutes les mesures body scan sont reunies ici sur une seule page.",
                "On pose un relevé de départ clair avant de parler objectif.",
                "Rester factuel, simple et lisible en rendez-vous."
              ]
          : currentStep === 6
            ? [
                "Cette page sert à transformer les chiffres en repères de suivi.",
                "On compare la base du jour, la cible et les priorités sans complexifier.",
                "L'objectif est de rendre le suivi facile a reformuler."
              ]
          : currentStep === 7
            ? [
                "Ouvrir simplement le sujet, puis laisser noter.",
                "Rester leger et sans pression.",
                "Aller vite vers la saisie des noms."
              ]
          : currentStep === 8
            ? [
                "Comparer un matin improvise a un matin structure.",
                "Faire ressortir proteines, hydratation et regularite.",
                "Le client doit se reconnaitre rapidement."
              ]
          : currentStep === 9
            ? [
                "La routine matin doit paraitre simple, premium et facile a expliquer.",
                "On montre peu d'elements, mais bien choisis.",
                "Le visuel principal doit faire une grande partie du travail."
              ]
          : currentStep === 10
            ? [
                "Presenter le programme comme une reponse simple au besoin du client.",
                "Relier le choix du programme aux habitudes observees pendant le bilan.",
                "Rester dans une logique d'accompagnement, pas de pression."
              ]
          : currentStep === 11
            ? [
                "Cette page sert de synthese pedagogique avant le demarrage.",
                "On ancre les bases du matin et de l'hydratation dans l'esprit du client.",
                "Le but est de rassurer, pas d'ajouter une couche de complexite."
              ]
            : currentStep >= 12
              ? [
                  "Toujours finir avec une suite claire et un rendez-vous déjà posé.",
                  "Le client doit repartir avec des repères simples à retenir.",
                  "La conclusion doit rassurer et donner envie d'avancer."
                ]
              : [
                  "Faire simple, humain et progressif.",
                  "Relier chaque explication au quotidien du client.",
                  "Utiliser les chiffres comme des repères et non comme une pression."
                ];

  const rightPanelPoints =
    currentStep === 0
      ? [
          `Responsable : ${assignedUser?.name ?? "-"}`,
          `Invite par : ${form.referredByName || "Non renseigne"}`,
          `Objectif : ${form.objectiveFocus}`,
          `Sante : ${form.healthStatus}`,
          form.objective === "weight-loss"
            ? `Poids cible : ${form.targetWeight} kg`
            : `Delai : ${timelineLabel}`
        ]
      : currentStep === 1
        ? [`Sommeil : ${form.sleepHours} h`, `Petit-dejeuner : ${form.breakfastFrequency}`, `Repas reguliers : ${form.regularMealTimes}`]
      : currentStep === 2
          ? [`Eau actuelle : ${form.waterIntake} L`, `Grignotage : ${form.snackingFrequency}`, `Cafe : ${form.drinksCoffee === "Oui" ? `${form.coffeePerDay} / jour` : "Non"}`]
          : currentStep === 3
              ? [
                  `Allergies : ${form.allergies}`,
                  `Transit : ${form.transitStatus}`,
                  `Contexte : ${form.pathologyContext}`,
                  `Blocage principal : ${form.mainBlocker}`
                ]
            : currentStep === 4
              ? [
                  form.objective === "sport"
                    ? "Assiette sport plus complete"
                    : "Assiette simple pour perdre du poids",
                  "Montrer d'abord les volumes puis les portions main",
                  "Le client doit repartir avec un repere facile a refaire"
                ]
              : currentStep === 5
                ? [
                    `Poids de départ : ${formatValue(form.weight, "kg")}`,
                    `Hydratation : ${formatRawNumber(form.hydration)} %`,
                    `Graisse viscérale : ${formatRawNumber(form.visceralFat)}`,
                    `Masse grasse : ${formatRawNumber(form.bodyFat)} %`,
                    `Masse musculaire : ${formatValue(form.muscleMass, "kg")}`
                  ]
              : currentStep === 6
                ? [
                    `Poids cible : ${weightTargetLabel}`,
                    `Hydratation cible : ${hydrationTargetLabel}`,
                    `Protéines conseillées : ${proteinRange}`,
                    followUpPriorities[0] ?? bodyScanAttention
                  ]
              : currentStep === 7
                ? [
                    `Recommandations notees : ${recommendationCount}`,
                    "Ouvrir le sujet puis laisser noter.",
                    "Rester leger et sans pression."
                  ]
              : currentStep === 8
                    ? [
                        "Comparer un matin improvise a un matin structure.",
                        "Faire ressortir proteines, hydratation et regularite.",
                        "Le client doit se reconnaitre rapidement."
                      ]
                : currentStep === 9
                      ? ["Montrer la routine comme un ensemble simple.", "Le visuel doit porter l'explication.", "Moins de texte, plus de lisibilite."]
                : currentStep === 10
                      ? [
                          `Besoin prioritaire : ${recommendationPlan.needs[0]?.label ?? "A preciser"}`,
                          `Produit repere : ${recommendationPlan.needs[0]?.products[0]?.name ?? "A proposer"}`,
                          `Programme conseille : ${recommendedProgram?.title ?? "Base a confirmer"}`
                        ]
                : currentStep === 11
                        ? ["Ancrer les bases avant le demarrage.", "Hydratation et matin doivent paraitre evidents.", "Pas de surcharge autour du visuel."]
                        : currentStep === 12
                          ? [
                              `Prochain suivi : ${form.nextFollowUp ? formatDateTime(form.nextFollowUp) : "-"}`,
                              "Fixer la suite avant de terminer le rendez-vous",
                              "Le client repart avec un cap clair"
                            ]
                          : [`Programme retenu : ${selectedProgram?.title ?? "-"}`, `Hydratation cible : ${waterNeed} L`, `Protéines : ${proteinRange}`];
  const panelTitle =
    currentStep >= 10
      ? "Cap du moment"
      : currentStep === 6
        ? "Références de suivi"
        : currentStep === 5
          ? "Lecture body scan"
          : currentStep >= 5
            ? "Lecture du bilan"
            : "Aide au rendez-vous";
  const panelIntro =
    currentStep >= 12
      ? "La fin du rendez-vous doit rester simple, claire et facile a reformuler."
      : currentStep >= 10
        ? "Ici, on garde seulement ce qui aide a presenter la proposition."
        : currentStep === 6
          ? "Le panneau sert à garder les cibles, les écarts et les priorités à portée de voix."
        : currentStep === 5
          ? "Le panneau sert a relire vite les mesures brutes sans doubler la page."
        : currentStep >= 5
          ? "Le panneau sert a relire vite les chiffres et la logique du bilan."
          : "Le panneau sert a garder le bon fil sans surcharger l'echange.";

  const plateTitle = form.objective === "sport" ? "Assiette sport / prise de masse" : "Assiette perte de poids";
  const plateSubtitle =
    form.objective === "sport"
      ? "Le client doit voir tout de suite comment construire une assiette plus complète pour soutenir l'énergie, l'entraînement et la récupération."
      : "Le client doit comprendre en un coup d'oeil comment remplir son assiette pour avoir plus de volume, plus de satiete et un cadre simple a suivre.";
    const plateSegments =
      form.objective === "sport"
        ? [
          { label: "Legumes", share: 33, note: "Base d'equilibre", accent: "green" as const },
          { label: "Protéines", share: 33, note: "Récupération musculaire", accent: "red" as const },
          { label: "Glucides", share: 34, note: "Énergie autour du sport", accent: "amber" as const }
        ]
      : [
          { label: "Legumes", share: 50, note: "Volume et satiete", accent: "green" as const },
          { label: "Protéines", share: 25, note: "Tenue musculaire", accent: "red" as const },
          { label: "Glucides", share: 25, note: "Portion simple et énergie", accent: "amber" as const }
        ];
  const platePortionGuides =
    form.objective === "sport"
      ? [
          { label: "Legumes", value: "1 a 2 poings" },
          { label: "Protéines", value: "1 à 1,5 paume" },
          { label: "Glucides", value: "1 a 2 poings" },
          { label: "Lipides", value: "1 pouce" }
        ]
      : [
          { label: "Legumes", value: "2 poings" },
          { label: "Protéines", value: "1 paume" },
          { label: "Glucides", value: "1 poing" },
          { label: "Lipides", value: "1 pouce" }
        ];
  const plateFoodExamples = [
    {
      label: "Protéines",
      accent: "red" as const,
      items: ["poulet", "oeufs", "poisson", "tofu"]
    },
    {
      label: "Glucides",
      accent: "amber" as const,
      items: ["riz", "pates", "pommes de terre", "flocons d'avoine"]
    },
    {
      label: "Lipides",
      accent: "blue" as const,
      items: ["avocat", "huile d'olive", "oleagineux"]
    }
  ];
  const plateLipidsNote =
    form.objective === "sport" ? "Bons lipides en complement regulier" : "Petite portion de bons lipides";

  function update<K extends keyof AssessmentForm>(key: K, value: AssessmentForm[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
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
      recommendations: form.recommendations.filter(
        (item) => item.name.trim() || item.contact.trim()
      ),
      recommendationsContacted: form.recommendationsContacted
    };
  }

  async function handleSaveAssessment() {
    if (!form.firstName.trim() || !form.lastName.trim()) {
      setSaveError("Renseigne au minimum le prenom et le nom du client.");
      goToStep(0);
      return;
    }

    if (!form.objectiveFocus.trim()) {
      setSaveError("Choisis d'abord l'objectif principal du client.");
      goToStep(0);
      return;
    }

    if (startsImmediately && !selectedProgram) {
      setSaveError("Choisis un programme avant d'enregistrer le bilan.");
      goToStep(10);
      return;
    }

    const assessmentDate = form.assessmentDate || getCurrentDateTimeValue();
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
          ? "Le client repart avec un cadre simple, un programme clair et un prochain suivi deja pose."
          : "Le client repart avec un bilan clair, sans demarrage immediat, et une relance deja prevue."),
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
          : ["Hydratation", "Routine matin", "Assiette perte de poids"]
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
          job: "Non renseigne",
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
            ? "Nouveau client cree depuis le bilan initial. La suite est deja fixee."
            : "Bilan enregistre sans demarrage. Une relance est a prevoir.")
      });

      setSaveError("");
      clearAssessmentDraft();
      navigate(`/clients/${clientId}`);
    } catch (error) {
      setSaveError(
        error instanceof Error
          ? error.message
          : "Impossible d'enregistrer le bilan pour le moment."
      );
    }
  }

  const mobileHelperPanel = !shouldHideStepSidebar ? (
    <Card className="space-y-4 xl:hidden">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-display text-xl text-white">{panelTitle}</p>
          <p className="mt-2 text-sm leading-6 text-[#7A8099]">{panelIntro}</p>
        </div>
        <StatusBadge label={`Étape ${currentStep + 1}`} tone="blue" />
      </div>
      <div className="grid gap-3">
        {rightPanelPoints.slice(0, 2).map((point, index) => (
          <FocusPanelItem key={point} text={point} highlighted={index === 0} />
        ))}
      </div>
      <div className="rounded-[18px] bg-[#0B0D11]/60 px-4 py-3 text-sm leading-6 text-[#F0EDE8]">
        {prompts[0]}
      </div>
      {currentStep === 0 ? (
        <div className="space-y-2 rounded-[18px] bg-white/[0.03] px-4 py-4">
          <label className="text-sm font-medium text-[#B0B4C4]">
            Invite par / recommande par
          </label>
          <input
            value={form.referredByName}
            onChange={(event) => update("referredByName", event.target.value)}
            placeholder="Exemple : Sylvie"
          />
        </div>
      ) : null}
    </Card>
  ) : null;

  const desktopHelperPanel = !shouldHideStepSidebar ? (
    <div className="hidden space-y-4 xl:sticky xl:top-5 xl:block xl:self-start">
      <Card className="space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-display text-2xl text-white">{panelTitle}</p>
            <p className="mt-2 text-sm leading-6 text-[#7A8099]">{panelIntro}</p>
          </div>
          <StatusBadge label="Aide terrain" tone="blue" />
        </div>
        <div className="grid gap-3">
          {rightPanelPoints.map((point, index) => (
            <FocusPanelItem key={point} text={point} highlighted={index === 0} />
          ))}
        </div>
        {currentStep === 0 ? (
          <div className="space-y-2 rounded-[20px] bg-white/[0.03] px-4 py-4">
            <label className="text-sm font-medium text-[#B0B4C4]">
              Invite par / recommande par
            </label>
            <input
              value={form.referredByName}
              onChange={(event) => update("referredByName", event.target.value)}
              placeholder="Exemple : Sylvie"
            />
            <p className="text-xs leading-6 text-[#7A8099]">
              Note ici la personne qui a amene ce client pour garder le lien de recommandation sans
              surcharger l&apos;ecran principal.
            </p>
          </div>
        ) : null}
      </Card>

      {currentStep !== 7 ? (
        <Card className="space-y-4">
          <p className="eyebrow-label">A dire simplement</p>
          <div className="grid gap-2">
            {prompts.slice(0, 2).map((prompt) => (
              <div key={prompt} className="rounded-[20px] bg-[#0B0D11]/60 px-4 py-3 text-sm text-[#F0EDE8]">
                {prompt}
              </div>
            ))}
          </div>
        </Card>
      ) : null}

      {currentStep !== 7 ? (
        <Card className="space-y-4">
          <p className="eyebrow-label">Lecture express</p>
          {currentStep === 5 ? (
            <>
              {bodyScanExpressItems.map((item) => (
                <SummaryMini key={item.label} label={item.label} value={item.value} />
              ))}
            </>
          ) : currentStep === 6 ? (
            <>
              <SummaryMini label="Poids cible" value={weightTargetLabel} />
              <SummaryMini label="Hydratation cible" value={hydrationTargetLabel} />
              <SummaryMini label="Objectif eau" value={`${formatRawNumber(waterNeed)} L`} />
              <SummaryMini label="Protéines" value={proteinRange} />
              <SummaryMini label="Délai" value={timelineLabel} />
            </>
          ) : (
            <>
              <SummaryMini label="Objectif" value={form.objectiveFocus} />
              <SummaryMini label="Programme" value={selectedProgram?.title ?? "A choisir"} />
              <SummaryMini label="Hydratation" value={`${waterNeed} L`} />
              {form.objective === "weight-loss" ? (
                <SummaryMini label="Rythme" value={weightLossPace.label} />
              ) : (
                <SummaryMini label="Motivation" value={`${form.motivation}/10`} />
              )}
            </>
          )}
        </Card>
      ) : null}
    </div>
  ) : null;

  return (
    <div className="space-y-6">
      <PageHeading
        eyebrow="Nouveau bilan"
        title="Bilan guidé"
        description="Un parcours clair pour conduire le rendez-vous, relire les habitudes et poser la suite."
      />
      <div ref={stepRailRef}>
        <StepRail currentStep={currentStep} steps={steps} />
      </div>

      {mobileHelperPanel}

      <div className={`grid gap-4 ${shouldHideStepSidebar ? "" : "xl:grid-cols-[minmax(0,1.2fr)_340px]"}`}>
        <Card className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="eyebrow-label">Etape {currentStep + 1} / {steps.length}</p>
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
                  <Field label="Prenom" value={form.firstName} onChange={(v) => update("firstName", v)} />
                  <Field label="Nom" value={form.lastName} onChange={(v) => update("lastName", v)} />
                  <Field label="Telephone" value={form.phone} onChange={(v) => update("phone", v)} />
                  <Field label="Email" value={form.email} onChange={(v) => update("email", v)} />
                  <Field
                    label="Date et heure du bilan initial"
                    type="datetime-local"
                    value={form.assessmentDate}
                    onChange={(v) => update("assessmentDate", v)}
                  />
                  {currentUser?.role === "admin" ? (
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-[#B0B4C4]">
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
                        <p className="text-xs leading-6 text-[#7A8099]">
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
                  <Field label="Taille" type="number" value={form.height} onChange={(v) => update("height", Number(v))} />
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
                      options={["Perte de poids", "Prise de masse", "Energie", "Remise en forme"]}
                      onChange={updateObjectiveFocus}
                    />
                    <TimelineChoiceField
                      label="Delai souhaite"
                      value={form.desiredTimeline}
                      options={timelineOptions}
                      onChange={(v) => update("desiredTimeline", v)}
                    />
                  </div>
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
                    <div className="space-y-4">
                      <Field
                        label="Poids cible (kg)"
                        type="number"
                        step="0.1"
                        value={form.targetWeight}
                        onChange={(v) => update("targetWeight", Number(v))}
                      />
                      <WeightGoalInsightCard
                        currentWeight={form.weight}
                        targetWeight={form.targetWeight}
                        timeline={form.desiredTimeline}
                      />
                      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                        <SummaryHighlightCard label="Délai choisi" value={timelineLabel} />
                        <SummaryHighlightCard
                          label="Repère / semaine"
                          value={
                            weightLossPlan.isAchieved || !weeklyWeightTarget
                              ? "Cap atteint"
                              : `${weeklyWeightTarget} kg / semaine`
                          }
                        />
                        <SummaryHighlightCard label="Protéines auto" value={proteinRange} />
                        <SummaryHighlightCard
                          label="Lecture du cap"
                          value={weightLossPace.label}
                        />
                      </div>
                      <div className="rounded-[22px] bg-white/[0.03] px-4 py-4 text-sm leading-6 text-[#B0B4C4]">
                        En fonction du délai choisi, l&apos;app ajuste automatiquement le rythme moyen
                        à tenir et le repère protéines pour garder un cadre simple à expliquer.
                      </div>
                    </div>
                  )}
                  <div className="space-y-3 rounded-[24px] bg-white/[0.03] p-4">
                    <div className="flex items-center justify-between gap-3">
                      <label className="text-sm font-medium text-[#B0B4C4]">Motivation</label>
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
                <ChoiceGroup label="Produits sucres ou industriels" value={form.sugaryProducts} options={["Rarement", "Parfois", "Souvent", "Tres souvent"]} onChange={(v) => update("sugaryProducts", v)} />
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
                  <ChoiceGroup label="Boissons sucrees" value={form.sweetDrinks} options={["Jamais", "Parfois", "Souvent"]} onChange={(v) => update("sweetDrinks", v)} />
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

          {currentStep === 4 && (
            <PlateGuideCard
              title={plateTitle}
              mode={form.objective}
              subtitle={plateSubtitle}
              segments={plateSegments}
              portionGuides={platePortionGuides}
              foodExamples={plateFoodExamples}
              lipidsNote={plateLipidsNote}
            />
          )}

          {currentStep === 5 && (
            <div className="space-y-4">
              <Card className="space-y-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="max-w-3xl">
                    <p className="eyebrow-label">Body scan</p>
                    <h2 className="mt-3 text-3xl text-white md:text-[2.6rem]">
                      Relevé complet des mesures de départ
                    </h2>
                    <p className="mt-3 max-w-2xl text-sm leading-7 text-[#B0B4C4]">
                      Toutes les mesures body scan sont reunies ici pour construire une base claire
                      avant le suivi.
                    </p>
                  </div>
                  <StatusBadge label="Référence de départ" tone="blue" />
                </div>

                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <Field label="Poids (kg)" type="number" value={form.weight} onChange={(v) => update("weight", Number(v))} />
                  <Field label="Masse grasse (%)" type="number" step="0.1" value={form.bodyFat} onChange={(v) => update("bodyFat", Number(v))} />
                  <Field label="Masse musculaire (kg)" type="number" step="0.1" value={form.muscleMass} onChange={(v) => update("muscleMass", Number(v))} />
                  <Field label="Hydratation (%)" type="number" step="0.1" value={form.hydration} onChange={(v) => update("hydration", Number(v))} />
                  <Field label="Masse osseuse (kg)" type="number" step="0.1" value={form.boneMass} onChange={(v) => update("boneMass", Number(v))} />
                  <Field label="Graisse viscérale" type="number" value={form.visceralFat} onChange={(v) => update("visceralFat", Number(v))} />
                  <Field label="BMR (kcal)" type="number" value={form.bmr} onChange={(v) => update("bmr", Number(v))} />
                  <Field label="Âge métabolique (ans)" type="number" value={form.metabolicAge} onChange={(v) => update("metabolicAge", Number(v))} />
                </div>
              </Card>

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                <QuickReadCard label="Poids de départ" value={formatValue(form.weight, "kg")} detail="Base du suivi" />
                <QuickReadCard label="Masse grasse" value={`${formatRawNumber(form.bodyFat)} %`} detail={`${bodyFatKg} kg estimes`} />
                <QuickReadCard label="Masse musculaire" value={formatValue(form.muscleMass, "kg")} detail={`${formatRawNumber(musclePercent)} % du poids`} />
                <QuickReadCard label="Hydratation" value={`${formatRawNumber(form.hydration)} %`} detail={`${hydrationKg} kg estimes`} />
                <QuickReadCard label="Graisse viscérale" value={formatRawNumber(form.visceralFat)} detail="Repère à surveiller" />
              </div>

              <BodyFatInsightCard
                current={{ weight: form.weight, percent: form.bodyFat }}
                objective={form.objective}
                sex={form.sex}
              />

              <MuscleMassInsightCard
                current={{ weight: form.weight, muscleMass: form.muscleMass }}
              />

              <HydrationVisceralInsightCard
                weight={form.weight}
                hydrationPercent={form.hydration}
                visceralFat={form.visceralFat}
                sex={form.sex}
              />
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
                    <p className="mt-3 max-w-2xl text-sm leading-7 text-[#B0B4C4]">
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

                <div className="grid gap-4 md:grid-cols-2">
                  {supportReferences.map((item) => (
                    <SummaryHighlightCard key={item.label} label={item.label} value={item.value} />
                  ))}
                </div>
              </Card>

              <div className="grid gap-4 xl:grid-cols-[1.08fr_0.92fr]">
                <Card className="space-y-4">
                  <div>
                    <p className="eyebrow-label">Priorites d'accompagnement</p>
                    <h3 className="mt-3 text-[1.65rem] text-white">Les repères a garder en tete</h3>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    {followUpPriorities.map((priority) => (
                      <FocusPanelItem key={priority} text={priority} highlighted={priority === followUpPriorities[0]} />
                    ))}
                  </div>
                </Card>

                <Card className="space-y-4">
                  <p className="eyebrow-label">Lecture express</p>
                  <div className="grid gap-3">
                    <ClosingLine text="On fixe une base claire." />
                    <ClosingLine text="On suit l'evolution sans complexifier." />
                    <ClosingLine text="On avance par priorités." />
                  </div>
                </Card>
              </div>
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
              <Suspense fallback={<StepVisualLoadingCard label="Chargement du visuel petit-dejeuner" />}>
                <LazyBreakfastComparison />
              </Suspense>
            </VisualStepBoundary>
          )}

          {currentStep === 9 && (
            <VisualStepBoundary title="Routine matin">
              <Suspense fallback={<StepVisualLoadingCard label="Chargement de la routine matin" />}>
                <LazyMorningRoutineCard />
              </Suspense>
            </VisualStepBoundary>
          )}

          {currentStep === 10 && (
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
                  <p className="text-sm leading-6 text-[#B0B4C4]">
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
                  <div className="rounded-[24px] bg-white/[0.03] p-5 text-sm leading-7 text-[#B0B4C4]">
                    Le bilan ne fait pas encore ressortir une priorite forte. On peut partir sur une
                    base simple, puis personnaliser au premier suivi.
                  </div>
                )}
              </Card>

              <div className="rounded-[24px] bg-emerald-400/10 p-4">
                <p className="eyebrow-label text-emerald-100/80">Programme conseille</p>
                <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xl text-white">
                      {recommendedProgram?.title ?? "Base a confirmer"}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-[#F0EDE8]">
                      {recommendationPlan.recommendedProgramReason}
                    </p>
                  </div>
                  <span className="rounded-full bg-emerald-400/12 px-4 py-2 text-sm font-semibold text-emerald-100">
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
                  <div className="rounded-[24px] border border-white/10 bg-[#0B0D11]/80 p-5">
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

          {currentStep === 11 && (
            <VisualStepBoundary title="Repère hydratation">
              <Suspense fallback={<StepVisualLoadingCard label="Chargement du repère hydratation" />}>
                <LazyHydrationRoutinePrimerCard />
              </Suspense>
            </VisualStepBoundary>
          )}

          {currentStep === 12 && (
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-3">
                <ChoiceGroup label="Decision client" value={form.comment.includes("partant") ? "Partant" : form.comment.includes("interesse") ? "A confirmer" : "A rassurer"} options={["Partant", "A rassurer", "A confirmer"]} onChange={(v) => update("comment", v === "Partant" ? "Client partant, rassure par la simplicite du plan." : v === "A confirmer" ? "Client interesse, souhaite valider rapidement." : "Client interesse mais a besoin d'etre rassure sur la mise en place.")} />
                <ChoiceGroup label="Type de suite" value="Rendez-vous fixe" options={["Rendez-vous fixe", "Message de rappel", "Relance douce"]} onChange={() => undefined} />
                <ChoiceGroup label="Message a laisser" value={form.comment.includes("cadre clair") ? "Cadre clair" : "Simple"} options={["Simple", "Progressif", "Cadre clair"]} onChange={(v) => update("comment", v === "Cadre clair" ? "Le client repart avec un cadre clair et un prochain pas precis." : v === "Progressif" ? "Le client repart avec un demarrage progressif et rassurant." : "Le client repart avec une solution simple a mettre en place.")} />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <Field
                  label="Prochain rendez-vous"
                  type="datetime-local"
                  value={form.nextFollowUp}
                  onChange={(v) => update("nextFollowUp", v)}
                />
                <AreaField label="Commentaire de fin de rendez-vous" value={form.comment} onChange={(v) => update("comment", v)} />
              </div>
            </div>
          )}

          {currentStep === 13 && (
            <div className="space-y-4">
              <Card className="space-y-5 bg-[linear-gradient(180deg,rgba(15,23,42,0.32),rgba(15,23,42,0.52))]">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="max-w-3xl">
                    <p className="eyebrow-label">Conclusion du rendez-vous</p>
                    <p className="mt-3 text-4xl text-white">Une proposition claire, un cap simple et une suite déjà visible.</p>
                    <p className="mt-3 text-sm leading-7 text-[#B0B4C4]">
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
                    <div className="rounded-[28px] bg-[#0B0D11]/60 p-5">
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
                        <div className="mt-5 rounded-[22px] bg-white/[0.03] px-4 py-4 text-sm leading-6 text-[#F0EDE8]">
                          Une base simple suffit pour le moment. Les produits se personaliseront
                          au besoin dans le suivi.
                        </div>
                      )}
                    </div>

                    <div className="rounded-[28px] bg-[#0B0D11]/60 p-5">
                      <p className="eyebrow-label">Programme conseille</p>
                      <div className="mt-4 flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="text-3xl text-white">
                            {selectedProgram?.title ?? recommendedProgram?.title ?? "Programme a confirmer"}
                          </p>
                          <p className="mt-2 text-sm leading-6 text-[#B0B4C4]">
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
                            className="rounded-[22px] bg-white/[0.03] px-4 py-4 text-sm leading-6 text-[#F0EDE8]"
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

              <div className="rounded-[24px] bg-emerald-400/10 p-5">
                <p className="eyebrow-label text-emerald-100/80">Formulation conseillee</p>
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
          <div className="sticky bottom-3 z-20 -mx-1 mt-2 rounded-[24px] border border-white/10 bg-[linear-gradient(180deg,rgba(8,12,22,0.92),rgba(8,12,22,0.82))] p-3 shadow-luxe backdrop-blur-xl md:hidden">
            <div className="mb-3 flex items-center justify-between gap-3 px-1">
              <p className="text-[11px] uppercase tracking-[0.22em] text-[#4A5068]">
                Etape {currentStep + 1} / {steps.length}
              </p>
              <p className="text-xs text-[#7A8099]">{steps[currentStep]}</p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="ghost"
                className="w-full justify-center"
                onClick={goToPreviousStep}
                disabled={currentStep === 0}
              >
                Precedente
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

        {desktopHelperPanel}
      </div>
    </div>
    );
  }

function StepVisualLoadingCard({ label }: { label: string }) {
  return (
    <Card className="space-y-4">
      <p className="eyebrow-label">Chargement</p>
      <div className="rounded-[28px] bg-white/[0.03] p-6">
        <div className="h-64 rounded-[22px] bg-[linear-gradient(135deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02))]" />
        <p className="mt-4 text-sm text-[#B0B4C4]">{label}</p>
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
        <div className="rounded-[24px] bg-white/[0.03] p-5">
          <p className="text-sm leading-7 text-[#B0B4C4]">
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
              <p className="mt-2 max-w-3xl text-sm leading-7 text-[#B0B4C4]">
                Note simplement un prenom et un contact par ligne.
              </p>
            </div>
            <StatusBadge label={`${filledRecommendations}/10`} tone="amber" />
          </div>

          <label className="flex items-center justify-between gap-3 rounded-[22px] border border-white/10 bg-white/[0.03] px-4 py-4">
            <div>
              <p className="text-sm font-medium text-white">Recommandations contactées</p>
              <p className="mt-1 text-sm text-[#7A8099]">
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
              <p className="mt-2 text-sm leading-6 text-[#B0B4C4]">Premier repere cadeau.</p>
            </div>
            <div className="rounded-[22px] bg-[rgba(201,168,76,0.08)] px-5 py-4">
              <p className="eyebrow-label text-[#2DD4BF]/70">Palier cadeau 2</p>
              <p className="mt-2 text-xl text-white">A partir de 10 noms</p>
              <p className="mt-2 text-sm leading-6 text-[#B0B4C4]">Deuxieme repere cadeau.</p>
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
                <div className="flex min-h-[72px] items-center justify-center rounded-[20px] bg-white/[0.03] px-4 py-3 text-base font-semibold text-white">
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
      <span className="text-sm font-medium text-[#B0B4C4]">{label}</span>
      <div className="relative rounded-[20px] bg-white/[0.02] px-4 py-4">
        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="w-full border-0 bg-transparent px-0 pb-2 text-base text-white placeholder:text-[#4A5068] focus:outline-none focus:ring-0"
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
  step
}: {
  label: string;
  value: string | number;
  onChange: (value: string) => void;
  type?: string;
  step?: string;
}) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-[#B0B4C4]">{label}</label>
      {type === "number" ? (
        <DecimalInput value={Number(value) || 0} onChange={onChange} step={step} />
      ) : (
        <input type={type} step={step} value={value} onChange={(event) => onChange(event.target.value)} />
      )}
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
      value={draft}
      onChange={(event) => {
        const nextValue = event.target.value.replace(/\s+/g, "");
        if (!/^\d*([.,]\d*)?$/.test(nextValue)) {
          return;
        }

        setDraft(nextValue);
        const normalized = nextValue.replace(",", ".");
        if (normalized === "" || normalized === ".") {
          return;
        }

        onChange(normalized);
      }}
      onBlur={() => {
        const normalized = draft.replace(",", ".");
        if (normalized === "" || normalized === ".") {
          const fallback = formatEditableNumber(value);
          setDraft(fallback);
          onChange(fallback);
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
      <label className="text-sm font-medium text-[#B0B4C4]">{label}</label>
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
      <label className="text-sm font-medium text-[#B0B4C4]">{label}</label>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <button key={option} type="button" onClick={() => onChange(option)} className={`rounded-full px-4 py-2 text-sm font-medium transition ${value === option ? "bg-white text-[#0B0D11]" : "border border-white/10 bg-white/[0.03] text-[#F0EDE8]"}`}>
            {formatOption ? formatOption(option) : option}
          </button>
        ))}
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
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#7A8099]">
                {title}
              </p>
              <StatusBadge label={`${products.length} repere${products.length > 1 ? "s" : ""}`} tone="blue" />
            </div>
            <p className="text-lg font-medium text-white">{summary}</p>
            <p className="text-sm leading-6 text-[#B0B4C4]">{reasonLabel}</p>
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
          : "bg-[#1A1E27]"
      }`}
    >
      <div className="flex h-full flex-col gap-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-1.5">
            <p className="text-lg font-semibold text-white">{name}</p>
            <p className="text-sm leading-6 text-[#B0B4C4]">{shortBenefit}</p>
          </div>
          <button
            type="button"
            onClick={onToggle}
            className={`inline-flex min-h-[34px] shrink-0 items-center justify-center rounded-full px-3.5 py-1.5 text-sm font-semibold transition ${
              selected
                ? "bg-white text-[#0B0D11]"
                : "border border-white/10 bg-white/[0.03] text-white hover:bg-white/[0.08]"
            }`}
          >
            {selected ? "Retenu" : "Retenir"}
          </button>
        </div>
        <div className="mt-auto flex flex-wrap items-center gap-2">
          {quantityLabel ? (
            <span className="rounded-full bg-white/[0.05] px-3 py-1 text-sm font-medium text-[#F0EDE8]">
              {quantityLabel}
            </span>
          ) : null}
          <span className="rounded-full bg-white/[0.05] px-3 py-1 text-sm font-medium text-[#F0EDE8]">
            {dureeReferenceJours} jours
          </span>
          <span className="rounded-full bg-[rgba(45,212,191,0.1)] px-3 py-1 text-sm font-semibold text-[#2DD4BF]">
            {formatPriceEuro(prixPublic)}
          </span>
          <span className="rounded-full bg-emerald-400/10 px-3 py-1 text-sm font-semibold text-emerald-100">
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
      <label className="text-sm font-medium text-[#B0B4C4]">{label}</label>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => onChange(option)}
            className={`rounded-full px-4 py-2 text-sm font-medium transition ${
              value === option
                ? "bg-white text-[#0B0D11]"
                : "border border-white/10 bg-white/[0.03] text-[#F0EDE8]"
            }`}
          >
            {option}
          </button>
        ))}
        <button
          type="button"
          onClick={() => {
            if (!isCustom) {
              onChange("");
            }
          }}
          className={`rounded-full px-4 py-2 text-sm font-medium transition ${
            isCustom
              ? "bg-white text-[#0B0D11]"
              : "border border-dashed border-white/10 bg-white/[0.03] text-[#F0EDE8]"
          }`}
        >
          Choix libre
        </button>
      </div>
      <input
        value={isCustom ? value : ""}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Ex : 2 mois, 4 mois, 5 mois"
      />
      <p className="text-xs leading-6 text-[#7A8099]">
        Tu peux choisir un délai rapide ou écrire librement un cap simple comme 2 mois, 4 mois ou
        5 mois.
      </p>
    </div>
  );
}

function SectionBlock({ title, description, children }: { title: string; description: string; children: ReactNode; }) {
  return (
    <div className="rounded-[24px] bg-white/[0.03] p-5">
      <div className="space-y-1">
        <p className="text-lg font-semibold text-white">{title}</p>
        <p className="text-sm leading-6 text-[#7A8099]">{description}</p>
      </div>
      <div className="mt-4 space-y-4">{children}</div>
    </div>
  );
}

function SummaryMini({ label, value }: { label: string; value: string }) {
  return <div className="flex items-center justify-between gap-3 rounded-[20px] bg-white/[0.03] px-4 py-3"><span className="text-[11px] font-medium text-[#4A5068]">{label}</span><span className="text-sm font-semibold text-white">{value}</span></div>;
}

function FocusPanelItem({ text, highlighted = false }: { text: string; highlighted?: boolean }) {
  return (
    <div
      className={`rounded-[20px] px-4 py-3 text-sm leading-6 ${
        highlighted
          ? "bg-[rgba(45,212,191,0.1)] text-white"
          : "bg-white/[0.03] text-[#F0EDE8]"
      }`}
    >
      {text}
    </div>
  );
}

function ClosingLine({ text }: { text: string }) {
  return <div className="rounded-2xl bg-[#0B0D11]/60 px-4 py-3 text-sm leading-6 text-white">{text}</div>;
}

function SummaryHighlightCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[22px] bg-white/[0.03] px-4 py-4">
      <p className="text-[11px] font-medium text-[#4A5068]">{label}</p>
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
        <div className="rounded-[22px] bg-white/[0.04] px-4 py-4">
          <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-[#4A5068]">Base choisie</p>
            <div className="mt-3 flex items-start justify-between gap-3">
              <div>
                <p className="text-lg font-semibold text-white">{programTitle}</p>
                <p className="mt-2 text-sm leading-6 text-[#B0B4C4]">
                  {includedComposition.length ? includedComposition.join(" • ") : "Composition a confirmer"}
                </p>
              </div>
              <span className="rounded-full bg-white/[0.06] px-3 py-1.5 text-sm font-semibold text-white">
                {displayedProgramPrice || "A confirmer"}
              </span>
            </div>
            <div className="mt-3 flex items-center justify-between gap-3 rounded-[16px] bg-slate-950/22 px-3.5 py-2.5">
              <p className="text-sm text-[#B0B4C4]">Base choisie</p>
              <p className="text-sm font-semibold text-white">{displayedProgramPrice || "A confirmer"}</p>
            </div>
          </div>

        <div className="rounded-[22px] bg-white/[0.03] px-4 py-4">
          <div className="flex items-center justify-between gap-3">
              <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-[#4A5068]">Ajouts</p>
            <span className="text-sm font-semibold text-white">{addOnProducts.length}</span>
          </div>
          {addOnProducts.length ? (
            <div className="mt-3 space-y-2">
                {addOnProducts.map((product) => (
                  <div
                    key={product.id}
                    className="flex items-center justify-between gap-3 rounded-[16px] bg-[#0B0D11]/60 px-3.5 py-3"
                  >
                    <div>
                      <p className="text-sm font-semibold text-white">{product.name}</p>
                      <p className="mt-1 text-xs text-[#7A8099]">{formatPv(product.pv)}</p>
                    </div>
                    <p className="text-sm font-semibold text-[#2DD4BF]">+ {formatPriceEuro(product.prixPublic)}</p>
                  </div>
                ))}
              </div>
          ) : (
            <p className="mt-3 text-sm leading-6 text-[#B0B4C4]">
              Aucun supplément ajouté pour l&apos;instant.
            </p>
          )}
        </div>

          <div className="grid gap-3 md:grid-cols-3">
            <SummaryHighlightCard label="Base choisie" value={displayedProgramPrice || "A confirmer"} />
            <SummaryHighlightCard label="Total ajouts" value={addOnProducts.length ? formatPriceEuro(addOnProductsTotalPrice) : "0.00 EUR"} />
            <SummaryHighlightCard label="PV ajouts" value={addOnProducts.length ? formatPv(addOnProductsTotalPv) : "0.00 PV"} />
          </div>

          <div className="rounded-[22px] border border-emerald-300/18 bg-emerald-400/10 px-4 py-4">
            <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-emerald-100/70">Total a prevoir aujourd&apos;hui</p>
            <div className="mt-3 flex items-center justify-between gap-3">
              <p className="text-base text-emerald-50">Base choisie + ajouts</p>
              <p className="text-2xl font-semibold text-white">
                {estimatedClientTotal > 0 ? formatPriceEuro(estimatedClientTotal) : "A definir"}
              </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function QuickReadCard({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="rounded-[20px] bg-white/[0.03] p-4">
      <p className="text-[11px] font-medium text-[#4A5068]">{label}</p>
      <p className="mt-3 text-lg font-semibold text-white">{value}</p>
      <p className="mt-2 text-sm leading-6 text-[#7A8099]">{detail}</p>
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
      ? "bg-emerald-400/10 text-emerald-100"
      : tone === "red"
        ? "bg-rose-400/10 text-rose-100"
        : tone === "amber"
          ? "bg-amber-400/10 text-amber-100"
          : "bg-[rgba(45,212,191,0.1)] text-[#2DD4BF]";

  return (
    <div className="grid gap-3 rounded-[24px] border border-white/10 bg-white/[0.03] px-4 py-4 md:grid-cols-[1.1fr_repeat(4,minmax(0,0.8fr))_minmax(0,1fr)] md:items-center">
      <div>
        <p className="text-base font-semibold text-white">{label}</p>
      </div>
      <ReferenceDatum label="Depart" value={initial} />
      <ReferenceDatum label="Aujourd'hui" value={current} />
      <ReferenceDatum label="Cible" value={target} />
      <ReferenceDatum label="Ecart" value={gap} />
      <div className="rounded-[18px] bg-[#0B0D11]/60 px-3.5 py-3">
        <p className="text-[11px] font-medium text-[#4A5068]">Priorite</p>
        <p className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${toneClass}`}>
          {priority}
        </p>
      </div>
    </div>
  );
}

function ReferenceDatum({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[18px] bg-[#0B0D11]/60 px-3.5 py-3">
      <p className="text-[11px] font-medium text-[#4A5068]">{label}</p>
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
  if (!Number.isFinite(value)) {
    return "0";
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

