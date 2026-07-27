// =============================================================================
// AgendaWeekGrid — la vue semaine de l'Agenda (chantier Agenda V2, LOT 6.2).
//
// Maquette validée par Thomas le 2026-07-27.
//
// Desktop : 7 colonnes (lundi → dimanche), les heures en lignes, un bloc par
// RDV positionné à son heure réelle, une couleur par coach, une ligne rose sur
// l'heure courante. Clic sur un creux = créer un RDV à cette heure-là.
//
// Mobile : la grille à 7 colonnes est illisible sur un téléphone → on bascule
// sur UN jour à la fois, avec la bande des 7 jours en haut pour naviguer.
//
// Le composant ne va chercher aucune donnée : il reçoit des CalendarEvent déjà
// normalisés (cf. calendarEvents.ts). C'est ce qui permettra au mode BBC de
// poser ses permanences club sur la même grille sans la dupliquer.
// =============================================================================

import { useEffect, useMemo, useRef, useState } from "react";
import "./agenda-week.css";
import {
  isSameDay,
  kindIcon,
  kindLabel,
  layoutDay,
  minutesSinceMidnight,
  weekDays,
  type CalendarEvent,
  type OwnerColorResolver,
  type PlacedEvent,
} from "./calendarEvents";

/** Plage horaire affichée. En dehors, les RDV sont épinglés aux bords. */
const START_HOUR = 8;
const END_HOUR = 20;
const SLOT_PX = 46; // hauteur d'une heure

const DAY_LABELS = ["LUN", "MAR", "MER", "JEU", "VEN", "SAM", "DIM"];

export interface AgendaWeekGridProps {
  events: CalendarEvent[];
  /** N'importe quelle date de la semaine à afficher. */
  anchorDate: Date;
  /** Nom affiché pour un coach (légende + info-bulle). */
  ownerName: (ownerId: string) => string;
  /** Couleur du coach : celle qu'il a choisie, sinon un repli dérivé. */
  ownerColor: OwnerColorResolver;
  /** Clic sur un événement. */
  onSelectEvent?: (event: CalendarEvent) => void;
  /** Clic sur un créneau vide → création pré-remplie à cette date/heure. */
  onCreateAt?: (at: Date) => void;
  /** Id du coach connecté : les RDV des autres sont en lecture seule. */
  currentUserId?: string;
}

function hourRange(): number[] {
  return Array.from({ length: END_HOUR - START_HOUR }, (_, i) => START_HOUR + i);
}

/** Position verticale d'un instant, bornée à la plage affichée. */
function topPx(date: Date): number {
  const minutes = minutesSinceMidnight(date);
  const clamped = Math.min(Math.max(minutes, START_HOUR * 60), END_HOUR * 60 - 20);
  return ((clamped - START_HOUR * 60) / 60) * SLOT_PX;
}

/**
 * Hauteur d'un bloc, bornée au bas de la grille : depuis que les durées sont
 * réelles (LOT 6.4), un RDV de 90 min posé à 19 h débordait sous la dernière
 * heure affichée. Plancher à 26 px pour qu'un RDV court reste lisible.
 */
function heightPx(start: Date, durationMin: number): number {
  const top = topPx(start);
  const gridHeight = (END_HOUR - START_HOUR) * SLOT_PX;
  const natural = (durationMin / 60) * SLOT_PX;
  return Math.max(26, Math.min(natural, gridHeight - top - 2));
}

function hhmm(d: Date): string {
  return d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

export function AgendaWeekGrid({
  events,
  anchorDate,
  ownerName,
  ownerColor,
  onSelectEvent,
  onCreateAt,
  currentUserId,
}: AgendaWeekGridProps) {
  const days = useMemo(() => weekDays(anchorDate), [anchorDate]);
  const hours = useMemo(() => hourRange(), []);
  const today = new Date();

  // Un seul jour affiché sur téléphone. On suit `anchorDate` quand la semaine
  // change, sinon on garde le jour choisi par l'utilisateur.
  const [mobileDay, setMobileDay] = useState<Date>(() => anchorDate);
  useEffect(() => {
    setMobileDay(anchorDate);
  }, [anchorDate]);

  // Ligne « il est telle heure » — recalculée chaque minute.
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);
  const showNowLine =
    days.some((d) => isSameDay(d, now)) &&
    now.getHours() >= START_HOUR &&
    now.getHours() < END_HOUR;

  // Deux familles distinctes (LOT 6.4) : les RDV posés à une heure, et les
  // actions à faire dans la journée (suivis de protocole). Les secondes n'ont
  // pas d'heure de rendez-vous — les planter dans la grille horaire
  // inventerait une précision qui n'existe pas.
  const eventsByDay = useMemo(() => {
    const map = new Map<string, { timed: CalendarEvent[]; allDay: CalendarEvent[] }>();
    for (const ev of events) {
      const key = ev.start.toDateString();
      let bucket = map.get(key);
      if (!bucket) {
        bucket = { timed: [], allDay: [] };
        map.set(key, bucket);
      }
      (ev.allDay ? bucket.allDay : bucket.timed).push(ev);
    }
    return map;
  }, [events]);

  const EMPTY_DAY = { timed: [] as CalendarEvent[], allDay: [] as CalendarEvent[] };
  const hasAnyAllDay = useMemo(
    () => days.some((d) => (eventsByDay.get(d.toDateString())?.allDay.length ?? 0) > 0),
    [days, eventsByDay],
  );

  const owners = useMemo(() => {
    const set = new Set(events.map((e) => e.ownerId));
    return [...set];
  }, [events]);

  // Défilement automatique sur la première heure utile de la semaine.
  const bodyRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!bodyRef.current || events.length === 0) return;
    const timed = events.filter((e) => !e.allDay);
    if (timed.length === 0) return;
    const earliest = Math.min(...timed.map((e) => minutesSinceMidnight(e.start)));
    const target = ((Math.max(earliest, START_HOUR * 60) - START_HOUR * 60) / 60) * SLOT_PX;
    bodyRef.current.scrollTop = Math.max(0, target - SLOT_PX);
  }, [events]);

  /** Pastille « à faire ce jour-là », sans heure (suivis de protocole). */
  function renderAllDayChip(ev: CalendarEvent) {
    const color = ownerColor(ev.ownerId);
    return (
      <button
        key={ev.id}
        type="button"
        onClick={() => onSelectEvent?.(ev)}
        title={`${ev.title}${ev.subtitle ? ` · ${ev.subtitle}` : ""} · ${ownerName(ev.ownerId)} — à faire dans la journée`}
        style={{
          display: "block",
          width: "100%",
          textAlign: "left",
          padding: "3px 6px",
          borderRadius: 6,
          border: "none",
          borderLeft: `3px solid ${color}`,
          background: `color-mix(in srgb, ${color} 12%, var(--ls-surface))`,
          color: "var(--ls-text)",
          cursor: "pointer",
          fontFamily: "DM Sans, sans-serif",
          fontSize: 10.5,
          fontWeight: 600,
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        {ev.title}
      </button>
    );
  }

  /**
   * `placement` absent = rendu compact (mobile, en pile).
   * `placement` fourni = rendu positionné dans la grille, en partageant la
   * largeur avec les RDV qui le chevauchent (LOT 6.3).
   */
  function renderEvent(ev: CalendarEvent, placement?: PlacedEvent) {
    const compact = !placement;
    const color = ownerColor(ev.ownerId);
    const mine = !currentUserId || ev.ownerId === currentUserId;
    const cols = placement?.columnCount ?? 1;
    const col = placement?.column ?? 0;
    // 3px de marge à gauche/droite de la colonne, 2px entre deux blocs voisins.
    const widthPct = 100 / cols;
    return (
      <button
        key={ev.id}
        type="button"
        onClick={() => onSelectEvent?.(ev)}
        title={`${kindLabel(ev.kind)} — ${ev.title} · ${hhmm(ev.start)} · ${ownerName(ev.ownerId)}${mine ? "" : " (lecture seule)"}`}
        style={{
          position: compact ? "relative" : "absolute",
          left: compact ? undefined : `calc(${col * widthPct}% + 3px)`,
          width: compact ? "100%" : `calc(${widthPct}% - ${cols > 1 ? 5 : 6}px)`,
          top: compact ? undefined : topPx(ev.start),
          height: compact ? undefined : heightPx(ev.start, ev.durationMin),
          textAlign: "left",
          overflow: "hidden",
          padding: compact ? "9px 11px" : "4px 6px",
          borderRadius: compact ? 11 : 8,
          border: "none",
          borderLeft: `3px solid ${color}`,
          background: `color-mix(in srgb, ${color} 16%, var(--ls-surface))`,
          color: "var(--ls-text)",
          cursor: "pointer",
          fontFamily: "DM Sans, sans-serif",
          opacity: mine ? 1 : 0.82,
          zIndex: 1,
        }}
      >
        <div
          style={{
            fontWeight: 700,
            fontSize: compact ? 13 : 11,
            lineHeight: 1.25,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          <span aria-hidden="true" style={{ marginRight: 4 }}>{kindIcon(ev.kind)}</span>
          {ev.title}
        </div>
        <div
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: compact ? 11 : 9.5,
            color: "var(--ls-text-muted)",
            marginTop: 1,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {hhmm(ev.start)}
          {compact ? ` · ${ownerName(ev.ownerId)}` : ""}
        </div>
      </button>
    );
  }

  const mobileBucket = eventsByDay.get(mobileDay.toDateString()) ?? EMPTY_DAY;
  const mobileEvents = mobileBucket.timed;
  const mobileAllDay = mobileBucket.allDay;

  return (
    <div>
      {/* ── Légende : qui est de quelle couleur ── */}
      {owners.length > 0 ? (
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 10 }}>
          {owners.map((id) => (
            <span
              key={id}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                fontSize: 11.5,
                color: "var(--ls-text-muted)",
                fontFamily: "DM Sans, sans-serif",
              }}
            >
              <i
                aria-hidden="true"
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: 3,
                  background: ownerColor(id),
                  display: "inline-block",
                }}
              />
              {ownerName(id)}
            </span>
          ))}
        </div>
      ) : null}

      {/* ═══ MOBILE — un jour à la fois ═══ */}
      <div className="agenda-week-mobile">
        <div style={{ display: "flex", gap: 4, marginBottom: 12 }}>
          {days.map((d, i) => {
            const on = isSameDay(d, mobileDay);
            const isToday = isSameDay(d, today);
            return (
              <button
                key={d.toISOString()}
                type="button"
                onClick={() => setMobileDay(d)}
                style={{
                  flex: 1,
                  minWidth: 0,
                  padding: "7px 0",
                  borderRadius: 11,
                  border: "none",
                  background: on ? "var(--ls-teal)" : "transparent",
                  color: on ? "#fff" : isToday ? "var(--ls-teal)" : "var(--ls-text-muted)",
                  fontFamily: "DM Sans, sans-serif",
                  fontSize: 11,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                {DAY_LABELS[i].charAt(0)}
                <b
                  style={{
                    display: "block",
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 14,
                    marginTop: 2,
                    color: on ? "#fff" : isToday ? "var(--ls-teal)" : "var(--ls-text)",
                  }}
                >
                  {String(d.getDate()).padStart(2, "0")}
                </b>
              </button>
            );
          })}
        </div>

        {/* Actions du jour (sans heure) — au-dessus des RDV, comme sur desktop. */}
        {mobileAllDay.length > 0 ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 5, marginBottom: 10 }}>
            <div
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 9,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: "var(--ls-text-hint)",
              }}
            >
              À faire dans la journée
            </div>
            {mobileAllDay.map((ev) => renderAllDayChip(ev))}
          </div>
        ) : null}

        {mobileEvents.length === 0 ? (
          <div
            style={{
              padding: "26px 16px",
              textAlign: "center",
              color: "var(--ls-text-hint)",
              fontSize: 13,
              border: "1px dashed var(--ls-border)",
              borderRadius: 14,
            }}
          >
            {mobileAllDay.length > 0 ? "Aucun rendez-vous posé ce jour-là." : "Rien de prévu ce jour-là."}
            {onCreateAt ? (
              <div style={{ marginTop: 10 }}>
                <button
                  type="button"
                  onClick={() => {
                    const at = new Date(mobileDay);
                    at.setHours(9, 0, 0, 0);
                    onCreateAt(at);
                  }}
                  style={{
                    padding: "8px 14px",
                    borderRadius: 999,
                    border: "1px solid var(--ls-border)",
                    background: "var(--ls-surface)",
                    color: "var(--ls-text)",
                    fontSize: 12.5,
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
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
            {mobileEvents.map((ev) => renderEvent(ev))}
          </div>
        )}
      </div>

      {/* ═══ DESKTOP — grille 7 jours ═══ */}
      <div
        className="agenda-week-desktop"
        style={{
          border: "1px solid var(--ls-border)",
          borderRadius: 14,
          overflow: "hidden",
          background: "var(--ls-surface)",
        }}
      >
        {/* En-tête des jours */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: `52px repeat(7, 1fr)`,
            borderBottom: "1px solid var(--ls-border)",
          }}
        >
          <div />
          {days.map((d, i) => {
            const isToday = isSameDay(d, today);
            return (
              <div
                key={d.toISOString()}
                style={{
                  padding: "9px 6px",
                  textAlign: "center",
                  borderLeft: "1px solid var(--ls-border)",
                  fontFamily: "DM Sans, sans-serif",
                  fontSize: 11,
                  fontWeight: 600,
                  color: isToday ? "var(--ls-teal)" : "var(--ls-text-muted)",
                }}
              >
                {DAY_LABELS[i]}
                <span
                  style={{
                    display: "block",
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 15,
                    fontWeight: 700,
                    marginTop: 2,
                    color: isToday ? "var(--ls-teal)" : "var(--ls-text)",
                  }}
                >
                  {String(d.getDate()).padStart(2, "0")}
                </span>
              </div>
            );
          })}
        </div>

        {/* ── Bandeau « à faire dans la journée » (LOT 6.4) ──
            Les suivis de protocole ne sont pas des rendez-vous : leur date
            hérite de l'heure du bilan initial. Les poser dans la grille
            horaire inventerait un créneau. Ils vivent donc ici, au-dessus des
            heures, comme les événements « journée entière » d'un vrai
            calendrier. La ligne disparaît quand la semaine n'en a aucun. */}
        {hasAnyAllDay ? (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: `52px repeat(7, 1fr)`,
              borderBottom: "1px solid var(--ls-border)",
              background: "color-mix(in srgb, var(--ls-text-hint) 4%, transparent)",
            }}
          >
            <div
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 9,
                color: "var(--ls-text-hint)",
                textAlign: "right",
                paddingRight: 7,
                paddingTop: 8,
                letterSpacing: "0.06em",
              }}
            >
              JOUR
            </div>
            {days.map((d) => {
              const items = (eventsByDay.get(d.toDateString()) ?? EMPTY_DAY).allDay;
              return (
                <div
                  key={d.toISOString()}
                  style={{
                    borderLeft: "1px solid var(--ls-border)",
                    padding: 4,
                    display: "flex",
                    flexDirection: "column",
                    gap: 3,
                    minHeight: 30,
                  }}
                >
                  {items.map((ev) => renderAllDayChip(ev))}
                </div>
              );
            })}
          </div>
        ) : null}

        {/* Corps scrollable */}
        <div ref={bodyRef} style={{ maxHeight: 560, overflowY: "auto" }}>
          <div
            style={{
              position: "relative",
              display: "grid",
              gridTemplateColumns: `52px repeat(7, 1fr)`,
            }}
          >
            {/* Ligne de l'heure courante */}
            {showNowLine ? (
              <div
                aria-hidden="true"
                style={{
                  position: "absolute",
                  left: 52,
                  right: 0,
                  top: topPx(now),
                  height: 2,
                  background: "#D4537E",
                  zIndex: 5,
                }}
              />
            ) : null}

            {/* Colonne des heures */}
            <div style={{ display: "flex", flexDirection: "column" }}>
              {hours.map((h) => (
                <span
                  key={h}
                  style={{
                    height: SLOT_PX,
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 10,
                    color: "var(--ls-text-hint)",
                    textAlign: "right",
                    paddingRight: 7,
                    transform: "translateY(-6px)",
                  }}
                >
                  {String(h).padStart(2, "0")}:00
                </span>
              ))}
            </div>

            {/* Une colonne par jour */}
            {days.map((d, dayIdx) => {
              const dayEvents = (eventsByDay.get(d.toDateString()) ?? EMPTY_DAY).timed;
              const isToday = isSameDay(d, today);
              const isWeekend = dayIdx >= 5;
              return (
                <div
                  key={d.toISOString()}
                  style={{
                    position: "relative",
                    borderLeft: "1px solid var(--ls-border)",
                    background: isToday
                      ? "color-mix(in srgb, var(--ls-teal) 5%, transparent)"
                      : isWeekend
                        ? "color-mix(in srgb, var(--ls-text-hint) 5%, transparent)"
                        : "transparent",
                  }}
                >
                  {hours.map((h) => (
                    <div
                      key={h}
                      onClick={
                        onCreateAt
                          ? () => {
                              const at = new Date(d);
                              at.setHours(h, 0, 0, 0);
                              onCreateAt(at);
                            }
                          : undefined
                      }
                      title={onCreateAt ? `Créer un RDV à ${String(h).padStart(2, "0")}:00` : undefined}
                      style={{
                        height: SLOT_PX,
                        borderBottom: "1px dashed color-mix(in srgb, var(--ls-border) 60%, transparent)",
                        cursor: onCreateAt ? "pointer" : "default",
                      }}
                    />
                  ))}
                  {/* layoutDay répartit les RDV qui se chevauchent en
                      colonnes : deux RDV à la même heure se partagent la
                      largeur au lieu de se cacher l'un l'autre (LOT 6.3). */}
                  {layoutDay(dayEvents).map((p) => renderEvent(p.event, p))}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
