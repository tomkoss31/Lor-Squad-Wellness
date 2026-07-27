// =============================================================================
// AgendaMonthGrid — la vue mois de l'Agenda (chantier Agenda V2, LOT 6.5).
//
// À quoi elle sert, et à quoi elle ne sert PAS : la vue mois répond à « ma
// semaine du 12 est-elle chargée ? », pas à « je pose un RDV à 14h30 ». Elle
// montre donc la densité, pas le détail — on clique sur un jour pour basculer
// en vue semaine et travailler dedans.
//
// Trois RDV visibles par jour maximum, puis « +N ». Au-delà, une case
// deviendrait illisible et la grille se mettrait à respirer différemment d'une
// ligne à l'autre.
//
// Comme la vue semaine, ce composant ne va chercher aucune donnée : il reçoit
// des CalendarEvent déjà normalisés (cf. calendarEvents.ts).
// =============================================================================

import { useEffect, useMemo, useState } from "react";
import "./agenda-week.css";
import { AgendaDayList } from "./AgendaDayList";
import {
  isSameDay,
  kindIcon,
  monthGridDays,
  type CalendarEvent,
} from "./calendarEvents";

const DAY_LABELS = ["LUN", "MAR", "MER", "JEU", "VEN", "SAM", "DIM"];
/** Au-delà, la case devient illisible → on bascule sur « +N ». */
const MAX_CHIPS_PER_DAY = 3;

export interface AgendaMonthGridProps {
  events: CalendarEvent[];
  /** N'importe quelle date du mois à afficher. */
  anchorDate: Date;
  ownerName: (ownerId: string) => string;
  /** Couleur d'UN événement (type / personne / à qualifier). */
  colorOf: (ev: CalendarEvent) => string;
  /** Vrai si plusieurs coachs sont affichés. */
  showOwner?: boolean;
  /** Création depuis une journée vide (vue mobile). */
  onCreateAt?: (at: Date) => void;
  /** Jour imposé par le parent (bouton « Aujourd'hui »). Sans lui, appuyer
   *  sur « Aujourd'hui » depuis le mois courant ne faisait RIEN : le mois ne
   *  changeant pas, l'effet sur monthKey ne se rejouait pas et le panneau du
   *  bas restait sur le jour précédemment touché (correctif 2026-07-27). */
  focusDay?: Date | null;
  /** Clic sur un RDV. */
  onSelectEvent?: (event: CalendarEvent) => void;
  /** Clic sur un jour (ou sur « +N ») → ouvrir la semaine correspondante. */
  onSelectDay?: (day: Date) => void;
}

function hhmm(d: Date): string {
  return d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

export function AgendaMonthGrid({
  events,
  anchorDate,
  ownerName,
  colorOf,
  showOwner,
  onSelectEvent,
  onSelectDay,
  onCreateAt,
  focusDay,
}: AgendaMonthGridProps) {
  const days = useMemo(() => monthGridDays(anchorDate), [anchorDate]);
  const today = new Date();
  const displayedMonth = anchorDate.getMonth();

  const eventsByDay = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const ev of events) {
      const key = ev.start.toDateString();
      const list = map.get(key);
      if (list) list.push(ev);
      else map.set(key, [ev]);
    }
    // Les RDV sans heure (suivis de protocole) passent en tête de journée :
    // ce sont des actions à caler, pas des créneaux déjà pris.
    for (const list of map.values()) {
      list.sort((a, b) => {
        if (!!a.allDay !== !!b.allDay) return a.allDay ? -1 : 1;
        return a.start.getTime() - b.start.getTime();
      });
    }
    return map;
  }, [events]);

  // ─── Jour sélectionné, côté téléphone ────────────────────────────────────
  // La grille mobile montre la densité (des pastilles) ; le détail s'ouvre en
  // dessous. Par défaut : aujourd'hui s'il est dans le mois affiché, sinon le
  // 1er — jamais un jour du mois voisin.
  const defaultSel = useMemo(() => {
    const now = new Date();
    if (now.getMonth() === displayedMonth && now.getFullYear() === anchorDate.getFullYear()) return now;
    return new Date(anchorDate.getFullYear(), displayedMonth, 1);
  }, [displayedMonth, anchorDate]);
  const [selected, setSelected] = useState<Date>(defaultSel);
  const monthKey = `${anchorDate.getFullYear()}-${displayedMonth}`;
  useEffect(() => {
    setSelected(defaultSel);
    // On resynchronise au changement de MOIS, pas à chaque nouvel objet Date.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [monthKey]);
  // Déclaré APRÈS l'effet de mois : un jour imposé gagne toujours.
  const focusKey = focusDay ? focusDay.getTime() : null;
  useEffect(() => {
    if (focusKey !== null) setSelected(new Date(focusKey));
  }, [focusKey]);
  const selBucket = eventsByDay.get(selected.toDateString()) ?? [];

  return (
    <>
    {/* ═══ TÉLÉPHONE — pastilles + journée détaillée ═══════════════════════
        Une grille à 7 colonnes sur 375 px laisse ~50 px par jour : les
        libellés y étaient coupés en plein milieu (« 14:3( ») et le samedi et
        le dimanche sortaient de l'écran. On garde la grille pour la densité,
        on sort le détail en dessous — comme TimeTree, Google et Apple.
        Refonte validée par Thomas le 2026-07-27. */}
    <div className="agenda-week-mobile">
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, minmax(0, 1fr))" }}>
        {DAY_LABELS.map((l) => (
          <div
            key={l}
            style={{
              textAlign: "center",
              fontFamily: "DM Sans, sans-serif",
              fontSize: 11,
              fontWeight: 600,
              color: "var(--ls-text-hint)",
              padding: "4px 0",
            }}
          >
            {l.charAt(0)}
          </div>
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, minmax(0, 1fr))", gap: 2, marginBottom: 6 }}>
        {days.map((d) => {
          const list = eventsByDay.get(d.toDateString()) ?? [];
          const inMonth = d.getMonth() === displayedMonth;
          const isToday = isSameDay(d, today);
          const isSel = isSameDay(d, selected);
          return (
            <button
              key={d.toISOString()}
              type="button"
              onClick={() => setSelected(d)}
              aria-pressed={isSel}
              style={{
                aspectRatio: "1 / 1",
                minHeight: 44,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 4,
                border: "none",
                borderRadius: 12,
                background: isSel ? "var(--ls-teal)" : "transparent",
                color: "var(--ls-text)",
                cursor: "pointer",
                opacity: inMonth ? 1 : 0.4,
                fontFamily: "inherit",
              }}
            >
              <span
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 15,
                  fontWeight: isSel || isToday ? 800 : 600,
                  color: isSel ? "var(--ls-teal-contrast)" : isToday ? "var(--ls-teal)" : "var(--ls-text)",
                }}
              >
                {String(d.getDate()).padStart(2, "0")}
              </span>
              <span style={{ display: "flex", gap: 3, height: 6, alignItems: "center" }}>
                {list.slice(0, 3).map((ev) => (
                  <i
                    key={ev.id}
                    aria-hidden="true"
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: "50%",
                      background: isSel ? "rgba(255,255,255,0.9)" : colorOf(ev),
                      display: "block",
                    }}
                  />
                ))}
              </span>
            </button>
          );
        })}
      </div>
      <AgendaDayList
        day={selected}
        timed={selBucket.filter((e) => !e.allDay)}
        allDay={selBucket.filter((e) => e.allDay)}
        colorOf={colorOf}
        ownerName={ownerName}
        showOwner={showOwner}
        onSelectEvent={onSelectEvent}
        onCreateAt={onCreateAt}
      />
    </div>

    {/* ═══ DESKTOP — grille pleine ═══ */}
    <div
      className="agenda-week-desktop"
      style={{
        border: "1px solid var(--ls-border)",
        borderRadius: 14,
        overflow: "hidden",
        background: "var(--ls-surface)",
      }}
    >
      {/* En-tête des jours de la semaine */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(7, minmax(0, 1fr))",
          borderBottom: "1px solid var(--ls-border)",
        }}
      >
        {DAY_LABELS.map((label) => (
          <div
            key={label}
            style={{
              padding: "8px 6px",
              textAlign: "center",
              fontFamily: "DM Sans, sans-serif",
              fontSize: 10.5,
              fontWeight: 600,
              letterSpacing: "0.06em",
              color: "var(--ls-text-muted)",
            }}
          >
            {label}
          </div>
        ))}
      </div>

      {/* 6 semaines × 7 jours */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, minmax(0, 1fr))" }}>
        {days.map((d, idx) => {
          const dayEvents = eventsByDay.get(d.toDateString()) ?? [];
          const shown = dayEvents.slice(0, MAX_CHIPS_PER_DAY);
          const hidden = dayEvents.length - shown.length;
          const isToday = isSameDay(d, today);
          // Les jours du mois précédent/suivant restent visibles mais en
          // retrait : la grille garde sa forme sans mentir sur le mois.
          const inMonth = d.getMonth() === displayedMonth;
          const isWeekend = idx % 7 >= 5;

          return (
            <div
              key={d.toISOString()}
              onClick={() => onSelectDay?.(d)}
              role={onSelectDay ? "button" : undefined}
              tabIndex={onSelectDay ? 0 : undefined}
              onKeyDown={
                onSelectDay
                  ? (e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        onSelectDay(d);
                      }
                    }
                  : undefined
              }
              title={onSelectDay ? "Ouvrir cette semaine" : undefined}
              style={{
                minHeight: 96,
                minWidth: 0,
                overflow: "hidden",
                padding: 5,
                borderLeft: idx % 7 === 0 ? "none" : "1px solid var(--ls-border)",
                borderTop: idx >= 7 ? "1px solid var(--ls-border)" : "none",
                background: isToday
                  ? "color-mix(in srgb, var(--ls-teal) 6%, transparent)"
                  : isWeekend
                    ? "color-mix(in srgb, var(--ls-text-hint) 4%, transparent)"
                    : "transparent",
                opacity: inMonth ? 1 : 0.4,
                cursor: onSelectDay ? "pointer" : "default",
                display: "flex",
                flexDirection: "column",
                gap: 3,
              }}
            >
              <div
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 12,
                  fontWeight: isToday ? 800 : 600,
                  color: isToday ? "var(--ls-teal)" : "var(--ls-text)",
                  textAlign: "right",
                  paddingRight: 2,
                }}
              >
                {String(d.getDate()).padStart(2, "0")}
              </div>

              {shown.map((ev) => {
                // colorOf, pas ownerColor (correctif 2026-07-27) : sinon un
                // RDV à qualifier est rouge sur téléphone et turquoise sur
                // desktop, et la couleur par TYPE — le cas d'un coach seul,
                // donc celui de Thomas et de Mélanie — n'existait pas ici.
                const color = colorOf(ev);
                return (
                  <button
                    key={ev.id}
                    type="button"
                    onClick={(e) => {
                      // Sans ça, le clic remonterait à la case et changerait
                      // de vue au lieu d'ouvrir la fiche.
                      e.stopPropagation();
                      onSelectEvent?.(ev);
                    }}
                    title={`${ev.title} · ${ev.allDay ? "à faire dans la journée" : hhmm(ev.start)} · ${ownerName(ev.ownerId)}`}
                    style={{
                      display: "block",
                      width: "100%",
                      textAlign: "left",
                      padding: "2px 5px",
                      borderRadius: 5,
                      border: "none",
                      borderLeft: `3px solid ${color}`,
                      background: `color-mix(in srgb, ${color} 14%, var(--ls-surface))`,
                      color: "var(--ls-text)",
                      cursor: "pointer",
                      fontFamily: "DM Sans, sans-serif",
                      fontSize: 10,
                      fontWeight: 600,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    <span aria-hidden="true" style={{ marginRight: 3 }}>{kindIcon(ev.kind)}</span>
                    {ev.allDay ? "" : `${hhmm(ev.start)} `}
                    {ev.title}
                  </button>
                );
              })}

              {hidden > 0 ? (
                <div
                  style={{
                    fontSize: 10,
                    fontWeight: 600,
                    color: "var(--ls-text-muted)",
                    fontFamily: "DM Sans, sans-serif",
                    paddingLeft: 4,
                  }}
                >
                  +{hidden} autre{hidden > 1 ? "s" : ""}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
    </>
  );
}
