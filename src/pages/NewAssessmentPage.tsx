import { useState, useMemo, type ReactNode } from "react";
// lazy retiré — Chantier nettoyage bilan (2026-04-20)
// Chantier nettoyage bilan (2026-04-20) : Suspense retiré — LazyMorningRoutineCard
// supprimé de l'étape "Notre concept" qui n'affiche plus que l'image.
import { StepRail } from "../components/assessment/StepRail";
import { BusinessAmbitionStep } from "../components/assessment/BusinessAmbitionStep";
import { useEffect } from "react";
import { useRef } from "react";
import { Component, type ErrorInfo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { getSupabaseClient } from "../services/supabaseClient";
import { BodyFatInsightCard } from "../components/body-scan/BodyFatInsightCard";
import { MuscleMassInsightCard } from "../components/body-scan/MuscleMassInsightCard";
import { HydrationVisceralInsightCard } from "../components/body-scan/HydrationVisceralInsightCard";
import { BodyScanRadar } from "../components/body-scan/BodyScanRadar";
// Chantier refonte étape 11 (2026-04-20) : ProgramBoosterCard + ProgramCard
// retirés car l'étape 11 est désormais gérée par les nouveaux composants
// ProgramChoiceCard + RoutineMatinList + ProgrammeTicket.
import { MilkConsumptionToggle } from "../components/assessment/MilkConsumptionToggle";
import { ProgramChoiceCard } from "../components/assessment/ProgramChoiceCard";
import { RoutineMatinList } from "../components/assessment/RoutineMatinList";
import { ProgrammeTicket, type TicketAddOn } from "../components/assessment/ProgrammeTicket";
import { SelectableProductCard } from "../components/assessment/SelectableProductCard";
import { PROGRAM_CHOICES, getProgramById, BOOSTERS, type ProgramChoiceId } from "../data/programs";
import { FelicitationsStep } from "../components/assessment/FelicitationsStep";
import { NotesPanel } from "../components/assessment/NotesPanel";
import { ValidationBlockedBanner } from "../components/assessment/ValidationBlockedBanner";
import {
  readCoachNotesDraft,
  writeCoachNotesDraft,
  clearCoachNotesDraft,
  purgeLegacyCoachNotesKey,
} from "../lib/assessmentNotesStorage";
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
  computeWaterTarget,
  computeProteinTarget,
} from "../lib/calculations";
import { buildAssessmentRecommendationPlan, recommendBoosters } from "../lib/assessmentRecommendations";
import { calculateAge } from "../lib/age";
import type { BiologicalSex, BreakfastAnalysis, Client, CurrentIntake, DecisionClient, MessageALaisser, Objective, QuantityMap, RecommendationLead, SportProfile, TypeDeSuite } from "../types/domain";
import { SportProfileStep } from "../components/assessment/SportProfileStep";
import { CurrentIntakeStep } from "../components/assessment/CurrentIntakeStep";
import { SportAlertsDialog, detectSportAlerts, type SportAlert } from "../components/assessment/SportAlertsDialog";
import { BreakfastStorySlider, DEFAULT_BREAKFAST_ANALYSIS } from "../components/education/BreakfastStorySlider";
import { ConfettiBurst } from "../features/academy/components/ConfettiBurst";
import { BilanSectionDivider } from "../components/assessment/BilanSectionDivider";
import { ConsentDialog, recordConsentInsert } from "../components/consent/ConsentDialog";
import { ProductCatalogModal } from "../components/assessment/ProductCatalogModal";
import { pvProductCatalog } from "../data/pvCatalog";

type AssessmentForm = {
  assessmentDate: string;
  referredByName: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  sex: BiologicalSex;
  age: number;
  /** Chantier birth_date bilan initial (2026-04-29) — date de naissance optionnelle, calcule l'age automatiquement. */
  birthDate: string;
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
  programChoice: ProgramChoiceId;
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
  /** Chantier Boosters cliquables + Quantités (D-urgent, 2026-04-24). */
  selectedProductQuantities: QuantityMap;
  // Étape 13 — Chantier 1
  decisionClient: DecisionClient | null;
  typeDeSuite: TypeDeSuite | null;
  messageALaisser: MessageALaisser | null;
  // Étape 9 — Chantier 6 (story petit-déjeuner)
  breakfastAnalysis: BreakfastAnalysis;
  // Chantier Prise de masse (2026-04-24) : étapes sport.
  sportProfile: SportProfile | null;
  currentIntake: CurrentIntake;
  // Pop-up business bilan (2026-11-03) — interet pour un complement de revenu.
  /** Reponse a la question legere etape 1 (sous Profession). */
  businessCuriosity: "never" | "sometimes" | "often" | "";
  /** Montant choisi a l etape business-ambition. 0 = decline. null = pas atteint. */
  businessInterestAmount: number | null;
  /** Champ libre si "Plus" choisi. */
  businessInterestNote: string;
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
  birthDate: "",
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
  programChoice: "premium" as ProgramChoiceId,
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
  selectedProductQuantities: {},
  decisionClient: null,
  typeDeSuite: "rdv_fixe",
  messageALaisser: null,
  breakfastAnalysis: DEFAULT_BREAKFAST_ANALYSIS,
  sportProfile: null,
  currentIntake: {
    morning: null, snackAM: null, lunch: null, preWO: null, postWO: null, snackPM: null, dinner: null,
  },
  businessCuriosity: "",
  businessInterestAmount: null,
  businessInterestNote: "",
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
          ? Math.min(Math.max(parsed.currentStep, 0), MAX_STEPS_COUNT - 1)
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
  // Chantier Hotfix fuite notes coach (2026-04-24) : la clé legacy
  // globale est purgée systématiquement. La clé scopée par prospectId
  // est purgée séparément à la validation effective (cf handleSaveAssessment
  // qui appelle clearCoachNotesDraft(prospectId)).
  window.localStorage.removeItem("lorsquad-assessment-coach-notes");
}

// Chantier bilan updates (2026-04-20) : renommage + insertion + suppression.
// - étape "Routine matin" → "Notre concept de rééquilibrage alimentaire"
// - suppression de "Hydratation & routine du matin"
// - insertion de "Dégustation" et "Reconnaissance" après "Petit-déjeuner"
// Chantier nettoyage bilan (2026-04-20) :
// - Supprimé "Références de suivi"
// - Supprimé "Reconnaissance"
// Total étapes : 13 (0-12).
// Chantier Prise de masse (2026-04-24) : steps en tableau d'objets avec flag
// `visible(form)` pour masquer dynamiquement les 2 étapes sport (sport-profile,
// current-intake) quand l'objectif n'est pas "sport".
export type StepId =
  | 'client-info'
  | 'habits'
  | 'food-quality'
  | 'health-objective'
  | 'meal-composition'
  | 'sport-profile'
  | 'current-intake'
  | 'body-scan'
  | 'tasting'
  | 'recommendations'
  | 'breakfast'
  | 'concept'
  | 'business-ambition'
  | 'program'
  | 'follow-up'
  | 'felicitations';

export interface StepDef {
  id: StepId;
  label: string;
  visible: (form: AssessmentForm) => boolean;
}

const ALL_STEPS: StepDef[] = [
  { id: 'client-info', label: "Informations client", visible: () => true },
  { id: 'habits', label: "Habitudes de vie & repas", visible: () => true },
  { id: 'food-quality', label: "Qualité alimentaire & boissons", visible: () => true },
  { id: 'health-objective', label: "Santé, objectif, activité & freins", visible: () => true },
  { id: 'meal-composition', label: "Composition des repas", visible: () => true },
  { id: 'sport-profile', label: "Parle-moi de ton sport", visible: (f) => f.objective === 'sport' },
  { id: 'current-intake', label: "Tes apports actuels", visible: (f) => f.objective === 'sport' },
  { id: 'body-scan', label: "Body scan", visible: () => true },
  { id: 'tasting', label: "Place à la dégustation", visible: () => true },
  { id: 'recommendations', label: "Recommandations", visible: () => true },
  { id: 'breakfast', label: "Petit-déjeuner Lor'Squad", visible: () => true },
  { id: 'concept', label: "Notre concept de rééquilibrage", visible: () => true },
  // Pop-up business bilan (2026-11-03) : visible uniquement si la curiosite
  // captee a l etape 1 est "sometimes" ou "often". On evite de spammer ceux
  // qui ont dit "Jamais".
  {
    id: 'business-ambition',
    label: "Et au-delà de ta santé ?",
    visible: (f) => f.businessCuriosity === 'sometimes' || f.businessCuriosity === 'often',
  },
  { id: 'program', label: "Le programme proposé", visible: () => true },
  { id: 'follow-up', label: "La suite du suivi", visible: () => true },
  { id: 'felicitations', label: "Félicitations", visible: () => true },
];

// Fallback pour `steps.length` usages hors du composant (draft clamp + initial
// bounds). On se base sur le MAX possible (15 étapes) — la clampification
// dynamique via `visibleSteps` se fait dans le composant.
const MAX_STEPS_COUNT = ALL_STEPS.length;

// =============================================================================
// Whispers contextuels par etape (Refonte visuelle bilan, 2026-11-04).
//
// Chaque etape gagne une "voix coach" courte qui s affiche sous le titre.
// Objectif : transformer le bilan en experience guidee, pas en formulaire.
// L emoji eyebrow remplace le bullet gold generique pour un accent emotionnel.
// =============================================================================
const STEP_WHISPERS: Record<StepId, { eyebrow: string; whisper: string }> = {
  'client-info': {
    eyebrow: '✦ On apprend à se connaître',
    whisper: "Pose le cap dès maintenant — qui tu accompagnes, vers où, et avec quel cadre santé.",
  },
  'habits': {
    eyebrow: '🌿 Le rythme avant l\'assiette',
    whisper: "Comprends d'abord la vie quotidienne. C'est sur ce socle que tout le reste se construit.",
  },
  'food-quality': {
    eyebrow: '🥗 Lecture de l\'assiette',
    whisper: "Pas un jugement — une photo honnête. On regarde ce qui passe vraiment dans une journée.",
  },
  'health-objective': {
    eyebrow: '🎯 Santé, énergie, blocages',
    whisper: "Là où le client a déjà essayé, ce qui l'a freiné. Le vrai matériau du coaching.",
  },
  'meal-composition': {
    eyebrow: '🍽️ Composition des repas',
    whisper: "On affine la lecture : quelles proportions, quels réflexes, quelles habitudes ancrées.",
  },
  'sport-profile': {
    eyebrow: '🏋️ Parle-moi de ton sport',
    whisper: "Fréquence, types, sous-objectif. Tout ça oriente les besoins en protéines et en récupération.",
  },
  'current-intake': {
    eyebrow: '⚡ Tes apports actuels',
    whisper: "Pas de calculs douloureux — juste un repère qualitatif moment par moment.",
  },
  'body-scan': {
    eyebrow: '📊 Le scan, ta photo de départ',
    whisper: "Les chiffres ne définissent pas le client. Ils définissent par où on commence.",
  },
  'tasting': {
    eyebrow: '🥤 Place à la dégustation',
    whisper: "Le moment où la théorie devient concrète. Goûter, choisir sa saveur, ressentir l'effet.",
  },
  'recommendations': {
    eyebrow: '💛 Faire grandir le cercle',
    whisper: "Trois personnes qui pourraient avoir besoin d'un cadre comme celui-ci. Sans pression.",
  },
  'breakfast': {
    eyebrow: '☀️ Le petit-déjeuner, point de bascule',
    whisper: "Visualiser une vraie matinée Lor'Squad — sucres, protéines, hydratation, fibres.",
  },
  'concept': {
    eyebrow: '🌟 Notre concept en une image',
    whisper: "Le rééquilibrage Lor'Squad expliqué simplement — ce qui change vraiment au quotidien.",
  },
  'business-ambition': {
    eyebrow: '✦ Et au-delà de ta santé ?',
    whisper: "Une question ouverte sur l'avenir. Aucun engagement, juste écouter ce qui résonne.",
  },
  'program': {
    eyebrow: '🎁 Le programme proposé',
    whisper: "Le moment du sur-mesure. On assemble ce dont le client a vraiment besoin pour avancer.",
  },
  'follow-up': {
    eyebrow: '📅 La suite du suivi',
    whisper: "Sans suite, pas de transformation. On pose la prochaine étape avant de se quitter.",
  },
  'felicitations': {
    eyebrow: '🎉 Félicitations',
    whisper: "Un bilan complet, posé, validé. Maintenant la vraie aventure commence.",
  },
};

const timelineOptions = [
  "1 mois",
  "2 mois",
  "3 mois",
  "4 mois",
  "5 mois",
  "6 mois",
  "9 mois"
];

// Mapping centralisé dans data/programs.ts (source de vérité unique
// couvrant aussi les programmes sport — Audit Bug #5).



export function NewAssessmentPage() {
  const navigate = useNavigate();
  const { programs, users, currentUser, createClientWithInitialAssessment, prospects, updateProspect } = useAppContext();
  const { push: pushToast } = useToast();
  const [searchParams] = useSearchParams();
  const prospectId = searchParams.get("prospectId");
  const sourceProspect = prospectId ? prospects.find((p) => p.id === prospectId) : undefined;
  const stepRailRef = useRef<HTMLDivElement | null>(null);
  // Chantier fix bugs panier (2026-04-27) : flag pour init UNIQUE des
  // suggestions par défaut à l'entrée de l'étape "program". Sans ce flag,
  // l'useEffect réinjectait les défauts à chaque fois que l'utilisateur
  // vidait le panier (auto-sélection forcée).
  const programInitRef = useRef(false);
  const [form, setForm] = useState(initialForm);
  const [currentStep, setCurrentStep] = useState(0);
  const [saveError, setSaveError] = useState("");
  // Chantier Félicitations (2026-04-20) : le bouton "Enregistrer et terminer"
  // montre un état "Enregistrement…" pendant handleSaveAssessment.
  const [saving, setSaving] = useState(false);
  // Confetti sur step Félicitations (Bilan PRO V2 — 2026-04-29)
  const [showFelicitationsConfetti, setShowFelicitationsConfetti] = useState(false);
  // Sandbox catalogue produits (Bilan PRO V3.2 — 2026-04-29)
  const [showCatalogModal, setShowCatalogModal] = useState(false);
  // RGPD consent gate (Phase 1 — 2026-04-30) : popup obligatoire au mount.
  // Bilan initial = client cree au save donc on stocke localement, et on
  // INSERT la row client_consents apres le save (avec le clientId retourne).
  const [consentGiven, setConsentGiven] = useState(false);
  // États recapClientName / accessModalOpen / savedClientId supprimés
  // (2026-04-27) : la modale ClientAccessModal post-bilan a été remplacée
  // par la navigation vers /clients/:id/bilan-termine. Plus besoin de
  // stocker ces états dans le wizard.
  const [assignedUserId, setAssignedUserId] = useState("");
  const [draftReady, setDraftReady] = useState(false);
  // Chantier Prospects : suivi des champs pré-remplis par le prospect (surlignés en vert
  // tant qu'ils n'ont pas été modifiés manuellement).
  const [prefilledFields, setPrefilledFields] = useState<{
    firstName: boolean; lastName: boolean; phone: boolean; email: boolean;
  }>({ firstName: false, lastName: false, phone: false, email: false });

  // Chantier Hotfix fuite notes coach (2026-04-24) :
  // Les notes coach sont scopées par prospectId. Si pas de prospectId
  // (bilan 100% neuf) → éphémère, state React uniquement, aucune
  // persistance localStorage → zéro fuite cross-client possible.
  // Purge opportuniste de la clé legacy globale au montage (users
  // déjà affectés par le bug récupèrent un state propre).
  const [coachNotes, setCoachNotes] = useState<string>(() => {
    purgeLegacyCoachNotesKey();
    return readCoachNotesDraft(prospectId);
  });
  const [showValidationBanner, setShowValidationBanner] = useState(false);
  // Chantier Prise de masse (2026-04-24) : alertes sport style Apple Health.
  const [sportAlerts, setSportAlerts] = useState<SportAlert[]>([]);
  const [sportAlertsOpen, setSportAlertsOpen] = useState(false);
  const [sportAlertsAcknowledged, setSportAlertsAcknowledged] = useState(false);
  const [showMobileNotes, setShowMobileNotes] = useState(false);

  // Si prospectId change (navigation entre bilans), on reset les notes
  // pour éviter toute fuite visuelle avant le prochain fetch.
  useEffect(() => {
    setCoachNotes(readCoachNotesDraft(prospectId));
  }, [prospectId]);

  const persistCoachNotesLocal = (value: string) => {
    writeCoachNotesDraft(prospectId, value);
  };

  // L'étape 11 "Suite du suivi" est validée si le coach a choisi
  // "suivi_libre" OU s'il a un RDV planifié (typeDeSuite + date).
  const hasFollowUpPlanned =
    form.typeDeSuite === "suivi_libre" ||
    (!!form.typeDeSuite && form.nextFollowUp.trim().length > 0);

  // (notesVisible est calculé plus bas, après currentStepId)

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

  // Chantier Prise de masse (2026-04-24) : steps dynamiques selon form.objective.
  const visibleSteps = useMemo(() => ALL_STEPS.filter((s) => s.visible(form)), [form]);
  const steps = useMemo(() => visibleSteps.map((s) => s.label), [visibleSteps]);
  const stepIds = useMemo(() => visibleSteps.map((s) => s.id), [visibleSteps]);
  const currentStepId = stepIds[currentStep] ?? 'client-info';

  const goToStep = (nextStep: number) => {
    setCurrentStep(Math.min(Math.max(nextStep, 0), steps.length - 1));
  };

  const goToStepId = (id: StepId) => {
    const idx = stepIds.indexOf(id);
    if (idx >= 0) goToStep(idx);
  };

  // Panneau notes visible sur étapes "amont" (avant body-scan) + final.
  const NOTES_VISIBLE_IDS = new Set<StepId>([
    'client-info', 'habits', 'food-quality', 'health-objective', 'meal-composition',
    'sport-profile', 'current-intake', 'felicitations',
  ]);
  const notesVisible = NOTES_VISIBLE_IDS.has(currentStepId);

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

    // Validation étape body scan (poids minimum)
    if (currentStepId === 'body-scan') {
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
  // boosterPrograms retiré — l'étape 11 est refactorée, les "boosters" sont
  // gérés via les programmes Booster 1 / Booster 2 dans programs.ts.
  const selectedProgram =
    mainPrograms.find((program) => program.id === form.selectedProgramId) ?? null;
  const startsImmediately = form.afterAssessmentAction === "started";
  const bodyFatKg = estimateBodyFatKg(form.weight, form.bodyFat);
  const musclePercent = estimateMuscleMassPercent(form.weight, form.muscleMass);
  const hydrationKg = estimateHydrationKg(form.weight, form.hydration);
  // Chantier nettoyage bilan (2026-04-20) : les helpers body-fat / hydratation
  // / comparisonRows alimentaient l'étape "Références de suivi" supprimée,
  // donc retirés (non utilisés ailleurs dans le bilan).
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
  // Chantier fix bugs panier (2026-04-27) : plus de fallback render-time
  // vers defaultSuggestedProductIds. Si l'utilisateur a tout désélectionné,
  // le panier reste vide (comportement attendu). L'initialisation des
  // recommandations se fait via useEffect ref-guardé ci-dessous.
  const effectiveSelectedProductIds = form.selectedProductIds;
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
  // displayedProgramPrice* + addOnProductsTotalPrice retirés avec le résumé
  // administratif (Chantier Félicitations 2026-04-20). selectedProgram reste
  // utilisé pour le titre programme dans handleSaveAssessment.
  // `activeProgram` et `recommendedProgram` supprimés en 2026-04-27 avec
  // le retrait du filtre includedProgramProductIds (plus consommés).
  // Chantier fix bugs panier (2026-04-27) : on retire le filtre
  // `includedProgramProductIds` qui exclut auparavant tout produit déjà
  // inclus dans le programme de base. Conséquence du filtre : Formula 1,
  // PDM, Mélange Boisson Protéinée etc. cochés "Retenu" dans les sections
  // besoins restaient invisibles dans le total. Désormais : si l'utilisateur
  // coche "Retenir" sur un produit, il apparaît toujours dans les ajouts
  // (avec sa quantité), même si le programme inclut déjà 1 unité. Le coach
  // pilote le stockage explicitement via le stepper.
  const addOnProducts = selectedRecommendationProducts;

  // Chantier UX coach (2026-04-29) : SUPPRESSION de l'auto-pre-selection
  // des produits "besoin detecte" sur entree step Programme.
  // Avant : Xtra-Cal et Formula 1 etaient automatiquement dans le panier
  // selon les besoins detectes. Le coach devait deselectionner les indesires.
  // Maintenant : panier strictement vide d'addons par defaut. Le coach
  // ajoute manuellement les produits via les cards "Retenir" / "+ Ajouter"
  // ou via la sandbox catalogue complet (bouton sous le panier).
  // Le `highlight={recommended}` reste visuel sur les cards (etoile + reason)
  // pour guider sans imposer.
  // void programInitRef si tu veux le re-utiliser pour autre chose plus tard.
  void defaultSuggestedProductIds;
  void programInitRef;

  // Trigger confetti une seule fois à l'entrée sur la dernière étape (PRO V2 2026-04-29)
  useEffect(() => {
    if (currentStepId === 'felicitations') {
      setShowFelicitationsConfetti(true);
    }
  }, [currentStepId]);


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

  // Chantier Boosters cliquables + Quantités (D-urgent, 2026-04-24).
  // getQty / setQty : champ parallèle à selectedProductIds. Borné 1-10.
  function getQty(id: string): number {
    return form.selectedProductQuantities[id] ?? 1;
  }
  function setQty(id: string, q: number) {
    const clamped = Math.max(1, Math.min(10, Math.round(q)));
    setForm((prev) => ({
      ...prev,
      selectedProductQuantities: {
        ...prev.selectedProductQuantities,
        [id]: clamped,
      },
    }));
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
      // Chantier Boosters cliquables + Quantités (D-urgent, 2026-04-24).
      // Champ parallèle (non-breaking). `selectedProductIds` reste intact.
      // Le flux d'édition (EditInitialAssessmentPage) hydratera ce champ
      // en prompt E — hors scope D-urgent.
      selectedProductQuantities: form.selectedProductQuantities,
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
    if (saving) return;

    // Chantier Prise de masse (2026-04-24) : check alertes sport avant save.
    if (form.objective === "sport" && !sportAlertsAcknowledged) {
      const alerts = detectSportAlerts({
        profile: form.sportProfile,
        intake: form.currentIntake,
        weightKg: form.weight,
        muscleMassPercent: form.muscleMass || null,
        sleepHours: form.sleepHours || null,
        waterIntakeLiters: form.waterIntake || null,
        snackingFrequency: form.snackingFrequency || null,
        reportedTypes: form.sportProfile?.types,
      });
      if (alerts.length > 0) {
        setSportAlerts(alerts);
        setSportAlertsOpen(true);
        return;
      }
    }

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

    // Chantier refonte bilan (2026-04-24) : impossible de valider sans
    // avoir planifié de RDV suivi (sauf suivi libre explicite).
    if (!hasFollowUpPlanned) {
      setShowValidationBanner(true);
      return;
    }

    // Programme optionnel — pas de validation bloquante

    setSaving(true);
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
      messageALaisser: form.messageALaisser,
      // Chantier Polish Vue complète (2026-04-24) : on fige les notes
      // coach à la validation du bilan, affichées en lecture seule dans
      // la fiche client (bloc "Notes du bilan initial").
      coachNotesInitial: coachNotes.trim() || null,
      coachNotesDraft: null
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
          birthDate: form.birthDate || null,
          height: form.height,
          job: form.job.trim() || "Non renseigné",
          city: form.city.trim() || undefined,
          distributorId: assignedUser?.id ?? currentUser?.id ?? "u-local-admin",
          distributorName: assignedUser?.name ?? currentUser?.name ?? "Lor'Squad Wellness",
          objective: form.objective
        },
        assessment,
        clientStatus,
        // Sync coach↔client (2026-04-25) : persister le programme sélectionné
        // indépendamment de startsImmediately — sinon le header fiche + app
        // client affiche "Programme à confirmer" alors que le coach a déjà
        // choisi. startsImmediately n'influe plus que sur pvProgramId (module PV).
        currentProgram: selectedProgram?.title ?? (startsImmediately ? programTitle : ""),
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

      // RGPD Phase 1 (2026-04-30) : INSERT du consentement attestee par
      // le coach a l'ouverture (popup ConsentDialog). On le fait ICI parce
      // que le clientId vient juste d'etre cree.
      if (consentGiven && currentUser?.id && clientId) {
        await recordConsentInsert({ clientId, coachId: currentUser.id });
      }

      // Pop-up business bilan (2026-11-03) — persiste curiosite + ambition.
      // Best-effort, non bloquant : si l UPDATE plante on log seulement.
      if (clientId && (form.businessCuriosity || form.businessInterestAmount !== null)) {
        try {
          const sbBiz = await getSupabaseClient();
          if (sbBiz) {
            const update: Record<string, unknown> = {};
            if (form.businessCuriosity) {
              update.business_curiosity = form.businessCuriosity;
            }
            if (form.businessInterestAmount !== null) {
              // -1 (Plus) -> null en DB + on garde la note libre. Sinon montant
              // direct (0 = decline explicite, 100/300/500/1000).
              update.business_interest_amount =
                form.businessInterestAmount === -1 ? null : form.businessInterestAmount;
              update.business_interest_date = new Date().toISOString();
              if (form.businessInterestNote.trim()) {
                update.business_interest_note = form.businessInterestNote.trim();
              }
            }
            if (Object.keys(update).length > 0) {
              await sbBiz.from("clients").update(update).eq("id", clientId);
            }
          }
        } catch (bizErr) {
          console.warn("[business-interest] persist failed (non-blocking):", bizErr);
        }
      }

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

      // Chantier Auto-notif RDV (2026-04-24) : message auto au client
      // si un RDV de suivi est planifié (sauf suivi libre). Best-effort,
      // non bloquant si échec.
      if (hasFollowUpPlanned && form.typeDeSuite !== "suivi_libre" && form.nextFollowUp) {
        try {
          const sbMsg = await getSupabaseClient();
          if (sbMsg && currentUser?.id) {
            const d = new Date(form.nextFollowUp);
            const dateLabel = d.toLocaleDateString("fr-FR", {
              weekday: "long",
              day: "2-digit",
              month: "long",
            });
            const hourLabel = d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
            const msg = `Salut ${form.firstName.trim()} ! 🎉\n\nMerci pour ce super bilan. Notre prochain RDV est confirmé :\n📅 ${dateLabel}\n⏰ ${hourLabel}\n\nÀ très vite pour ton suivi ! 💪\n${currentUser.name ?? "Coach"}`;
            await sbMsg.from("client_messages").insert({
              client_id: clientId,
              client_name: `${form.firstName.trim()} ${form.lastName.trim()}`,
              distributor_id: currentUser.id,
              message_type: "coach_reply",
              message: msg,
              sender: "coach",
              sender_id: currentUser.id,
            });
          }
        } catch (msgErr) {
          console.warn("[auto-notif RDV] échec non bloquant:", msgErr);
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
            clearCoachNotesDraft(prospectId);
            // Chantier Page remerciement post-bilan (2026-04-27) :
            // remplace l'ouverture de ClientAccessModal par une navigation
            // vers la page plein écran /bilan-termine (dark premium, QR,
            // partage, parrainage, avis). La modale reste accessible
            // depuis la fiche coach pour les usages hors-bilan.
            const tokenParam = encodeURIComponent(recapData.token);
            const firstNameParam = encodeURIComponent(form.firstName?.trim() ?? "");
            navigate(
              `/clients/${clientId}/bilan-termine?token=${tokenParam}&firstName=${firstNameParam}`,
            );
            return;
          }
        }

        // Pas de Supabase ou pas de token renvoyé → mode local, on nettoie le draft
        clearAssessmentDraft();
        clearCoachNotesDraft(prospectId);
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
    } finally {
      setSaving(false);
    }
  }


  // Chantier Academy refonte (2026-04-27) : mode demo. Si ?demo=academy
  // dans l URL, on affiche un banner discret + on bypasse l insert DB
  // au submit final (handle dans handleSubmit / handleSaveAssessment).
  const isDemoMode = searchParams.get("demo") === "academy";

  // RGPD Phase 1 (2026-04-30) : popup obligatoire au mount, sauf demo Academy.
  // Le consentement local debloque le wizard. INSERT differe au save
  // (handleSaveAssessment) avec le clientId.
  if (!isDemoMode && !consentGiven) {
    const fakeClient = {
      id: "pending",
      firstName: form.firstName.trim() || "ton client·e",
      lastName: form.lastName.trim() || "",
    } as Client;
    return (
      <ConsentDialog
        client={fakeClient}
        open={true}
        skipDbInsert
        onConsented={() => setConsentGiven(true)}
        onCancel={() => navigate("/clients")}
      />
    );
  }

  return (
    <div className="flex flex-col xl:flex-row xl:gap-6">
      {isDemoMode ? (
        <div
          style={{
            position: "fixed",
            top: 12,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 999,
            background: "linear-gradient(135deg, #FAEEDA, #F0DBB0)",
            color: "#5C3A05",
            border: "1px solid rgba(186,117,23,0.35)",
            padding: "8px 16px",
            borderRadius: 999,
            fontSize: 12,
            fontWeight: 500,
            fontFamily: "DM Sans, sans-serif",
            boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
          }}
        >
          🎓 Mode démo Academy — aucune donnée ne sera enregistrée
        </div>
      ) : null}
      {/* Chantier refonte bilan (2026-04-24) : panneau notes desktop visible
          uniquement sur étapes 0-4 et 12. Remplace la sidebar gauche. */}
      {notesVisible ? (
        <div className="hidden xl:block">
          <NotesPanel
            clientFirstName={form.firstName}
            value={coachNotes}
            onChange={(v) => {
              setCoachNotes(v);
              persistCoachNotesLocal(v);
            }}
            onAutoSave={() => persistCoachNotesLocal(coachNotes)}
            clientId={null}
          />
        </div>
      ) : null}

      {/* Mobile : bouton flottant + drawer notes (visible uniquement quand panneau actif) */}
      {notesVisible ? (
        <button
          type="button"
          onClick={() => setShowMobileNotes(true)}
          className="xl:hidden"
          aria-label="Ouvrir mes notes"
          style={{
            position: "fixed",
            right: 14,
            bottom: 84,
            zIndex: 30,
            padding: "10px 14px",
            borderRadius: 999,
            background: "#BA7517",
            color: "#FFFFFF",
            border: "none",
            fontSize: 13,
            fontFamily: "DM Sans, sans-serif",
            fontWeight: 600,
            boxShadow: "0 4px 14px rgba(186,117,23,0.4)",
            cursor: "pointer",
          }}
        >
          📝 Mes notes
        </button>
      ) : null}
      {showMobileNotes && notesVisible ? (
        <NotesPanel
          mobile
          clientFirstName={form.firstName}
          value={coachNotes}
          onChange={(v) => {
            setCoachNotes(v);
            persistCoachNotesLocal(v);
          }}
          onAutoSave={() => persistCoachNotesLocal(coachNotes)}
          onClose={() => setShowMobileNotes(false)}
        />
      ) : null}

      <div className="space-y-6 min-w-0 flex-1">
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

      <style>{`
        @keyframes ls-step-fade-in {
          0%   { opacity: 0; transform: translateY(8px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        .ls-step-fade {
          animation: ls-step-fade-in 0.32s cubic-bezier(0.22, 1, 0.36, 1);
        }
        @media (prefers-reduced-motion: reduce) {
          .ls-step-fade { animation: none !important; }
        }
      `}</style>
      <div className="grid gap-4">
        <Card className="space-y-5">
          {/* Hero step premium (Refonte visuelle bilan, 2026-11-04) — masque
              sur 'program' (le hero gold dedie suffit, sinon doublon).
              Inclut : eyebrow contextuel + titre Syne + whisper coach +
              progression numerique + parcours badge. Gradient ambient
              gold->teal en arriere-plan pour la profondeur. */}
          {currentStepId !== 'program' && (() => {
            const whisper = STEP_WHISPERS[currentStepId];
            return (
              <div
                className="ls-step-hero"
                style={{
                  position: 'relative',
                  padding: '20px 22px 22px',
                  borderRadius: 22,
                  overflow: 'hidden',
                  background:
                    'linear-gradient(135deg, color-mix(in srgb, var(--ls-gold) 6%, var(--ls-surface)) 0%, color-mix(in srgb, var(--ls-teal) 4%, var(--ls-surface)) 100%)',
                  border:
                    '0.5px solid color-mix(in srgb, var(--ls-gold) 22%, var(--ls-border))',
                }}
              >
                {/* Glow ambient en haut a droite */}
                <div
                  aria-hidden="true"
                  style={{
                    position: 'absolute',
                    top: -50,
                    right: -50,
                    width: 180,
                    height: 180,
                    borderRadius: '50%',
                    background:
                      'color-mix(in srgb, var(--ls-gold) 14%, transparent)',
                    filter: 'blur(48px)',
                    pointerEvents: 'none',
                  }}
                />
                <div
                  style={{
                    position: 'relative',
                    display: 'flex',
                    flexWrap: 'wrap',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    gap: 16,
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p
                      style={{
                        fontFamily: 'DM Sans, sans-serif',
                        fontSize: 11,
                        fontWeight: 700,
                        letterSpacing: '0.18em',
                        textTransform: 'uppercase',
                        color: 'var(--ls-gold)',
                        margin: 0,
                        marginBottom: 6,
                      }}
                    >
                      {whisper?.eyebrow ?? `Étape ${currentStep + 1} sur ${steps.length}`}
                    </p>
                    <h2
                      style={{
                        fontFamily: 'Syne, serif',
                        fontWeight: 800,
                        fontSize: 'clamp(22px, 3.6vw, 32px)',
                        letterSpacing: '-0.02em',
                        lineHeight: 1.12,
                        margin: 0,
                      }}
                    >
                      <span
                        style={{
                          background:
                            'linear-gradient(135deg, var(--ls-gold) 0%, color-mix(in srgb, var(--ls-gold) 60%, var(--ls-teal) 40%) 100%)',
                          WebkitBackgroundClip: 'text',
                          WebkitTextFillColor: 'transparent',
                          backgroundClip: 'text',
                        }}
                      >
                        {steps[currentStep]}
                      </span>
                    </h2>
                    {whisper?.whisper ? (
                      <p
                        style={{
                          fontFamily: 'DM Sans, sans-serif',
                          fontSize: 13.5,
                          lineHeight: 1.55,
                          color: 'var(--ls-text-muted)',
                          margin: '10px 0 0',
                          maxWidth: 620,
                        }}
                      >
                        {whisper.whisper}
                      </p>
                    ) : null}
                    <div
                      style={{
                        marginTop: 12,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        fontFamily: 'DM Sans, sans-serif',
                        fontSize: 11,
                        color: 'var(--ls-text-muted)',
                      }}
                    >
                      <span
                        style={{
                          display: 'inline-block',
                          width: 6,
                          height: 6,
                          borderRadius: 999,
                          background: 'var(--ls-gold)',
                          boxShadow: '0 0 8px rgba(239,159,39,0.50)',
                        }}
                      />
                      <span style={{ fontWeight: 600 }}>
                        Étape {currentStep + 1} / {steps.length}
                      </span>
                    </div>
                  </div>
                  <StatusBadge
                    label={form.objective === 'sport' ? '🏋️ Parcours sport' : '🎯 Parcours accompagnement'}
                    tone={form.objective === 'sport' ? 'green' : 'blue'}
                  />
                </div>
              </div>
            );
          })()}

          <div key={currentStepId} className="ls-step-fade space-y-5">

          {currentStepId === 'client-info' && (
              <div className="space-y-4" data-tour-id="bilan-client-info">
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
                  {/* Chantier birth_date bilan initial (2026-04-29) : date de naissance => age auto. */}
                  <div className="flex flex-col gap-1">
                    <Field
                      label="Date de naissance"
                      type="date"
                      value={form.birthDate}
                      onChange={(v) => {
                        update("birthDate", v);
                        const computed = calculateAge(v);
                        if (computed !== null) update("age", computed);
                      }}
                    />
                    {form.birthDate && form.age > 0 ? (
                      <p className="text-xs text-[var(--ls-text-muted)]">
                        Âge : <strong>{form.age} ans</strong> (calculé auto)
                      </p>
                    ) : null}
                  </div>
                  <Field
                    label="Age (saisie manuelle si pas de date)"
                    type="number"
                    value={form.age}
                    onChange={(v) => update("age", Number(v))}
                  />
                  <Field label="Taille (cm)" type="number" value={form.height} onChange={(v) => update("height", Number(v))} />
                  <Field label="Profession" value={form.job} onChange={(v) => update("job", v)} />
                  <Field label="Ville" value={form.city} onChange={(v) => update("city", v)} />
                </div>

                {/* Pop-up business bilan (2026-11-03) — question legere etape 1.
                    Captee discretement sous Profession, ouvre l etape
                    business-ambition plus tard si la reponse n est pas "Jamais". */}
                <div
                  className="rounded-2xl p-4"
                  style={{
                    background: "color-mix(in srgb, var(--ls-teal) 5%, var(--ls-surface2))",
                    border: "0.5px solid color-mix(in srgb, var(--ls-teal) 22%, var(--ls-border))",
                  }}
                >
                  <p
                    className="text-sm"
                    style={{
                      fontFamily: "DM Sans, sans-serif",
                      color: "var(--ls-text)",
                      fontWeight: 600,
                      marginBottom: 4,
                    }}
                  >
                    💭 Au-delà de ton job, t'arrive-t-il de penser à un complément de revenu ?
                  </p>
                  <p
                    className="text-xs"
                    style={{ color: "var(--ls-text-muted)", marginBottom: 12 }}
                  >
                    Une question ouverte, sans engagement. Juste pour mieux te connaître.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {([
                      { value: "never", label: "Jamais" },
                      { value: "sometimes", label: "Parfois" },
                      { value: "often", label: "Oui souvent" },
                    ] as const).map((opt) => {
                      const active = form.businessCuriosity === opt.value;
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => update("businessCuriosity", opt.value)}
                          style={{
                            padding: "8px 16px",
                            borderRadius: 999,
                            fontFamily: "DM Sans, sans-serif",
                            fontSize: 13,
                            fontWeight: active ? 700 : 500,
                            background: active
                              ? "var(--ls-teal)"
                              : "var(--ls-surface)",
                            color: active ? "#fff" : "var(--ls-text)",
                            border: active
                              ? "1px solid var(--ls-teal)"
                              : "0.5px solid var(--ls-border)",
                            cursor: "pointer",
                            transition: "all 150ms ease",
                          }}
                        >
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <SectionBlock
                  title="Bloc 0 · Objectif et antécédents"
                  description="Poser le cap dès le début et noter tout point santé à respecter."
                >
                  <div className="grid gap-4 md:grid-cols-2">
                    <ChoiceGroup
                      label="Objectif principal"
                      value={form.objectiveFocus}
                      options={["Perte de poids", "Prise de masse", "Énergie", "Remise en forme", "Autre"]}
                      onChange={updateObjectiveFocus}
                    />
                    <TimelineChoiceField
                      label="Délai souhaité"
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
                      label="Santé / traitement"
                      value={form.healthStatus}
                      options={["RAS", "Traitement en cours", "Pathologie connue", "Avis médical à respecter"]}
                      onChange={(v) => update("healthStatus", v)}
                    />
                    <AreaField
                      label="Antécédents / précision utile"
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

          {currentStepId === 'habits' && (
            <div className="space-y-4">
              <SectionBlock title="Bloc 1 · Rythme de vie" description="Comprendre le rythme réel avant de parler alimentation.">
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
                  const bedMin = bh * 60 + bm
                  let wakeMin = wh * 60 + wm
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
                <ChoiceGroup label="Sieste en journée" value={form.napFrequency} options={["Jamais", "Parfois", "Souvent"]} onChange={(v) => update("napFrequency", v)} />
              </SectionBlock>

              <SectionBlock title="Bloc 2 · Petit-déjeuner" description="Faire ressortir si le matin soutient vraiment la journée.">
                <div className="grid gap-4 md:grid-cols-2">
                  <ChoiceGroup label="Petit-déjeuner tous les jours" value={form.breakfastFrequency} options={["Oui", "Non", "Parfois"]} onChange={(v) => update("breakfastFrequency", v)} />
                  <Field label="Heure du petit-déjeuner" type="time" value={form.breakfastTime} onChange={(v) => update("breakfastTime", v)} />
                  <AreaField label="Que consommes-tu le matin ?" value={form.breakfastContent} onChange={(v) => update("breakfastContent", v)} />
                  <ChoiceGroup label="Tient jusqu'au repas suivant" value={form.breakfastSatiety} options={["Oui", "Non", "Pas toujours"]} onChange={(v) => update("breakfastSatiety", v)} />
                </div>
              </SectionBlock>

              <SectionBlock title="Bloc 3 · Organisation des repas" description="Chercher la régularité sans entrer dans trop de détail.">
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <ChoiceGroup label="Repas par jour" value={String(form.mealsPerDay)} options={["1", "2", "3", "4 ou plus"]} onChange={(v) => update("mealsPerDay", v === "4 ou plus" ? 4 : Number(v))} />
                  <Field label="Premier vrai repas" type="time" value={form.firstMealTime} onChange={(v) => update("firstMealTime", v)} />
                  <ChoiceGroup label="Heures régulières" value={form.regularMealTimes} options={["Oui", "Non", "Pas toujours"]} onChange={(v) => update("regularMealTimes", v)} />
                  <ChoiceGroup label="Midi" value={form.lunchLocation} options={["À la maison", "Au travail", "Au restaurant", "Sur le pouce"]} onChange={(v) => update("lunchLocation", v)} />
                </div>
                <ChoiceGroup label="Le soir" value={form.dinnerTiming} options={["Tôt", "Normalement", "Tard"]} onChange={(v) => update("dinnerTiming", v)} />
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

          {currentStepId === 'food-quality' && (
            <div className="space-y-4">
              <SectionBlock title="Bloc 4 · Qualité alimentaire" description="Faire décrire rapidement le midi et le soir, puis évaluer les bases.">
                <div className="grid gap-4 md:grid-cols-2">
                  <AreaField label="Repas type du midi" value={form.lunchExample} onChange={(v) => update("lunchExample", v)} />
                  <AreaField label="Repas type du soir" value={form.dinnerExample} onChange={(v) => update("dinnerExample", v)} />
                  <ChoiceGroup label="Légumes chaque jour" value={form.vegetablesDaily} options={["Oui", "Non", "Pas assez"]} onChange={(v) => update("vegetablesDaily", v)} />
                  <ChoiceGroup label="Protéines à chaque repas" value={form.proteinEachMeal} options={["Oui", "Non", "Pas toujours"]} onChange={(v) => update("proteinEachMeal", v)} />
                </div>
                <ChoiceGroup
                  label="À quelle fréquence consommes-tu des produits sucrés ou ultra-transformés ? (sodas, plats préparés, bonbons)"
                  value={form.sugaryProducts}
                  options={["Rarement", "Parfois", "Souvent", "Très souvent"]}
                  onChange={(v) => update("sugaryProducts", v)}
                />
              </SectionBlock>

              <SectionBlock title="Bloc 5 · Grignotage et fringales" description="Faire ressortir le vrai moment de craquage et la cause la plus fréquente.">
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <ChoiceGroup label="Grignotage" value={form.snackingFrequency} options={["Jamais", "Parfois", "Souvent"]} onChange={(v) => update("snackingFrequency", v)} />
                  <ChoiceGroup label="Moment" value={form.snackingMoment} options={["Matin", "Après-midi", "Soir", "Nuit"]} onChange={(v) => update("snackingMoment", v)} />
                  <ChoiceGroup label="Attirance" value={form.cravingsPreference} options={["Sucré", "Salé", "Les deux"]} onChange={(v) => update("cravingsPreference", v)} />
                  <ChoiceGroup label="Cause fréquente" value={form.snackingTrigger} options={["Faim", "Stress", "Habitude", "Fatigue", "Ennui", "Émotions"]} onChange={(v) => update("snackingTrigger", v)} />
                </div>
              </SectionBlock>

              <SectionBlock title="Bloc 6 · Hydratation et boissons" description="Rester sur les volumes et les habitudes qui changent vraiment la lecture.">
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <Field label="Eau par jour (L)" type="number" step="0.1" value={form.waterIntake} onChange={(v) => update("waterIntake", Number(v))} />
                  <ChoiceGroup label="Café" value={form.drinksCoffee} options={["Oui", "Non"]} onChange={(v) => update("drinksCoffee", v)} />
                  <Field label="Cafés par jour" type="number" value={form.coffeePerDay} onChange={(v) => update("coffeePerDay", Number(v))} />
                  <ChoiceGroup label="Boissons sucrées" value={form.sweetDrinks} options={["Jamais", "Parfois", "Souvent"]} onChange={(v) => update("sweetDrinks", v)} />
                </div>
                <ChoiceGroup label="Alcool" value={form.alcohol} options={["Jamais", "Occasionnellement", "Chaque semaine", "Souvent"]} onChange={(v) => update("alcohol", v)} />
              </SectionBlock>
            </div>
          )}

          {currentStepId === 'health-objective' && (
              <div className="space-y-4" data-tour-id="bilan-objective">
              <SectionBlock title="Bloc 7 · Allergies, transit et contexte pathologique" description="Ajouter seulement les points santé utiles pour cadrer l'accompagnement.">
                <div className="grid gap-4 md:grid-cols-2">
                  <Field
                    label="Allergies / intolérances"
                    value={form.allergies}
                    onChange={(v) => update("allergies", v)}
                  />
                  <ChoiceGroup
                    label="Niveau du transit"
                    value={form.transitStatus}
                    options={["Normal", "Lent", "Irrégulier", "Sensible"]}
                    onChange={(v) => update("transitStatus", v)}
                  />
                  <AreaField
                    label="Contexte pathologique utile"
                    value={form.pathologyContext}
                    onChange={(v) => update("pathologyContext", v)}
                  />
                  <AreaField
                    label="Point santé à surveiller"
                    value={form.healthNotes}
                    onChange={(v) => update("healthNotes", v)}
                  />
                </div>
              </SectionBlock>

              <SectionBlock title="Bloc 8 · Activité et forme" description="Chercher le niveau réel d'activité et d'énergie.">
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <ChoiceGroup label="Activité physique" value={form.physicalActivity} options={["Oui", "Non"]} onChange={(v) => update("physicalActivity", v)} />
                  <Field label="Si oui, laquelle ?" value={form.activityType} onChange={(v) => update("activityType", v)} />
                  <Field label="Séances / semaine" type="number" value={form.sessionsPerWeek} onChange={(v) => update("sessionsPerWeek", Number(v))} />
                  <ChoiceGroup label="Niveau d'énergie" value={form.energyLevel} options={["Très bon", "Bon", "Moyen", "Faible"]} onChange={(v) => update("energyLevel", v)} />
                </div>
              </SectionBlock>

              <SectionBlock title="Bloc 9 · Historique et blocages" description="Faire apparaître ce qui a déjà été tenté et ce qui bloque aujourd'hui.">
                <div className="grid gap-4 md:grid-cols-2">
                  <AreaField label="Tentatives passées" value={form.pastAttempts} onChange={(v) => update("pastAttempts", v)} />
                  <AreaField label="Le plus difficile jusqu'ici" value={form.hardestPart} onChange={(v) => update("hardestPart", v)} />
                </div>
                <ChoiceGroup label="Blocage principal" value={form.mainBlocker} options={["Manque de temps", "Motivation", "Organisation", "Grignotage", "Fatigue", "Manque de repères", "Autre"]} onChange={(v) => update("mainBlocker", v)} />
              </SectionBlock>
              </div>
            )}

          {currentStepId === 'meal-composition' && (() => {
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

          {currentStepId === 'sport-profile' && (
            <SportProfileStep
              value={form.sportProfile}
              onChange={(v) => update("sportProfile", v)}
            />
          )}

          {currentStepId === 'current-intake' && (
            <CurrentIntakeStep
              value={form.currentIntake}
              onChange={(v) => update("currentIntake", v)}
              weightKg={form.weight}
              subObjective={form.sportProfile?.subObjective ?? "mass-gain"}
            />
          )}

          {currentStepId === 'body-scan' && (
            <div className="space-y-4" data-tour-id="bilan-body-scan">
              {/* Rappel age + taille pour saisie sur la balance Tanita (2026-04-29) */}
              {(form.age > 0 || form.height > 0) && (
                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    alignItems: 'center',
                    gap: 14,
                    padding: '14px 18px',
                    background: 'color-mix(in srgb, var(--ls-gold) 8%, var(--ls-surface))',
                    border: '0.5px solid color-mix(in srgb, var(--ls-gold) 40%, transparent)',
                    borderLeft: '3px solid var(--ls-gold)',
                    borderRadius: 12,
                  }}
                >
                  <span style={{ fontSize: 18 }}>⚖️</span>
                  <span style={{ fontSize: 12, color: 'var(--ls-text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1.2 }}>
                    À saisir sur la balance
                  </span>
                  {form.age > 0 && (
                    <span style={{ fontSize: 13, color: 'var(--ls-text)' }}>
                      Âge : <strong style={{ fontFamily: 'Syne, serif', fontSize: 17, color: 'var(--ls-gold)' }}>{form.age}</strong> ans
                    </span>
                  )}
                  {form.height > 0 && (
                    <span style={{ fontSize: 13, color: 'var(--ls-text)' }}>
                      Taille : <strong style={{ fontFamily: 'Syne, serif', fontSize: 17, color: 'var(--ls-gold)' }}>{form.height}</strong> cm
                    </span>
                  )}
                  <span style={{ fontSize: 13, color: 'var(--ls-text)' }}>
                    Sexe : <strong style={{ fontFamily: 'Syne, serif', fontSize: 15, color: 'var(--ls-gold)' }}>{form.sex === 'male' ? 'Homme' : 'Femme'}</strong>
                  </span>
                </div>
              )}

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

              {/* Scan completion celebration (2026-04-29) — pulse premium quand 8/8 saisies */}
              {(() => {
                const fields = [form.weight, form.bodyFat, form.muscleMass, form.hydration, form.boneMass, form.visceralFat, form.bmr, form.metabolicAge];
                const filled = fields.filter((v) => Number(v) > 0).length;
                const total = fields.length;
                const isComplete = filled === total;
                if (filled === 0) return null;
                return (
                  <div
                    style={{
                      position: 'relative',
                      overflow: 'hidden',
                      padding: '14px 18px',
                      borderRadius: 14,
                      background: isComplete
                        ? 'linear-gradient(135deg, color-mix(in srgb, var(--ls-teal) 14%, var(--ls-surface)) 0%, color-mix(in srgb, var(--ls-gold) 12%, var(--ls-surface)) 100%)'
                        : 'var(--ls-surface)',
                      border: isComplete
                        ? '0.5px solid color-mix(in srgb, var(--ls-teal) 50%, transparent)'
                        : '0.5px solid var(--ls-border)',
                      boxShadow: isComplete
                        ? '0 0 0 0 rgba(45,212,191,0.45), 0 8px 24px -12px rgba(45,212,191,0.40)'
                        : 'none',
                      animation: isComplete ? 'ls-scan-complete-pulse 2.4s ease-in-out infinite' : undefined,
                      transition: 'background 0.4s ease, border 0.4s ease',
                    }}
                  >
                    <style>{`
                      @keyframes ls-scan-complete-pulse {
                        0%, 100% { box-shadow: 0 0 0 0 rgba(45,212,191,0), 0 8px 24px -12px rgba(45,212,191,0.40); }
                        50%      { box-shadow: 0 0 0 6px rgba(45,212,191,0.18), 0 12px 32px -10px rgba(45,212,191,0.55); }
                      }
                      @keyframes ls-scan-shine {
                        0%, 100% { transform: translateX(-30%); opacity: 0; }
                        50%      { transform: translateX(180%); opacity: 0.4; }
                      }
                      @media (prefers-reduced-motion: reduce) {
                        [data-scan-shine], [data-scan-pulse] { animation: none !important; }
                      }
                    `}</style>
                    {isComplete && (
                      <div
                        data-scan-shine
                        style={{
                          position: 'absolute', top: 0, left: 0, height: '100%', width: '30%',
                          background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.30), transparent)',
                          animation: 'ls-scan-shine 2.8s ease-in-out infinite',
                          pointerEvents: 'none',
                        }}
                      />
                    )}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, position: 'relative' }}>
                      <span style={{ fontSize: 22 }}>{isComplete ? '✨' : '⚡'}</span>
                      <div style={{ flex: 1 }}>
                        <div
                          style={{
                            fontSize: 10,
                            letterSpacing: 1.4,
                            textTransform: 'uppercase',
                            fontWeight: 700,
                            color: isComplete ? 'var(--ls-teal)' : 'var(--ls-gold)',
                            fontFamily: 'DM Sans, sans-serif',
                          }}
                        >
                          {isComplete ? 'Body scan complet' : 'Scan en cours'}
                        </div>
                        <div
                          style={{
                            fontFamily: 'Syne, serif',
                            fontWeight: 700,
                            fontSize: 16,
                            color: 'var(--ls-text)',
                            marginTop: 2,
                            letterSpacing: '-0.01em',
                          }}
                        >
                          {isComplete
                            ? '8 valeurs saisies — analyse prête à être commentée'
                            : `${filled} / ${total} valeurs saisies`}
                        </div>
                      </div>
                      <div
                        style={{
                          fontFamily: 'Syne, serif',
                          fontWeight: 800,
                          fontSize: 28,
                          letterSpacing: '-0.03em',
                          color: isComplete ? 'var(--ls-teal)' : 'var(--ls-gold)',
                        }}
                      >
                        {filled}/{total}
                      </div>
                    </div>
                    {/* Mini progress bar */}
                    <div
                      style={{
                        marginTop: 10,
                        height: 4,
                        background: 'var(--ls-surface2)',
                        borderRadius: 999,
                        overflow: 'hidden',
                      }}
                    >
                      <div
                        style={{
                          height: '100%',
                          width: `${(filled / total) * 100}%`,
                          background: isComplete
                            ? 'linear-gradient(90deg, var(--ls-teal), var(--ls-gold))'
                            : 'linear-gradient(90deg, var(--ls-gold), #BA7517)',
                          borderRadius: 999,
                          transition: 'width 0.5s cubic-bezier(0.22, 1, 0.36, 1)',
                          boxShadow: isComplete ? '0 0 8px rgba(45,212,191,0.55)' : '0 0 6px rgba(239,159,39,0.45)',
                        }}
                      />
                    </div>
                  </div>
                );
              })()}

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

          {/* Chantier nettoyage bilan (2026-04-20) : "Références de suivi"
              supprimée de la numérotation. Les index ci-dessous sont décalés. */}

          {/* ─── Étape 6 : Dégustation — déplacée avant Recommandations (2026-04-20).
                Le client goûte d'abord, puis lit les recos pendant qu'il boit. ─── */}
          {currentStepId === 'tasting' && (
            <VisualStepBoundary title="Place à la dégustation">
              <Card className="space-y-5">
                <div>
                  <p className="eyebrow-label">Dégustation</p>
                  <h2 className="mt-2 text-2xl" style={{ fontFamily: "Syne, sans-serif", color: "var(--ls-text)" }}>
                    Je vais te faire goûter notre délicieux petit-déj, tu préfères quelle saveur ?
                  </h2>
                </div>
                <div style={{ display: "flex", justifyContent: "center" }}>
                  {/* WebP primary (76 KB) + PNG fallback (270 KB) — Chantier
                      optimize-bilan-images (2026-04-20). */}
                  <picture>
                    <source srcSet="/images/assessment/saveurs-formula1.webp" type="image/webp" />
                    <img
                      src="/images/assessment/saveurs-formula1.png"
                      alt="Saveurs Formula 1 disponibles"
                      loading="lazy"
                      decoding="async"
                      style={{ maxWidth: 500, width: "100%", height: "auto", borderRadius: 14, display: "block" }}
                      onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                    />
                  </picture>
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

          {/* ─── Étape 7 : Recommandations (déplacée après Dégustation — 2026-04-20) ─── */}
          {currentStepId === 'recommendations' && (
            <RecommendationStepCard
              recommendations={form.recommendations}
              recommendationsContacted={form.recommendationsContacted}
              onChange={updateRecommendation}
              onToggleContacted={(value) => update("recommendationsContacted", value)}
            />
          )}

          {/* Étape "Reconnaissance" supprimée — Chantier nettoyage bilan (2026-04-20) */}

          {/* ─── Étape 8 : Petit-déjeuner ─── */}
          {currentStepId === 'breakfast' && (
            <VisualStepBoundary title="Petit-déjeuner">
              <BreakfastStorySlider
                breakfastContent={form.breakfastContent}
                analysis={form.breakfastAnalysis}
                onAnalysisChange={(next) => update("breakfastAnalysis", next)}
              />

              {/* Cibles nutritionnelles affichees ici aussi (2026-04-29) pour
                  pitcher la nutrition au client pendant qu on parle du petit-dej.
                  Memes valeurs que sur l etape 11 (Programme propose). */}
              {form.weight > 0 ? (
                <div
                  style={{
                    marginTop: 16,
                    padding: "14px 18px",
                    borderRadius: 14,
                    background:
                      "linear-gradient(135deg, color-mix(in srgb, var(--ls-teal) 10%, transparent), color-mix(in srgb, var(--ls-gold) 6%, transparent))",
                    border: "1px solid color-mix(in srgb, var(--ls-teal) 25%, transparent)",
                  }}
                >
                  <p className="eyebrow-label" style={{ marginBottom: 8 }}>
                    🎯 Tes objectifs nutritionnels (à présenter au client)
                  </p>
                  <div style={{ display: "grid", gap: 12, gridTemplateColumns: "1fr 1fr" }}>
                    <div>
                      <div style={{ fontSize: 11, color: "var(--ls-text-muted)", marginBottom: 2 }}>
                        💧 Hydratation cible
                      </div>
                      <div
                        style={{
                          fontFamily: "Syne, sans-serif",
                          fontSize: 22,
                          fontWeight: 800,
                          color: "var(--ls-text)",
                        }}
                      >
                        {computeWaterTarget(form.weight).toFixed(1)} L / jour
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: 11, color: "var(--ls-text-muted)", marginBottom: 2 }}>
                        🥩 Protéines cible
                      </div>
                      <div
                        style={{
                          fontFamily: "Syne, sans-serif",
                          fontSize: 22,
                          fontWeight: 800,
                          color: "var(--ls-text)",
                        }}
                      >
                        {computeProteinTarget(form.weight, form.objective)} g / jour
                      </div>
                    </div>
                  </div>
                  <div style={{ fontSize: 11, color: "var(--ls-text-muted)", marginTop: 8 }}>
                    Calculé selon le poids actuel ({form.weight.toFixed(1)} kg) et
                    l&apos;objectif « {form.objective === "sport" ? "Sport / masse" : "Perte de poids"} ».
                  </div>
                </div>
              ) : null}
            </VisualStepBoundary>
          )}

          {/* ─── Étape 9 : Notre concept de rééquilibrage alimentaire
                Contenu = uniquement l'image de référence. L'ancien
                LazyMorningRoutineCard (titre "Routine matin Lor'Squad") a
                été retiré — Chantier nettoyage bilan (2026-04-20) ─── */}
          {currentStepId === 'concept' && (
            <VisualStepBoundary title="Notre concept de rééquilibrage alimentaire">
              <div style={{ display: "flex", justifyContent: "center" }}>
                {/* WebP primary (118 KB) + PNG fallback (513 KB) — Chantier
                    optimize-bilan-images (2026-04-20). */}
                <picture>
                  <source srcSet="/images/assessment/petit-dejeuner-concept.webp" type="image/webp" />
                  <img
                    src="/images/assessment/petit-dejeuner-concept.png"
                    alt="Notre concept de rééquilibrage alimentaire"
                    loading="lazy"
                    decoding="async"
                    style={{ maxWidth: 900, width: "100%", height: "auto", borderRadius: 14, display: "block" }}
                    onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                  />
                </picture>
              </div>
            </VisualStepBoundary>
          )}

          {/* Pop-up business bilan (2026-11-03) — etape immersive entre concept et program */}
          {currentStepId === 'business-ambition' && (
            <BusinessAmbitionStep
              firstName={form.firstName}
              amount={form.businessInterestAmount}
              note={form.businessInterestNote}
              onAmountChange={(v) => update("businessInterestAmount", v)}
              onNoteChange={(v) => update("businessInterestNote", v)}
            />
          )}

          {currentStepId === 'program' && (() => {
            // Chantier refonte étape 11 (2026-04-20) — tunnel de vente structuré.
            const chosenProgram = getProgramById(form.programChoice);
            // Chantier Boosters cliquables + Quantités (2026-04-24) :
            // les boosters sport sélectionnés alimentent aussi le ticket.
            // BOOSTERS n'ont pas de PV dans le référentiel actuel (hors scope),
            // on force pv=0 côté ticket — à enrichir si BOOSTERS gagne un champ pv.
            const selectedBoostersForTicket = BOOSTERS
              .filter((b) => effectiveSelectedProductIds.includes(b.id))
              .map((b) => ({
                id: b.id,
                name: b.title,
                prixPublic: b.price,
                pv: 0,
              }));
            // Sandbox catalogue (V3.2 — 2026-04-29) : produits ajoutes via la
            // modale catalogue qui ne sont ni dans les besoins detectes ni
            // dans les boosters. Lookup dans pvProductCatalog.
            const knownIds = new Set([
              ...addOnProducts.map((p) => p.id),
              ...selectedBoostersForTicket.map((b) => b.id),
            ]);
            const catalogExtraIds = effectiveSelectedProductIds.filter((id) => !knownIds.has(id));
            const catalogExtraForTicket = catalogExtraIds
              .map((id) => pvProductCatalog.find((p) => p.id === id))
              .filter((p): p is NonNullable<typeof p> => !!p)
              .map((p) => ({
                id: p.id,
                name: p.name,
                prixPublic: p.pricePublic,
                pv: p.pv,
              }));
            const combinedAddOns = [...addOnProducts, ...selectedBoostersForTicket, ...catalogExtraForTicket].filter(
              (v, i, arr) => arr.findIndex((x) => x.id === v.id) === i
            );
            const ticketAddOns: TicketAddOn[] = combinedAddOns.map((p) => ({
              id: p.id,
              name: p.name,
              price: p.prixPublic,
              pv: p.pv,
              quantity: getQty(p.id),
            }));
            return (
              <>
              {/* Hero gold premium sales pitch (2026-04-29) — moment cle commercial */}
              <div
                style={{
                  position: 'relative',
                  overflow: 'hidden',
                  padding: '20px 24px',
                  borderRadius: 20,
                  background: 'linear-gradient(135deg, #EF9F27 0%, #BA7517 50%, #5C3A05 100%)',
                  border: '0.5px solid color-mix(in srgb, var(--ls-gold) 60%, transparent)',
                  boxShadow: '0 12px 32px -8px rgba(186,117,23,0.50), inset 0 1px 0 rgba(255,255,255,0.20)',
                  marginBottom: 4,
                }}
              >
                <style>{`
                  @keyframes ls-program-hero-shine {
                    0%, 100% { transform: translateX(-30%); opacity: 0; }
                    50%      { transform: translateX(180%); opacity: 0.45; }
                  }
                  @keyframes ls-program-hero-mesh {
                    0% { transform: translate(0, 0) scale(1); }
                    50% { transform: translate(-12px, 8px) scale(1.06); }
                    100% { transform: translate(8px, -4px) scale(1); }
                  }
                  @media (prefers-reduced-motion: reduce) {
                    [data-program-shine], [data-program-mesh] { animation: none !important; }
                  }
                `}</style>
                {/* Mesh radial subtle */}
                <div
                  data-program-mesh
                  aria-hidden="true"
                  style={{
                    position: 'absolute', inset: -40, opacity: 0.65,
                    background:
                      'radial-gradient(circle at 0% 0%, rgba(255,255,255,0.20) 0%, transparent 45%), radial-gradient(circle at 100% 100%, rgba(0,0,0,0.20) 0%, transparent 50%)',
                    animation: 'ls-program-hero-mesh 18s ease-in-out infinite alternate',
                    pointerEvents: 'none',
                  }}
                />
                {/* Shine sweep */}
                <div
                  data-program-shine
                  aria-hidden="true"
                  style={{
                    position: 'absolute', top: 0, left: 0, height: '100%', width: '30%',
                    background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.45), transparent)',
                    animation: 'ls-program-hero-shine 5s ease-in-out infinite',
                    pointerEvents: 'none',
                  }}
                />
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                  <div
                    style={{
                      width: 56, height: 56, borderRadius: 16, flexShrink: 0,
                      background: 'rgba(255,255,255,0.18)',
                      border: '1px solid rgba(255,255,255,0.35)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 28,
                      backdropFilter: 'blur(8px)',
                      WebkitBackdropFilter: 'blur(8px)',
                      boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.30)',
                    }}
                  >
                    🎯
                  </div>
                  <div style={{ flex: 1, minWidth: 220 }}>
                    <div
                      style={{
                        fontSize: 10.5,
                        letterSpacing: 1.8,
                        textTransform: 'uppercase',
                        fontWeight: 800,
                        color: 'rgba(255,255,255,0.85)',
                        marginBottom: 4,
                        fontFamily: 'DM Sans, sans-serif',
                      }}
                    >
                      ✨ Programme personnalisé
                    </div>
                    <div
                      style={{
                        fontFamily: 'Syne, serif',
                        fontWeight: 800,
                        fontSize: 22,
                        color: '#FFFFFF',
                        letterSpacing: '-0.02em',
                        lineHeight: 1.15,
                        textShadow: '0 1px 2px rgba(0,0,0,0.20)',
                      }}
                    >
                      {form.firstName ? `Le programme de ${form.firstName}` : 'Ton programme personnalisé'}
                    </div>
                    <div
                      style={{
                        fontFamily: 'DM Sans, sans-serif',
                        fontSize: 13,
                        color: 'rgba(255,255,255,0.85)',
                        marginTop: 4,
                        lineHeight: 1.45,
                      }}
                    >
                      {chosenProgram
                        ? `Sélectionné : ${chosenProgram.title} · construis ton ticket et présente la valeur globale.`
                        : 'Choisis le programme adapté + ajoute les boosters · présente la valeur globale.'}
                    </div>
                  </div>
                  {/* Prix programme retire du hero (2026-04-29) :
                      le panier sticky a droite affiche deja le total avec
                      details Programme + Ajouts. Pas de doublon. */}
                </div>
              </div>

              <div className="grid gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
                {/* ─── Colonne principale — REFONTE PRO V2 (2026-04-29) ───
                     4 sections numerotees uniformes avec BilanSectionDivider.
                     Structure narrative claire : besoins → programme → ajouts → suite. */}
                <div className="space-y-7">

                  {/* ═══════════════════════════════════════════════════════
                      § 1 · TES BESOINS DETECTES (teal)
                      ═══════════════════════════════════════════════════════ */}
                  {form.weight > 0 && (
                    <section className="space-y-3">
                      <BilanSectionDivider
                        number={1}
                        eyebrow="Tes besoins detectes"
                        title="Ce que ton corps demande"
                        description={form.objective === "sport"
                          ? "Hydratation, proteines et profil sportif personnalise."
                          : "Hydratation et proteines calculees sur ton poids actuel."}
                        color="teal"
                      />

                      <div
                        style={{
                          padding: "16px 18px",
                          borderRadius: 16,
                          background: "var(--ls-surface)",
                          border: "0.5px solid var(--ls-border)",
                          borderLeft: "3px solid var(--ls-teal)",
                        }}
                      >
                        <div
                          style={{
                            display: "grid",
                            gap: 14,
                            gridTemplateColumns: form.objective === "sport" ? "1fr 1fr 1fr" : "1fr 1fr",
                          }}
                        >
                          <div>
                            <div style={{ fontSize: 11, color: "var(--ls-text-muted)", marginBottom: 4, fontFamily: "DM Sans, sans-serif", letterSpacing: 0.3 }}>
                              💧 Hydratation cible
                            </div>
                            <div
                              style={{
                                fontFamily: "Syne, serif",
                                fontSize: 22,
                                fontWeight: 800,
                                color: "var(--ls-text)",
                                letterSpacing: "-0.02em",
                              }}
                            >
                              {computeWaterTarget(form.weight).toFixed(1)}<span style={{ fontSize: 14, fontWeight: 600, color: "var(--ls-text-muted)", marginLeft: 3 }}>L/j</span>
                            </div>
                          </div>
                          <div>
                            <div style={{ fontSize: 11, color: "var(--ls-text-muted)", marginBottom: 4, fontFamily: "DM Sans, sans-serif", letterSpacing: 0.3 }}>
                              🥩 Proteines cible
                            </div>
                            <div
                              style={{
                                fontFamily: "Syne, serif",
                                fontSize: 22,
                                fontWeight: 800,
                                color: "var(--ls-text)",
                                letterSpacing: "-0.02em",
                              }}
                            >
                              {computeProteinTarget(form.weight, form.objective)}<span style={{ fontSize: 14, fontWeight: 600, color: "var(--ls-text-muted)", marginLeft: 3 }}>g/j</span>
                            </div>
                          </div>
                          {form.objective === "sport" && form.sportProfile && (
                            <div>
                              <div style={{ fontSize: 11, color: "var(--ls-text-muted)", marginBottom: 4, fontFamily: "DM Sans, sans-serif", letterSpacing: 0.3 }}>
                                🏋️ Profil sport
                              </div>
                              <div
                                style={{
                                  fontFamily: "Syne, serif",
                                  fontSize: 14,
                                  fontWeight: 700,
                                  color: "var(--ls-text)",
                                  letterSpacing: "-0.01em",
                                  lineHeight: 1.25,
                                }}
                              >
                                {form.sportProfile.frequency} · {form.sportProfile.subObjective}
                              </div>
                            </div>
                          )}
                        </div>
                        <div style={{ fontSize: 11, color: "var(--ls-text-hint)", marginTop: 12, fontFamily: "DM Sans, sans-serif" }}>
                          Calcule sur ton poids actuel ({form.weight.toFixed(1)} kg) et l&apos;objectif « {form.objective === "sport" ? "Sport / prise de masse" : "Perte de poids"} ».
                        </div>
                      </div>
                    </section>
                  )}

                  {/* ═══════════════════════════════════════════════════════
                      § 2 · LE PROGRAMME COEUR (gold)
                      ═══════════════════════════════════════════════════════ */}
                  <section className="space-y-3">
                    <BilanSectionDivider
                      number={2}
                      eyebrow="Le programme coeur"
                      title={chosenProgram ? `Programme : ${chosenProgram.title}` : "Choisis le programme adapte"}
                      description="La base nutritionnelle qui structure ta journee. 4 niveaux pour s&apos;adapter a ton mode de vie."
                      color="gold"
                    />

                    <div
                      className="grid gap-3"
                      style={{ gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))" }}
                    >
                      {PROGRAM_CHOICES
                        .filter((p) => p.category === form.objective || p.category === "unit")
                        .map((p) => (
                          <ProgramChoiceCard
                            key={p.id}
                            program={p}
                            active={form.programChoice === p.id}
                            onSelect={() => update("programChoice", p.id)}
                          />
                        ))}
                    </div>

                    {/* Banner confirmation supprime (2026-04-29) — le hero
                        gold affiche deja le programme dans le title et le
                        panier sticky le repete. Triple redondance retiree. */}

                    {/* Curseur lait — option du programme */}
                    <MilkConsumptionToggle
                      value={form.consumesMilk}
                      onChange={(v) => update("consumesMilk", v)}
                    />

                    {/* Routine matin */}
                    <RoutineMatinList program={chosenProgram} />
                  </section>

                  {/* ═══════════════════════════════════════════════════════
                      § 3 · POUR ALLER PLUS LOIN (coral)
                      Boosters sport + besoins detectes + upsells.
                      Affichee meme en perte de poids (pour besoins + upsells).
                      ═══════════════════════════════════════════════════════ */}
                  {(form.objective === "sport" ||
                    recommendationPlan.needs.length > 0 ||
                    recommendationPlan.optionalUpsells.length > 0) && (
                    <section className="space-y-3">
                      <BilanSectionDivider
                        number={3}
                        eyebrow="Pour aller plus loin"
                        title="Ce qu&apos;on peut ajouter au programme"
                        description="Boosters, besoins detectes par le bilan, options. Tout est optionnel."
                        color="coral"
                      />

                      {/* ─── Sub-block helper inline (modernize 2026-04-29) ─── */}
                      {/* Sub-blocks de § 3 sont des cards avec emoji avatar +
                          counter chip + headers premium uniformes. */}

                      {/* SOUS-BLOC 1 — Boosters sport (sport uniquement) */}
                      {form.objective === "sport" && (() => {
                        const recs = recommendBoosters(form.sportProfile, form.age);
                        const recById = new Map(recs.map((r) => [r.productId, r]));
                        const selectedCount = BOOSTERS.filter((b) => effectiveSelectedProductIds.includes(b.id)).length;
                        return (
                          // eslint-disable-next-line jsx-a11y/no-static-element-interactions -- Hover effect only, buttons inside
                          <div
                            style={{
                              padding: "16px 18px",
                              borderRadius: 16,
                              background: "var(--ls-surface)",
                              border: "0.5px solid var(--ls-border)",
                              borderLeft: "3px solid var(--ls-coral)",
                              transition: "border-color 0.2s ease, box-shadow 0.2s ease",
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.boxShadow = "0 4px 14px -8px rgba(251,113,133,0.30)";
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.boxShadow = "none";
                            }}
                          >
                            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
                              <div
                                style={{
                                  width: 42, height: 42, flexShrink: 0,
                                  borderRadius: 12,
                                  background: "linear-gradient(135deg, color-mix(in srgb, var(--ls-coral) 22%, var(--ls-surface2)) 0%, var(--ls-surface2) 100%)",
                                  border: "0.5px solid color-mix(in srgb, var(--ls-coral) 35%, transparent)",
                                  display: "flex", alignItems: "center", justifyContent: "center",
                                  fontSize: 22,
                                }}
                              >
                                ⚡
                              </div>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: 10, letterSpacing: 1.4, textTransform: "uppercase", fontWeight: 700, color: "var(--ls-coral)", fontFamily: "DM Sans, sans-serif" }}>
                                  Boosters sport
                                </div>
                                <div style={{ fontFamily: "Syne, serif", fontSize: 16, fontWeight: 700, color: "var(--ls-text)", marginTop: 2, letterSpacing: "-0.01em" }}>
                                  Pour pousser tes performances
                                </div>
                              </div>
                              {selectedCount > 0 && (
                                <span style={{
                                  fontSize: 11, fontWeight: 800, fontFamily: "Syne, serif",
                                  padding: "3px 10px", borderRadius: 999,
                                  background: "color-mix(in srgb, var(--ls-coral) 14%, transparent)",
                                  color: "var(--ls-coral)",
                                  border: "0.5px solid color-mix(in srgb, var(--ls-coral) 40%, transparent)",
                                }}>
                                  {selectedCount} retenu{selectedCount > 1 ? "s" : ""}
                                </span>
                              )}
                            </div>
                            <div className="boosters-grid">
                              {BOOSTERS.map((b) => {
                                const rec = recById.get(b.id);
                                const isRec = !!rec?.recommended;
                                return (
                                  <SelectableProductCard
                                    key={b.id}
                                    id={b.id}
                                    name={b.title}
                                    shortBenefit={b.shortContent}
                                    prixPublic={b.price}
                                    pv={0}
                                    highlight={isRec ? { reason: rec?.reason } : undefined}
                                    selected={effectiveSelectedProductIds.includes(b.id)}
                                    onToggle={() => toggleSelectedProduct(b.id)}
                                    quantity={getQty(b.id)}
                                    onQuantityChange={(q) => setQty(b.id, q)}
                                    variant="compact"
                                  />
                                );
                              })}
                            </div>
                          </div>
                        );
                      })()}

                      {/* SOUS-BLOC 2 — Besoins detectes par le bilan */}
                      {/* eslint-disable-next-line jsx-a11y/no-static-element-interactions -- Hover effect only */}
                      <div
                        style={{
                          padding: "16px 18px",
                          borderRadius: 16,
                          background: "var(--ls-surface)",
                          border: "0.5px solid var(--ls-border)",
                          borderLeft: "3px solid var(--ls-coral)",
                          transition: "box-shadow 0.2s ease",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.boxShadow = "0 4px 14px -8px rgba(251,113,133,0.30)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.boxShadow = "none";
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
                          <div
                            style={{
                              width: 42, height: 42, flexShrink: 0,
                              borderRadius: 12,
                              background: "linear-gradient(135deg, color-mix(in srgb, var(--ls-coral) 22%, var(--ls-surface2)) 0%, var(--ls-surface2) 100%)",
                              border: "0.5px solid color-mix(in srgb, var(--ls-coral) 35%, transparent)",
                              display: "flex", alignItems: "center", justifyContent: "center",
                              fontSize: 22,
                            }}
                          >
                            🎯
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 10, letterSpacing: 1.4, textTransform: "uppercase", fontWeight: 700, color: "var(--ls-coral)", fontFamily: "DM Sans, sans-serif" }}>
                              Besoins detectes
                            </div>
                            <div style={{ fontFamily: "Syne, serif", fontSize: 16, fontWeight: 700, color: "var(--ls-text)", marginTop: 2, letterSpacing: "-0.01em" }}>
                              Ce que le bilan fait ressortir en priorite
                            </div>
                          </div>
                          {recommendationPlan.needs.length > 0 && (
                            <span style={{
                              fontSize: 11, fontWeight: 800, fontFamily: "Syne, serif",
                              padding: "3px 10px", borderRadius: 999,
                              background: "color-mix(in srgb, var(--ls-coral) 14%, transparent)",
                              color: "var(--ls-coral)",
                              border: "0.5px solid color-mix(in srgb, var(--ls-coral) 40%, transparent)",
                            }}>
                              {recommendationPlan.needs.length} besoin{recommendationPlan.needs.length > 1 ? "s" : ""}
                            </span>
                          )}
                        </div>
                        {recommendationPlan.needs.length ? (
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
                                getQty={getQty}
                                setQty={setQty}
                              />
                            ))}
                          </div>
                        ) : (
                          <div className="rounded-[12px] bg-[var(--ls-surface2)] p-4 text-sm leading-7 text-[var(--ls-text-muted)]">
                            Le bilan ne fait pas ressortir une priorite forte. On peut partir sur la base simple,
                            puis personnaliser au premier suivi.
                          </div>
                        )}
                      </div>

                      {/* SOUS-BLOC 3 — Options en plus (upsells) */}
                      {recommendationPlan.optionalUpsells.length > 0 && (
                        // eslint-disable-next-line jsx-a11y/no-static-element-interactions -- Hover effect only
                        <div
                          style={{
                            padding: "16px 18px",
                            borderRadius: 16,
                            background: "var(--ls-surface)",
                            border: "0.5px solid var(--ls-border)",
                            borderLeft: "3px solid var(--ls-coral)",
                            transition: "box-shadow 0.2s ease",
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.boxShadow = "0 4px 14px -8px rgba(251,113,133,0.30)";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.boxShadow = "none";
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
                            <div
                              style={{
                                width: 42, height: 42, flexShrink: 0,
                                borderRadius: 12,
                                background: "linear-gradient(135deg, color-mix(in srgb, var(--ls-coral) 22%, var(--ls-surface2)) 0%, var(--ls-surface2) 100%)",
                                border: "0.5px solid color-mix(in srgb, var(--ls-coral) 35%, transparent)",
                                display: "flex", alignItems: "center", justifyContent: "center",
                                fontSize: 22,
                              }}
                            >
                              ✨
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: 10, letterSpacing: 1.4, textTransform: "uppercase", fontWeight: 700, color: "var(--ls-coral)", fontFamily: "DM Sans, sans-serif" }}>
                                Options en plus
                              </div>
                              <div style={{ fontFamily: "Syne, serif", fontSize: 16, fontWeight: 700, color: "var(--ls-text)", marginTop: 2, letterSpacing: "-0.01em" }}>
                                Quelques ajouts utiles
                              </div>
                            </div>
                            <span style={{
                              fontSize: 11, fontWeight: 800, fontFamily: "Syne, serif",
                              padding: "3px 10px", borderRadius: 999,
                              background: "color-mix(in srgb, var(--ls-coral) 14%, transparent)",
                              color: "var(--ls-coral)",
                              border: "0.5px solid color-mix(in srgb, var(--ls-coral) 40%, transparent)",
                            }}>
                              {recommendationPlan.optionalUpsells.length} option{recommendationPlan.optionalUpsells.length > 1 ? "s" : ""}
                            </span>
                          </div>
                          <div className="grid gap-3">
                            {recommendationPlan.optionalUpsells.map((product) => (
                              <SelectableProductCard
                                key={`upsell-${product.id}`}
                                id={product.id}
                                name={product.name}
                                shortBenefit={product.shortBenefit}
                                pv={product.pv}
                                prixPublic={product.prixPublic}
                                dureeReferenceJours={product.dureeReferenceJours}
                                quantityLabel={product.quantityLabel}
                                selected={effectiveSelectedProductIds.includes(product.id)}
                                onToggle={() => toggleSelectedProduct(product.id)}
                                quantity={getQty(product.id)}
                                onQuantityChange={(q) => setQty(product.id, q)}
                              />
                            ))}
                          </div>
                        </div>
                      )}
                    </section>
                  )}

                  {/* ═══════════════════════════════════════════════════════
                      § 4 · SUITE APRES LE BILAN (purple)
                      ═══════════════════════════════════════════════════════ */}
                  <section className="space-y-3">
                    <BilanSectionDivider
                      number={4}
                      eyebrow="Suite apres le bilan"
                      title="La personne demarre maintenant ou revient plus tard ?"
                      description="Choix du jour : demarrage immediat ou bilan sans demarrage (a relancer plus tard)."
                      color="purple"
                      rightSlot={
                        <StatusBadge
                          label={startsImmediately ? "Demarrage maintenant" : "A relancer"}
                          tone={startsImmediately ? "green" : "amber"}
                        />
                      }
                    />

                    {/* eslint-disable-next-line jsx-a11y/no-static-element-interactions -- Hover effect only */}
                    <div
                      style={{
                        padding: "20px 22px",
                        borderRadius: 16,
                        background: "var(--ls-surface)",
                        border: "0.5px solid var(--ls-border)",
                        borderLeft: "3px solid var(--ls-purple)",
                        transition: "box-shadow 0.2s ease",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.boxShadow = "0 4px 14px -8px rgba(167,139,250,0.30)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.boxShadow = "none";
                      }}
                    >
                      <div style={{ fontSize: 10, letterSpacing: 1.4, textTransform: "uppercase", fontWeight: 700, color: "var(--ls-purple)", fontFamily: "DM Sans, sans-serif", marginBottom: 12 }}>
                        Decision du jour
                      </div>
                      <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
                        {[
                          { value: "started" as const, label: "Demarrage maintenant", subtitle: "Le programme commence aujourd'hui", emoji: "🚀", color: "#2DD4BF" },
                          { value: "pending" as const, label: "A relancer plus tard", subtitle: "Bilan sans demarrage immediat", emoji: "⏳", color: "#A78BFA" },
                        ].map((opt) => {
                          const isActive = form.afterAssessmentAction === opt.value;
                          return (
                            <button
                              key={opt.value}
                              type="button"
                              onClick={() => update("afterAssessmentAction", opt.value)}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 12,
                                padding: "12px 14px",
                                borderRadius: 14,
                                cursor: "pointer",
                                fontFamily: "DM Sans, sans-serif",
                                textAlign: "left",
                                background: isActive
                                  ? `linear-gradient(135deg, color-mix(in srgb, ${opt.color} 14%, var(--ls-surface)) 0%, var(--ls-surface) 100%)`
                                  : "var(--ls-surface)",
                                border: isActive
                                  ? `0.5px solid ${opt.color}`
                                  : "0.5px solid var(--ls-border)",
                                boxShadow: isActive
                                  ? `0 4px 14px -6px ${opt.color}66, inset 0 0 0 1px ${opt.color}40`
                                  : "none",
                                transition: "transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease",
                              }}
                              onMouseEnter={(e) => {
                                if (!isActive) {
                                  e.currentTarget.style.transform = "translateY(-2px)";
                                  e.currentTarget.style.borderColor = `color-mix(in srgb, ${opt.color} 40%, var(--ls-border))`;
                                }
                              }}
                              onMouseLeave={(e) => {
                                if (!isActive) {
                                  e.currentTarget.style.transform = "none";
                                  e.currentTarget.style.borderColor = "var(--ls-border)";
                                }
                              }}
                            >
                              <div
                                style={{
                                  width: 42, height: 42, flexShrink: 0,
                                  borderRadius: 12,
                                  background: isActive
                                    ? `linear-gradient(135deg, ${opt.color} 0%, color-mix(in srgb, ${opt.color} 70%, #000) 100%)`
                                    : `linear-gradient(135deg, color-mix(in srgb, ${opt.color} 18%, var(--ls-surface2)) 0%, var(--ls-surface2) 100%)`,
                                  display: "flex", alignItems: "center", justifyContent: "center",
                                  fontSize: 22,
                                  border: isActive ? "none" : `0.5px solid color-mix(in srgb, ${opt.color} 28%, transparent)`,
                                  boxShadow: isActive
                                    ? `0 4px 12px -4px ${opt.color}80, inset 0 1px 0 rgba(255,255,255,0.20)`
                                    : "none",
                                  transition: "background 0.2s ease, transform 0.2s ease",
                                }}
                              >
                                {opt.emoji}
                              </div>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: 14, fontWeight: 700, color: isActive ? opt.color : "var(--ls-text)", fontFamily: "Syne, serif", letterSpacing: "-0.01em" }}>
                                  {opt.label}
                                </div>
                                <div style={{ fontSize: 11.5, color: "var(--ls-text-muted)", marginTop: 2, lineHeight: 1.35 }}>
                                  {opt.subtitle}
                                </div>
                              </div>
                              {/* Check radio premium */}
                              <div
                                style={{
                                  width: 22, height: 22, flexShrink: 0,
                                  borderRadius: 999,
                                  border: isActive ? `2px solid ${opt.color}` : "1.5px solid var(--ls-border)",
                                  background: isActive ? opt.color : "transparent",
                                  display: "flex", alignItems: "center", justifyContent: "center",
                                  transition: "all 0.2s ease",
                                }}
                              >
                                {isActive && (
                                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                    <polyline points="20 6 9 17 4 12" />
                                  </svg>
                                )}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                      {!startsImmediately && (
                        <div
                          style={{
                            marginTop: 14,
                            padding: "10px 14px",
                            borderRadius: 12,
                            background: "color-mix(in srgb, var(--ls-purple) 8%, var(--ls-surface2))",
                            border: "0.5px dashed color-mix(in srgb, var(--ls-purple) 40%, transparent)",
                            fontSize: 12.5,
                            color: "var(--ls-text-muted)",
                            fontFamily: "DM Sans, sans-serif",
                            lineHeight: 1.5,
                          }}
                        >
                          ℹ️ Le bilan sera enregistre, la personne apparaitra en attente dans les dossiers,
                          et elle ne comptera pas dans le module PV tant qu&apos;aucun programme n&apos;est demarre.
                        </div>
                      )}
                    </div>
                  </section>

                </div>

                {/* ─── Colonne ticket sticky ──────────────────────────── */}
                <div
                  style={{
                    position: "sticky",
                    top: 16,
                    alignSelf: "start",
                    height: "fit-content",
                  }}
                >
                  <ProgrammeTicket
                    program={chosenProgram}
                    addOns={ticketAddOns}
                    onOpenCatalog={() => setShowCatalogModal(true)}
                    onRemoveAddOn={(productId) => {
                      // Toggle off : retire l'id de selectedProductIds.
                      // Marche pour les 3 sources (besoins / boosters / catalogue).
                      if (form.selectedProductIds.includes(productId)) {
                        toggleSelectedProduct(productId);
                      }
                    }}
                  />
                </div>
              </div>
              </>
            );
          })()}

          {/* Ancien step Hydratation supprimé — Chantier bilan updates (2026-04-20) */}

          {currentStepId === 'follow-up' && (
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

          {/* ─── Étape 12 : Félicitations (remplace l'ancienne "Conclusion du
                rendez-vous" — Chantier Félicitations 2026-04-20) ─── */}
          {currentStepId === 'felicitations' && (
            <>
              {showFelicitationsConfetti ? (
                <ConfettiBurst
                  count={80}
                  durationMs={4200}
                  onComplete={() => setShowFelicitationsConfetti(false)}
                />
              ) : null}
              {showValidationBanner && !hasFollowUpPlanned ? (
                <ValidationBlockedBanner
                  onBack={() => {
                    setShowValidationBanner(false);
                    goToStepId('follow-up');
                  }}
                />
              ) : null}
              <FelicitationsStep
                clientFirstName={form.firstName}
                coachFirstName={currentUser?.name?.split(" ")[0] ?? "Ton coach"}
                programChoice={form.programChoice}
                onSave={() => {
                  if (!hasFollowUpPlanned) {
                    setShowValidationBanner(true);
                    return;
                  }
                  void handleSaveAssessment();
                }}
                saving={saving}
              />
            </>
          )}

          {/* Avertissement validation */}
          {stepWarning && (
            <div className="rounded-[14px] border border-[rgba(201,168,76,0.25)] bg-[rgba(201,168,76,0.08)] px-4 py-3 text-sm text-[#C9A84C]">
              {stepWarning}
            </div>
          )}

          {/* Footer navigation desktop — refonte premium V2 (2026-04-29) */}
          <div
            className="hidden items-center justify-between gap-3 md:flex"
            style={{
              marginTop: 24,
              paddingTop: 18,
              borderTop: '0.5px dashed var(--ls-border)',
            }}
          >
            <button
              type="button"
              onClick={goToPreviousStep}
              disabled={currentStep === 0}
              style={{
                padding: '10px 18px 10px 14px',
                borderRadius: 999,
                border: '0.5px solid var(--ls-border)',
                background: 'var(--ls-surface)',
                color: currentStep === 0 ? 'var(--ls-text-hint)' : 'var(--ls-text-muted)',
                fontSize: 13,
                fontWeight: 600,
                fontFamily: 'DM Sans, sans-serif',
                cursor: currentStep === 0 ? 'not-allowed' : 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                transition: 'transform 0.15s ease, border-color 0.15s ease, color 0.15s ease',
                opacity: currentStep === 0 ? 0.45 : 1,
              }}
              onMouseEnter={(e) => {
                if (currentStep > 0) {
                  e.currentTarget.style.transform = 'translateX(-2px)';
                  e.currentTarget.style.borderColor = 'color-mix(in srgb, var(--ls-gold) 30%, var(--ls-border))';
                  e.currentTarget.style.color = 'var(--ls-text)';
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'none';
                e.currentTarget.style.borderColor = 'var(--ls-border)';
                e.currentTarget.style.color = currentStep === 0 ? 'var(--ls-text-hint)' : 'var(--ls-text-muted)';
              }}
            >
              <span aria-hidden style={{ fontSize: 14 }}>←</span>
              Précédente
            </button>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
              <button
                type="button"
                onClick={() => void handleSaveAssessment()}
                data-tour-id="bilan-submit"
                style={{
                  padding: '10px 18px',
                  borderRadius: 999,
                  border: '0.5px solid color-mix(in srgb, var(--ls-teal) 40%, transparent)',
                  background: 'color-mix(in srgb, var(--ls-teal) 10%, var(--ls-surface))',
                  color: 'var(--ls-teal)',
                  fontSize: 13,
                  fontWeight: 700,
                  fontFamily: 'DM Sans, sans-serif',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 7,
                  transition: 'transform 0.15s ease, box-shadow 0.15s ease, filter 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-1px)';
                  e.currentTarget.style.boxShadow = '0 4px 12px -4px rgba(45,212,191,0.30)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'none';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                💾 Enregistrer
              </button>

              <button
                type="button"
                onClick={goToNextStep}
                disabled={currentStep === steps.length - 1}
                style={{
                  padding: '11px 22px 11px 20px',
                  borderRadius: 999,
                  border: 'none',
                  background: currentStep === steps.length - 1
                    ? 'var(--ls-surface2)'
                    : 'linear-gradient(135deg, #EF9F27 0%, #BA7517 100%)',
                  color: currentStep === steps.length - 1 ? 'var(--ls-text-hint)' : '#FFFFFF',
                  fontSize: 13.5,
                  fontWeight: 700,
                  fontFamily: 'DM Sans, sans-serif',
                  cursor: currentStep === steps.length - 1 ? 'not-allowed' : 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  letterSpacing: '-0.005em',
                  boxShadow: currentStep === steps.length - 1
                    ? 'none'
                    : '0 6px 16px -4px rgba(186,117,23,0.45), inset 0 1px 0 rgba(255,255,255,0.20)',
                  transition: 'transform 0.15s ease, filter 0.15s ease, box-shadow 0.15s ease',
                  opacity: currentStep === steps.length - 1 ? 0.55 : 1,
                }}
                onMouseEnter={(e) => {
                  if (currentStep < steps.length - 1) {
                    e.currentTarget.style.transform = 'translateY(-1px)';
                    e.currentTarget.style.filter = 'brightness(1.08)';
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'none';
                  e.currentTarget.style.filter = 'none';
                }}
              >
                Étape suivante
                <span aria-hidden style={{ fontSize: 14 }}>→</span>
              </button>
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
          </div>{/* /ls-step-fade */}
        </Card>

      </div>
      </div>

      {/* ClientAccessModal supprimé du flow post-bilan (2026-04-27) :
          remplacé par la redirection vers /clients/:id/bilan-termine
          (page remerciement plein écran dark premium). La modale reste
          accessible depuis la fiche coach (ActionsTab + ClientDetailPage)
          pour les usages hors-bilan. */}

      {/* Sandbox catalogue produits (V3.2 — 2026-04-29) */}
      <ProductCatalogModal
        open={showCatalogModal}
        onClose={() => setShowCatalogModal(false)}
        selectedIds={form.selectedProductIds}
        onAddProduct={(productId) => {
          if (!form.selectedProductIds.includes(productId)) {
            toggleSelectedProduct(productId);
          }
        }}
      />

      <SportAlertsDialog
        alerts={sportAlerts}
        open={sportAlertsOpen}
        onClose={() => {
          setSportAlertsOpen(false);
          setSportAlertsAcknowledged(true);
          void handleSaveAssessment();
        }}
      />
    </div>
    );
  }

// StepVisualLoadingCard retiré — utilisé uniquement par LazyMorningRoutineCard
// qui a été supprimé du bilan (Chantier nettoyage 2026-04-20).

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
  onToggleProduct,
  getQty,
  setQty,
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
    getQty: (id: string) => number;
    setQty: (id: string, q: number) => void;
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
            <SelectableProductCard
              key={product.id}
              id={product.id}
              name={product.name}
              shortBenefit={product.shortBenefit}
              pv={product.pv}
              prixPublic={product.prixPublic}
              dureeReferenceJours={product.dureeReferenceJours}
              quantityLabel={product.quantityLabel}
              selected={selectedProductIds.includes(product.id)}
              onToggle={() => onToggleProduct(product.id)}
              quantity={getQty(product.id)}
              onQuantityChange={(q) => setQty(product.id, q)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// Chantier Boosters cliquables + Quantités (2026-04-24) : ancien
// `SuggestedProductCard` inline retiré, remplacé par le composant partagé
// `SelectableProductCard` (src/components/assessment/SelectableProductCard.tsx).

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
  // Refonte visuelle bilan (2026-11-04) : accent gold subtil sur le titre +
  // micro-divider doré sous le titre pour structurer visuellement les blocs
  // sans alourdir.
  return (
    <div
      className="rounded-[24px] bg-[var(--ls-surface2)] p-5"
      style={{
        border: '0.5px solid color-mix(in srgb, var(--ls-gold) 8%, var(--ls-border))',
      }}
    >
      <div style={{ marginBottom: 16, paddingBottom: 12, borderBottom: '0.5px dashed color-mix(in srgb, var(--ls-gold) 18%, transparent)' }}>
        <h3 className="ls-block-title" style={{ marginBottom: 4 }}>{title}</h3>
        <p className="ls-block-desc" style={{ margin: 0 }}>{description}</p>
      </div>
      <div className="space-y-4">{children}</div>
    </div>
  );
}





// ReferenceComparisonRow / ReferenceDatum retirés — ne sont plus utilisés
// suite à la suppression de l'étape "Références de suivi" (Chantier
// nettoyage bilan 2026-04-20).

// Helpers de comparaison (getBodyFatTargetRange, getHydrationReference,
// getRangeGapLabel, getBodyFatPriority, getHydrationPriority,
// getVisceralPriority) retirés — alimentaient l'étape "Références de suivi"
// supprimée. Chantier nettoyage bilan (2026-04-20).

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

// formatPriceEuro / formatPv retirés — utilisés uniquement par l'ancien
// SuggestedProductCard inline (Chantier Boosters cliquables + Quantités
// 2026-04-24). Le nouveau SelectableProductCard gère son propre formatage.
// formatValue / formatSignedValue retirés — alimentaient comparaisons
// de l'étape supprimée. Chantier nettoyage bilan (2026-04-20).


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
