// Chantier Co-pilote V6 PREMIUM EXPERT (2026-04-29).
// Design ultra premium : conic gradient holographique anime + heure 56px
// avec text-shadow gold neon + greeting avec wave emoji anime + chips
// neumorphic + sparkles decoratifs.

import { greetingFor, moodForLoad } from "../../lib/utils/copiloteHelpers";
import { useAppContext } from "../../context/AppContext";
import { RankPinBadge } from "../rank/RankPinBadge";
import type { HerbalifeRank } from "../../types/domain";

function formatTime(d: Date): string {
  return d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

function formatDateShort(d: Date): string {
  return d.toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

// Gradient saisonnier de la journee (2026-04-29) — la couleur du prenom
// + de l'heure suit le cycle solaire/lunaire pour un effet vivant.
//
//   05-08h : aube (rose-orange chaud)
//   08-11h : matin (gold lumineux)
//   11-14h : midi (gold + teal solaire)
//   14-17h : apres-midi (gold sature)
//   17-20h : crepuscule (coral + purple)
//   20-23h : soir (purple + dark gold)
//   23-05h : nuit (purple + bleu silver)
function getTimeGradient(hour: number): { greeting: string; time: string; sparkleColor: string } {
  if (hour >= 5 && hour < 8) {
    // Aube — rose orange
    return {
      greeting: "linear-gradient(135deg, #FFB088 0%, #FF8866 50%, #EF9F27 100%)",
      time: "linear-gradient(135deg, var(--ls-text) 0%, #FFB088 60%, #EF9F27 100%)",
      sparkleColor: "#FF8866",
    };
  }
  if (hour >= 8 && hour < 11) {
    // Matin — gold lumineux
    return {
      greeting: "linear-gradient(135deg, #FFD56B 0%, #EF9F27 60%, #BA7517 100%)",
      time: "linear-gradient(135deg, var(--ls-text) 0%, #EF9F27 70%, #BA7517 100%)",
      sparkleColor: "#EF9F27",
    };
  }
  if (hour >= 11 && hour < 14) {
    // Midi — gold + teal solaire
    return {
      greeting: "linear-gradient(135deg, #EF9F27 0%, #BA7517 50%, #0D9488 100%)",
      time: "linear-gradient(135deg, var(--ls-text) 0%, #EF9F27 60%, #0D9488 100%)",
      sparkleColor: "#0D9488",
    };
  }
  if (hour >= 14 && hour < 17) {
    // Apres-midi — gold sature
    return {
      greeting: "linear-gradient(135deg, #EF9F27 0%, #BA7517 60%, #5C3A05 100%)",
      time: "linear-gradient(135deg, var(--ls-text) 0%, #BA7517 60%, #5C3A05 100%)",
      sparkleColor: "#BA7517",
    };
  }
  if (hour >= 17 && hour < 20) {
    // Crepuscule — coral + purple
    return {
      greeting: "linear-gradient(135deg, #FF6B6B 0%, #BA7517 40%, #7C3AED 100%)",
      time: "linear-gradient(135deg, var(--ls-text) 0%, #FF8866 50%, #7C3AED 100%)",
      sparkleColor: "#FF6B6B",
    };
  }
  if (hour >= 20 && hour < 23) {
    // Soir — purple dark gold
    return {
      greeting: "linear-gradient(135deg, #C084FC 0%, #7C3AED 50%, #BA7517 100%)",
      time: "linear-gradient(135deg, var(--ls-text) 0%, #C084FC 60%, #7C3AED 100%)",
      sparkleColor: "#C084FC",
    };
  }
  // Nuit (23-05h) — purple + bleu silver
  return {
    greeting: "linear-gradient(135deg, #A5B4FC 0%, #818CF8 40%, #7C3AED 100%)",
    time: "linear-gradient(135deg, var(--ls-text) 0%, #A5B4FC 60%, #7C3AED 100%)",
    sparkleColor: "#A5B4FC",
  };
}

export function ClockHeader({
  now,
  userFirstName,
  appointmentsToday,
  followupsToday,
}: {
  now: Date;
  userFirstName: string;
  appointmentsToday: number;
  followupsToday: number;
}) {
  const total = appointmentsToday + followupsToday;
  const { label: moodLabel } = moodForLoad(total);
  const { currentUser } = useAppContext();
  const userRank = (currentUser?.currentRank as HerbalifeRank | undefined) ?? "distributor_25";
  const hour = now.getHours();
  const greeting = greetingFor(hour);
  const gradient = getTimeGradient(hour);

  return (
    <div
      style={{
        position: "relative",
        padding: "26px 28px",
        borderRadius: 24,
        background: "var(--ls-surface)",
        border: "0.5px solid var(--ls-border)",
        overflow: "hidden",
        boxShadow:
          "0 1px 0 0 color-mix(in srgb, var(--ls-gold) 12%, transparent), 0 12px 36px -12px rgba(0,0,0,0.10), inset 0 1px 0 0 rgba(255,255,255,0.04)",
      }}
    >
      <style>{`
        @keyframes ls-conic-rotate {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes ls-wave {
          0%, 60%, 100% { transform: rotate(0deg); }
          10% { transform: rotate(14deg); }
          20% { transform: rotate(-8deg); }
          30% { transform: rotate(14deg); }
          40% { transform: rotate(-4deg); }
          50% { transform: rotate(10deg); }
        }
        @keyframes ls-sparkle {
          0%, 100% { opacity: 0; transform: scale(0.5) rotate(0deg); }
          50% { opacity: 1; transform: scale(1.2) rotate(180deg); }
        }
        @keyframes ls-time-flip {
          from { opacity: 0; transform: translateY(10px) scaleY(0.6); filter: blur(2px); }
          to { opacity: 1; transform: translateY(0) scaleY(1); filter: blur(0); }
        }
        @keyframes ls-glow-pulse {
          0%, 100% { box-shadow: 0 0 20px rgba(239,159,39,0.0), inset 0 0 0 0 rgba(255,255,255,0.04); }
          50% { box-shadow: 0 0 32px rgba(239,159,39,0.18), inset 0 0 0 0 rgba(255,255,255,0.04); }
        }
        .ls-clock-conic {
          position: absolute;
          inset: -50%;
          background: conic-gradient(
            from 0deg,
            transparent 0deg,
            rgba(239,159,39,0.18) 60deg,
            transparent 120deg,
            rgba(13,148,136,0.14) 180deg,
            transparent 240deg,
            rgba(124,58,237,0.12) 300deg,
            transparent 360deg
          );
          animation: ls-conic-rotate 28s linear infinite;
          opacity: 0.6;
          pointer-events: none;
          filter: blur(40px);
        }
        .ls-wave-emoji {
          display: inline-block;
          transform-origin: 70% 70%;
          animation: ls-wave 2.4s ease-in-out infinite;
        }
        .ls-sparkle-1 { animation: ls-sparkle 3.2s ease-in-out infinite; }
        .ls-sparkle-2 { animation: ls-sparkle 4.1s ease-in-out 0.6s infinite; }
        .ls-sparkle-3 { animation: ls-sparkle 3.7s ease-in-out 1.4s infinite; }
        .ls-time-digits-v3 {
          animation: ls-time-flip 360ms cubic-bezier(0.16, 1, 0.3, 1);
        }
        .ls-clock-card {
          animation: ls-glow-pulse 6s ease-in-out infinite;
        }
        @media (prefers-reduced-motion: reduce) {
          .ls-clock-conic, .ls-wave-emoji, .ls-sparkle-1, .ls-sparkle-2,
          .ls-sparkle-3, .ls-time-digits-v3, .ls-clock-card {
            animation: none !important;
          }
        }
      `}</style>

      {/* Conic gradient anime en arriere-plan */}
      <div className="ls-clock-conic" aria-hidden="true" />

      {/* Sparkles decoratifs */}
      <span
        className="ls-sparkle-1"
        aria-hidden="true"
        style={{ position: "absolute", top: 18, right: "30%", fontSize: 12, color: gradient.sparkleColor, transition: "color 1s ease" }}
      >
        ✦
      </span>
      <span
        className="ls-sparkle-2"
        aria-hidden="true"
        style={{ position: "absolute", bottom: 22, right: "8%", fontSize: 9, color: "var(--ls-teal)" }}
      >
        ✦
      </span>
      <span
        className="ls-sparkle-3"
        aria-hidden="true"
        style={{ position: "absolute", top: 38, left: "42%", fontSize: 10, color: gradient.sparkleColor, transition: "color 1s ease", opacity: 0.7 }}
      >
        ✦
      </span>

      <div style={{ position: "relative", display: "flex", alignItems: "center", gap: 28, flexWrap: "wrap" }}>
        {/* Bloc gauche */}
        <div style={{ flex: 1, minWidth: 240 }}>
          <div
            style={{
              fontSize: 10,
              letterSpacing: 2,
              textTransform: "uppercase",
              fontWeight: 700,
              color: "color-mix(in srgb, var(--ls-gold) 90%, transparent)",
              marginBottom: 6,
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <span
              style={{
                display: "inline-block",
                width: 6,
                height: 6,
                borderRadius: 999,
                background: "var(--ls-gold)",
                boxShadow: "0 0 8px rgba(239,159,39,0.6)",
              }}
            />
            {formatDateShort(now)}
          </div>
          <div
            style={{
              fontFamily: "Syne, serif",
              fontSize: 30,
              fontWeight: 800,
              color: "var(--ls-text)",
              lineHeight: 1.05,
              letterSpacing: "-0.02em",
            }}
          >
            {greeting}
            {userFirstName ? (
              <span
                style={{
                  background: gradient.greeting,
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                  fontWeight: 800,
                  transition: "background 1s ease",
                }}
              >
                {" "}
                {userFirstName}
              </span>
            ) : null}{" "}
            <span className="ls-wave-emoji" style={{ fontSize: 26 }}>
              👋
            </span>
            {/* Pin Herbalife (rang actuel) — visible juste après le prénom. */}
            <span style={{ marginLeft: 10, verticalAlign: "middle", display: "inline-block" }}>
              <RankPinBadge rank={userRank} size="sm" />
            </span>
          </div>

          {/* Chips neumorphic */}
          <div style={{ display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap" }}>
            <NeoChip icon="📅" label={`${appointmentsToday} RDV`} tone="teal" />
            <NeoChip
              icon="🎯"
              label={`${followupsToday} suivi${followupsToday > 1 ? "s" : ""}`}
              tone="gold"
            />
            <NeoChip icon="🧘" label={moodLabel} tone="muted" />
          </div>
        </div>

        {/* Horloge digitale geante avec gold neon */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-end",
            flexShrink: 0,
            position: "relative",
          }}
        >
          <div
            style={{
              fontSize: 9,
              letterSpacing: 2,
              textTransform: "uppercase",
              fontWeight: 700,
              color: "var(--ls-text-hint)",
              marginBottom: 4,
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <span
              style={{
                display: "inline-block",
                width: 5,
                height: 5,
                borderRadius: 999,
                background: "#10b981",
                boxShadow: "0 0 6px rgba(16,185,129,0.8)",
                animation: "ls-glow-pulse 2s ease-in-out infinite",
              }}
            />
            Live
          </div>
          <div
            key={formatTime(now)}
            className="ls-time-digits-v3 ls-clock-card"
            style={{
              fontFamily: "Syne, serif",
              fontSize: 56,
              fontWeight: 700,
              letterSpacing: "-0.05em",
              background: gradient.time,
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
              lineHeight: 1,
              padding: "8px 16px",
              borderRadius: 16,
              textShadow: `0 0 30px ${gradient.sparkleColor}33`,
              transition: "background 1s ease, text-shadow 1s ease",
            }}
          >
            {formatTime(now)}
          </div>
        </div>
      </div>
    </div>
  );
}

function NeoChip({
  icon,
  label,
  tone,
}: {
  icon: string;
  label: string;
  tone: "teal" | "gold" | "muted";
}) {
  const colors: Record<typeof tone, { bg: string; fg: string; shadow: string }> = {
    teal: {
      bg: "linear-gradient(135deg, color-mix(in srgb, var(--ls-teal) 8%, var(--ls-surface)) 0%, var(--ls-surface) 100%)",
      fg: "var(--ls-teal)",
      shadow:
        "inset 0 1px 0 0 rgba(255,255,255,0.06), 0 1px 2px rgba(13,148,136,0.10), 0 0 0 0.5px color-mix(in srgb, var(--ls-teal) 30%, transparent)",
    },
    gold: {
      bg: "linear-gradient(135deg, color-mix(in srgb, var(--ls-gold) 10%, var(--ls-surface)) 0%, var(--ls-surface) 100%)",
      fg: "var(--ls-gold)",
      shadow:
        "inset 0 1px 0 0 rgba(255,255,255,0.06), 0 1px 2px rgba(184,146,42,0.12), 0 0 0 0.5px color-mix(in srgb, var(--ls-gold) 30%, transparent)",
    },
    muted: {
      bg: "var(--ls-surface)",
      fg: "var(--ls-text-muted)",
      shadow:
        "inset 0 1px 0 0 rgba(255,255,255,0.04), 0 1px 2px rgba(0,0,0,0.05), 0 0 0 0.5px var(--ls-border)",
    },
  };
  const c = colors[tone];
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        padding: "6px 12px",
        background: c.bg,
        borderRadius: 999,
        fontSize: 11,
        fontWeight: 700,
        color: c.fg,
        fontFamily: "DM Sans, sans-serif",
        boxShadow: c.shadow,
        letterSpacing: 0.2,
      }}
    >
      <span style={{ fontSize: 13 }}>{icon}</span>
      {label}
    </span>
  );
}
