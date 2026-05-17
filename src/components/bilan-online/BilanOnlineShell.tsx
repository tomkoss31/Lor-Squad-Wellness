// =============================================================================
// BilanOnlineShell — Shell éditorial commun aux 3 pages publiques bilan online.
// Implémenté depuis le design Claude Design "Bilan Online - La Base 360"
// (handoff bundle 2026-05-17). Whoop × Aesop, club éditorial discret.
//
// Composants : Wordmark · Header sticky transparent · Progress optionnelle ·
// Mesh background subtil · Footer microcopy RGPD.
// =============================================================================

import { type ReactNode, type CSSProperties } from "react";

// ── Design tokens partagés ─────────────────────────────────────────────────
export const BO_TOKENS = {
  cream: "#FAFAF7",
  navy: "#0F172A",
  gold: "#C9A84C",
  goldSoft: "#E0BF6B",
  hair: "#E5E7EB",
  shellBg: "#ECECE8",
  fontDisplay: "'Sora', system-ui, -apple-system, sans-serif",
  fontBody: "'Inter', system-ui, -apple-system, sans-serif",
} as const;

// ── Wordmark "LA BASE 360" ────────────────────────────────────────────────
export function Wordmark() {
  return (
    <div style={{ display: "inline-flex", alignItems: "flex-end", gap: 8 }}>
      <span style={{
        fontFamily: BO_TOKENS.fontDisplay, fontWeight: 500, fontSize: 14,
        letterSpacing: "0.22em", color: BO_TOKENS.navy,
      }}>
        LA BASE
      </span>
      <span style={{ position: "relative", display: "inline-block", paddingBottom: 2 }}>
        <span style={{
          fontFamily: BO_TOKENS.fontDisplay, fontWeight: 600, fontSize: 14,
          letterSpacing: "0.04em", color: BO_TOKENS.gold,
        }}>
          360
        </span>
        <span style={{
          position: "absolute", left: 0, right: 0, bottom: -2,
          height: 1, background: BO_TOKENS.gold,
        }} />
      </span>
    </div>
  );
}

// ── Header sticky transparent ──────────────────────────────────────────────
export function BoHeader({ tagline = "Bilan offert · 2 min" }: { tagline?: string }) {
  return (
    <div style={{
      position: "sticky", top: 0, zIndex: 30,
      paddingTop: "calc(env(safe-area-inset-top, 0px) + 12px)",
      background: "rgba(250, 250, 247, 0.72)",
      backdropFilter: "saturate(180%) blur(14px)",
      WebkitBackdropFilter: "saturate(180%) blur(14px)",
      borderBottom: "1px solid rgba(15, 23, 42, 0.05)",
    }}>
      <div style={{
        height: 64, padding: "0 24px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <Wordmark />
        <span style={{
          fontFamily: BO_TOKENS.fontBody, fontWeight: 400, fontSize: 13,
          color: BO_TOKENS.gold, opacity: 0.7, letterSpacing: 0.1,
        }}>
          {tagline}
        </span>
      </div>
    </div>
  );
}

// ── Progress bar gold 2px ─────────────────────────────────────────────────
export function BoProgress({ value }: { value: number }) {
  return (
    <div style={{ height: 2, width: "100%", background: "rgba(15, 23, 42, 0.06)" }}>
      <div style={{
        height: "100%", width: `${Math.max(0, Math.min(1, value)) * 100}%`,
        background: `linear-gradient(90deg, ${BO_TOKENS.gold}, ${BO_TOKENS.goldSoft})`,
        transition: "width 480ms cubic-bezier(.2, .7, .2, 1)",
      }} />
    </div>
  );
}

// ── Mesh background (3 blobs subtils) ──────────────────────────────────────
export function BoMesh() {
  return (
    <div aria-hidden style={{
      position: "absolute", inset: 0, pointerEvents: "none", zIndex: 0,
      overflow: "hidden",
    }}>
      <div style={{
        position: "absolute", width: 420, height: 420, left: -120, top: -60,
        borderRadius: "50%",
        background: "radial-gradient(closest-side, rgba(16, 185, 129, 0.14), rgba(16, 185, 129, 0) 70%)",
        filter: "blur(20px)",
      }} />
      <div style={{
        position: "absolute", width: 380, height: 380, right: -140, top: 120,
        borderRadius: "50%",
        background: "radial-gradient(closest-side, rgba(6, 182, 212, 0.12), rgba(6, 182, 212, 0) 70%)",
        filter: "blur(20px)",
      }} />
      <div style={{
        position: "absolute", width: 460, height: 460, left: -60, bottom: -160,
        borderRadius: "50%",
        background: "radial-gradient(closest-side, rgba(139, 92, 246, 0.10), rgba(139, 92, 246, 0) 70%)",
        filter: "blur(24px)",
      }} />
    </div>
  );
}

// ── Eyebrow + filet gold 64px ─────────────────────────────────────────────
export function BoEyebrow({ children }: { children: ReactNode }) {
  return (
    <div>
      <div style={{
        fontFamily: BO_TOKENS.fontDisplay, fontWeight: 500, fontSize: 13,
        letterSpacing: "0.18em", color: BO_TOKENS.gold, textTransform: "uppercase",
      }}>
        {children}
      </div>
      <div style={{ height: 1, width: 64, background: BO_TOKENS.gold, marginTop: 14 }} />
    </div>
  );
}

// ── H1 éditorial ──────────────────────────────────────────────────────────
export function BoHero({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return (
    <h1 style={{
      margin: 0,
      fontFamily: BO_TOKENS.fontDisplay, fontWeight: 600,
      fontSize: 40, lineHeight: 1.05, letterSpacing: "-0.025em",
      color: BO_TOKENS.navy,
      ...style,
    }}>
      {children}
    </h1>
  );
}

// ── Lead paragraph ────────────────────────────────────────────────────────
export function BoLead({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return (
    <p style={{
      margin: 0,
      fontFamily: BO_TOKENS.fontBody, fontWeight: 400,
      fontSize: 18, lineHeight: 1.45,
      color: BO_TOKENS.navy, opacity: 0.7, maxWidth: 320,
      ...style,
    }}>
      {children}
    </p>
  );
}

// ── CTA primaire gold gradient ────────────────────────────────────────────
interface BoCtaProps {
  children: ReactNode;
  disabled?: boolean;
  onClick?: () => void;
  type?: "button" | "submit";
}
export function BoCta({ children, disabled, onClick, type = "button" }: BoCtaProps) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      style={{
        all: "unset", boxSizing: "border-box",
        width: "100%", padding: "18px 0",
        textAlign: "center", borderRadius: 14,
        background: disabled
          ? "linear-gradient(135deg, #D9CFB1, #E5D9B7)"
          : `linear-gradient(135deg, ${BO_TOKENS.gold}, ${BO_TOKENS.goldSoft})`,
        color: "white",
        fontFamily: BO_TOKENS.fontBody, fontWeight: 700, fontSize: 16,
        letterSpacing: 0.1,
        boxShadow: disabled
          ? "0 2px 8px rgba(201, 168, 76, 0.10)"
          : "0 8px 24px rgba(201, 168, 76, 0.30), inset 0 1px 0 rgba(255, 255, 255, 0.35)",
        cursor: disabled ? "not-allowed" : "pointer",
        transition: "transform 160ms, box-shadow 220ms",
      }}
      onMouseDown={(e) => { if (!disabled) e.currentTarget.style.transform = "scale(0.985)"; }}
      onMouseUp={(e) => { e.currentTarget.style.transform = "scale(1)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.transform = "scale(1)"; }}
    >
      <span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
        {children}
      </span>
    </button>
  );
}

export function BoArrow() {
  return (
    <svg width="16" height="12" viewBox="0 0 16 12" fill="none" aria-hidden>
      <path d="M1 6h14m0 0L10 1m5 5l-5 5" stroke="white" strokeWidth="1.6"
        strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ── Microcopy RGPD ────────────────────────────────────────────────────────
export function BoFooterRgpd({ children = "Tes réponses restent confidentielles · RGPD" }: { children?: ReactNode }) {
  return (
    <div style={{
      textAlign: "center", fontFamily: BO_TOKENS.fontBody, fontSize: 12,
      color: BO_TOKENS.navy, opacity: 0.5, letterSpacing: 0.1,
    }}>
      {children}
    </div>
  );
}

// ── Shell complet ─────────────────────────────────────────────────────────
interface ShellProps {
  children: ReactNode;
  progress?: number; // 0..1 ; ne pas passer = pas de barre
  tagline?: string;
}
export function BilanOnlineShell({ children, progress, tagline }: ShellProps) {
  return (
    <div style={{
      minHeight: "100dvh",
      background: BO_TOKENS.cream, color: BO_TOKENS.navy,
      position: "relative", overflow: "hidden",
      colorScheme: "light",
    }}>
      <BoMesh />
      <BoHeader tagline={tagline} />
      {progress !== undefined && <BoProgress value={progress} />}
      <div style={{ position: "relative", zIndex: 1 }}>
        {children}
      </div>
    </div>
  );
}
