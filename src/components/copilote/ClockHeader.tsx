// Chantier Co-pilote V4 (2026-04-24).
// Horloge premium : heure 38px live + date uppercase + salutation + mood.
// Le bouton "+ Nouveau bilan" est déjà géré par NewBilanFab en top-right
// absolu dans AppLayout — on n'ajoute pas de doublon ici.

import { greetingFor, moodForLoad } from "../../lib/utils/copiloteHelpers";

function formatTime(d: Date): string {
  return d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

function formatDateLong(d: Date): string {
  return d.toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
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
      <div style={{ display: "flex", alignItems: "center", gap: 20, flexShrink: 0 }}>
        <div>
          <div
            style={{
              fontFamily: "Syne, sans-serif",
              fontSize: 38,
              fontWeight: 500,
              letterSpacing: "-0.02em",
              color: "var(--ls-text)",
              lineHeight: 1,
            }}
          >
            {formatTime(now)}
          </div>
          <div
            style={{
              fontSize: 11,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "var(--ls-text-hint)",
              marginTop: 4,
            }}
          >
            {formatDateLong(now)}
          </div>
        </div>
        <div
          aria-hidden="true"
          style={{
            width: 1,
            height: 52,
            background: "var(--ls-border)",
          }}
        />
      </div>
      <div style={{ flex: 1, minWidth: 180 }}>
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
          Aujourd'hui : {appointmentsToday} RDV · {followupsToday} suivi
          {followupsToday > 1 ? "s" : ""}. {moodLabel}
        </div>
      </div>
    </div>
  );
}
