// Chantier Co-pilote V6 PREMIUM EXPERT (2026-04-29).
// Design ultra premium : conic gradient holographique anime + heure 56px
// avec text-shadow gold neon + greeting avec wave emoji anime + chips
// neumorphic + sparkles decoratifs.

import { greetingFor, moodForLoad } from "../../lib/utils/copiloteHelpers";

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
  const greeting = greetingFor(now.getHours());

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
        style={{ position: "absolute", top: 18, right: "30%", fontSize: 12, color: "var(--ls-gold)" }}
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
        style={{ position: "absolute", top: 38, left: "42%", fontSize: 10, color: "var(--ls-purple)" }}
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
                  background: "linear-gradient(135deg, #EF9F27 0%, #BA7517 60%, #5C3A05 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                  fontWeight: 800,
                }}
              >
                {" "}
                {userFirstName}
              </span>
            ) : null}{" "}
            <span className="ls-wave-emoji" style={{ fontSize: 26 }}>
              👋
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
              background:
                "linear-gradient(135deg, var(--ls-text) 0%, color-mix(in srgb, var(--ls-gold) 100%, transparent) 80%, #BA7517 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
              lineHeight: 1,
              padding: "8px 16px",
              borderRadius: 16,
              textShadow: "0 0 30px rgba(239,159,39,0.15)",
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
