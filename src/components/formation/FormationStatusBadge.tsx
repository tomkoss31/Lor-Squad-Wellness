// =============================================================================
// FormationStatusBadge — badge statut progression module (Phase C)
//
// Couleurs alignees sur la spec :
//   - validated         → teal (✓)
//   - pending_review_sponsor → gold pulse
//   - pending_review_admin   → purple (admin relay >48h)
//   - rejected          → coral
//   - in_progress       → neutral muted
//   - not_started       → neutral hint
// =============================================================================

import type { FormationProgressStatus } from "../../features/formation/types-db";

interface Props {
  status: FormationProgressStatus;
  /** Variation visuelle compacte (cards) ou large (header). */
  size?: "sm" | "md";
}

const STATUS_META: Record<
  FormationProgressStatus,
  { label: string; emoji: string; color: string; pulse?: boolean }
> = {
  not_started: { label: "À démarrer", emoji: "○", color: "var(--ls-text-hint)" },
  in_progress: { label: "En cours", emoji: "◐", color: "var(--ls-text-muted)" },
  pending_review_sponsor: {
    label: "En attente",
    emoji: "🟡",
    color: "var(--ls-gold)",
    pulse: true,
  },
  pending_review_admin: {
    label: "Admin relay",
    emoji: "🟣",
    color: "var(--ls-purple)",
  },
  validated: { label: "Validé", emoji: "✓", color: "var(--ls-teal)" },
  rejected: { label: "À refaire", emoji: "↻", color: "var(--ls-coral)" },
};

export function FormationStatusBadge({ status, size = "sm" }: Props) {
  const meta = STATUS_META[status];
  const padding = size === "md" ? "5px 12px" : "3px 8px";
  const fontSize = size === "md" ? 12 : 10.5;

  return (
    <>
      {meta.pulse ? (
        <style>{`
          @keyframes ls-formation-pulse {
            0%, 100% { box-shadow: 0 0 0 0 color-mix(in srgb, var(--ls-gold) 35%, transparent); }
            50%      { box-shadow: 0 0 0 4px color-mix(in srgb, var(--ls-gold) 20%, transparent); }
          }
          @media (prefers-reduced-motion: reduce) {
            .ls-formation-status-pulse { animation: none !important; }
          }
        `}</style>
      ) : null}
      <span
        className={meta.pulse ? "ls-formation-status-pulse" : undefined}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 4,
          padding,
          borderRadius: 999,
          background: `color-mix(in srgb, ${meta.color} 14%, transparent)`,
          color: meta.color,
          fontSize,
          fontWeight: 700,
          fontFamily: "DM Sans, sans-serif",
          letterSpacing: "0.02em",
          border: `0.5px solid color-mix(in srgb, ${meta.color} 32%, transparent)`,
          animation: meta.pulse ? "ls-formation-pulse 2.4s ease-in-out infinite" : undefined,
        }}
      >
        <span aria-hidden="true">{meta.emoji}</span>
        {meta.label}
      </span>
    </>
  );
}
