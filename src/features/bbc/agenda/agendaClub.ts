// =============================================================================
// L'agenda partagé du club — toute la logique, sans React ni Supabase.
//
// La source est UNE fonction en base, `agenda_du_club(du, au)`, qui réunit
// trois tables (rendez-vous posés à la main, réservations du site, suivis
// clients) avec les seuls champs d'un agenda. Ici on la lit, on la range par
// jour, on décide de la marque (✓ ⏳ ✗) et de la couleur. Rien d'autre.
//
// Même découpage que `boites.ts` et `coachsDuClub.ts` : une règle écrite une
// fois, verrouillée par des tests, jamais recopiée dans une vue.
// =============================================================================

import { fallbackOwnerColor } from "../../agenda/calendarEvents";

export type SourceRdv = "prospect" | "reservation" | "suivi";

export interface RdvClub {
  id: string;
  source: SourceRdv;
  /** La coach qui mène le rendez-vous — `null` = au club, à personne. */
  coachId: string | null;
  /** ISO 8601. */
  debut: string;
  fin: string;
  prenom: string;
  nom: string | null;
  telephone: string | null;
  /** Le statut brut de sa table : trois vocabulaires, cf. `marqueDe`. */
  statut: string;
  /** « bilan » · « decouverte » · « suivi » · … */
  nature: string;
}

/** Une ligne de `agenda_du_club()` telle que la rend Supabase. */
export function versRdvClub(r: Record<string, unknown>): RdvClub | null {
  const source = String(r.source ?? "");
  if (source !== "prospect" && source !== "reservation" && source !== "suivi") return null;
  const debut = typeof r.debut === "string" ? r.debut : "";
  if (!debut || Number.isNaN(new Date(debut).getTime())) return null;
  const fin = typeof r.fin === "string" && !Number.isNaN(new Date(r.fin).getTime()) ? r.fin : debut;
  return {
    id: String(r.id),
    source,
    coachId: typeof r.coach_user_id === "string" && r.coach_user_id ? r.coach_user_id : null,
    debut,
    fin,
    prenom: String(r.prenom ?? "").trim(),
    nom: typeof r.nom === "string" && r.nom.trim() ? r.nom.trim() : null,
    telephone: typeof r.telephone === "string" && r.telephone.trim() ? r.telephone.trim() : null,
    statut: String(r.statut ?? ""),
    nature: String(r.nature ?? "") || (source === "suivi" ? "suivi" : source === "reservation" ? "decouverte" : "bilan"),
  };
}

// ── Le temps, en heure locale (l'app tourne en France) ──────────────────────

/** « 2026-09-17 » — la clé d'un jour, en heure locale. */
export function cleJour(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function jourDe(cle: string): Date {
  const [a, m, j] = cle.split("-").map(Number);
  return new Date(a, (m || 1) - 1, j || 1);
}

/** « 09:30 » */
export function heureDe(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

/** Heure décimale (9 h 30 → 9.5), pour placer un bloc dans une grille. */
export function heureDecimale(iso: string): number {
  const d = new Date(iso);
  return d.getHours() + d.getMinutes() / 60;
}

const MOIS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
const JOURS = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"];
const JOURS_COURTS = ["dim.", "lun.", "mar.", "mer.", "jeu.", "ven.", "sam."];

/** « Septembre 2026 » */
export function libelleMois(d: Date): string {
  const m = MOIS[d.getMonth()];
  return `${m.charAt(0).toUpperCase()}${m.slice(1)} ${d.getFullYear()}`;
}

/** « jeudi 17 septembre » */
export function libelleJour(d: Date): string {
  return `${JOURS[d.getDay()]} ${d.getDate()} ${MOIS[d.getMonth()]}`;
}

/** « jeu. 17 » */
export function libelleJourCourt(d: Date): string {
  return `${JOURS_COURTS[d.getDay()]} ${d.getDate()}`;
}

/**
 * La grille d'un mois : des semaines complètes du lundi au dimanche, qui
 * débordent sur le mois d'avant et le mois d'après. Cinq semaines d'habitude,
 * six quand le 1er tombe tard dans la semaine (août 2026 commence un samedi).
 */
export function grilleMois(annee: number, mois: number): string[][] {
  const premier = new Date(annee, mois, 1);
  const lundi = new Date(premier);
  lundi.setDate(premier.getDate() - ((premier.getDay() + 6) % 7));
  const dernier = new Date(annee, mois + 1, 0);
  const semaines: string[][] = [];
  const curseur = new Date(lundi);
  while (curseur <= dernier || semaines.length === 0) {
    const semaine: string[] = [];
    for (let i = 0; i < 7; i += 1) {
      semaine.push(cleJour(curseur));
      curseur.setDate(curseur.getDate() + 1);
    }
    semaines.push(semaine);
  }
  return semaines;
}

/** Le lundi de la semaine d'un jour. */
export function lundiDe(d: Date): Date {
  const l = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  l.setDate(l.getDate() - ((l.getDay() + 6) % 7));
  return l;
}

/** Les 7 clés d'une semaine, à partir de son lundi. */
export function semaineDe(lundi: Date): string[] {
  const out: string[] = [];
  for (let i = 0; i < 7; i += 1) {
    const d = new Date(lundi);
    d.setDate(lundi.getDate() + i);
    out.push(cleJour(d));
  }
  return out;
}

// ── Ranger par jour ─────────────────────────────────────────────────────────

/** Les rendez-vous par jour, chaque jour trié par heure. */
export function parJour(rdvs: readonly RdvClub[]): Map<string, RdvClub[]> {
  const m = new Map<string, RdvClub[]>();
  for (const r of rdvs) {
    const k = cleJour(new Date(r.debut));
    const l = m.get(k) ?? [];
    l.push(r);
    m.set(k, l);
  }
  for (const l of m.values()) l.sort((a, b) => new Date(a.debut).getTime() - new Date(b.debut).getTime());
  return m;
}

// ── Ce qu'on écrit sur la pastille ──────────────────────────────────────────

/** « Justine » — la couleur dit déjà la coach, la place va à la personne. */
export function prenomSeul(r: RdvClub): string {
  return r.prenom || r.nom || "—";
}

/** « Justine Bernard » */
export function nomComplet(r: RdvClub): string {
  return `${r.prenom} ${r.nom ?? ""}`.trim() || "—";
}

const NATURES: Record<string, string> = {
  bilan: "Bilan",
  decouverte: "Découverte",
  suivi: "Suivi",
  recrutement: "Recrutement",
};

/** « Bilan » · « Suivi » · « Découverte » — la nature, dite avec un mot. */
export function libelleNature(r: RdvClub): string {
  return NATURES[r.nature] ?? (r.nature ? r.nature.charAt(0).toUpperCase() + r.nature.slice(1) : "RDV");
}

export type CodeMarque = "demarre" | "fait" | "relance" | "pas_venue";

export interface Marque {
  code: CodeMarque;
  symbole: string;
  libelle: string;
}

/**
 * La marque d'un rendez-vous déjà tranché — ou `null` s'il est simplement à
 * venir. Trois tables, trois vocabulaires : c'est ICI, et nulle part ailleurs,
 * qu'on les traduit.
 *   · prospects     : converted / done / no_show / cold  (scheduled = rien)
 *   · rdv_bookings  : honored / no_show                  (confirmed = rien)
 *   · follow_ups    : scheduled seulement — jamais de marque
 */
export function marqueDe(r: RdvClub): Marque | null {
  if (r.source === "prospect") {
    if (r.statut === "converted") return { code: "demarre", symbole: "✓", libelle: "a démarré" };
    if (r.statut === "done") return { code: "fait", symbole: "✓", libelle: "fait" };
    if (r.statut === "no_show") return { code: "pas_venue", symbole: "✗", libelle: "pas venue" };
    if (r.statut === "cold") return { code: "relance", symbole: "⏳", libelle: "à relancer" };
    return null;
  }
  if (r.source === "reservation") {
    if (r.statut === "honored") return { code: "fait", symbole: "✓", libelle: "venue" };
    if (r.statut === "no_show") return { code: "pas_venue", symbole: "✗", libelle: "pas venue" };
    return null;
  }
  return null;
}

/** Ce rendez-vous est-il passé sans avoir été tranché ? Il doit sauter aux yeux. */
export function aQualifier(r: RdvClub, maintenantMs: number): boolean {
  if (r.source === "suivi") return false;
  return new Date(r.fin).getTime() < maintenantMs && marqueDe(r) === null;
}

/** « 14 – 20 sept. » */
export function libelleSemaine(lundi: Date): string {
  const dimanche = new Date(lundi);
  dimanche.setDate(lundi.getDate() + 6);
  const MC = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];
  if (lundi.getMonth() === dimanche.getMonth()) return `${lundi.getDate()} – ${dimanche.getDate()} ${MC[dimanche.getMonth()]}`;
  return `${lundi.getDate()} ${MC[lundi.getMonth()]} – ${dimanche.getDate()} ${MC[dimanche.getMonth()]}`;
}

/** La clé du jour décalé de `n` jours. */
export function decalerJour(cle: string, n: number): string {
  const d = jourDe(cle);
  d.setDate(d.getDate() + n);
  return cleJour(d);
}

// ── Les horaires du club ────────────────────────────────────────────────────

/**
 * « 7h-11h », « 7h30-11h », « 08:00-15:00 » → { debut: 7, fin: 11 } en heures
 * décimales. `null` si on ne sait pas lire : la bande d'ouverture ne s'affiche
 * pas plutôt que de s'afficher fausse.
 */
export function plageOuverture(texte: string | null | undefined): { debut: number; fin: number } | null {
  if (!texte) return null;
  const m = texte.replace(/\s+/g, "").match(/^(\d{1,2})(?:[h:](\d{2})?)?[-–>→]+(\d{1,2})(?:[h:](\d{2})?)?$/i);
  if (!m) return null;
  const debut = Number(m[1]) + Number(m[2] ?? 0) / 60;
  const fin = Number(m[3]) + Number(m[4] ?? 0) / 60;
  if (!(debut >= 0 && fin <= 24 && fin > debut)) return null;
  return { debut, fin };
}

// ── Les blocs qui se chevauchent, côte à côte ───────────────────────────────

export interface Couloir<T> {
  rdv: T;
  /** Le couloir (0 = le plus à gauche). */
  couloir: number;
}

/**
 * Place des rendez-vous qui se chevauchent dans des couloirs parallèles, pour
 * qu'aucun bloc n'en cache un autre. Un rendez-vous qui commence à l'heure où
 * le précédent finit reprend son couloir (10 h–11 h puis 11 h–12 h : un seul).
 */
export function couloirs<T extends { debut: string; fin: string }>(liste: readonly T[]): { items: Couloir<T>[]; nb: number } {
  const tries = [...liste].sort((a, b) => new Date(a.debut).getTime() - new Date(b.debut).getTime());
  const fins: number[] = [];
  const items = tries.map((rdv) => {
    const d = new Date(rdv.debut).getTime();
    let c = 0;
    while (c < fins.length && fins[c] > d) c += 1;
    fins[c] = Math.max(new Date(rdv.fin).getTime(), d + 1);
    return { rdv, couloir: c };
  });
  return { items, nb: Math.max(1, fins.length) };
}

// ── La couleur ──────────────────────────────────────────────────────────────

/**
 * La couleur d'une coach : celle qu'elle a choisie (`users.calendar_color`),
 * sinon le même repli que l'agenda classique — jamais une couleur inventée
 * ici, sinon les deux apps diraient deux choses différentes.
 */
export function couleurCoach(
  coachId: string | null | undefined,
  coachs: ReadonlyArray<{ id: string; couleur: string | null }>,
): string {
  if (!coachId) return "var(--ls-bbc-sage)";
  const c = coachs.find((x) => x.id === coachId);
  if (c?.couleur) return c.couleur;
  return fallbackOwnerColor(coachId);
}
