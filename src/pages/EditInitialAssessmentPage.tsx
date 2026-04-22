import { useEffect, useState, type ReactNode } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { PageHeading } from "../components/ui/PageHeading";
import { StatusBadge } from "../components/ui/StatusBadge";
import { useAppContext } from "../context/AppContext";
import { useToast, buildSupabaseErrorToast } from "../context/ToastContext";
import { getFirstAssessment, normalizeDateTimeLocalInputValue } from "../lib/calculations";
import { pvProductCatalog } from "../data/pvCatalog";
import { refreshClientRecap } from "../services/supabaseService";
import type { AssessmentQuestionnaire, AssessmentRecord } from "../types/domain";

const timelineOptions = [
  "1 mois",
  "2 mois",
  "3 mois",
  "4 mois",
  "5 mois",
  "6 mois",
  "9 mois"
];

interface EditAssessmentDraftPayload {
  clientId: string;
  assessmentId: string;
  assessmentDate: string;
  programTitle: string;
  summary: string;
  weight: number;
  bodyFat: number;
  muscleMass: number;
  hydration: number;
  boneMass: number;
  visceralFat: number;
  bmr: number;
  metabolicAge: number;
  questionnaire: AssessmentQuestionnaire;
  notes: string;
}

const EDIT_ASSESSMENT_DRAFT_PREFIX = "lor-squad-wellness-edit-assessment-draft-v2";

function getEditAssessmentDraftKey(clientId: string, assessmentId: string) {
  return `${EDIT_ASSESSMENT_DRAFT_PREFIX}-${clientId}-${assessmentId}`;
}

function readEditAssessmentDraft(clientId: string, assessmentId: string) {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(getEditAssessmentDraftKey(clientId, assessmentId));
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as Partial<EditAssessmentDraftPayload>;
    if (
      parsed.clientId !== clientId ||
      parsed.assessmentId !== assessmentId ||
      !parsed.questionnaire
    ) {
      return null;
    }

    return parsed as EditAssessmentDraftPayload;
  } catch {
    return null;
  }
}

function persistEditAssessmentDraft(payload: EditAssessmentDraftPayload) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(
      getEditAssessmentDraftKey(payload.clientId, payload.assessmentId),
      JSON.stringify(payload)
    );
  } catch (error) {
    console.error("Sauvegarde du brouillon du bilan impossible.", error);
  }
}

function clearEditAssessmentDraft(clientId: string, assessmentId: string) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(getEditAssessmentDraftKey(clientId, assessmentId));
}

function buildEditableQuestionnaire(questionnaire: AssessmentQuestionnaire): AssessmentQuestionnaire {
  return {
    referredByName: questionnaire.referredByName ?? "",
    optionalProductsUsed: questionnaire.optionalProductsUsed ?? "",
    detectedNeedIds: questionnaire.detectedNeedIds ?? [],
    selectedProductIds: questionnaire.selectedProductIds ?? [],
    healthStatus: questionnaire.healthStatus ?? "",
    healthNotes: questionnaire.healthNotes ?? "",
    allergies: questionnaire.allergies ?? "",
    transitStatus: questionnaire.transitStatus ?? "",
    pathologyContext: questionnaire.pathologyContext ?? "",
    wakeUpTime: questionnaire.wakeUpTime ?? "",
    bedTime: questionnaire.bedTime ?? "",
    sleepHours: questionnaire.sleepHours ?? 0,
    sleepQuality: questionnaire.sleepQuality ?? "",
    napFrequency: questionnaire.napFrequency ?? "",
    breakfastFrequency: questionnaire.breakfastFrequency ?? "",
    breakfastTime: questionnaire.breakfastTime ?? "",
    breakfastContent: questionnaire.breakfastContent ?? "",
    breakfastSatiety: questionnaire.breakfastSatiety ?? "",
    firstMealTime: questionnaire.firstMealTime ?? "",
    mealsPerDay: questionnaire.mealsPerDay ?? 0,
    regularMealTimes: questionnaire.regularMealTimes ?? "",
    lunchLocation: questionnaire.lunchLocation ?? "",
    dinnerTiming: questionnaire.dinnerTiming ?? "",
    vegetablesDaily: questionnaire.vegetablesDaily ?? "",
    proteinEachMeal: questionnaire.proteinEachMeal ?? "",
    sugaryProducts: questionnaire.sugaryProducts ?? "",
    snackingFrequency: questionnaire.snackingFrequency ?? "",
    snackingMoment: questionnaire.snackingMoment ?? "",
    cravingsPreference: questionnaire.cravingsPreference ?? "",
    snackingTrigger: questionnaire.snackingTrigger ?? "",
    waterIntake: questionnaire.waterIntake ?? 0,
    drinksCoffee: questionnaire.drinksCoffee ?? "",
    coffeePerDay: questionnaire.coffeePerDay ?? 0,
    sweetDrinks: questionnaire.sweetDrinks ?? "",
    alcohol: questionnaire.alcohol ?? "",
    lunchExample: questionnaire.lunchExample ?? "",
    dinnerExample: questionnaire.dinnerExample ?? "",
    physicalActivity: questionnaire.physicalActivity ?? "",
    activityType: questionnaire.activityType ?? "",
    sessionsPerWeek: questionnaire.sessionsPerWeek ?? 0,
    energyLevel: questionnaire.energyLevel ?? "",
    pastAttempts: questionnaire.pastAttempts ?? "",
    hardestPart: questionnaire.hardestPart ?? "",
    mainBlocker: questionnaire.mainBlocker ?? "",
    objectiveFocus: questionnaire.objectiveFocus ?? "",
    targetWeight: questionnaire.targetWeight,
    motivation: questionnaire.motivation ?? 0,
    desiredTimeline: questionnaire.desiredTimeline ?? "",
    recommendations: questionnaire.recommendations ?? [],
    recommendationsContacted: questionnaire.recommendationsContacted ?? false,
    // Audit 2026-04-20 : préserver les champs introduits récemment.
    // L'Edit page n'expose pas encore d'UI pour les éditer, mais sans ce
    // pass-through le save écraserait les valeurs saisies au bilan initial.
    breakfastAnalysis: questionnaire.breakfastAnalysis,
    customGoal: questionnaire.customGoal,
    snacksFastFoodPerWeek: questionnaire.snacksFastFoodPerWeek,
    preferredFlavor: questionnaire.preferredFlavor,
    consumesMilk: questionnaire.consumesMilk,
    programChoice: questionnaire.programChoice
  };
}

function buildFallbackSummary(isInitialAssessment: boolean) {
  return isInitialAssessment
    ? "Bilan de depart ajuste pour garder un vrai repère."
    : "Suivi ajuste pour garder une lecture propre du dossier.";
}

export function EditInitialAssessmentPage() {
  const { clientId, assessmentId } = useParams();
  const navigate = useNavigate();
  const { getClientById, updateAssessment } = useAppContext();
  const { push: pushToast } = useToast();
  const client = clientId ? getClientById(clientId) : undefined;

  // Fix P3a (2026-04-20) : quand on édite via /start-assessment/edit (sans
  // assessmentId), on cible EXPLICITEMENT le bilan avec type === "initial",
  // pas juste le plus ancien par date. Sans ça, si un follow-up a une date
  // antérieure (cas réel : corrections de date), on éditait le mauvais bilan
  // → le "Poids de départ" affiché sur la fiche (lié au même calcul) ne
  // reflétait jamais la modif. Fallback sur getFirstAssessment si pas
  // d'assessment "initial" (cas de migration / anciens dossiers).
  // Chantier nuit (2026-04-20) : toute la chaîne est safe avec optional
  // chaining — les hooks ci-dessous s'exécutent même si client/targetAssessment
  // sont undefined, et les early returns sont placés APRÈS tous les hooks
  // (rules-of-hooks).
  const explicitInitial = client?.assessments.find((entry) => entry.type === "initial");
  const fallbackAssessment = explicitInitial ?? (client ? getFirstAssessment(client) : undefined);
  const targetAssessment =
    client?.assessments.find((entry) => entry.id === assessmentId) ?? fallbackAssessment;

  const isInitialAssessment = targetAssessment?.type === "initial";
  const [assessmentDate, setAssessmentDate] = useState(
    targetAssessment ? normalizeDateTimeLocalInputValue(targetAssessment.date) : ""
  );
  const [programTitle, setProgramTitle] = useState(targetAssessment?.programTitle ?? "");
  const [summary, setSummary] = useState(targetAssessment?.summary ?? "");
  const [weight, setWeight] = useState(targetAssessment?.bodyScan?.weight ?? 0);
  const [bodyFat, setBodyFat] = useState(targetAssessment?.bodyScan?.bodyFat ?? 0);
  const [muscleMass, setMuscleMass] = useState(targetAssessment?.bodyScan?.muscleMass ?? 0);
  const [hydration, setHydration] = useState(targetAssessment?.bodyScan?.hydration ?? 0);
  const [boneMass, setBoneMass] = useState(targetAssessment?.bodyScan?.boneMass ?? 0);
  const [visceralFat, setVisceralFat] = useState(targetAssessment?.bodyScan?.visceralFat ?? 0);
  const [bmr, setBmr] = useState(targetAssessment?.bodyScan?.bmr ?? 0);
  const [metabolicAge, setMetabolicAge] = useState(targetAssessment?.bodyScan?.metabolicAge ?? 0);
  const [questionnaire, setQuestionnaire] = useState<AssessmentQuestionnaire>(
    targetAssessment?.questionnaire
      ? buildEditableQuestionnaire(targetAssessment.questionnaire)
      : buildEditableQuestionnaire({} as AssessmentQuestionnaire)
  );
  const [notes, setNotes] = useState(targetAssessment?.notes ?? "");
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [draftReady, setDraftReady] = useState(false);

  useEffect(() => {
    if (!client || !targetAssessment) return;
    setAssessmentDate(normalizeDateTimeLocalInputValue(targetAssessment.date));
    setProgramTitle(targetAssessment.programTitle);
    setSummary(targetAssessment.summary);
    // Durcissement import (2026-04-21) : bodyScan peut être null sur les
    // assessments importés via SQL brut.
    setWeight(targetAssessment.bodyScan?.weight ?? 0);
    setBodyFat(targetAssessment.bodyScan?.bodyFat ?? 0);
    setMuscleMass(targetAssessment.bodyScan?.muscleMass ?? 0);
    setHydration(targetAssessment.bodyScan?.hydration ?? 0);
    setBoneMass(targetAssessment.bodyScan?.boneMass ?? 0);
    setVisceralFat(targetAssessment.bodyScan?.visceralFat ?? 0);
    setBmr(targetAssessment.bodyScan?.bmr ?? 0);
    setMetabolicAge(targetAssessment.bodyScan?.metabolicAge ?? 0);
    setQuestionnaire(buildEditableQuestionnaire(targetAssessment.questionnaire));
    setNotes(targetAssessment.notes);

    const draft = readEditAssessmentDraft(client.id, targetAssessment.id);
    if (draft) {
      setAssessmentDate(draft.assessmentDate);
      setProgramTitle(draft.programTitle);
      setSummary(draft.summary);
      setWeight(draft.weight);
      setBodyFat(draft.bodyFat);
      setMuscleMass(draft.muscleMass);
      setHydration(draft.hydration);
      setBoneMass(draft.boneMass);
      setVisceralFat(draft.visceralFat);
      setBmr(draft.bmr);
      setMetabolicAge(draft.metabolicAge);
      setQuestionnaire(draft.questionnaire);
      setNotes(draft.notes);
    }

    setDraftReady(true);
  }, [targetAssessment, client]);

  useEffect(() => {
    if (!client || !targetAssessment || !draftReady) {
      return;
    }

    persistEditAssessmentDraft({
      clientId: client.id,
      assessmentId: targetAssessment.id,
      assessmentDate,
      programTitle,
      summary,
      weight,
      bodyFat,
      muscleMass,
      hydration,
      boneMass,
      visceralFat,
      bmr,
      metabolicAge,
      questionnaire,
      notes
    });
  }, [
    assessmentDate,
    bmr,
    bodyFat,
    boneMass,
    draftReady,
    hydration,
    metabolicAge,
    muscleMass,
    notes,
    programTitle,
    questionnaire,
    summary,
    targetAssessment,
    client,
    visceralFat,
    weight
  ]);

  // Early returns APRÈS tous les hooks (rules-of-hooks / chantier nuit 2026-04-20).
  if (!client) {
    return (
      <Card>
        <p className="text-lg text-white">Client introuvable ou accès indisponible.</p>
      </Card>
    );
  }
  if (!targetAssessment) {
    return (
      <Card>
        <p className="text-lg text-white">Bilan introuvable sur ce dossier.</p>
      </Card>
    );
  }
  const targetClient = client;

  function updateQuestionnaire<K extends keyof AssessmentQuestionnaire>(
    key: K,
    value: AssessmentQuestionnaire[K]
  ) {
    setQuestionnaire((previous) => ({
      ...previous,
      [key]: value
    }));
  }

  async function handleSave() {
    setError("");
    if (!client || !targetAssessment) {
      setError("Bilan introuvable — impossible d'enregistrer.");
      return;
    }
    setIsSaving(true);

    const updatedAssessment: AssessmentRecord = {
      ...targetAssessment,
      date: assessmentDate || normalizeDateTimeLocalInputValue(new Date().toISOString()),
      programTitle: programTitle.trim() || targetAssessment.programTitle,
      summary: summary.trim() || buildFallbackSummary(isInitialAssessment),
      notes,
      bodyScan: {
        weight,
        bodyFat,
        muscleMass,
        hydration,
        boneMass,
        visceralFat,
        bmr,
        metabolicAge
      },
      questionnaire: {
        ...questionnaire,
        referredByName: questionnaire.referredByName?.trim() || undefined,
        optionalProductsUsed: questionnaire.optionalProductsUsed?.trim() || undefined,
        targetWeight:
          questionnaire.targetWeight != null && questionnaire.targetWeight > 0
            ? questionnaire.targetWeight
            : undefined
      }
    };

    try {
      await updateAssessment(targetClient.id, updatedAssessment);
      // Chantier sync client_recaps (2026-04-20) : le bilan modifié (bilan
      // initial ou suivi) doit se refléter côté /client/:token. Non-bloquant.
      try {
        await refreshClientRecap(targetClient.id);
      } catch (refreshErr) {
        pushToast(buildSupabaseErrorToast(
          refreshErr,
          "Le bilan a été modifié mais le lien client n'a pas pu être mis à jour. Tu peux régénérer l'accès depuis la fiche."
        ));
      }
      clearEditAssessmentDraft(targetClient.id, targetAssessment.id);
      navigate(`/clients/${targetClient.id}`);
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Impossible de modifier ce bilan."
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeading
        eyebrow={isInitialAssessment ? "Bilan de départ" : "Suivi enregistre"}
        title={`Modifier ${isInitialAssessment ? "le bilan de départ" : "ce bilan"} de ${targetClient.firstName} ${targetClient.lastName}`}
        description={
          isInitialAssessment
            ? "Tu peux revenir completer ou corriger l'ensemble du bilan initial : chiffres, habitudes, hydratation, alimentation, activité et notes."
            : "Tu peux rouvrir un bilan déjà réalisé pour corriger les valeurs, les notes et les sections oubliees sans recréer un faux rendez-vous."
        }
      />

      <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <Card className="space-y-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.25em] text-[var(--ls-text-hint)]">Base historique</p>
              <p className="mt-2 text-2xl text-white">
                {isInitialAssessment
                  ? "Revenir sur toutes les infos du bilan initial"
                  : "Revenir sur toutes les infos de ce bilan"}
              </p>
            </div>
            <StatusBadge
              label={isInitialAssessment ? "Bilan de départ" : "Suivi"}
              tone={isInitialAssessment ? "blue" : "green"}
            />
          </div>

          <SectionCard
            title="Repères du dossier"
            description="Date, programme, resume et points de base du body scan."
          >
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <MetricField
                label="Date et heure du bilan"
                type="datetime-local"
                value={assessmentDate}
                onChange={setAssessmentDate}
              />
              <TextField label="Programme retenu" value={programTitle} onChange={setProgramTitle} />
              <MetricField label="Poids (kg)" value={weight} onChange={(value) => setWeight(Number(value))} />
              <MetricField label="Masse grasse (%)" value={bodyFat} onChange={(value) => setBodyFat(Number(value))} />
              <MetricField label="Masse musculaire (kg)" value={muscleMass} onChange={(value) => setMuscleMass(Number(value))} />
              <MetricField label="Hydratation (%)" value={hydration} onChange={(value) => setHydration(Number(value))} />
              <MetricField label="Masse osseuse (kg)" value={boneMass} onChange={(value) => setBoneMass(Number(value))} />
              <MetricField label="Graisse viscerale" value={visceralFat} onChange={(value) => setVisceralFat(Number(value))} />
              <MetricField label="BMR (kcal)" value={bmr} onChange={(value) => setBmr(Number(value))} />
              <MetricField label="Age metabolique" value={metabolicAge} onChange={(value) => setMetabolicAge(Number(value))} />
            </div>
            <AreaField label="Resume du rendez-vous" value={summary} onChange={setSummary} rows={3} />
          </SectionCard>

          <SectionCard
            title="Sante et contexte"
            description="Ce qui pose le cadre du rendez-vous et ce qu'il faut garder en tete."
          >
            <div className="grid gap-4 md:grid-cols-2">
              <TextField label="Invite par" value={questionnaire.referredByName ?? ""} onChange={(value) => updateQuestionnaire("referredByName", value)} />
              <TextField label="Etat de sante / traitement" value={questionnaire.healthStatus} onChange={(value) => updateQuestionnaire("healthStatus", value)} />
              <TextField label="Allergies / intolerances" value={questionnaire.allergies} onChange={(value) => updateQuestionnaire("allergies", value)} />
              <TextField label="Transit" value={questionnaire.transitStatus} onChange={(value) => updateQuestionnaire("transitStatus", value)} />
              <TextField label="Contexte pathologique" value={questionnaire.pathologyContext} onChange={(value) => updateQuestionnaire("pathologyContext", value)} />
            </div>
            <AreaField
              label="Precisions sante utiles"
              value={questionnaire.healthNotes}
              onChange={(value) => updateQuestionnaire("healthNotes", value)}
              rows={3}
            />
          </SectionCard>

          <SectionCard
            title="Sommeil et rythme"
            description="Les repères de journee qui aident a relire l'energie."
          >
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <MetricField label="Reveil" type="time" value={questionnaire.wakeUpTime} onChange={(value) => updateQuestionnaire("wakeUpTime", value)} />
              <MetricField label="Coucher" type="time" value={questionnaire.bedTime} onChange={(value) => updateQuestionnaire("bedTime", value)} />
              <MetricField label="Sommeil (heures)" value={questionnaire.sleepHours} onChange={(value) => updateQuestionnaire("sleepHours", Number(value))} />
              <TextField label="Qualite du sommeil" value={questionnaire.sleepQuality} onChange={(value) => updateQuestionnaire("sleepQuality", value)} />
              <TextField label="Siestes" value={questionnaire.napFrequency} onChange={(value) => updateQuestionnaire("napFrequency", value)} />
              <TextField label="Energie generale" value={questionnaire.energyLevel} onChange={(value) => updateQuestionnaire("energyLevel", value)} />
            </div>
          </SectionCard>

          <SectionCard
            title="Petit-dejeuner et repas"
            description="Le matin, les repas types et la regularite alimentaire."
          >
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <TextField label="Petit-dejeuner tous les jours" value={questionnaire.breakfastFrequency} onChange={(value) => updateQuestionnaire("breakfastFrequency", value)} />
              <MetricField label="Heure du petit-dejeuner" type="time" value={questionnaire.breakfastTime} onChange={(value) => updateQuestionnaire("breakfastTime", value)} />
              <TextField label="Petit-dejeuner rassasiant" value={questionnaire.breakfastSatiety} onChange={(value) => updateQuestionnaire("breakfastSatiety", value)} />
              <MetricField label="1er vrai repas" type="time" value={questionnaire.firstMealTime} onChange={(value) => updateQuestionnaire("firstMealTime", value)} />
              <MetricField label="Repas / jour" value={questionnaire.mealsPerDay} onChange={(value) => updateQuestionnaire("mealsPerDay", Number(value))} />
              <TextField label="Horaires reguliers" value={questionnaire.regularMealTimes} onChange={(value) => updateQuestionnaire("regularMealTimes", value)} />
              <TextField label="Lieu du dejeuner" value={questionnaire.lunchLocation} onChange={(value) => updateQuestionnaire("lunchLocation", value)} />
              <TextField label="Timing du diner" value={questionnaire.dinnerTiming} onChange={(value) => updateQuestionnaire("dinnerTiming", value)} />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <AreaField label="Que consomme-t-elle le matin ?" value={questionnaire.breakfastContent} onChange={(value) => updateQuestionnaire("breakfastContent", value)} rows={3} />
              <AreaField label="Repas type du midi" value={questionnaire.lunchExample} onChange={(value) => updateQuestionnaire("lunchExample", value)} rows={3} />
              <AreaField label="Repas type du soir" value={questionnaire.dinnerExample} onChange={(value) => updateQuestionnaire("dinnerExample", value)} rows={3} />
            </div>
          </SectionCard>

          <SectionCard
            title="Qualite alimentaire et hydratation"
            description="Ce qui aide a completer les bases si une section etait restee vide."
          >
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <TextField label="Legumes chaque jour" value={questionnaire.vegetablesDaily} onChange={(value) => updateQuestionnaire("vegetablesDaily", value)} />
              <TextField label="Proteines a chaque repas" value={questionnaire.proteinEachMeal} onChange={(value) => updateQuestionnaire("proteinEachMeal", value)} />
              <TextField label="Produits sucres" value={questionnaire.sugaryProducts} onChange={(value) => updateQuestionnaire("sugaryProducts", value)} />
              <TextField label="Frequence du grignotage" value={questionnaire.snackingFrequency} onChange={(value) => updateQuestionnaire("snackingFrequency", value)} />
              <TextField label="Moment du grignotage" value={questionnaire.snackingMoment} onChange={(value) => updateQuestionnaire("snackingMoment", value)} />
              <TextField label="Type d'envie" value={questionnaire.cravingsPreference} onChange={(value) => updateQuestionnaire("cravingsPreference", value)} />
              <TextField label="Declencheur" value={questionnaire.snackingTrigger} onChange={(value) => updateQuestionnaire("snackingTrigger", value)} />
              <MetricField label="Eau / jour (L)" value={questionnaire.waterIntake} onChange={(value) => updateQuestionnaire("waterIntake", Number(value))} />
              <TextField label="Cafe" value={questionnaire.drinksCoffee} onChange={(value) => updateQuestionnaire("drinksCoffee", value)} />
              <MetricField label="Cafes / jour" value={questionnaire.coffeePerDay} onChange={(value) => updateQuestionnaire("coffeePerDay", Number(value))} />
              <TextField label="Boissons sucrées" value={questionnaire.sweetDrinks} onChange={(value) => updateQuestionnaire("sweetDrinks", value)} />
              <TextField label="Alcool" value={questionnaire.alcohol} onChange={(value) => updateQuestionnaire("alcohol", value)} />
            </div>
          </SectionCard>

          <SectionCard
            title="Activite et objectif"
            description="Le cap client, ses blocages et son horizon."
          >
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <TextField label="Activite physique" value={questionnaire.physicalActivity} onChange={(value) => updateQuestionnaire("physicalActivity", value)} />
              <TextField label="Type d'activité" value={questionnaire.activityType} onChange={(value) => updateQuestionnaire("activityType", value)} />
              <MetricField label="Seances / semaine" value={questionnaire.sessionsPerWeek} onChange={(value) => updateQuestionnaire("sessionsPerWeek", Number(value))} />
              <TextField label="Objectif reformule" value={questionnaire.objectiveFocus} onChange={(value) => updateQuestionnaire("objectiveFocus", value)} />
              <MetricField label="Poids cible (kg)" value={questionnaire.targetWeight ?? 0} onChange={(value) => updateQuestionnaire("targetWeight", Number(value))} />
              <MetricField label="Motivation / 10" value={questionnaire.motivation} onChange={(value) => updateQuestionnaire("motivation", Number(value))} />
              <div className="space-y-2 md:col-span-2">
                <label className="ls-field-label">Horizon / delai</label>
                <div className="flex flex-wrap gap-2">
                  {timelineOptions.map((option) => {
                    const isActive = questionnaire.desiredTimeline === option;
                    return (
                      <button
                        key={option}
                        type="button"
                        onClick={() => updateQuestionnaire("desiredTimeline", option)}
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
                </div>
                <input
                  value={timelineOptions.includes(questionnaire.desiredTimeline) ? "" : questionnaire.desiredTimeline}
                  onChange={(event) => updateQuestionnaire("desiredTimeline", event.target.value)}
                  placeholder="Ex : 2 mois, 4 mois, 5 mois"
                />
                <p className="text-xs leading-6 text-[var(--ls-text-muted)]">
                  Tu peux garder un délai simple ou écrire un cap libre si le client a formulé son
                  objectif autrement.
                </p>
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <AreaField label="Tentatives passees" value={questionnaire.pastAttempts} onChange={(value) => updateQuestionnaire("pastAttempts", value)} rows={3} />
              <AreaField label="Le plus difficile" value={questionnaire.hardestPart} onChange={(value) => updateQuestionnaire("hardestPart", value)} rows={3} />
              <AreaField label="Blocage principal" value={questionnaire.mainBlocker} onChange={(value) => updateQuestionnaire("mainBlocker", value)} rows={3} />
              <AreaField label="Produits optionnels déjà pris" value={questionnaire.optionalProductsUsed ?? ""} onChange={(value) => updateQuestionnaire("optionalProductsUsed", value)} rows={3} />
            </div>
          </SectionCard>

          <SectionCard
            title="Compléments bilan (chantier 2026-04-20)"
            description="Champs ajoutés récemment : objectif libre, budget snacks, saveur F1, lait, programme choisi, analyse petit-déj."
          >
            <div className="grid gap-4 md:grid-cols-2">
              <AreaField
                label="Objectif libre (si « Autre »)"
                value={questionnaire.customGoal ?? ""}
                onChange={(value) => updateQuestionnaire("customGoal", value)}
                rows={3}
              />
              <MetricField
                label="Snacks / fast-food / restos par semaine"
                type="number"
                value={questionnaire.snacksFastFoodPerWeek ?? 0}
                onChange={(value) => updateQuestionnaire("snacksFastFoodPerWeek", value === "" ? null : Number(value))}
              />
              <TextField
                label="Saveur Formula 1 préférée"
                value={questionnaire.preferredFlavor ?? ""}
                onChange={(value) => updateQuestionnaire("preferredFlavor", value)}
              />
              <div className="space-y-2">
                <label className="text-sm font-medium text-[var(--ls-text-muted)]">Consomme du lait ?</label>
                <div className="flex flex-wrap gap-2">
                  {([
                    { value: "yes", label: "Oui" },
                    { value: "sometimes", label: "Parfois" },
                    { value: "no", label: "Non" }
                  ] as const).map((opt) => {
                    const selected = questionnaire.consumesMilk === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => updateQuestionnaire("consumesMilk", opt.value)}
                        className={`rounded-[14px] border px-3 py-2 text-sm transition ${
                          selected
                            ? "border-[rgba(45,212,191,0.35)] bg-[rgba(45,212,191,0.12)] text-white"
                            : "border-white/10 bg-[var(--ls-surface2)] text-[var(--ls-text-muted)] hover:border-white/20"
                        }`}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-medium text-[var(--ls-text-muted)]">Programme choisi</label>
                <div className="flex flex-wrap gap-2">
                  {([
                    { value: "discovery", label: "Découverte" },
                    { value: "premium", label: "Premium" },
                    { value: "booster1", label: "Booster 1" },
                    { value: "booster2", label: "Booster 2" }
                  ] as const).map((opt) => {
                    const selected = questionnaire.programChoice === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => updateQuestionnaire("programChoice", opt.value)}
                        className={`rounded-[14px] border px-3 py-2 text-sm transition ${
                          selected
                            ? "border-[rgba(201,168,76,0.45)] bg-[rgba(201,168,76,0.12)] text-white"
                            : "border-white/10 bg-[var(--ls-surface2)] text-[var(--ls-text-muted)] hover:border-white/20"
                        }`}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
            <div className="mt-2">
              <p className="text-sm font-medium text-[var(--ls-text-muted)] mb-2">Analyse petit-déjeuner (0-100)</p>
              <div className="grid gap-4 md:grid-cols-4">
                <MetricField
                  label="Sucres"
                  type="number"
                  value={questionnaire.breakfastAnalysis?.sucres ?? 0}
                  onChange={(value) => updateQuestionnaire("breakfastAnalysis", {
                    sucres: Number(value),
                    proteines: questionnaire.breakfastAnalysis?.proteines ?? 0,
                    hydratation: questionnaire.breakfastAnalysis?.hydratation ?? 0,
                    fibres: questionnaire.breakfastAnalysis?.fibres ?? 0
                  })}
                />
                <MetricField
                  label="Protéines"
                  type="number"
                  value={questionnaire.breakfastAnalysis?.proteines ?? 0}
                  onChange={(value) => updateQuestionnaire("breakfastAnalysis", {
                    sucres: questionnaire.breakfastAnalysis?.sucres ?? 0,
                    proteines: Number(value),
                    hydratation: questionnaire.breakfastAnalysis?.hydratation ?? 0,
                    fibres: questionnaire.breakfastAnalysis?.fibres ?? 0
                  })}
                />
                <MetricField
                  label="Hydratation"
                  type="number"
                  value={questionnaire.breakfastAnalysis?.hydratation ?? 0}
                  onChange={(value) => updateQuestionnaire("breakfastAnalysis", {
                    sucres: questionnaire.breakfastAnalysis?.sucres ?? 0,
                    proteines: questionnaire.breakfastAnalysis?.proteines ?? 0,
                    hydratation: Number(value),
                    fibres: questionnaire.breakfastAnalysis?.fibres ?? 0
                  })}
                />
                <MetricField
                  label="Fibres"
                  type="number"
                  value={questionnaire.breakfastAnalysis?.fibres ?? 0}
                  onChange={(value) => updateQuestionnaire("breakfastAnalysis", {
                    sucres: questionnaire.breakfastAnalysis?.sucres ?? 0,
                    proteines: questionnaire.breakfastAnalysis?.proteines ?? 0,
                    hydratation: questionnaire.breakfastAnalysis?.hydratation ?? 0,
                    fibres: Number(value)
                  })}
                />
              </div>
            </div>
          </SectionCard>

          <SectionCard
            title="Produits recommandés"
            description="Ajoute ou retire des produits du programme de ce bilan."
          >
            <div className="grid gap-2 md:grid-cols-2">
              {pvProductCatalog.filter((p) => p.active).map((product) => {
                const selected = (questionnaire.selectedProductIds ?? []).includes(product.id);
                return (
                  <button
                    key={product.id}
                    type="button"
                    onClick={() => {
                      const current = questionnaire.selectedProductIds ?? [];
                      const next = current.includes(product.id)
                        ? current.filter((id) => id !== product.id)
                        : [...current, product.id];
                      updateQuestionnaire("selectedProductIds", next);
                    }}
                    className={`flex items-center justify-between gap-3 rounded-[14px] border px-3 py-2.5 text-left transition ${
                      selected
                        ? "border-[rgba(45,212,191,0.35)] bg-[rgba(45,212,191,0.1)]"
                        : "border-white/10 bg-[var(--ls-surface2)] hover:border-white/20"
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium text-[var(--ls-text)] truncate">{product.name}</div>
                      <div className="text-xs text-[var(--ls-text-hint)]">{product.category} · {product.pv} PV</div>
                    </div>
                    <div
                      className={`flex-shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${
                        selected ? "bg-[var(--ls-teal)] text-white" : "bg-[var(--ls-surface)] text-[var(--ls-text-muted)]"
                      }`}
                    >
                      {selected ? "✓ Ajouté" : "+ Ajouter"}
                    </div>
                  </button>
                );
              })}
            </div>
            <p className="mt-3 text-xs text-[var(--ls-text-muted)]">
              {(questionnaire.selectedProductIds ?? []).length} produit(s) sélectionné(s)
            </p>
          </SectionCard>

          <div className="space-y-2">
            <label className="text-sm font-medium text-[var(--ls-text-muted)]">Note du bilan</label>
            <textarea rows={6} value={notes} onChange={(event) => setNotes(event.target.value)} />
          </div>

          {/* Durcissement import (2026-04-21) : fallback si questionnaire
              importé sans la clé recommendations. */}
          {(questionnaire.recommendations?.length ?? 0) > 0 ? (
            <label className="flex items-center justify-between gap-3 rounded-[22px] border border-white/10 bg-[var(--ls-surface2)] px-4 py-4">
              <div>
                <p className="text-sm font-medium text-white">Recommandations contactées</p>
                <p className="mt-1 text-sm text-[var(--ls-text-muted)]">
                  A cocher une fois les recommandations de ce bilan reprises.
                </p>
              </div>
              <input
                type="checkbox"
                className="h-5 w-5 rounded border-white/15 bg-slate-950/30"
                checked={questionnaire.recommendationsContacted}
                onChange={(event) =>
                  updateQuestionnaire("recommendationsContacted", event.target.checked)
                }
              />
            </label>
          ) : null}

          {error ? (
            <div className="rounded-[20px] border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">
              {error}
            </div>
          ) : null}

          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => navigate(`/clients/${targetClient.id}`)}>
              Annuler
            </Button>
            <Button onClick={() => void handleSave()} disabled={isSaving}>
              {isSaving ? "Enregistrement..." : "Enregistrer les modifications"}
            </Button>
          </div>
        </Card>

        <Card className="space-y-4">
          <p className="text-xs uppercase tracking-[0.25em] text-[var(--ls-text-hint)]">A retenir</p>
          <InfoCard
            title="Ce que tu peux corriger ici"
            text={
              isInitialAssessment
                ? "Le body scan de depart, les habitudes, l'hydratation, les repas, l'activite, l'objectif et toutes les notes du premier bilan."
                : "Les valeurs body scan, les habitudes, les sections oubliees et les notes de ce bilan déjà enregistre."
            }
          />
          <InfoCard
            title="Ce que cela change"
            text={
              isInitialAssessment
                ? "La fiche client, les repères de depart et toutes les lectures relieront ensuite les bonnes informations."
                : "La fiche client et les lectures body scan reliront ensuite les bonnes donnees sans recrééer un faux suivi."
            }
          />
          <InfoCard
            title={isInitialAssessment ? "Ce que cela ne supprime pas" : "Ce que cela preserve"}
            text={
              isInitialAssessment
                ? "Les suivis déjà saisis restent en place. Tu remets seulement la vraie base propre du dossier."
                : "Tu ajustes ce bilan sans toucher aux autres rendez-vous déjà enregistres dans le dossier."
            }
          />
        </Card>
      </div>
    </div>
  );
}

function SectionCard({
  title,
  description,
  children
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-4 rounded-[24px] border border-white/10 bg-[var(--ls-surface2)] p-5">
      <div>
        <p className="text-lg font-semibold text-white">{title}</p>
        <p className="mt-2 text-sm leading-6 text-[var(--ls-text-muted)]">{description}</p>
      </div>
      {children}
    </div>
  );
}

function MetricField({
  label,
  value,
  onChange,
  type = "number"
}: {
  label: string;
  value: string | number;
  onChange: (value: string) => void;
  type?: string;
}) {
  return (
    <div className="space-y-2">
      <label className="ls-field-label">{label}</label>
      <input
        type={type}
        step={type === "number" ? "0.1" : undefined}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={type === "time" ? "ls-input-time" : undefined}
      />
    </div>
  );
}

function TextField({
  label,
  value,
  onChange
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-[var(--ls-text-muted)]">{label}</label>
      <input value={value} onChange={(event) => onChange(event.target.value)} />
    </div>
  );
}

function AreaField({
  label,
  value,
  onChange,
  rows = 4
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  rows?: number;
}) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-[var(--ls-text-muted)]">{label}</label>
      <textarea rows={rows} value={value} onChange={(event) => onChange(event.target.value)} />
    </div>
  );
}

function InfoCard({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-[22px] border border-white/10 bg-[var(--ls-surface2)] px-4 py-4">
      <p className="text-sm font-semibold text-white">{title}</p>
      <p className="mt-2 text-sm leading-6 text-[var(--ls-text-muted)]">{text}</p>
    </div>
  );
}
