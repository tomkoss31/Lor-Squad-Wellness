import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { PageHeading } from "../components/ui/PageHeading";
import { StatusBadge } from "../components/ui/StatusBadge";
import { useAppContext } from "../context/AppContext";
import { getFirstAssessment, normalizeDateTimeLocalInputValue } from "../lib/calculations";
import type { AssessmentRecord } from "../types/domain";

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

  const [assessmentDate, setAssessmentDate] = useState(
    normalizeDateTimeLocalInputValue(initialAssessment.date)
  );
  const [weight, setWeight] = useState(initialAssessment.bodyScan.weight);
  const [bodyFat, setBodyFat] = useState(initialAssessment.bodyScan.bodyFat);
  const [muscleMass, setMuscleMass] = useState(initialAssessment.bodyScan.muscleMass);
  const [hydration, setHydration] = useState(initialAssessment.bodyScan.hydration);
  const [boneMass, setBoneMass] = useState(initialAssessment.bodyScan.boneMass);
  const [visceralFat, setVisceralFat] = useState(initialAssessment.bodyScan.visceralFat);
  const [bmr, setBmr] = useState(initialAssessment.bodyScan.bmr);
  const [metabolicAge, setMetabolicAge] = useState(initialAssessment.bodyScan.metabolicAge);
  const [objectiveFocus, setObjectiveFocus] = useState(
    initialAssessment.questionnaire.objectiveFocus ?? ""
  );
  const [targetWeight, setTargetWeight] = useState(
    initialAssessment.questionnaire.targetWeight ?? 0
  );
  const [desiredTimeline, setDesiredTimeline] = useState(
    initialAssessment.questionnaire.desiredTimeline ?? ""
  );
  const [referredByName, setReferredByName] = useState(
    initialAssessment.questionnaire.referredByName ?? ""
  );
  const [recommendationsContacted, setRecommendationsContacted] = useState(
    initialAssessment.questionnaire.recommendationsContacted ?? false
  );
  const [notes, setNotes] = useState(initialAssessment.notes);
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  async function handleSave() {
    setError("");
    setIsSaving(true);

    const updatedAssessment: AssessmentRecord = {
      ...initialAssessment,
      date: assessmentDate || normalizeDateTimeLocalInputValue(new Date().toISOString()),
      notes,
      summary:
        initialAssessment.summary ||
        "Bilan de départ ajusté pour garder un point de référence propre.",
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
        ...initialAssessment.questionnaire,
        referredByName: referredByName.trim() || undefined,
        objectiveFocus,
        targetWeight: targetWeight > 0 ? targetWeight : undefined,
        desiredTimeline,
        recommendationsContacted
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
        title={`Modifier le point de départ de ${targetClient.firstName} ${targetClient.lastName}`}
        description="Ici, tu corriges le bilan initial pour garder un vrai repère de progression propre dans le dossier client."
      />

      <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <Card className="space-y-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.25em] text-slate-500">Base historique</p>
              <p className="mt-2 text-2xl text-white">Les valeurs de départ qui servent de référence</p>
            </div>
            <StatusBadge label={targetClient.currentProgram} tone="blue" />
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <MetricField label="Date et heure du bilan de départ" type="datetime-local" value={assessmentDate} onChange={setAssessmentDate} />
            <MetricField label="Poids (kg)" value={weight} onChange={(value) => setWeight(Number(value))} />
            <MetricField label="Masse grasse (%)" value={bodyFat} onChange={(value) => setBodyFat(Number(value))} />
            <MetricField label="Masse musculaire (kg)" value={muscleMass} onChange={(value) => setMuscleMass(Number(value))} />
            <MetricField label="Hydratation (%)" value={hydration} onChange={(value) => setHydration(Number(value))} />
            <MetricField label="Masse osseuse (kg)" value={boneMass} onChange={(value) => setBoneMass(Number(value))} />
            <MetricField label="Graisse viscérale" value={visceralFat} onChange={(value) => setVisceralFat(Number(value))} />
            <MetricField label="BMR (kcal)" value={bmr} onChange={(value) => setBmr(Number(value))} />
            <MetricField label="Âge métabolique" value={metabolicAge} onChange={(value) => setMetabolicAge(Number(value))} />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <TextField label="Objectif reformulé" value={objectiveFocus} onChange={setObjectiveFocus} />
            <TextField label="Invité par" value={referredByName} onChange={setReferredByName} />
            <MetricField
              label="Poids cible (kg)"
              value={targetWeight}
              onChange={(value) => setTargetWeight(Number(value))}
            />
            <TextField label="Horizon / délai" value={desiredTimeline} onChange={setDesiredTimeline} />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-300">Note du bilan de départ</label>
            <textarea rows={5} value={notes} onChange={(event) => setNotes(event.target.value)} />
          </div>

          {initialAssessment.questionnaire.recommendations.length ? (
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
                checked={recommendationsContacted}
                onChange={(event) => setRecommendationsContacted(event.target.checked)}
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
              {isSaving ? "Enregistrement..." : "Enregistrer le bilan de départ"}
            </Button>
          </div>
        </Card>

        <Card className="space-y-4">
          <p className="text-xs uppercase tracking-[0.25em] text-slate-500">À retenir</p>
          <InfoCard
            title="Ce que tu modifies ici"
            text="Ce formulaire sert à corriger le point de départ : date, body scan, cible et note initiale."
          />
          <InfoCard
            title="Ce que cela change"
            text="La fiche client relira ensuite correctement le poids de départ, la graisse de départ et les évolutions."
          />
          <InfoCard
            title="Ce que cela ne touche pas"
            text="Les suivis déjà saisis restent en place. On corrige seulement la base de référence."
          />
        </Card>
      </div>
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
      <input type={type} step={type === "number" ? "0.1" : undefined} value={value} onChange={(event) => onChange(event.target.value)} />
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

function InfoCard({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-[22px] border border-white/10 bg-white/[0.03] px-4 py-4">
      <p className="text-sm font-semibold text-white">{title}</p>
      <p className="mt-2 text-sm leading-6 text-slate-400">{text}</p>
    </div>
  );
}
