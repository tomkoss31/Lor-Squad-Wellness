// Chantier Refonte Actions premium (2026-04-26).
// Onglet "Actions" de la fiche client — refonte chirurgicale selon mockup
// validé. Toutes les infos programme (eau, protéines, produits, protocole
// suivi, note persona) sont désormais dans l'onglet Vue complète.
//
// Structure :
//   1. Header identité (pleine largeur)
//   2. Carte gold "À FAIRE MAINTENANT" (pleine largeur, contextuelle)
//   3. Grid 1.4fr / 1fr :
//      · Gauche  : Modifier le dossier + Cycle de vie + toggles
//      · Droite  : Accès client + Propriété + Zone sensible
//
// Tous les connecteurs métier sont réutilisés depuis AppContext — aucune
// mutation n'est recréée ici, on branche sur ce qui existe.

import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAppContext } from "../../context/AppContext";
import { useToast, buildSupabaseErrorToast } from "../../context/ToastContext";
import { MessageTemplatesButton } from "./MessageTemplatesButton";
import { ClientRelanceButton } from "../reminders/ClientRelanceButton";
import { HerbalifeUplinkPanel } from "./HerbalifeUplinkPanel";
import { refreshClientRecap } from "../../services/supabaseService";
import { useClientPriorityAction } from "../../hooks/useClientPriorityAction";
import { ActionsRdvBlock } from "./ActionsRdvBlock";
import { SendBusinessPlanButton } from "./SendBusinessPlanButton";
import { FollowUpProtocolCard } from "../follow-up/FollowUpProtocolCard";
import { getClientActiveFollowUp } from "../../lib/portfolio";
import { isClientProgramStarted } from "../../lib/calculations";
import type { Client, FollowUp, LifecycleStatus } from "../../types/domain";

// Ordre des pills (mockup) : Actif / Pause / Pas démarré / Arrêté / Perdu
const LIFECYCLE_ORDER: LifecycleStatus[] = [
  "active",
  "paused",
  "not_started",
  "stopped",
  "lost",
];

/** Libellés courts pour les pills du panneau Cycle de vie (design PanelBody). */
const LC_SHORT: Record<LifecycleStatus, string> = {
  active: "ACTIF",
  paused: "PAUSE",
  not_started: "PAS DÉM.",
  stopped: "ARRÊTÉ",
  lost: "PERDU",
};

function formatDateShort(iso?: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
}

function daysSince(iso?: string | null): number | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return Math.max(0, Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24)));
}

function formatPhone(p?: string): string {
  if (!p) return "Non renseigné";
  return p.replace(/(\d{2})(?=\d)/g, "$1 ").trim();
}

interface Props {
  client: Client;
  onEditRdv: () => void;
  onOpenSharePublic?: () => void;
  onGoToVueComplete?: () => void;
  onGoToClubVip?: () => void;
}

/** Panneaux focalisés du lanceur « Gérer le dossier ». */
type ManagePanel = "edit" | "reception" | "lifecycle" | "access" | "uplink" | "admin";

/** Teintes des tuiles/panneaux (design Claude design, tokens globals réels). */
const TILE_TINTS: Record<string, { bg: string; col: string }> = {
  purple: { bg: "var(--ls-purple-bg)", col: "var(--ls-purple)" },
  teal: { bg: "var(--ls-teal-bg)", col: "var(--ls-teal)" },
  lime: { bg: "color-mix(in srgb, var(--ls-lime) 16%, transparent)", col: "var(--ls-lime)" },
  coral: { bg: "var(--ls-coral-bg)", col: "var(--ls-coral)" },
  gold: { bg: "color-mix(in srgb, var(--ls-gold) 16%, transparent)", col: "var(--ls-gold)" },
};

/** Tuiles du lanceur. `vip` n'ouvre pas de panneau : raccourci vers l'onglet Club VIP. */
const MANAGE_TILES: {
  id: "vip" | ManagePanel;
  ico: string;
  title: string;
  sub: string;
  tint: keyof typeof TILE_TINTS;
  danger?: boolean;
}[] = [
  { id: "vip", ico: "👑", title: "Programme VIP", sub: "Remises · invitation · gestion", tint: "purple" },
  { id: "reception", ico: "📦", title: "Réception du colis", sub: "Date de démarrage réelle · cure & relances", tint: "gold" },
  { id: "edit", ico: "📝", title: "Modifier le dossier", sub: "Bilans · coordonnées · fiche PV", tint: "teal" },
  { id: "lifecycle", ico: "🔄", title: "Cycle de vie & suivi", sub: "Statut · fragile · suivi/PV libre", tint: "teal" },
  { id: "access", ico: "🔗", title: "Accès & partage", sub: "Partage public de la fiche", tint: "teal" },
  { id: "uplink", ico: "🌿", title: "Herbalife uplink", sub: "Sponsor · lignée distributeur", tint: "lime" },
  { id: "admin", ico: "⚙️", title: "Zone admin", sub: "Transférer · supprimer le dossier", tint: "coral", danger: true },
];

const PANEL_META: Record<ManagePanel, { title: string; ico: string; tint: keyof typeof TILE_TINTS }> = {
  edit: { title: "Modifier le dossier", ico: "📝", tint: "teal" },
  reception: { title: "Réception du colis", ico: "📦", tint: "gold" },
  lifecycle: { title: "Cycle de vie & suivi", ico: "🔄", tint: "teal" },
  access: { title: "Accès & partage", ico: "🔗", tint: "teal" },
  uplink: { title: "Herbalife uplink", ico: "🌿", tint: "lime" },
  admin: { title: "Zone admin", ico: "⚙️", tint: "coral" },
};

export function ActionsTab({ client, onEditRdv, onOpenSharePublic, onGoToVueComplete, onGoToClubVip }: Props) {
  const navigate = useNavigate();
  const {
    currentUser,
    users,
    followUps,
    pvClientProducts,
    deleteClient,
    reassignClientOwner,
    updateClientInfo,
    setClientLifecycleStatus,
    activateClientProgram,
    setClientFragileFlag,
    setClientFreeFollowUp,
    setClientFreePvTracking,
  } = useAppContext();
  const { push: pushToast } = useToast();

  const [editCoordinatesOpen, setEditCoordinatesOpen] = useState(false);
  const [deleteStep, setDeleteStep] = useState<0 | 1 | 2>(0);
  const [deleteInput, setDeleteInput] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [transferTo, setTransferTo] = useState<string>("");
  // Lanceur (design Claude design 2026-07-03) : gestion en tuiles → panneau
  // tiroir focalisé (fini le mur de 10 sections).
  const [activePanel, setActivePanel] = useState<ManagePanel | null>(null);
  const [vipNote, setVipNote] = useState(false);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const vipNoteTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // VIP = raccourci vers l'onglet Club VIP (toast bref puis switch d'onglet).
  function handleTileClick(id: "vip" | ManagePanel) {
    if (id === "vip") {
      setVipNote(true);
      if (vipNoteTimer.current) clearTimeout(vipNoteTimer.current);
      vipNoteTimer.current = setTimeout(() => {
        setVipNote(false);
        onGoToClubVip?.();
      }, 900);
      return;
    }
    setActivePanel((p) => (p === id ? null : id));
  }
  useEffect(() => () => { if (vipNoteTimer.current) clearTimeout(vipNoteTimer.current); }, []);

  // Scroll doux du panneau dans la vue à l'ouverture (design).
  useEffect(() => {
    if (!activePanel || !panelRef.current) return;
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const rect = panelRef.current.getBoundingClientRect();
    window.scrollTo({ top: window.scrollY + rect.top - 90, behavior: reduce ? "auto" : "smooth" });
  }, [activePanel]);
  const [transferring, setTransferring] = useState(false);
  const [togglingFragile, setTogglingFragile] = useState(false);
  const [togglingFreeFollow, setTogglingFreeFollow] = useState(false);
  const [togglingFreePv, setTogglingFreePv] = useState(false);
  const [lifecycleSaving, setLifecycleSaving] = useState(false);
  // Activator démarrage produits (chantier 2026-05-05)
  const [activatorOpen, setActivatorOpen] = useState(false);
  const [activatorDate, setActivatorDate] = useState<string>(
    () => new Date().toISOString().slice(0, 10),
  );
  const [activatorSaving, setActivatorSaving] = useState(false);

  const priority = useClientPriorityAction(client, followUps);
  // Chantier Refonte onglet Actions — bloc RDV premium (2026-04-26) :
  // activeFollowUp calculé ici pour passer à ActionsRdvBlock (prop alignée
  // avec ce que ClientDetailPage utilise déjà via getClientActiveFollowUp).
  const activeFollowUp: FollowUp | null = useMemo(
    () => (client ? getClientActiveFollowUp(client, followUps) : null),
    [client, followUps],
  );

  // Programme actuel + count bilans pour le header
  const initialAssessment = client.assessments?.find((a) => a.type === "initial");
  // assessmentsCount + memberSinceStr supprimés (utilisés par BLOC 1 Header
  // identité, retiré dans la refonte RDV premium 2026-04-26).

  // Fix bug #3 (2026-04-27) : fallback sur isClientProgramStarted pour
  // refléter l'état réel du programme (bilan existant = démarré de facto)
  // même si client.started=false / startDate=null en DB.
  const currentStatus: LifecycleStatus =
    client.lifecycleStatus ?? (isClientProgramStarted(client) ? "active" : "not_started");


  const latestAssessment = [...(client.assessments ?? [])].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  )[0];
  const latestAssessmentDays = daysSince(latestAssessment?.date);

  // PV du mois courant
  const pvThisMonth = useMemo(() => {
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    return pvClientProducts
      .filter(
        (p) =>
          p.clientId === client.id &&
          p.startDate &&
          new Date(p.startDate).getTime() >= monthStart.getTime() &&
          p.active,
      )
      .reduce((sum, p) => sum + (p.pvPerUnit ?? 0) * (p.quantityStart ?? 1), 0);
  }, [pvClientProducts, client.id]);

  // Prospects = assignableOwners pour le transfert
  const assignableOwners = useMemo(
    () =>
      users.filter(
        (u) => u.active && u.id !== client.distributorId,
      ),
    [users, client.distributorId],
  );

  useEffect(() => {
    setTransferTo("");
  }, [client.id]);

  const currentOwner = users.find((u) => u.id === client.distributorId);

  // ─── Actions ─────────────────────────────────────────────────────────
  async function handlePriorityCta() {
    if (priority.type === "plan_rdv") {
      onEditRdv();
    } else if (priority.type === "complete_initial") {
      navigate(`/clients/${client.id}/start-assessment/edit`);
    } else if (priority.type === "send_followup") {
      // Fix 2026-04-27 : FollowUpProtocolCard est maintenant rendu dans le
      // même onglet Actions juste sous le bloc RDV (cf. BLOC 2bis). Scroll
      // smooth vers l'ancre au lieu de switcher vers Vue complète (qui ne
      // contient plus le protocole depuis la refonte du 25/04).
      if (typeof document !== "undefined") {
        document
          .getElementById("follow-up-protocol-anchor")
          ?.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    } else if (priority.type === "request_share_consent") {
      onOpenSharePublic?.();
      pushToast({
        tone: "info",
        title: "Accord à demander au client",
        message:
          "Envoie un message au client depuis l'onglet Messagerie pour lui proposer le partage public.",
      });
    } else {
      onGoToVueComplete?.();
    }
  }

  async function handleActivateProgram() {
    if (activatorSaving) return;
    setActivatorSaving(true);
    try {
      await activateClientProgram(client.id, activatorDate);
      const formatted = new Date(activatorDate).toLocaleDateString("fr-FR", {
        day: "numeric",
        month: "long",
      });
      pushToast({
        tone: "success",
        title: "Programme démarré",
        message: `Date de départ alignée au ${formatted}. Suivis et produits réajustés.`,
      });
      setActivatorOpen(false);
    } catch (e) {
      pushToast(
        buildSupabaseErrorToast(
          e,
          "Impossible d'activer le programme pour le moment.",
        ),
      );
    } finally {
      setActivatorSaving(false);
    }
  }

  async function handleLifecycleChange(newStatus: LifecycleStatus) {
    if (newStatus === currentStatus || lifecycleSaving) return;
    setLifecycleSaving(true);
    try {
      await setClientLifecycleStatus(client.id, newStatus);
      pushToast({ tone: "success", title: "Statut mis à jour" });
    } catch (e) {
      pushToast(
        buildSupabaseErrorToast(e, "Impossible de changer le statut pour le moment."),
      );
    } finally {
      setLifecycleSaving(false);
    }
  }

  async function handleToggleFragile() {
    if (togglingFragile) return;
    setTogglingFragile(true);
    try {
      await setClientFragileFlag(client.id, !(client.isFragile ?? false));
    } catch (e) {
      pushToast(buildSupabaseErrorToast(e, "Impossible de modifier l'indicateur fragile."));
    } finally {
      setTogglingFragile(false);
    }
  }

  async function handleToggleFreeFollow() {
    if (togglingFreeFollow) return;
    setTogglingFreeFollow(true);
    try {
      await setClientFreeFollowUp(client.id, !(client.freeFollowUp ?? false));
    } catch (e) {
      pushToast(buildSupabaseErrorToast(e, "Impossible de modifier le suivi libre."));
    } finally {
      setTogglingFreeFollow(false);
    }
  }

  async function handleToggleFreePv() {
    if (togglingFreePv) return;
    setTogglingFreePv(true);
    try {
      await setClientFreePvTracking(client.id, !(client.freePvTracking ?? false));
    } catch (e) {
      pushToast(buildSupabaseErrorToast(e, "Impossible de modifier le PV libre."));
    } finally {
      setTogglingFreePv(false);
    }
  }

  async function handleTransfer() {
    if (!transferTo || transferring) return;
    const target = users.find((u) => u.id === transferTo);
    if (!target) return;
    if (!window.confirm(`Transférer ce dossier à ${target.name} ?`)) return;
    setTransferring(true);
    try {
      await reassignClientOwner(client.id, { distributorId: transferTo });
      try {
        await refreshClientRecap(client.id);
      } catch {
        /* non bloquant */
      }
      pushToast({ tone: "success", title: `Dossier transféré à ${target.name}` });
      setTransferTo("");
    } catch (e) {
      pushToast(buildSupabaseErrorToast(e, "Transfert impossible."));
    } finally {
      setTransferring(false);
    }
  }

  async function handleDelete() {
    if (deleting) return;
    setDeleting(true);
    try {
      await deleteClient(client.id);
      navigate("/clients");
    } catch (e) {
      pushToast(buildSupabaseErrorToast(e, "Impossible de supprimer ce dossier."));
      setDeleting(false);
      setDeleteStep(0);
      setDeleteInput("");
    }
  }

  const canDelete = currentUser?.role === "admin";
  const canTransfer = currentUser?.role === "admin" || currentUser?.role === "referent";

  return (
    <div
      className="client-actions-tab"
      style={{
        background: "var(--ls-actions-bg, #FBF9F4)",
        borderRadius: 16,
        padding: "24px",
        fontFamily: "var(--font-sans)",
      }}
    >
      <style>{`
        /* Fix dark (2026-07-03) : l'app est DARK par défaut (:root) et LIGHT via
           html.theme-light — PAS data-theme. L'ancien code inversait + utilisait
           le mauvais sélecteur → override dark jamais appliqué → carte blanche
           en mode sombre. Corrigé. */
        :root {
          --ls-actions-bg: #1A1916;
          --ls-actions-card: #252421;
          --ls-actions-soft: #1A1916;
          --ls-actions-border: rgba(68,68,65,0.5);
          --ls-actions-border-soft: rgba(68,68,65,0.3);
          --ls-actions-text: #F1EFE8;
          --ls-actions-text-muted: #B4B2A9;
          --ls-actions-text-tertiary: #D3D1C7;
          --ls-actions-gold-bg: rgba(239,159,39,0.15);
          --ls-actions-gold-text: #EF9F27;
          --ls-actions-teal-bg: rgba(29,158,117,0.2);
          --ls-actions-teal-text: #5DCAA5;
          --ls-actions-red-bg: rgba(224,75,75,0.15);
          --ls-actions-red-text: #F09595;
          --ls-actions-red-text-dark: #F09595;
        }
        html.theme-light {
          --ls-actions-bg: #FBF9F4;
          --ls-actions-card: #FFFFFF;
          --ls-actions-soft: #FBF9F4;
          --ls-actions-border: rgba(211,209,199,0.6);
          --ls-actions-border-soft: rgba(211,209,199,0.4);
          --ls-actions-text: #2C2C2A;
          --ls-actions-text-muted: #888780;
          --ls-actions-text-tertiary: #5F5E5A;
          --ls-actions-gold-bg: #FAEEDA;
          --ls-actions-gold-text: #854F0B;
          --ls-actions-teal-bg: #E1F5EE;
          --ls-actions-teal-text: #085041;
          --ls-actions-red-bg: #FCEBEB;
          --ls-actions-red-text: #A32D2D;
          --ls-actions-red-text-dark: #791F1F;
        }
        .client-actions-tab {
          background: var(--ls-actions-bg);
        }
        .at-card {
          background: var(--ls-actions-card);
          border: 0.5px solid var(--ls-actions-border);
          border-radius: 14px;
          padding: 16px 20px;
        }
        .at-label {
          font-size: 10px;
          letter-spacing: 0.1em;
          color: var(--ls-actions-text-muted);
          font-weight: 500;
          text-transform: uppercase;
        }
        .at-row-clickable {
          padding: 10px 2px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          cursor: pointer;
          border: none;
          background: transparent;
          width: 100%;
          text-align: left;
          border-bottom: 0.5px solid var(--ls-actions-border-soft);
          transition: background 150ms ease;
        }
        .at-row-clickable:last-child { border-bottom: none; }
        .at-row-clickable:hover { background: var(--ls-actions-soft); }

        /* ─── Lanceur : eyebrow + tuiles → tiroir (design Claude design 2026-07-03) ─── */
        .at-eyebrow {
          display: flex; align-items: center; gap: 8px;
          font-family: 'JetBrains Mono', ui-monospace, monospace;
          font-size: 11px; font-weight: 600; letter-spacing: 0.18em;
          text-transform: uppercase; color: var(--ls-text-muted);
          margin: 22px 2px 12px;
        }
        .at-eyebrow-dot {
          width: 7px; height: 7px; border-radius: 999px; flex: 0 0 auto;
          background: var(--ls-teal); box-shadow: 0 0 8px var(--ls-teal);
        }
        .at-eyebrow-dot--lime { background: var(--ls-lime); box-shadow: 0 0 8px var(--ls-lime); }
        .at-tiles { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
        .at-tile {
          display: flex; align-items: center; gap: 12px; width: 100%;
          padding: 15px 16px; border-radius: 12px; cursor: pointer; min-height: 44px;
          background: var(--ls-surface); border: 1px solid var(--ls-border);
          text-align: left; font-family: var(--font-sans);
          transition: transform .16s ease, border-color .16s ease, opacity .2s ease;
          --arw-c: var(--ls-text-hint); --arw-x: 0px;
        }
        .at-tile.is-on { border-color: var(--ls-teal); }
        .at-tile--danger { border-left: 2px solid color-mix(in srgb, var(--ls-coral) 55%, transparent); }
        .at-tile:hover {
          transform: translateY(-2px); opacity: 1 !important;
          border-color: var(--ls-teal); --arw-c: var(--ls-lime); --arw-x: 3px;
        }
        .at-tile--danger:hover { border-color: var(--ls-coral); }
        .at-tile:focus-visible { outline: 2px solid var(--ls-teal); outline-offset: 2px; }
        .at-tile-ico {
          width: 38px; height: 38px; border-radius: 10px;
          display: flex; align-items: center; justify-content: center;
          font-size: 17px; flex: 0 0 auto;
        }
        .at-tile-body { flex: 1; min-width: 0; }
        .at-tile-title { display: block; font-size: 14px; font-weight: 700; line-height: 1.25; color: var(--ls-text); }
        .at-tile-sub { display: block; font-size: 11.5px; line-height: 1.35; margin-top: 2px; color: var(--ls-text-muted); }
        .at-tile-arrow {
          font-size: 17px; flex: 0 0 auto; color: var(--arw-c);
          transform: translateX(var(--arw-x)); transition: transform .15s ease, color .15s ease;
        }
        .at-panel {
          margin-top: 14px; background: var(--ls-surface);
          border: 1px solid var(--ls-border); border-top: 2px solid var(--ls-teal);
          border-radius: 12px; padding: 22px;
          animation: atPanelIn .22s ease;
        }
        @keyframes atPanelIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: none; }
        }
        .at-panel-head {
          display: flex; align-items: center; justify-content: space-between;
          gap: 12px; margin-bottom: 6px;
        }
        .at-panel-title {
          font-family: 'Anton', 'Syne', sans-serif;
          font-size: 20px; letter-spacing: 0.02em; text-transform: uppercase;
          color: var(--ls-text);
          display: flex; align-items: center; gap: 12px; min-width: 0;
        }
        .at-panel-chip {
          width: 36px; height: 36px; border-radius: 10px;
          display: flex; align-items: center; justify-content: center;
          font-size: 17px; flex: 0 0 auto;
        }
        .at-panel-back {
          min-height: 38px; padding: 9px 15px; border-radius: 9px;
          border: 1px solid var(--ls-border); background: var(--ls-surface2);
          color: var(--ls-text-muted);
          font-family: 'JetBrains Mono', ui-monospace, monospace;
          font-size: 11px; font-weight: 600; cursor: pointer; flex: 0 0 auto;
          transition: border-color .15s ease, color .15s ease;
        }
        .at-panel-back:hover { border-color: var(--ls-teal); color: var(--ls-text); }
        /* Intérieurs de panneaux (design PanelBody) */
        .pb-row {
          display: flex; align-items: center; justify-content: space-between; gap: 12px;
          width: 100%; text-align: left; background: transparent; border: none;
          border-bottom: 1px solid var(--ls-border); padding: 14px 4px; cursor: pointer;
          min-height: 44px; transition: background .15s ease;
        }
        .pb-row:last-child { border-bottom: none; }
        .pb-row:hover { background: var(--ls-surface2); }
        .pb-pill {
          padding: 10px 4px; border-radius: 8px; text-align: center; cursor: pointer;
          font-size: 10px; font-family: 'JetBrains Mono', ui-monospace, monospace;
          letter-spacing: 0.03em; transition: border-color .15s ease;
        }
        .pb-pill:hover { border-color: var(--ls-teal); }
        @media (prefers-reduced-motion: reduce) {
          .at-tile, .at-tile-arrow, .at-panel { transition: none; animation: none; }
        }
        @media (max-width: 767px) {
          .at-grid-2 { grid-template-columns: 1fr !important; }
          .at-tiles { grid-template-columns: 1fr; }
        }
      `}</style>


      <div className="at-eyebrow is-live" style={{ marginTop: 2 }}>
        <span className="at-eyebrow-dot" aria-hidden="true" />
        Actions rapides · le quotidien
      </div>

      {/* ═══ BLOC 2 — CARTE "À FAIRE MAINTENANT" ═════════════════════════ */}
      <ActionsRdvBlock
        priority={priority}
        activeFollowUp={activeFollowUp}
        clientFirstName={client.firstName}
        clientLastName={client.lastName}
        clientPhone={client.phone}
        onPriorityCta={() => void handlePriorityCta()}
        onEditRdv={onEditRdv}
      />

      {/* ═══ BLOC 2bis — PROTOCOLE DE SUIVI J+1 / J+3 / J+7 / J+10 / J+14
          Restauré (2026-04-27) après régression du commit 3b3604e du 25/04
          qui l'avait retiré de ClientDetailPage lors de l'extraction en
          ActionsTab. Le composant gère sa propre modale d'envoi + log DB.
          L'ancre id permet au handlePriorityCta de scroller directement
          ici quand priority.type === 'send_followup'. */}
      <div id="follow-up-protocol-anchor" style={{ marginTop: 12 }}>
        <FollowUpProtocolCard client={client} />
      </div>

      {/* V3 funnel business (chantier 2026-11-07) — bouton envoyer le plan
          d'opportunite si le client a coche un montant > 0 dans son bilan.
          Le composant masque automatiquement si businessInterestAmount <= 0. */}
      <SendBusinessPlanButton client={client} />

      {/* Messages rapides — hoisted en haut (Polish 2026-04-29) :
          le CTA gold est tjr visible direct, plus enterre en bas sur mobile. */}
      <div className="at-card" style={{ marginTop: 12 }}>
        <div className="at-label" style={{ marginBottom: 10 }}>
          Messages rapides
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <MessageTemplatesButton client={client} />
          <div style={{ fontSize: 10, color: "var(--ls-text-hint)", lineHeight: 1.4 }}>
            Templates pré-rédigés (rappel RDV, félicitation perte poids, relance douce…)
            — édite et envoie via WhatsApp, SMS, Telegram ou copie.
          </div>
        </div>
      </div>

      {/* À relancer — rappel PRIVÉ coach (in-app only). N'envoie RIEN au client,
          contrairement à « Planifier un RDV ». Liste sur le Co-pilote. */}
      <div className="at-card" style={{ marginTop: 12 }}>
        <div className="at-label" style={{ marginBottom: 10 }}>
          À relancer
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <ClientRelanceButton client={client} />
          <div style={{ fontSize: 10, color: "var(--ls-text-hint)", lineHeight: 1.4 }}>
            Note privée « penser à le recontacter ». Apparaît sur ton Co-pilote.
            Le client ne reçoit ni email ni notification.
          </div>
        </div>
      </div>

      {/* VIP déplacé (2026-07-03) : toute la gestion Programme Client Privilégié
          vit désormais UNIQUEMENT dans l'onglet « Club VIP » (décision Thomas). */}

      {/* 🗂 Lanceur (design Claude design 2026-07-03) : gestion en tuiles → tiroir focalisé. */}
      <div className="at-eyebrow">
        <span className="at-eyebrow-dot at-eyebrow-dot--lime" aria-hidden="true" />
        Gérer le dossier · s&apos;ouvre au clic
      </div>
      <div className="at-tiles">
        {MANAGE_TILES.map((t) => {
          const on = activePanel === t.id;
          const dim = activePanel != null && !on;
          const tint = TILE_TINTS[t.tint];
          return (
            <button
              key={t.id}
              type="button"
              className={`at-tile${t.danger ? " at-tile--danger" : ""}${on ? " is-on" : ""}`}
              aria-expanded={t.id !== "vip" ? on : undefined}
              onClick={() => handleTileClick(t.id)}
              style={{ opacity: dim ? 0.45 : 1 }}
            >
              <span className="at-tile-ico" aria-hidden="true" style={{ background: tint.bg, color: tint.col }}>
                {t.ico}
              </span>
              <span className="at-tile-body">
                <span className="at-tile-title">{t.title}</span>
                <span className="at-tile-sub">{t.sub}</span>
              </span>
              <span className="at-tile-arrow" aria-hidden="true">{t.id === "vip" ? "↗" : "→"}</span>
            </button>
          );
        })}
      </div>

      {activePanel ? (
        <div
          className="at-panel"
          ref={panelRef}
          style={{ borderTopColor: TILE_TINTS[PANEL_META[activePanel].tint].col }}
        >
          <div className="at-panel-head">
            <span className="at-panel-title">
              <span
                className="at-panel-chip"
                aria-hidden="true"
                style={{
                  background: TILE_TINTS[PANEL_META[activePanel].tint].bg,
                  color: TILE_TINTS[PANEL_META[activePanel].tint].col,
                }}
              >
                {PANEL_META[activePanel].ico}
              </span>
              {PANEL_META[activePanel].title}
            </span>
            <button type="button" className="at-panel-back" onClick={() => setActivePanel(null)}>
              ← Fermer
            </button>
          </div>

          {activePanel === "uplink" ? (
            /* Chantier uplink HL (2026-05-21) : override le distri uplink HL réel
               pour les clients orphelins repris (ex: Stéphanie sous Ophélie 42%). */
            <HerbalifeUplinkPanel client={client} />
          ) : null}

          {activePanel === "edit" ? (
            <>
            {[
              { label: "Bilan de départ", meta: formatDateShort(initialAssessment?.date), onClick: () => navigate(`/clients/${client.id}/start-assessment/edit`) },
              { label: "Dernier bilan", meta: latestAssessmentDays != null ? `il y a ${latestAssessmentDays} j` : "Aucun bilan", onClick: () => (latestAssessment?.id ? navigate(`/clients/${client.id}/assessments/${latestAssessment.id}/edit`) : navigate(`/clients/${client.id}/start-assessment/edit`)) },
              { label: "Coordonnées", meta: formatPhone(client.phone), onClick: () => setEditCoordinatesOpen(true) },
              { label: "Fiche point volume", meta: `${pvThisMonth.toFixed(1)} PV ce mois`, onClick: () => navigate(`/pv/clients?responsable=${encodeURIComponent(client.distributorId)}&client=${encodeURIComponent(client.id)}`) },
            ].map((r) => (
              <button key={r.label} type="button" onClick={r.onClick} className="pb-row">
                <span style={{ fontSize: 14, color: "var(--ls-text)", fontWeight: 500 }}>{r.label}</span>
                <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 12, color: "var(--ls-text-muted)", fontFamily: "'JetBrains Mono',ui-monospace,monospace" }}>{r.meta}</span>
                  <span aria-hidden="true" style={{ color: "var(--ls-text-hint)", fontSize: 16 }}>&rsaquo;</span>
                </span>
              </button>
            ))}

          </>
          ) : null}

          {activePanel === "reception" ? (
            <>
            {/* Réception du colis (unifié 2026-07-05) : action CANONIQUE qui pose
                la vraie date de démarrage (clients.start_date). Cure J+1/J+7/J+14
                et usure produits (relances réassort) partent de cette date, pas
                du bilan. Aucune formule PV/rentabilité touchée — sorti de l'onglet
                Modifier pour être une action unique et visible (ex-« Activator »). */}
            <div style={{ padding: 16, borderRadius: 12, borderLeft: "3px solid var(--ls-gold)", background: "var(--ls-gold-bg)" }}>
              <div style={{ fontFamily: "'JetBrains Mono',ui-monospace,monospace", fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--ls-gold)", marginBottom: 6 }}>📦 Date de réception du colis</div>
              <p style={{ margin: "0 0 12px", fontSize: 13, lineHeight: 1.5, color: "var(--ls-text-muted)" }}>
                {client.startDate ? `Reçu le ${new Date(client.startDate).toLocaleDateString("fr-FR", { day: "numeric", month: "long" })}. ` : ""}
                Marque le jour où le client a reçu son colis — le compteur J+1 / J+7 / J+14 et l&apos;usure des produits (relances réassort) partent de cette date.
              </p>
              {activatorOpen ? (
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                  <input type="date" value={activatorDate} onChange={(e) => setActivatorDate(e.target.value)} style={{ minHeight: 44, padding: "10px 12px", borderRadius: 10, border: "1px solid var(--ls-border)", background: "var(--ls-surface)", color: "var(--ls-text)", fontFamily: "'JetBrains Mono',ui-monospace,monospace", fontSize: 13 }} />
                  <button type="button" onClick={() => void handleActivateProgram()} disabled={activatorSaving} style={{ background: "linear-gradient(180deg,var(--ls-gold),color-mix(in srgb,var(--ls-gold) 70%,#000))", color: "var(--ls-gold-contrast)", border: "none", padding: "11px 18px", borderRadius: 10, fontWeight: 700, fontSize: 13, cursor: activatorSaving ? "wait" : "pointer", minHeight: 44 }}>{activatorSaving ? "…" : "Confirmer la réception"}</button>
                  <button type="button" onClick={() => setActivatorOpen(false)} style={{ background: "transparent", border: "1px solid var(--ls-border)", color: "var(--ls-text-muted)", padding: "11px 16px", borderRadius: 10, fontSize: 13, cursor: "pointer", minHeight: 44 }}>Annuler</button>
                </div>
              ) : (
                <button type="button" onClick={() => setActivatorOpen(true)} style={{ background: "linear-gradient(180deg,var(--ls-gold),color-mix(in srgb,var(--ls-gold) 70%,#000))", color: "var(--ls-gold-contrast)", border: "none", padding: "11px 18px", borderRadius: 10, fontWeight: 700, fontSize: 13, cursor: "pointer", minHeight: 44 }}>{client.startDate ? "Modifier la date de réception" : "Marquer la réception du colis"}</button>
              )}
            </div>
          </>
          ) : null}

          {activePanel === "lifecycle" ? (
            <>
            <div style={{ fontFamily: "'JetBrains Mono',ui-monospace,monospace", fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--ls-text-muted)", marginBottom: 10 }}>Statut du client</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 6, marginBottom: 20 }}>
              {LIFECYCLE_ORDER.map((st) => {
                const on = currentStatus === st;
                return (
                  <button key={st} type="button" disabled={lifecycleSaving} onClick={() => void handleLifecycleChange(st)} className="pb-pill" style={{ background: on ? "var(--ls-teal-bg)" : "var(--ls-surface2)", border: `1px solid ${on ? "var(--ls-teal)" : "var(--ls-border)"}`, color: on ? "var(--ls-teal)" : "var(--ls-text-muted)", fontWeight: on ? 700 : 600 }}>{LC_SHORT[st]}</button>
                );
              })}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {[
                { icon: "🛡️", title: "Marquer fragile", meta: "Client hésitant · attention particulière", on: client.isFragile ?? false, busy: togglingFragile, onToggle: () => void handleToggleFragile() },
                { icon: "✦", title: "Suivi libre", meta: "Exclu du plan de relance · rentabilité comptée", on: client.freeFollowUp ?? false, busy: togglingFreeFollow, onToggle: () => void handleToggleFreeFollow() },
                { icon: "◇", title: "PV volume libre", meta: "Exclu des listes de réassort et alertes PV", on: client.freePvTracking ?? false, busy: togglingFreePv, onToggle: () => void handleToggleFreePv() },
              ].map((t) => (
                <button key={t.title} type="button" onClick={t.onToggle} disabled={t.busy} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, padding: "12px 14px", borderRadius: 12, width: "100%", textAlign: "left", cursor: t.busy ? "wait" : "pointer", background: t.on ? "var(--ls-teal-bg)" : "var(--ls-surface2)", border: `1px solid ${t.on ? "color-mix(in srgb,var(--ls-teal) 30%,transparent)" : "transparent"}` }}>
                  <span style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, minWidth: 0 }}>
                    <span aria-hidden="true" style={{ fontSize: 15 }}>{t.icon}</span>
                    <span style={{ minWidth: 0 }}>
                      <span style={{ display: "block", fontSize: 13, fontWeight: 600, color: t.on ? "var(--ls-teal)" : "var(--ls-text)" }}>{t.title}</span>
                      <span style={{ display: "block", fontSize: 11, color: "var(--ls-text-muted)", marginTop: 1 }}>{t.meta}</span>
                    </span>
                  </span>
                  <span aria-hidden="true" style={{ width: 38, height: 22, borderRadius: 999, background: t.on ? "var(--ls-teal)" : "var(--ls-border2)", flexShrink: 0, padding: 2, display: "flex", justifyContent: t.on ? "flex-end" : "flex-start", transition: "background .15s" }}>
                    <span style={{ width: 18, height: 18, borderRadius: "50%", background: "#fff", boxShadow: "0 1px 2px rgba(0,0,0,.3)" }} />
                  </span>
                </button>
              ))}
            </div>
          </>
          ) : null}

          {activePanel === "access" ? (
            <>
            <div style={{ fontFamily: "'JetBrains Mono',ui-monospace,monospace", fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--ls-text-muted)", marginBottom: 10 }}>Partage public de la fiche</div>
            <button type="button" onClick={onOpenSharePublic} disabled={!onOpenSharePublic} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "14px 16px", borderRadius: 12, border: "1px solid var(--ls-border)", background: "var(--ls-surface2)", width: "100%", textAlign: "left", cursor: onOpenSharePublic ? "pointer" : "default" }}>
              <span>
                <span style={{ display: "block", fontSize: 14, fontWeight: 600, color: "var(--ls-text)" }}>Lien vitrine anonymisé</span>
                <span style={{ display: "block", fontSize: 12, color: "var(--ls-text-muted)", marginTop: 2 }}>Partage une version publique sans données sensibles.</span>
              </span>
              <SharePublicPill client={client} />
            </button>
            <p style={{ margin: "12px 0 0", fontSize: 12, lineHeight: 1.5, color: "var(--ls-text-hint)" }}>L&apos;accès à l&apos;app client se gère depuis le hero de la fiche + la page d&apos;accueil client — pas ici.</p>
          </>
          ) : null}

          {activePanel === "admin" ? (
            <>
            <div style={{ fontFamily: "'JetBrains Mono',ui-monospace,monospace", fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--ls-text-muted)", marginBottom: 10 }}>Propriété du dossier</div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", borderRadius: 12, border: "1px solid var(--ls-border)", background: "var(--ls-surface2)", marginBottom: 10 }}>
              <span aria-hidden="true" style={{ width: 30, height: 30, borderRadius: "50%", background: "var(--ls-teal)", color: "var(--ls-teal-contrast)", fontSize: 12, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{(currentOwner?.name ?? "?").slice(0, 1).toUpperCase()}</span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: "block", fontSize: 14, color: "var(--ls-text)", fontWeight: 600 }}>{currentOwner?.name ?? "—"}</span>
                <span style={{ display: "block", fontSize: 11, color: "var(--ls-text-muted)" }}>Distributeur actuel</span>
              </span>
            </div>
            {canTransfer ? (
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
                <select value={transferTo} onChange={(e) => setTransferTo(e.target.value)} style={{ flex: 1, minWidth: 180, minHeight: 44, padding: "10px 12px", borderRadius: 12, border: "1px solid var(--ls-border)", background: "var(--ls-surface2)", color: "var(--ls-text)", fontSize: 13 }}>
                  <option value="">Transférer à…</option>
                  {assignableOwners.map((u) => (<option key={u.id} value={u.id}>{u.name}</option>))}
                </select>
                <button type="button" onClick={() => void handleTransfer()} disabled={!transferTo || transferring} style={{ minHeight: 44, padding: "10px 16px", borderRadius: 12, border: "1px solid var(--ls-teal)", background: "var(--ls-teal-bg)", color: "var(--ls-teal)", fontSize: 13, fontWeight: 700, cursor: !transferTo || transferring ? "not-allowed" : "pointer", opacity: !transferTo ? 0.5 : 1 }}>{transferring ? "…" : "Transférer"}</button>
              </div>
            ) : null}
            {canDelete ? (
              <div style={{ padding: 16, borderRadius: 12, background: "var(--ls-coral-bg)", border: "1px solid color-mix(in srgb,var(--ls-coral) 30%,transparent)" }}>
                <div style={{ fontFamily: "'JetBrains Mono',ui-monospace,monospace", fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--ls-coral)", marginBottom: 10 }}>⚠ Zone sensible</div>
                {deleteStep === 0 ? (
                  <button type="button" onClick={() => setDeleteStep(1)} style={{ width: "100%", padding: "11px 14px", borderRadius: 10, border: "1px solid color-mix(in srgb,var(--ls-coral) 40%,transparent)", background: "transparent", color: "var(--ls-coral)", fontSize: 13, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between", minHeight: 44 }}>
                    <span>Supprimer ce dossier</span><span aria-hidden="true">🗑</span>
                  </button>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    <div style={{ fontSize: 12, color: "var(--ls-coral)" }}>Tape <strong>SUPPRIMER</strong> pour confirmer.</div>
                    <input type="text" value={deleteInput} onChange={(e) => setDeleteInput(e.target.value)} placeholder="SUPPRIMER" style={{ minHeight: 44, padding: "10px 12px", borderRadius: 10, border: "1px solid color-mix(in srgb,var(--ls-coral) 40%,transparent)", background: "var(--ls-surface)", color: "var(--ls-text)", fontSize: 13 }} />
                    <div style={{ display: "flex", gap: 8 }}>
                      <button type="button" onClick={() => { setDeleteStep(0); setDeleteInput(""); }} style={{ flex: 1, minHeight: 44, borderRadius: 10, border: "1px solid var(--ls-border)", background: "transparent", color: "var(--ls-text-muted)", fontSize: 13, cursor: "pointer" }}>Annuler</button>
                      <button type="button" onClick={() => void handleDelete()} disabled={deleteInput.trim().toUpperCase() !== "SUPPRIMER" || deleting} style={{ flex: 1, minHeight: 44, borderRadius: 10, border: "none", background: "var(--ls-coral)", color: "#fff", fontSize: 13, fontWeight: 700, cursor: deleteInput.trim().toUpperCase() !== "SUPPRIMER" || deleting ? "not-allowed" : "pointer", opacity: deleteInput.trim().toUpperCase() !== "SUPPRIMER" ? 0.5 : 1 }}>{deleting ? "Suppression…" : "Supprimer définitivement"}</button>
                    </div>
                  </div>
                )}
                <div style={{ fontSize: 11, color: "var(--ls-coral)", opacity: 0.7, marginTop: 8 }}>Action irréversible · réservé admin / référent</div>
              </div>
            ) : null}
          </>
          ) : null}
        </div>
      ) : null}

      {/* Toast VIP (design) : bref feedback avant le switch vers l'onglet Club VIP. */}
      {vipNote ? (
        <div
          role="status"
          style={{
            position: "fixed",
            left: "50%",
            bottom: 28,
            transform: "translateX(-50%)",
            zIndex: 60,
            background: "var(--ls-surface2)",
            border: "1px solid color-mix(in srgb, var(--ls-purple) 40%, transparent)",
            color: "var(--ls-text)",
            padding: "10px 16px",
            borderRadius: 999,
            fontSize: 12.5,
            fontFamily: "'JetBrains Mono', ui-monospace, monospace",
            boxShadow: "0 8px 24px rgba(0,0,0,0.35)",
          }}
        >
          👑 Ouverture de l&apos;onglet Club VIP →
        </div>
      ) : null}

      {/* ─── Modales ─── */}
      {editCoordinatesOpen ? (
        <EditCoordinatesModal
          client={client}
          onClose={() => setEditCoordinatesOpen(false)}
          onSave={async (phone, email, city) => {
            try {
              await updateClientInfo(client.id, {
                phone: phone.trim(),
                email: email.trim().toLowerCase(),
                city: city.trim() || undefined,
              });
              try {
                await refreshClientRecap(client.id);
              } catch {
                /* non bloquant */
              }
              pushToast({ tone: "success", title: "Coordonnées mises à jour" });
              setEditCoordinatesOpen(false);
            } catch (e) {
              pushToast(
                buildSupabaseErrorToast(e, "Impossible de mettre à jour les coordonnées."),
              );
            }
          }}
        />
      ) : null}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// Sous-composants
// ═══════════════════════════════════════════════════════════════════════

// PriorityCard supprimé (2026-04-26) : la priorité est maintenant rendue
// par ActionsRdvBlock (fusion intelligente priorités + état RDV).

function SharePublicPill({ client }: { client: Client }) {
  if (!client.publicShareConsent || client.publicShareRevokedAt) {
    return (
      <span
        style={{
          fontSize: 10,
          padding: "2px 8px",
          borderRadius: 999,
          background: "var(--ls-actions-red-bg)",
          color: "var(--ls-actions-red-text)",
        }}
      >
        En attente du client
      </span>
    );
  }
  // Note : compteur vues live via RPC serait idéal. On affiche un placeholder
  // neutre tant qu'on n'a pas cette RPC. Le vrai compteur existe dans
  // SharePublicButton via client_public_share_tokens.view_count.
  return (
    <span
      style={{
        fontSize: 10,
        padding: "2px 8px",
        borderRadius: 999,
        background: "var(--ls-actions-teal-bg)",
        color: "var(--ls-actions-teal-text)",
      }}
    >
      Prêt à partager
    </span>
  );
}

function EditCoordinatesModal({
  client,
  onClose,
  onSave,
}: {
  client: Client;
  onClose: () => void;
  onSave: (phone: string, email: string, city: string) => Promise<void>;
}) {
  const [phone, setPhone] = useState(client.phone ?? "");
  const [email, setEmail] = useState(client.email ?? "");
  const [city, setCity] = useState(client.city ?? "");
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      await onSave(phone, email, city);
    } finally {
      setSaving(false);
    }
  }

  return (
    // eslint-disable-next-line jsx-a11y/click-events-have-key-events -- Backdrop, ESC at dialog level
    <div
      role="dialog"
      aria-modal="true"
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
        zIndex: 1000,
      }}
    >
      {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions -- stopPropagation only */}
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: 420,
          background: "var(--ls-actions-card)",
          borderRadius: 14,
          padding: 22,
          display: "flex",
          flexDirection: "column",
          gap: 14,
        }}
      >
        <div style={{ fontSize: 16, fontWeight: 500, color: "var(--ls-actions-text)" }}>
          Coordonnées · {client.firstName} {client.lastName}
        </div>
        <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span className="at-label">Téléphone</span>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            style={{ padding: "8px 10px", borderRadius: 8, border: "0.5px solid var(--ls-actions-border)" }}
          />
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span className="at-label">Email</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{ padding: "8px 10px", borderRadius: 8, border: "0.5px solid var(--ls-actions-border)" }}
          />
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span className="at-label">Ville</span>
          <input
            type="text"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            style={{ padding: "8px 10px", borderRadius: 8, border: "0.5px solid var(--ls-actions-border)" }}
          />
        </label>
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 8 }}>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            style={{
              padding: "9px 16px",
              fontSize: 12,
              borderRadius: 9,
              background: "transparent",
              color: "var(--ls-actions-text-tertiary)",
              border: "0.5px solid var(--ls-actions-border)",
              cursor: "pointer",
            }}
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={saving}
            style={{
              padding: "9px 16px",
              fontSize: 12,
              borderRadius: 9,
              background: "#0F6E56",
              color: "#fff",
              border: "none",
              fontWeight: 500,
              cursor: saving ? "wait" : "pointer",
            }}
          >
            {saving ? "Enregistrement…" : "Enregistrer"}
          </button>
        </div>
      </div>
    </div>
  );
}