// Chantier Co-pilote V5 PREMIUM (2026-04-29).
// Refonte design : gradient mesh anime gold/teal subtil + typographie
// hierarchie raffinee + chips stats compacts + micro-anims time digits.

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
        padding: "22px 24px",
        borderRadius: 20,
        background: "var(--ls-surface)",
        border: "0.5px solid var(--ls-border)",
        overflow: "hidden",
        boxShadow:
          "0 1px 0 0 color-mix(in srgb, var(--ls-gold) 8%, transparent), 0 8px 24px -8px rgba(0,0,0,0.06)",
      }}
    >
      {/* Gradient mesh anime — gold + teal, subtil, en arriere-plan */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          opacity: 0.55,
          pointerEvents: "none",
          background: `
            radial-gradient(circle at 0% 0%, color-mix(in srgb, var(--ls-gold) 22%, transparent) 0%, transparent 40%),
            radial-gradient(circle at 100% 100%, color-mix(in srgb, var(--ls-teal) 14%, transparent) 0%, transparent 50%),
            radial-gradient(circle at 100% 0%, color-mix(in srgb, var(--ls-purple) 10%, transparent) 0%, transparent 60%)
          `,
          animation: "ls-mesh-shift 18s ease-in-out infinite alternate",
        }}
      />

      <style>{`
        @keyframes ls-mesh-shift {
          0% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(8px, -4px) scale(1.04); }
          100% { transform: translate(-4px, 6px) scale(1); }
        }
        @keyframes ls-time-fade {
          from { opacity: 0; transform: translateY(2px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .ls-time-digits {
          animation: ls-time-fade 280ms ease-out;
        }
        @media (prefers-reduced-motion: reduce) {
          .ls-time-digits, [aria-hidden="true"][style*="ls-mesh-shift"] {
            animation: none !important;
          }
        }
      `}</style>

      <div style={{ position: "relative", display: "flex", alignItems: "center", gap: 24, flexWrap: "wrap" }}>
        {/* Bloc gauche : eyebrow + greeting + chips stats */}
        <div style={{ flex: 1, minWidth: 220 }}>
          <div
            style={{
              fontSize: 10,
              letterSpacing: 1.6,
              textTransform: "uppercase",
              fontWeight: 700,
              color: "color-mix(in srgb, var(--ls-gold) 90%, transparent)",
              marginBottom: 4,
            }}
          >
            {formatDateShort(now)}
          </div>
          <div
            style={{
              fontFamily: "Syne, serif",
              fontSize: 26,
              fontWeight: 700,
              color: "var(--ls-text)",
              lineHeight: 1.05,
              letterSpacing: "-0.01em",
            }}
          >
            {greeting}
            {userFirstName ? (
              <span style={{ color: "var(--ls-gold)" }}> {userFirstName}</span>
            ) : null}
            <span style={{ color: "var(--ls-text-muted)" }}> ✨</span>
          </div>

          {/* Chips stats compact */}
          <div
            style={{
              display: "flex",
              gap: 6,
              marginTop: 12,
              flexWrap: "wrap",
            }}
          >
            <StatChip
              icon="📅"
              label={`${appointmentsToday} RDV`}
              tone="teal"
            />
            <StatChip
              icon="🎯"
              label={`${followupsToday} suivi${followupsToday > 1 ? "s" : ""}`}
              tone="gold"
            />
            <StatChip icon="🧘" label={moodLabel} tone="muted" />
          </div>
        </div>

        {/* Horloge digital premium */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-end",
            flexShrink: 0,
          }}
        >
          <div
            style={{
              fontSize: 9,
              letterSpacing: 1.8,
              textTransform: "uppercase",
              fontWeight: 700,
              color: "var(--ls-text-hint)",
              marginBottom: 2,
            }}
          >
            Heure locale
          </div>
          <div
            key={formatTime(now)}
            className="ls-time-digits"
            style={{
              fontFamily: "Syne, serif",
              fontSize: 44,
              fontWeight: 600,
              letterSpacing: "-0.04em",
              background: "linear-gradient(135deg, var(--ls-text) 0%, color-mix(in srgb, var(--ls-gold) 80%, var(--ls-text)) 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
              lineHeight: 1,
            }}
          >
            {formatTime(now)}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatChip({
  icon,
  label,
  tone,
}: {
  icon: string;
  label: string;
  tone: "teal" | "gold" | "muted";
}) {
  const colors: Record<typeof tone, { bg: string; fg: string; border: string }> = {
    teal: {
      bg: "color-mix(in srgb, var(--ls-teal) 8%, var(--ls-surface))",
      fg: "var(--ls-teal)",
      border: "color-mix(in srgb, var(--ls-teal) 30%, transparent)",
    },
    gold: {
      bg: "color-mix(in srgb, var(--ls-gold) 10%, var(--ls-surface))",
      fg: "var(--ls-gold)",
      border: "color-mix(in srgb, var(--ls-gold) 30%, transparent)",
    },
    muted: {
      bg: "var(--ls-surface)",
      fg: "var(--ls-text-muted)",
      border: "var(--ls-border)",
    },
  };
  const c = colors[tone];
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        padding: "5px 10px",
        background: c.bg,
        border: `0.5px solid ${c.border}`,
        borderRadius: 999,
        fontSize: 11,
        fontWeight: 600,
        color: c.fg,
        fontFamily: "DM Sans, sans-serif",
      }}
    >
      <span style={{ fontSize: 12 }}>{icon}</span>
      {label}
    </span>
  );
}
