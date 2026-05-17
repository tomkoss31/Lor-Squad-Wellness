// =============================================================================
// BilanOnlineShell — Tokens partagés des 3 pages publiques bilan online.
// Implémente strictement le mockup validé `docs/mockups/bilan-online.html`
// (commit 25c0165, validé Thomas le 2026-05-10 lors de la session Égypte).
//
// Palette Lor'Squad / La Base 360 complète (gold + teal + coral + cream),
// Syne pour les titres, DM Sans pour le body, animations fadeIn/popIn/bounce.
// =============================================================================

import { type CSSProperties, type ReactNode } from "react";

// ── Design tokens light hardcodés (le mockup est light-only) ───────────────
export const BO = {
  gold: "#C9A84C",
  goldLight: "#E5C97D",
  teal: "#2DD4BF",
  tealDark: "#0F766E",
  coral: "#FB7185",
  charcoal: "#0B0D11",
  cream: "#FBF7F0",
  surface: "#FFFFFF",
  surface2: "#F7F3EC",
  border: "rgba(11, 13, 17, 0.10)",
  text: "#1F2937",
  textMuted: "#4B5563",
  textHint: "#9CA3AF",
  fontDisplay: "'Syne', Georgia, serif",
  fontBody: "'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif",
} as const;

// ── Keyframes injectées une fois ───────────────────────────────────────────
export const BO_KEYFRAMES = `
  @keyframes bo-fadeIn {
    from { opacity: 0; transform: translateY(8px); }
    to { opacity: 1; transform: translateY(0); }
  }
  @keyframes bo-bounce {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-8px); }
  }
  @keyframes bo-popIn {
    0% { transform: scale(0); opacity: 0; }
    60% { transform: scale(1.15); opacity: 1; }
    100% { transform: scale(1); }
  }
  @keyframes bo-slideIn {
    from { opacity: 0; transform: translateX(20px); }
    to { opacity: 1; transform: translateX(0); }
  }
  @media (prefers-reduced-motion: reduce) {
    .bo-bounce, .bo-pop, .bo-fade, .bo-slide { animation: none !important; }
  }
`;

// ── Brand "La Base 360 · Bilan" ────────────────────────────────────────────
export function BoBrand() {
  return (
    <div style={{
      fontFamily: BO.fontDisplay, fontSize: 13, fontWeight: 700,
      letterSpacing: "0.18em", color: BO.gold, textTransform: "uppercase",
    }}>
      La Base 360
      <span style={{
        display: "inline-block", width: 5, height: 5, borderRadius: "50%",
        background: BO.teal, margin: "0 6px", transform: "translateY(-2px)",
      }} />
      Bilan
    </div>
  );
}

// ── Shell : bg cream + max-width 480px (single column mobile-first) ───────
// Sur desktop, on garde le 480 du mockup mais avec un bg gradient large
// derrière + ombre sur la carte centrale → effet "card flottante éditoriale"
interface ShellProps {
  children: ReactNode;
  bgAccent?: boolean; // gradient peach top (welcome + merci)
  style?: CSSProperties;
}
export function BilanOnlineShell({ children, bgAccent, style }: ShellProps) {
  return (
    <div style={{
      minHeight: "100dvh",
      background: bgAccent
        ? `linear-gradient(180deg, #FAEEDA 0%, ${BO.cream} 60%)`
        : BO.cream,
      color: BO.text,
      fontFamily: BO.fontBody, fontSize: 16, lineHeight: 1.5,
      colorScheme: "light",
      padding: "clamp(0px, 4vw, 48px) 0",
      ...style,
    }}>
      <style>{BO_KEYFRAMES}</style>
      <div style={{
        maxWidth: 480,
        margin: "0 auto",
        background: bgAccent ? "transparent" : BO.surface,
        minHeight: bgAccent ? "auto" : "calc(100dvh - 80px)",
        boxShadow: bgAccent ? "none" : "0 4px 30px rgba(0, 0, 0, 0.08)",
        position: "relative",
        overflow: "hidden",
        borderRadius: "clamp(0px, 2vw, 24px)",
      }}>
        {children}
      </div>
    </div>
  );
}

// ── CTA primaire (gold gradient + lift hover) ─────────────────────────────
export function BoCtaPrimary({
  children, onClick, disabled, type = "button", style,
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  type?: "button" | "submit";
  style?: CSSProperties;
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      style={{
        display: "block", width: "100%",
        padding: "16px 24px",
        background: disabled
          ? BO.surface2
          : `linear-gradient(135deg, ${BO.gold} 0%, ${BO.goldLight} 100%)`,
        color: disabled ? BO.textHint : BO.charcoal,
        border: "none", borderRadius: 14,
        fontFamily: BO.fontDisplay, fontSize: 16, fontWeight: 700,
        cursor: disabled ? "not-allowed" : "pointer",
        boxShadow: disabled
          ? "none"
          : "0 4px 16px rgba(201, 168, 76, 0.3)",
        transition: "transform 0.18s, box-shadow 0.18s",
        ...style,
      }}
      onMouseEnter={(e) => {
        if (disabled) return;
        e.currentTarget.style.transform = "translateY(-2px)";
        e.currentTarget.style.boxShadow = "0 6px 22px rgba(201, 168, 76, 0.4)";
      }}
      onMouseLeave={(e) => {
        if (disabled) return;
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow = "0 4px 16px rgba(201, 168, 76, 0.3)";
      }}
    >
      {children}
    </button>
  );
}
