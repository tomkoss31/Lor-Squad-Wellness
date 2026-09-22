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

/** « indispo » (18/09) : pas un rendez-vous, une plage où l'on ne cale rien. */
export type SourceRdv = "prospect" | "reservation" | "suivi" | "indispo";

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
  /** Son mail (22/09) : les MÊMES coordonnées que le CRM, partout (`agenda_du_club` les complète depuis sa fiche). */
  email?: string | null;
  /** Le statut brut de sa table : trois vocabulaires, cf. `marqueDe`. */
  statut: string;
  /** « bilan » · « decouverte » · « suivi » · … */
  nature: string;
  /** Pour un suivi : la cliente (18/09, agenda unique). */
  clientId?: string | null;
}

/** Une ligne de `agenda_du_club()` telle que la rend Supabase. */
export function versRdvClub(r: Record<string, unknown>): RdvClub | null {
  const source = String(r.source ?? "");
  if (source !== "prospect" && source !== "reservation" && source !== "suivi" && source !== "indispo") return null;
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
    email: typeof r.email === "string" && r.email.trim() ? r.email.trim() : null,
    statut: String(r.statut ?? ""),
    clientId: typeof r.client_id === "string" && r.client_id ? r.client_id : null,
    nature: String(r.nature ?? "") || (source === "indispo" ? "indispo" : source === "suivi" ? "suivi" : source === "reservation" ? "decouverte" : "bilan"),
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

/**
 * Comment joindre la personne. Le « contact » d'une réservation du site est
 * un champ libre : c'est parfois une ADRESSE MAIL (vu sur la prod le 17/09).
 * Fabriquer un `tel:` avec les chiffres d'un mail composerait un faux numéro —
 * on propose alors d'écrire, pas d'appeler.
 */
export function contactDe(r: RdvClub): { tel: string | null; mail: string | null } {
  const brut = (r.telephone ?? "").trim();
  // Depuis le 22/09, l'agenda rend aussi le mail, et complète l'un par l'autre
  // depuis la fiche du CRM : Mélanie n'avait pas le numéro de Sandrine (réservation
  // laissée avec un mail), alors que le CRM l'avait.
  const mailRendu = (r.email ?? "").trim();
  const mail = mailRendu.includes("@") ? mailRendu : brut.includes("@") ? brut : null;
  if (!brut || brut.includes("@")) return { tel: null, mail };
  const chiffres = brut.replace(/\D/g, "");
  return { tel: chiffres.length >= 6 ? chiffres : null, mail };
}

/** « 06 12 34 56 02 » — un numéro français de 10 chiffres, lisible ; le reste tel quel. */
export function telLisible(tel: string): string {
  const c = tel.replace(/\D/g, "");
  return c.length === 10 && c.startsWith("0") ? c.replace(/(\d{2})(?=\d)/g, "$1 ") : tel;
}

/**
 * PASSERELLE vers le bilan standard (18/09, agenda unique). Un rendez-vous de
 * l'agenda (table `prospects`) pré-remplit par sa fiche ; une réservation du
 * site n'a pas de fiche — on passe ce que le rendez-vous sait : prénom, nom,
 * téléphone ou email. `NewAssessmentPage` lit les deux.
 */
export function urlBilanStandard(r: RdvClub): string {
  if (r.source === "prospect") return `/assessments/new?prospectId=${r.id}`;
  const q = new URLSearchParams();
  if (r.prenom) q.set("prenom", r.prenom);
  if (r.nom) q.set("nom", r.nom);
  const { tel, mail } = contactDe(r);
  if (tel) q.set("tel", tel);
  if (mail) q.set("email", mail);
  const s = q.toString();
  return s ? `/assessments/new?${s}` : "/assessments/new";
}

/** Une plage « pas dispo » — elle occupe la coach, mais ce n'est pas un rendez-vous. */
export function estIndispo(r: RdvClub): boolean {
  return r.source === "indispo";
}

/** Les vrais rendez-vous : ce qu'on compte (« 3 rdv »), sans les « pas dispo ». */
export function sansIndispos(rdvs: readonly RdvClub[]): RdvClub[] {
  return rdvs.filter((r) => r.source !== "indispo");
}

/** « Justine » — la couleur dit déjà la coach, la place va à la personne. */
export function prenomSeul(r: RdvClub): string {
  if (r.source === "indispo") return "Pas dispo";
  return r.prenom || r.nom || "—";
}

/** « Justine Bernard » — pour un « pas dispo », sa note : « Pas dispo · médecin ». */
export function nomComplet(r: RdvClub): string {
  if (r.source === "indispo") return r.nom ? `Pas dispo · ${r.nom}` : "Pas dispo";
  return `${r.prenom} ${r.nom ?? ""}`.trim() || "—";
}

const NATURES: Record<string, string> = {
  bilan: "Bilan",
  decouverte: "Découverte",
  suivi: "Suivi",
  recrutement: "Recrutement",
  indispo: "Pas dispo",
};

/** « Bilan » · « Suivi » · « Découverte » — la nature, dite avec un mot. */
export function libelleNature(r: RdvClub): string {
  return NATURES[r.nature] ?? (r.nature ? r.nature.charAt(0).toUpperCase() + r.nature.slice(1) : "RDV");
}

export type CodeMarque = "demarre" | "fait" | "relance" | "pas_venue" | "perdue";

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
    if (r.statut === "lost") return { code: "perdue", symbole: "✗", libelle: "perdue" };
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
  if (r.source === "suivi" || r.source === "indispo") return false;
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

/** Ce que le club fait d'une journée, côté réservations du site. */
export interface HorairesDuJour {
  /**
   * « ouvert » : des heures s'appliquent · « ferme » : journée fermée à la main
   * (férié, « demain je ne suis pas là ») · « repos » : aucun horaire ce
   * jour-là de la semaine (le dimanche) — rien à signaler.
   */
  etat: "ouvert" | "ferme" | "repos";
  /** Heures décimales. Plusieurs plages possibles (8 h–15 h puis 16 h–18 h). */
  plages: Array<{ debut: number; fin: number }>;
  /** Vrai si la journée porte un horaire spécial (`hours_by_date`). */
  exception: boolean;
  /** La première plage telle qu'écrite (« 08:00 », « 15:00 ») — pour l'éditeur. */
  texte: [string, string] | null;
}

/** Les réglages qu'on lit — le sous-ensemble de `clubs.settings.discovery`. */
export interface ReglagesHoraires {
  hours?: Record<string, ReadonlyArray<ReadonlyArray<string>>> | null;
  hours_by_date?: Record<string, ReadonlyArray<ReadonlyArray<string>>> | null;
  holidays?: readonly string[] | null;
}

function heureDecimaleTexte(hhmm: string | undefined): number | null {
  const m = String(hhmm ?? "").match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  const x = Number(m[1]) + Number(m[2]) / 60;
  return x >= 0 && x <= 24 ? x : null;
}

/**
 * Les horaires réellement appliqués un jour donné — EXACTEMENT la règle de
 * `get_club_discovery_availability` : fermé si le jour est dans `holidays`,
 * sinon l'exception du jour (`hours_by_date`), sinon l'habituel de ce jour de
 * semaine (`hours`, clés ISO : 1 = lundi … 7 = dimanche). Une plage peut porter
 * un 3ᵉ élément (sa capacité) : on l'ignore ici.
 */
export function horairesDuJour(reglages: ReglagesHoraires | null | undefined, cle: string): HorairesDuJour {
  if (reglages?.holidays?.includes(cle)) return { etat: "ferme", plages: [], exception: false, texte: null };
  const d = jourDe(cle);
  const iso = d.getDay() === 0 ? 7 : d.getDay();
  const speciales = reglages?.hours_by_date?.[cle];
  const exception = Array.isArray(speciales) && speciales.length > 0;
  const brutes = exception ? speciales! : (reglages?.hours?.[String(iso)] ?? []);
  const plages: Array<{ debut: number; fin: number }> = [];
  let texte: [string, string] | null = null;
  for (const p of brutes) {
    const debut = heureDecimaleTexte(p?.[0]);
    const fin = heureDecimaleTexte(p?.[1]);
    if (debut == null || fin == null || fin <= debut) continue;
    if (!texte) texte = [String(p[0]), String(p[1])];
    plages.push({ debut, fin });
  }
  return { etat: plages.length ? "ouvert" : "repos", plages, exception, texte };
}

// ── « Pas dispo » ───────────────────────────────────────────────────────────

export type QuandIndispo = "matin" | "aprem" | "journee";

/**
 * Les trois gestes proposés — calés sur les heures où l'on propose des RDV
 * (8 h–18 h, cf. `PROPOSITION` plus bas : un test vérifie qu'ils restent alignés).
 */
export const QUAND_INDISPO: Record<QuandIndispo, { nom: string; debut: number; fin: number }> = {
  matin: { nom: "Le matin", debut: 8, fin: 12 },
  aprem: { nom: "L'après-midi", debut: 12, fin: 18 },
  journee: { nom: "Toute la journée", debut: 8, fin: 18 },
};

/** Les deux bornes d'un « pas dispo », en heure locale. */
export function plageIndispo(cle: string, quand: QuandIndispo): { debut: Date; fin: Date } {
  const q = QUAND_INDISPO[quand];
  const debut = jourDe(cle);
  debut.setHours(q.debut, 0, 0, 0);
  const fin = jourDe(cle);
  fin.setHours(q.fin, 0, 0, 0);
  return { debut, fin };
}

/** Combien de vrais rendez-vous tombent déjà sur cette plage, chez cette coach ? */
export function rdvSurLaPlage(rdvs: readonly RdvClub[], coachId: string, debut: Date, fin: Date): number {
  const d = debut.getTime();
  const f = fin.getTime();
  return rdvs.filter(
    (r) =>
      r.coachId === coachId &&
      r.source !== "indispo" &&
      marqueDe(r) === null &&
      new Date(r.debut).getTime() < f &&
      new Date(r.fin).getTime() > d,
  ).length;
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

// ── Les créneaux libres ─────────────────────────────────────────────────────

export interface Plage {
  /** Millisecondes. */
  debut: number;
  fin: number;
}

/** Les heures de la journée où l'on propose un rendez-vous. */
export const PROPOSITION = { debut: 8, fin: 18, pasMin: 30 };

/**
 * Les créneaux libres d'une coach un jour donné, en heures décimales.
 *
 * Un rendez-vous 10 h–11 h laisse 11 h libre (`<` et non `<=`) ; le dernier
 * créneau ne déborde jamais la fin de plage ; rien dans le passé. Les plages
 * occupées viennent de `creneaux_occupes()` : suivis, rendez-vous,
 * réservations ET rituels — la même source que le tunnel du site.
 */
export function creneauxLibres(
  occupes: readonly Plage[],
  jour: Date,
  dureeMin: number,
  maintenantMs: number,
  plage: { debut: number; fin: number; pasMin: number } = PROPOSITION,
): number[] {
  const out: number[] = [];
  const base = new Date(jour.getFullYear(), jour.getMonth(), jour.getDate()).getTime();
  const dureeMs = dureeMin * 60_000;
  for (let x = plage.debut; x + dureeMin / 60 <= plage.fin + 1e-9; x += plage.pasMin / 60) {
    const debut = base + x * 3_600_000;
    if (debut < maintenantMs) continue;
    const fin = debut + dureeMs;
    const pris = occupes.some((o) => debut < o.fin && fin > o.debut);
    if (!pris) out.push(Math.round(x * 100) / 100);
  }
  return out;
}

/**
 * Les créneaux proposables une DATE donnée, en respectant les horaires du club
 * (18/09/2026). `creneauxLibres` ne connaît que 8 h–18 h, tous les jours : la
 * feuille « Caler » proposait donc le dimanche — jour de repos —, le samedi
 * après-midi alors que le club ferme à 11 h, et les jours fériés réglés dans
 * `holidays`. On applique ici EXACTEMENT la règle du tunnel public
 * (`horairesDuJour`), pour que les deux portes disent la même chose.
 *
 * `horsHoraires` rouvre volontairement 8 h–18 h : les coachs calent de vrais
 * suivis le soir (16 h 30 un lundi, vu en production). On propose le normal,
 * on n'interdit rien.
 *
 * Sans horaires réglés (autre club, atelier), on garde 8 h–18 h : mieux vaut
 * trop proposer que bloquer tout le monde.
 */
export function creneauxDuJour(
  occupes: readonly Plage[],
  cle: string,
  dureeMin: number,
  maintenantMs: number,
  reglages: ReglagesHoraires | null | undefined,
  horsHoraires = false,
): number[] {
  const d = jourDe(cle);
  const aDesHoraires = Boolean(reglages?.hours && Object.keys(reglages.hours).length > 0);
  if (horsHoraires || !aDesHoraires) return creneauxLibres(occupes, d, dureeMin, maintenantMs);
  const h = horairesDuJour(reglages, cle);
  if (h.etat !== "ouvert") return [];
  const out = new Set<number>();
  for (const p of h.plages) {
    for (const x of creneauxLibres(occupes, d, dureeMin, maintenantMs, { debut: p.debut, fin: p.fin, pasMin: PROPOSITION.pasMin })) out.add(x);
  }
  return [...out].sort((a, b) => a - b);
}

/** « 09:30 » depuis une heure décimale. */
export function fmtHeure(x: number): string {
  const h = Math.floor(x);
  const m = Math.round((x - h) * 60);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/**
 * Le premier créneau libre de toute l'équipe, jour après jour : la réponse à
 * « vous êtes dispo quand ? » au téléphone. `null` si rien sur les jours donnés.
 */
export function auPlusTot(
  occupesParCoach: ReadonlyMap<string, readonly Plage[]>,
  jours: readonly string[],
  dureeMin: number,
  maintenantMs: number,
  reglages?: ReglagesHoraires | null,
  horsHoraires = false,
): { jour: string; coachId: string; heure: number } | null {
  for (const k of jours) {
    let meilleur: { jour: string; coachId: string; heure: number } | null = null;
    for (const [coachId, occupes] of occupesParCoach) {
      const l = creneauxDuJour(occupes, k, dureeMin, maintenantMs, reglages, horsHoraires);
      if (l.length && (!meilleur || l[0] < meilleur.heure)) meilleur = { jour: k, coachId, heure: l[0] };
    }
    if (meilleur) return meilleur;
  }
  return null;
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
