// =============================================================================
// AgendaDayList — la journée détaillée (refonte mobile 2026-07-27).
//
// Maquette validée par Thomas. C'est LE rendu lisible d'une journée sur
// téléphone : une carte par rendez-vous, l'heure à gauche, le nom en grand, le
// type en pastille, la durée et le lieu en dessous.
//
// Partagé par la vue Semaine (jour sélectionné dans la bande des 7 jours) ET
// par la vue Mois (jour touché dans la grille de pastilles). Une seule
// implémentation : les deux vues ne peuvent pas diverger, et le geste est le
// même où qu'on se trouve.
//
// Pourquoi ce composant existe : sur un écran de 375 px, une grille à 7
// colonnes laisse ~50 px par jour. Les libellés y étaient coupés en plein
// milieu (« 14:3( »). Un calendrier mobile montre la densité dans la grille et
// le détail en dessous — c'est ce que font TimeTree, Google et Apple.
// =============================================================================

import { kindIcon, kindLabel, type CalendarEvent } from "./calendarEvents";

export interface AgendaDayListProps {
  day: Date;
  /** Les RDV posés à une heure, déjà triés. */
  timed: CalendarEvent[];
  /** Les actions à faire dans la journée (suivis de protocole). */
  allDay: CalendarEvent[];
  colorOf: (ev: CalendarEvent) => string;
  ownerName: (ownerId: string) => string;
  /** Vrai si plusieurs coachs sont affichés → on précise à qui est le RDV. */
  showOwner?: boolean;
  onSelectEvent?: (ev: CalendarEvent) => void;
  /** Proposé quand la journée est vide. */
  onCreateAt?: (at: Date) => void;
}

function hhmm(d: Date): string {
  return d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

function durationLabel(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h} h` : `${h} h ${m}`;
}

export function AgendaDayList({
  day,
  timed,
  allDay,
  colorOf,
  ownerName,
  showOwner,
  onSelectEvent,
  onCreateAt,
}: AgendaDayListProps) {
  const total = timed.length + allDay.length;

  const parts: string[] = [];
  if (timed.length > 0) parts.push(`${timed.length} rendez-vous`);
  if (allDay.length > 0) parts.push(`${allDay.length} action${allDay.length > 1 ? "s" : ""}`);

  return (
    <div>
      {/* Titre de la journée */}
      <div style={{ display: "flex", alignItems: "baseline", gap: 9, padding: "14px 2px 8px" }}>
        <h3
          style={{
            margin: 0,
            fontFamily: "Anton, sans-serif",
            fontWeight: 400,
            fontSize: 19,
            textTransform: "uppercase",
            letterSpacing: "0.4px",
            color: "var(--ls-text)",
          }}
        >
          {day.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric" })}
        </h3>
        <span style={{ fontSize: 13, color: "var(--ls-text-muted)", fontFamily: "DM Sans, sans-serif" }}>
          {parts.join(" · ")}
        </span>
      </div>

      {/* Actions sans heure — au-dessus, jamais mêlées aux créneaux */}
      {allDay.map((ev) => (
        <button
          key={ev.id}
          type="button"
          onClick={() => onSelectEvent?.(ev)}
          style={{
            display: "block",
            width: "100%",
            textAlign: "left",
            padding: "12px 14px",
            marginBottom: 10,
            borderRadius: 14,
            border: "none",
            borderLeft: `4px solid ${colorOf(ev)}`,
            background: `color-mix(in srgb, ${colorOf(ev)} 13%, var(--ls-surface))`,
            color: "var(--ls-text)",
            cursor: "pointer",
            fontFamily: "DM Sans, sans-serif",
          }}
        >
          <span style={{ display: "block", fontWeight: 700, fontSize: 14.5 }}>{ev.title}</span>
          <span style={{ display: "block", fontSize: 12, color: "var(--ls-text-muted)", marginTop: 2 }}>
            {ev.subtitle ? `${ev.subtitle} · ` : ""}À faire dans la journée
          </span>
        </button>
      ))}

      {/* Rendez-vous horodatés */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {timed.map((ev) => {
          const color = colorOf(ev);
          return (
            <button
              key={ev.id}
              type="button"
              onClick={() => onSelectEvent?.(ev)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                width: "100%",
                textAlign: "left",
                padding: "14px",
                borderRadius: 16,
                border: "1px solid var(--ls-border)",
                background: "var(--ls-surface)",
                color: "var(--ls-text)",
                cursor: "pointer",
                fontFamily: "DM Sans, sans-serif",
              }}
            >
              <span
                aria-hidden="true"
                style={{ width: 4, alignSelf: "stretch", borderRadius: 4, background: color, flexShrink: 0 }}
              />
              <span
                style={{
                  display: "block",
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 14,
                  fontWeight: 700,
                  width: 48,
                  flexShrink: 0,
                }}
              >
                {hhmm(ev.start)}
              </span>
              <span style={{ display: "block", flex: 1, minWidth: 0 }}>
                <span style={{ display: "block", fontWeight: 700, fontSize: 16, lineHeight: 1.3 }}>
                  <span aria-hidden="true" style={{ marginRight: 5 }}>{kindIcon(ev.kind)}</span>
                  {ev.title}
                  <span
                    style={{
                      display: "inline-block",
                      marginLeft: 8,
                      padding: "3px 8px",
                      borderRadius: 999,
                      fontSize: 10,
                      fontWeight: 700,
                      letterSpacing: "0.06em",
                      textTransform: "uppercase",
                      verticalAlign: 2,
                      background: `color-mix(in srgb, ${color} 16%, transparent)`,
                      color,
                    }}
                  >
                    {ev.needsQualification ? "À qualifier" : kindLabel(ev.kind)}
                  </span>
                </span>
                <span
                  style={{
                    display: "block",
                    fontSize: 13,
                    color: "var(--ls-text-muted)",
                    marginTop: 3,
                  }}
                >
                  {ev.needsQualification
                    ? "Passé — la personne est-elle venue ?"
                    : [
                        durationLabel(ev.durationMin),
                        ev.subtitle,
                        showOwner ? ownerName(ev.ownerId) : null,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                </span>
                {/* RDV muet : le client ne recevra pas le rappel attendu, il
                    faudra l'appeler soi-même (2026-07-27). */}
                {ev.silentReason ? (
                  <span
                    style={{
                      display: "inline-block",
                      marginTop: 6,
                      padding: "3px 8px",
                      borderRadius: 999,
                      fontSize: 11,
                      fontWeight: 600,
                      background: "color-mix(in srgb, var(--ls-teal) 16%, transparent)",
                      color: "color-mix(in srgb, var(--ls-teal) 75%, var(--ls-text))",
                    }}
                  >
                    🔕 {ev.silentReason}
                  </span>
                ) : null}
              </span>
              <span aria-hidden="true" style={{ color: "var(--ls-text-hint)", fontSize: 20, flexShrink: 0 }}>
                ›
              </span>
            </button>
          );
        })}
      </div>

      {/* Journée vide — on propose de la remplir plutôt que d'afficher un vide */}
      {total === 0 ? (
        <div
          style={{
            padding: "26px 16px",
            textAlign: "center",
            color: "var(--ls-text-hint)",
            fontSize: 14,
            border: "1px dashed var(--ls-border)",
            borderRadius: 16,
            fontFamily: "DM Sans, sans-serif",
          }}
        >
          Rien de prévu ce jour-là.
          {onCreateAt ? (
            <div style={{ marginTop: 12 }}>
              <button
                type="button"
                onClick={() => {
                  const at = new Date(day);
                  at.setHours(9, 0, 0, 0);
                  onCreateAt(at);
                }}
                style={{
                  padding: "10px 16px",
                  borderRadius: 999,
                  border: "1px solid var(--ls-border)",
                  background: "var(--ls-surface)",
                  color: "var(--ls-text)",
                  fontSize: 13.5,
                  fontWeight: 600,
                  cursor: "pointer",
                  fontFamily: "DM Sans, sans-serif",
                }}
              >
                + Ajouter un RDV
              </button>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
