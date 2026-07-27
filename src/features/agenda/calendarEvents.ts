// =============================================================================
// calendarEvents — le moteur d'événements de l'Agenda (chantier Agenda V2).
//
// LOT 6.1 (2026-07-27). L'agenda sait déjà aller chercher les RDV dans TROIS
// sources différentes (prospects · follow-ups clients · suivis de protocole),
// les fusionner, les filtrer par portée et par statut. Ce travail-là n'est pas
// à refaire : `AgendaEntry` en est le résultat.
//
// Ce fichier ne fait qu'une chose : traduire une `AgendaEntry` en un événement
// NORMALISÉ, dessinable dans une grille horaire — un début, une durée, un
// titre, un propriétaire, une couleur. La liste existante et la grille semaine
// consomment ainsi exactement les mêmes données, sans jamais diverger.
//
// ⚠ Une contrainte du modèle actuel : un RDV est un INSTANT, pas une plage.
// Ni `prospects.rdv_date` ni `follow_ups.due_date` ne portent de durée. On
// applique donc une durée par défaut (DEFAULT_RDV_MINUTES) pour pouvoir
// dessiner un bloc. Le jour où une vraie durée existe en base, il n'y aura que
// `durationMin` à brancher ici.
// =============================================================================

import type { Client, FollowUp, Prospect } from "../../types/domain";
import type { FollowUpDueItem } from "../../lib/followUpProtocolScheduler";

/** Entrée unifiée de l'agenda : follow-up client, prospect, OU suivi protocole. */
export type AgendaEntry =
  | { kind: "client"; id: string; date: string; distributorId: string; followUp: FollowUp; client: Client }
  | { kind: "prospect"; id: string; date: string; distributorId: string; prospect: Prospect }
  | { kind: "protocol"; id: string; date: string; distributorId: string; due: FollowUpDueItem };

/** Durée d'un RDV faute de mieux (le modèle ne stocke pas encore de durée). */
export const DEFAULT_RDV_MINUTES = 45;

export interface CalendarEvent {
  id: string;
  kind: AgendaEntry["kind"];
  start: Date;
  durationMin: number;
  /** Ligne 1 : « Bilan · Karim B. » */
  title: string;
  /** Ligne 2, optionnelle : contexte court. */
  subtitle?: string;
  /** Le coach à qui appartient ce RDV — porte la couleur. */
  ownerId: string;
  /** Destination au clic, si l'événement mène quelque part. */
  href?: string;
  /** L'entrée d'origine, pour les actions qui ont besoin du détail complet. */
  entry: AgendaEntry;
}

// ─── Couleurs par personne ───────────────────────────────────────────────────
// LOT 6.3 (2026-07-27) : la couleur est désormais CHOISIE par chaque coach
// (users.calendar_color), comme dans TimeTree — « le violet, c'est Mélanie »
// devient vrai et durable. Tant que personne n'a choisi, on retombe sur une
// teinte dérivée de l'identifiant : stable, mais arbitraire. Aucun agenda ne
// devient gris en attendant que l'équipe passe régler son profil.

/** Les couleurs proposées au choix — teintes de l'identité de l'app. */
export const CALENDAR_PALETTE: Array<{ hex: string; label: string }> = [
  { hex: "#2DD4BF", label: "Turquoise" },
  { hex: "#A78BFA", label: "Violet" },
  { hex: "#C9A84C", label: "Doré" },
  { hex: "#D4537E", label: "Framboise" },
  { hex: "#06B6D4", label: "Cyan" },
  { hex: "#8FBF3F", label: "Olive" },
  { hex: "#F97316", label: "Orange" },
  { hex: "#3B82F6", label: "Bleu" },
];

const FALLBACK_PALETTE = CALENDAR_PALETTE.slice(0, 6).map((c) => c.hex);

/** Couleur de repli, dérivée de l'identifiant (stable, jamais aléatoire). */
export function fallbackOwnerColor(ownerId: string): string {
  let hash = 0;
  for (let i = 0; i < ownerId.length; i += 1) {
    hash = (hash * 31 + ownerId.charCodeAt(i)) >>> 0;
  }
  return FALLBACK_PALETTE[hash % FALLBACK_PALETTE.length];
}

/** Signature du résolveur de couleur passé aux composants d'agenda. */
export type OwnerColorResolver = (ownerId: string) => string;

/**
 * Construit le résolveur : couleur choisie si elle existe et qu'elle est un
 * hex valide, repli dérivé sinon. La validation évite qu'une valeur douteuse
 * parte dans un style CSS (la base a déjà un CHECK, ceinture et bretelles).
 */
export function makeOwnerColorResolver(
  chosen: Map<string, string | null | undefined>,
): OwnerColorResolver {
  return (ownerId: string) => {
    const picked = chosen.get(ownerId);
    if (picked && /^#[0-9A-Fa-f]{6}$/.test(picked)) return picked;
    return fallbackOwnerColor(ownerId);
  };
}

/** Pictogramme du TYPE de RDV — la couleur dit QUI, l'icône dit QUOI. */
export function kindIcon(kind: AgendaEntry["kind"]): string {
  if (kind === "prospect") return "🎯";
  if (kind === "client") return "🌿";
  return "📋";
}

export function kindLabel(kind: AgendaEntry["kind"]): string {
  if (kind === "prospect") return "Bilan";
  if (kind === "client") return "Suivi";
  return "Protocole";
}

// ─── Traduction entrée → événement ───────────────────────────────────────────

function prospectTitle(p: Prospect): string {
  const name = [p.firstName, p.lastName].filter(Boolean).join(" ").trim();
  return `Bilan · ${name || "Prospect"}`;
}

function clientTitle(c: Client): string {
  const name = [c.firstName, c.lastName].filter(Boolean).join(" ").trim();
  return `Suivi · ${name || "Client"}`;
}

/**
 * Traduit une entrée d'agenda en événement calendrier.
 * Renvoie `null` si la date est inexploitable — un événement sans date valide
 * n'a rien à faire dans une grille horaire (la liste, elle, la tolérait).
 */
export function toCalendarEvent(entry: AgendaEntry): CalendarEvent | null {
  const start = new Date(entry.date);
  if (Number.isNaN(start.getTime())) return null;

  const base = {
    id: `${entry.kind}-${entry.id}`,
    kind: entry.kind,
    start,
    durationMin: DEFAULT_RDV_MINUTES,
    ownerId: entry.distributorId,
    entry,
  };

  if (entry.kind === "prospect") {
    return {
      ...base,
      title: prospectTitle(entry.prospect),
      subtitle: entry.prospect.source || undefined,
      href: entry.prospect.convertedClientId
        ? `/clients/${entry.prospect.convertedClientId}`
        : undefined,
    };
  }

  if (entry.kind === "client") {
    return {
      ...base,
      title: clientTitle(entry.client),
      subtitle: entry.followUp.type || undefined,
      href: `/clients/${entry.client.id}`,
    };
  }

  // Suivi de protocole : pas un RDV posé mais une action à faire ce jour-là.
  const name = [entry.due.client.firstName, entry.due.client.lastName]
    .filter(Boolean)
    .join(" ")
    .trim();
  return {
    ...base,
    title: `${entry.due.stepIconEmoji} ${name || "Client"}`,
    subtitle: entry.due.stepShortTitle,
    href: `/clients/${entry.due.client.id}`,
  };
}

export function toCalendarEvents(entries: AgendaEntry[]): CalendarEvent[] {
  const events: CalendarEvent[] = [];
  for (const entry of entries) {
    const ev = toCalendarEvent(entry);
    if (ev) events.push(ev);
  }
  return events.sort((a, b) => a.start.getTime() - b.start.getTime());
}

// ─── Utilitaires de semaine ──────────────────────────────────────────────────

/** Lundi 00:00 de la semaine contenant `d` (semaine française). */
export function startOfWeekMonday(d: Date): Date {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  const day = copy.getDay(); // 0 = dimanche
  const diff = day === 0 ? -6 : 1 - day;
  copy.setDate(copy.getDate() + diff);
  return copy;
}

/** Les 7 jours (lundi → dimanche) de la semaine contenant `d`. */
export function weekDays(d: Date): Date[] {
  const monday = startOfWeekMonday(d);
  return Array.from({ length: 7 }, (_, i) => {
    const day = new Date(monday);
    day.setDate(monday.getDate() + i);
    return day;
  });
}

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/** Minutes écoulées depuis minuit — sert à positionner un bloc dans la grille. */
export function minutesSinceMidnight(d: Date): number {
  return d.getHours() * 60 + d.getMinutes();
}

// ─── Chevauchements ──────────────────────────────────────────────────────────
// LOT 6.3 : deux RDV à la même heure se superposaient, l'un cachant l'autre —
// exactement le cas où le coach a le PLUS besoin de voir clair. On fait comme
// TimeTree ou Google : les RDV qui se chevauchent se partagent la largeur.
//
// L'algorithme travaille par « grappes » : une suite de RDV qui se recouvrent
// de proche en proche. Toute la grappe est découpée en autant de colonnes que
// nécessaire, ce qui garantit que deux blocs ne se recouvrent jamais.

export interface PlacedEvent {
  event: CalendarEvent;
  /** Colonne occupée dans la grappe (0-indexée). */
  column: number;
  /** Nombre total de colonnes de la grappe → largeur = 1 / columnCount. */
  columnCount: number;
}

function endMinutes(ev: CalendarEvent): number {
  return minutesSinceMidnight(ev.start) + Math.max(1, ev.durationMin);
}

/** Répartit les RDV d'UNE journée en colonnes sans recouvrement. */
export function layoutDay(events: CalendarEvent[]): PlacedEvent[] {
  const sorted = [...events].sort(
    (a, b) => a.start.getTime() - b.start.getTime() || endMinutes(a) - endMinutes(b),
  );

  const placed: PlacedEvent[] = [];
  let cluster: PlacedEvent[] = [];
  /** Fin de la dernière occupation de chaque colonne de la grappe courante. */
  let columnEnds: number[] = [];

  const flush = () => {
    const count = Math.max(1, columnEnds.length);
    for (const item of cluster) {
      item.columnCount = count;
      placed.push(item);
    }
    cluster = [];
    columnEnds = [];
  };

  for (const ev of sorted) {
    const start = minutesSinceMidnight(ev.start);
    // Plus aucun chevauchement possible avec la grappe en cours → on la ferme.
    if (columnEnds.length > 0 && columnEnds.every((end) => end <= start)) {
      flush();
    }
    // Première colonne libérée, sinon on en ouvre une nouvelle.
    let column = columnEnds.findIndex((end) => end <= start);
    if (column === -1) {
      column = columnEnds.length;
      columnEnds.push(0);
    }
    columnEnds[column] = endMinutes(ev);
    cluster.push({ event: ev, column, columnCount: 1 });
  }
  flush();

  return placed;
}
