import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { EditScheduleModal } from "../components/client/EditScheduleModal";
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
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
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
      {/* Hero header client */}
      <div className="glass-panel rounded-[24px] p-5 sm:p-6" style={{ position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: -40, right: -40, width: 180, height: 180, borderRadius: '50%', background: 'rgba(201,168,76,0.06)', pointerEvents: 'none' }} />
        <div className="flex flex-wrap items-center justify-between gap-4" style={{ position: 'relative' }}>
          <div className="flex items-center gap-4">
            <div style={{
              width: 56, height: 56, borderRadius: '50%', flexShrink: 0,
              background: 'rgba(201,168,76,0.15)', color: '#C9A84C',
              border: '2px solid rgba(201,168,76,0.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: 'Syne, sans-serif', fontSize: 20, fontWeight: 700
            }}>
              {client.firstName[0]}{client.lastName[0]}
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 style={{ fontFamily: 'Syne, sans-serif', fontSize: 22, fontWeight: 800, color: '#F0EDE8', margin: 0 }}>
                  {client.firstName} {client.lastName}
                </h1>
                <StatusBadge
                  label={client.started ? "Démarré" : "À démarrer"}
                  tone={client.started ? "green" : "amber"}
                />
                <StatusBadge
                  label={client.objective === "sport" ? "Sport" : "Perte de poids"}
                  tone={client.objective === "sport" ? "green" : "blue"}
                />
              </div>
              <p className="mt-1 text-sm text-[#7A8099]">
                {client.currentProgram || "Programme à confirmer"} · {client.city ?? "Ville non renseignée"} · <Link to={`/distributors/${client.distributorId}`} className="font-medium text-[#C9A84C] transition hover:text-[#2DD4BF]">{client.distributorName}</Link>
              </p>
              <p className="mt-1 text-[11px] text-[#4A5068]">
                Client depuis {formatDate(client.startDate ?? '')} · {client.assessments.length} bilan{client.assessments.length > 1 ? 's' : ''}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              to={`/clients/${client.id}/follow-up/new`}
              className="inline-flex min-h-[40px] items-center gap-2 rounded-[12px] border border-white/[0.1] bg-white/[0.04] px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/[0.08]"
            >
              📋 Suivi
            </Link>
            <Link
              to="/assessments/new"
              className="inline-flex min-h-[40px] items-center gap-2 rounded-[12px] bg-[#C9A84C] px-4 py-2 text-sm font-bold text-[#0B0D11] transition hover:brightness-105"
            >
              + Bilan
            </Link>
          </div>
        </div>

        {/* Recommandations actives */}
        {recommendationCount > 0 && (
          <div className="mt-4 flex items-center gap-3 rounded-[14px] border border-white/[0.06] bg-white/[0.02] px-4 py-3">
            <span style={{ fontSize: 11, color: '#C9A84C', letterSpacing: '1px', textTransform: 'uppercase', fontWeight: 600 }}>Recommandations</span>
            <StatusBadge
              label={recommendationsContacted ? `${recommendationCount} contactées` : `${recommendationCount} à contacter`}
              tone={recommendationsContacted ? "green" : "amber"}
            />
            {retainedProducts.length > 0 && (
              <div className="flex flex-wrap gap-1 ml-2">
                {retainedProducts.slice(0, 3).map((p, idx) => (
                  <span key={idx} className="rounded-full bg-[rgba(201,168,76,0.08)] px-2.5 py-0.5 text-[10px] text-[#C9A84C]">{'name' in p ? (p as { name: string }).name : String(idx + 1)}</span>
                ))}
                {retainedProducts.length > 3 && <span className="text-[10px] text-[#4A5068]">+{retainedProducts.length - 3}</span>}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 rounded-[14px] border border-white/[0.07] bg-[#13161C] p-1" style={{ width: 'fit-content' }}>
        {[
          { label: 'Vue complète', icon: '📊' },
          { label: 'Body Scan', icon: '⚖️', count: client.assessments.filter(a => a.bodyScan?.weight).length },
          { label: 'Historique', icon: '📋', count: client.assessments.length },
          { label: 'Actions', icon: '⚡' },
        ].map((tab, i) => (
          <button
            key={tab.label}
            onClick={() => setActiveTab(i)}
            className="transition-all duration-150"
            style={{
              padding: '7px 14px', borderRadius: 10, border: 'none', cursor: 'pointer',
              fontSize: 13, fontFamily: 'DM Sans, sans-serif', fontWeight: activeTab === i ? 500 : 400,
              background: activeTab === i ? '#1A1E27' : 'transparent',
              color: activeTab === i ? '#F0EDE8' : '#7A8099',
              display: 'flex', alignItems: 'center', gap: 6,
            }}
          >
            <span style={{ fontSize: 13 }}>{tab.icon}</span> {tab.label}
            {tab.count !== undefined && tab.count > 0 && (
              <span style={{
                fontSize: 10, padding: '1px 6px', borderRadius: 10,
                background: activeTab === i ? 'rgba(201,168,76,0.2)' : 'rgba(255,255,255,0.06)',
                color: activeTab === i ? '#C9A84C' : '#4A5068'
              }}>{tab.count}</span>
            )}
          </button>
        ))}
      </div>

      {/* Tab 0: Vue complète (original layout) */}
      {activeTab === 0 && (
      <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <Card className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm text-[#7A8099]">
                {client.job} - {client.city ?? "Ville non renseignee"} -{" "}
                <Link
                  to={`/distributors/${client.distributorId}`}
                  className="font-medium text-[#C9A84C] transition hover:text-[#2DD4BF]"
                >
                  {client.distributorName}
                </Link>
              </p>
              <p className="mt-2 text-4xl">
                {client.firstName} {client.lastName}
              </p>
              <p className="mt-2 text-sm text-[#7A8099]">
                Programme en cours : {client.currentProgram || "Programme a confirmer"}
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-end gap-3">
              <Link
                to={`/clients/${client.id}/follow-up/new`}
                className="inline-flex items-center gap-3 rounded-[22px] bg-[rgba(45,212,191,0.12)] px-4 py-3 text-sm font-semibold text-[#2DD4BF] transition hover:bg-[rgba(45,212,191,0.18)]"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[rgba(45,212,191,0.18)] text-[#2DD4BF]">
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
                  <span className="block text-[11px] font-medium text-[#2DD4BF]/70">
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

          <div className="grid grid-cols-2 gap-3 md:gap-4 xl:grid-cols-4">
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

          <div className="space-y-4 rounded-[26px] bg-[#1A1E27] p-5">
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
              <button
                type="button"
                onClick={() => setShowScheduleModal(true)}
                className="w-full rounded-[22px] bg-white/[0.03] p-4 text-left transition hover:bg-white/[0.05]"
              >
                <p className="text-sm font-semibold text-white">Modifier le prochain rendez-vous</p>
                <p className="mt-1 text-sm leading-6 text-[#7A8099]">Ajuster la date, l'heure ou le type de suivi</p>
              </button>
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
                  <label className="text-sm font-medium text-[#B0B4C4]">
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
                <p className="text-sm leading-6 text-[#7A8099]">
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
              <Link to="/assessments/new" className="text-sm font-semibold text-[#C9A84C]">
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
                    <p className="mt-1 text-sm leading-6 text-[#7A8099]">{entry.detail}</p>
                  ) : null}
                  <p className="mt-3 text-xs text-[#4A5068]">
                    {entry.actorName} - {formatDateTime(entry.createdAt)}
                  </p>
                </div>
              ))}
              {!clientActivity.length ? (
                <div className="rounded-[20px] bg-white/[0.03] px-4 py-4 text-sm text-[#7A8099]">
                  Les changements de responsable, de rendez-vous et de bilans apparaitront ici.
                </div>
              ) : null}
            </div>
          </Card>
        </div>
      </div>
      )}

      {/* Tab 1: Body Scan dédié */}
      {activeTab === 1 && (
        <Card className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="eyebrow-label">Body Scan</p>
              <h2 className="mt-2 text-xl font-bold text-white" style={{ fontFamily: 'Syne, sans-serif' }}>
                Évolution corporelle
              </h2>
            </div>
            <Link
              to={`/clients/${client.id}/follow-up/new`}
              className="inline-flex min-h-[40px] items-center gap-2 rounded-[12px] bg-[#C9A84C] px-4 py-2 text-sm font-bold text-[#0B0D11]"
            >
              + Nouveau scan
            </Link>
          </div>

          {/* Dernier scan en grand */}
          {latestBodyScan && (
            <>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {[
                  { label: 'Poids', value: latestBodyScan.weight ? `${latestBodyScan.weight} kg` : '—', color: '#C9A84C' },
                  { label: 'Masse grasse', value: latestBodyScan.bodyFat ? `${latestBodyScan.bodyFat}%` : '—', color: '#FB7185' },
                  { label: 'Masse musc.', value: latestBodyScan.muscleMass ? `${latestBodyScan.muscleMass} kg` : '—', color: '#2DD4BF' },
                  { label: 'Hydratation', value: latestBodyScan.hydration ? `${latestBodyScan.hydration}%` : '—', color: '#A78BFA' },
                ].map(m => (
                  <div key={m.label} className="rounded-[16px] bg-[#1A1E27] p-4 text-center" style={{ borderTop: `2px solid ${m.color}` }}>
                    <div style={{ fontSize: 28, fontFamily: 'Syne, sans-serif', fontWeight: 800, color: m.color, lineHeight: 1 }}>{m.value}</div>
                    <div className="mt-2 text-[11px] text-[#4A5068]">{m.label}</div>
                  </div>
                ))}
              </div>

              {/* Métabolisme + viscéral */}
              <div className="grid gap-3 sm:grid-cols-3">
                {[
                  { label: 'Graisse viscérale', value: latestBodyScan.visceralFat ?? '—', color: '#C9A84C' },
                  { label: 'Âge métabolique', value: latestBodyScan.metabolicAge ? `${latestBodyScan.metabolicAge} ans` : '—', color: '#A78BFA' },
                  { label: 'BMR', value: latestBodyScan.bmr ? `${latestBodyScan.bmr} kcal` : '—', color: '#F0C96A' },
                ].map(m => (
                  <div key={m.label} className="rounded-[14px] bg-[#1A1E27] p-3 text-center">
                    <div style={{ fontSize: 20, fontFamily: 'Syne, sans-serif', fontWeight: 700, color: m.color as string }}>{m.value}</div>
                    <div className="mt-1 text-[10px] text-[#4A5068]">{m.label}</div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Graphique évolution */}
          {client.assessments.length > 0 && (
            <EvolutionChart assessments={client.assessments} />
          )}

          {/* Note: Insight cards détaillés visibles dans l'onglet "Vue complète" */}

          {/* Historique scans tableau */}
          {client.assessments.length > 1 && (
            <div>
              <p className="eyebrow-label mb-3">Historique des mesures</p>
              <div className="rounded-[14px] border border-white/[0.07] overflow-hidden">
                {client.assessments.filter(a => a.bodyScan?.weight).map((a, i) => {
                  const scan = a.bodyScan;
                  return (
                    <div key={a.id ?? i} className="list-row flex items-center justify-between gap-3 px-4 py-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      <span className="text-sm text-[#7A8099]">{formatDate(a.date)}</span>
                      {scan?.weight && <span className="text-sm font-semibold text-[#C9A84C]">{scan.weight} kg</span>}
                      {scan?.bodyFat && <span className="text-sm text-[#FB7185]">MG {scan.bodyFat}%</span>}
                      {scan?.muscleMass && <span className="text-sm text-[#2DD4BF]">MM {scan.muscleMass} kg</span>}
                      {scan?.hydration && <span className="text-sm text-[#A78BFA]">{scan.hydration}%</span>}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {!latestBodyScan && (
            <div className="rounded-[20px] bg-white/[0.03] px-6 py-10 text-center">
              <div style={{ fontSize: 32, marginBottom: 12 }}>⚖️</div>
              <p className="text-sm text-[#7A8099]">Aucun body scan enregistré</p>
              <Link
                to={`/clients/${client.id}/follow-up/new`}
                className="mt-4 inline-flex min-h-[40px] items-center gap-2 rounded-[12px] bg-[#C9A84C] px-4 py-2 text-sm font-bold text-[#0B0D11]"
              >
                Démarrer un body scan
              </Link>
            </div>
          )}
        </Card>
      )}

      {/* Tab 2: Historique bilans */}
      {activeTab === 2 && (
        <Card className="space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="eyebrow-label">Historique</p>
              <h2 className="mt-2 text-xl font-bold text-white" style={{ fontFamily: 'Syne, sans-serif' }}>
                Bilans & suivis
              </h2>
            </div>
            <Link
              to="/assessments/new"
              className="inline-flex min-h-[40px] items-center gap-2 rounded-[12px] bg-[#C9A84C] px-4 py-2 text-sm font-bold text-[#0B0D11]"
            >
              + Nouveau bilan
            </Link>
          </div>

          <HistoryTimeline
            entries={[...client.assessments]
              .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
              .map((assessment) => ({
                id: assessment.id ?? assessment.date,
                date: assessment.date,
                summary: assessment.summary,
                weight: assessment.bodyScan?.weight,
                hydration: assessment.bodyScan?.hydration,
                editTo: assessment.type === "initial"
                  ? `/clients/${client.id}/start-assessment/edit`
                  : `/clients/${client.id}/assessments/${assessment.id}/edit`,
                typeLabel: assessment.type === "initial" ? "Départ" : "Suivi",
              }))}
          />
        </Card>
      )}

      {/* Tab 3: Actions rapides */}
      {activeTab === 3 && (
        <div className="grid gap-4 md:grid-cols-2">
          <Card className="space-y-4">
            <p className="eyebrow-label">Actions client</p>
            <h2 className="text-lg font-bold text-white" style={{ fontFamily: 'Syne, sans-serif' }}>Raccourcis</h2>
            <div className="space-y-3">
              <LinkButton to={`/clients/${client.id}/follow-up/new`} label="Nouveau suivi" hint="Relire, mesurer et poser la suite" />
              <LinkButton to={`/clients/${client.id}/start-assessment/edit`} label="Modifier le bilan de départ" hint="Corriger la date et les valeurs de référence" />
              {latestAssessment && latestAssessment.id ? (
                <LinkButton to={`/clients/${client.id}/assessments/${latestAssessment.id}/edit`} label="Modifier le dernier bilan" hint="Compléter une section oubliée ou corriger les valeurs" />
              ) : null}
              <button type="button" onClick={() => setShowScheduleModal(true)} className="w-full rounded-[22px] bg-white/[0.03] p-4 text-left transition hover:bg-white/[0.05]">
                <p className="text-sm font-semibold text-white">Modifier le prochain rendez-vous</p>
                <p className="mt-1 text-sm leading-6 text-[#7A8099]">Ajuster la date, l'heure ou le type de suivi</p>
              </button>
              <LinkButton
                to={`/pv/clients?responsable=${encodeURIComponent(client.distributorId)}&client=${encodeURIComponent(client.id)}`}
                label="Ouvrir la fiche point volume"
                hint="Visualiser les commandes et le suivi produits"
              />
            </div>
          </Card>

          <Card className="space-y-4">
            <p className="eyebrow-label">Fiche rapide</p>
            <h2 className="text-lg font-bold text-white" style={{ fontFamily: 'Syne, sans-serif' }}>Infos clés</h2>
            <div className="space-y-2">
              <SummaryRow label="Objectif" value={latestQuestionnaire?.objectiveFocus ?? client.objective ?? "Non défini"} />
              <SummaryRow label="Programme" value={client.currentProgram || "À confirmer"} />
              <SummaryRow label="Prochain RDV" value={activeFollowUp ? formatDateTime(activeFollowUp.dueDate) : "Non planifié"} />
              {waterNeed && <SummaryRow label="Eau recommandée" value={`${waterNeed.toFixed(1)}L / jour`} />}
              {proteinRange && <SummaryRow label="Protéines" value={`${proteinRange[0]}–${proteinRange[1]}g / repas`} />}
            </div>
            {canReassignClient && (
              <div className="mt-4 rounded-[18px] border border-white/[0.06] bg-white/[0.02] p-4">
                <p className="text-[11px] text-[#4A5068] uppercase tracking-wider mb-3">Transférer le dossier</p>
                <select value={nextOwnerId} onChange={(e) => setNextOwnerId(e.target.value)} className="mb-3">
                  {assignableOwners.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                </select>
                <Button className="w-full" onClick={() => void handleTransferClient()} disabled={nextOwnerId === client.distributorId}>
                  Transférer
                </Button>
                {transferFeedback && <p className="mt-2 text-sm text-[#2DD4BF]">{transferFeedback}</p>}
              </div>
            )}
          </Card>
        </div>
      )}

      {/* Schedule Modal */}
      {showScheduleModal && (
        <EditScheduleModal
          client={currentClient}
          onClose={() => setShowScheduleModal(false)}
          onSaved={() => setShowScheduleModal(false)}
        />
      )}
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-[22px] bg-white/[0.03] px-4 py-3">
      <span className="text-sm text-[#7A8099]">{label}</span>
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
      <span className="text-sm text-[#7A8099]">{label}</span>
      <div className="flex items-center gap-3">
        <span className="text-sm text-[#7A8099]">{detail}</span>
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
      className="flex items-center justify-between gap-3 rounded-[22px] bg-[rgba(201,168,76,0.08)] px-4 py-3 transition hover:bg-[rgba(45,212,191,0.14)]"
    >
      <span className="text-sm text-[#B0B4C4]">{label}</span>
      <span className="text-right text-sm font-semibold text-white">{value}</span>
    </Link>
  );
}

function QuickInfo({ text }: { text: string }) {
  return (
    <div className="rounded-[20px] bg-[#0B0D11]/60 px-4 py-3 text-sm leading-6 text-[#F0EDE8]">
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
    <div className="rounded-[20px] bg-[#0B0D11]/60 px-4 py-3.5">
      <p className="text-[11px] font-medium text-[#4A5068]">{label}</p>
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
      ? "text-[#F0EDE8]"
      : objective === "weight-loss"
        ? weightDelta < 0
          ? "text-[#2DD4BF]"
          : "text-amber-200"
        : weightDelta > 0
          ? "text-[#2DD4BF]"
          : "text-amber-200";

  return (
    <div className="rounded-[28px] bg-[linear-gradient(180deg,rgba(15,23,42,0.28),rgba(15,23,42,0.52))] p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="eyebrow-label">Repère de départ</p>
          <p className="mt-3 text-2xl text-white">Départ vs aujourd'hui</p>
          <p className="mt-2 text-sm leading-6 text-[#B0B4C4]">
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
      ? "bg-[rgba(45,212,191,0.07)] ring-1 ring-[rgba(45,212,191,0.12)]"
      : tone === "blue"
        ? "bg-[rgba(201,168,76,0.07)] ring-1 ring-[rgba(201,168,76,0.12)]"
        : "bg-[#0B0D11]/80 ring-1 ring-white/6";

  return (
    <div
      className={`rounded-[24px] p-4 ${toneClass} ${
        highlighted ? "shadow-[0_0_30px_rgba(52,211,153,0.08)]" : ""
      }`}
    >
      <p className="text-[11px] font-medium text-[#4A5068]">{label}</p>
      <p className="mt-3 text-2xl text-white">{value}</p>
      <p className="mt-2 text-sm text-[#7A8099]">{note}</p>
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
          ? "bg-[rgba(45,212,191,0.1)] hover:bg-[rgba(45,212,191,0.15)]"
          : "bg-[rgba(45,212,191,0.1)] hover:bg-[rgba(201,168,76,0.15)]"
      }`}
    >
      <span className="block text-sm font-medium text-white">{label}</span>
      <span className="mt-1 block text-sm text-[#F0EDE8]/85">{hint}</span>
    </Link>
  );
}
