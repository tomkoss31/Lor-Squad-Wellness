import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAppContext } from "../../context/AppContext";
import { useToast, buildSupabaseErrorToast } from "../../context/ToastContext";
import {
  getFollowUpsDue,
  type FollowUpDueItem,
} from "../../lib/followUpProtocolScheduler";
import {
  FOLLOW_UP_PROTOCOL,
  type FollowUpStep,
} from "../../data/followUpProtocol";
import { logSupabaseFollowUpProtocolStep } from "../../services/supabaseService";
import { FollowUpStepModal } from "../follow-up/FollowUpStepModal";

/**
 * Chantier Protocole Agenda+Dashboard (2026-04-20)
 * Widget Dashboard "Suivis à faire aujourd'hui" — visible uniquement si ≥ 1
 * suivi dû ou en retard. Affiche max 5 items, "Voir tout" si plus.
 */
export function FollowUpsDueWidget() {
  const { currentUser, clients, followUpProtocolLogs, refreshFollowUpProtocolLogs } = useAppContext();
  const { push: pushToast } = useToast();
  const navigate = useNavigate();
  const [openItem, setOpenItem] = useState<FollowUpDueItem | null>(null);
  const [busy, setBusy] = useState(false);

  // Stable "now" par render pour éviter les invalidations mémo en cascade.
  const today = useMemo(() => new Date(), []);

  const dueItems = useMemo(() => {
    if (!currentUser) return [] as FollowUpDueItem[];
    return getFollowUpsDue(clients, currentUser.id, followUpProtocolLogs, { now: today });
  }, [clients, currentUser, followUpProtocolLogs, today]);

  if (!currentUser || dueItems.length === 0) return null;

  const visible = dueItems.slice(0, 5);
  const hiddenCount = Math.max(0, dueItems.length - visible.length);

  const openStep: FollowUpStep | null = openItem
    ? FOLLOW_UP_PROTOCOL.find((s) => s.id === openItem.stepId) ?? null
    : null;
  const existingLog = openItem
    ? followUpProtocolLogs.find(
        (l) => l.clientId === openItem.client.id && l.stepId === openItem.stepId
      )
    : undefined;

  async function handleMarkSent(item: FollowUpDueItem) {
    if (!currentUser) return;
    setBusy(true);
    try {
      await logSupabaseFollowUpProtocolStep({
        clientId: item.client.id,
        coachId: currentUser.id,
        stepId: item.stepId,
      });
      await refreshFollowUpProtocolLogs();
      pushToast({ tone: "success", title: `${item.stepShortTitle} marqué envoyé ✓` });
      setOpenItem(null);
    } catch (err) {
      pushToast(
        buildSupabaseErrorToast(
          err,
          "Impossible d'enregistrer l'envoi. Vérifie la migration SQL follow_up_protocol_log."
        )
      );
    } finally {
      setBusy(false);
    }
  }

  function goToClient(item: FollowUpDueItem) {
    // Ouvre la fiche client avec l'onglet Actions pré-sélectionné.
    navigate(`/clients/${item.client.id}?tab=actions`);
  }

  return (
    <>
      <div
        style={{
          background: "var(--ls-surface)",
          border: "1px solid var(--ls-border)",
          borderRadius: 14,
          padding: 20,
        }}
      >
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", flexWrap: "wrap", gap: 10, marginBottom: 14 }}>
          <div>
            <div style={{ fontSize: 9, letterSpacing: "2px", textTransform: "uppercase", color: "var(--ls-text-hint)", fontWeight: 500, marginBottom: 4, fontFamily: "'DM Sans', sans-serif" }}>
              À faire maintenant
            </div>
            <div style={{ fontFamily: "Syne, sans-serif", fontWeight: 800, fontSize: 17, color: "var(--ls-text)" }}>
              Suivis à faire · {dueItems.length}
            </div>
          </div>
          <button
            type="button"
            onClick={() => navigate("/agenda?filter=today&tab=followups")}
            style={{
              padding: "7px 14px",
              border: "1px solid var(--ls-border)",
              background: "transparent",
              color: "var(--ls-text-muted)",
              borderRadius: 9,
              fontSize: 11,
              cursor: "pointer",
              fontFamily: "'DM Sans', sans-serif",
            }}
          >
            Voir tout →
          </button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {visible.map((item) => (
            <DueRow
              key={`${item.client.id}-${item.stepId}`}
              item={item}
              onOpen={() => setOpenItem(item)}
              onRowClick={() => goToClient(item)}
            />
          ))}

          {hiddenCount > 0 && (
            <button
              type="button"
              onClick={() => navigate("/agenda?filter=today&tab=followups")}
              style={{
                marginTop: 2,
                padding: "10px 12px",
                background: "color-mix(in srgb, var(--ls-teal) 6%, transparent)",
                border: "1px solid color-mix(in srgb, var(--ls-teal) 20%, transparent)",
                borderRadius: 10,
                color: "var(--ls-teal)",
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: "'DM Sans', sans-serif",
                textAlign: "center",
              }}
            >
              Voir tout les suivis (+{hiddenCount}) →
            </button>
          )}
        </div>
      </div>

      {openStep && openItem && (
        <FollowUpStepModal
          step={openStep}
          client={openItem.client}
          existingLog={existingLog}
          onClose={() => setOpenItem(null)}
          onMarkSent={() => handleMarkSent(openItem)}
          busy={busy}
        />
      )}
    </>
  );
}

function DueRow({
  item,
  onOpen,
  onRowClick,
}: {
  item: FollowUpDueItem;
  onOpen: () => void;
  onRowClick: () => void;
}) {
  const isLate = item.status === "overdue_1d" || item.status === "overdue_more";
  const lateLabel = item.status === "overdue_1d"
    ? "En retard 1j"
    : item.status === "overdue_more"
      ? `En retard ${item.daysLate}j`
      : null;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "10px 12px",
        borderRadius: 12,
        background: "var(--ls-surface2)",
        border: "1px solid var(--ls-border)",
        transition: "border-color 150ms",
      }}
    >
      {/* Pastille gauche */}
      <div
        aria-hidden="true"
        style={{
          width: 3,
          alignSelf: "stretch",
          borderRadius: 3,
          background: isLate ? "var(--ls-coral)" : "var(--ls-gold)",
          flexShrink: 0,
        }}
      />

      {/* Clickable row (text) */}
      <button
        type="button"
        onClick={onRowClick}
        style={{
          flex: 1,
          minWidth: 0,
          background: "transparent",
          border: "none",
          padding: 0,
          textAlign: "left",
          cursor: "pointer",
          fontFamily: "'DM Sans', sans-serif",
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}
        aria-label={`Ouvrir la fiche de ${item.client.firstName} ${item.client.lastName}`}
      >
        <span aria-hidden="true" style={{ fontSize: 18 }}>
          💬
        </span>
        <span style={{ flex: 1, minWidth: 0 }}>
          <span style={{ display: "block", fontSize: 13, fontWeight: 600, color: "var(--ls-text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {item.client.firstName} {item.client.lastName} · J+{item.dayOffset}
            {lateLabel && (
              <span
                style={{
                  marginLeft: 8,
                  padding: "1px 7px",
                  borderRadius: 6,
                  fontSize: 10,
                  fontWeight: 700,
                  background: "rgba(220,38,38,0.1)",
                  color: "var(--ls-coral)",
                  letterSpacing: "0.02em",
                }}
              >
                {lateLabel}
              </span>
            )}
          </span>
          <span style={{ display: "block", fontSize: 11, color: "var(--ls-text-muted)", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {item.stepIconEmoji} {item.stepShortTitle}
          </span>
        </span>
      </button>

      {/* Bouton Envoyer — ouvre la popup directement */}
      <button
        type="button"
        onClick={onOpen}
        style={{
          padding: "7px 12px",
          borderRadius: 9,
          border: "none",
          background: "var(--ls-gold)",
          color: "var(--ls-gold-contrast, #0B0D11)",
          fontSize: 12,
          fontWeight: 700,
          cursor: "pointer",
          fontFamily: "'Syne', sans-serif",
          flexShrink: 0,
        }}
      >
        Envoyer
      </button>
    </div>
  );
}
