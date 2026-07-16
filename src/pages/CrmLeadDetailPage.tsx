// =============================================================================
// CrmLeadDetailPage — fiche lead CRM plein écran, route /crm/leads/:leadId.
//
// Chantier refonte CRM Liste/Pipeline/Fiche détail, Phase 2 (2026-07-16).
// Remplace LeadDetailModal (online_bilans uniquement) par une page dédiée
// qui couvre les 4 tables (online_bilans / prospect_leads / client_referrals
// / client_referral_intentions) — même logique de statut/notes/suppression
// que useCrmLeads (Liste + Pipeline), même logique de message/IA que
// useLeadQuickActions.
//
// Pattern hooks-avant-early-return calqué sur ClientDetailPage.tsx : `lead`
// peut être null pendant le chargement ou juste après création (race), tous
// les hooks sont déclarés avant le moindre `if (!lead) return`.
// =============================================================================

import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useAppContext } from "../context/AppContext";
import { useToast } from "../context/ToastContext";
import {
  CRM_SOURCE_META,
  CRM_STATUS_META,
  parseCrmLeadKey,
  statusOptionsFor,
  tableHasNotes,
  useCrmLeads,
  type CrmLead,
  type CrmStatus,
} from "../hooks/useCrmLeads";
import { useOnlineBilans } from "../hooks/useOnlineBilans";
import { useLeadQuickActions } from "../hooks/useLeadQuickActions";
import { getSupabaseClient } from "../services/supabaseClient";
import { buildCrmSmsLink, buildCrmWhatsAppLink } from "../lib/crmMessages";
import { relativeLeadDays } from "../lib/leadDateFormat";
import { computeLeadScore, TEMP_META } from "../lib/leadScoring";
import { isStagnant, stagnationDays } from "../lib/leadActivity";
import { suggestOwner, tableSupportsAssignment, type OwnerCandidate } from "../lib/leadRouting";
import { LeadQualificationStepper } from "../components/leads/LeadQualificationStepper";
import { CrmResponsePanel } from "../components/crm/CrmResponsePanel";
import { LeadDetailBilanSections } from "../components/leads/LeadDetailBilanSections";
import { FunnelAnswers } from "../components/crm/FunnelAnswers";
import { LeadConvertModal } from "../components/leads/LeadConvertModal";
import { LeadScheduleModal } from "../components/leads/LeadScheduleModal";
import { ProspectFormModal } from "../components/prospect/ProspectFormModal";

// Dupliqué à l'identique depuis CrmPage.tsx (fonction pure de 6 lignes) —
// pas assez de surface pour justifier une extraction dédiée.
function normalizeSlug(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]/g, "")
    .trim();
}

// Placeholder stable passé à useLeadQuickActions quand `lead` est encore
// null (chargement) — permet d'appeler le hook de façon inconditionnelle
// (règle des hooks) sans casser son typage sur un vrai CrmLead.
const PLACEHOLDER_LEAD: CrmLead = {
  key: "placeholder",
  table: "prospect_leads",
  id: "",
  firstName: "",
  contact: null,
  contactIsPhone: false,
  city: null,
  source: "welcome",
  status: "new",
  viaName: null,
  parrainPhone: null,
  parrainClientId: null,
  extra: null,
  ownerUserId: null,
  relanceDue: false,
  resultToken: null,
  createdAt: new Date(0).toISOString(),
  contactedAt: null,
  notes: null,
};

export function CrmLeadDetailPage() {
  const { leadId } = useParams<{ leadId: string }>();
  const navigate = useNavigate();
  const { currentUser, users } = useAppContext();
  const { push: pushToast } = useToast();

  const { leads, loading, error, refetch, updateStatus, updateNotes, assignOwner, setDormant, deleteLead } = useCrmLeads();
  const onlineBilans = useOnlineBilans();

  const lead = useMemo(() => leads.find((l) => l.key === leadId) ?? null, [leads, leadId]);
  const bilanRow =
    lead?.table === "online_bilans"
      ? onlineBilans.bilans.find((b) => b.id === lead.id) ?? null
      : null;
  const isAdmin = currentUser?.role === "admin";

  // Attribution (Phase 5) : candidats = équipe active, chargés par leads
  // actifs déjà attribués — suggestion transparente, jamais automatique.
  const ownerCandidates = useMemo<OwnerCandidate[]>(() => {
    return (users ?? [])
      .filter((u) => u.active)
      .map((u) => ({
        id: u.id,
        name: u.name,
        activeLeadCount: leads.filter(
          (l) => l.ownerUserId === u.id && !l.dormant && l.status !== "converted" && l.status !== "lost",
        ).length,
      }));
  }, [users, leads]);
  const ownerSuggestion = useMemo(
    () => (lead && !lead.ownerUserId ? suggestOwner(ownerCandidates) : null),
    [lead, ownerCandidates],
  );

  // Garde-fou race condition (pattern ClientDetailPage.tsx) : si on arrive
  // sur la fiche juste après création du lead, un seul refetch de secours.
  const retriedRef = useRef(false);
  useEffect(() => {
    if (!leadId || lead || loading || retriedRef.current) return;
    retriedRef.current = true;
    void refetch();
  }, [leadId, lead, loading, refetch]);

  useEffect(() => {
    document.title = lead ? `La Base 360 — ${lead.firstName}` : "La Base 360 — Lead";
  }, [lead]);

  // Notes : hydratées une fois par lead (clé), pas à chaque refetch —
  // sinon la frappe du coach serait écrasée par le polling.
  const [notes, setNotes] = useState("");
  const [notesHydratedKey, setNotesHydratedKey] = useState<string | null>(null);
  useEffect(() => {
    if (lead && notesHydratedKey !== lead.key) {
      setNotes(lead.notes ?? "");
      setNotesHydratedKey(lead.key);
    }
  }, [lead, notesHydratedKey]);

  const [savingStatus, setSavingStatus] = useState(false);
  const [savingNotes, setSavingNotes] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showConvert, setShowConvert] = useState(false);
  const [showSchedule, setShowSchedule] = useState(false);
  const [showAgenda, setShowAgenda] = useState(false);
  // Résumé Noaly (Phase 4) — déclenché par bouton, jamais au montage (coût IA).
  const [noalySummary, setNoalySummary] = useState<string | null>(null);
  const [noalySummaryLoading, setNoalySummaryLoading] = useState(false);
  useEffect(() => {
    setNoalySummary(null);
  }, [lead?.key]);

  const msgCtx = useMemo(() => {
    const slug = normalizeSlug((currentUser?.name ?? "").split(/\s+/)[0] ?? "");
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    return {
      coachFirstName: (currentUser?.name ?? "").split(/\s+/)[0] || "Ton coach",
      bilanUrl: `${origin}/bilan-online/${slug}`,
      vipUrl: `${origin}/vip/${slug}`,
    };
  }, [currentUser?.name]);

  const { message, messageLabel, aiMessage, setAiMessage, aiLoading, generateAi, lastTouch, recordTouch } =
    useLeadQuickActions(lead ?? PLACEHOLDER_LEAD, msgCtx);

  async function handleStatusChange(next: CrmStatus) {
    if (!lead) return;
    setSavingStatus(true);
    try {
      const err = await updateStatus(lead, next);
      if (err) pushToast({ tone: "error", title: "Statut", message: err });
    } finally {
      setSavingStatus(false);
    }
  }

  async function handleNotesBlur() {
    if (!lead || notes === (lead.notes ?? "")) return;
    setSavingNotes(true);
    try {
      const err = await updateNotes(lead, notes);
      if (err) pushToast({ tone: "error", title: "Notes", message: err });
    } finally {
      setSavingNotes(false);
    }
  }

  async function handleDelete() {
    if (!lead) return;
    const ok = window.confirm(
      `Supprimer définitivement le lead « ${lead.firstName} » ?\n\nCette action est irréversible.`,
    );
    if (!ok) return;
    setDeleting(true);
    try {
      const err = await deleteLead(lead);
      if (err) {
        pushToast({ tone: "error", title: "Suppression", message: err });
        return;
      }
      navigate("/crm");
    } finally {
      setDeleting(false);
    }
  }

  function copyMessage(text: string) {
    void navigator.clipboard?.writeText(text);
    pushToast({ tone: "success", title: "Copié ✓" });
  }

  async function handleAssign(userId: string | null) {
    if (!lead) return;
    const err = await assignOwner(lead, userId);
    if (err) pushToast({ tone: "error", title: "Attribution", message: err });
  }

  async function generateNoalySummary() {
    if (!lead) return;
    setNoalySummaryLoading(true);
    try {
      const sb = await getSupabaseClient();
      if (!sb) throw new Error("Service indisponible.");
      const { score, temperature } = computeLeadScore(lead);
      const src = CRM_SOURCE_META[lead.source];
      const { data, error } = await sb.functions.invoke("noaly", {
        body: {
          mode: "crm_summary",
          coachUserId: currentUser?.id,
          coachFirstName: msgCtx.coachFirstName,
          lead: {
            firstName: lead.firstName,
            sourceLabel: src.label,
            status: CRM_STATUS_META[lead.status].label,
            viaName: lead.viaName,
            city: lead.city,
            extra: lead.extra,
            notes: lead.notes,
            score,
            temperature,
            stagnationDays: stagnationDays(lead),
            funnelAnswers: lead.funnelAnswers ?? null,
            bilanObjectives: lead.bilanObjectives ?? null,
            bilanMotivation: lead.bilanMotivation ?? null,
          },
        },
      });
      const payload = data as { summary?: string; message?: string } | null;
      if (error || !payload?.summary) {
        const reason = payload?.message || "IA indisponible — réessaie plus tard.";
        pushToast({ tone: "warning", title: "Noaly", message: reason });
        return;
      }
      setNoalySummary(payload.summary);
    } catch (e) {
      pushToast({ tone: "warning", title: "Noaly", message: e instanceof Error ? e.message : "Erreur IA." });
    } finally {
      setNoalySummaryLoading(false);
    }
  }

  // ── Early returns APRÈS tous les hooks (rules-of-hooks) ──────────────────
  const urlLooksValid = Boolean(parseCrmLeadKey(leadId));

  if (!urlLooksValid) {
    return (
      <div style={pageWrap}>
        <NotFoundCard
          reason="Lien invalide."
          onRefresh={() => { retriedRef.current = false; void refetch(); }}
          onBack={() => navigate("/crm")}
        />
      </div>
    );
  }

  if (loading && !lead) {
    return (
      <div style={pageWrap}>
        <div style={hint}>Chargement du lead…</div>
      </div>
    );
  }

  if (!lead) {
    return (
      <div style={pageWrap}>
        <NotFoundCard
          reason={error ?? "Il a peut-être été supprimé, ou le lien est périmé."}
          onRefresh={() => { retriedRef.current = false; void refetch(); }}
          onBack={() => navigate("/crm")}
        />
      </div>
    );
  }

  const src = CRM_SOURCE_META[lead.source];
  const statusMeta = CRM_STATUS_META[lead.status];
  const isIntentionSource = lead.source === "intention";
  const isConverted = lead.status === "converted";
  const { score, temperature } = computeLeadScore(lead);
  const temp = TEMP_META[temperature];
  const stagnant = isStagnant(lead);

  return (
    <div style={pageWrap}>
      <style>{GRID_STYLES}</style>

      <Link to="/crm" style={backLink}>← Retour au CRM</Link>

      <header style={headerBlock}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <h1 style={nameStyle}>{lead.firstName}</h1>
          <span style={sourceBadge(statusMeta.color)}>{src.emoji} {src.label}</span>
          <span title={`${temp.label} · score ${score}/10`} style={sourceBadge(temp.color)}>
            {temp.emoji} {temp.label} · {score}/10
          </span>
          {stagnant ? (
            <span title={`Aucun mouvement depuis ${stagnationDays(lead)} jour(s)`} style={sourceBadge("var(--ls-text-muted)")}>
              ⏳ {stagnationDays(lead)}j sans mouvement
            </span>
          ) : null}
          {lead.relanceDue ? <span title="Relance due" aria-hidden="true">🔔</span> : null}
          {lead.dormant ? <span title="Endormi" aria-hidden="true">💤</span> : null}
        </div>
        <p style={metaLine}>
          {lead.city ? `${lead.city} · ` : ""}
          Reçu le{" "}
          {new Date(lead.createdAt).toLocaleString("fr-FR", {
            day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
          })}
          {lead.viaName && !isIntentionSource ? ` · via ${lead.viaName}` : ""}
        </p>
        {(lead.contact || (isIntentionSource && lead.parrainPhone)) && (
          <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
            {lead.contact && lead.contactIsPhone ? (
              <a href={`tel:${lead.contact.replace(/\s/g, "")}`} style={contactChip}>📞 {lead.contact}</a>
            ) : null}
            {lead.contact && !lead.contactIsPhone ? (
              <a href={`mailto:${lead.contact}`} style={contactChip}>📧 {lead.contact}</a>
            ) : null}
            {isIntentionSource && lead.parrainPhone ? (
              <a href={`tel:${lead.parrainPhone.replace(/\s/g, "")}`} style={contactChip}>
                📞 parrain ({lead.viaName ?? "client"}) {lead.parrainPhone}
              </a>
            ) : null}
          </div>
        )}
      </header>

      <div style={{ margin: "20px 0 24px" }}>
        <LeadQualificationStepper status={lead.status} />
      </div>

      <div className="cld-grid">
        {/* ── Colonne Analyse ─────────────────────────────────────────── */}
        <div style={colStyle}>
          <h2 style={colTitle}>Analyse</h2>

          {lead.table === "online_bilans" ? (
            bilanRow ? (
              <LeadDetailBilanSections bilan={bilanRow} />
            ) : (
              <div style={hint}>Chargement du détail du bilan…</div>
            )
          ) : lead.table === "prospect_leads" ? (
            <>
              {lead.extra ? <p style={infoLine}>{lead.extra}</p> : null}
              {lead.funnelAnswers ? (
                <FunnelAnswers
                  answers={lead.funnelAnswers}
                  temperature={lead.funnelTemperature}
                  score={lead.funnelScore}
                />
              ) : (
                <div style={hint}>Pas de réponses de questionnaire pour ce lead.</div>
              )}
            </>
          ) : lead.table === "client_referrals" ? (
            <div style={infoLine}>
              <p style={{ margin: 0 }}>
                Recommandé{lead.viaName ? ` par ${lead.viaName}` : ""}.
              </p>
              {lead.contact ? <p style={{ margin: "6px 0 0" }}>Contact transmis : {lead.contact}</p> : null}
            </div>
          ) : (
            // client_referral_intentions
            <div style={infoLine}>
              <p style={{ margin: 0 }}>
                Prénom confié par {lead.viaName ?? "un client"} dans son simulateur VIP
                {lead.extra ? ` (${lead.extra})` : ""}.
              </p>
              <p style={{ margin: "6px 0 0" }}>
                Pas encore de contact direct — utilise le bouton « Demander à… » pour obtenir le
                numéro auprès du parrain.
              </p>
            </div>
          )}
          <div style={{ marginTop: 16 }}>
            <button
              type="button"
              disabled={noalySummaryLoading}
              onClick={() => {
                if (noalySummary) { setNoalySummary(null); return; }
                if (!window.confirm("✨ Noaly va analyser ce lead. Ça consomme des crédits — générer ?")) return;
                void generateNoalySummary();
              }}
              style={secondaryBtn}
            >
              ✨ {noalySummaryLoading ? "Noaly analyse…" : noalySummary ? "Masquer l'analyse" : "Analyser avec Noaly"}
            </button>
            {noalySummary ? (
              <div style={{ marginTop: 10, background: "color-mix(in srgb, var(--ls-purple) 7%, var(--ls-surface2))", border: "0.5px solid color-mix(in srgb, var(--ls-purple) 30%, var(--ls-border))", borderRadius: 10, padding: 12 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "var(--ls-purple)", marginBottom: 6 }}>✨ Analyse de Noaly</div>
                <p style={{ margin: 0, fontSize: 13, lineHeight: 1.55, color: "var(--ls-text)", whiteSpace: "pre-wrap" }}>{noalySummary}</p>
              </div>
            ) : null}
          </div>
        </div>

        {/* ── Colonne Actions ─────────────────────────────────────────── */}
        <div style={colStyle}>
          <h2 style={colTitle}>Actions</h2>

          {isAdmin && tableSupportsAssignment(lead.table) ? (
            <div style={actionBlock}>
              <label style={label} htmlFor="cld-owner">
                Attribution {lead.ownerUserId ? "" : "— non attribué"}
              </label>
              {!lead.ownerUserId && ownerSuggestion ? (
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 8, fontSize: 12.5, color: "var(--ls-text-muted)" }}>
                  <span>
                    💡 Suggestion : <strong style={{ color: "var(--ls-text)" }}>{ownerSuggestion.name}</strong>{" "}
                    ({ownerSuggestion.activeLeadCount} lead{ownerSuggestion.activeLeadCount > 1 ? "s" : ""} actif{ownerSuggestion.activeLeadCount > 1 ? "s" : ""})
                  </span>
                  <button type="button" onClick={() => void handleAssign(ownerSuggestion.id)} style={actionBtn("var(--ls-gold)")}>
                    Assigner
                  </button>
                </div>
              ) : null}
              <select
                id="cld-owner"
                value={lead.ownerUserId ?? ""}
                onChange={(e) => void handleAssign(e.target.value || null)}
                style={selectFull}
              >
                <option value="">— Non attribué —</option>
                {ownerCandidates.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.activeLeadCount} actif{c.activeLeadCount > 1 ? "s" : ""})
                  </option>
                ))}
              </select>
            </div>
          ) : null}

          <div style={actionBlock}>
            <label style={label} htmlFor="cld-status">Statut</label>
            <select
              id="cld-status"
              value={lead.status}
              disabled={savingStatus}
              onChange={(e) => void handleStatusChange(e.target.value as CrmStatus)}
              style={selectFull}
            >
              {statusOptionsFor(lead.table).map((s) => (
                <option key={s} value={s}>{CRM_STATUS_META[s].emoji} {CRM_STATUS_META[s].label}</option>
              ))}
              {!statusOptionsFor(lead.table).includes(lead.status) ? (
                <option value={lead.status}>{statusMeta.emoji} {statusMeta.label}</option>
              ) : null}
            </select>
          </div>

          {lead.table === "online_bilans" ? (
            isConverted && bilanRow?.converted_to_client_id ? (
              <button
                type="button"
                onClick={() => navigate(`/clients/${bilanRow.converted_to_client_id}`)}
                style={primaryBtn}
              >
                ✅ Fiche créée — Ouvrir la fiche →
              </button>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <button type="button" onClick={() => setShowConvert(true)} disabled={!bilanRow} style={primaryBtn}>
                  ✅ Valider le bilan → créer la fiche client
                </button>
                <button type="button" onClick={() => setShowSchedule(true)} disabled={!bilanRow} style={secondaryBtn}>
                  📅 Programmer un RDV
                </button>
              </div>
            )
          ) : !isConverted && lead.status !== "lost" ? (
            <button type="button" onClick={() => setShowAgenda(true)} style={secondaryBtn}>
              📅 Caler un RDV
            </button>
          ) : null}

          <div style={actionBlock}>
            {lastTouch ? (
              <div style={{ fontSize: 11.5, color: "var(--ls-teal)", marginBottom: 8 }}>
                📨 contacté {relativeLeadDays(lastTouch)}
              </div>
            ) : null}
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {isIntentionSource && lead.parrainPhone ? (
                <a
                  href={buildCrmWhatsAppLink(lead.parrainPhone, message)}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={recordTouch}
                  style={actionBtn("#25D366")}
                >
                  📱 Demander à {(lead.viaName ?? "").split(/\s+/)[0] || "ton client"}
                </a>
              ) : null}
              {!isIntentionSource && lead.contactIsPhone ? (
                <>
                  <a
                    href={buildCrmWhatsAppLink(lead.contact, message)}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={recordTouch}
                    style={actionBtn("#25D366")}
                  >
                    📱 WhatsApp
                  </a>
                  <a href={buildCrmSmsLink(lead.contact, message)} onClick={recordTouch} style={actionBtn("var(--ls-teal)")}>
                    💬 SMS
                  </a>
                </>
              ) : null}
              <button
                type="button"
                onClick={() => { recordTouch(); copyMessage(message); }}
                style={actionBtn("var(--ls-gold)")}
              >
                📋 Copier {messageLabel.toLowerCase()}
              </button>
              <button
                type="button"
                disabled={aiLoading}
                onClick={() => {
                  if (!window.confirm("✨ Noaly va rédiger un message personnalisé avec l'IA. Ça consomme des crédits — générer ?")) return;
                  void generateAi();
                }}
                style={actionBtn("var(--ls-purple)")}
              >
                ✨ {aiLoading ? "Noaly écrit…" : "Noaly écrit un message IA"}
              </button>
            </div>

            {aiMessage ? (
              <div style={{ marginTop: 10, background: "var(--ls-surface2)", border: "1px solid var(--ls-border)", borderRadius: 10, padding: 10 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "var(--ls-purple)", marginBottom: 6 }}>
                  ✨ Proposition de Noaly — édite avant d'envoyer
                </div>
                <textarea value={aiMessage} onChange={(e) => setAiMessage(e.target.value)} rows={5} style={aiTextareaStyle} />
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 6 }}>
                  {lead.contactIsPhone ? (
                    <a href={buildCrmWhatsAppLink(lead.contact, aiMessage)} target="_blank" rel="noopener noreferrer" style={actionBtn("#25D366")}>
                      📱 WhatsApp
                    </a>
                  ) : null}
                  <button type="button" onClick={() => copyMessage(aiMessage)} style={actionBtn("var(--ls-gold)")}>📋 Copier</button>
                  <button type="button" onClick={() => setAiMessage(null)} style={actionBtn("var(--ls-text-muted)")}>✕ Fermer</button>
                </div>
              </div>
            ) : null}
          </div>

          {lead.resultToken ? (
            <div style={actionBlock}>
              <label style={label}>Lien Résultat Bilan</label>
              <div style={hint}>
                Sa page premium personnalisée (bilan + programme + caisse). Vérifie-la avant de
                l'envoyer — c'est elle qui déclenche le paiement.
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
                {(() => {
                  const origin = typeof window !== "undefined" ? window.location.origin : "";
                  const link = `${origin}/resultat-bilan/${lead.resultToken}`;
                  const msg = `Coucou ${lead.firstName} 🌿 j'ai préparé ta page perso avec ton bilan complet et le programme qu'on a vu ensemble. Tout est ici (tu peux même démarrer directement) 👉 ${link}\n\nDis-moi si tu as la moindre question, je suis là 💛\n${msgCtx.coachFirstName}`;
                  return (
                    <>
                      <a href={link} target="_blank" rel="noopener noreferrer" style={actionBtn("var(--ls-purple, #8b5cf6)")}>
                        👁️ Voir la page (vérif)
                      </a>
                      <button type="button" onClick={() => { recordTouch(); copyMessage(msg); }} style={actionBtn("var(--ls-gold)")}>
                        📋 Copier le message + lien
                      </button>
                      {lead.contactIsPhone ? (
                        <a href={buildCrmWhatsAppLink(lead.contact, msg)} target="_blank" rel="noopener noreferrer" onClick={() => recordTouch()} style={actionBtn("#25D366")}>
                          📱 WhatsApp
                        </a>
                      ) : null}
                      <button type="button" onClick={() => { recordTouch(); copyMessage(link); }} style={actionBtn("var(--ls-teal)")}>
                        🔗 Copier le lien seul
                      </button>
                    </>
                  );
                })()}
              </div>
            </div>
          ) : null}

          <div style={actionBlock}>
            <label style={label}>Templates de réponse</label>
            <CrmResponsePanel
              lead={lead}
              msgCtx={msgCtx}
              onAfterSend={(next) => {
                // Ne bump le statut que si le lead est encore "new" — un
                // envoi sur un lead déjà avancé (qualifié...) ne doit pas le
                // faire régresser (même garde que l'ex-LeadDetailModal).
                if (lead.status === "new") void handleStatusChange(next);
              }}
            />
          </div>

          <div style={actionBlock}>
            <label style={label} htmlFor="cld-notes">Notes coach {savingNotes ? "· enregistrement…" : ""}</label>
            {tableHasNotes(lead.table) ? (
              <textarea
                id="cld-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                onBlur={() => void handleNotesBlur()}
                rows={4}
                style={textareaFull}
                placeholder="Suivi, fil de discussion, contexte personnel…"
              />
            ) : (
              <div style={hint}>Pas de champ notes pour ce type de lead.</div>
            )}
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {lead.dormant ? (
              <button type="button" onClick={() => void setDormant(lead, false)} style={cardActionBtn}>☀️ Réveiller</button>
            ) : (
              <button type="button" onClick={() => void setDormant(lead, true)} style={cardActionBtn} title="Mettre de côté — sort du flux, plus de relance">
                💤 Endormir
              </button>
            )}
            {isAdmin ? (
              <button
                type="button"
                disabled={deleting}
                onClick={() => void handleDelete()}
                style={{ ...cardActionBtn, color: "var(--ls-coral)", borderColor: "color-mix(in srgb, var(--ls-coral) 35%, var(--ls-border))" }}
              >
                {deleting ? "Suppression…" : "🗑 Supprimer"}
              </button>
            ) : null}
          </div>
        </div>
      </div>

      {showConvert && bilanRow ? (
        <LeadConvertModal
          bilan={bilanRow}
          onClose={() => setShowConvert(false)}
          onConverted={async (clientId) => {
            await onlineBilans.convertLead(bilanRow.id, clientId);
            await onlineBilans.refetch();
            await refetch();
            pushToast({ tone: "success", title: "Lead converti", message: "Fiche client créée ✅" });
          }}
        />
      ) : null}

      {showSchedule && bilanRow ? (
        <LeadScheduleModal
          bilan={bilanRow}
          onClose={() => setShowSchedule(false)}
          onScheduled={async () => {
            if (bilanRow.lead_status === "new") {
              await updateStatus(lead, "contacted");
            }
          }}
        />
      ) : null}

      {showAgenda ? (
        <ProspectFormModal
          prefill={{
            firstName: lead.firstName,
            phone: lead.contactIsPhone ? lead.contact ?? undefined : undefined,
            source: lead.source === "reco-client" || lead.source === "intention" ? "Parrainage" : "Autre",
            sourceDetail: `CRM · ${src.label}${lead.viaName ? ` (via ${lead.viaName})` : ""}`,
            note: lead.notes ?? undefined,
          }}
          onClose={() => setShowAgenda(false)}
          onSaved={async () => {
            setShowAgenda(false);
            const next: CrmStatus = statusOptionsFor(lead.table).includes("qualified") ? "qualified" : "contacted";
            await updateStatus(lead, next);
            pushToast({
              tone: "success",
              title: "RDV créé",
              message: `${lead.firstName} est dans l'agenda — lead passé en ${CRM_STATUS_META[next].label}.`,
            });
          }}
        />
      ) : null}
    </div>
  );
}

function NotFoundCard({
  reason,
  onRefresh,
  onBack,
}: {
  reason: string;
  onRefresh: () => void;
  onBack: () => void;
}) {
  return (
    <div style={notFoundCard}>
      <p style={{ fontSize: 15, color: "var(--ls-text)", margin: 0, fontWeight: 600 }}>
        Lead introuvable ou accès indisponible.
      </p>
      <p style={{ fontSize: 13, color: "var(--ls-text-muted)", margin: "6px 0 16px" }}>{reason}</p>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <button type="button" onClick={onRefresh} style={primaryBtn}>Rafraîchir</button>
        <button type="button" onClick={onBack} style={secondaryBtn}>← Retour au CRM</button>
      </div>
    </div>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────────

const GRID_STYLES = `
  .cld-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 24px;
  }
  @media (min-width: 900px) {
    .cld-grid {
      grid-template-columns: 1.15fr 0.85fr;
      align-items: start;
    }
  }
`;

const pageWrap: React.CSSProperties = {
  maxWidth: 1080,
  margin: "0 auto",
  padding: "20px 16px 60px",
  fontFamily: "DM Sans, sans-serif",
};

const backLink: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  fontSize: 13,
  fontWeight: 600,
  color: "var(--ls-text-muted)",
  textDecoration: "none",
  marginBottom: 16,
};

const headerBlock: React.CSSProperties = {};

const nameStyle: React.CSSProperties = {
  fontFamily: "Syne, Inter, sans-serif",
  fontSize: 26,
  fontWeight: 700,
  color: "var(--ls-text)",
  margin: 0,
};

function sourceBadge(color: string): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    gap: 4,
    padding: "4px 11px",
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 600,
    background: `color-mix(in srgb, ${color} 14%, transparent)`,
    color,
  };
}

const metaLine: React.CSSProperties = {
  fontSize: 13,
  color: "var(--ls-text-muted)",
  margin: "6px 0 0",
};

const contactChip: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 4,
  padding: "5px 10px",
  borderRadius: 999,
  background: "color-mix(in srgb, var(--ls-teal) 10%, transparent)",
  color: "var(--ls-teal)",
  fontSize: 12.5,
  fontWeight: 600,
  textDecoration: "none",
  border: "1px solid color-mix(in srgb, var(--ls-teal) 25%, transparent)",
};

const colStyle: React.CSSProperties = {
  background: "var(--ls-surface)",
  border: "1px solid var(--ls-border)",
  borderRadius: 14,
  padding: 18,
};

const colTitle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.06em",
  color: "var(--ls-gold)",
  margin: "0 0 14px",
};

const actionBlock: React.CSSProperties = {
  marginTop: 16,
};

const label: React.CSSProperties = {
  display: "block",
  fontSize: 12,
  fontWeight: 600,
  color: "var(--ls-text-muted)",
  marginBottom: 6,
};

const infoLine: React.CSSProperties = {
  fontSize: 13.5,
  lineHeight: 1.5,
  color: "var(--ls-text)",
};

const hint: React.CSSProperties = {
  fontSize: 13,
  color: "var(--ls-text-muted)",
  fontStyle: "italic",
};

const selectFull: React.CSSProperties = {
  width: "100%",
  height: 38,
  padding: "0 10px",
  borderRadius: 9,
  border: "1px solid var(--ls-border)",
  background: "var(--ls-surface2)",
  color: "var(--ls-text)",
  fontSize: 13.5,
  fontWeight: 600,
  fontFamily: "DM Sans, sans-serif",
  cursor: "pointer",
};

const textareaFull: React.CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  minHeight: 90,
  padding: "10px 12px",
  border: "1px solid var(--ls-border)",
  borderRadius: 10,
  background: "var(--ls-surface2)",
  color: "var(--ls-text)",
  fontFamily: "inherit",
  fontSize: 13.5,
  resize: "vertical",
};

const aiTextareaStyle: React.CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  borderRadius: 8,
  border: "1px solid var(--ls-border)",
  background: "var(--ls-surface)",
  color: "var(--ls-text)",
  fontSize: 12.5,
  lineHeight: 1.5,
  fontFamily: "DM Sans, sans-serif",
  resize: "vertical",
  outline: "none",
  padding: 8,
};

const primaryBtn: React.CSSProperties = {
  padding: "12px 16px",
  border: "none",
  borderRadius: 11,
  background: "var(--ls-gold)",
  color: "var(--ls-gold-contrast, #0B0D11)",
  fontFamily: "Syne, sans-serif",
  fontSize: 13.5,
  fontWeight: 700,
  cursor: "pointer",
};

const secondaryBtn: React.CSSProperties = {
  padding: "11px 16px",
  border: "1px solid color-mix(in srgb, var(--ls-teal) 40%, var(--ls-border))",
  borderRadius: 11,
  background: "color-mix(in srgb, var(--ls-teal) 8%, var(--ls-surface2))",
  color: "var(--ls-teal)",
  fontFamily: "Syne, sans-serif",
  fontSize: 13.5,
  fontWeight: 700,
  cursor: "pointer",
};

function actionBtn(color: string): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: "7px 11px",
    borderRadius: 8,
    border: `1px solid color-mix(in srgb, ${color} 35%, var(--ls-border))`,
    background: `color-mix(in srgb, ${color} 8%, var(--ls-surface))`,
    color,
    fontSize: 12,
    fontWeight: 600,
    fontFamily: "DM Sans, sans-serif",
    textDecoration: "none",
    cursor: "pointer",
  };
}

const cardActionBtn: React.CSSProperties = {
  padding: "8px 12px",
  borderRadius: 8,
  border: "0.5px solid var(--ls-border)",
  background: "var(--ls-surface2)",
  color: "var(--ls-text-muted)",
  fontSize: 12,
  fontWeight: 600,
  cursor: "pointer",
  fontFamily: "DM Sans, sans-serif",
};

const notFoundCard: React.CSSProperties = {
  background: "var(--ls-surface)",
  border: "1px solid var(--ls-border)",
  borderRadius: 14,
  padding: 22,
  maxWidth: 480,
};
