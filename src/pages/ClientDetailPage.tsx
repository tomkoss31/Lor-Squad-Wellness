import { useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { EditScheduleModal } from "../components/client/EditScheduleModal";
import { WeightSummaryBlock } from "../components/client/WeightSummaryBlock";
import { BodyCompositionGauges } from "../components/client/BodyCompositionGauges";
import { OnboardingChecksBlock } from "../components/client/OnboardingChecksBlock";
import { CoachNotesBlock } from "../components/client/CoachNotesBlock";
import { NextAppointmentBanner } from "../components/client/NextAppointmentBanner";
import { MeasurementsPanel } from "../features/measurements/MeasurementsPanel";
import { BodyFatInsightCard } from "../components/body-scan/BodyFatInsightCard";
import { MuscleMassInsightCard } from "../components/body-scan/MuscleMassInsightCard";
import { HydrationVisceralInsightCard } from "../components/body-scan/HydrationVisceralInsightCard";
import { BodyScanRadar } from "../components/body-scan/BodyScanRadar";
import { HistoryTimeline } from "../components/client/HistoryTimeline";
import { Card } from "../components/ui/Card";
import { StatusBadge } from "../components/ui/StatusBadge";
import { useAppContext } from "../context/AppContext";
import { useToast, buildSupabaseErrorToast } from "../context/ToastContext";
import { refreshClientRecap } from "../services/supabaseService";
import { ErrorBoundary } from "../components/ErrorBoundary";
import { ClientAccessModal } from "../components/client/ClientAccessModal";
import { ActionsTab } from "../components/client-detail/ActionsTab";
import { SportSummarySection } from "../components/client-detail/SportSummarySection";
import { ClientAppPreviewButton } from "../components/client/ClientAppPreviewButton";
import { SharePublicButton } from "../components/client/SharePublicButton";
import { buildReportData, generateProductRecommendations } from "../lib/evolutionReport";
import { EvolutionReportModal } from "../components/assessment/EvolutionReportModal";
import { getSupabaseClient } from "../services/supabaseClient";
import { pvProductCatalog } from "../data/pvCatalog";
import { getAccessibleOwnerIds, isAdmin, isRéférent } from "../lib/auth";
import { getClientActiveFollowUp } from "../lib/portfolio";
import {
  formatDate,
  getClientEffectiveStartDate,
  getFirstAssessment,
  getLatestAssessment,
  getLatestBodyScan,
  getLatestQuestionnaire,
  getPreviousAssessment,
  isClientProgramStarted,
} from "../lib/calculations";
import type { LifecycleStatus } from "../types/domain";
import { LIFECYCLE_LABELS, LIFECYCLE_TONES } from "../types/domain";

export function ClientDetailPage() {
  const navigate = useNavigate();
  const { clientId } = useParams();
  const {
    currentUser,
    getClientById,
    followUps,
  } = useAppContext();
  const { push: pushToast } = useToast();

  const client = clientId ? getClientById(clientId) : undefined;

  // Hooks AVANT tout early return (rules-of-hooks / chantier nuit 2026-04-20).
  // `client` peut être undefined pendant le boot ou si l'id n'est pas visible.
  // On utilise optional chaining partout et le return `<Card>` est placé
  // APRÈS tous les hooks.
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  // Chantier Protocole Agenda+Dashboard (2026-04-20) : ?tab=actions pour
  // arriver directement sur l'onglet Actions depuis le widget dashboard.
  const [searchParams] = useSearchParams();
  const initialTabFromQuery = searchParams.get("tab") === "actions" ? 5 : 0;
  const [activeTab, setActiveTab] = useState(initialTabFromQuery);
  const [reportUrl, setReportUrl] = useState<string | null>(null);
  const [generatingReport, setGeneratingReport] = useState(false);
  // Chantier Client access unification (2026-04-24)
  // Academy polish (2026-04-27) : auto-open via ?openAccessModal=true
  // pour permettre au tour Academy de pointer le QR + share buttons.
  const [accessModalOpen, setAccessModalOpen] = useState(() => {
    if (typeof window === "undefined") return false;
    return new URLSearchParams(window.location.search).get("openAccessModal") === "true";
  });
  // Refonte Actions Tab (2026-04-26) : les states editPhone/editEmail/
  // editCity/transferFeedback/nextOwnerId et les handlers handleDelete/
  // handleTransfer sont désormais internes à ActionsTab.tsx.
  const activeFollowUp = client ? getClientActiveFollowUp(client, followUps) : null;

  async function generateReport() {
    if (!client || !currentUser) return;
    setGeneratingReport(true);
    try {
      // Fix target weight (2026-04-20) : buildReportData lit
      // latest.questionnaire?.targetWeight avec fallback arbitraire
      // (firstScan.weight - 10). Si l'initial a été édité après la création
      // du dernier follow-up, le targetWeight vit sur l'initial mais pas
      // sur le latest → rapport incohérent. On clone le client et on
      // recopie targetWeight depuis l'initial vers le questionnaire du
      // latest avant d'appeler buildReportData. Aucune mutation du state
      // React ni de la DB.
      const initialAssessment =
        client.assessments.find((a) => a.type === "initial") ??
        [...client.assessments].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0];
      const initialTargetWeight = initialAssessment?.questionnaire?.targetWeight;
      const latestByDate = [...client.assessments].sort(
        (x, y) => new Date(y.date).getTime() - new Date(x.date).getTime()
      )[0];
      const patchedClient =
        initialTargetWeight && latestByDate && !latestByDate.questionnaire?.targetWeight
          ? {
              ...client,
              assessments: client.assessments.map((a) =>
                a.id === latestByDate.id
                  ? { ...a, questionnaire: { ...a.questionnaire, targetWeight: initialTargetWeight } }
                  : a
              ),
            }
          : client;
      const data = buildReportData(patchedClient, currentUser.name ?? 'Coach');
      if (!data) return;
      const sb = await getSupabaseClient();
      if (!sb) return;
      // Supprimer l'ancien rapport si existant
      await sb.from('client_evolution_reports').delete().eq('client_id', client.id);
      // Insérer le nouveau
      const { data: inserted, error } = await sb
        .from('client_evolution_reports')
        .insert(data)
        .select('token')
        .single();
      if (!error && inserted) {
        setReportUrl(`${window.location.origin}/rapport/${inserted.token}`);
      }
    } finally {
      setGeneratingReport(false);
    }
  }
  // canReassignClient et assignableOwners sont désormais utilisés
  // uniquement par ActionsTab qui les calcule en interne.
  void isAdmin; void isRéférent; void getAccessibleOwnerIds;

  // Fix UX (2026-04-20) : l'ancien useEffect qui pré-chargeait un
  // existingClientToken depuis client_recaps/client_evolution_reports/
  // client_app_accounts n'est plus utile — le bouton "App client" header
  // et l'onglet "Rapport" appellent désormais generateReport() qui crée
  // un snapshot frais à la volée, ce qui évite les liens périmés.

  // Early return APRÈS tous les hooks (rules-of-hooks / chantier nuit 2026-04-20).
  if (!client) {
    return (
      <Card>
        <p className="text-lg text-white">Client introuvable ou accès indisponible.</p>
      </Card>
    );
  }
  const currentClient = client;
  void currentClient;

  const latestAssessment = getLatestAssessment(client);
  void latestAssessment;
  const previousAssessment = getPreviousAssessment(client);
  // Fix P3a (2026-04-20) : on préfère le bilan type === "initial", pas juste
  // le plus ancien par date. Aligne la fiche sur EditInitialAssessmentPage
  // (qui édite le même bilan). Sans ça, éditer le "Poids de départ" n'était
  // pas reflété sur la fiche si un follow-up avait une date antérieure.
  const firstAssessment =
    client.assessments.find((entry) => entry.type === "initial") ?? getFirstAssessment(client);
  const latestBodyScan = getLatestBodyScan(client);
  const latestQuestionnaire = getLatestQuestionnaire(client);
  // Fix target weight (2026-04-20) : le poids cible est saisi sur le bilan
  // INITIAL (via "Modifier la fiche de départ"). Si les follow-ups ont été
  // créés AVANT cette saisie, leur questionnaire n'a pas targetWeight et
  // `latestQuestionnaire.targetWeight` renvoie undefined → "Cible à définir"
  // sur la fiche alors que Thomas l'a bien saisi. On lit en priorité depuis
  // l'initial, fallback sur le latest pour les vieux dossiers sans initial.
  const resolvedTargetWeight =
    firstAssessment.questionnaire?.targetWeight ??
    latestQuestionnaire.targetWeight;
  const recommendationCount = latestQuestionnaire.recommendations?.length ?? 0;
  const recommendationsContacted = latestQuestionnaire.recommendationsContacted ?? false;
  // Durcissement (2026-04-20 — crash Mélanie Jessie) : certains vieux dossiers
  // importés ont `questionnaire = null` en DB. ensureAssessment ne wrap pas
  // ce champ, donc `firstAssessment.questionnaire.selectedProductIds?.length`
  // pouvait throw "Cannot read properties of null". Optional chaining partout
  // + coalesce vers [] + fallback sur pv/price 0 pour les produits orphelins.
  const retainedProductIds = (
    firstAssessment.questionnaire?.selectedProductIds?.length
      ? firstAssessment.questionnaire.selectedProductIds
      : latestQuestionnaire?.selectedProductIds ?? []
  ).filter((productId, index, array) => array.indexOf(productId) === index);
  const retainedProducts = retainedProductIds
    .map((productId) => pvProductCatalog.find((product) => product.id === productId) ?? null)
    .filter((product): product is NonNullable<typeof product> => product != null);
  void retainedProducts;

  // handleDeleteClient + handleTransferClient déplacés dans ActionsTab.tsx
  // (Chantier Refonte Actions premium 2026-04-26).

  return (
    <div className="space-y-6">
      {/* Hero header client */}
      <div className="glass-panel rounded-[24px] p-5 sm:p-6" style={{ position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: -40, right: -40, width: 180, height: 180, borderRadius: '50%', background: 'rgba(201,168,76,0.06)', pointerEvents: 'none' }} />
        <div className="flex flex-wrap items-center justify-between gap-4" style={{ position: 'relative' }}>
          <div className="flex items-center gap-4">
            <div style={{
              width: 56, height: 56, borderRadius: '50%', flexShrink: 0,
              background: 'var(--ls-gold-bg)', color: '#C9A84C',
              border: '2px solid rgba(201,168,76,0.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: 'Syne, sans-serif', fontSize: 20, fontWeight: 700
            }}>
              {client.firstName?.[0] ?? "?"}{client.lastName?.[0] ?? ""}
            </div>
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h1 style={{ fontFamily: 'Syne, sans-serif', fontSize: 22, fontWeight: 800, color: 'var(--ls-text)', margin: 0 }}>
                  {client.firstName} {client.lastName}
                </h1>
                <LifecycleBadge status={client.lifecycleStatus ?? (isClientProgramStarted(client) ? "active" : "not_started")} />
                {client.isFragile && <FragileBadge />}
                {client.freeFollowUp && <FreeFollowUpBadge />}
                <StatusBadge
                  label={client.objective === "sport" ? "Sport" : "Perte de poids"}
                  tone={client.objective === "sport" ? "green" : "blue"}
                />
              </div>
              <p className="mt-1 text-sm text-[var(--ls-text-muted)]">
                {client.currentProgram || "Programme à confirmer"} · {client.city ?? "Ville non renseignée"} · <Link to={`/distributors/${client.distributorId}`} className="font-medium text-[#C9A84C] transition hover:text-[#2DD4BF]">{client.distributorName}</Link>
              </p>
              <p className="mt-1 text-[11px] text-[var(--ls-text-hint)]">
                {(() => {
                  // Fix bug #3 (2026-04-27) : utiliser getClientEffectiveStartDate
                  // pour fallback sur la date du bilan initial si startDate est null.
                  // Évite "Programme non démarré" alors que le bilan a été fait.
                  const effectiveStart = getClientEffectiveStartDate(client);
                  return effectiveStart
                    ? `Client depuis ${formatDate(effectiveStart)}`
                    : "Programme non démarré";
                })()} · {client.assessments.length} bilan{client.assessments.length > 1 ? 's' : ''}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {/* Chantier Client access unification (2026-04-24) :
                bouton principal gold "Envoyer l'accès" (ouvre la modale
                unifiée QR+WA+Copier+SMS) + bouton discret "Aperçu app"
                (icône œil, nouvel onglet). Remplace l'ancien bouton
                "📱 App client" qui passait par generateReport(). */}
            <button
              type="button"
              onClick={() => setAccessModalOpen(true)}
              data-tour-id="client-send-access"
              className="inline-flex min-h-[40px] items-center gap-2 rounded-[12px] px-4 py-2 text-sm font-semibold text-white transition"
              style={{
                background: 'linear-gradient(135deg, #EF9F27 0%, #BA7517 100%)',
                boxShadow: '0 2px 6px rgba(186,117,23,0.25)',
                fontFamily: 'DM Sans, sans-serif',
              }}
            >
              🔗 Envoyer l'accès à l'app
            </button>
            <ClientAppPreviewButton
              clientId={client.id}
              clientFirstName={client.firstName}
              clientLastName={client.lastName}
              coachName={currentUser?.name ?? "Coach"}
            />
            <SharePublicButton
              clientId={client.id}
              clientFirstName={client.firstName}
              publicShareConsent={client.publicShareConsent ?? false}
              publicShareRevokedAt={client.publicShareRevokedAt}
            />
            <Link
              to={`/clients/${client.id}/follow-up/new`}
              className="inline-flex min-h-[40px] items-center gap-2 rounded-[12px] border border-[var(--ls-border2)] bg-[var(--ls-surface2)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/[0.08]"
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
          <div className="mt-4 flex items-center gap-3 rounded-[14px] border border-[var(--ls-border)] bg-white/[0.02] px-4 py-3">
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
                {retainedProducts.length > 3 && <span className="text-[10px] text-[var(--ls-text-hint)]">+{retainedProducts.length - 3}</span>}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Tab bar + bandeau Prochain RDV (Chantier V3 2026-04-24) */}
      <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="client-tabs flex gap-1 rounded-[14px] border border-[var(--ls-border)] bg-[var(--ls-surface)] p-1" style={{ width: 'fit-content', maxWidth: '100%' }}>
        {[
          { label: 'Vue complète', icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg> },
          { label: 'Body Scan', icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>, count: client.assessments.filter(a => a.bodyScan?.weight).length },
          { label: 'Mensurations', icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M4 4h16v6H4z"/><path d="M4 10v10h16V10"/><path d="M8 10v3M12 10v5M16 10v3"/></svg> },
          { label: 'Historique', icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>, count: client.assessments.length },
          { label: 'Produits', icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>, count: retainedProducts.length },
          { label: 'Actions', icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><polyline points="13 2 13 9 20 9"/><polyline points="11 22 11 15 4 15"/><path d="M3 3l18 18"/></svg> },
        ].map((tab, i) => (
          <button
            key={tab.label}
            onClick={() => setActiveTab(i)}
            className="client-tab transition-all duration-150"
            style={{
              padding: '7px 14px', borderRadius: 8, border: 'none', cursor: 'pointer',
              fontSize: 13, fontFamily: 'DM Sans, sans-serif', fontWeight: activeTab === i ? 500 : 400,
              background: activeTab === i ? 'var(--ls-surface2)' : 'transparent',
              color: activeTab === i ? 'var(--ls-text)' : 'var(--ls-text-muted)',
              display: 'flex', alignItems: 'center', gap: 6,
            }}
          >
            {tab.icon} {tab.label}
            {tab.count !== undefined && tab.count > 0 && (
              <span style={{
                fontSize: 10, padding: '1px 6px', borderRadius: 10,
                background: activeTab === i ? 'rgba(201,168,76,0.2)' : 'var(--ls-border)',
                color: activeTab === i ? '#C9A84C' : 'var(--ls-text-hint)'
              }}>{tab.count}</span>
            )}
          </button>
        ))}
        {/* Bouton rapport inline avec les onglets */}
        {(client.assessments?.length ?? 0) >= 2 && (
          <button onClick={() => void generateReport()} disabled={generatingReport}
            className="client-tab transition-all duration-150"
            style={{
              padding: '7px 14px', borderRadius: 8, border: 'none', cursor: generatingReport ? 'wait' : 'pointer',
              fontSize: 13, fontFamily: 'DM Sans, sans-serif', fontWeight: 400,
              background: 'transparent', color: 'var(--ls-gold)',
              display: 'flex', alignItems: 'center', gap: 6, marginLeft: 4,
            }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
            {generatingReport ? 'Génération...' : 'Rapport'}
          </button>
        )}
      </div>

      {/* Bandeau Prochain RDV (V3) */}
      <NextAppointmentBanner
        nextAppointmentDate={activeFollowUp?.dueDate ?? null}
        onPlan={() => setActiveTab(5)}
        onViewDetails={() => setActiveTab(5)}
      />
      </div>

      {reportUrl && (
        <EvolutionReportModal
          reportUrl={reportUrl}
          clientName={`${client.firstName} ${client.lastName}`}
          onClose={() => setReportUrl(null)}
        />
      )}

      {/* Tab 0: Vue complète — cockpit light */}
      {activeTab === 0 && (
        <Card className="space-y-6">
          {/* Chantier Polish Vue complète (2026-04-24) : résumé perte/graisse/muscle
              en haut, au-dessus des 4 MetricTiles. */}
          <WeightSummaryBlock
            client={client}
            firstWeight={firstAssessment.bodyScan?.weight ?? null}
            latestWeight={latestBodyScan.weight ?? null}
            firstBodyFatPct={firstAssessment.bodyScan?.bodyFat ?? null}
            latestBodyFatPct={latestBodyScan.bodyFat ?? null}
            firstMuscleMass={firstAssessment.bodyScan?.muscleMass ?? null}
            latestMuscleMass={latestBodyScan.muscleMass ?? null}
            targetWeight={resolvedTargetWeight ?? null}
          />

          <NouveauBilanCTA onClick={() => navigate(`/clients/${client.id}/follow-up/new`)} />

          {/* Chantier Polish Vue complète (2026-04-24) : 3 checks onboarding
              coach (Telegram, photo avant, mensurations) juste sous le CTA
              body scan. Modifiables via modale. */}
          <OnboardingChecksBlock clientId={client.id} checks={client.onboardingChecks} />

          {/* Chantier V3 (2026-04-24) : 4 MetricTiles Poids départ/jour/
              cible/RDV supprimées — fusion dans le WeightSummaryBlock en
              haut et NextAppointmentBanner à côté des onglets. */}

          {/* Chantier Polish Vue complète (2026-04-24) : remplace le
              BodyScanSnapshotCard (chiffres bruts) par 3 jauges combinées
              avec zones de santé, marqueurs départ/actuel/cible et message
              contextuel selon progression. */}
          <BodyCompositionGauges
            sex={client.sex}
            currentBodyFat={latestBodyScan.bodyFat ?? null}
            initialBodyFat={firstAssessment.bodyScan?.bodyFat ?? null}
            currentMuscleMass={latestBodyScan.muscleMass ?? null}
            initialMuscleMass={firstAssessment.bodyScan?.muscleMass ?? null}
            currentHydration={latestBodyScan.hydration ?? null}
            initialHydration={firstAssessment.bodyScan?.hydration ?? null}
          />

          {/* Chantier Polish Vue complète (2026-04-24) : notes coach vivantes
              + bilan initial archivé. Stockage client_notes (typées). */}
          <CoachNotesBlock
            clientId={client.id}
            clientName={`${client.firstName} ${client.lastName}`}
            initialAssessmentNotes={firstAssessment.coachNotesInitial ?? firstAssessment.notes ?? null}
            initialAssessmentDate={firstAssessment.date ?? null}
          />
        </Card>
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
                  <div key={m.label} className="rounded-[16px] bg-[var(--ls-surface2)] p-4 text-center" style={{ borderTop: `2px solid ${m.color}` }}>
                    <div style={{ fontSize: 28, fontFamily: 'Syne, sans-serif', fontWeight: 800, color: m.color, lineHeight: 1 }}>{m.value}</div>
                    <div className="mt-2 text-[11px] text-[var(--ls-text-hint)]">{m.label}</div>
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
                  <div key={m.label} className="rounded-[14px] bg-[var(--ls-surface2)] p-3 text-center">
                    <div style={{ fontSize: 20, fontFamily: 'Syne, sans-serif', fontWeight: 700, color: m.color as string }}>{m.value}</div>
                    <div className="mt-1 text-[10px] text-[var(--ls-text-hint)]">{m.label}</div>
                  </div>
                ))}
              </div>

              {/* Radar 5 branches */}
              <div className="flex items-center justify-center rounded-[16px] bg-[var(--ls-surface2)] p-6">
                <BodyScanRadar
                  size={220}
                  metrics={[
                    { label: 'Poids', value: latestBodyScan.weight ?? 0, max: 120, color: '#C9A84C' },
                    { label: 'M. grasse', value: latestBodyScan.bodyFat ?? 0, max: 50, color: '#FB7185' },
                    { label: 'Muscle', value: latestBodyScan.muscleMass ?? 0, max: 80, color: '#2DD4BF' },
                    { label: 'Hydrat.', value: latestBodyScan.hydration ?? 0, max: 100, color: '#A78BFA' },
                    { label: 'Viscéral', value: latestBodyScan.visceralFat ?? 0, max: 20, color: '#C9A84C' },
                  ]}
                />
              </div>
            </>
          )}

          {/* Lectures détaillées — insights corporels */}
          {latestBodyScan && (
            <>
              <BodyFatInsightCard
                current={{ weight: latestBodyScan.weight, percent: latestBodyScan.bodyFat }}
                objective={client.objective}
                sex={client.sex}
                previous={
                  previousAssessment
                    ? {
                        weight: previousAssessment.bodyScan?.weight ?? 0,
                        percent: previousAssessment.bodyScan?.bodyFat ?? 0
                      }
                    : null
                }
                initial={{
                  weight: firstAssessment.bodyScan?.weight ?? 0,
                  percent: firstAssessment.bodyScan?.bodyFat ?? 0
                }}
                history={[...(client.assessments ?? [])].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()).map((assessment) => ({
                  date: assessment.date,
                  weight: assessment.bodyScan?.weight ?? 0,
                  percent: assessment.bodyScan?.bodyFat ?? 0
                }))}
              />

              <MuscleMassInsightCard
                current={{ weight: latestBodyScan.weight, muscleMass: latestBodyScan.muscleMass }}
                previous={
                  previousAssessment
                    ? {
                        weight: previousAssessment.bodyScan?.weight ?? 0,
                        muscleMass: previousAssessment.bodyScan?.muscleMass ?? 0
                      }
                    : null
                }
                initial={{
                  weight: firstAssessment.bodyScan?.weight ?? 0,
                  muscleMass: firstAssessment.bodyScan?.muscleMass ?? 0
                }}
                history={[...(client.assessments ?? [])].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()).map((assessment) => ({
                  date: assessment.date,
                  weight: assessment.bodyScan?.weight ?? 0,
                  muscleMass: assessment.bodyScan?.muscleMass ?? 0
                }))}
              />

              <HydrationVisceralInsightCard
                weight={latestBodyScan.weight}
                hydrationPercent={latestBodyScan.hydration}
                sex={client.sex}
                visceralFat={latestBodyScan.visceralFat}
                history={[...(client.assessments ?? [])].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()).map((assessment) => ({
                  date: assessment.date,
                  weight: assessment.bodyScan?.weight ?? 0,
                  hydrationPercent: assessment.bodyScan?.hydration ?? 0,
                  visceralFat: assessment.bodyScan?.visceralFat ?? 0
                }))}
              />
            </>
          )}

          {/* Historique scans tableau */}
          {client.assessments.length > 1 && (
            <div>
              <p className="eyebrow-label mb-3">Historique des mesures</p>
              <div className="rounded-[14px] border border-[var(--ls-border)] overflow-hidden">
                {client.assessments.filter(a => a.bodyScan?.weight).map((a, i) => {
                  const scan = a.bodyScan;
                  return (
                    <div key={a.id ?? i} className="list-row flex items-center justify-between gap-3 px-4 py-3" style={{ borderBottom: '1px solid rgba(128,128,128,0.08)' }}>
                      <span className="text-sm text-[var(--ls-text-muted)]">{formatDate(a.date)}</span>
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
            <div className="rounded-[20px] bg-[var(--ls-surface2)] px-6 py-10 text-center">
              <div style={{ fontSize: 32, marginBottom: 12 }}>⚖️</div>
              <p className="text-sm text-[var(--ls-text-muted)]">Aucun body scan enregistré</p>
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

      {/* Tab 2: Mensurations — Chantier Module Mensurations (2026-04-24) */}
      {activeTab === 2 && (
        <MeasurementsPanel
          clientId={client.id}
          gender={client.sex}
          authorType="coach"
          authorUserId={currentUser?.id ?? null}
          otherAuthorLabel="le client"
        />
      )}

      {/* Tab 3: Historique bilans */}
      {activeTab === 3 && (
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
                canDelete: assessment.type !== "initial",
              }))}
            onDelete={async (assessmentId) => {
              try {
                const sb = await getSupabaseClient();
                if (sb) {
                  await sb.from('assessments').delete().eq('id', assessmentId);
                  // Chantier sync client_recaps (2026-04-20) : après suppression,
                  // le snapshot doit refléter le nouveau "dernier bilan". On skip
                  // silencieux si le client n'a plus aucun bilan (edge case).
                  try {
                    await refreshClientRecap(client.id);
                  } catch (refreshErr) {
                    pushToast(buildSupabaseErrorToast(
                      refreshErr,
                      "Le bilan a été supprimé mais le lien client n'a pas pu être mis à jour."
                    ));
                  }
                  window.location.reload();
                }
              } catch (err) {
                console.error('Delete assessment error:', err);
              }
            }}
          />
        </Card>
      )}

      {/* Tab 3: Produits — wrapped in an ErrorBoundary to prevent a crash
          inside ProductAdder or recommendations logic from breaking the
          entire fiche. Sectional fallback = discreet card, user can navigate
          to another tab without reloading. */}
      {activeTab === 4 && (
        <ErrorBoundary
          name="ClientDetailPage/Tab3-Produits"
          fallback={(
            <Card>
              <div style={{ padding: '24px 0', textAlign: 'center' }}>
                <div style={{ fontSize: 32, marginBottom: 10, opacity: 0.4 }}>⚠️</div>
                <div style={{ fontSize: 14, color: 'var(--ls-text)', fontWeight: 600, marginBottom: 6 }}>
                  Impossible d'afficher les produits
                </div>
                <div style={{ fontSize: 12, color: 'var(--ls-text-muted)', maxWidth: 340, margin: '0 auto 14px', lineHeight: 1.5 }}>
                  Une donnée manque sur ce dossier. Essaie de basculer vers un autre onglet puis reviens,
                  ou recharge la page.
                </div>
                <button
                  type="button"
                  onClick={() => window.location.reload()}
                  style={{ padding: '8px 16px', borderRadius: 10, border: '1px solid var(--ls-border)', background: 'var(--ls-surface2)', color: 'var(--ls-text)', fontSize: 13, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}
                >
                  Recharger
                </button>
              </div>
            </Card>
          )}
        >
          {(() => {
            // Durcissement défensif : ensureBodyScan garantit déjà des
            // valeurs numériques sur latestBodyScan. Pour generateProductRecommendations
            // on passe des fallbacks sûrs sur sex + objective.
            const recoProducts = generateProductRecommendations(latestBodyScan, client.sex ?? 'male', client.objective ?? '');
            const existingIds = new Set(retainedProductIds);
            const existingNames = new Set(retainedProducts.map(p => p?.name).filter((n): n is string => typeof n === 'string'));
            const upsells = (recoProducts ?? []).filter(r => r && !existingNames.has(r.name));
            const allProductIds = [...retainedProductIds];
            const allProducts = allProductIds.map(id => pvProductCatalog.find(p => p.id === id) ?? null).filter((p): p is NonNullable<typeof p> => p != null);
            const totalPv = allProducts.reduce((s, p) => s + (p?.pv ?? 0), 0);
            const totalPrice = allProducts.reduce((s, p) => s + (p?.pricePublic ?? 0), 0);

            return (
        <div className="space-y-4">
          {/* Lien rapide vers suivi PV */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <Link to={`/pv/clients?responsable=${encodeURIComponent(client.distributorId)}&client=${encodeURIComponent(client.id)}`}
              style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px', borderRadius: 10, background: 'rgba(13,148,136,0.08)', border: '1px solid rgba(13,148,136,0.2)', color: 'var(--ls-teal)', textDecoration: 'none', fontSize: 13, fontWeight: 600 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
              Suivi PV / Réassort
            </Link>
            <Link to={`/clients/${client.id}/start-assessment/edit`}
              style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px', borderRadius: 10, background: 'var(--ls-surface2)', border: '1px solid var(--ls-border)', color: 'var(--ls-text-muted)', textDecoration: 'none', fontSize: 13 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              Modifier les produits du bilan
            </Link>
          </div>

          {/* Produits en possession */}
          <Card className="space-y-4" data-tour-id="program-recommendations">
            <div className="flex items-center justify-between">
              <div>
                <p className="eyebrow-label">Programme actuel</p>
                <h2 className="mt-2 text-xl font-bold" style={{ fontFamily: 'Syne, sans-serif', color: 'var(--ls-text)' }}>
                  Produits du client
                </h2>
                <p className="mt-1 text-sm" style={{ color: 'var(--ls-text-muted)' }}>
                  {client.currentProgram || 'Programme à confirmer'}
                </p>
              </div>
              {totalPv > 0 && (
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--ls-gold)', fontFamily: 'Syne, sans-serif' }}>{totalPv.toFixed(1)} PV</div>
                  <div style={{ fontSize: 11, color: 'var(--ls-text-hint)' }}>{totalPrice.toFixed(2)} €</div>
                </div>
              )}
            </div>
            {allProducts.length > 0 ? (
              <div className="grid gap-2">
                {allProducts.map((product, idx) => (
                  <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 12, background: 'var(--ls-surface2)', border: '1px solid var(--ls-border)' }}>
                    <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(13,148,136,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--ls-teal)" strokeWidth="1.5"><polyline points="20 6 9 17 4 12"/></svg>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ls-text)' }}>{product.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--ls-text-muted)', marginTop: 2 }}>Réf. {product.id} · {product.pv} PV · {product.pricePublic.toFixed(2)} €</div>
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--ls-teal)', fontWeight: 600, flexShrink: 0 }}>En cours</div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ padding: '24px 0', textAlign: 'center', color: 'var(--ls-text-hint)', fontSize: 13 }}>
                Aucun produit sélectionné. Modifie le bilan initial pour ajouter les produits.
              </div>
            )}

            {/* Ajouter un produit (upsell) */}
            <ProductAdder
              clientId={client.id}
              existingIds={existingIds}
              onAdded={() => window.location.reload()}
            />
          </Card>

          {/* Produits recommandés */}
          {upsells.length > 0 && (
            <Card className="space-y-4">
              <div>
                <p className="eyebrow-label" style={{ color: 'var(--ls-gold)' }}>Recommandations</p>
                <h2 className="mt-2 text-xl font-bold" style={{ fontFamily: 'Syne, sans-serif', color: 'var(--ls-text)' }}>
                  Produits conseillés
                </h2>
                <p className="mt-1 text-sm" style={{ color: 'var(--ls-text-muted)' }}>Basés sur les derniers résultats body scan</p>
              </div>
              <div className="grid gap-2">
                {upsells.map((r, idx) => (
                  <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '12px 14px', borderRadius: 12, background: 'var(--ls-surface2)', border: '1px solid var(--ls-border)' }}>
                    <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--ls-gold-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--ls-gold)" strokeWidth="1.5"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ls-text)' }}>{r.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--ls-text-muted)', lineHeight: 1.5, marginTop: 2 }}>{r.reason}</div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
        );
          })()}
        </ErrorBoundary>
      )}

      {/* Tab 5: Actions - Refonte chirurgicale Actions premium (Chantier 2026-04-26).
          Composant externalise dans src/components/client-detail/ActionsTab.tsx.
          Tous les connecteurs metier (lifecycle, toggles, transfert, delete,
          coordonnees) utilisent les hooks AppContext existants. */}
      {activeTab === 5 && (
        <ErrorBoundary name="ClientDetailPage/ActionsTab" fallback={(
          <Card><p className="text-sm text-white">Impossible d'afficher l'onglet Actions.</p></Card>
        )}>
          <ActionsTab
            client={client}
            onEditRdv={() => setShowScheduleModal(true)}
            onGoToVueComplete={() => setActiveTab(0)}
          />
          {/* Chantier Prise de masse (2026-04-24) : résumé sport inline sous Actions */}
          <SportSummarySection client={client} />
        </ErrorBoundary>
      )}

      {/* Schedule Modal */}
      {showScheduleModal && (
        <EditScheduleModal
          client={currentClient}
          onClose={() => setShowScheduleModal(false)}
          onSaved={() => setShowScheduleModal(false)}
        />
      )}

      {/* Modale unique pour envoyer l'accès client (QR/WA/Copier/SMS) */}
      <ClientAccessModal
        open={accessModalOpen}
        onClose={() => setAccessModalOpen(false)}
        clientId={client.id}
        clientFirstName={client.firstName}
        clientLastName={client.lastName}
        clientPhone={client.phone}
      />
    </div>
  );
}

// SummaryRow supprimé lors de la refonte 2026-04-25 : les "Fiche rapide"
// cards qui l'utilisaient ont été remplacées par KeyInfoCard (grid 2x2).

function NouveauBilanCTA({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="ls-nouveau-bilan-cta">
      <div className="ls-nouveau-bilan-cta__icon">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 7V5a2 2 0 0 1 2-2h2" />
          <path d="M17 3h2a2 2 0 0 1 2 2v2" />
          <path d="M21 17v2a2 2 0 0 1-2 2h-2" />
          <path d="M7 21H5a2 2 0 0 1-2-2v-2" />
          <line x1="7" y1="12" x2="17" y2="12" />
        </svg>
      </div>
      <div className="ls-nouveau-bilan-cta__content">
        <span className="ls-nouveau-bilan-cta__eyebrow">Nouveau bilan</span>
        <span className="ls-nouveau-bilan-cta__title">Démarrer le body scan</span>
        <span className="ls-nouveau-bilan-cta__subtitle">Enregistrer les nouvelles mesures</span>
      </div>
      <span className="ls-nouveau-bilan-cta__action">Lancer ↗</span>
    </button>
  );
}

function ProductAdder({ clientId, existingIds, onAdded }: { clientId: string; existingIds: Set<string>; onAdded: () => void }) {
  const { getClientById, updateAssessment } = useAppContext();
  const { push: pushToast } = useToast();
  const [open, setOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState<string[]>([]);
  const [error, setError] = useState('');
  const available = pvProductCatalog.filter(p => p.active && !existingIds.has(p.id) && !added.includes(p.id));

  async function addProduct(productId: string) {
    setAdding(true);
    setError('');
    try {
      const client = getClientById(clientId);
      if (!client || !client.assessments.length) { setError('Aucun bilan trouvé'); return; }

      // Trouver le bilan initial (premier par date)
      const sorted = [...client.assessments].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      const initial = sorted[0];
      const currentIds = initial.questionnaire?.selectedProductIds ?? [];

      if (currentIds.includes(productId)) {
        setAdded(prev => [...prev, productId]);
        return;
      }

      const updatedAssessment = {
        ...initial,
        questionnaire: {
          ...initial.questionnaire,
          selectedProductIds: [...currentIds, productId],
        },
      };

      await updateAssessment(clientId, updatedAssessment);
      // Chantier sync client_recaps (2026-04-20) : l'ajout d'un produit change
      // les recos du récap client. Non-bloquant (l'ajout est déjà enregistré).
      try {
        await refreshClientRecap(clientId);
      } catch (refreshErr) {
        pushToast(buildSupabaseErrorToast(
          refreshErr,
          "Les données sont enregistrées mais le lien client n'a pas pu être mis à jour. Tu peux regénérer l'accès depuis la fiche."
        ));
      }
      setAdded(prev => [...prev, productId]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de l\'ajout');
    } finally {
      setAdding(false);
    }
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)}
        style={{ width: '100%', padding: '12px', borderRadius: 10, border: '2px dashed var(--ls-border2)', background: 'transparent', color: 'var(--ls-gold)', cursor: 'pointer', fontSize: 13, fontWeight: 600, fontFamily: 'DM Sans, sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        Ajouter un produit (upsell)
      </button>
    );
  }

  return (
    <div style={{ border: '1px solid var(--ls-border)', borderRadius: 12, padding: 14, background: 'var(--ls-surface2)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--ls-text)' }}>Choisir un produit à ajouter</div>
        {added.length > 0 && (
          <button onClick={() => { setOpen(false); onAdded(); }}
            style={{ fontSize: 11, padding: '4px 12px', borderRadius: 7, border: 'none', background: 'var(--ls-teal)', color: '#fff', cursor: 'pointer', fontWeight: 600, fontFamily: 'DM Sans, sans-serif' }}>
            ✓ Terminé ({added.length} ajouté{added.length > 1 ? 's' : ''})
          </button>
        )}
      </div>
      {error && <div style={{ fontSize: 11, color: 'var(--ls-coral)', marginBottom: 8, padding: '6px 10px', borderRadius: 8, background: 'rgba(220,38,38,0.08)' }}>{error}</div>}
      <div style={{ maxHeight: 300, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
        {available.map(product => (
          <button key={product.id} onClick={() => void addProduct(product.id)} disabled={adding}
            style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 8, border: '1px solid var(--ls-border)', background: 'var(--ls-surface)', cursor: adding ? 'wait' : 'pointer', textAlign: 'left', fontFamily: 'DM Sans, sans-serif', width: '100%' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--ls-text)' }}>{product.name}</div>
              <div style={{ fontSize: 10, color: 'var(--ls-text-hint)' }}>{product.category} · {product.pv} PV</div>
            </div>
            <div style={{ fontSize: 11, color: 'var(--ls-gold)', fontWeight: 600, flexShrink: 0 }}>+ Ajouter</div>
          </button>
        ))}
        {available.length === 0 && <div style={{ fontSize: 12, color: 'var(--ls-text-hint)', textAlign: 'center', padding: 12 }}>Tous les produits ont été ajoutés</div>}
      </div>
      <button onClick={() => { setOpen(false); if (added.length > 0) onAdded(); }}
        style={{ marginTop: 8, fontSize: 12, color: 'var(--ls-text-hint)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>
        Fermer
      </button>
    </div>
  );
}

// ─── Lifecycle UI (Chantier 2) ─────────────────────────────────────────
const LIFECYCLE_TONE_COLORS: Record<"teal" | "gold" | "muted" | "coral", { bg: string; text: string }> = {
  teal:  { bg: "rgba(13,148,136,0.12)",  text: "var(--ls-teal)" },
  gold:  { bg: "rgba(184,146,42,0.12)",  text: "var(--ls-gold)" },
  muted: { bg: "var(--ls-surface2)",     text: "var(--ls-text-muted)" },
  coral: { bg: "rgba(220,38,38,0.1)",    text: "var(--ls-coral)" },
};

function LifecycleBadge({ status }: { status: LifecycleStatus }) {
  const tone = LIFECYCLE_TONES[status] ?? "muted";
  const colors = LIFECYCLE_TONE_COLORS[tone];
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "4px 11px",
        borderRadius: 12,
        fontSize: 11,
        fontWeight: 600,
        background: colors.bg,
        color: colors.text,
        fontFamily: "DM Sans, sans-serif",
      }}
    >
      {LIFECYCLE_LABELS[status]}
    </span>
  );
}

function FragileBadge() {
  return (
    <span
      title="Client fragile — à rassurer"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        padding: "4px 11px",
        borderRadius: 12,
        fontSize: 11,
        fontWeight: 600,
        background: "rgba(220,38,38,0.1)",
        color: "var(--ls-coral)",
        fontFamily: "DM Sans, sans-serif",
      }}
    >
      ⚠ Fragile
    </span>
  );
}

function FreeFollowUpBadge() {
  return (
    <span
      title="Suivi libre — client actif mais hors agenda automatique"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        padding: "4px 11px",
        borderRadius: 12,
        fontSize: 11,
        fontWeight: 600,
        background: "color-mix(in srgb, var(--ls-gold) 12%, transparent)",
        color: "var(--ls-gold)",
        fontFamily: "DM Sans, sans-serif",
      }}
    >
      ✦ Suivi libre
    </span>
  );
}
