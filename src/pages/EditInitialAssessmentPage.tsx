import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { PageHeading } from "../components/ui/PageHeading";
import { StatusBadge } from "../components/ui/StatusBadge";
import { useAppContext } from "../context/AppContext";
import { getFirstAssessment, normalizeDateTimeLocalInputValue } from "../lib/calculations";
import type { AssessmentQuestionnaire, AssessmentRecord } from "../types/domain";

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

export function EditInitialAssessmentPage() {
  const { clientId } = useParams();
  const navigate = useNavigate();
  const { getClientById, updateAssessment } = useAppContext();
  const client = clientId ? getClientById(clientId) : undefined;

  if (!client) {
    return (
      <Card>
        <p className="text-lg text-white">Client introuvable ou accès indisponible.</p>
      </Card>
    );
  }

  const targetClient = client;
  const initialAssessment = getFirstAssessment(targetClient);
  const initialQuestionnaire = buildEditableQuestionnaire(initialAssessment.questionnaire);

  const [assessmentDate, setAssessmentDate] = useState(
    normalizeDateTimeLocalInputValue(initialAssessment.date)
  );
  const [programTitle, setProgramTitle] = useState(initialAssessment.programTitle);
  const [summary, setSummary] = useState(initialAssessment.summary);
  const [weight, setWeight] = useState(initialAssessment.bodyScan.weight);
  const [bodyFat, setBodyFat] = useState(initialAssessment.bodyScan.bodyFat);
  const [muscleMass, setMuscleMass] = useState(initialAssessment.bodyScan.muscleMass);
  const [hydration, setHydration] = useState(initialAssessment.bodyScan.hydration);
  const [boneMass, setBoneMass] = useState(initialAssessment.bodyScan.boneMass);
  const [visceralFat, setVisceralFat] = useState(initialAssessment.bodyScan.visceralFat);
  const [bmr, setBmr] = useState(initialAssessment.bodyScan.bmr);
  const [metabolicAge, setMetabolicAge] = useState(initialAssessment.bodyScan.metabolicAge);
  const [questionnaire, setQuestionnaire] = useState<AssessmentQuestionnaire>(initialQuestionnaire);
  const [notes, setNotes] = useState(initialAssessment.notes);
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

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
      ...initialAssessment,
      date: assessmentDate || normalizeDateTimeLocalInputValue(new Date().toISOString()),
      programTitle,
      summary: summary.trim() || "Bilan de départ ajusté pour garder un vrai repère.",
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
      navigate(`/clients/${targetClient.id}`);
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Impossible de modifier le bilan de départ."
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeading
        eyebrow="Bilan de départ"
        title={`Modifier tout le bilan de départ de ${targetClient.firstName} ${targetClient.lastName}`}
        description="Ici, tu peux revenir compléter ou corriger l’ensemble du bilan initial : chiffres, habitudes, hydratation, alimentation, activité et notes."
      />

      <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <Card className="space-y-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.25em] text-slate-500">Base historique</p>
              <p className="mt-2 text-2xl text-white">Revenir sur toutes les infos du bilan initial</p>
            </div>
            <StatusBadge label={targetClient.currentProgram} tone="blue" />
          </div>

          <SectionCard title="Repères du dossier" description="Date, programme, résumé et points de base du body scan.">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <MetricField label="Date et heure du bilan" type="datetime-local" value={assessmentDate} onChange={setAssessmentDate} />
              <TextField label="Programme retenu" value={programTitle} onChange={setProgramTitle} />
              <MetricField label="Poids (kg)" value={weight} onChange={(value) => setWeight(Number(value))} />
              <MetricField label="Masse grasse (%)" value={bodyFat} onChange={(value) => setBodyFat(Number(value))} />
              <MetricField label="Masse musculaire (kg)" value={muscleMass} onChange={(value) => setMuscleMass(Number(value))} />
              <MetricField label="Hydratation (%)" value={hydration} onChange={(value) => setHydration(Number(value))} />
              <MetricField label="Masse osseuse (kg)" value={boneMass} onChange={(value) => setBoneMass(Number(value))} />
              <MetricField label="Graisse viscérale" value={visceralFat} onChange={(value) => setVisceralFat(Number(value))} />
              <MetricField label="BMR (kcal)" value={bmr} onChange={(value) => setBmr(Number(value))} />
              <MetricField label="Âge métabolique" value={metabolicAge} onChange={(value) => setMetabolicAge(Number(value))} />
            </div>
            <AreaField label="Résumé du rendez-vous" value={summary} onChange={setSummary} rows={3} />
          </SectionCard>

          <SectionCard title="Santé et contexte" description="Ce qui pose le cadre du rendez-vous et ce qu’il faut garder en tête.">
            <div className="grid gap-4 md:grid-cols-2">
              <TextField label="Invité par" value={questionnaire.referredByName ?? ""} onChange={(value) => updateQuestionnaire("referredByName", value)} />
              <TextField label="État de santé / traitement" value={questionnaire.healthStatus} onChange={(value) => updateQuestionnaire("healthStatus", value)} />
              <TextField label="Allergies / intolérances" value={questionnaire.allergies} onChange={(value) => updateQuestionnaire("allergies", value)} />
              <TextField label="Transit" value={questionnaire.transitStatus} onChange={(value) => updateQuestionnaire("transitStatus", value)} />
              <TextField label="Contexte pathologique" value={questionnaire.pathologyContext} onChange={(value) => updateQuestionnaire("pathologyContext", value)} />
            </div>
            <AreaField label="Précisions santé utiles" value={questionnaire.healthNotes} onChange={(value) => updateQuestionnaire("healthNotes", value)} rows={3} />
          </SectionCard>

          <SectionCard title="Sommeil et rythme" description="Les repères de journée qui aident à relire l’énergie.">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <MetricField label="Réveil" type="time" value={questionnaire.wakeUpTime} onChange={(value) => updateQuestionnaire("wakeUpTime", value)} />
              <MetricField label="Coucher" type="time" value={questionnaire.bedTime} onChange={(value) => updateQuestionnaire("bedTime", value)} />
              <MetricField label="Sommeil (heures)" value={questionnaire.sleepHours} onChange={(value) => updateQuestionnaire("sleepHours", Number(value))} />
              <TextField label="Qualité du sommeil" value={questionnaire.sleepQuality} onChange={(value) => updateQuestionnaire("sleepQuality", value)} />
              <TextField label="Siestes" value={questionnaire.napFrequency} onChange={(value) => updateQuestionnaire("napFrequency", value)} />
              <TextField label="Énergie générale" value={questionnaire.energyLevel} onChange={(value) => updateQuestionnaire("energyLevel", value)} />
            </div>
          </SectionCard>

          <SectionCard title="Petit-déjeuner et repas" description="Le matin, les repas types et la régularité alimentaire.">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <TextField label="Petit-déjeuner tous les jours" value={questionnaire.breakfastFrequency} onChange={(value) => updateQuestionnaire("breakfastFrequency", value)} />
              <MetricField label="Heure du petit-déjeuner" type="time" value={questionnaire.breakfastTime} onChange={(value) => updateQuestionnaire("breakfastTime", value)} />
              <TextField label="Petit-déjeuner rassasiant" value={questionnaire.breakfastSatiety} onChange={(value) => updateQuestionnaire("breakfastSatiety", value)} />
              <MetricField label="1er vrai repas" type="time" value={questionnaire.firstMealTime} onChange={(value) => updateQuestionnaire("firstMealTime", value)} />
              <MetricField label="Repas / jour" value={questionnaire.mealsPerDay} onChange={(value) => updateQuestionnaire("mealsPerDay", Number(value))} />
              <TextField label="Horaires réguliers" value={questionnaire.regularMealTimes} onChange={(value) => updateQuestionnaire("regularMealTimes", value)} />
              <TextField label="Lieu du déjeuner" value={questionnaire.lunchLocation} onChange={(value) => updateQuestionnaire("lunchLocation", value)} />
              <TextField label="Timing du dîner" value={questionnaire.dinnerTiming} onChange={(value) => updateQuestionnaire("dinnerTiming", value)} />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <AreaField label="Que consomme-t-elle le matin ?" value={questionnaire.breakfastContent} onChange={(value) => updateQuestionnaire("breakfastContent", value)} rows={3} />
              <AreaField label="Repas type du midi" value={questionnaire.lunchExample} onChange={(value) => updateQuestionnaire("lunchExample", value)} rows={3} />
              <AreaField label="Repas type du soir" value={questionnaire.dinnerExample} onChange={(value) => updateQuestionnaire("dinnerExample", value)} rows={3} />
            </div>
          </SectionCard>

          <SectionCard title="Qualité alimentaire et hydratation" description="Ce qui aide à compléter les bases si une section était restée vide.">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <TextField label="Légumes chaque jour" value={questionnaire.vegetablesDaily} onChange={(value) => updateQuestionnaire("vegetablesDaily", value)} />
              <TextField label="Protéines à chaque repas" value={questionnaire.proteinEachMeal} onChange={(value) => updateQuestionnaire("proteinEachMeal", value)} />
              <TextField label="Produits sucrés" value={questionnaire.sugaryProducts} onChange={(value) => updateQuestionnaire("sugaryProducts", value)} />
              <TextField label="Fréquence du grignotage" value={questionnaire.snackingFrequency} onChange={(value) => updateQuestionnaire("snackingFrequency", value)} />
              <TextField label="Moment du grignotage" value={questionnaire.snackingMoment} onChange={(value) => updateQuestionnaire("snackingMoment", value)} />
              <TextField label="Type d’envie" value={questionnaire.cravingsPreference} onChange={(value) => updateQuestionnaire("cravingsPreference", value)} />
              <TextField label="Déclencheur" value={questionnaire.snackingTrigger} onChange={(value) => updateQuestionnaire("snackingTrigger", value)} />
              <MetricField label="Eau / jour (L)" value={questionnaire.waterIntake} onChange={(value) => updateQuestionnaire("waterIntake", Number(value))} />
              <TextField label="Café" value={questionnaire.drinksCoffee} onChange={(value) => updateQuestionnaire("drinksCoffee", value)} />
              <MetricField label="Cafés / jour" value={questionnaire.coffeePerDay} onChange={(value) => updateQuestionnaire("coffeePerDay", Number(value))} />
              <TextField label="Boissons sucrées" value={questionnaire.sweetDrinks} onChange={(value) => updateQuestionnaire("sweetDrinks", value)} />
              <TextField label="Alcool" value={questionnaire.alcohol} onChange={(value) => updateQuestionnaire("alcohol", value)} />
            </div>
          </SectionCard>

          <SectionCard title="Activité et objectif" description="Le cap client, ses blocages et son horizon.">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <TextField label="Activité physique" value={questionnaire.physicalActivity} onChange={(value) => updateQuestionnaire("physicalActivity", value)} />
              <TextField label="Type d’activité" value={questionnaire.activityType} onChange={(value) => updateQuestionnaire("activityType", value)} />
              <MetricField label="Séances / semaine" value={questionnaire.sessionsPerWeek} onChange={(value) => updateQuestionnaire("sessionsPerWeek", Number(value))} />
              <TextField label="Objectif reformulé" value={questionnaire.objectiveFocus} onChange={(value) => updateQuestionnaire("objectiveFocus", value)} />
              <MetricField label="Poids cible (kg)" value={questionnaire.targetWeight ?? 0} onChange={(value) => updateQuestionnaire("targetWeight", Number(value))} />
              <MetricField label="Motivation / 10" value={questionnaire.motivation} onChange={(value) => updateQuestionnaire("motivation", Number(value))} />
              <TextField label="Horizon / délai" value={questionnaire.desiredTimeline} onChange={(value) => updateQuestionnaire("desiredTimeline", value)} />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <AreaField label="Tentatives passées" value={questionnaire.pastAttempts} onChange={(value) => updateQuestionnaire("pastAttempts", value)} rows={3} />
              <AreaField label="Le plus difficile" value={questionnaire.hardestPart} onChange={(value) => updateQuestionnaire("hardestPart", value)} rows={3} />
              <AreaField label="Blocage principal" value={questionnaire.mainBlocker} onChange={(value) => updateQuestionnaire("mainBlocker", value)} rows={3} />
              <AreaField label="Produits optionnels déjà pris" value={questionnaire.optionalProductsUsed ?? ""} onChange={(value) => updateQuestionnaire("optionalProductsUsed", value)} rows={3} />
            </div>
          </SectionCard>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-300">Note du bilan de départ</label>
            <textarea rows={6} value={notes} onChange={(event) => setNotes(event.target.value)} />
          </div>

          {questionnaire.recommendations.length ? (
            <label className="flex items-center justify-between gap-3 rounded-[22px] border border-white/10 bg-white/[0.03] px-4 py-4">
              <div>
                <p className="text-sm font-medium text-white">Recommandations contactées</p>
                <p className="mt-1 text-sm text-slate-400">
                  À cocher une fois les recommandations de ce bilan reprises.
                </p>
              </div>
              <input
                type="checkbox"
                className="h-5 w-5 rounded border-white/15 bg-slate-950/30"
                checked={questionnaire.recommendationsContacted}
                onChange={(event) => updateQuestionnaire("recommendationsContacted", event.target.checked)}
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
              {isSaving ? "Enregistrement..." : "Enregistrer le bilan complet"}
            </Button>
          </div>
        </Card>

        <Card className="space-y-4">
          <p className="text-xs uppercase tracking-[0.25em] text-slate-500">À retenir</p>
          <InfoCard
            title="Ce que tu peux corriger ici"
            text="Le body scan de départ, les habitudes, l’hydratation, les repas, l’activité, l’objectif et toutes les notes du premier bilan."
          />
          <InfoCard
            title="Ce que cela change"
            text="La fiche client, les repères de départ et toutes les lectures relieront ensuite les bonnes informations."
          />
          <InfoCard
            title="Ce que cela ne supprime pas"
            text="Les suivis déjà saisis restent en place. Tu remets seulement la vraie base propre du dossier."
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
  children: React.ReactNode;
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
