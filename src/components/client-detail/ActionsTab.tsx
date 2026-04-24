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

import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAppContext } from "../../context/AppContext";
import { useToast, buildSupabaseErrorToast } from "../../context/ToastContext";
import { ClientAccessModal } from "../client/ClientAccessModal";
import { refreshClientRecap } from "../../services/supabaseService";
import { useClientPriorityAction } from "../../hooks/useClientPriorityAction";
import { ActionsRdvBlock } from "./ActionsRdvBlock";
import { FollowUpProtocolCard } from "../follow-up/FollowUpProtocolCard";
import { getClientActiveFollowUp } from "../../lib/portfolio";
import { isClientProgramStarted } from "../../lib/calculations";
import type { Client, FollowUp, LifecycleStatus } from "../../types/domain";
import { LIFECYCLE_LABELS } from "../../types/domain";

// Ordre des pills (mockup) : Actif / Pause / Pas démarré / Arrêté / Perdu
const LIFECYCLE_ORDER: LifecycleStatus[] = [
  "active",
  "paused",
  "not_started",
  "stopped",
  "lost",
];

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
}

export function ActionsTab({ client, onEditRdv, onOpenSharePublic, onGoToVueComplete }: Props) {
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
    setClientFragileFlag,
    setClientFreeFollowUp,
    setClientFreePvTracking,
  } = useAppContext();
  const { push: pushToast } = useToast();

  const [editCoordinatesOpen, setEditCoordinatesOpen] = useState(false);
  const [accessModalOpen, setAccessModalOpen] = useState(false);
  const [deleteStep, setDeleteStep] = useState<0 | 1 | 2>(0);
  const [deleteInput, setDeleteInput] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [transferTo, setTransferTo] = useState<string>("");
  const [transferring, setTransferring] = useState(false);
  const [togglingFragile, setTogglingFragile] = useState(false);
  const [togglingFreeFollow, setTogglingFreeFollow] = useState(false);
  const [togglingFreePv, setTogglingFreePv] = useState(false);
  const [lifecycleSaving, setLifecycleSaving] = useState(false);

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

  const lifecycleUpdatedDays = daysSince(client.lifecycleUpdatedAt);

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
        :root {
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
        html[data-theme='dark'] {
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
        @media (max-width: 767px) {
          .at-grid-2 { grid-template-columns: 1fr !important; }
        }
      `}</style>


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

      {/* ═══ GRID 2 COLONNES ═════════════════════════════════════════════ */}
      <div
        className="at-grid-2"
        style={{
          display: "grid",
          gridTemplateColumns: "1.4fr 1fr",
          gap: 12,
          marginTop: 12,
        }}
      >
        {/* ─── COLONNE GAUCHE ─── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {/* Bloc 3A : Modifier le dossier */}
          <div className="at-card">
            <div className="at-label" style={{ marginBottom: 14 }}>
              Modifier le dossier
            </div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <RowClickable
                label="Bilan de départ"
                meta={formatDateShort(initialAssessment?.date)}
                onClick={() => navigate(`/clients/${client.id}/start-assessment/edit`)}
              />
              <RowClickable
                label="Dernier bilan"
                meta={
                  latestAssessmentDays != null
                    ? `il y a ${latestAssessmentDays} j`
                    : "Aucun bilan"
                }
                onClick={() =>
                  latestAssessment?.id
                    ? navigate(`/clients/${client.id}/assessments/${latestAssessment.id}/edit`)
                    : navigate(`/clients/${client.id}/start-assessment/edit`)
                }
              />
              <RowClickable
                label="Coordonnées"
                meta={formatPhone(client.phone)}
                onClick={() => setEditCoordinatesOpen(true)}
              />
              <RowClickable
                label="Fiche point volume"
                meta={`${pvThisMonth.toFixed(1)} PV ce mois`}
                onClick={() =>
                  navigate(
                    `/pv/clients?responsable=${encodeURIComponent(
                      client.distributorId,
                    )}&client=${encodeURIComponent(client.id)}`,
                  )
                }
              />
            </div>
          </div>

          {/* Bloc 3B : Cycle de vie + toggles */}
          <div className="at-card">
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 14,
              }}
            >
              <div className="at-label">Cycle de vie</div>
              {lifecycleUpdatedDays != null ? (
                <div
                  style={{
                    fontSize: 10,
                    color: "var(--ls-actions-teal-text)",
                  }}
                >
                  Modifié il y a {lifecycleUpdatedDays} j
                </div>
              ) : null}
            </div>

            {/* 5 pills statut */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(5, 1fr)",
                gap: 5,
                marginBottom: 14,
              }}
            >
              {LIFECYCLE_ORDER.map((st) => (
                <LifecyclePill
                  key={st}
                  status={st}
                  active={currentStatus === st}
                  disabled={lifecycleSaving}
                  onClick={() => void handleLifecycleChange(st)}
                />
              ))}
            </div>

            {/* 3 toggles */}
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <LifecycleToggle
                icon="🛡️"
                title="Marquer fragile"
                metaOff="Client hésitant · attention particulière"
                metaOn="Activé · attention particulière au suivi"
                active={client.isFragile ?? false}
                busy={togglingFragile}
                onToggle={() => void handleToggleFragile()}
              />
              <LifecycleToggle
                icon="✦"
                title="Suivi libre"
                metaOff="Désactivé · relances auto actives"
                metaOn="Activé · hors agenda auto, pas de relance"
                active={client.freeFollowUp ?? false}
                busy={togglingFreeFollow}
                onToggle={() => void handleToggleFreeFollow()}
              />
              <LifecycleToggle
                icon="◇"
                title="PV volume libre"
                metaOff="Inclus dans les listes de réassort et alertes PV"
                metaOn="Exclu des listes de réassort et alertes PV · bilans normaux"
                active={client.freePvTracking ?? false}
                busy={togglingFreePv}
                onToggle={() => void handleToggleFreePv()}
              />
            </div>
          </div>
        </div>

        {/* ─── COLONNE DROITE ─── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {/* Bloc 4A : Accès client */}
          <div className="at-card">
            <div className="at-label" style={{ marginBottom: 12 }}>
              Accès client
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "10px 12px",
                background: "var(--ls-actions-gold-bg)",
                borderRadius: 10,
                marginBottom: 8,
              }}
            >
              <div
                aria-hidden="true"
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: 8,
                  background: "var(--ls-actions-card)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 13,
                  flexShrink: 0,
                }}
              >
                🔗
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 500,
                    color: "var(--ls-actions-text)",
                  }}
                >
                  Envoyer l&apos;accès app
                </div>
                <div
                  style={{
                    fontSize: 10,
                    color: "var(--ls-actions-text-muted)",
                    marginTop: 2,
                  }}
                >
                  Lien d&apos;invitation à partager au client
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAccessModalOpen(true)}
                style={{
                  padding: "7px 12px",
                  fontSize: 11,
                  borderRadius: 7,
                  background: "#EF9F27",
                  color: "#fff",
                  border: "none",
                  fontWeight: 500,
                  cursor: "pointer",
                  flexShrink: 0,
                }}
              >
                Envoyer →
              </button>
            </div>

            {/* Ligne partage public */}
            <button
              type="button"
              onClick={onOpenSharePublic}
              disabled={!onOpenSharePublic}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 10,
                padding: "8px 10px",
                fontSize: 12,
                width: "100%",
                border: "none",
                background: "transparent",
                cursor: onOpenSharePublic ? "pointer" : "default",
                color: "var(--ls-actions-text)",
              }}
            >
              <span>Partage public</span>
              <SharePublicPill client={client} />
            </button>
          </div>

          {/* Bloc 4B : Propriété du dossier */}
          <div className="at-card">
            <div className="at-label" style={{ marginBottom: 12 }}>
              Propriété du dossier
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "8px 0",
                fontSize: 12,
                marginBottom: 8,
              }}
            >
              <div
                aria-hidden="true"
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: "50%",
                  background:
                    currentOwner?.role === "admin" ? "#0F6E56" : "#888780",
                  color: "#fff",
                  fontSize: 10,
                  fontWeight: 500,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                {(currentOwner?.name?.[0] ?? "?").toUpperCase()}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ color: "var(--ls-actions-text)", fontWeight: 500 }}>
                  {currentOwner?.name ?? client.distributorName ?? "Non assigné"}
                </div>
                <div
                  style={{
                    fontSize: 10,
                    color: "var(--ls-actions-text-muted)",
                    marginTop: 1,
                  }}
                >
                  Distributeur actuel
                </div>
              </div>
            </div>
            {canTransfer ? (
              <>
                <select
                  value={transferTo}
                  onChange={(e) => setTransferTo(e.target.value)}
                  disabled={transferring}
                  style={{
                    width: "100%",
                    padding: "8px 10px",
                    fontSize: 12,
                    borderRadius: 8,
                    border: "0.5px solid var(--ls-actions-border)",
                    background: "var(--ls-actions-soft)",
                    color: "var(--ls-actions-text-tertiary)",
                  }}
                >
                  <option value="">Transférer à…</option>
                  {assignableOwners.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name}
                    </option>
                  ))}
                </select>
                {transferTo ? (
                  <button
                    type="button"
                    onClick={() => void handleTransfer()}
                    disabled={transferring}
                    style={{
                      width: "100%",
                      marginTop: 8,
                      padding: "8px 10px",
                      fontSize: 12,
                      borderRadius: 8,
                      background: "#0F6E56",
                      color: "#fff",
                      border: "none",
                      cursor: transferring ? "wait" : "pointer",
                    }}
                  >
                    {transferring ? "Transfert…" : "Confirmer le transfert"}
                  </button>
                ) : null}
              </>
            ) : (
              <div
                style={{
                  fontSize: 11,
                  color: "var(--ls-actions-text-muted)",
                  fontStyle: "italic",
                }}
              >
                Transfert réservé aux admins et référents.
              </div>
            )}
          </div>

          {/* Bloc 4C : Zone sensible */}
          {canDelete ? (
            <div
              style={{
                background: "var(--ls-actions-red-bg)",
                borderRadius: 14,
                padding: "14px 18px",
                border: "0.5px solid rgba(224,75,75,0.15)",
              }}
            >
              <div
                className="at-label"
                style={{
                  color: "var(--ls-actions-red-text-dark)",
                  marginBottom: 8,
                }}
              >
                Zone sensible
              </div>
              {deleteStep === 0 ? (
                <button
                  type="button"
                  onClick={() => setDeleteStep(1)}
                  style={{
                    width: "100%",
                    padding: "8px 10px",
                    borderRadius: 8,
                    border: "0.5px solid rgba(224,75,75,0.3)",
                    background: "var(--ls-actions-card)",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    color: "var(--ls-actions-red-text)",
                    fontSize: 12,
                    fontWeight: 500,
                  }}
                >
                  <span>Supprimer ce dossier</span>
                  <span aria-hidden="true" style={{ fontSize: 11 }}>
                    🗑
                  </span>
                </button>
              ) : deleteStep === 1 ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <div
                    style={{
                      fontSize: 11,
                      color: "var(--ls-actions-red-text-dark)",
                      lineHeight: 1.5,
                    }}
                  >
                    Êtes-vous sûr·e ? Cette action est <strong>irréversible</strong>. Tous
                    les bilans, mensurations, messages et données liées seront perdus.
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button
                      type="button"
                      onClick={() => setDeleteStep(0)}
                      style={{
                        flex: 1,
                        padding: "7px 10px",
                        borderRadius: 7,
                        border: "0.5px solid var(--ls-actions-border)",
                        background: "var(--ls-actions-card)",
                        fontSize: 11,
                        cursor: "pointer",
                      }}
                    >
                      Annuler
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteStep(2)}
                      style={{
                        flex: 1,
                        padding: "7px 10px",
                        borderRadius: 7,
                        border: "none",
                        background: "#A32D2D",
                        color: "#fff",
                        fontSize: 11,
                        cursor: "pointer",
                      }}
                    >
                      Je confirme
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <div
                    style={{
                      fontSize: 11,
                      color: "var(--ls-actions-red-text-dark)",
                      lineHeight: 1.5,
                    }}
                  >
                    Tape <strong>SUPPRIMER</strong> pour confirmer définitivement.
                  </div>
                  <input
                    type="text"
                    value={deleteInput}
                    onChange={(e) => setDeleteInput(e.target.value)}
                    placeholder="SUPPRIMER"
                    style={{
                      width: "100%",
                      padding: "7px 10px",
                      borderRadius: 7,
                      border: "0.5px solid rgba(224,75,75,0.3)",
                      background: "var(--ls-actions-card)",
                      fontSize: 12,
                    }}
                  />
                  <div style={{ display: "flex", gap: 6 }}>
                    <button
                      type="button"
                      onClick={() => {
                        setDeleteStep(0);
                        setDeleteInput("");
                      }}
                      style={{
                        flex: 1,
                        padding: "7px 10px",
                        borderRadius: 7,
                        border: "0.5px solid var(--ls-actions-border)",
                        background: "var(--ls-actions-card)",
                        fontSize: 11,
                        cursor: "pointer",
                      }}
                    >
                      Annuler
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleDelete()}
                      disabled={deleteInput.trim() !== "SUPPRIMER" || deleting}
                      style={{
                        flex: 1,
                        padding: "7px 10px",
                        borderRadius: 7,
                        border: "none",
                        background:
                          deleteInput.trim() === "SUPPRIMER" ? "#A32D2D" : "rgba(211,209,199,0.4)",
                        color: "#fff",
                        fontSize: 11,
                        cursor:
                          deleteInput.trim() === "SUPPRIMER" && !deleting
                            ? "pointer"
                            : "not-allowed",
                      }}
                    >
                      {deleting ? "Suppression…" : "Supprimer définitivement"}
                    </button>
                  </div>
                </div>
              )}
              <div
                style={{
                  fontSize: 10,
                  color: "var(--ls-actions-red-text-dark)",
                  opacity: 0.7,
                  marginTop: 6,
                }}
              >
                Action irréversible · toutes les données seront perdues
              </div>
            </div>
          ) : null}
        </div>
      </div>

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

// ═══════════════════════════════════════════════════════════════════════
// Sous-composants
// ═══════════════════════════════════════════════════════════════════════

// StatusPill supprimé (utilisé uniquement par BLOC 1 Header identité
// retiré dans la refonte RDV premium 2026-04-26). LIFECYCLE_PILL_STYLES
// reste utilisé par LifecyclePill ci-dessous.

const LIFECYCLE_PILL_STYLES: Record<
  LifecycleStatus,
  { background: string; color: string; border: string }
> = {
  active: {
    background: "var(--ls-actions-teal-bg)",
    color: "var(--ls-actions-teal-text)",
    border: "#1D9E75",
  },
  paused: {
    background: "var(--ls-actions-gold-bg)",
    color: "var(--ls-actions-gold-text)",
    border: "#EF9F27",
  },
  not_started: {
    background: "var(--ls-actions-gold-bg)",
    color: "var(--ls-actions-gold-text)",
    border: "#EF9F27",
  },
  stopped: {
    background: "var(--ls-actions-red-bg)",
    color: "var(--ls-actions-red-text)",
    border: "#E24B4A",
  },
  lost: {
    background: "#F1EFE8",
    color: "#444441",
    border: "#B4B2A9",
  },
};

function LifecyclePill({
  status,
  active,
  disabled,
  onClick,
}: {
  status: LifecycleStatus;
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  const styles = LIFECYCLE_PILL_STYLES[status];
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: "9px 4px",
        borderRadius: 8,
        textAlign: "center",
        cursor: disabled ? "wait" : "pointer",
        fontSize: 10,
        fontWeight: 500,
        background: active ? styles.background : "var(--ls-actions-soft)",
        border: active
          ? `0.5px solid ${styles.border}`
          : "0.5px solid var(--ls-actions-border)",
        color: active ? styles.color : "var(--ls-actions-text-tertiary)",
        transition: "background 150ms ease, border-color 150ms ease",
      }}
    >
      {LIFECYCLE_LABELS[status]}
    </button>
  );
}

function LifecycleToggle({
  icon,
  title,
  metaOff,
  metaOn,
  active,
  busy,
  onToggle,
}: {
  icon: string;
  title: string;
  metaOff: string;
  metaOn: string;
  active: boolean;
  busy?: boolean;
  onToggle: () => void;
}) {
  return (
    <div
      style={{
        padding: "10px 12px",
        background: active
          ? "var(--ls-actions-teal-bg)"
          : "var(--ls-actions-soft)",
        borderRadius: 10,
        border: active ? "0.5px solid rgba(29,158,117,0.2)" : "0.5px solid transparent",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 10,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, minWidth: 0 }}>
        <span aria-hidden="true" style={{ fontSize: 14 }}>
          {icon}
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: 12,
              fontWeight: 500,
              color: active
                ? "var(--ls-actions-teal-text)"
                : "var(--ls-actions-text)",
            }}
          >
            {title}
          </div>
          <div
            style={{
              fontSize: 10,
              color: active ? "#0F6E56" : "var(--ls-actions-text-muted)",
              marginTop: 1,
            }}
          >
            {active ? metaOn : metaOff}
          </div>
        </div>
      </div>
      <button
        type="button"
        onClick={onToggle}
        disabled={busy}
        aria-label={title}
        aria-pressed={active}
        style={{
          width: 36,
          height: 20,
          borderRadius: 999,
          border: "none",
          background: active ? "#1D9E75" : "#D3D1C7",
          position: "relative",
          cursor: busy ? "wait" : "pointer",
          transition: "background 200ms ease",
          flexShrink: 0,
        }}
      >
        <span
          aria-hidden="true"
          style={{
            position: "absolute",
            top: 2,
            left: active ? 18 : 2,
            width: 16,
            height: 16,
            borderRadius: "50%",
            background: "#fff",
            boxShadow: "0 1px 2px rgba(0,0,0,0.15)",
            transition: "left 200ms ease",
          }}
        />
      </button>
    </div>
  );
}

function RowClickable({
  label,
  meta,
  onClick,
}: {
  label: string;
  meta: string;
  onClick: () => void;
}) {
  return (
    <button type="button" className="at-row-clickable" onClick={onClick}>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 13, color: "var(--ls-actions-text)" }}>{label}</div>
        <div style={{ fontSize: 10, color: "var(--ls-actions-text-muted)", marginTop: 1 }}>
          {meta}
        </div>
      </div>
      <span aria-hidden="true" style={{ fontSize: 12, color: "#B4B2A9" }}>
        →
      </span>
    </button>
  );
}

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