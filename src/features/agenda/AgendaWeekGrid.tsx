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
import { AgendaDayList } from "./AgendaDayList";
import {
  isSameDay,
  kindIcon,
  kindLabel,
  layoutDay,
  minutesSinceMidnight,
  weekDays,
  type CalendarEvent,
  type DayBand,
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
  /** Couleur du coach — sert la légende quand l'équipe est affichée. */
  ownerColor: OwnerColorResolver;
  /** Couleur d'UN événement : type si un seul coach, personne sinon,
   *  rouge s'il est à qualifier. Cf. makeEventColor. */
  colorOf: (ev: CalendarEvent) => string;
  /** Vrai si plusieurs coachs sont affichés (légende + mention du propriétaire). */
  showOwner?: boolean;
  /** Clic sur un événement. */
  onSelectEvent?: (event: CalendarEvent) => void;
  /** Clic sur un créneau vide → création pré-remplie à cette date/heure. */
  onCreateAt?: (at: Date) => void;
  /** Id du coach connecté : les RDV des autres sont en lecture seule. */
  currentUserId?: string;
  /** Jour à mettre en avant côté mobile (« Aujourd'hui », clic dans le mois).
   *  Absent → aujourd'hui s'il est dans la semaine affichée, sinon le lundi. */
  focusDay?: Date | null;
  /** Bandes de fond (LOT 6.6) — aujourd'hui les permanences du club. */
  bands?: DayBand[];
  /** Clic sur une bande retirable. */
  onSelectBand?: (band: DayBand) => void;
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

/** Hauteur d'une bande de fond, bornée au bas de la grille. */
function bandHeightPx(start: Date, end: Date): number {
  const top = topPx(start);
  const bottom = topPx(end);
  const gridHeight = (END_HOUR - START_HOUR) * SLOT_PX;
  return Math.min(bottom - top, gridHeight - top);
}

function hhmm(d: Date): string {
  return d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

export function AgendaWeekGrid({
  events,
  anchorDate,
  ownerName,
  ownerColor,
  colorOf,
  showOwner,
  onSelectEvent,
  onCreateAt,
  currentUserId,
  focusDay,
  bands,
  onSelectBand,
}: AgendaWeekGridProps) {
  const days = useMemo(() => weekDays(anchorDate), [anchorDate]);
  const hours = useMemo(() => hourRange(), []);
  const today = new Date();

  // ─── Le jour affiché sur téléphone ────────────────────────────────────
  // CORRECTIF 2026-07-27 : `mobileDay` suivait `anchorDate`, qui vaut TOUJOURS
  // le lundi de la semaine. Trois conséquences, invisibles en recette desktop
  // (le bloc mobile est masqué au-dessus de 900 px) mais permanentes pour la
  // coach qui travaille au téléphone :
  //   • ouvrir la vue Semaine un jeudi affichait lundi, trois jours en arrière
  //   • « Aujourd'hui » renvoyait un nouvel objet Date → l'effet se rejouait →
  //     retour sur lundi. Le bouton « Aujourd'hui » emmenait ailleurs
  //     qu'aujourd'hui.
  //   • taper le 23 dans la vue Mois ouvrait le 21 — soit exactement ce que
  //     cette vue est censée permettre.
  // Désormais : par défaut aujourd'hui s'il est dans la semaine affichée,
  // sinon le lundi ; et `focusDay` permet au parent d'imposer un jour précis.
  const defaultDayFor = (anchor: Date): Date => {
    const list = weekDays(anchor);
    const now = new Date();
    return list.find((d) => isSameDay(d, now)) ?? list[0];
  };
  const [mobileDay, setMobileDay] = useState<Date>(() => defaultDayFor(anchorDate));
  // Clé stable : sans elle, un simple `new Date()` du parent relançait l'effet.
  const weekKey = weekDays(anchorDate)[0].getTime();
  useEffect(() => {
    setMobileDay(defaultDayFor(new Date(weekKey)));
    // defaultDayFor est pure et ne dépend que de son argument.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekKey]);
  // Déclaré APRÈS : quand le parent change de semaine ET impose un jour (clic
  // dans la vue Mois), c'est le jour imposé qui doit gagner.
  const focusKey = focusDay ? focusDay.getTime() : null;
  useEffect(() => {
    if (focusKey !== null) setMobileDay(new Date(focusKey));
  }, [focusKey]);

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

  const bandsByDay = useMemo(() => {
    const map = new Map<string, DayBand[]>();
    for (const b of bands ?? []) {
      const key = b.start.toDateString();
      const list = map.get(key);
      if (list) list.push(b);
      else map.set(key, [b]);
    }
    return map;
  }, [bands]);

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
    const color = colorOf(ev);
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
    const color = colorOf(ev);
    const mine = !currentUserId || ev.ownerId === currentUserId;
    const cols = placement?.columnCount ?? 1;
    const col = placement?.column ?? 0;
    // 3px de marge à gauche/droite de la colonne, 2px entre deux blocs voisins.
    const widthPct = 100 / cols;
    return (
      <button
        key={ev.id}
        type="button"
        className={compact ? undefined : "agenda-ev"}
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
      {showOwner && owners.length > 1 ? (
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
                  color: on ? "var(--ls-teal-contrast)" : isToday ? "var(--ls-teal)" : "var(--ls-text-muted)",
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
                    color: on ? "var(--ls-teal-contrast)" : isToday ? "var(--ls-teal)" : "var(--ls-text)",
                  }}
                >
                  {String(d.getDate()).padStart(2, "0")}
                </b>
              </button>
            );
          })}
        </div>

        {/* Le détail de la journée est rendu par AgendaDayList — le MÊME
            composant que la vue Mois sur téléphone. Une seule implémentation,
            donc un geste identique où qu'on se trouve (refonte 2026-07-27). */}
        <AgendaDayList
          day={mobileDay}
          timed={mobileEvents}
          allDay={mobileAllDay}
          colorOf={colorOf}
          ownerName={ownerName}
          showOwner={showOwner}
          onSelectEvent={onSelectEvent}
          onCreateAt={onCreateAt}
        />
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
                  {/* Calque de fond (LOT 6.6) : permanences du club. Posé
                      AVANT les créneaux et les RDV → il reste dessous, et ne
                      bloque pas le clic « créer un RDV » (pointerEvents). */}
                  {(bandsByDay.get(d.toDateString()) ?? []).map((band) => (
                    <div
                      key={band.id}
                      onClick={
                        band.removable && onSelectBand
                          ? (e) => {
                              e.stopPropagation();
                              onSelectBand(band);
                            }
                          : undefined
                      }
                      title={`${band.label}${band.removable ? " — cliquer pour retirer" : ""}`}
                      style={{
                        position: "absolute",
                        left: 0,
                        right: 0,
                        top: topPx(band.start),
                        height: Math.max(14, bandHeightPx(band.start, band.end)),
                        background: `repeating-linear-gradient(45deg, color-mix(in srgb, ${band.color} 16%, transparent) 0 6px, transparent 6px 12px)`,
                        borderTop: `1px solid color-mix(in srgb, ${band.color} 45%, transparent)`,
                        borderBottom: `1px solid color-mix(in srgb, ${band.color} 45%, transparent)`,
                        pointerEvents: band.removable && onSelectBand ? "auto" : "none",
                        cursor: band.removable && onSelectBand ? "pointer" : "default",
                        zIndex: 0,
                      }}
                    >
                      <span
                        style={{
                          position: "absolute",
                          top: 2,
                          left: 5,
                          fontFamily: "'JetBrains Mono', monospace",
                          fontSize: 9,
                          letterSpacing: "0.06em",
                          color: `color-mix(in srgb, ${band.color} 75%, var(--ls-text))`,
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                        }}
                      >
                        {band.label}
                      </span>
                    </div>
                  ))}
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
