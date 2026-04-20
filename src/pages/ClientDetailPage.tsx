import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { EditScheduleModal } from "../components/client/EditScheduleModal";
import { BodyFatInsightCard } from "../components/body-scan/BodyFatInsightCard";
import { MuscleMassInsightCard } from "../components/body-scan/MuscleMassInsightCard";
import { BodyScanSnapshotCard } from "../components/body-scan/BodyScanSnapshotCard";
import { HydrationVisceralInsightCard } from "../components/body-scan/HydrationVisceralInsightCard";
import { BodyScanRadar } from "../components/body-scan/BodyScanRadar";
import { HistoryTimeline } from "../components/client/HistoryTimeline";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { MetricTile } from "../components/ui/MetricTile";
import { StatusBadge } from "../components/ui/StatusBadge";
import { useAppContext } from "../context/AppContext";
import { useToast, buildSupabaseErrorToast } from "../context/ToastContext";
import { buildReportData, generateProductRecommendations } from "../lib/evolutionReport";
import { EvolutionReportModal } from "../components/assessment/EvolutionReportModal";
import { getSupabaseClient } from "../services/supabaseClient";
import { refreshClientRecap } from "../services/supabaseService";
import { buildPvTrackingRecords, pvProductCatalog } from "../data/mockPvModule";
import { createGoogleCalendarLink } from "../lib/googleCalendar";
import { getAccessibleOwnerIds, isAdmin, isRéférent } from "../lib/auth";
import { getClientActiveFollowUp } from "../lib/portfolio";
import {
  calculateProteinRange,
  calculateWaterNeed,
  formatDate,
  formatDateTime,
  getFirstAssessment,
  getLatestAssessment,
  getLatestBodyScan,
  getLatestQuestionnaire,
  getPreviousAssessment
} from "../lib/calculations";
import type { Client, LifecycleStatus } from "../types/domain";
import { LIFECYCLE_LABELS, LIFECYCLE_TONES } from "../types/domain";

export function ClientDetailPage() {
  const navigate = useNavigate();
  const { clientId } = useParams();
  const {
    currentUser,
    users,

    deleteClient,
    getClientById,
    followUps,
    pvTransactions,
    pvClientProducts,
    reassignClientOwner,
    updateClientInfo
  } = useAppContext();
  const { push: pushToast } = useToast();

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
  const [reportUrl, setReportUrl] = useState<string | null>(null);
  const [generatingReport, setGeneratingReport] = useState(false);
  const [editPhone, setEditPhone] = useState(client.phone);
  const [editEmail, setEditEmail] = useState(client.email);
  const [editCity, setEditCity] = useState(client.city ?? '');
  const [editSaved, setEditSaved] = useState(false);
  const [clientAppUrl, setClientAppUrl] = useState<string | null>(null);
  const [creatingClientApp, setCreatingClientApp] = useState(false);
  const [clientAppCopied, setClientAppCopied] = useState(false);
  const [existingClientToken, setExistingClientToken] = useState<string | null>(null);
  const [showHeaderAppModal, setShowHeaderAppModal] = useState(false);
  const coachContactKey = `lor-squad-coach-contact-${currentUser?.id ?? 'anon'}`;
  const [coachPhoneInput, setCoachPhoneInput] = useState<string>(() => {
    if (typeof window === 'undefined') return '';
    try { return JSON.parse(window.localStorage.getItem(coachContactKey) ?? '{}').phone ?? ''; } catch { return ''; }
  });
  const [coachTelegramInput, setCoachTelegramInput] = useState<string>(() => {
    if (typeof window === 'undefined') return '';
    try { return JSON.parse(window.localStorage.getItem(coachContactKey) ?? '{}').telegram ?? ''; } catch { return ''; }
  });
  const activeFollowUp = getClientActiveFollowUp(currentClient, followUps);

  async function createClientAppAccount() {
    if (!client || !currentUser) return;
    setCreatingClientApp(true);
    try {
      const sb = await getSupabaseClient();
      if (!sb) return;

      // Mémoriser les coordonnées coach en localStorage
      try {
        window.localStorage.setItem(coachContactKey, JSON.stringify({
          phone: coachPhoneInput.trim(),
          telegram: coachTelegramInput.trim(),
        }));
      } catch {}

      // Snapshot des métriques depuis les bilans du client
      const sortedAssessments = [...client.assessments].sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
      );
      const metricsHistory = sortedAssessments.map(a => ({
        date: a.date,
        weight: a.bodyScan?.weight ?? 0,
        bodyFat: a.bodyScan?.bodyFat ?? 0,
        muscleMass: a.bodyScan?.muscleMass ?? 0,
        hydration: a.bodyScan?.hydration ?? 0,
        visceralFat: a.bodyScan?.visceralFat ?? 0,
        metabolicAge: a.bodyScan?.metabolicAge ?? 0,
      }));

      const { data, error } = await sb
        .from('client_app_accounts')
        .upsert(
          {
            client_id: client.id,
            client_first_name: client.firstName,
            client_last_name: client.lastName,
            coach_id: currentUser.id,
            coach_name: currentUser.name ?? 'Coach',
            coach_whatsapp: coachPhoneInput.trim(),
            coach_telegram: coachTelegramInput.trim(),
            coach_phone: coachPhoneInput.trim(),
            metrics_history: metricsHistory,
            program_title: client.currentProgram ?? 'Programme en cours',
            assessments_count: client.assessments.length,
            next_follow_up: activeFollowUp?.dueDate ?? null,
          },
          { onConflict: 'client_id' }
        )
        .select('token')
        .single();
      if (!error && data) {
        setClientAppUrl(`${window.location.origin}/client/${data.token}`);
      }
    } finally {
      setCreatingClientApp(false);
    }
  }

  async function generateReport() {
    if (!client || !currentUser) return;
    setGeneratingReport(true);
    try {
      const data = buildReportData(client, currentUser.name ?? 'Coach');
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
  const canReassignClient = isAdmin(currentUser) || isRéférent(currentUser);
  const assignableOwnerIds = getAccessibleOwnerIds(currentUser, users);
  const assignableOwners = users.filter(
    (user) => user.active && assignableOwnerIds.has(user.id)
  );

  useEffect(() => {
    setNextOwnerId(currentClient.distributorId);
  }, [currentClient.distributorId]);

  // Récupère un token partageable pour l'app client
  // Priorité : client_recaps (dernier) → client_evolution_reports → client_app_accounts
  useEffect(() => {
    void (async () => {
      const sb = await getSupabaseClient();
      if (!sb) return;
      const { data: recap } = await sb
        .from('client_recaps')
        .select('token')
        .eq('client_id', currentClient.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (recap?.token) { setExistingClientToken(recap.token); return; }
      const { data: report } = await sb
        .from('client_evolution_reports')
        .select('token')
        .eq('client_id', currentClient.id)
        .order('generated_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (report?.token) { setExistingClientToken(report.token); return; }
      const { data: account } = await sb
        .from('client_app_accounts')
        .select('token')
        .eq('client_id', currentClient.id)
        .maybeSingle();
      if (account?.token) setExistingClientToken(account.token);
    })();
  }, [currentClient.id]);

  const latestAssessment = getLatestAssessment(client);
  const previousAssessment = getPreviousAssessment(client);
  const firstAssessment = getFirstAssessment(client);
  const latestBodyScan = getLatestBodyScan(client);
  const latestQuestionnaire = getLatestQuestionnaire(client);
  const waterNeed = calculateWaterNeed(latestBodyScan.weight);
  const proteinRange = calculateProteinRange(latestBodyScan.weight, client.objective);
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
      // Chantier sync client_recaps (2026-04-20) : le coach_name du récap
      // doit refléter le nouveau responsable. Non-bloquant.
      try {
        await refreshClientRecap(currentClient.id);
      } catch (refreshErr) {
        pushToast(buildSupabaseErrorToast(
          refreshErr,
          "Le dossier a été réattribué mais le lien client n'a pas pu être mis à jour."
        ));
      }
      const nextOwner = users.find((user) => user.id === nextOwnerId);
      setTransferFeedback(
        nextOwner
          ? `Le dossier est maintenant rattaché à ${nextOwner.name}.`
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
              {client.firstName[0]}{client.lastName[0]}
            </div>
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h1 style={{ fontFamily: 'Syne, sans-serif', fontSize: 22, fontWeight: 800, color: 'var(--ls-text)', margin: 0 }}>
                  {client.firstName} {client.lastName}
                </h1>
                <LifecycleBadge status={client.lifecycleStatus ?? (client.started ? "active" : "not_started")} />
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
                {client.startDate ? `Client depuis ${formatDate(client.startDate)}` : "Programme non démarré"} · {client.assessments.length} bilan{client.assessments.length > 1 ? 's' : ''}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {existingClientToken && (
              <button
                type="button"
                onClick={() => setShowHeaderAppModal(true)}
                className="inline-flex min-h-[40px] items-center gap-2 rounded-[12px] border border-[var(--ls-border2)] bg-[var(--ls-surface2)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/[0.08]"
              >
                📱 App client
              </button>
            )}
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

        {/* Modal App client — header */}
        {showHeaderAppModal && existingClientToken && (
          <div onClick={() => setShowHeaderAppModal(false)}
            style={{ position: 'fixed', inset: 0, zIndex: 400, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
            <div onClick={(e) => e.stopPropagation()}
              style={{ background: 'var(--ls-surface)', border: '1px solid rgba(201,168,76,0.25)', borderRadius: 18, padding: 24, width: '100%', maxWidth: 380 }}>
              <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 18, fontWeight: 800, color: 'var(--ls-text)', marginBottom: 4 }}>
                📱 App client
              </div>
              <div style={{ fontSize: 12, color: 'var(--ls-text-muted)', marginBottom: 16 }}>
                Lien à partager au client — installable sur iPhone/Android
              </div>
              <div style={{ padding: '10px 12px', background: 'var(--ls-surface2)', border: '1px solid var(--ls-border)', borderRadius: 10, fontSize: 11, color: 'var(--ls-text-muted)', fontFamily: 'monospace', wordBreak: 'break-all', marginBottom: 12 }}>
                {window.location.origin}/client/{existingClientToken}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 12 }}>
                <button type="button" onClick={() => {
                  void navigator.clipboard.writeText(`${window.location.origin}/client/${existingClientToken}`);
                }} style={{ padding: '10px 4px', borderRadius: 8, border: '1px solid var(--ls-border)', background: 'var(--ls-surface2)', color: 'var(--ls-text)', fontSize: 12, fontWeight: 500, cursor: 'pointer' }}>
                  Copier
                </button>
                <a href={`https://wa.me/?text=${encodeURIComponent(`Ton espace Lor'Squad Wellness ✦\n${window.location.origin}/client/${existingClientToken}`)}`} target="_blank" rel="noopener noreferrer"
                  style={{ padding: '10px 4px', borderRadius: 8, background: 'rgba(37,211,102,0.12)', color: '#25D366', fontSize: 12, fontWeight: 600, textAlign: 'center', textDecoration: 'none' }}>
                  WhatsApp
                </a>
                <a href={`sms:?body=${encodeURIComponent(`Ton espace Lor'Squad : ${window.location.origin}/client/${existingClientToken}`)}`}
                  style={{ padding: '10px 4px', borderRadius: 8, background: 'var(--ls-border)', color: 'var(--ls-text-muted)', fontSize: 12, fontWeight: 500, textAlign: 'center', textDecoration: 'none' }}>
                  SMS
                </a>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => setShowHeaderAppModal(false)}
                  style={{ flex: 1, padding: 10, borderRadius: 10, border: '1px solid var(--ls-border)', background: 'transparent', color: 'var(--ls-text-muted)', fontSize: 13, cursor: 'pointer' }}>
                  Fermer
                </button>
                <button onClick={() => window.open(`${window.location.origin}/client/${existingClientToken}`, '_blank')}
                  style={{ flex: 1, padding: 10, borderRadius: 10, border: 'none', background: '#C9A84C', color: '#0B0D11', fontFamily: 'Syne, sans-serif', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                  Ouvrir
                </button>
              </div>
            </div>
          </div>
        )}

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

      {/* Tab bar */}
      <div className="client-tabs flex gap-1 rounded-[14px] border border-[var(--ls-border)] bg-[var(--ls-surface)] p-1" style={{ width: 'fit-content', maxWidth: '100%' }}>
        {[
          { label: 'Vue complète', icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg> },
          { label: 'Body Scan', icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>, count: client.assessments.filter(a => a.bodyScan?.weight).length },
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
          <NouveauBilanCTA onClick={() => navigate(`/clients/${client.id}/follow-up/new`)} />

          <div className="bodyscan-metrics grid grid-cols-2 gap-3 md:gap-4 xl:grid-cols-4">
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
              hint={client.objective === "weight-loss" ? "Repère cible" : "Cap actuel"}
              accent={
                client.objective === "weight-loss" && !latestQuestionnaire.targetWeight
                  ? "muted"
                  : "red"
              }
            />
            <MetricTile
              label="Prochain rendez-vous"
              value={activeFollowUp ? formatDateTime(activeFollowUp.dueDate) : "Non planifié"}
              hint={activeFollowUp ? "Suite déjà posée" : "Client inactif ou en pause"}
              accent={activeFollowUp ? "blue" : "muted"}
            />
          </div>

          <BodyScanSnapshotCard
            title="Dernier body scan"
            dateLabel={`Relevé du ${formatDate(latestAssessment.date)}`}
            metrics={latestBodyScan}
            realAge={client.age}
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
                        weight: previousAssessment.bodyScan.weight,
                        percent: previousAssessment.bodyScan.bodyFat
                      }
                    : null
                }
                initial={{
                  weight: firstAssessment.bodyScan.weight,
                  percent: firstAssessment.bodyScan.bodyFat
                }}
                history={[...client.assessments].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()).map((assessment) => ({
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
                history={[...client.assessments].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()).map((assessment) => ({
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
                history={[...client.assessments].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()).map((assessment) => ({
                  date: assessment.date,
                  weight: assessment.bodyScan.weight,
                  hydrationPercent: assessment.bodyScan.hydration,
                  visceralFat: assessment.bodyScan.visceralFat
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

      {/* Tab 3: Produits */}
      {activeTab === 3 && (() => {
        const recoProducts = generateProductRecommendations(latestBodyScan, client.sex ?? 'male', client.objective ?? '');
        const existingIds = new Set(retainedProductIds);
        const existingNames = new Set(retainedProducts.map(p => p.name));
        const upsells = recoProducts.filter(r => !existingNames.has(r.name));
        const allProductIds = [...retainedProductIds];
        const allProducts = allProductIds.map(id => pvProductCatalog.find(p => p.id === id) ?? null).filter((p): p is NonNullable<typeof p> => p != null);
        const totalPv = allProducts.reduce((s, p) => s + p.pv, 0);
        const totalPrice = allProducts.reduce((s, p) => s + p.pricePublic, 0);

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
          <Card className="space-y-4">
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

      {/* Tab 4: Actions rapides */}
      {activeTab === 4 && (
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
              <button type="button" onClick={() => setShowScheduleModal(true)} className="w-full rounded-[22px] bg-[var(--ls-surface2)] p-4 text-left transition hover:bg-[var(--ls-surface2)]">
                <p className="text-sm font-semibold text-white">Modifier le prochain rendez-vous</p>
                <p className="mt-1 text-sm leading-6 text-[var(--ls-text-muted)]">Ajuster la date, l'heure ou le type de suivi</p>
              </button>
              <LinkButton
                to={`/pv/clients?responsable=${encodeURIComponent(client.distributorId)}&client=${encodeURIComponent(client.id)}`}
                label="Ouvrir la fiche point volume"
                hint="Visualiser les commandes et le suivi produits"
              />
              {/* Accès app client (PWA) */}
              <div style={{ padding: '14px 16px', borderRadius: 12, background: 'var(--ls-surface2)', border: '1px solid var(--ls-border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: clientAppUrl ? 10 : 0 }}>
                  <div style={{ width: 3, minHeight: 36, background: '#B8922A', borderRadius: 3, flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ls-text)' }}>Créer l'accès app client</div>
                    <div style={{ fontSize: 12, color: 'var(--ls-text-muted)', marginTop: 2 }}>
                      Lien à partager au client — installable sur iPhone
                    </div>
                  </div>
                  {!clientAppUrl && (
                    <button type="button" onClick={() => void createClientAppAccount()} disabled={creatingClientApp}
                      style={{ padding: '8px 14px', borderRadius: 8, border: 'none', background: '#B8922A', color: '#fff', fontSize: 12, fontWeight: 600, cursor: creatingClientApp ? 'wait' : 'pointer', flexShrink: 0 }}>
                      {creatingClientApp ? 'Création...' : 'Créer'}
                    </button>
                  )}
                </div>

                {/* Coordonnées coach (mémorisées en local) */}
                {!clientAppUrl && (
                  <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px dashed var(--ls-border)', display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div style={{ fontSize: 11, color: 'var(--ls-text-muted)', fontWeight: 500 }}>
                      Tes coordonnées (affichées au client pour te contacter) :
                    </div>
                    <input
                      value={coachPhoneInput}
                      onChange={(e) => setCoachPhoneInput(e.target.value)}
                      placeholder="Ton WhatsApp (ex: +33612345678)"
                      style={{ width: '100%', padding: '9px 12px', border: '1px solid var(--ls-border)', borderRadius: 8, fontSize: 13, background: 'var(--ls-surface)', color: 'var(--ls-text)', fontFamily: 'DM Sans, sans-serif', outline: 'none' }}
                    />
                    <input
                      value={coachTelegramInput}
                      onChange={(e) => setCoachTelegramInput(e.target.value)}
                      placeholder="Ton Telegram (ex: tomthomas) — optionnel"
                      style={{ width: '100%', padding: '9px 12px', border: '1px solid var(--ls-border)', borderRadius: 8, fontSize: 13, background: 'var(--ls-surface)', color: 'var(--ls-text)', fontFamily: 'DM Sans, sans-serif', outline: 'none' }}
                    />
                    <div style={{ fontSize: 10, color: 'var(--ls-text-hint)' }}>
                      Ces infos sont mémorisées localement — à saisir une seule fois.
                    </div>
                  </div>
                )}
                {clientAppUrl && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div style={{ fontSize: 11, color: 'var(--ls-text-muted)', padding: '8px 10px', background: 'var(--ls-surface)', border: '1px solid var(--ls-border)', borderRadius: 8, wordBreak: 'break-all', fontFamily: 'monospace' }}>
                      {clientAppUrl}
                    </div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <button type="button" onClick={() => {
                        void navigator.clipboard.writeText(clientAppUrl);
                        setClientAppCopied(true);
                        setTimeout(() => setClientAppCopied(false), 2000);
                      }} style={{ padding: '7px 12px', borderRadius: 8, border: '1px solid var(--ls-border)', background: 'var(--ls-surface)', color: 'var(--ls-text)', fontSize: 11, fontWeight: 500, cursor: 'pointer' }}>
                        {clientAppCopied ? '✓ Copié' : 'Copier le lien'}
                      </button>
                      <a href={`https://wa.me/?text=${encodeURIComponent(`Ton espace Lor'Squad Wellness ✦\n${clientAppUrl}`)}`} target="_blank" rel="noopener noreferrer"
                        style={{ padding: '7px 12px', borderRadius: 8, background: 'rgba(37,211,102,0.1)', color: '#16A34A', fontSize: 11, fontWeight: 600, textDecoration: 'none' }}>
                        Partager WhatsApp
                      </a>
                      <a href={`sms:?body=${encodeURIComponent(`Ton espace Lor'Squad : ${clientAppUrl}`)}`}
                        style={{ padding: '7px 12px', borderRadius: 8, background: 'var(--ls-surface)', border: '1px solid var(--ls-border)', color: 'var(--ls-text-muted)', fontSize: 11, fontWeight: 500, textDecoration: 'none' }}>
                        SMS
                      </a>
                    </div>
                  </div>
                )}
              </div>

              {activeFollowUp && (() => {
                // Fix Invalid time value (2026-04-19) : on n'affiche le lien
                // Google Calendar que si dueDate est parseable — sinon
                // createGoogleCalendarLink().toISOString() throwerait au render.
                const dueDateObj = new Date(activeFollowUp.dueDate);
                if (Number.isNaN(dueDateObj.getTime())) {
                  return null;
                }
                return (
                <a
                  href={createGoogleCalendarLink({
                    title: `RDV ${client.firstName} ${client.lastName} — Lor'Squad Wellness`,
                    description: `${activeFollowUp.type}\nCoach : ${client.distributorName}\nProgramme : ${client.currentProgram}`,
                    startDate: dueDateObj,
                    location: 'La Base Shakes & Drinks, Verdun',
                  })}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px', borderRadius: 12, background: 'var(--ls-surface2)', border: '1px solid var(--ls-border)', textDecoration: 'none', transition: 'all 0.15s' }}
                >
                  <div style={{ width: 3, height: '100%', minHeight: 36, background: '#0D9488', borderRadius: 3, flexShrink: 0 }} />
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ls-text)' }}>Ajouter à Google Agenda</div>
                    <div style={{ fontSize: 12, color: 'var(--ls-text-muted)', marginTop: 2 }}>
                      RDV le {dueDateObj.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
                    </div>
                  </div>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--ls-teal)" strokeWidth="1.5" style={{ marginLeft: 'auto', flexShrink: 0 }}>
                    <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
                  </svg>
                </a>
                );
              })()}
            </div>
          </Card>

          <Card className="space-y-4">
            <p className="eyebrow-label">Coordonnées</p>
            <h2 className="text-lg font-bold text-white" style={{ fontFamily: 'Syne, sans-serif' }}>Modifier les infos</h2>
            <div className="space-y-3">
              <div>
                <label className="text-[11px] font-medium text-[var(--ls-text-hint)] uppercase tracking-wider">Téléphone</label>
                <input value={editPhone} onChange={e => { setEditPhone(e.target.value); setEditSaved(false) }} style={{ marginTop: 4 }} />
              </div>
              <div>
                <label className="text-[11px] font-medium text-[var(--ls-text-hint)] uppercase tracking-wider">Email</label>
                <input value={editEmail} onChange={e => { setEditEmail(e.target.value); setEditSaved(false) }} style={{ marginTop: 4 }} />
              </div>
              <div>
                <label className="text-[11px] font-medium text-[var(--ls-text-hint)] uppercase tracking-wider">Ville</label>
                <input value={editCity} onChange={e => { setEditCity(e.target.value); setEditSaved(false) }} style={{ marginTop: 4 }} />
              </div>
              <Button
                variant="secondary"
                className="w-full"
                onClick={() => {
                  void (async () => {
                    try {
                      await updateClientInfo(client.id, {
                        phone: editPhone.trim(),
                        email: editEmail.trim().toLowerCase(),
                        city: editCity.trim() || undefined
                      });
                      // Chantier sync client_recaps (2026-04-20) : les infos
                      // client (nom affiché) dans le récap doivent suivre.
                      // Non-bloquant : la mise à jour coordonnées a réussi.
                      try {
                        await refreshClientRecap(client.id);
                      } catch (refreshErr) {
                        pushToast(buildSupabaseErrorToast(
                          refreshErr,
                          "Les données sont enregistrées mais le lien client n'a pas pu être mis à jour. Tu peux regénérer l'accès depuis la fiche."
                        ));
                      }
                      setEditSaved(true);
                      pushToast({
                        tone: "success",
                        title: "Coordonnées mises à jour",
                      });
                    } catch (err) {
                      setEditSaved(false);
                      pushToast(buildSupabaseErrorToast(
                        err,
                        "Impossible de mettre à jour les coordonnées. Vérifiez votre connexion et réessayez."
                      ));
                    }
                  })();
                }}
              >
                {editSaved ? '✓ Enregistré' : 'Enregistrer les modifications'}
              </Button>
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
              <SummaryRow label="Produits optionnels" value={optionalProductsLabel} />
              {retainedProductsTotalPrice > 0 && <SummaryRow label="Prix routine" value={`${retainedProductsTotalPrice.toFixed(2)} €`} />}
              {retainedProductsTotalPv > 0 && <SummaryRow label="PV routine" value={`${retainedProductsTotalPv.toFixed(1)} PV`} />}
              {pvRecord && <SummaryRow label="Dernière commande" value={formatDate(pvRecord.lastOrderDate)} />}
            </div>
            {canDeleteClient && (
              <div className="mt-3 pt-3 border-t border-[var(--ls-border)]">
                <DangerActionButton label="Supprimer ce dossier" hint="Retirer ce client et ses données" onClick={handleDeleteClient} />
              </div>
            )}
            {canReassignClient && (
              <div className="mt-4 rounded-[18px] border border-[var(--ls-border)] bg-white/[0.02] p-4">
                <p className="text-[11px] text-[var(--ls-text-hint)] uppercase tracking-wider mb-3">Transférer le dossier</p>
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

          <LifecycleControlCard client={client} />
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
    <div className="flex items-center justify-between gap-3 rounded-[22px] bg-[var(--ls-surface2)] px-4 py-3">
      <span className="text-sm text-[var(--ls-text-muted)]">{label}</span>
      <span className="text-right text-sm font-semibold text-white">{value}</span>
    </div>
  );
}

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
}: {
  to: string;
  label: string;
  hint: string;
  tone?: "blue" | "green";
}) {
  return (
    <Link
      to={to}
      style={{ display: 'block', background: 'var(--ls-surface)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: '14px 16px', textDecoration: 'none', position: 'relative', overflow: 'hidden', transition: 'border-color 0.15s' }}
      onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--ls-border2)'}
      onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--ls-border)'}
    >
      <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, background: '#C9A84C', borderRadius: '3px 0 0 3px' }} />
      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ls-text)', marginBottom: 3 }}>{label}</div>
      <div style={{ fontSize: 12, color: 'var(--ls-text-muted)' }}>{hint}</div>
    </Link>
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

function LifecycleControlCard({ client }: { client: Client }) {
  const { setClientLifecycleStatus, setClientFragileFlag, setClientFreeFollowUp } = useAppContext();
  const { push: pushToast } = useToast();
  const currentStatus: LifecycleStatus = client.lifecycleStatus ?? (client.started ? "active" : "not_started");
  const [selected, setSelected] = useState<LifecycleStatus>(currentStatus);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "ok" | "err"; msg: string } | null>(null);
  const [fragileSaving, setFragileSaving] = useState(false);
  const [freeSaving, setFreeSaving] = useState(false);
  const isFragile = client.isFragile ?? false;
  const isFreeFollowUp = client.freeFollowUp ?? false;

  async function handleToggleFreeFollowUp() {
    setFreeSaving(true);
    try {
      await setClientFreeFollowUp(client.id, !isFreeFollowUp);
      pushToast({
        tone: "success",
        title: isFreeFollowUp ? "Suivi libre désactivé" : "Suivi libre activé",
        message: isFreeFollowUp
          ? "Le client est de nouveau suivi dans l'agenda automatique."
          : "Le client reste actif mais n'apparaîtra plus dans l'agenda ni les relances.",
      });
    } catch (err) {
      pushToast(buildSupabaseErrorToast(
        err,
        "Impossible de modifier le mode de suivi."
      ));
    } finally {
      setFreeSaving(false);
    }
  }

  async function handleSaveStatus() {
    if (selected === currentStatus) return;
    setSaving(true);
    setFeedback(null);
    try {
      await setClientLifecycleStatus(client.id, selected);
      setFeedback({
        type: "ok",
        msg:
          selected === "stopped" || selected === "lost"
            ? "Statut mis à jour · les suivis en cours ont été désactivés"
            : "Statut mis à jour",
      });
      setTimeout(() => setFeedback(null), 2500);
    } catch (err) {
      setFeedback({
        type: "err",
        msg: err instanceof Error ? err.message : "Impossible de modifier le statut.",
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleFragile() {
    setFragileSaving(true);
    try {
      await setClientFragileFlag(client.id, !isFragile);
    } finally {
      setFragileSaving(false);
    }
  }

  const options: Array<{ value: LifecycleStatus; label: string; hint: string }> = [
    { value: "active",      label: "Actif",         hint: "Programme en cours, suivi normal" },
    { value: "not_started", label: "Pas démarré",   hint: "Bilan fait, programme pas encore démarré" },
    { value: "paused",      label: "En pause",      hint: "Temporairement en standby (vacances, maladie…)" },
    { value: "stopped",     label: "Arrêté",        hint: "A arrêté volontairement · stoppe les suivis auto" },
    { value: "lost",        label: "Perdu",         hint: "Injoignable · stoppe les suivis auto" },
  ];

  return (
    <Card className="space-y-4">
      <p className="eyebrow-label">Cycle de vie</p>
      <h2 className="text-lg font-bold text-white" style={{ fontFamily: "Syne, sans-serif" }}>
        Statut du dossier
      </h2>

      <div className="space-y-2">
        {options.map((opt) => {
          const isActive = selected === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => setSelected(opt.value)}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "12px 14px",
                borderRadius: 12,
                border: isActive ? "1.5px solid var(--ls-gold)" : "1px solid var(--ls-border)",
                background: isActive ? "rgba(184,146,42,0.08)" : "var(--ls-surface2)",
                color: "var(--ls-text)",
                cursor: "pointer",
                textAlign: "left",
                fontFamily: "DM Sans, sans-serif",
                transition: "all 0.15s",
              }}
            >
              <div style={{ flexShrink: 0 }}>
                <LifecycleBadge status={opt.value} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ls-text)" }}>{opt.label}</div>
                <div style={{ fontSize: 11, color: "var(--ls-text-muted)", marginTop: 2 }}>{opt.hint}</div>
              </div>
              {isActive && (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--ls-gold)" strokeWidth="2.5">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              )}
            </button>
          );
        })}
      </div>

      <Button
        className="w-full"
        onClick={() => void handleSaveStatus()}
        disabled={saving || selected === currentStatus}
      >
        {saving ? "Enregistrement..." : selected === currentStatus ? "Statut inchangé" : "Enregistrer le statut"}
      </Button>

      {feedback && (
        <div
          style={{
            fontSize: 12,
            padding: "8px 12px",
            borderRadius: 9,
            background: feedback.type === "ok" ? "rgba(13,148,136,0.08)" : "rgba(220,38,38,0.08)",
            border: feedback.type === "ok" ? "1px solid rgba(13,148,136,0.2)" : "1px solid rgba(220,38,38,0.2)",
            color: feedback.type === "ok" ? "var(--ls-teal)" : "var(--ls-coral)",
          }}
        >
          {feedback.msg}
        </div>
      )}

      {/* Flag fragile */}
      <div
        style={{
          marginTop: 10,
          padding: "12px 14px",
          borderRadius: 12,
          background: isFragile ? "rgba(220,38,38,0.06)" : "var(--ls-surface2)",
          border: isFragile ? "1px solid rgba(220,38,38,0.2)" : "1px solid var(--ls-border)",
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ls-text)" }}>
            {isFragile ? "⚠ Client marqué fragile" : "Marquer comme fragile"}
          </div>
          <div style={{ fontSize: 11, color: "var(--ls-text-muted)", marginTop: 2 }}>
            {isFragile
              ? "Ce client a besoin d'attention particulière — visible dans le dashboard."
              : "À activer si le client hésite ou a besoin d'être rassuré."}
          </div>
        </div>
        <button
          type="button"
          onClick={() => void handleToggleFragile()}
          disabled={fragileSaving}
          style={{
            padding: "7px 14px",
            borderRadius: 9,
            border: isFragile ? "1px solid var(--ls-border)" : "1px solid rgba(220,38,38,0.25)",
            background: isFragile ? "transparent" : "rgba(220,38,38,0.08)",
            color: isFragile ? "var(--ls-text-muted)" : "var(--ls-coral)",
            fontSize: 12,
            fontWeight: 600,
            cursor: fragileSaving ? "wait" : "pointer",
            fontFamily: "DM Sans, sans-serif",
            flexShrink: 0,
          }}
        >
          {fragileSaving ? "..." : isFragile ? "Retirer" : "Marquer"}
        </button>
      </div>

      {/* Sujet C — Mode de suivi (suivi libre / standard) */}
      <div
        style={{
          marginTop: 10,
          padding: "12px 14px",
          borderRadius: 12,
          background: isFreeFollowUp
            ? "color-mix(in srgb, var(--ls-gold) 6%, transparent)"
            : "var(--ls-surface2)",
          border: isFreeFollowUp
            ? "1px solid color-mix(in srgb, var(--ls-gold) 25%, transparent)"
            : "1px solid var(--ls-border)",
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ls-text)" }}>
            {isFreeFollowUp ? "✦ Suivi libre activé" : "Activer le suivi libre"}
          </div>
          <div style={{ fontSize: 11, color: "var(--ls-text-muted)", marginTop: 2, lineHeight: 1.5 }}>
            {isFreeFollowUp
              ? "Le client est hors agenda auto — pas de relance, pas de notif. Géré à la demande."
              : "À activer pour les clients fidèles sans besoin de rappel auto (pas de RDV, pas de relance)."}
          </div>
        </div>
        <button
          type="button"
          onClick={() => void handleToggleFreeFollowUp()}
          disabled={freeSaving}
          style={{
            padding: "7px 14px",
            borderRadius: 9,
            border: isFreeFollowUp
              ? "1px solid var(--ls-border)"
              : "1px solid color-mix(in srgb, var(--ls-gold) 30%, transparent)",
            background: isFreeFollowUp
              ? "transparent"
              : "color-mix(in srgb, var(--ls-gold) 10%, transparent)",
            color: isFreeFollowUp ? "var(--ls-text-muted)" : "var(--ls-gold)",
            fontSize: 12,
            fontWeight: 600,
            cursor: freeSaving ? "wait" : "pointer",
            fontFamily: "DM Sans, sans-serif",
            flexShrink: 0,
          }}
        >
          {freeSaving ? "..." : isFreeFollowUp ? "Désactiver" : "Activer"}
        </button>
      </div>
    </Card>
  );
}
