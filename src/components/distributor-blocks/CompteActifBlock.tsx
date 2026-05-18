// =============================================================================
// CompteActifBlock — toggle Geler / Reactiver le compte distri (admin only)
// =============================================================================
// Extrait de TeamMemberDrilldownModal (Chantier #13 sous-vague A.1, 2026-05-18).
// =============================================================================

import { useState } from "react";
import { useToast, buildSupabaseErrorToast } from "../../context/ToastContext";
import { freezeUserAccount, unfreezeUserAccount } from "../../services/supabaseService";
import type { User } from "../../types/domain";

interface Props {
  memberId: string;
  memberName: string;
  fullUser: User | null;
  onApplied?: () => void | Promise<void>;
  /** Optionnel : ferme la modale parente apres l'action. */
  onAfterToggle?: () => void;
}

export function CompteActifBlock({
  memberId,
  memberName,
  fullUser,
  onApplied,
  onAfterToggle,
}: Props) {
  const { push: pushToast } = useToast();
  const [freezing, setFreezing] = useState(false);
  const isFrozen = !!fullUser?.frozenAt;

  async function handleToggle() {
    if (freezing) return;
    setFreezing(true);
    try {
      if (isFrozen) {
        await unfreezeUserAccount(memberId);
        pushToast({
          tone: "success",
          title: "Compte réactivé",
          message: `${memberName} retrouve l'accès à l'app.`,
        });
      } else {
        await freezeUserAccount({
          userId: memberId,
          reason: "Gelé manuellement par admin",
        });
        pushToast({
          tone: "success",
          title: "Compte gelé",
          message: `${memberName} ne pourra plus accéder à l'app jusqu'à réactivation.`,
        });
      }
      await onApplied?.();
      onAfterToggle?.();
    } catch (err) {
      pushToast(buildSupabaseErrorToast(err, "Action impossible pour le moment."));
    } finally {
      setFreezing(false);
    }
  }

  return (
    <div
      style={{
        marginTop: 18,
        padding: 14,
        borderRadius: 12,
        background: isFrozen
          ? "color-mix(in srgb, var(--ls-coral) 8%, var(--ls-surface2))"
          : "var(--ls-surface2)",
        border: isFrozen
          ? "1px solid color-mix(in srgb, var(--ls-coral) 35%, transparent)"
          : "1px solid var(--ls-border)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 12,
            fontWeight: 700,
            color: isFrozen ? "var(--ls-coral)" : "var(--ls-text)",
            letterSpacing: 0.3,
            marginBottom: 2,
          }}
        >
          {isFrozen ? "🧊 Compte gelé" : "🟢 Compte actif"}
        </div>
        <div style={{ fontSize: 11, color: "var(--ls-text-muted)", lineHeight: 1.4 }}>
          {isFrozen
            ? "L'utilisateur ne peut plus accéder à l'app et n'apparaît plus dans les stats équipe."
            : "Geler ce compte pour qu'il ne pollue plus stats / podium / agendas."}
        </div>
      </div>
      <button
        type="button"
        onClick={() => void handleToggle()}
        disabled={freezing}
        role="switch"
        aria-checked={!isFrozen}
        style={{
          position: "relative",
          width: 56,
          height: 30,
          borderRadius: 999,
          border: "none",
          background: isFrozen ? "#475569" : "var(--ls-teal)",
          cursor: freezing ? "wait" : "pointer",
          transition: "background 0.2s ease",
          opacity: freezing ? 0.6 : 1,
          flexShrink: 0,
        }}
        title={isFrozen ? "Réactiver le compte" : "Geler le compte"}
      >
        <span
          style={{
            position: "absolute",
            top: 3,
            left: isFrozen ? 3 : 29,
            width: 24,
            height: 24,
            borderRadius: "50%",
            background: "white",
            transition: "left 0.2s ease",
            boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
          }}
        />
      </button>
    </div>
  );
}
