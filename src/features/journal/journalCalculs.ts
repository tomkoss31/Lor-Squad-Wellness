// =============================================================================
// Journal nutritionnel — les calculs, purs et testés (21/09/2026).
//
// Tout ce qui décide d'un chiffre vit ici, sans React ni réseau : l'écran de la
// membre et le volet de la coach lisent les MÊMES règles. Le serveur calcule
// les protéines de chaque ligne et paie les défis (migration
// 20261215560000_journal_nutritionnel.sql) ; les fonctions ci-dessous en sont
// le miroir pour l'affichage. Si une règle change, elle change des deux côtés.
//
// LES RÈGLES DE THOMAS (21/09) :
//   • protéines = poids du dernier bilan × coefficient réglé par la coach ;
//   • eau = 1 L par 30 kg, la boisson du club (40 cl) comptée ;
//   • le shake n'existe qu'en combo (jamais « F1 seul ») ;
//   • aux encas : Herbalife d'abord, puis fromage blanc, puis skyr ;
//   • 4 défis du jour à +5 XP (+5 « très active ») — l'échelle de l'humeur.
// =============================================================================

import { CLIENT_XP_LEVELS } from "../client-xp/actions";

export type Creneau = "pdj" | "enc1" | "dej" | "enc2" | "din" | "aut";
export type Groupe = "pdj" | "enc" | "repas";
export type Activite = "repos" | "15" | "30" | "45" | "60";
export type Humeur = "great" | "good" | "okay" | "tired" | "tough";

export const CRENEAUX: Creneau[] = ["pdj", "enc1", "dej", "enc2", "din", "aut"];
/** Les créneaux d'une journée « complète » + ceux que le plan peut proposer. */
export const CRENEAUX_REPAS: Creneau[] = ["pdj", "enc1", "dej", "enc2", "din"];

export const NOM_CRENEAU: Record<Creneau, string> = {
  pdj: "Petit-déjeuner",
  enc1: "Encas matin",
  dej: "Déjeuner",
  enc2: "Encas après-midi",
  din: "Dîner",
  aut: "Autre",
};
export const INDICE_CRENEAU: Record<Creneau, string> = {
  pdj: "équilibré",
  enc1: "protéiné",
  dej: "équilibré",
  enc2: "protéiné",
  din: "équilibré",
  aut: "grignotage, boisson",
};
/** Les idées proposées dépendent du créneau : jamais de poulet au petit-déj. */
/** « Noter mon déjeuner » : le repas dit comme on le dit. */
export const COURT_CRENEAU: Record<Creneau, string> = {
  pdj: "petit-déj",
  enc1: "encas",
  dej: "déjeuner",
  enc2: "encas",
  din: "dîner",
  aut: "grignotage",
};
export const GROUPE: Record<Creneau, Groupe | null> = {
  pdj: "pdj",
  enc1: "enc",
  enc2: "enc",
  dej: "repas",
  din: "repas",
  aut: null,
};

export const ACTIVITES: Array<{ cle: Activite; libelle: string }> = [
  { cle: "repos", libelle: "Repos" },
  { cle: "15", libelle: "15 min" },
  { cle: "30", libelle: "30 min" },
  { cle: "45", libelle: "45 min" },
  { cle: "60", libelle: "1 h et plus" },
];

/** Les 5 humeurs de l'Accueil (mêmes clés serveur que record_client_mood). */
export const HUMEURS: Array<{ cle: Humeur; libelle: string; couleur: string }> = [
  { cle: "great", libelle: "Au top", couleur: "var(--jr-m1)" },
  { cle: "good", libelle: "Bien", couleur: "var(--jr-m2)" },
  { cle: "okay", libelle: "Comme ça", couleur: "var(--jr-m3)" },
  { cle: "tired", libelle: "Fatigué·e", couleur: "var(--jr-m4)" },
  { cle: "tough", libelle: "Difficile", couleur: "var(--jr-m5)" },
];

export const COEFFICIENTS: Array<{ coef: number; libelle: string; phrase: string }> = [
  { coef: 1.2, libelle: "activité normale", phrase: "quand on bouge peu ou normalement" },
  { coef: 1.4, libelle: "très active", phrase: "parce que tu bouges beaucoup" },
  { coef: 1.5, libelle: "prise de muscle", phrase: "pour prendre du muscle" },
  { coef: 2, libelle: "sport intensif", phrase: "pour ton sport intensif" },
];

// ─── Les données telles que le serveur les rend ──────────────────────────────
export interface Aliment {
  cle: string;
  nom: string;
  famille: string | null;
  herbalife: boolean;
  prot_portion: number | null;
  prot_100g: number | null;
  portions: number[] | null;
  unite: string | null;
  indice: string | null;
  rangs: Partial<Record<Groupe, number>>;
}

export interface Ligne {
  id: string;
  creneau: Creneau;
  /** null = une ligne estimée par Noaly, hors catalogue (burrata, pizza au thon…). */
  aliment: string | null;
  libelle: string;
  grammes: number | null;
  quantite: number;
  prot_g: number;
  /** Les protéines pour 100 g d'une ligne estimée (corriger son poids recalcule le total). */
  prot_100g?: number | null;
  origine: "membre" | "club" | "noaly" | "coach";
  /** Ses kcal (bloc B, 9), calculées par le serveur : catalogue, ou estimation de Noaly ; null = inconnues. */
  kcal?: number | null;
  kcal_100g?: number | null;
}

export type LigneVeille = Omit<Ligne, "id" | "origine">;

export interface Objectifs {
  poids: number | null;
  coef: number;
  /** null tant qu'aucun bilan pesé n'existe. */
  proteines: number | null;
  eau_l: number;
}

export interface Remarque {
  texte: string;
  changements: string[];
  le: string;
  coach?: string | null;
}

/** Un habituel (bloc B, 6) : ce qu'elle note souvent à ce repas, avec SA quantité la plus fréquente. */
export interface Habituel {
  /** null = un plat estimé par Noaly : il revient avec son estimation. */
  aliment: string | null;
  libelle: string;
  grammes: number | null;
  quantite: number;
  prot_100g: number | null;
  prot_g: number;
  /** Le nombre de jours, sur les 14 d'avant, où elle l'a noté à ce repas. */
  jours: number;
  kcal_100g?: number | null;
}

export interface EtatJour {
  jour: string;
  aujourdhui: string;
  objectifs: Objectifs;
  lignes: Ligne[];
  veille: LigneVeille[];
  verres: number;
  boisson_club: boolean;
  activite: Activite | null;
  humeur: Humeur | null;
  remarque: Remarque | null;
  xp_total: number;
  gains?: Array<{ cle: string; xp: number }>;
  /** Ses habituels, par repas (serveur : `_journal_habituels`). */
  habituels?: Partial<Record<Creneau, Habituel[]>>;
  /** false = sa coach a masqué les kcal (bloc B, 9) ; visibles par défaut. */
  kcal_visibles?: boolean;
}

// ─── L'eau ────────────────────────────────────────────────────────────────────
export const VERRE_L = 0.25;
export const BOISSON_CLUB_L = 0.4;
/** 9 verres de 25 cl (2,25 L) valent « 2,3 L » : on arrondit au verre, pas au décilitre. */
export const TOLERANCE_EAU_L = 0.05;

export function litres(verres: number, boissonClub: boolean): number {
  return Math.round((verres * VERRE_L + (boissonClub ? BOISSON_CLUB_L : 0)) * 100) / 100;
}

/** Combien de verres de 25 cl pour atteindre l'objectif (la boisson du club déjà comptée). */
export function verresObjectif(eauL: number, boissonClub: boolean): number {
  const reste = eauL - TOLERANCE_EAU_L - (boissonClub ? BOISSON_CLUB_L : 0);
  return Math.max(1, Math.ceil(reste / VERRE_L - 1e-9));
}

export function eauAtteinte(eauL: number, verres: number, boissonClub: boolean): boolean {
  return litres(verres, boissonClub) >= eauL - TOLERANCE_EAU_L - 1e-9;
}

// ─── Les protéines ────────────────────────────────────────────────────────────
export function protJour(lignes: Array<{ prot_g: number }>): number {
  return lignes.reduce((a, l) => a + Number(l.prot_g || 0), 0);
}

/** Même calcul que le serveur (journal_ajouter) — sert à l'aperçu avant d'ajouter. */
export function protAliment(a: Aliment, grammes: number | null, quantite = 1): number {
  if (a.prot_portion != null) return Math.round(a.prot_portion * Math.max(1, quantite) * 10) / 10;
  return Math.round(((a.prot_100g ?? 0) * (grammes ?? 0)) / 100 * 10) / 10;
}

export function lignesDe<T extends { creneau: Creneau }>(lignes: T[], creneau: Creneau): T[] {
  return lignes.filter((l) => l.creneau === creneau);
}

export function journeeComplete(lignes: Array<{ creneau: Creneau }>): boolean {
  const a = (c: Creneau) => lignes.some((l) => l.creneau === c);
  return a("pdj") && a("dej") && a("din") && (a("enc1") || a("enc2"));
}

// ─── Les défis du jour (miroir de _journal_defis) ────────────────────────────
export type CleDefi = "journal_note" | "journal_proteines" | "journal_eau" | "journal_complete";

export interface Defi {
  cle: CleDefi;
  libelle: string;
  atteint: boolean;
}

export function defisDuJour(e: EtatJour): Defi[] {
  const prot = protJour(e.lignes);
  return [
    { cle: "journal_note", libelle: "Journée notée", atteint: e.lignes.some((l) => l.origine !== "club") },
    {
      cle: "journal_proteines",
      libelle: e.objectifs.proteines != null ? `${e.objectifs.proteines} g de prot` : "Protéines",
      atteint: e.objectifs.proteines != null && prot >= e.objectifs.proteines,
    },
    {
      cle: "journal_eau",
      libelle: `${formatLitres(e.objectifs.eau_l)} L d'eau`,
      atteint: eauAtteinte(e.objectifs.eau_l, e.verres, e.boisson_club),
    },
    { cle: "journal_complete", libelle: "Journée complète", atteint: journeeComplete(e.lignes) },
  ];
}

/** Libellé d'un gain d'XP pour le petit message du haut. */
export const LIBELLE_GAIN: Record<string, string> = {
  journal_note: "journée notée",
  journal_proteines: "objectif protéines",
  journal_eau: "objectif eau",
  journal_complete: "journée complète",
  journal_actif: "très active",
  mood_checkin: "humeur du jour",
};

// ─── Les niveaux (ceux de l'app : src/features/client-xp/actions.ts) ─────────
export function niveauDe(xp: number) {
  const tries = [...CLIENT_XP_LEVELS].sort((a, b) => a.threshold - b.threshold);
  let courant = tries[0];
  for (const n of tries) if (xp >= n.threshold) courant = n;
  const suivant = tries.find((n) => n.threshold > xp) ?? null;
  const part = suivant ? (xp - courant.threshold) / (suivant.threshold - courant.threshold) : 1;
  return { courant, suivant, part: Math.max(0, Math.min(1, part)) };
}

// ─── Chercher un aliment ──────────────────────────────────────────────────────
/** « oeuf » doit trouver « Œuf », « pates » doit trouver « Pâtes ». */
export function normaliser(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/œ/g, "oe")
    .replace(/æ/g, "ae")
    .trim();
}

export function chercher(aliments: Aliment[], q: string): Aliment[] {
  const mots = normaliser(q).split(/\s+/).filter(Boolean);
  if (!mots.length) return [];
  return aliments
    .filter((a) => {
      const nom = normaliser(a.nom);
      return mots.every((m) => nom.includes(m));
    })
    .sort((a, b) => Number(b.herbalife) - Number(a.herbalife) || a.nom.localeCompare(b.nom, "fr"));
}

/** Herbalife d'abord, puis le reste, chacun dans l'ordre choisi par Thomas (colonne `rangs`). */
export function suggestions(aliments: Aliment[], creneau: Creneau): { herbalife: Aliment[]; autres: Aliment[] } {
  const g = GROUPE[creneau];
  const rang = (a: Aliment) => (g ? a.rangs?.[g] : undefined);
  if (!g) {
    const tri = (x: Aliment[]) => [...x].sort((a, b) => a.nom.localeCompare(b.nom, "fr"));
    return { herbalife: tri(aliments.filter((a) => a.herbalife)), autres: tri(aliments.filter((a) => !a.herbalife)) };
  }
  const retenus = aliments.filter((a) => rang(a) != null).sort((a, b) => (rang(a) ?? 0) - (rang(b) ?? 0));
  return { herbalife: retenus.filter((a) => a.herbalife), autres: retenus.filter((a) => !a.herbalife) };
}

/** Les variantes échangeables d'un produit (½ ↔ 1 sachet de PDM, les combos du shake). */
export function variantes(aliments: Aliment[], a: Aliment): Aliment[] {
  if (!a.famille) return [];
  return aliments.filter((x) => x.famille === a.famille).sort((x, y) => (x.rangs?.pdj ?? x.rangs?.enc ?? 99) - (y.rangs?.pdj ?? y.rangs?.enc ?? 99));
}

// ─── Lire une journée ─────────────────────────────────────────────────────────
/** « Poulet (blanc), cuit » → « Poulet » ; on garde « (28 g) », qui est une quantité. */
function nomCourt(libelle: string): string {
  return libelle.replace(/, (cuit|cuite|cuits|cuites|grillé|rôtie)$/, "").replace(/ \((?!\d)[^)]*\)$/, "");
}

/** Une ligne de repas en une phrase : « Poulet (blanc), riz blanc, haricots verts ». */
// ─── Les kcal (bloc B, 9) : discrètes, jamais un objectif ──────────────────
/** Les kcal connues d'un ensemble de lignes ; `estime` dès qu'une ligne est estimée ou sans kcal. */
export function kcalDe(lignes: Array<{ aliment: string | null; kcal?: number | null }>): { kcal: number; estime: boolean; connu: boolean } {
  let kcal = 0;
  let connu = false;
  let estime = false;
  for (const l of lignes) {
    if (l.kcal == null) { estime = true; continue; }
    kcal += l.kcal;
    connu = true;
    if (l.aliment == null) estime = true;
  }
  return { kcal, estime, connu };
}

/** « 157 kcal », « ≈ 453 kcal » (un plat estimé dedans), « ≈ 770 kcal » (la journée, à 10 près). */
export function texteKcal(kcal: number, estime: boolean, journee = false): string {
  const n = journee ? Math.round(kcal / 10) * 10 : Math.round(kcal);
  return `${estime || journee ? "≈ " : ""}${String(n).replace(/\B(?=(\d{3})+(?!\d))/g, "\u202f")} kcal`;
}

// ─── Ses habituels (bloc B, 6 — maquette Jt3RNaarpnav5XRGzhrTwz) ─────────────
const cleHabituel = (x: { aliment: string | null; libelle: string }) =>
  x.aliment ?? `~${x.libelle.trim().toLowerCase()}`;

/** Les habituels d'un repas, sans ce qui y est déjà noté ce jour-là (pas de doublon par mégarde). */
export function habituelsDuCreneau(e: EtatJour, creneau: Creneau): Habituel[] {
  const deja = new Set(e.lignes.filter((l) => l.creneau === creneau).map(cleHabituel));
  return (e.habituels?.[creneau] ?? []).filter((h) => !deja.has(cleHabituel(h)));
}

/** « 5 fois en 2 semaines », ou « tous les matins » quand c'est (presque) chaque jour. */
export function frequenceHabituel(jours: number, creneau: Creneau): string {
  if (jours >= 13) return creneau === "pdj" ? "tous les matins" : creneau === "din" ? "tous les soirs" : "tous les jours";
  return `${jours} fois en 2 semaines`;
}

/** Ses protéines, aux valeurs ACTUELLES du catalogue (ou selon l'estimation de Noaly). */
export function protHabituel(h: Habituel, aliments: Aliment[]): number {
  const a = h.aliment ? aliments.find((x) => x.cle === h.aliment) : undefined;
  if (a) return protAliment(a, h.grammes, h.quantite);
  if (h.aliment == null && h.prot_100g != null && h.grammes != null) return Math.round((h.prot_100g * h.grammes) / 100 * 10) / 10;
  return h.prot_g;
}

export function resume(lignes: Array<{ libelle: string; quantite: number }>): string {
  return lignes
    .map((l, i) => {
      const n = nomCourt(l.libelle) + (l.quantite > 1 ? ` × ${l.quantite}` : "");
      return i > 0 && /^.[a-zà-ÿœ]/.test(n) ? n.charAt(0).toLowerCase() + n.slice(1) : n;
    })
    .join(", ");
}

export function formatLitres(l: number): string {
  return l.toFixed(1).replace(".", ",");
}

export function formatGrammes(g: number): string {
  return String(Math.round(g));
}

// ─── Le plan de fin de journée (« Mes conseils du jour ») ────────────────────
// Une idée simple par créneau encore vide, Herbalife aux encas, jusqu'à
// l'objectif. Calculé ici (instantané, gratuit) : Noaly ne fera que le rédiger.
export const PLAN: Partial<Record<Creneau, { cle: string; grammes?: number }>> = {
  enc1: { cle: "barre" },
  dej: { cle: "poulet", grammes: 150 },
  enc2: { cle: "pdmplein" },
  din: { cle: "poisson_blanc", grammes: 100 },
};

export interface LignePlan {
  creneau: Creneau;
  aliment: Aliment;
  grammes: number | null;
  prot: number;
}

/**
 * Le créneau de l'heure qu'il est, sur le téléphone de la membre :
 * avant 10 h le petit-déj, puis l'encas du matin, le déjeuner (11 h 30),
 * l'encas de l'après-midi (14 h 30) et le dîner (18 h 30).
 */
export function creneauDeLHeure(d: Date): Creneau {
  const m = d.getHours() * 60 + d.getMinutes();
  if (m < 10 * 60) return "pdj";
  if (m < 11 * 60 + 30) return "enc1";
  if (m < 14 * 60 + 30) return "dej";
  if (m < 18 * 60 + 30) return "enc2";
  return "din";
}

/**
 * Ce que la carte de l'accueil propose de noter : le repas de l'heure s'il
 * est vide, sinon le suivant encore vide ; null quand tout est noté jusqu'au
 * dîner (la carte propose alors les conseils du jour).
 */
export function creneauANoter(lignes: Array<{ creneau: Creneau }>, maintenant: Date): Creneau | null {
  const i = CRENEAUX_REPAS.indexOf(creneauDeLHeure(maintenant));
  return CRENEAUX_REPAS.slice(i).find((c) => !lignes.some((l) => l.creneau === c)) ?? null;
}

/**
 * Avec `maintenant`, le plan d'aujourd'hui ne propose que des repas encore à
 * venir : à 16 h, plus d'encas du matin ni de déjeuner (maquette v8).
 */
export function planFinDeJournee(e: EtatJour, aliments: Aliment[], maintenant?: Date): { lignes: LignePlan[]; total: number; manque: number } {
  const parCle = new Map(aliments.map((a) => [a.cle, a]));
  let total = protJour(e.lignes);
  const objectif = e.objectifs.proteines;
  const manque = objectif == null ? 0 : Math.max(0, Math.round(objectif - total));
  const lignes: LignePlan[] = [];
  if (objectif == null) return { lignes, total, manque };
  const depuis = maintenant && e.jour === e.aujourdhui ? CRENEAUX_REPAS.indexOf(creneauDeLHeure(maintenant)) : 0;
  for (const c of (["enc1", "dej", "enc2", "din"] as Creneau[]).filter((x) => CRENEAUX_REPAS.indexOf(x) >= depuis)) {
    if (total >= objectif) break;
    if (e.lignes.some((l) => l.creneau === c)) continue;
    const idee = PLAN[c];
    const a = idee ? parCle.get(idee.cle) : undefined;
    if (!idee || !a) continue;
    const g = idee.grammes ?? null;
    const prot = protAliment(a, g, 1);
    total += prot;
    lignes.push({ creneau: c, aliment: a, grammes: g, prot });
  }
  return { lignes, total, manque };
}

// ─── Côté coach : les 7 derniers jours, et ce qu'il faut en retenir ──────────
export interface JourCoach {
  jour: string;
  verres: number;
  boisson_club: boolean;
  activite: Activite | null;
  humeur: Humeur | null;
  /** `estime` : un plat hors catalogue, calculé par Noaly (pas de valeur officielle). */
  lignes: Array<{ creneau: Creneau; libelle: string; grammes: number | null; quantite: number; prot_g: number; origine: string; estime?: boolean }>;
}

export interface SemaineCoach {
  aujourdhui: string;
  objectifs: Objectifs;
  /** false = kcal masquées pour elle (réglage de la coach, bloc B, 9). */
  kcal_visibles?: boolean;
  jours: JourCoach[];
  remarque: Remarque | null;
}

const JOURS_SEMAINE = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"];

export function nomDuJour(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return JOURS_SEMAINE[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
}

export function jourRempli(j: JourCoach): boolean {
  return j.lignes.length > 0;
}

export interface Retenir {
  faible: boolean;
  icone: "proteines" | "eau" | "encas" | "vide";
  texte: string;
  gras: string;
}

/**
 * « À retenir » : ce que la coach lit en premier. Les jours passés remplis
 * seulement — aujourd'hui n'est pas fini, il ne compte pas.
 */
export function aRetenir(s: SemaineCoach, prenom: string): Retenir[] {
  const faits = s.jours.filter((j) => j.jour !== s.aujourdhui && jourRempli(j));
  const vides = s.jours.filter((j) => j.jour !== s.aujourdhui && !jourRempli(j));
  const sortie: Retenir[] = [];
  const pluriel = (n: number) => (n > 1 ? "s" : "");
  if (!faits.length) {
    return [{ faible: false, icone: "vide", gras: "Rien de noté ces derniers jours", texte: `${prenom} n'a pas encore rempli son journal.` }];
  }
  const nb = faits.length;
  const obj = s.objectifs;
  if (obj.proteines != null) {
    const moy = Math.round(faits.reduce((a, j) => a + protJour(j.lignes), 0) / nb);
    const ok = faits.filter((j) => protJour(j.lignes) >= (obj.proteines ?? 0)).length;
    sortie.push({ faible: ok < nb / 2, icone: "proteines", gras: `Protéines : ${moy} g en moyenne`, texte: `objectif atteint ${ok} jour${pluriel(ok)} sur ${nb}` });
  }
  const moyE = faits.reduce((a, j) => a + litres(j.verres, j.boisson_club), 0) / nb;
  const okE = faits.filter((j) => eauAtteinte(obj.eau_l, j.verres, j.boisson_club)).length;
  sortie.push({ faible: okE < nb / 2, icone: "eau", gras: `Eau : ${formatLitres(moyE)} L en moyenne`, texte: `objectif atteint ${okE} jour${pluriel(okE)} sur ${nb}` });
  const encAm = faits.filter((j) => j.lignes.some((l) => l.creneau === "enc2")).length;
  sortie.push(
    encAm === 0
      ? { faible: true, icone: "encas", gras: "Encas de l'après-midi : jamais noté", texte: "c'est souvent là qu'on décroche" }
      : { faible: false, icone: "encas", gras: `Encas de l'après-midi`, texte: `noté ${encAm} jour${pluriel(encAm)} sur ${nb}` },
  );
  if (vides.length) {
    const noms = vides.map((j) => nomDuJour(j.jour));
    const liste = noms.length > 1 ? `${noms.slice(0, -1).join(", ")} et ${noms[noms.length - 1]}` : noms[0];
    sortie.push({ faible: false, icone: "vide", gras: "", texte: `Rien de noté ${liste}` });
  }
  return sortie;
}
