// Chantier Co-pilote V4 (2026-04-24).
// Mini-fix (2026-04-24bis) : layout inversé — salutation à gauche, horloge
// 38px à droite. Date intégrée dans la ligne mood pour gain de place.

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
        padding: "18px 20px",
        borderRadius: 16,
        background: "var(--ls-surface)",
        border: "1px solid var(--ls-border)",
        display: "flex",
        alignItems: "center",
        gap: 20,
        flexWrap: "wrap",
      }}
    >
      {/* Bloc gauche : salutation + ligne mood (date + compteur + mood). */}
      <div style={{ flex: 1, minWidth: 200 }}>
        <div
          style={{
            fontFamily: "Syne, sans-serif",
            fontSize: 20,
            fontWeight: 600,
            color: "var(--ls-text)",
          }}
        >
          {greeting}
          {userFirstName ? ` ${userFirstName}` : ""}
        </div>
        <div style={{ fontSize: 12, color: "var(--ls-text-muted)", marginTop: 4 }}>
          {formatDateShort(now)} · {appointmentsToday} RDV · {followupsToday} suivi
          {followupsToday > 1 ? "s" : ""}. {moodLabel}
        </div>
      </div>

      {/* Séparateur vertical fin + horloge 38px à droite. */}
      <div
        aria-hidden="true"
        style={{
          width: 1,
          height: 52,
          background: "var(--ls-border)",
          flexShrink: 0,
        }}
      />
      <div
        style={{
          fontFamily: "Syne, sans-serif",
          fontSize: 38,
          fontWeight: 500,
          letterSpacing: "-0.02em",
          color: "var(--ls-text)",
          lineHeight: 1,
          flexShrink: 0,
        }}
      >
        {formatTime(now)}
      </div>
    </div>
  );
}
