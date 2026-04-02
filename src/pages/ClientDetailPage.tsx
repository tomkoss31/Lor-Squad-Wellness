import { Link, useNavigate, useParams } from "react-router-dom";
import {
  BodyScanComparisonGrid,
  type ComparisonMetricCard
} from "../components/body-scan/BodyScanComparisonGrid";
import { BodyFatInsightCard } from "../components/body-scan/BodyFatInsightCard";
import { MuscleMassInsightCard } from "../components/body-scan/MuscleMassInsightCard";
import { BodyScanSnapshotCard } from "../components/body-scan/BodyScanSnapshotCard";
import { HydrationInsightCard } from "../components/education/HydrationInsightCard";
import { WeightGoalInsightCard } from "../components/education/WeightGoalInsightCard";
import { EvolutionChart } from "../components/body-scan/EvolutionChart";
import { HistoryTimeline } from "../components/client/HistoryTimeline";
import { Card } from "../components/ui/Card";
import { MetricTile } from "../components/ui/MetricTile";
import { PageHeading } from "../components/ui/PageHeading";
import { StatusBadge } from "../components/ui/StatusBadge";
import { useAppContext } from "../context/AppContext";
import {
  calculateProteinRange,
  calculateWaterNeed,
  estimateHydrationKg,
  estimateRelativeMassPercent,
  estimateMuscleMassPercent,
  formatDate,
  formatDateTime,
  getAssessmentDelta,
  getFirstAssessment,
  getLatestAssessment,
  getLatestBodyScan,
  getLatestQuestionnaire,
  getPreviousAssessment,
  getWeightLossPlan
} from "../lib/calculations";

export function ClientDetailPage() {
  const navigate = useNavigate();
  const { clientId } = useParams();
  const { currentUser, deleteClient, getClientById } = useAppContext();

  const client = clientId ? getClientById(clientId) : undefined;

  if (!client) {
    return (
      <Card>
        <p className="text-lg text-white">Client introuvable ou acces indisponible.</p>
      </Card>
    );
  }

  const currentClient = client;

  const latestAssessment = getLatestAssessment(client);
  const previousAssessment = getPreviousAssessment(client);
  const firstAssessment = getFirstAssessment(client);
  const latestBodyScan = getLatestBodyScan(client);
  const latestQuestionnaire = getLatestQuestionnaire(client);
  const previousDelta = getAssessmentDelta(latestBodyScan, previousAssessment?.bodyScan ?? null);
  const waterNeed = calculateWaterNeed(latestBodyScan.weight);
  const proteinRange = calculateProteinRange(latestBodyScan.weight, client.objective);
  const latestMusclePercent = estimateMuscleMassPercent(
    latestBodyScan.weight,
    latestBodyScan.muscleMass
  );
  const latestBonePercent = estimateRelativeMassPercent(
    latestBodyScan.weight,
    latestBodyScan.boneMass
  );
  const latestHydrationKg = estimateHydrationKg(latestBodyScan.weight, latestBodyScan.hydration);
  const previousHydrationKg = previousAssessment
    ? estimateHydrationKg(previousAssessment.bodyScan.weight, previousAssessment.bodyScan.hydration)
    : null;
  const firstHydrationKg = estimateHydrationKg(
    firstAssessment.bodyScan.weight,
    firstAssessment.bodyScan.hydration
  );
  const weightLossPlan = getWeightLossPlan(
    latestBodyScan.weight,
    latestQuestionnaire.targetWeight,
    latestQuestionnaire.desiredTimeline
  );
  const canDeleteClient = currentUser?.role === "admin";

  async function handleDeleteClient() {
    const shouldDelete = window.confirm(
      `Supprimer le dossier de ${currentClient.firstName} ${currentClient.lastName} ? Cette action retire aussi les bilans et les suivis lies a ce client.`
    );

    if (!shouldDelete) {
      return;
    }

    try {
      await deleteClient(currentClient.id);
      navigate("/clients");
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Impossible de supprimer ce dossier pour le moment.";
      window.alert(message);
    }
  }

  const comparisonItems: ComparisonMetricCard[] = [
    {
      label: "Masse musculaire",
      primary: `${latestBodyScan.muscleMass} kg`,
      secondary: `${latestMusclePercent} %`,
      previousDelta: previousAssessment == null ? 0 : previousDelta.muscleMass,
      initialDelta: Number(
        (latestBodyScan.muscleMass - firstAssessment.bodyScan.muscleMass).toFixed(1)
      ),
      suffix: " kg"
    },
    {
      label: "Hydratation",
      primary: `${latestBodyScan.hydration} %`,
      secondary: `${latestHydrationKg} kg estimes`,
      previousDelta:
        previousHydrationKg == null
          ? 0
          : Number((latestHydrationKg - previousHydrationKg).toFixed(1)),
      initialDelta: Number((latestHydrationKg - firstHydrationKg).toFixed(1)),
      suffix: " kg"
    },
    {
      label: "Poids",
      primary: `${latestBodyScan.weight} kg`,
      secondary:
        client.objective === "weight-loss"
          ? weightLossPlan.isAchieved
            ? `Cible ${latestQuestionnaire.targetWeight} kg atteinte`
            : `${weightLossPlan.remainingKg} kg restants`
          : "Repere de suivi",
      previousDelta: previousDelta.weight,
      initialDelta: Number((latestBodyScan.weight - firstAssessment.bodyScan.weight).toFixed(1)),
      suffix: " kg",
      inverseGood: true
    },
    {
      label: "Graisse viscerale",
      primary: `${latestBodyScan.visceralFat}`,
      secondary: "Indice actuel",
      previousDelta: previousDelta.visceralFat,
      initialDelta: Number((latestBodyScan.visceralFat - firstAssessment.bodyScan.visceralFat).toFixed(1)),
      suffix: "",
      inverseGood: true
    },
    {
      label: "Age metabolique",
      primary: `${latestBodyScan.metabolicAge} ans`,
      secondary: `Age reel ${client.age} ans`,
      previousDelta: previousDelta.metabolicAge,
      initialDelta: Number((latestBodyScan.metabolicAge - firstAssessment.bodyScan.metabolicAge).toFixed(1)),
      suffix: " ans",
      inverseGood: true
    }
  ];

  return (
    <div className="space-y-6">
      <PageHeading
        eyebrow="Fiche client"
        title={`${client.firstName} ${client.lastName}`}
        description="Chiffres utiles, progression, cap actuel et prochaine action."
      />

      <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <Card className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm text-slate-400">
                {client.job} - {client.city ?? "Ville non renseignee"} -{" "}
                <Link
                  to={`/distributors/${client.distributorId}`}
                  className="font-medium text-sky-300 transition hover:text-sky-200"
                >
                  {client.distributorName}
                </Link>
              </p>
              <p className="mt-2 text-4xl">
                {client.firstName} {client.lastName}
              </p>
              <p className="mt-2 text-sm text-slate-400">
                Programme en cours : {client.currentProgram}
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-end gap-3">
              <Link
                to={`/clients/${client.id}/follow-up/new`}
                className="inline-flex items-center gap-3 rounded-[22px] bg-emerald-400/12 px-4 py-3 text-sm font-semibold text-emerald-100 transition hover:bg-emerald-400/18"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-400/18 text-emerald-100">
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 24 24"
                    className="h-5 w-5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M4 7.5h4" />
                    <path d="M4 12h7" />
                    <path d="M4 16.5h4" />
                    <path d="M15.5 4v5" />
                    <path d="M13 6.5h5" />
                    <rect x="11" y="10" width="9" height="9" rx="2" />
                  </svg>
                </span>
                <span className="text-left">
                  <span className="block text-[11px] font-medium text-emerald-200/70">
                    Action rapide
                  </span>
                  <span className="block">Demarrer le body scan</span>
                </span>
              </Link>

              <div className="flex flex-wrap gap-2">
              <StatusBadge
                label={client.started ? "Programme demarre" : "A demarrer"}
                tone={client.started ? "green" : "amber"}
              />
              <StatusBadge
                label={client.objective === "sport" ? "Sport" : "Perte de poids"}
                tone={client.objective === "sport" ? "green" : "blue"}
              />
              </div>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <MetricTile
              label="Poids de depart"
              value={`${firstAssessment.bodyScan.weight} kg`}
              hint={`Depuis le ${formatDate(firstAssessment.date)}`}
              accent="blue"
            />
            <MetricTile
              label="Poids du jour"
              value={`${latestBodyScan.weight} kg`}
              hint={`Releve du ${formatDate(latestAssessment.date)}`}
              accent="green"
            />
            <MetricTile
              label={client.objective === "weight-loss" ? "Cible" : "Cap du moment"}
              value={
                client.objective === "weight-loss"
                  ? latestQuestionnaire.targetWeight
                    ? `${latestQuestionnaire.targetWeight} kg`
                    : "A definir"
                  : latestQuestionnaire.objectiveFocus || "Prise de masse"
              }
              hint={
                client.objective === "weight-loss"
                  ? "Repere cible"
                  : "Cap actuel"
              }
              accent="red"
            />
            <MetricTile
              label="Prochain rendez-vous"
              value={formatDateTime(client.nextFollowUp)}
              hint="Suite deja posee"
              accent="blue"
            />
          </div>

          <StartingPointOverviewCard
            objective={client.objective}
            startDate={firstAssessment.date}
            startWeight={firstAssessment.bodyScan.weight}
            currentDate={latestAssessment.date}
            currentWeight={latestBodyScan.weight}
            currentBodyFat={latestBodyScan.bodyFat}
            startBodyFat={firstAssessment.bodyScan.bodyFat}
          />

          <BodyScanSnapshotCard
            title="Dernier body scan"
            dateLabel={`Releve du ${formatDate(latestAssessment.date)}`}
            metrics={latestBodyScan}
          />

          <BodyFatInsightCard
            current={{ weight: latestBodyScan.weight, percent: latestBodyScan.bodyFat }}
            objective={client.objective}
            previous={
              previousAssessment
                ? {
                    weight: previousAssessment.bodyScan.weight,
                    percent: previousAssessment.bodyScan.bodyFat
                  }
                : null
            }
            initial={{
              weight: firstAssessment.bodyScan.weight,
              percent: firstAssessment.bodyScan.bodyFat
            }}
          />

          <MuscleMassInsightCard
            current={{ weight: latestBodyScan.weight, muscleMass: latestBodyScan.muscleMass }}
            previous={
              previousAssessment
                ? {
                    weight: previousAssessment.bodyScan.weight,
                    muscleMass: previousAssessment.bodyScan.muscleMass
                  }
                : null
            }
            initial={{
              weight: firstAssessment.bodyScan.weight,
              muscleMass: firstAssessment.bodyScan.muscleMass
            }}
          />

          <HydrationInsightCard
            weight={latestBodyScan.weight}
            hydrationPercent={latestBodyScan.hydration}
            waterIntake={latestQuestionnaire.waterIntake}
            sex={client.sex}
            visceralFat={latestBodyScan.visceralFat}
          />

          <div className="space-y-4 rounded-[26px] bg-slate-950/28 p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="eyebrow-label">Ecarts et evolution</p>
                <p className="mt-3 text-2xl text-white">Ce qui a bouge</p>
              </div>
              <StatusBadge
                label={previousAssessment ? "Comparaison active" : "Premier bilan"}
                tone="blue"
              />
            </div>
            <BodyScanComparisonGrid items={comparisonItems} />
          </div>

          <EvolutionChart assessments={client.assessments} />
        </Card>

        <div className="space-y-4">
          <Card className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="eyebrow-label">Cap du moment</p>
                <p className="mt-3 text-2xl text-white">Lecture rapide</p>
              </div>
              <StatusBadge label={client.currentProgram} tone="green" />
            </div>
            <div className="grid gap-3">
              <SummaryFocusCard
                label="Objectif reformule"
                value={latestQuestionnaire.objectiveFocus || (client.objective === "sport" ? "Prise de masse" : "Perte de poids")}
              />
              <SummaryFocusCard label="Programme" value={client.currentProgram} />
              <SummaryFocusCard
                label="Invite par"
                value={firstAssessment.questionnaire.referredByName || "Non renseigne"}
              />
            </div>
            <div className="grid gap-3">
              <SummaryRow label="Statut" value={client.started ? "Routine demarree" : "Mise en place a lancer"} />
              <SummaryRow label="Repere proteines" value={proteinRange} />
              <SummaryRow label="Hydratation cible" value={`${waterNeed} L`} />
              <SummaryRow label="Note du moment" value={latestAssessment.notes} />
            </div>
          </Card>

          {client.objective === "weight-loss" && (
            <WeightGoalInsightCard
              currentWeight={latestBodyScan.weight}
              targetWeight={latestQuestionnaire.targetWeight}
              timeline={latestQuestionnaire.desiredTimeline}
            />
          )}

          <Card className="space-y-4">
            <div>
              <p className="eyebrow-label">Actions rapides</p>
              <p className="mt-3 text-2xl text-white">Pour avancer maintenant</p>
            </div>
            <div className="grid gap-3">
              <LinkButton
                to={`/clients/${client.id}/follow-up/new`}
                label="Nouveau suivi"
                hint="Relire, mesurer et poser la suite"
              />
              <LinkButton
                to={`/clients/${client.id}/start-assessment/edit`}
                label="Modifier le bilan de depart"
                hint="Corriger la date et les valeurs de reference"
              />
              <LinkButton
                to={`/clients/${client.id}/follow-up/new`}
                label="Nouveau body scan"
                hint="Entrer directement les nouvelles valeurs"
                tone="green"
              />
              <ActionButton
                label="Ajouter une note"
                hint="Garder un point simple apres l'echange"
              />
              <ActionButton
                label="Modifier le prochain rendez-vous"
                hint="Ajuster la date ou le rythme de suivi"
              />
              {canDeleteClient && (
                <DangerActionButton
                  label="Supprimer ce dossier"
                  hint="Retirer ce client, ses bilans et ses suivis lies"
                  onClick={handleDeleteClient}
                />
              )}
            </div>
          </Card>

          <Card className="space-y-4">
            <div>
              <p className="eyebrow-label">Reperes du moment</p>
              <p className="mt-3 text-2xl text-white">A reformuler simplement</p>
            </div>
            <div className="grid gap-2">
              <QuickInfo
                text={`Petit-dejeuner : ${latestQuestionnaire.breakfastFrequency} - ${latestQuestionnaire.breakfastContent}`}
              />
              <QuickInfo text={`Proteines : ${latestQuestionnaire.proteinEachMeal} - repere actuel ${proteinRange}`} />
              <QuickInfo text={`Hydratation : ${latestQuestionnaire.waterIntake} L / jour pour un besoin estime a ${waterNeed} L`} />
              <QuickInfo text={`Lecture corporelle : ${latestMusclePercent} % de masse musculaire et ${latestBonePercent} % de masse osseuse`} />
              <QuickInfo text={`Motivation : ${latestQuestionnaire.motivation}/10`} />
            </div>
          </Card>

          <Card className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <p className="eyebrow-label">Historique des bilans</p>
              <Link to="/assessments/new" className="text-sm font-semibold text-sky-300">
                Nouveau bilan
              </Link>
            </div>
            <HistoryTimeline
              entries={[...client.assessments]
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                .map((entry) => ({
                  date: formatDate(entry.date),
                  summary: entry.summary,
                  weight: entry.bodyScan.weight,
                  hydration: entry.bodyScan.hydration
                }))}
            />
          </Card>
        </div>
      </div>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-[22px] bg-white/[0.03] px-4 py-3">
      <span className="text-sm text-slate-400">{label}</span>
      <span className="text-right text-sm font-semibold text-white">{value}</span>
    </div>
  );
}

function QuickInfo({ text }: { text: string }) {
  return (
    <div className="rounded-[20px] bg-slate-950/24 px-4 py-3 text-sm leading-6 text-slate-200">
      {text}
    </div>
  );
}

function SummaryFocusCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[22px] bg-slate-950/24 px-4 py-4">
      <p className="text-[11px] font-medium text-slate-500">{label}</p>
      <p className="mt-3 text-lg font-semibold text-white">{value}</p>
    </div>
  );
}

function StartingPointOverviewCard({
  objective,
  startDate,
  startWeight,
  currentDate,
  currentWeight,
  startBodyFat,
  currentBodyFat
}: {
  objective: "weight-loss" | "sport";
  startDate: string;
  startWeight: number;
  currentDate: string;
  currentWeight: number;
  startBodyFat: number;
  currentBodyFat: number;
}) {
  const weightDelta = Number((currentWeight - startWeight).toFixed(1));
  const bodyFatDelta = Number((currentBodyFat - startBodyFat).toFixed(1));
  const weightTone =
    weightDelta === 0
      ? "text-slate-200"
      : objective === "weight-loss"
        ? weightDelta < 0
          ? "text-emerald-200"
          : "text-amber-200"
        : weightDelta > 0
          ? "text-emerald-200"
          : "text-amber-200";

  return (
    <div className="rounded-[28px] bg-[linear-gradient(180deg,rgba(15,23,42,0.28),rgba(15,23,42,0.52))] p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="eyebrow-label">Repere de depart</p>
          <p className="mt-3 text-2xl text-white">Depart vs aujourd'hui</p>
          <p className="mt-2 text-sm leading-6 text-slate-300">
            Ce bloc aide a relire tout de suite l&apos;evolution depuis le premier bilan.
          </p>
        </div>
        <div className={`rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-medium ${weightTone}`}>
          {weightDelta === 0 ? "Poids stable" : `${weightDelta > 0 ? "+" : ""}${weightDelta} kg depuis le depart`}
        </div>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <OverviewMetricCard label="Depart" value={`${startWeight} kg`} note={formatDate(startDate)} tone="blue" />
        <OverviewMetricCard label="Aujourd'hui" value={`${currentWeight} kg`} note={formatDate(currentDate)} tone="green" highlighted />
        <OverviewMetricCard
          label="Graisse de depart"
          value={`${startBodyFat} %`}
          note="Premier body scan"
          tone="slate"
        />
        <OverviewMetricCard
          label="Graisse actuelle"
          value={`${currentBodyFat} %`}
          note={
            bodyFatDelta === 0
              ? "Stable"
              : `${bodyFatDelta > 0 ? "+" : ""}${bodyFatDelta} pt depuis le depart`
          }
          tone="slate"
        />
      </div>
    </div>
  );
}

function OverviewMetricCard({
  label,
  value,
  note,
  tone,
  highlighted = false
}: {
  label: string;
  value: string;
  note: string;
  tone: "blue" | "green" | "slate";
  highlighted?: boolean;
}) {
  const toneClass =
    tone === "green"
      ? "bg-emerald-400/[0.07] ring-1 ring-emerald-400/12"
      : tone === "blue"
        ? "bg-sky-400/[0.07] ring-1 ring-sky-400/12"
        : "bg-slate-950/35 ring-1 ring-white/6";

  return (
    <div
      className={`rounded-[24px] p-4 ${toneClass} ${
        highlighted ? "shadow-[0_0_30px_rgba(52,211,153,0.08)]" : ""
      }`}
    >
      <p className="text-[11px] font-medium text-slate-500">{label}</p>
      <p className="mt-3 text-2xl text-white">{value}</p>
      <p className="mt-2 text-sm text-slate-400">{note}</p>
    </div>
  );
}

function ActionButton({ label, hint }: { label: string; hint: string }) {
  return (
    <button
      type="button"
      className="rounded-[22px] bg-white/[0.03] px-4 py-3 text-left transition hover:bg-white/[0.06]"
    >
      <span className="block text-sm font-medium text-white">{label}</span>
      <span className="mt-1 block text-sm text-slate-400">{hint}</span>
    </button>
  );
}

function DangerActionButton({
  label,
  hint,
  onClick
}: {
  label: string;
  hint: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-[22px] bg-red-500/10 px-4 py-3 text-left transition hover:bg-red-500/15"
    >
      <span className="block text-sm font-medium text-red-100">{label}</span>
      <span className="mt-1 block text-sm text-red-100/75">{hint}</span>
    </button>
  );
}

function LinkButton({
  to,
  label,
  hint,
  tone = "blue"
}: {
  to: string;
  label: string;
  hint: string;
  tone?: "blue" | "green";
}) {
  return (
    <Link
      to={to}
      className={`rounded-[22px] px-4 py-3 text-left transition ${
        tone === "green"
          ? "bg-emerald-400/10 hover:bg-emerald-400/15"
          : "bg-sky-400/10 hover:bg-sky-400/15"
      }`}
    >
      <span className="block text-sm font-medium text-white">{label}</span>
      <span className="mt-1 block text-sm text-slate-200/85">{hint}</span>
    </Link>
  );
}
