// =============================================================================
// FormationReviewCard — card validation en attente (Phase C)
//
// Affichee dans l onglet Formation de la messagerie. Border-left gold
// pulsante pour pending, OU purple si admin_relay. Boutons d action
// inline qui ouvrent ValidationDecisionDialog.
// =============================================================================

import { useState } from "react";
import { FormationStatusBadge } from "./FormationStatusBadge";
import { ValidationDecisionDialog } from "./ValidationDecisionDialog";
import type {
  FormationPendingReviewRow,
  FormationAdminRelayRow,
} from "../../features/formation/types-db";

interface Props {
  /** Card depuis la file sponsor OU depuis la file admin_relay. */
  row: FormationPendingReviewRow | FormationAdminRelayRow;
  /** True si c est admin qui consume (file admin_relay). */
  isAdminRelay?: boolean;
  /** Callback apres action effectuee (refresh queue parente). */
  onActionDone?: () => void;
}

function formatHoursPending(h: number): string {
  if (h < 1) return "à l'instant";
  if (h < 24) return `il y a ${h}h`;
  const days = Math.floor(h / 24);
  return `il y a ${days}j`;
}

export function FormationReviewCard({ row, isAdminRelay = false, onActionDone }: Props) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const accentVar = isAdminRelay ? "var(--ls-purple)" : "var(--ls-gold)";

  const hasSponsor = "sponsor_name" in row;
  const sponsorName = hasSponsor ? (row as FormationAdminRelayRow).sponsor_name : null;

  return (
    <>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 12,
          padding: "14px 16px",
          background: "var(--ls-surface)",
          border: "0.5px solid var(--ls-border)",
          borderLeft: `3px solid ${accentVar}`,
          borderRadius: 14,
          fontFamily: "DM Sans, sans-serif",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: "50%",
                background: `linear-gradient(135deg, ${accentVar} 0%, color-mix(in srgb, ${accentVar} 70%, #000) 100%)`,
                color: "white",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontFamily: "Syne, serif",
                fontWeight: 800,
                fontSize: 14,
                flexShrink: 0,
              }}
              aria-hidden="true"
            >
              {row.user_name.slice(0, 2).toUpperCase()}
            </div>
            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  fontFamily: "Syne, serif",
                  fontSize: 14,
                  fontWeight: 800,
                  color: "var(--ls-text)",
                  letterSpacing: "-0.01em",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {row.user_name}
              </div>
              <div style={{ fontSize: 11.5, color: "var(--ls-text-muted)", marginTop: 1 }}>
                Module <strong>{row.module_id}</strong>
                {row.quiz_score != null ? <> · Quiz {Math.round(row.quiz_score)}%</> : null}
              </div>
            </div>
          </div>
          <FormationStatusBadge
            status={isAdminRelay ? "pending_review_admin" : "pending_review_sponsor"}
          />
        </div>

        {/* Meta sponsor + delais */}
        <div style={{ fontSize: 11, color: "var(--ls-text-hint)", lineHeight: 1.5 }}>
          Soumis {formatHoursPending(row.hours_pending)}
          {isAdminRelay && sponsorName ? <> · sponsor {sponsorName} absent</> : null}
        </div>

        {/* Actions */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={() => setDialogOpen(true)}
            style={{
              flex: "1 1 auto",
              padding: "9px 14px",
              borderRadius: 999,
              border: "none",
              background: "linear-gradient(135deg, var(--ls-teal) 0%, color-mix(in srgb, var(--ls-teal) 70%, #000) 100%)",
              color: "var(--ls-teal-contrast, #FFFFFF)",
              fontFamily: "Syne, serif",
              fontWeight: 700,
              fontSize: 12.5,
              cursor: "pointer",
              boxShadow: "0 4px 12px -4px color-mix(in srgb, var(--ls-teal) 35%, transparent)",
            }}
          >
            ✅ Voir & valider
          </button>
        </div>
      </div>

      {dialogOpen ? (
        <ValidationDecisionDialog
          progressId={row.progress_id}
          userName={row.user_name}
          moduleId={row.module_id}
          quizScore={row.quiz_score}
          isAdminRelay={isAdminRelay}
          onClose={() => setDialogOpen(false)}
          onActionDone={() => {
            setDialogOpen(false);
            onActionDone?.();
          }}
        />
      ) : null}
    </>
  );
}
