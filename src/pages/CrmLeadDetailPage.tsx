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

import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useAppContext } from "../context/AppContext";
import { useToast } from "../context/ToastContext";
import { CRM_SOURCE_META, CRM_STATUS_META, parseCrmLeadKey, prenomProvenance, provenanceTexte, statusOptionsFor, tableHasNotes, useCrmLeads, type CrmLead, type CrmStatus, objectifLabel } from "../hooks/useCrmLeads";
import { useOnlineBilans } from "../hooks/useOnlineBilans";
import type { OnlineBilanRow } from "../hooks/useOnlineBilans";
import { useLeadQuickActions } from "../hooks/useLeadQuickActions";
import { getSupabaseClient } from "../services/supabaseClient";
import { buildCrmMailLink, buildCrmSmsLink, buildCrmWhatsAppLink, objetPourLead } from "../lib/crmMessages";
import { relativeLeadDays } from "../lib/leadDateFormat";
import { computeLeadScore, TEMP_META } from "../lib/leadScoring";
import { isStagnant, stagnationDays } from "../lib/leadActivity";
import { suggestOwner, tableSupportsAssignment, type OwnerCandidate } from "../lib/leadRouting";
import { LeadQualificationStepper } from "../components/leads/LeadQualificationStepper";
import { CrmResponsePanel } from "../components/crm/CrmResponsePanel";
import { LeadDetailBilanSections } from "../components/leads/LeadDetailBilanSections";
import { FunnelAnswers } from "../components/crm/FunnelAnswers";
import { LeadConvertModal } from "../components/leads/LeadConvertModal";
// ── La MÊME question que l'agenda, posée ici aussi (02/09) ───────────────────
//
// Thomas, après le rendez-vous de Gaëlle : « la notif du CRM ouvre une modale
// […] on manque réellement d'information sur le membre, pas de valeur complète
// ni de carte choisie. À l'inverse sur l'agenda on peut qualifier : elle démarre
// BBC ou suivi classique. Les deux sources ne se parlent pas et sont
// diamétralement différentes. »
//
// Elles l'étaient : `LeadConvertModal` ne contient NI `ebe_bbc` NI `member_card`
// — elle ne sait pas que le club existe. Elle crée une fiche classique, point.
// L'agenda, lui, pose la question puis route vers le bon outil.
//
// On ne réécrit rien : on met la MÊME feuille devant, et la branche « club »
// mène à la MÊME feuille membre (fiche + bilan, drapeau club, accès + QR,
// cœurs, carte). Une feature, un seul endroit.
import { QualifierRdvSheet } from "../components/agenda/QualifierRdvSheet";
import { useBbcMode } from "../features/bbc/useBbcMode";
const BbcNewMemberSheet = lazy(() =>
  import("../features/bbc/BbcNewMemberSheet").then((m) => ({ default: m.BbcNewMemberSheet })),
);
import { LeadScheduleModal } from "../components/leads/LeadScheduleModal";
import { ProspectFormModal } from "../components/prospect/ProspectFormModal";
import { MoveClubBookingDialog } from "../components/crm/MoveClubBookingDialog";
import { EtatRdvBloc } from "../components/crm/EtatRdvBloc";
import { RepondreParMailModal } from "../components/crm/RepondreParMailModal";
import { EtapesLead } from "../components/crm/EtapesLead";
import { FeuilleQualification } from "../features/crm/FeuilleQualification";
import { estQualifiable } from "../features/crm/ecrireQualification";
import { etapesDuLead, etatRdvDe } from "../features/crm/etapes";
import { setRdvBookingStatus } from "../services/sb/rdvBookingStatus";
import { dateDeRetour, quandRevient, REPONSE_PAR_CLE, type Reponse } from "../features/crm/qualification";

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
  phone: null,
  email: null,
  city: null,
  source: "welcome",
  status: "new",
  relanceDueAt: null,
  derniereReponse: null,
  viaName: null,
  parrainPhone: null,
  parrainClientId: null,
  extra: null,
  ownerUserId: null,
  relanceDue: false,
  resultToken: null,
  callbackRequestedAt: null,
  engagement: null,
  createdAt: new Date(0).toISOString(),
  contactedAt: null,
  notes: null,
};

/**
 * Un `prospect_lead` présenté sous la forme que `LeadConvertModal` sait lire.
 *
 * Même motif que `bilanSyntheseDepuisRdv` dans l'agenda : plutôt qu'un second
 * formulaire de création (avec sa propre dérive), on parle à celui qui existe.
 * Les champs qu'un lead du club ne porte pas (taille, poids, motivation)
 * restent nuls — la modale les demande, et le bilan complet se fait ensuite.
 */
function bilanDepuisProspectLead(lead: CrmLead): OnlineBilanRow {
  return {
    id: lead.id,
    coach_user_id: lead.ownerUserId,
    coach_slug: lead.coachSlug ?? null,
    first_name: lead.firstName,
    age: lead.bilanAge ?? null,
    height_cm: null,
    city: lead.city,
    phone: lead.phone ?? (lead.contactIsPhone ? lead.contact : null),
    email: lead.email ?? (lead.contactIsPhone ? null : lead.contact),
    objectives: lead.objectif ? [lead.objectif] : [],
    weight_loss_target_kg: lead.bilanWeightTarget ?? null,
    current_weight_kg: null,
    motivation_score: lead.bilanMotivation ?? null,
    // La modale y cherche le nom de famille pour préremplir son champ obligatoire.
    payload: lead.lastName ? { last_name: lead.lastName } : {},
    lead_status: "new",
    converted_to_client_id: null,
    converted_at: null,
    assigned_to_user_id: lead.ownerUserId,
    notes: lead.notes,
    contacted_at: lead.contactedAt,
    relance_due_at: lead.relanceDueAt,
    relance_done_at: null,
    derniere_reponse: lead.derniereReponse,
    result_token: null,
    callback_requested_at: lead.callbackRequestedAt,
    engagement: lead.engagement,
    created_at: lead.createdAt,
    completed_at: lead.createdAt,
  } as unknown as OnlineBilanRow;
}

export function CrmLeadDetailPage() {
  const { leadId } = useParams<{ leadId: string }>();
  const navigate = useNavigate();
  const { currentUser, users } = useAppContext();
  const { push: pushToast } = useToast();

  const { leads, loading, error, refetch, qualifier, updateStatus, updateNotes, assignOwner, setDormant, deleteLead } = useCrmLeads();
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

  const [feuilleOuverte, setFeuilleOuverte] = useState(false);
  const [savingStatus, setSavingStatus] = useState(false);
  const [savingNotes, setSavingNotes] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showConvert, setShowConvert] = useState(false);
  /**
   * Par où passe la conversion : la question d'abord, puis le club ou le
   * classique. `choix` tant qu'on n'a pas répondu.
   *
   * ⚠️ On ne pose la question QUE si un club est lisible. Les dix distributeurs
   * hors club n'ont rien à répondre à « elle prend sa carte de membre » : pour
   * eux l'écran ne bouge pas d'un pixel, la modale s'ouvre comme avant. Zéro
   * régression sur ceux qui n'ont jamais vu le BBC.
   */
  const [voieConvert, setVoieConvert] = useState<"choix" | "membre" | "classique">("choix");
  const bbc = useBbcMode(currentUser?.id, isAdmin);
  const clubActif = bbc.activeClub;
  const ouvrirConversion = () => {
    setVoieConvert(clubActif ? "choix" : "classique");
    setShowConvert(true);
  };
  const fermerConversion = () => {
    setShowConvert(false);
    setVoieConvert("choix");
  };

  /**
   * Ranger le lead une fois la fiche créée — quel que soit le chemin.
   *
   * La branche « club » écrit sa fiche elle-même (feuille membre) ; sans ce
   * rangement, le lead resterait « à convertir » pour toujours et le rendez-vous
   * reviendrait dans « À conclure » alors que la personne a sa carte en main.
   * Même garde-fou que la branche classique : on n'écrase jamais une conversion
   * déjà faite, sinon la première fiche devient orpheline.
   */
  async function apresConversion(clientId: string) {
    if (!lead) return;
    if (lead.table === "online_bilans" && bilanRow) {
      await onlineBilans.convertLead(bilanRow.id, clientId);
      await onlineBilans.refetch();
    } else if (lead.table === "prospect_leads") {
      const sb = await getSupabaseClient();
      if (sb) {
        const { error } = await sb
          .from("prospect_leads")
          .update({
            status: "converted",
            converted_to_client_id: clientId,
            converted_at: new Date().toISOString(),
            relance_due_at: null,
            relance_done_at: new Date().toISOString(),
          })
          .eq("id", lead.id)
          .is("converted_to_client_id", null)
          .select("id");
        if (error) {
          pushToast({ tone: "warning", title: "Fiche creee, lead non range", message: error.message });
        }
      }
    }
    await refetch();
    fermerConversion();
    pushToast({ tone: "success", title: "Membre du club créé", message: "Fiche, bilan et carte enregistrés" });
  }
  // Ouverture directe du modal de conversion depuis la LISTE (bouton « Convertir »
  // → /crm/leads/:id?convert=1). On ouvre une seule fois, dès que le bilan est
  // chargé et pas déjà converti, puis on nettoie le param.
  const [searchParams, setSearchParams] = useSearchParams();
  const convertAutoRef = useRef(false);
  useEffect(() => {
    if (convertAutoRef.current) return;
    if (searchParams.get("convert") !== "1") return;
    // ⚠️ 31/08 — CE GARDE EXIGEAIT UN BILAN EN LIGNE, DONC IL BLOQUAIT TOUT LE RESTE.
    //
    // Trouvé par la revue d'avant-prod : `bilanRow` est null pour toute table
    // autre que `online_bilans`. Or « Venue · elle démarre », dans « À conclure »,
    // renvoie ici avec ?convert=1 — et la MAJORITÉ des rendez-vous du club sont
    // des `prospect_leads`. La modale ne s'ouvrait donc jamais pour eux : aucune
    // fiche cliente créée, le lead restait non converti, et le rendez-vous venait
    // d'être marqué « honored » — donc il disparaissait de « À conclure ». La
    // seule porte qui posait la question se refermait sans rien produire.
    //
    // La modale prospect_leads existait pourtant juste en dessous ; elle n'était
    // atteignable qu'en cliquant le bouton à la main.
    const dejaConverti =
      lead?.table === "online_bilans"
        ? Boolean(bilanRow?.converted_to_client_id)
        : Boolean(lead?.convertedClientId);
    const pretAConvertir =
      lead?.table === "online_bilans" ? Boolean(bilanRow) : lead?.table === "prospect_leads";
    if (!pretAConvertir || dejaConverti) return;
    convertAutoRef.current = true;
    ouvrirConversion();
    const next = new URLSearchParams(searchParams);
    next.delete("convert");
    setSearchParams(next, { replace: true });
  }, [searchParams, bilanRow, lead, setSearchParams]);
  const [showSchedule, setShowSchedule] = useState(false);
  const [showAgenda, setShowAgenda] = useState(false);
  const [showMove, setShowMove] = useState(false);
  const [showMail, setShowMail] = useState(false);
  const [annulationRdv, setAnnulationRdv] = useState(false);
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

  // « Et alors ? » sur la fiche : c'est ici qu'on atterrit après avoir appelé
  // quelqu'un, donc c'est ici que la question doit être posée. Le menu
  // « Statut » juste en dessous reste pour les corrections à la main — mais il
  // ne cale aucune date, et c'est bien pour ça qu'il ne suffisait pas.
  async function handleQualifier(reponse: Reponse) {
    if (!lead) return;
    setFeuilleOuverte(false);
    const err = await qualifier(lead, reponse);
    if (err) {
      pushToast({ tone: "error", title: "Qualification non enregistrée", message: err });
      return;
    }
    const due = dateDeRetour(reponse, new Date());
    pushToast({
      tone: "success",
      title: `${lead.firstName} · ${reponse.titre}`,
      message: due
        ? `Revient ${quandRevient(due, new Date())} — tu n'as rien à noter.`
        : reponse.quand,
    });
  }

  // Annuler le rendez-vous. Le chemin passe par `setRdvBookingStatus`, seul
  // endroit autorisé à toucher le statut d'une réservation (il porte l'email
  // d'acceptation ; à l'annulation, décision Thomas du 11/08 : aucun mail
  // automatique, on décroche son téléphone).
  async function handleAnnulerRdv() {
    if (!lead?.rdv || annulationRdv) return;
    const ok = window.confirm(
      `Annuler le rendez-vous de ${lead.firstName} (${lead.rdv.label}) ?\n\n` +
        "Aucun message ne part automatiquement : préviens-le·la toi-même.",
    );
    if (!ok) return;
    setAnnulationRdv(true);
    try {
      const { error: err } = await setRdvBookingStatus(lead.rdv.id, "canceled");
      if (err) {
        pushToast({ tone: "error", title: "Annulation", message: "Le rendez-vous n'a pas pu être annulé." });
        return;
      }
      await refetch();
      pushToast({
        tone: "success",
        title: "Rendez-vous annulé",
        message: `Le créneau est libéré. Préviens ${lead.firstName} — rien n'est parti automatiquement.`,
      });
    } finally {
      setAnnulationRdv(false);
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
  // L'instant de rendu suffit : la fiche est relue à chaque navigation, et un
  // rendez-vous ne bascule de « à venir » à « passé » qu'une fois dans sa vie.
  const maintenant = new Date();
  const etatRdv = etatRdvDe(lead.rdv, maintenant);
  const etapes = etapesDuLead(
    {
      prenom: lead.firstName,
      status: lead.status,
      contactedAt: lead.contactedAt,
      derniereReponse: lead.derniereReponse,
      relanceDueAt: lead.relanceDueAt,
      rdv: etatRdv,
      abandonAvantCreneau: Boolean(lead.abandonAvantCreneau),
      peutConvertir: lead.table === "online_bilans" || lead.table === "prospect_leads",
      dormant: Boolean(lead.dormant),
    },
    maintenant,
  );
  // Le prénom cité par la personne. Deux saisies possibles, une seule chose à
  // l'écran : les lignes du 16/08 portent un identifiant de compte (résolu ici
  // dans la liste des membres déjà chargée), celles d'après portent le prénom
  // tel qu'il a été tapé dans le tunnel. Aucune marque ne les distingue — cf.
  // `prenomProvenance` pour le pourquoi.
  const provenanceLibelle = provenanceTexte(
    lead.provenanceCanal,
    prenomProvenance(
      lead.provenancePar ? (users ?? []).find((u) => u.id === lead.provenancePar)?.name?.split(/\s+/)[0] ?? null : null,
      lead.provenanceLibre,
    ),
  );
  const isIntentionSource = lead.source === "intention";
  const isConverted = lead.status === "converted";
  const { score, temperature, raison } = computeLeadScore(lead);
  const temp = TEMP_META[temperature];
  const stagnant = isStagnant(lead);

  return (
    <div style={pageWrap}>
      <style>{GRID_STYLES}</style>

      <Link to="/crm" style={backLink}>← Retour au CRM</Link>

      <header style={headerBlock}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          {/* Nom de famille compris : il était en base pour les leads du tunnel
              club et n'apparaissait NULLE PART à l'écran (demande Thomas 16/08). */}
          <h1 style={nameStyle}>
            {lead.firstName}
            {lead.lastName ? ` ${lead.lastName}` : ""}
          </h1>
          <span style={sourceBadge(statusMeta.color)}>{src.emoji} {src.label}</span>
          {/* Le nombre sur 10 ne disait pas quoi faire : « Froid · 3/10 » sur
              quelqu'un qui vient de laisser son numéro. On affiche la RAISON ;
              le score reste en infobulle, il sert surtout au tri. */}
          <span title={`Score ${score}/10`} style={sourceBadge(temp.color)}>
            {temp.emoji} {temp.label} · {raison}
          </span>
          {stagnant ? (
            <span title={`Aucun mouvement depuis ${stagnationDays(lead)} jour(s)`} style={sourceBadge("var(--ls-text-muted)")}>
              ⏳ {stagnationDays(lead)}j sans mouvement
            </span>
          ) : null}
          {/* D'où vient cette personne — sa propre réponse, donnée au moment de
              réserver son créneau. C'est la seule façon de savoir qui a
              distribué le flyer : le QR imprimé est le même pour toute
              l'équipe. */}
          {provenanceLibelle ? (
            <span
              title="Réponse donnée par la personne au moment de réserver son créneau — mention, pas attribution"
              style={sourceBadge("var(--ls-lime)")}
            >
              {provenanceLibelle}
            </span>
          ) : null}
          {lead.callbackRequestedAt ? <span title="A demandé à être rappelé" aria-hidden="true">📞</span> : null}
          {lead.relanceDue ? <span title="Relance due" aria-hidden="true">🔔</span> : null}
          {lead.dormant ? <span title="Endormi" aria-hidden="true">💤</span> : null}
        </div>
        {lead.callbackRequestedAt ? (
          // Signal fort : le lead a cliqué « rappelle-moi » sur sa page Résultat
          // Bilan. On le met en avant tout en haut de la fiche — c'est l'action
          // n°1 à faire sur ce lead.
          <div
            style={{
              marginTop: 12,
              padding: "10px 14px",
              borderRadius: 10,
              background: "color-mix(in srgb, var(--ls-teal) 12%, transparent)",
              border: "1px solid color-mix(in srgb, var(--ls-teal) 40%, transparent)",
              color: "var(--ls-text)",
              fontSize: 13.5,
              fontWeight: 600,
            }}
          >
            📞 {lead.firstName} a demandé à être rappelé —{" "}
            {new Date(lead.callbackRequestedAt).toLocaleString("fr-FR", {
              day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
            })}
            . À contacter en priorité.
            {lead.engagement ? (
              // Lead scoring : ce que le lead a fait sur la page Résultat Bilan
              // (intention, formule cliquée, détail calcul, add-on, temps) → aide
              // à savoir avec quel angle relancer.
              <div style={{ marginTop: 8, fontWeight: 400, fontSize: 12.5, color: "var(--ls-text-muted)" }}>
                <strong style={{ color: lead.engagement.tier === "chaud" ? "var(--ls-lime, #c5f82a)" : "var(--ls-teal)" }}>
                  {lead.engagement.tier === "chaud" ? "🔥 Lead chaud" : lead.engagement.tier === "tiede" ? "Lead tiède" : "Lead froid"} · {lead.engagement.score}/100
                </strong>
                {lead.engagement.signals.length > 0 ? ` — ${lead.engagement.signals.join(" · ")}` : ""}
              </div>
            ) : null}
          </div>
        ) : null}
        <p style={metaLine}>
          {lead.city ? `${lead.city} · ` : ""}
          Reçu le{" "}
          {new Date(lead.createdAt).toLocaleString("fr-FR", {
            day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
          })}
          {lead.viaName && !isIntentionSource ? ` · via ${lead.viaName}` : ""}
        </p>
        {/* Ce qu'on sait de lui — tout était déjà en base, et déjà dans le mail
            de réservation, mais nulle part à l'écran (audit 2026-08-11). Le
            bloc ne s'affiche que s'il a quelque chose à dire. */}
        {/* Le créneau et l'abandon ont quitté ce bloc : ils sont devenus L'ÉTAT
            de la fiche, juste en dessous. Les laisser ici en plus, c'était le
            même rendez-vous écrit à deux endroits de la même page. */}
        {(lead.objectif || lead.peopleCount === 2 || lead.coachSlug) ? (
          <div style={{
            marginTop: 12, padding: "12px 14px", borderRadius: 12,
            background: "var(--ls-surface2)",
            border: "1px solid var(--ls-border)",
            fontSize: 13, lineHeight: 1.6, color: "var(--ls-text-muted)",
          }}>
            {lead.objectif ? <div><strong style={{ color: "var(--ls-text)" }}>Objectif</strong> · {objectifLabel(lead.objectif)}</div> : null}
            {lead.peopleCount === 2 ? (
              <div>
                <strong style={{ color: "var(--ls-text)" }}>Vient à deux</strong>
                {lead.partnerName ? ` · avec ${lead.partnerName}` : ""}
                {lead.partnerObjectif ? ` (${objectifLabel(lead.partnerObjectif)})` : ""}
              </div>
            ) : null}
            {lead.coachSlug ? <div><strong style={{ color: "var(--ls-text)" }}>Club visé</strong> · {lead.coachSlug}</div> : null}
            {/* Le consentement n'est PAS montré ici. La colonne existe, mais
                seuls le colis, Business et la boutique la remplissent :
                /reserver ne pose jamais la question, donc `false` y veut dire
                « jamais demandé », pas « a refusé ». L'afficher fabriquerait
                une information fausse (audit 2026-08-11). */}
          </div>
        ) : null}
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

      {/* L'ÉTAT, une seule fois, avec un seul jeu de boutons. Cf. EtatRdvBloc :
          c'est ce bloc qui a remplacé les trois représentations concurrentes du
          même rendez-vous. */}
      <EtatRdvBloc
        lead={lead}
        etat={etatRdv}
        telHref={lead.contactIsPhone && lead.contact ? `tel:${lead.contact.replace(/\s/g, "")}` : null}
        whatsAppHref={lead.contactIsPhone && lead.contact ? buildCrmWhatsAppLink(lead.contact, message) : null}
        onPoserRdv={() => (lead.table === "online_bilans" && bilanRow ? setShowSchedule(true) : setShowAgenda(true))}
        onDeplacer={() => setShowMove(true)}
        onAnnuler={() => void handleAnnulerRdv()}
        annulationEnCours={annulationRdv}
        peutModifierLeRdv={isAdmin}
      />

      <div style={{ margin: "20px 0 24px" }}>
        <LeadQualificationStepper status={lead.status} />
      </div>

      <div className="cld-grid">
        {/* ── Colonne gauche : ce qu'il faut faire, puis ce qu'on sait ──── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <EtapesLead etapes={etapes} />
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
              {lead.colisAnswers ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 4 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 700, color: "var(--ls-text)", fontFamily: "DM Sans, sans-serif" }}>
                    💬 Ses réponses ({Object.keys(lead.colisAnswers).length})
                  </div>
                  {Object.entries(lead.colisAnswers).map(([q, a]) => (
                    <div key={q} style={{ display: "flex", alignItems: "baseline", gap: 8, fontSize: 12, lineHeight: 1.4 }}>
                      <span style={{ flex: "0 0 auto", color: "var(--ls-text-hint)", minWidth: 118 }}>{q}</span>
                      <span style={{ color: "var(--ls-text)", fontWeight: 600 }}>{a}</span>
                    </div>
                  ))}
                </div>
              ) : lead.funnelAnswers ? (
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
        </div>
        </div>

        {/* ── Colonne droite : Noaly d'abord, puis les actions ──────────── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {/* Noaly était tout en bas de la colonne de gauche, sous le détail du
            bilan — hors de vue sur un téléphone. Remonté ici à la demande de
            Thomas (16/08) : c'est la première chose à faire avant d'appeler. */}
        <div style={noalyCard}>
          <h2 style={{ ...colTitle, color: "var(--ls-purple)", margin: "0 0 3px" }}>✨ Noaly</h2>
          <p style={{ margin: "0 0 12px", fontSize: 12.5, lineHeight: 1.5, color: "var(--ls-text-hint)" }}>
            {noalySummary
              ? "Ce que Noaly retient de cette fiche."
              : "Noaly lit tout ce qu'on sait de cette personne et te prépare quoi dire au téléphone."}
          </p>
          <button
            type="button"
            disabled={noalySummaryLoading}
            onClick={() => {
              if (noalySummary) { setNoalySummary(null); return; }
              if (!window.confirm("✨ Noaly va analyser ce lead. Ça consomme des crédits — générer ?")) return;
              void generateNoalySummary();
            }}
            style={noalyBtn}
          >
            ✨ {noalySummaryLoading ? "Noaly analyse…" : noalySummary ? "Masquer l'analyse" : "Préparer mon appel"}
          </button>
          {noalySummary ? (
            <div style={{ marginTop: 10, background: "color-mix(in srgb, var(--ls-purple) 7%, var(--ls-surface2))", border: "0.5px solid color-mix(in srgb, var(--ls-purple) 30%, var(--ls-border))", borderRadius: 10, padding: 12 }}>
              <p style={{ margin: 0, fontSize: 13, lineHeight: 1.55, color: "var(--ls-text)", whiteSpace: "pre-wrap" }}>{noalySummary}</p>
            </div>
          ) : null}
        </div>

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
                  <button type="button" onClick={() => void handleAssign(ownerSuggestion.id)} style={actionBtn("var(--ls-teal)")}>
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

          {estQualifiable(lead.table) ? (
            <div style={actionBlock}>
              <label style={label}>Après ton appel</label>
              {feuilleOuverte ? (
                <FeuilleQualification
                  prenom={lead.firstName}
                  onChoisir={(r) => void handleQualifier(r)}
                  onIgnorer={() => setFeuilleOuverte(false)}
                />
              ) : (
                <>
                  <button type="button" onClick={() => setFeuilleOuverte(true)} style={primaryBtn}>
                    🎯 Et alors ? — dire ce qui s'est passé
                  </button>
                  {lead.derniereReponse ? (
                    <p style={{ margin: "8px 0 0", fontSize: 12, color: "var(--ls-text-muted)" }}>
                      Dernière fois : {REPONSE_PAR_CLE[lead.derniereReponse].resume}
                      {lead.relanceDueAt
                        ? ` · revient ${quandRevient(lead.relanceDueAt, new Date())}`
                        : ""}
                    </p>
                  ) : null}
                </>
              )}
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
                <button type="button" onClick={() => ouvrirConversion()} disabled={!bilanRow} style={primaryBtn}>
                  ✅ Valider le bilan → créer la fiche client
                </button>
              </div>
            )
          ) : lead.table === "prospect_leads" ? (
            lead.convertedClientId ? (
              <button
                type="button"
                onClick={() => navigate(`/clients/${lead.convertedClientId}`)}
                style={primaryBtn}
              >
                ✅ Fiche créée — Ouvrir la fiche →
              </button>
            ) : (
              <button type="button" onClick={() => ouvrirConversion()} style={primaryBtn}>
                ✅ Valider → créer la fiche client
              </button>
            )
          ) : null}
          {/* « Caler un RDV » a quitté cette colonne. Il vivait ici EN PLUS du
              rendez-vous affiché plus haut : sur la fiche de quelqu'un qui
              venait de réserver, un clic créait un second rendez-vous. Poser un
              créneau se fait désormais depuis le bloc d'état, et seulement
              quand il n'y en a pas déjà un. */}

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
              {/* Répondre par mail. Sur les fiches sans téléphone — 4 bilans en
                  ligne sur 11 — c'était le SEUL bouton manquant : le message
                  était déjà rédigé juste là, mais il fallait copier l'adresse,
                  ouvrir sa messagerie, puis revenir chercher le texte. */}
              {!isIntentionSource && lead.contact && !lead.contactIsPhone ? (
                <>
                  {/* Le mail part de l'app, à l'identité de la maison d'où vient
                      la personne — club ou La Base 360 — avec la signature du
                      coach. Le `mailto:` reste juste à côté pour les fois où on
                      veut écrire vite depuis sa propre boîte. */}
                  <button type="button" onClick={() => setShowMail(true)} style={actionBtn("var(--ls-teal)")}>
                    ✉️ Répondre par mail
                  </button>
                  <a
                    href={buildCrmMailLink(lead.contact, message, objetPourLead(lead, msgCtx))}
                    onClick={recordTouch}
                    title="Ouvrir ta messagerie avec le message pré-rempli, sans mise en forme"
                    style={actionBtn("var(--ls-text-muted)")}
                  >
                    📤 Depuis ma boîte
                  </a>
                </>
              ) : null}
              <button
                type="button"
                onClick={() => { recordTouch(); copyMessage(message); }}
                style={actionBtn("var(--ls-teal)")}
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
                  ) : lead.contact ? (
                    <a href={buildCrmMailLink(lead.contact, aiMessage, objetPourLead(lead, msgCtx))} style={actionBtn("var(--ls-teal)")}>
                      ✉️ Par mail
                    </a>
                  ) : null}
                  <button type="button" onClick={() => copyMessage(aiMessage)} style={actionBtn("var(--ls-teal)")}>📋 Copier</button>
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
                      <a href={link} target="_blank" rel="noopener noreferrer" style={actionBtn("var(--ls-purple, #A78BFA)")}>
                        👁️ Voir la page (vérif)
                      </a>
                      <button type="button" onClick={() => { recordTouch(); copyMessage(msg); }} style={actionBtn("var(--ls-teal)")}>
                        📋 Copier le message + lien
                      </button>
                      {lead.contactIsPhone ? (
                        <a href={buildCrmWhatsAppLink(lead.contact, msg)} target="_blank" rel="noopener noreferrer" onClick={() => recordTouch()} style={actionBtn("#25D366")}>
                          📱 WhatsApp
                        </a>
                      ) : lead.contact ? (
                        <a href={buildCrmMailLink(lead.contact, msg, `Ta page perso — ${msgCtx.coachFirstName}, La Base 360`)} onClick={() => recordTouch()} style={actionBtn("var(--ls-teal)")}>
                          ✉️ Par mail
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
      </div>

      {/* Déplacer un rendez-vous du club : même fenêtre que le widget « RDV
          découverte » de la liste, donc mêmes créneaux, même email, mêmes
          garde-fous (créneau complet, créneau passé, droits). */}
      {showMove && lead.rdv ? (
        <MoveClubBookingDialog
          booking={{
            id: lead.rdv.id,
            first_name: lead.firstName,
            last_name: lead.lastName ?? null,
            coach_user_id: lead.ownerUserId ?? null,
            contact: lead.contact,
            slot_start: lead.rdv.slotStart,
            slot_end: lead.rdv.slotEnd ?? lead.rdv.slotStart,
            status: "confirmed",
            people_count: lead.peopleCount ?? 1,
            partner_first_name: lead.partnerName ?? null,
            objectif: lead.objectif ?? null,
            confirm_email_sent_at: null,
            reminder_email_sent_at: null,
          }}
          clubSlug="verdun"
          onClose={() => setShowMove(false)}
          onMoved={() => { void refetch(); }}
        />
      ) : null}

      {showMail && lead.contact ? (
        <RepondreParMailModal
          lead={lead}
          objetInitial={objetPourLead(lead, msgCtx)}
          messageInitial={message}
          prenomCoach={msgCtx.coachFirstName}
          onClose={() => setShowMail(false)}
          onEnvoye={(a) => {
            setShowMail(false);
            recordTouch();
            void refetch();
            pushToast({ tone: "success", title: "Mail envoyé", message: `Parti à ${a}. Sa réponse arrivera dans ta boîte.` });
          }}
        />
      ) : null}

      {/* ⚠️ 25/08 — LE GESTE PRINCIPAL DU CRM NE MARCHAIT QUE POUR LES BILANS.
          Pour tout ce qui vient du site du club, de colis, de /welcome ou de
          /rejoindre — 30 leads sur 33 — « Valider → fiche client » n'existait
          pas : « Converti » n'était qu'une étiquette du menu déroulant, qui ne
          créait rien. Mesure : 1 seul prospect_lead marqué converti, et AUCUNE
          fiche cliente ne lui correspondait ; pour 137 clients en base, le CRM
          n'en connaissait que 3.

          On réutilise la MÊME modale (une feature, un seul endroit) en lui
          présentant le lead sous la forme qu'elle sait lire — exactement le
          motif déjà employé par l'agenda pour les RDV du club. */}
      {/* ── LA QUESTION, D'ABORD — la même qu'à l'agenda ────────────────────
          « Elle est venue. Et alors ? » Sans elle, le CRM créait une fiche
          classique sans jamais demander si la personne prenait sa carte. */}
      {showConvert && voieConvert === "choix" && clubActif ? (
        <QualifierRdvSheet
          cible={{
            nomComplet: [lead.firstName, lead.lastName].filter(Boolean).join(" ") || "cette personne",
            heure: lead.rdv?.label ?? "son rendez-vous",
            jour: null,
            objectif: lead.objectif ? objectifLabel(lead.objectif) : null,
            contact: lead.contact,
            partenaire: null,
          }}
          onMembre={() => setVoieConvert("membre")}
          onClassique={() => setVoieConvert("classique")}
          onPasEncore={fermerConversion}
          onFermer={fermerConversion}
        />
      ) : null}

      {/* ── VOIE CLUB — la MÊME feuille que l'agenda ────────────────────────
          Fiche + bilan complet, drapeau membre + club, accès à l'app + QR,
          cœurs, carte de fidélité. C'est tout ce qui manquait à la conversion
          du CRM : sur Gaëlle (03/09), le bilan était complet mais la carte,
          l'accès et le QR n'existaient pas. */}
      {showConvert && voieConvert === "membre" ? (
        <Suspense fallback={null}>
          <BbcNewMemberSheet
            userId={currentUser?.id}
            coachName={currentUser?.name}
            club={clubActif}
            prefill={{
              prenom: lead.firstName,
              nom: lead.lastName ?? null,
              tel: lead.phone ?? (lead.contactIsPhone ? lead.contact : null),
              email: lead.email ?? (lead.contactIsPhone ? null : lead.contact),
            }}
            onClose={fermerConversion}
            onCreated={(clientId) => void apresConversion(clientId)}
          />
        </Suspense>
      ) : null}

      {showConvert && voieConvert === "classique" && !bilanRow && lead.table === "prospect_leads" ? (
        <LeadConvertModal
          bilan={bilanDepuisProspectLead(lead)}
          onClose={fermerConversion}
          onConverted={async (clientId) => {
            const sb = await getSupabaseClient();
            if (sb) {
              // Le LIEN, pas seulement le mot : c'est lui qui permet enfin
              // d'aller du lead a sa fiche cliente, et de compter de vraies
              // conversions au lieu d'etiquettes.
              const { data: donnees, error } = await sb
                .from("prospect_leads")
                .update({
                  status: "converted",
                  converted_to_client_id: clientId,
                  converted_at: new Date().toISOString(),
                  relance_due_at: null,
                  relance_done_at: new Date().toISOString(),
                })
                .eq("id", lead.id)
                // Meme garde-fou que pour les bilans : on n'ecrase jamais une
                // conversion deja faite, sinon la premiere fiche cliente
                // devient orpheline (aucun lead ne pointe plus vers elle).
                .is("converted_to_client_id", null)
                .select("id");
              if (error) {
                pushToast({ tone: "warning", title: "Fiche creee, lead non range", message: error.message });
              } else if (!Array.isArray(donnees) || donnees.length === 0) {
                pushToast({
                  tone: "warning",
                  title: "Deja converti",
                  message: "Ce lead etait deja relie a une fiche cliente. Rafraichis pour voir laquelle.",
                });
              }
            }
            await refetch();
            pushToast({ tone: "success", title: "Lead converti", message: "Fiche client creee" });
          }}
        />
      ) : null}

      {showConvert && voieConvert === "classique" && bilanRow ? (
        <LeadConvertModal
          bilan={bilanRow}
          onClose={fermerConversion}
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
  color: "var(--ls-teal)",
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
  background: "var(--ls-teal)",
  color: "var(--ls-teal-contrast, #0B0D11)",
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

const noalyCard: React.CSSProperties = {
  background: "linear-gradient(135deg, color-mix(in srgb, var(--ls-purple) 8%, transparent), var(--ls-surface))",
  border: "1px solid color-mix(in srgb, var(--ls-purple) 28%, var(--ls-border))",
  borderRadius: 14,
  padding: 18,
};

const noalyBtn: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  minHeight: 44,
  padding: "10px 15px",
  borderRadius: 11,
  border: "1px solid color-mix(in srgb, var(--ls-purple) 35%, var(--ls-border))",
  background: "color-mix(in srgb, var(--ls-purple) 8%, var(--ls-surface))",
  color: "var(--ls-purple)",
  fontFamily: "DM Sans, sans-serif",
  fontSize: 13.5,
  fontWeight: 700,
  cursor: "pointer",
};

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
