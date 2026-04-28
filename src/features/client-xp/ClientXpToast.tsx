// =============================================================================
// ClientXpToast — popup gold qui slide-in apres un gain XP (Tier B)
// =============================================================================
//
// S abonne aux events ls:client-xp:gained dispatched par recordClientXp.
// Affiche un toast premium gold en haut a droite avec emoji + label + XP
// gagne. Auto-dismiss apres 2.6s. Empile si plusieurs gains rapides.
//
// A monter une fois sur ClientAppPage (au niveau racine).
// =============================================================================

import { useCallback, useEffect, useState } from "react";
import {
  useClientXpToast,
  type ClientXpGainedDetail,
} from "./useClientXp";

interface ToastItem {
  id: string;
  emoji: string;
  label: string;
  gainedXp: number;
  timestamp: number;
}

const AUTO_DISMISS_MS = 2600;

export function ClientXpToast() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const onGained = useCallback((detail: ClientXpGainedDetail) => {
    const item: ToastItem = {
      id: `xp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      emoji: detail.emoji,
      label: detail.label,
      gainedXp: detail.gainedXp,
      timestamp: Date.now(),
    };
    setToasts((prev) => [...prev, item]);
  }, []);

  useClientXpToast(onGained);

  // Auto-dismiss
  useEffect(() => {
    if (toasts.length === 0) return;
    const timers = toasts.map((t) =>
      window.setTimeout(() => {
        setToasts((prev) => prev.filter((x) => x.id !== t.id));
      }, AUTO_DISMISS_MS),
    );
    return () => {
      timers.forEach(window.clearTimeout);
    };
  }, [toasts]);

  if (toasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      style={{
        position: "fixed",
        top: "max(16px, env(safe-area-inset-top))",
        right: 16,
        left: 16,
        display: "flex",
        flexDirection: "column",
        gap: 8,
        zIndex: 10010,
        pointerEvents: "none",
        alignItems: "flex-end",
      }}
    >
      <style>{`
        @keyframes ls-xp-toast-in {
          0%   { opacity: 0; transform: translateY(-12px) scale(0.94); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes ls-xp-toast-pulse {
          0%, 100% { box-shadow: 0 6px 20px rgba(186,117,23,0.40); }
          50%      { box-shadow: 0 8px 28px rgba(239,159,39,0.65); }
        }
      `}</style>
      {toasts.map((t) => (
        <div
          key={t.id}
          role="status"
          style={{
            pointerEvents: "auto",
            display: "flex",
            alignItems: "center",
            gap: 10,
            background:
              "linear-gradient(135deg, #FFFEF8 0%, #FAF6E8 60%, #FCE5C1 100%)",
            border: "1px solid rgba(184,146,42,0.50)",
            borderRadius: 14,
            padding: "10px 16px 10px 12px",
            maxWidth: 360,
            fontFamily: "DM Sans, sans-serif",
            animation:
              "ls-xp-toast-in 280ms cubic-bezier(0.2, 0.8, 0.2, 1), ls-xp-toast-pulse 1800ms ease-in-out 280ms infinite",
            boxShadow: "0 6px 20px rgba(186,117,23,0.40)",
          }}
        >
          <span
            aria-hidden="true"
            style={{
              fontSize: 28,
              lineHeight: 1,
              flexShrink: 0,
            }}
          >
            {t.emoji}
          </span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontFamily: "Syne, serif",
                fontWeight: 700,
                fontSize: 13,
                color: "#5C4A0F",
                lineHeight: 1.2,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              +{t.gainedXp} XP
            </div>
            <div
              style={{
                fontSize: 11,
                color: "#6B6B62",
                marginTop: 2,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {t.label}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
