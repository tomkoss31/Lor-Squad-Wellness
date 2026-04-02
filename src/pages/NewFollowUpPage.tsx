import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { BodyFatInsightCard } from "../components/body-scan/BodyFatInsightCard";
import { MuscleMassInsightCard } from "../components/body-scan/MuscleMassInsightCard";
import { BodyScanDeltaGrid } from "../components/body-scan/BodyScanDeltaGrid";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { WeightGoalInsightCard } from "../components/education/WeightGoalInsightCard";
import { PageHeading } from "../components/ui/PageHeading";
import { StatusBadge } from "../components/ui/StatusBadge";
import { useAppContext } from "../context/AppContext";
import {
  estimateBodyFatKg,
  estimateHydrationKg,
  estimateMuscleMassPercent,
  formatDate,
  formatDateTime,
  getAssessmentDelta,
  getFirstAssessment,
  getLatestAssessment,
  getPreviousAssessment,
  getWeightLossPaceInsight,
  getWeightLossPlan
} from "../lib/calculations";
import type { AssessmentQuestionnaire, AssessmentRecord, BodyScanMetrics } from "../types/domain";

function padDatePart(value: number) {
  return String(value).padStart(2, "0");
}

function toDateInputValue(date: Date) {
  return `${date.getFullYear()}-${padDatePart(date.getMonth() + 1)}-${padDatePart(date.getDate())}`;
}

function toDateTimeLocalValue(date: Date) {
  return `${toDateInputValue(date)}T${padDatePart(date.getHours())}:${padDatePart(date.getMinutes())}`;
}

function normalizeDateTimeLocalValue(value: string | undefined) {
  if (!value) {
    const fallback = new Date();
    fallback.setDate(fallback.getDate() + 14);
    fallback.setHours(10, 0, 0, 0);
    return toDateTimeLocalValue(fallback);
  }

  if (value.includes("T")) {
    return value.slice(0, 16);
  }

  return `${value}T10:00`;
}

export function NewFollowUpPage() {
  const { clientId } = useParams();
  const navigate = useNavigate();
  const { getClientById, addFollowUpAssessment } = useAppContext();
  const client = clientId ? getClientById(clientId) : undefined;

  if (!client) {
    return (
      <Card>
        <p className="text-white">Client introuvable ou acces indisponible.</p>
      </Card>
    );
  }

  const targetClient = client;
  const latest = getLatestAssessment(targetClient);
  const previous = getPreviousAssessment(targetClient);
  const first = getFirstAssessment(targetClient);

  const [bodyScan, setBodyScan] = useState<BodyScanMetrics>({ ...latest.bodyScan });
  const [summary, setSummary] = useState(
    "Suivi simple avec ajustements clairs et progression facile a relire."
  );
  const [notes, setNotes] = useState(
    "Le client repart avec des reperes simples et une suite deja fixee."
  );
  const [assessmentDate, setAssessmentDate] = useState(toDateInputValue(new Date()));
  const [dueDate, setDueDate] = useState(normalizeDateTimeLocalValue(targetClient.nextFollowUp));
  const [followUpType, setFollowUpType] = useState("Suivi terrain");

  const delta = getAssessmentDelta(bodyScan, latest.bodyScan);
  const bodyFatKg = estimateBodyFatKg(bodyScan.weight, bodyScan.bodyFat);
  const musclePercent = estimateMuscleMassPercent(bodyScan.weight, bodyScan.muscleMass);
  const hydrationKg = estimateHydrationKg(bodyScan.weight, bodyScan.hydration);
  const weightLossPlan = getWeightLossPlan(
    bodyScan.weight,
    latest.questionnaire.targetWeight,
    latest.questionnaire.desiredTimeline
  );
  const weightLossPace = getWeightLossPaceInsight(weightLossPlan);

  async function handleSubmit() {
    const nextQuestionnaire: AssessmentQuestionnaire = {
      ...latest.questionnaire,
      desiredTimeline: latest.questionnaire.desiredTimeline
    };

    const assessment: AssessmentRecord = {
      id: `a-${targetClient.id}-${Date.now()}`,
      date: assessmentDate,
      type: "follow-up",
      objective: targetClient.objective,
      programTitle: targetClient.currentProgram,
      summary,
      notes,
      nextFollowUp: dueDate,
      bodyScan,
      questionnaire: nextQuestionnaire,
      pedagogicalFocus: latest.pedagogicalFocus
    };

    await addFollowUpAssessment(targetClient.id, assessment, {
      dueDate,
      type: followUpType,
      status: "scheduled"
    });

    navigate(`/clients/${targetClient.id}`);
  }

  return (
    <div className="space-y-6">
      <PageHeading
        eyebrow="Nouveau suivi"
        title={`Suivi de ${targetClient.firstName} ${targetClient.lastName}`}
        description="Cet ecran sert a relire le dernier point, saisir les nouvelles mesures et poser la suite tranquillement."
      />

      <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <Card className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm text-slate-400">
                Dernier bilan {formatDate(latest.date)}
                {previous && ` - precedent ${formatDate(previous.date)}`}
              </p>
              <p className="mt-2 text-3xl text-white">{targetClient.currentProgram}</p>
            </div>
            <StatusBadge label="Suivi terrain" tone="green" />
          </div>

          <div className="rounded-[24px] border border-emerald-400/20 bg-emerald-400/[0.06] p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.25em] text-emerald-200/70">
                  Nouveau releve
                </p>
                <p className="mt-2 text-2xl text-white">Entrer les nouvelles valeurs du body scan</p>
                <p className="mt-2 text-sm leading-6 text-slate-300">
                  Commencer ici avec les chiffres du jour, puis lire juste dessous les ecarts et
                  l'evolution.
                </p>
              </div>
              <StatusBadge label="Saisie rapide" tone="green" />
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <MetricField
                label="Poids (kg)"
                value={bodyScan.weight}
                onChange={(value) => setBodyScan({ ...bodyScan, weight: Number(value) })}
              />
              <MetricField
                label="Masse grasse (%)"
                value={bodyScan.bodyFat}
                onChange={(value) => setBodyScan({ ...bodyScan, bodyFat: Number(value) })}
              />
              <MetricField
                label="Masse musculaire (kg)"
                value={bodyScan.muscleMass}
                onChange={(value) => setBodyScan({ ...bodyScan, muscleMass: Number(value) })}
              />
              <MetricField
                label="Hydratation (%)"
                value={bodyScan.hydration}
                onChange={(value) => setBodyScan({ ...bodyScan, hydration: Number(value) })}
              />
              <MetricField
                label="Masse osseuse (kg)"
                value={bodyScan.boneMass}
                onChange={(value) => setBodyScan({ ...bodyScan, boneMass: Number(value) })}
              />
              <MetricField
                label="Graisse viscerale"
                value={bodyScan.visceralFat}
                onChange={(value) => setBodyScan({ ...bodyScan, visceralFat: Number(value) })}
              />
              <MetricField
                label="BMR (kcal)"
                value={bodyScan.bmr}
                onChange={(value) => setBodyScan({ ...bodyScan, bmr: Number(value) })}
              />
              <MetricField
                label="Age metabolique (ans)"
                value={bodyScan.metabolicAge}
                onChange={(value) => setBodyScan({ ...bodyScan, metabolicAge: Number(value) })}
              />
            </div>
          </div>

          <BodyScanDeltaGrid latest={bodyScan} delta={delta} />

          <StartingPointWeightCard
            objective={targetClient.objective}
            startDate={first.date}
            startWeight={first.bodyScan.weight}
            latestDate={latest.date}
            latestWeight={latest.bodyScan.weight}
            currentDate={assessmentDate}
            currentWeight={bodyScan.weight}
          />

          <BodyFatInsightCard
            current={{ weight: bodyScan.weight, percent: bodyScan.bodyFat }}
            objective={targetClient.objective}
            previous={{ weight: latest.bodyScan.weight, percent: latest.bodyScan.bodyFat }}
            initial={{ weight: first.bodyScan.weight, percent: first.bodyScan.bodyFat }}
          />

          <MuscleMassInsightCard
            current={{ weight: bodyScan.weight, muscleMass: bodyScan.muscleMass }}
            previous={{ weight: latest.bodyScan.weight, muscleMass: latest.bodyScan.muscleMass }}
            initial={{ weight: first.bodyScan.weight, muscleMass: first.bodyScan.muscleMass }}
          />

          {targetClient.objective === "weight-loss" && (
            <WeightGoalInsightCard
              currentWeight={bodyScan.weight}
              targetWeight={latest.questionnaire.targetWeight}
              timeline={latest.questionnaire.desiredTimeline}
            />
          )}
        </Card>

        <div className="space-y-4">
          <Card className="space-y-4">
            <p className="text-xs uppercase tracking-[0.25em] text-slate-500">
              Lecture rapide avant validation
            </p>
            <div className="grid gap-3">
              <InfoRow label="Dernier bilan" value={latest.summary} />
              <InfoRow label="Programme en cours" value={targetClient.currentProgram} />
              <InfoRow
                label="Prochain rendez-vous actuel"
                value={formatDateTime(targetClient.nextFollowUp)}
              />
              <InfoRow label="Masse grasse" value={`${bodyScan.bodyFat} % - ${bodyFatKg} kg`} />
              <InfoRow label="Masse musculaire" value={`${bodyScan.muscleMass} kg - ${musclePercent} %`} />
              <InfoRow label="Masse hydrique estimee" value={`${bodyScan.hydration} % - ${hydrationKg} kg`} />
              {targetClient.objective === "weight-loss" && (
                <InfoRow
                  label="Cap perte de poids"
                  value={
                    weightLossPlan.targetWeight == null
                      ? "Poids cible non defini"
                      : weightLossPlan.isAchieved
                        ? "Objectif de poids deja atteint"
                        : `${weightLossPlan.remainingKg} kg restants - ${weightLossPlan.dailyGrams} g / jour`
                  }
                />
              )}
              {targetClient.objective === "weight-loss" && (
                <InfoRow label="Lecture du rythme" value={weightLossPace.label} />
              )}
            </div>
          </Card>

          <Card className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300">Type de suivi</label>
              <input value={followUpType} onChange={(event) => setFollowUpType(event.target.value)} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300">Resume du suivi</label>
              <textarea rows={4} value={summary} onChange={(event) => setSummary(event.target.value)} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300">Notes utiles</label>
              <textarea rows={4} value={notes} onChange={(event) => setNotes(event.target.value)} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300">Date du suivi</label>
              <input
                type="date"
                value={assessmentDate}
                onChange={(event) => setAssessmentDate(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300">Prochain rendez-vous</label>
              <input
                type="datetime-local"
                value={dueDate}
                onChange={(event) => setDueDate(event.target.value)}
              />
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="secondary" onClick={() => navigate(`/clients/${targetClient.id}`)}>
                Annuler
              </Button>
              <Button onClick={() => void handleSubmit()}>Valider le suivi</Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function MetricField({
  label,
  value,
  onChange
}: {
  label: string;
  value: number;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-slate-300">{label}</label>
      <input type="number" step="0.1" value={value} onChange={(event) => onChange(event.target.value)} />
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[20px] border border-white/10 bg-white/[0.03] px-4 py-3">
      <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{label}</p>
      <p className="mt-2 text-sm leading-6 text-slate-200">{value}</p>
    </div>
  );
}

function StartingPointWeightCard({
  objective,
  startDate,
  startWeight,
  latestDate,
  latestWeight,
  currentDate,
  currentWeight
}: {
  objective: "weight-loss" | "sport";
  startDate: string;
  startWeight: number;
  latestDate: string;
  latestWeight: number;
  currentDate: string;
  currentWeight: number;
}) {
  const deltaFromStart = Number((currentWeight - startWeight).toFixed(1));
  const deltaFromLatest = Number((currentWeight - latestWeight).toFixed(1));
  const isWeightLoss = objective === "weight-loss";
  const mainTone =
    deltaFromStart === 0
      ? "text-slate-200"
      : isWeightLoss
        ? deltaFromStart < 0
          ? "text-emerald-200"
          : "text-amber-200"
        : deltaFromStart > 0
          ? "text-emerald-200"
          : "text-amber-200";
  const mainDeltaLabel =
    deltaFromStart === 0
      ? "Poids stable depuis le depart"
      : `${deltaFromStart > 0 ? "+" : ""}${deltaFromStart} kg depuis le depart`;
  const secondaryDeltaLabel =
    deltaFromLatest === 0
      ? "Stable depuis le dernier point"
      : `${deltaFromLatest > 0 ? "+" : ""}${deltaFromLatest} kg depuis le dernier point`;

  return (
    <Card className="space-y-5 bg-[linear-gradient(180deg,rgba(15,23,42,0.28),rgba(15,23,42,0.5))]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-slate-500">Repere de progression</p>
          <p className="mt-2 text-2xl text-white">Poids de depart vs poids du jour</p>
          <p className="mt-2 text-sm leading-6 text-slate-300">
            Ce bloc sert a montrer tout de suite le point de depart, le dernier releve et la
            situation aujourd&apos;hui.
          </p>
        </div>
        <div className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-medium text-white">
          {currentWeight} kg aujourd&apos;hui
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <WeightMilestoneCard label="Depart" date={formatDate(startDate)} weight={startWeight} tone="blue" />
        <WeightMilestoneCard
          label="Dernier point"
          date={formatDate(latestDate)}
          weight={latestWeight}
          tone="slate"
        />
        <WeightMilestoneCard
          label="Aujourd'hui"
          date={formatDate(currentDate)}
          weight={currentWeight}
          tone="green"
          highlighted
        />
      </div>

      <div className="rounded-[24px] border border-white/10 bg-slate-950/35 p-5">
        <div className="flex items-center gap-3">
          <div className="h-2 flex-1 rounded-full bg-white/10">
            <div className="flex h-full items-center justify-between px-1">
              <span className="h-3 w-3 rounded-full bg-sky-300 shadow-[0_0_10px_rgba(125,211,252,0.45)]" />
              <span className="h-3 w-3 rounded-full bg-slate-300 shadow-[0_0_10px_rgba(226,232,240,0.25)]" />
              <span className="h-3 w-3 rounded-full bg-emerald-300 shadow-[0_0_10px_rgba(110,231,183,0.45)]" />
            </div>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <p className={`text-lg font-semibold ${mainTone}`}>{mainDeltaLabel}</p>
          <p className="text-sm text-slate-400">{secondaryDeltaLabel}</p>
        </div>
      </div>
    </Card>
  );
}

function WeightMilestoneCard({
  label,
  date,
  weight,
  tone,
  highlighted = false
}: {
  label: string;
  date: string;
  weight: number;
  tone: "blue" | "slate" | "green";
  highlighted?: boolean;
}) {
  const toneClass =
    tone === "green"
      ? "border-emerald-400/20 bg-emerald-400/[0.07]"
      : tone === "blue"
        ? "border-sky-400/20 bg-sky-400/[0.07]"
        : "border-white/10 bg-white/[0.03]";

  return (
    <div
      className={`rounded-[24px] border p-5 ${toneClass} ${
        highlighted ? "shadow-[0_0_30px_rgba(52,211,153,0.08)]" : ""
      }`}
    >
      <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">{label}</p>
      <p className="mt-3 text-3xl text-white">{weight} kg</p>
      <p className="mt-2 text-sm text-slate-400">{date}</p>
    </div>
  );
}
