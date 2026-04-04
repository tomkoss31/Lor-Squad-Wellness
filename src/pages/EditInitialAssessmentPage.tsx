import { useEffect, useState, type ReactNode } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { PageHeading } from "../components/ui/PageHeading";
import { StatusBadge } from "../components/ui/StatusBadge";
import { useAppContext } from "../context/AppContext";
import { getFirstAssessment, normalizeDateTimeLocalInputValue } from "../lib/calculations";
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
    recommendationsContacted: questionnaire.recommendationsContacted ?? false
  };
}

function buildFallbackSummary(isInitialAssessment: boolean) {
  return isInitialAssessment
    ? "Bilan de depart ajuste pour garder un vrai repere."
    : "Suivi ajuste pour garder une lecture propre du dossier.";
}

export function EditInitialAssessmentPage() {
  const { clientId, assessmentId } = useParams();
  const navigate = useNavigate();
  const { getClientById, updateAssessment } = useAppContext();
  const client = clientId ? getClientById(clientId) : undefined;

  if (!client) {
    return (
      <Card>
        <p className="text-lg text-white">Client introuvable ou acces indisponible.</p>
      </Card>
    );
  }

  const targetClient = client;
  const fallbackAssessment = getFirstAssessment(targetClient);
  const targetAssessment =
    targetClient.assessments.find((entry) => entry.id === assessmentId) ?? fallbackAssessment;

  if (!targetAssessment) {
    return (
      <Card>
        <p className="text-lg text-white">Bilan introuvable sur ce dossier.</p>
      </Card>
    );
  }

  const isInitialAssessment = targetAssessment.type === "initial";
  const [assessmentDate, setAssessmentDate] = useState(
    normalizeDateTimeLocalInputValue(targetAssessment.date)
  );
  const [programTitle, setProgramTitle] = useState(targetAssessment.programTitle);
  const [summary, setSummary] = useState(targetAssessment.summary);
  const [weight, setWeight] = useState(targetAssessment.bodyScan.weight);
  const [bodyFat, setBodyFat] = useState(targetAssessment.bodyScan.bodyFat);
  const [muscleMass, setMuscleMass] = useState(targetAssessment.bodyScan.muscleMass);
  const [hydration, setHydration] = useState(targetAssessment.bodyScan.hydration);
  const [boneMass, setBoneMass] = useState(targetAssessment.bodyScan.boneMass);
  const [visceralFat, setVisceralFat] = useState(targetAssessment.bodyScan.visceralFat);
  const [bmr, setBmr] = useState(targetAssessment.bodyScan.bmr);
  const [metabolicAge, setMetabolicAge] = useState(targetAssessment.bodyScan.metabolicAge);
  const [questionnaire, setQuestionnaire] = useState<AssessmentQuestionnaire>(
    buildEditableQuestionnaire(targetAssessment.questionnaire)
  );
  const [notes, setNotes] = useState(targetAssessment.notes);
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [draftReady, setDraftReady] = useState(false);

  useEffect(() => {
    setAssessmentDate(normalizeDateTimeLocalInputValue(targetAssessment.date));
    setProgramTitle(targetAssessment.programTitle);
    setSummary(targetAssessment.summary);
    setWeight(targetAssessment.bodyScan.weight);
    setBodyFat(targetAssessment.bodyScan.bodyFat);
    setMuscleMass(targetAssessment.bodyScan.muscleMass);
    setHydration(targetAssessment.bodyScan.hydration);
    setBoneMass(targetAssessment.bodyScan.boneMass);
    setVisceralFat(targetAssessment.bodyScan.visceralFat);
    setBmr(targetAssessment.bodyScan.bmr);
    setMetabolicAge(targetAssessment.bodyScan.metabolicAge);
    setQuestionnaire(buildEditableQuestionnaire(targetAssessment.questionnaire));
    setNotes(targetAssessment.notes);

    const draft = readEditAssessmentDraft(targetClient.id, targetAssessment.id);
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
  }, [targetAssessment, targetClient.id]);

  useEffect(() => {
    if (!draftReady) {
      return;
    }

    persistEditAssessmentDraft({
      clientId: targetClient.id,
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
    targetAssessment.id,
    targetClient.id,
    visceralFat,
    weight
  ]);

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
        eyebrow={isInitialAssessment ? "Bilan de depart" : "Suivi enregistre"}
        title={`Modifier ${isInitialAssessment ? "le bilan de depart" : "ce bilan"} de ${targetClient.firstName} ${targetClient.lastName}`}
        description={
          isInitialAssessment
            ? "Tu peux revenir completer ou corriger l'ensemble du bilan initial : chiffres, habitudes, hydratation, alimentation, activite et notes."
            : "Tu peux rouvrir un bilan deja realise pour corriger les valeurs, les notes et les sections oubliees sans recréer un faux rendez-vous."
        }
      />

      <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <Card className="space-y-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.25em] text-slate-500">Base historique</p>
              <p className="mt-2 text-2xl text-white">
                {isInitialAssessment
                  ? "Revenir sur toutes les infos du bilan initial"
                  : "Revenir sur toutes les infos de ce bilan"}
              </p>
            </div>
            <StatusBadge
              label={isInitialAssessment ? "Bilan de depart" : "Suivi"}
              tone={isInitialAssessment ? "blue" : "green"}
            />
          </div>

          <SectionCard
            title="Reperes du dossier"
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
            description="Les reperes de journee qui aident a relire l'energie."
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
              <TextField label="Boissons sucrees" value={questionnaire.sweetDrinks} onChange={(value) => updateQuestionnaire("sweetDrinks", value)} />
              <TextField label="Alcool" value={questionnaire.alcohol} onChange={(value) => updateQuestionnaire("alcohol", value)} />
            </div>
          </SectionCard>

          <SectionCard
            title="Activite et objectif"
            description="Le cap client, ses blocages et son horizon."
          >
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <TextField label="Activite physique" value={questionnaire.physicalActivity} onChange={(value) => updateQuestionnaire("physicalActivity", value)} />
              <TextField label="Type d'activite" value={questionnaire.activityType} onChange={(value) => updateQuestionnaire("activityType", value)} />
              <MetricField label="Seances / semaine" value={questionnaire.sessionsPerWeek} onChange={(value) => updateQuestionnaire("sessionsPerWeek", Number(value))} />
              <TextField label="Objectif reformule" value={questionnaire.objectiveFocus} onChange={(value) => updateQuestionnaire("objectiveFocus", value)} />
              <MetricField label="Poids cible (kg)" value={questionnaire.targetWeight ?? 0} onChange={(value) => updateQuestionnaire("targetWeight", Number(value))} />
              <MetricField label="Motivation / 10" value={questionnaire.motivation} onChange={(value) => updateQuestionnaire("motivation", Number(value))} />
              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-medium text-slate-300">Horizon / delai</label>
                <div className="flex flex-wrap gap-2">
                  {timelineOptions.map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => updateQuestionnaire("desiredTimeline", option)}
                      className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                        questionnaire.desiredTimeline === option
                          ? "bg-white text-slate-950"
                          : "border border-white/10 bg-white/[0.03] text-slate-200"
                      }`}
                    >
                      {option}
                    </button>
                  ))}
                </div>
                <input
                  value={timelineOptions.includes(questionnaire.desiredTimeline) ? "" : questionnaire.desiredTimeline}
                  onChange={(event) => updateQuestionnaire("desiredTimeline", event.target.value)}
                  placeholder="Ex : 2 mois, 4 mois, 5 mois"
                />
                <p className="text-xs leading-6 text-slate-400">
                  Tu peux garder un délai simple ou écrire un cap libre si le client a formulé son
                  objectif autrement.
                </p>
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <AreaField label="Tentatives passees" value={questionnaire.pastAttempts} onChange={(value) => updateQuestionnaire("pastAttempts", value)} rows={3} />
              <AreaField label="Le plus difficile" value={questionnaire.hardestPart} onChange={(value) => updateQuestionnaire("hardestPart", value)} rows={3} />
              <AreaField label="Blocage principal" value={questionnaire.mainBlocker} onChange={(value) => updateQuestionnaire("mainBlocker", value)} rows={3} />
              <AreaField label="Produits optionnels deja pris" value={questionnaire.optionalProductsUsed ?? ""} onChange={(value) => updateQuestionnaire("optionalProductsUsed", value)} rows={3} />
            </div>
          </SectionCard>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-300">Note du bilan</label>
            <textarea rows={6} value={notes} onChange={(event) => setNotes(event.target.value)} />
          </div>

          {questionnaire.recommendations.length ? (
            <label className="flex items-center justify-between gap-3 rounded-[22px] border border-white/10 bg-white/[0.03] px-4 py-4">
              <div>
                <p className="text-sm font-medium text-white">Recommandations contactées</p>
                <p className="mt-1 text-sm text-slate-400">
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
          <p className="text-xs uppercase tracking-[0.25em] text-slate-500">A retenir</p>
          <InfoCard
            title="Ce que tu peux corriger ici"
            text={
              isInitialAssessment
                ? "Le body scan de depart, les habitudes, l'hydratation, les repas, l'activite, l'objectif et toutes les notes du premier bilan."
                : "Les valeurs body scan, les habitudes, les sections oubliees et les notes de ce bilan deja enregistre."
            }
          />
          <InfoCard
            title="Ce que cela change"
            text={
              isInitialAssessment
                ? "La fiche client, les reperes de depart et toutes les lectures relieront ensuite les bonnes informations."
                : "La fiche client et les lectures body scan reliront ensuite les bonnes donnees sans recreer un faux suivi."
            }
          />
          <InfoCard
            title={isInitialAssessment ? "Ce que cela ne supprime pas" : "Ce que cela preserve"}
            text={
              isInitialAssessment
                ? "Les suivis deja saisis restent en place. Tu remets seulement la vraie base propre du dossier."
                : "Tu ajustes ce bilan sans toucher aux autres rendez-vous deja enregistres dans le dossier."
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
    <div className="space-y-4 rounded-[24px] border border-white/10 bg-white/[0.03] p-5">
      <div>
        <p className="text-lg font-semibold text-white">{title}</p>
        <p className="mt-2 text-sm leading-6 text-slate-400">{description}</p>
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
      <label className="text-sm font-medium text-slate-300">{label}</label>
      <input
        type={type}
        step={type === "number" ? "0.1" : undefined}
        value={value}
        onChange={(event) => onChange(event.target.value)}
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
      <label className="text-sm font-medium text-slate-300">{label}</label>
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
      <label className="text-sm font-medium text-slate-300">{label}</label>
      <textarea rows={rows} value={value} onChange={(event) => onChange(event.target.value)} />
    </div>
  );
}

function InfoCard({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-[22px] border border-white/10 bg-white/[0.03] px-4 py-4">
      <p className="text-sm font-semibold text-white">{title}</p>
      <p className="mt-2 text-sm leading-6 text-slate-400">{text}</p>
    </div>
  );
}
