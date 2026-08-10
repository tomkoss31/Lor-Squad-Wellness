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

/**
 * RDV découverte réservé depuis le site public du club (/reserver).
 * Forme minimale volontaire : l'agenda n'a pas à connaître la table
 * rdv_bookings ni le hook qui la charge.
 */
export interface DiscoverySession {
  firstName: string;
  peopleCount: number;
  partnerFirstName: string | null;
  objectif: string | null;
  status: string;
}

/**
 * Entrée unifiée de l'agenda : follow-up client, prospect, suivi protocole,
 * OU RDV découverte du club.
 *
 * `discovery` ajoutée le 2026-08-09 (chantier RDV du club) : ces RDV
 * n'apparaissaient que dans la vue BBC « La semaine », l'agenda classique les
 * ignorait — la même journée ne se lisait donc pas pareil selon le mode.
 * Elles ne sont rattachées à AUCUN coach (coach_user_id = null) : on les range
 * sous le propriétaire du club pour qu'elles suivent les filtres d'équipe.
 */
export type AgendaEntry =
  | { kind: "client"; id: string; date: string; distributorId: string; followUp: FollowUp; client: Client }
  | { kind: "prospect"; id: string; date: string; distributorId: string; prospect: Prospect }
  | { kind: "protocol"; id: string; date: string; distributorId: string; due: FollowUpDueItem }
  | { kind: "discovery"; id: string; date: string; distributorId: string; discovery: DiscoverySession };

/** Libellés des objectifs choisis au moment de réserver un RDV découverte. */
const DISCOVERY_OBJECTIFS: Record<string, string> = {
  poids: "perte de poids",
  muscle: "prise de muscle",
  energie: "énergie",
};

/** Dernier recours si ni le RDV ni le coach ne portent de durée. */
export const DEFAULT_RDV_MINUTES = 45;

/** Choix rapides proposés au moment de poser un RDV. */
export const RDV_DURATION_CHOICES = [30, 45, 60, 90] as const;

/**
 * Durée retenue pour un RDV, par ordre de priorité (LOT 6.4) :
 *   1. la durée portée par le RDV lui-même
 *   2. le réglage « mes RDV durent X » du coach à qui il appartient
 *   3. 45 minutes
 * Les valeurs aberrantes (0, négatives, > 8 h) sont ignorées plutôt que
 * dessinées : un bloc de 3 000 minutes écraserait toute la grille.
 */
export function resolveDuration(
  ownDuration: number | null | undefined,
  coachDefault: number | null | undefined,
): number {
  const valid = (v: number | null | undefined): v is number =>
    typeof v === "number" && Number.isFinite(v) && v >= 5 && v <= 480;
  if (valid(ownDuration)) return ownDuration;
  if (valid(coachDefault)) return coachDefault;
  return DEFAULT_RDV_MINUTES;
}

export interface CalendarEvent {
  id: string;
  kind: AgendaEntry["kind"];
  start: Date;
  durationMin: number;
  /**
   * Vrai pour une action à faire dans la journée, sans heure de rendez-vous
   * (les suivis de protocole). Affichée en bandeau en haut du jour, jamais
   * plantée à une heure arbitraire dans la grille : leur `dueDate` hérite de
   * l'heure du bilan initial, ce qui donnerait une précision inventée.
   */
  allDay?: boolean;
  /**
   * RDV prospect passé, toujours au statut « planifié » : le coach n'a jamais
   * dit si la personne était venue. Mesuré en prod le 2026-07-27 : 11 des 13
   * prospects « à venir » sont dans ce cas — ils polluent la liste des RDV à
   * venir et faussent le CRM. L'agenda est le seul endroit où les rattraper.
   */
  needsQualification?: boolean;
  /**
   * Renseigné quand le client ne recevra PAS le rappel automatique attendu.
   * Mesuré en prod le 2026-07-27 chez Mélanie : sur 29 RDV clients à venir,
   * 5 ont les rappels coupés et 5 concernent un client sans email — soit une
   * dizaine de RDV muets, invisibles à l'écran, pour quelqu'un qui travaille
   * au téléphone. Le coach doit savoir qui il devra appeler lui-même.
   */
  silentReason?: string;
  /** Ligne 1 : « Bilan · Karim B. » */
  title: string;
  /** Ligne 2, optionnelle : contexte court. */
  subtitle?: string;
  /** Le coach à qui appartient ce RDV — porte la couleur. */
  ownerId: string;
  // `href` RETIRÉ (2026-07-27) : plus aucun lecteur depuis que le clic ouvre
  // les modales sur place au lieu de naviguer (handleCalendarEventClick).
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
// « Framboise » (#D4537E) est volontairement ABSENTE : c'est la teinte de la
// ligne « il est telle heure » dans la grille. Un coach qui l'aurait choisie
// aurait rendu ses RDV de la couleur du repère temporel. Retirée avant que
// quiconque la choisisse — les 14 comptes ont calendar_color à NULL.
export const CALENDAR_PALETTE: Array<{ hex: string; label: string }> = [
  { hex: "#2DD4BF", label: "Turquoise" },
  { hex: "#A78BFA", label: "Violet" },
  { hex: "var(--ls-teal)", label: "Doré" },
  { hex: "#2DD4BF", label: "Cyan" },
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
 * Bande de fond dessinée SOUS les RDV (LOT 6.6). Générique par construction :
 * le moteur d'agenda ne sait pas ce qu'elle représente. Aujourd'hui ce sont
 * les permanences du club BBC (« qui tient le bar »), demain ce pourrait être
 * des heures d'ouverture ou des indisponibilités — sans toucher à la grille.
 */
export interface DayBand {
  id: string;
  start: Date;
  end: Date;
  /** Texte court affiché en haut de la bande (ex. « THOMAS · CLUB »). */
  label: string;
  /** Couleur d'accent (hex). */
  color: string;
  /** Vrai si l'utilisateur courant peut la retirer. */
  removable?: boolean;
}

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

/**
 * Couleur par TYPE de rendez-vous (refonte 2026-07-27).
 *
 * La couleur disait « qui ». Or un coach seul dans sa vue voyait tout de la
 * même teinte : une information qui ne varie jamais n'informe pas. Quand un
 * seul coach est affiché, la couleur dit donc le TYPE ; dès que l'équipe
 * apparaît, elle redit « qui ». Cf. makeEventColor.
 *
 * Tokens CSS et non hex bruts : les deux thèmes sont couverts d'office.
 */
export const KIND_COLORS: Record<AgendaEntry["kind"], string> = {
  prospect: "var(--ls-teal)",
  client: "var(--ls-purple)",
  protocol: "var(--ls-teal)",
  // Les RDV du club se repèrent d'un coup d'œil au milieu des suivis.
  discovery: "var(--ls-coral)",
};

/** Un RDV passé que le coach n'a jamais qualifié : il saute aux yeux. */
export const NEEDS_QUALIF_COLOR = "var(--ls-coral)";

/**
 * Résout la couleur d'un événement selon le contexte affiché.
 * Priorité : à qualifier > (un seul coach ? le type : la personne).
 */
export function makeEventColor(
  events: CalendarEvent[],
  ownerColor: OwnerColorResolver,
): (ev: CalendarEvent) => string {
  const owners = new Set(events.map((e) => e.ownerId));
  const soloCoach = owners.size <= 1;
  return (ev) => {
    if (ev.needsQualification) return NEEDS_QUALIF_COLOR;
    return soloCoach ? KIND_COLORS[ev.kind] : ownerColor(ev.ownerId);
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
export function toCalendarEvent(
  entry: AgendaEntry,
  /** Durée par défaut du coach propriétaire — cf. resolveDuration. */
  coachDefaultMinutes?: number | null,
): CalendarEvent | null {
  const start = new Date(entry.date);
  if (Number.isNaN(start.getTime())) return null;

  const ownDuration =
    entry.kind === "prospect"
      ? entry.prospect.durationMin
      : entry.kind === "client"
        ? entry.followUp.durationMin
        : undefined;

  const base = {
    id: `${entry.kind}-${entry.id}`,
    kind: entry.kind,
    start,
    durationMin: resolveDuration(ownDuration, coachDefaultMinutes),
    ownerId: entry.distributorId,
    entry,
  };

  if (entry.kind === "prospect") {
    return {
      ...base,
      // « scheduled » sur un RDV déjà passé = jamais qualifié.
      needsQualification:
        entry.prospect.status === "scheduled" && start.getTime() < Date.now(),
      title: prospectTitle(entry.prospect),
      subtitle: entry.prospect.source || undefined,
    };
  }

  if (entry.kind === "client") {
    // On ne signale que ce qui est CERTAIN depuis le front : le rappel coupé
    // (drapeau explicite) et l'absence d'email (l'edge client-rdv-reminder
    // envoie le rappel de la veille par email). Le push de 2 h avant dépend
    // d'un abonnement que le front ne charge pas — on ne prétend donc pas
    // qu'« aucun rappel » ne partira.
    const silent =
      entry.followUp.notifyClient === false
        ? "Rappels coupés pour ce RDV"
        : !entry.client.email
          ? "Pas d'email : pas de rappel la veille"
          : undefined;
    return {
      ...base,
      silentReason: silent,
      title: clientTitle(entry.client),
      subtitle: entry.followUp.type || undefined,
    };
  }

  if (entry.kind === "discovery") {
    const d = entry.discovery;
    const objectif = d.objectif ? DISCOVERY_OBJECTIFS[d.objectif] ?? d.objectif : null;
    return {
      ...base,
      title: d.peopleCount === 2 ? `${d.firstName} + 1` : d.firstName,
      subtitle: ["RDV découverte", objectif].filter(Boolean).join(" · "),
    };
  }

  // Suivi de protocole : pas un RDV posé mais une action à faire ce jour-là.
  const name = [entry.due.client.firstName, entry.due.client.lastName]
    .filter(Boolean)
    .join(" ")
    .trim();
  return {
    ...base,
    // Un suivi de protocole n'a pas d'heure de rendez-vous : sa date hérite de
    // l'heure du bilan initial. On le sort de la grille horaire.
    allDay: true,
    title: `${entry.due.stepIconEmoji} ${name || "Client"}`,
    subtitle: entry.due.stepShortTitle,
  };
}

export function toCalendarEvents(
  entries: AgendaEntry[],
  /** Durée par défaut de chaque coach (users.default_rdv_minutes). */
  coachDefaults?: Map<string, number | null | undefined>,
): CalendarEvent[] {
  const events: CalendarEvent[] = [];
  for (const entry of entries) {
    const ev = toCalendarEvent(entry, coachDefaults?.get(entry.distributorId));
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

/**
 * Les 42 jours d'une grille mensuelle (6 semaines × 7 jours), lundi en tête.
 * Six semaines couvrent tous les cas — y compris un mois de 31 jours qui
 * commence un dimanche — donc la grille ne change jamais de hauteur d'un mois
 * à l'autre : rien ne saute à l'écran quand on navigue.
 */
export function monthGridDays(anchor: Date): Date[] {
  const firstOfMonth = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  const start = startOfWeekMonday(firstOfMonth);
  return Array.from({ length: 42 }, (_, i) => {
    const day = new Date(start);
    day.setDate(start.getDate() + i);
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
