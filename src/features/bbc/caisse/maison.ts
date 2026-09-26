// =============================================================================
// « À la maison » — la logique, sans écran (lot 2 du comptoir, 26/09/2026).
//
// La règle de Thomas (maquette v3) : « si elle ne note rien, l'app compte un
// sachet par jour sans club ». Un jour où elle est pointée, elle a eu son shake
// au club ; un jour sans pointage, elle en a pris un chez elle — une dose de
// chaque produit qu'elle a (F1, PDM, thé, aloé). Barres et chips ne comptent
// pas : ce qui dure seulement (colonne `maison` de la carte).
// La base ne rend que les faits (`club_maison`, `club_caisse`) : ce qu'elle a
// emporté, en doses et par jour, et ses jours au club.
// =============================================================================

import { horairesDuJour, jourDe, type ReglagesHoraires } from "../agenda/agendaClub";
import type { Panier, ProduitCarte } from "./caisse";

export type Dose = "f1" | "pdm" | "the" | "aloe";
export const DOSES: readonly Dose[] = ["f1", "pdm", "the", "aloe"];

export type Doses = Partial<Record<Dose, number>>;

export interface AchatMaison {
  /** AAAA-MM-JJ, heure de Paris. */
  jour: string;
  doses: Doses;
}

/** Ce que la base sait d'UNE membre : ce qu'elle a emporté et ses jours au club. */
export interface DonneesMaison {
  achats: AchatMaison[];
  visites: string[];
}

export interface JourSansClub {
  jour: string;
  auClub: boolean;
}

export interface StockMaison {
  /** Le jour de son dernier achat « à la maison ». */
  depuis: string;
  /** Ce qu'il lui reste, en doses. */
  restant: Record<Dose, number>;
  /** Ce qu'elle avait juste après ce dernier achat (reste d'avant compris). */
  sur: Record<Dose, number>;
  /** Les jours depuis cet achat (les 7 derniers), et aujourd'hui s'il est pointé. */
  jours: JourSansClub[];
  /** Les jours sans club depuis cet achat. */
  joursSansClub: number;
}

const JOUR_MS = 86_400_000;

/** « 2026-09-26 » à l'heure de Paris — la clé d'un jour, quel que soit le fuseau de l'appareil. */
export function jourParis(d: Date): string {
  return new Intl.DateTimeFormat("fr-CA", { timeZone: "Europe/Paris", year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
}

function lendemain(cle: string, n = 1): string {
  return new Date(Date.parse(`${cle}T00:00:00Z`) + n * JOUR_MS).toISOString().slice(0, 10);
}

function ecartJours(de: string, a: string): number {
  return Math.round((Date.parse(`${a}T00:00:00Z`) - Date.parse(`${de}T00:00:00Z`)) / JOUR_MS);
}

function zero(): Record<Dose, number> {
  return { f1: 0, pdm: 0, the: 0, aloe: 0 };
}

function estJour(v: unknown): v is string {
  return typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v);
}

/** Les doses d'un objet `maison` (`{"f1": 1}`), sans jamais planter. */
export function lireDoses(brut: unknown): Doses | null {
  if (!brut || typeof brut !== "object" || Array.isArray(brut)) return null;
  const o = brut as Record<string, unknown>;
  const d: Doses = {};
  for (const k of DOSES) {
    const n = Number(o[k]);
    if (Number.isFinite(n) && n > 0) d[k] = n;
  }
  return Object.keys(d).length ? d : null;
}

/** Relit une membre de `club_maison` / la `maison` de `club_caisse`. */
export function lireMaison(brut: unknown): DonneesMaison | null {
  if (!brut || typeof brut !== "object") return null;
  const o = brut as Record<string, unknown>;
  const achats = (Array.isArray(o.achats) ? o.achats : [])
    .map((a) => (a && typeof a === "object" ? (a as Record<string, unknown>) : null))
    .filter((a): a is Record<string, unknown> => a !== null && estJour(a.jour))
    .map((a) => ({ jour: a.jour as string, doses: lireDoses(a.doses) ?? {} }))
    .filter((a) => Object.keys(a.doses).length > 0);
  if (!achats.length) return null;
  return { achats, visites: (Array.isArray(o.visites) ? o.visites : []).filter(estJour) };
}

/** Relit les horaires du club (`settings.discovery` : hours, hours_by_date, holidays). */
export function lireHoraires(brut: unknown): ReglagesHoraires | null {
  if (!brut || typeof brut !== "object") return null;
  const o = brut as Record<string, unknown>;
  const objet = (v: unknown) => (v && typeof v === "object" && !Array.isArray(v) ? (v as ReglagesHoraires["hours"]) : null);
  return {
    hours: objet(o.hours),
    hours_by_date: objet(o.hours_by_date),
    holidays: Array.isArray(o.holidays) ? o.holidays.filter((x): x is string => typeof x === "string") : null,
  };
}

/** Relit `club_maison()` : les horaires, et chaque membre qui a emporté quelque chose. */
export function lireMaisonClub(brut: unknown): { horaires: ReglagesHoraires | null; membres: Map<string, DonneesMaison> } {
  const o = (brut && typeof brut === "object" ? brut : {}) as Record<string, unknown>;
  const membres = new Map<string, DonneesMaison>();
  for (const m of Array.isArray(o.membres) ? o.membres : []) {
    const id = m && typeof m === "object" ? (m as Record<string, unknown>).client_id : null;
    const d = lireMaison(m);
    if (typeof id === "string" && d) membres.set(id, d);
  }
  return { horaires: lireHoraires(o.horaires), membres };
}

/**
 * Ce qu'elle a à la maison aujourd'hui. On déroule les jours depuis son premier
 * achat : un achat ajoute ses doses ; un jour passé SANS pointage retire une dose
 * de chaque produit qu'elle a (jamais sous zéro). Aujourd'hui ne retire rien :
 * la journée n'est pas finie. null si elle n'a rien emporté.
 */
export function stockMaison(d: DonneesMaison | null, aujourdhui: string): StockMaison | null {
  if (!d || !d.achats.length) return null;
  const achats = [...d.achats].filter((a) => a.jour <= aujourdhui).sort((a, b) => a.jour.localeCompare(b.jour));
  if (!achats.length) return null;
  const parJour = new Map<string, Doses>();
  for (const a of achats) {
    const cumul = parJour.get(a.jour) ?? {};
    for (const k of DOSES) if (a.doses[k]) cumul[k] = (cumul[k] ?? 0) + (a.doses[k] ?? 0);
    parJour.set(a.jour, cumul);
  }
  const visites = new Set(d.visites);
  const depuis = achats[achats.length - 1].jour;
  const stock = zero();
  let sur = zero();
  for (let j = achats[0].jour; j <= aujourdhui; j = lendemain(j)) {
    const ajout = parJour.get(j);
    if (ajout) {
      for (const k of DOSES) stock[k] += ajout[k] ?? 0;
      if (j === depuis) sur = { ...stock };
    }
    if (j < aujourdhui && !visites.has(j)) {
      for (const k of DOSES) stock[k] = Math.max(0, stock[k] - 1);
    }
  }
  if (DOSES.every((k) => sur[k] <= 0)) return null;

  const jours: JourSansClub[] = [];
  let joursSansClub = 0;
  for (let j = lendemain(depuis); j < aujourdhui; j = lendemain(j)) {
    const auClub = visites.has(j);
    if (!auClub) joursSansClub += 1;
    jours.push({ jour: j, auClub });
  }
  if (depuis < aujourdhui && visites.has(aujourdhui)) jours.push({ jour: aujourdhui, auClub: true });
  return { depuis, restant: stock, sur, jours: jours.slice(-7), joursSansClub };
}

/** Le club a-t-il des horaires réglés ? Sans eux, on ne dit jamais « fermé ». */
function horairesConnus(h: ReglagesHoraires | null | undefined): boolean {
  return !!h?.hours && Object.values(h.hours).some((p) => Array.isArray(p) && p.length > 0);
}

/**
 * Les jours fermés qui suivent aujourd'hui, à la suite (demain, après-demain…),
 * d'après la règle du tunnel public (`horairesDuJour`). [] si demain est ouvert,
 * ou si le club n'a pas d'horaires.
 */
export function joursFermesApres(horaires: ReglagesHoraires | null | undefined, aujourdhui: string, max = 10): string[] {
  if (!horairesConnus(horaires)) return [];
  const fermes: string[] = [];
  for (let j = lendemain(aujourdhui); fermes.length < max; j = lendemain(j)) {
    if (horairesDuJour(horaires, j).etat === "ouvert") break;
    fermes.push(j);
  }
  return fermes;
}

/** Le premier jour fermé dans les `dans` prochains jours (demain compris), ou null. */
export function prochaineFermeture(horaires: ReglagesHoraires | null | undefined, aujourdhui: string, dans = 2): string | null {
  if (!horairesConnus(horaires)) return null;
  for (let n = 1; n <= dans; n += 1) {
    const j = lendemain(aujourdhui, n);
    if (horairesDuJour(horaires, j).etat !== "ouvert") return j;
  }
  return null;
}

const JOURS = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"];

/** « dimanche », ou « lundi 2 novembre » quand c'est à plus d'une semaine. */
export function nomDuJour(cle: string, aujourdhui?: string): string {
  const d = jourDe(cle);
  const nom = JOURS[d.getDay()];
  if (aujourdhui && ecartJours(aujourdhui, cle) >= 7) {
    return `${nom} ${d.toLocaleDateString("fr-FR", { day: "numeric", month: "long" })}`;
  }
  return nom;
}

/** « aujourd'hui », « hier », « vendredi », « le 12 septembre ». */
export function depuisLisible(jour: string, aujourdhui: string): string {
  const ecart = ecartJours(jour, aujourdhui);
  if (ecart <= 0) return "aujourd'hui";
  if (ecart === 1) return "hier";
  if (ecart < 7) return nomDuJour(jour);
  return `le ${jourDe(jour).toLocaleDateString("fr-FR", { day: "numeric", month: "long" })}`;
}

/** « sam. » — le jour en trois lettres, pour la rangée des jours. */
export function jourCourt(cle: string): string {
  return jourDe(cle).toLocaleDateString("fr-FR", { weekday: "short" });
}

/** « Club fermé samedi et dimanche, elle revient lundi. » — null si demain est ouvert. */
export function phraseFermeture(fermes: readonly string[], aujourdhui: string): string | null {
  if (!fermes.length) return null;
  const retour = nomDuJour(lendemain(fermes[fermes.length - 1]), aujourdhui);
  const quand =
    fermes.length === 1
      ? nomDuJour(fermes[0], aujourdhui)
      : fermes.length === 2
        ? `${nomDuJour(fermes[0], aujourdhui)} et ${nomDuJour(fermes[1], aujourdhui)}`
        : `${fermes.length} jours`;
  return `Club fermé ${quand}, elle revient ${retour}.`;
}

/** « 3 F1 · 4 doses de PDM » — ce qu'elle a, pour une phrase. */
export function resumeStock(r: Partial<Record<Dose, number>>): string {
  const morceaux: string[] = [];
  if ((r.f1 ?? 0) > 0) morceaux.push(`${r.f1} F1`);
  if ((r.pdm ?? 0) > 0) morceaux.push(`${r.pdm} dose${(r.pdm ?? 0) > 1 ? "s" : ""} de PDM`);
  if ((r.the ?? 0) > 0) morceaux.push(`${r.the} thé${(r.the ?? 0) > 1 ? "s" : ""}`);
  if ((r.aloe ?? 0) > 0) morceaux.push(`${r.aloe} dose${(r.aloe ?? 0) > 1 ? "s" : ""} d'aloé`);
  return morceaux.join(" · ");
}

/** Le produit « à l'unité » d'une sorte : un sachet qui ne contient qu'elle (F1, PDM, Thermo). */
function sachetDe(carte: readonly ProduitCarte[], k: Dose): ProduitCarte | null {
  const candidats = carte.filter((p) => {
    if (!p.actif || p.sorte !== "emporter" || !p.maison) return false;
    const cles = Object.keys(p.maison) as Dose[];
    return cles.length === 1 && cles[0] === k && (p.maison[k] ?? 0) > 0;
  });
  candidats.sort((a, b) => (a.maison?.[k] ?? 0) - (b.maison?.[k] ?? 0) || a.ordre - b.ordre);
  return candidats[0] ?? null;
}

/**
 * De quoi tenir les jours fermés : un shake par jour. Le F1 toujours ; le PDM et le
 * thé seulement si elle en prend déjà (on propose, on n'invente pas d'habitude).
 * L'aloé (un flacon de 47 doses) n'est jamais proposé pour un week-end.
 */
export function deQuoiTenir(joursFermes: number, stock: StockMaison | null, carte: readonly ProduitCarte[]): Panier {
  const panier: Panier = {};
  if (joursFermes <= 0) return panier;
  for (const k of ["f1", "pdm", "the"] as const) {
    if (k !== "f1" && !((stock?.sur[k] ?? 0) > 0)) continue;
    const besoin = joursFermes - (stock?.restant[k] ?? 0);
    if (besoin <= 0) continue;
    const sachet = sachetDe(carte, k);
    const parSachet = sachet?.maison?.[k] ?? 0;
    if (!sachet || parSachet <= 0) continue;
    panier[sachet.id] = Math.ceil(besoin / parSachet);
  }
  return panier;
}

export interface SuggestionPack {
  pack: ProduitCarte;
  /** Ce que le pack coûte de plus que les lignes qu'il remplace (peut être négatif). */
  supplement: number;
  /** « 1 F1 et 6 thés » : ce qu'elle a en plus avec le pack. */
  enPlus: string;
  /** Les lignes du panier que le pack remplace. */
  remplace: string[];
}

/**
 * Le pack 6 jours, quand le panier y ressemble déjà (4 F1 ou plus, en sachets) et
 * qu'il ne coûte pas plus de 40 % de son prix en plus. Le pack doit couvrir tout
 * ce qu'il remplace ; le moins cher des packs qui conviennent gagne.
 */
export function suggestionPack(panier: Panier, carte: readonly ProduitCarte[]): SuggestionPack | null {
  const produits = new Map(carte.map((p) => [p.id, p]));
  const dosesPanier = zero();
  const sachets: ProduitCarte[] = [];
  for (const [id, qte] of Object.entries(panier)) {
    const p = produits.get(id);
    if (!p || !p.maison || p.sorte !== "emporter") continue;
    const cles = Object.keys(p.maison) as Dose[];
    if (cles.length !== 1 || cles[0] === "aloe") continue;
    dosesPanier[cles[0]] += (p.maison[cles[0]] ?? 0) * qte;
    sachets.push(p);
  }
  if (dosesPanier.f1 < 4) return null;

  let meilleure: SuggestionPack | null = null;
  for (const pack of carte) {
    if (!pack.actif || pack.sorte !== "emporter" || !pack.maison || (pack.maison.f1 ?? 0) < 6) continue;
    const couvre = (["f1", "pdm", "the"] as const).every((k) => dosesPanier[k] <= (pack.maison?.[k] ?? 0));
    if (!couvre) continue;
    const remplace = sachets.filter((p) => Object.keys(p.maison ?? {}).every((k) => (pack.maison?.[k as Dose] ?? 0) > 0));
    const centimes = remplace.reduce((s, p) => s + Math.round(p.prix * 100) * (panier[p.id] ?? 0), 0);
    const supplement = (Math.round(pack.prix * 100) - centimes) / 100;
    if (supplement > pack.prix * 0.4) continue;
    const morceaux: string[] = [];
    const plusF1 = (pack.maison.f1 ?? 0) - dosesPanier.f1;
    const plusThe = (pack.maison.the ?? 0) - dosesPanier.the;
    const plusPdm = (pack.maison.pdm ?? 0) - dosesPanier.pdm;
    if (plusF1 > 0) morceaux.push(`${plusF1} F1`);
    if (plusThe > 0) morceaux.push(`${plusThe} thé${plusThe > 1 ? "s" : ""}`);
    if (plusPdm > 0) morceaux.push(`${plusPdm} dose${plusPdm > 1 ? "s" : ""} de PDM`);
    // Rien de plus, et pas moins cher : aucune raison de le proposer.
    if (!morceaux.length && supplement >= 0) continue;
    const enPlus = morceaux.length > 1 ? `${morceaux.slice(0, -1).join(", ")} et ${morceaux[morceaux.length - 1]}` : morceaux[0] ?? "";
    const s: SuggestionPack = { pack, supplement, enPlus, remplace: remplace.map((p) => p.id) };
    if (!meilleure || s.supplement < meilleure.supplement) meilleure = s;
  }
  return meilleure;
}

/** Remplace les lignes couvertes par le pack. */
export function passerAuPack(panier: Panier, s: SuggestionPack): Panier {
  const suivant: Panier = { ...panier };
  for (const id of s.remplace) delete suivant[id];
  suivant[s.pack.id] = (suivant[s.pack.id] ?? 0) + 1;
  return suivant;
}

/** « De quoi tenir » ajouté au panier : jamais en double si la coach l'a déjà mis. */
export function ajouterDeQuoiTenir(panier: Panier, tenir: Panier): Panier {
  const suivant: Panier = { ...panier };
  for (const [id, qte] of Object.entries(tenir)) suivant[id] = Math.max(suivant[id] ?? 0, qte);
  return suivant;
}

/** Le panier contient-il déjà de quoi tenir ? */
export function tenirDejaAuPanier(panier: Panier, tenir: Panier): boolean {
  const ids = Object.keys(tenir);
  return ids.length > 0 && ids.every((id) => (panier[id] ?? 0) >= (tenir[id] ?? 0));
}

/**
 * La 9e règle de Contacter : « son F1 arrive au bout ». Elle a emporté du F1 ces
 * 30 derniers jours, il lui en reste 1 ou 0, et le club ferme demain ou
 * après-demain — l'appeler avant, pour qu'elle passe en prendre.
 */
export function f1AuBout(
  d: DonneesMaison | null,
  horaires: ReglagesHoraires | null | undefined,
  aujourdhui: string,
): { reste: number; ferme: string } | null {
  const stock = stockMaison(d, aujourdhui);
  if (!stock || stock.sur.f1 <= 0 || stock.restant.f1 > 1) return null;
  if (ecartJours(stock.depuis, aujourdhui) > 30) return null;
  const ferme = prochaineFermeture(horaires, aujourdhui, 2);
  return ferme ? { reste: stock.restant.f1, ferme } : null;
}
