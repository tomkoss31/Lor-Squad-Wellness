import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  BodyScanComparisonGrid,
  type ComparisonMetricCard
} from "../components/body-scan/BodyScanComparisonGrid";
import { BodyFatInsightCard } from "../components/body-scan/BodyFatInsightCard";
import { MuscleMassInsightCard } from "../components/body-scan/MuscleMassInsightCard";
import { BodyScanSnapshotCard } from "../components/body-scan/BodyScanSnapshotCard";
import { HydrationVisceralInsightCard } from "../components/body-scan/HydrationVisceralInsightCard";
import { WeightGoalInsightCard } from "../components/education/WeightGoalInsightCard";
import { EvolutionChart } from "../components/body-scan/EvolutionChart";
import { HistoryTimeline } from "../components/client/HistoryTimeline";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { MetricTile } from "../components/ui/MetricTile";
import { PageHeading } from "../components/ui/PageHeading";
import { StatusBadge } from "../components/ui/StatusBadge";
import { useAppContext } from "../context/AppContext";
import { buildPvTrackingRecords, pvProductCatalog } from "../data/mockPvModule";
import { getAccessibleOwnerIds, isAdmin, isReferent } from "../lib/auth";
import { getClientActiveFollowUp } from "../lib/portfolio";
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
  const {
    currentUser,
    users,
    activityLogs,
    deleteClient,
    getClientById,
    followUps,
    pvTransactions,
    pvClientProducts,
    reassignClientOwner
  } = useAppContext();

  const client = clientId ? getClientById(clientId) : undefined;

  if (!client) {
    return (
      <Card>
        <p className="text-lg text-white">Client introuvable ou accès indisponible.</p>
      </Card>
    );
  }

  const currentClient = client;
  const [nextOwnerId, setNextOwnerId] = useState(client.distributorId);
  const [transferFeedback, setTransferFeedback] = useState("");
  const activeFollowUp = getClientActiveFollowUp(currentClient, followUps);
  const canReassignClient = isAdmin(currentUser) || isReferent(currentUser);
  const assignableOwnerIds = getAccessibleOwnerIds(currentUser, users);
  const assignableOwners = users.filter(
    (user) => user.active && assignableOwnerIds.has(user.id)
  );
  const clientActivity = activityLogs
    .filter((entry) => entry.clientId === currentClient.id)
    .slice(0, 6);

  useEffect(() => {
    setNextOwnerId(currentClient.distributorId);
  }, [currentClient.distributorId]);

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
  const recommendationCount = latestQuestionnaire.recommendations?.length ?? 0;
  const recommendationsContacted = latestQuestionnaire.recommendationsContacted ?? false;
  const optionalProductsLabel = latestQuestionnaire.optionalProductsUsed?.trim()
    ? latestQuestionnaire.optionalProductsUsed
    : "Non renseigné";
  const canDeleteClient = currentUser?.role === "admin";
  const pvRecord = buildPvTrackingRecords([currentClient], pvTransactions, pvClientProducts)[0] ?? null;
  const retainedProductIds = (
    firstAssessment.questionnaire.selectedProductIds?.length
      ? firstAssessment.questionnaire.selectedProductIds
      : latestQuestionnaire.selectedProductIds ?? []
  ).filter((productId, index, array) => array.indexOf(productId) === index);
  const retainedProducts = retainedProductIds
    .map((productId) => pvProductCatalog.find((product) => product.id === productId) ?? null)
    .filter((product): product is NonNullable<typeof product> => product != null);
  const retainedProductsLabel = retainedProducts.length
    ? retainedProducts.length <= 2
      ? retainedProducts.map((product) => product.name).join(" + ")
      : `${retainedProducts.length} produits retenus`
    : "Base programme";
  const retainedProductsTotalPrice = Number(
    retainedProducts.reduce((total, product) => total + product.pricePublic, 0).toFixed(2)
  );
  const retainedProductsTotalPv = Number(
    retainedProducts.reduce((total, product) => total + product.pv, 0).toFixed(2)
  );

  async function handleDeleteClient() {
    const shouldDelete = window.confirm(
      `Supprimer le dossier de ${currentClient.firstName} ${currentClient.lastName} ? Cette action retire aussi les bilans et les suivis liés à ce client.`
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

  async function handleTransferClient() {
    if (!canReassignClient || nextOwnerId === currentClient.distributorId) {
      return;
    }

    try {
      await reassignClientOwner(currentClient.id, { distributorId: nextOwnerId });
      const nextOwner = users.find((user) => user.id === nextOwnerId);
      setTransferFeedback(
        nextOwner
          ? `Le dossier est maintenant rattache a ${nextOwner.name}.`
          : "Le dossier a bien change de responsable."
      );
    } catch (error) {
      setTransferFeedback(
        error instanceof Error
          ? error.message
          : "Impossible de reattribuer ce dossier pour le moment."
      );
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
          : "Repère de suivi",
      previousDelta: previousDelta.weight,
      initialDelta: Number((latestBodyScan.weight - firstAssessment.bodyScan.weight).toFixed(1)),
      suffix: " kg",
      inverseGood: true
    },
    {
      label: "Graisse viscérale",
      primary: `${latestBodyScan.visceralFat}`,
      secondary: "Indice actuel",
      previousDelta: previousDelta.visceralFat,
      initialDelta: Number((latestBodyScan.visceralFat - firstAssessment.bodyScan.visceralFat).toFixed(1)),
      suffix: "",
      inverseGood: true
    },
    {
      label: "Âge métabolique",
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
                Programme en cours : {client.currentProgram || "Programme a confirmer"}
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
                  <span className="block">Démarrer le body scan</span>
                </span>
              </Link>

              <div className="flex flex-wrap gap-2">
              <StatusBadge
                label={client.started ? "Programme démarré" : "À démarrer"}
                tone={client.started ? "green" : "amber"}
              />
              <StatusBadge
                label={client.objective === "sport" ? "Sport" : "Perte de poids"}
                tone={client.objective === "sport" ? "green" : "blue"}
              />
              {recommendationCount ? (
                <StatusBadge
                  label={
                    recommendationsContacted
                      ? `${recommendationCount} recommandations contactées`
                      : `${recommendationCount} recommandations à contacter`
                  }
                  tone={recommendationsContacted ? "green" : "amber"}
                />
              ) : null}
              </div>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <MetricTile
              label="Poids de départ"
              value={`${firstAssessment.bodyScan.weight} kg`}
              hint={`Depuis le ${formatDate(firstAssessment.date)}`}
              accent="blue"
            />
            <MetricTile
              label="Poids du jour"
              value={`${latestBodyScan.weight} kg`}
              hint={`Relevé du ${formatDate(latestAssessment.date)}`}
              accent="green"
            />
            <MetricTile
              label={client.objective === "weight-loss" ? "Cible" : "Cap du moment"}
              value={
                client.objective === "weight-loss"
                  ? latestQuestionnaire.targetWeight
                    ? `${latestQuestionnaire.targetWeight} kg`
                    : "À définir"
                  : latestQuestionnaire.objectiveFocus || "Prise de masse"
              }
              hint={
                client.objective === "weight-loss"
                  ? "Repère cible"
                  : "Cap actuel"
              }
              accent="red"
            />
            <MetricTile
              label="Prochain rendez-vous"
              value={formatDateTime(activeFollowUp.dueDate)}
              hint="Suite déjà posée"
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
            dateLabel={`Relevé du ${formatDate(latestAssessment.date)}`}
            metrics={latestBodyScan}
          />

          <BodyFatInsightCard
            current={{ weight: latestBodyScan.weight, percent: latestBodyScan.bodyFat }}
            objective={client.objective}
            sex={client.sex}
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
            history={client.assessments.map((assessment) => ({
              date: assessment.date,
              weight: assessment.bodyScan.weight,
              percent: assessment.bodyScan.bodyFat
            }))}
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
            history={client.assessments.map((assessment) => ({
              date: assessment.date,
              weight: assessment.bodyScan.weight,
              muscleMass: assessment.bodyScan.muscleMass
            }))}
          />

          <HydrationVisceralInsightCard
            weight={latestBodyScan.weight}
            hydrationPercent={latestBodyScan.hydration}
            sex={client.sex}
            visceralFat={latestBodyScan.visceralFat}
            history={client.assessments.map((assessment) => ({
              date: assessment.date,
              weight: assessment.bodyScan.weight,
              hydrationPercent: assessment.bodyScan.hydration,
              visceralFat: assessment.bodyScan.visceralFat
            }))}
          />

          <div className="space-y-4 rounded-[26px] bg-slate-950/28 p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="eyebrow-label">Écarts et évolution</p>
                <p className="mt-3 text-2xl text-white">Ce qui a bougé</p>
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
          <Card className="space-y-2.5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="eyebrow-label">Cap du moment</p>
                <p className="mt-1.5 text-xl text-white">Lecture rapide</p>
              </div>
              <StatusBadge label={client.currentProgram || "Programme a confirmer"} tone={client.started ? "green" : "amber"} />
            </div>
            <div className="grid gap-2 md:grid-cols-2">
              <div className="md:col-span-2">
                <SummaryFocusCard
                  label="Objectif reformulé"
                  value={
                    latestQuestionnaire.objectiveFocus ||
                    (client.objective === "sport" ? "Prise de masse" : "Perte de poids")
                  }
                />
              </div>
              <SummaryFocusCard label="Âge" value={`${client.age} ans`} />
              <SummaryFocusCard label="Taille" value={`${client.height} cm`} />
            </div>
            <div className="grid gap-2">
              <SummaryRow label="Statut" value={client.started ? "Routine démarrée" : "Mise en place à lancer"} />
              {recommendationCount ? (
                <SummaryStatusRow
                  label="Recommandations"
                  badgeLabel={recommendationsContacted ? "Contactées" : "À contacter"}
                  tone={recommendationsContacted ? "green" : "amber"}
                  detail={`${recommendationCount} nom${recommendationCount > 1 ? "s" : ""}`}
                />
              ) : null}
              <SummaryRow label="Repère protéines" value={proteinRange} />
              <SummaryRow label="Hydratation cible" value={`${waterNeed} L`} />
              {retainedProducts.length ? (
                <SummaryRow label="Composition retenue" value={retainedProductsLabel} />
              ) : null}
              {retainedProducts.length ? (
                <SummaryRow
                  label="Prix routine estime"
                  value={formatPriceEuro(retainedProductsTotalPrice)}
                />
              ) : null}
              {retainedProducts.length ? (
                <SummaryRow label="PV routine estime" value={formatPv(retainedProductsTotalPv)} />
              ) : null}
              {pvRecord ? (
                <SummaryRow label="Dernière commande PV" value={formatDate(pvRecord.lastOrderDate)} />
              ) : null}
              <SummaryRow label="Produits optionnels" value={optionalProductsLabel} />
              {pvRecord ? (
                <SummaryLinkRow
                  label="Point volume"
                  to={`/pv/clients?responsable=${pvRecord.responsibleId}&client=${client.id}`}
                  value="Ouvrir la fiche PV"
                />
              ) : null}
              {pvRecord ? (
                <SummaryLinkRow
                  label="Commande / réassort"
                  to={`/pv/orders?client=${client.id}&product=${pvRecord.activeProducts[0]?.productId ?? "formula-1"}&type=commande`}
                  value="Ajouter un produit"
                />
              ) : null}
              <SummaryRow label="Note du moment" value={latestAssessment.notes} />
            </div>
          </Card>

          {client.objective === "weight-loss" && (
            <WeightGoalInsightCard
              currentWeight={latestBodyScan.weight}
              targetWeight={latestQuestionnaire.targetWeight}
              timeline={latestQuestionnaire.desiredTimeline}
              history={client.assessments.map((assessment) => ({
                date: assessment.date,
                weight: assessment.bodyScan.weight
              }))}
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
                label="Modifier le bilan de départ"
                hint="Corriger la date et les valeurs de reference"
              />
              <LinkButton
                to={`/pv/clients?responsable=${client.distributorId}&client=${client.id}`}
                label="Ouvrir la fiche point volume"
                hint="Voir la commande, le reste estime et les alertes produits"
              />
              <LinkButton
                to={`/clients/${client.id}/follow-up/new`}
                label="Nouveau body scan"
                hint="Entrer directement les nouvelles valeurs"
                tone="green"
              />
              <LinkButton
                to={`/clients/${client.id}/assessments/${latestAssessment.id}/edit`}
                label="Modifier le dernier bilan"
                hint="Completer une section oubliee ou corriger les valeurs"
              />
              <LinkButton
                to={`/clients/${client.id}/schedule/edit`}
                label="Modifier le prochain rendez-vous"
                hint="Ajuster la date, l'heure ou le type de suivi"
              />
              {canDeleteClient && (
                <DangerActionButton
                  label="Supprimer ce dossier"
                  hint="Retirer ce client, ses bilans et ses suivis liés"
                  onClick={handleDeleteClient}
                />
              )}
            </div>
          </Card>

          {canReassignClient ? (
            <Card className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="eyebrow-label">Transfert de portefeuille</p>
                  <p className="mt-3 text-2xl text-white">Changer le responsable</p>
                </div>
                <StatusBadge label={currentClient.distributorName} tone="amber" />
              </div>
              <div className="space-y-3">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-300">
                    Nouveau responsable du dossier
                  </label>
                  <select
                    value={nextOwnerId}
                    onChange={(event) => setNextOwnerId(event.target.value)}
                  >
                    {assignableOwners.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.name} - {user.role === "referent" ? "Referent" : user.role === "admin" ? "Admin" : "Distributeur"}
                      </option>
                    ))}
                  </select>
                </div>
                <Button
                  variant="secondary"
                  onClick={() => void handleTransferClient()}
                  disabled={nextOwnerId === currentClient.distributorId}
                >
                  Enregistrer le transfert
                </Button>
                <p className="text-sm leading-6 text-slate-400">
                  {transferFeedback ||
                    "Le dossier, le responsable affiche et le suivi produits actifs seront realignes ensemble."}
                </p>
              </div>
            </Card>
          ) : null}

          <Card className="space-y-4">
            <div>
              <p className="eyebrow-label">Repères du moment</p>
              <p className="mt-3 text-2xl text-white">À reformuler simplement</p>
            </div>
            <div className="grid gap-2">
              <QuickInfo
                text={`Petit-déjeuner : ${latestQuestionnaire.breakfastFrequency} - ${latestQuestionnaire.breakfastContent}`}
              />
              <QuickInfo text={`Protéines : ${latestQuestionnaire.proteinEachMeal} - repère actuel ${proteinRange}`} />
              <QuickInfo text={`Hydratation : ${latestQuestionnaire.waterIntake} L / jour pour un besoin estimé à ${waterNeed} L`} />
              <QuickInfo text={`Lecture corporelle : ${latestMusclePercent} % de masse musculaire et ${latestBonePercent} % de masse osseuse`} />
              <QuickInfo text={`Motivation : ${latestQuestionnaire.motivation}/10`} />
              {retainedProducts.length ? (
                <QuickInfo
                  text={`Routine retenue : ${retainedProducts
                    .map((product) => product.name)
                    .join(", ")}`}
                />
              ) : null}
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
                  id: entry.id,
                  date: formatDate(entry.date),
                  summary: entry.summary,
                  weight: entry.bodyScan.weight,
                  hydration: entry.bodyScan.hydration,
                  typeLabel: entry.type === "initial" ? "Depart" : "Suivi",
                  editTo: `/clients/${client.id}/assessments/${entry.id}/edit`
                }))}
            />
          </Card>

          <Card className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <p className="eyebrow-label">Activite dossier</p>
              <StatusBadge
                label={`${clientActivity.length} visible${clientActivity.length > 1 ? "s" : ""}`}
                tone="blue"
              />
            </div>
            <div className="space-y-3">
              {clientActivity.map((entry) => (
                <div key={entry.id} className="rounded-[20px] bg-white/[0.03] px-4 py-4">
                  <p className="text-sm font-semibold text-white">{entry.summary}</p>
                  {entry.detail ? (
                    <p className="mt-1 text-sm leading-6 text-slate-400">{entry.detail}</p>
                  ) : null}
                  <p className="mt-3 text-xs text-slate-500">
                    {entry.actorName} - {formatDateTime(entry.createdAt)}
                  </p>
                </div>
              ))}
              {!clientActivity.length ? (
                <div className="rounded-[20px] bg-white/[0.03] px-4 py-4 text-sm text-slate-400">
                  Les changements de responsable, de rendez-vous et de bilans apparaitront ici.
                </div>
              ) : null}
            </div>
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

function SummaryStatusRow({
  label,
  badgeLabel,
  tone,
  detail
}: {
  label: string;
  badgeLabel: string;
  tone: "green" | "amber";
  detail: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-[22px] bg-white/[0.03] px-4 py-3">
      <span className="text-sm text-slate-400">{label}</span>
      <div className="flex items-center gap-3">
        <span className="text-sm text-slate-400">{detail}</span>
        <StatusBadge label={badgeLabel} tone={tone} />
      </div>
    </div>
  );
}

function SummaryLinkRow({
  label,
  value,
  to
}: {
  label: string;
  value: string;
  to: string;
}) {
  return (
    <Link
      to={to}
      className="flex items-center justify-between gap-3 rounded-[22px] bg-sky-400/[0.08] px-4 py-3 transition hover:bg-sky-400/[0.14]"
    >
      <span className="text-sm text-slate-300">{label}</span>
      <span className="text-right text-sm font-semibold text-white">{value}</span>
    </Link>
  );
}

function QuickInfo({ text }: { text: string }) {
  return (
    <div className="rounded-[20px] bg-slate-950/24 px-4 py-3 text-sm leading-6 text-slate-200">
      {text}
    </div>
  );
}

function formatPriceEuro(value: number) {
  return `${value.toFixed(2)} EUR`;
}

function formatPv(value: number) {
  return `${value.toFixed(2)} PV`;
}

function SummaryFocusCard({
  label,
  value
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[20px] bg-slate-950/24 px-4 py-3.5">
      <p className="text-[11px] font-medium text-slate-500">{label}</p>
      <p className="mt-2.5 text-base font-semibold text-white">{value}</p>
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
          <p className="eyebrow-label">Repère de départ</p>
          <p className="mt-3 text-2xl text-white">Départ vs aujourd'hui</p>
          <p className="mt-2 text-sm leading-6 text-slate-300">
            Ce bloc aide à relire tout de suite l&apos;évolution depuis le premier bilan.
          </p>
        </div>
        <div className={`rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-medium ${weightTone}`}>
          {weightDelta === 0 ? "Poids stable" : `${weightDelta > 0 ? "+" : ""}${weightDelta} kg depuis le départ`}
        </div>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <OverviewMetricCard label="Départ" value={`${startWeight} kg`} note={formatDate(startDate)} tone="blue" />
        <OverviewMetricCard label="Aujourd'hui" value={`${currentWeight} kg`} note={formatDate(currentDate)} tone="green" highlighted />
        <OverviewMetricCard
          label="Graisse de départ"
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
              : `${bodyFatDelta > 0 ? "+" : ""}${bodyFatDelta} pt depuis le départ`
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
