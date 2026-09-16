// =============================================================================
// Les boîtes de contact — toute la logique, sans React ni Supabase.
//
// Elle vit à part pour être testée seule : l'écran n'a plus qu'à afficher ce que
// ces fonctions décident. C'est le même découpage que `perimetre.ts` et
// `etapeLead.ts` — une règle écrite une fois, jamais recopiée dans une vue.
// =============================================================================

/** Au-delà, une boîte posée passe « à relever ». 4 semaines = le rythme réel. */
export const JOURS_AVANT_RELEVE = 28;

/** Une boîte qui n'a rien rapporté depuis ce délai est un emplacement mort. */
export const JOURS_SANS_RIEN = 42;

export type EtatBoite = "a_relever" | "posee" | "retiree";

export interface Boite {
  id: string;
  numero: number;
  commerce: string;
  ou: string | null;
  contactCommercant: string | null;
  ville: string | null;
  poseurUserId: string | null;
  poseurClientId: string | null;
  poseurNom: string;
  poseeLe: string;
  releveeLe: string | null;
  retireeLe: string | null;
}

export interface Coupon {
  id: string;
  boiteId: string;
  prenom: string;
  nom: string | null;
  ville: string | null;
  telephone: string;
  leadId: string | null;
  appeleLe: string | null;
  issue: IssueCoupon | null;
  saisiLe: string;
}

export type IssueCoupon = "rdv" | "sans_reponse" | "pas_interesse" | "demarre";

// ── Le temps ────────────────────────────────────────────────────────────────

/** Nombre de jours pleins entre deux instants. Négatif si `date` est à venir. */
export function joursDepuis(date: string | null | undefined, maintenantMs: number): number | null {
  if (!date) return null;
  const t = new Date(date).getTime();
  if (Number.isNaN(t)) return null;
  return Math.floor((maintenantMs - t) / 86_400_000);
}

/** « aujourd'hui » · « hier » · « il y a 6 j ». Jamais une date brute. */
export function ilYA(date: string | null | undefined, maintenantMs: number): string {
  const j = joursDepuis(date, maintenantMs);
  if (j === null) return "jamais";
  if (j <= 0) return "aujourd'hui";
  if (j === 1) return "hier";
  return `il y a ${j} j`;
}

// ── L'état d'une boîte ──────────────────────────────────────────────────────

/**
 * L'état d'une boîte.
 *
 * La relève ne se saisit pas : elle se déduit de la dernière fois qu'on a sorti
 * des coupons — ou, si on n'en a jamais sorti, de la pose. Sans ça, une boîte
 * posée et jamais touchée resterait « fraîche » pour toujours.
 */
export function etatBoite(b: Boite, maintenantMs: number): EtatBoite {
  if (b.retireeLe) return "retiree";
  const j = joursDepuis(b.releveeLe ?? b.poseeLe, maintenantMs);
  return j !== null && j >= JOURS_AVANT_RELEVE ? "a_relever" : "posee";
}

/** Un emplacement qui ne produit rien : posé depuis longtemps, zéro coupon. */
export function boiteMuette(b: Boite, nbCoupons: number, maintenantMs: number): boolean {
  if (b.retireeLe || nbCoupons > 0) return false;
  const j = joursDepuis(b.poseeLe, maintenantMs);
  return j !== null && j >= JOURS_SANS_RIEN;
}

/** La ligne sous le nom du commerce, dans la liste. */
export function sousTitreBoite(b: Boite, nbCoupons: number, maintenantMs: number): string {
  const qui = `posée par ${b.poseurNom}`;
  if (b.retireeLe) return `${qui} · retirée ${ilYA(b.retireeLe, maintenantMs)}`;
  if (boiteMuette(b, nbCoupons, maintenantMs)) return `${qui} · rien depuis la pose`;
  if (etatBoite(b, maintenantMs) === "a_relever") return `${qui} · à relever`;
  return b.releveeLe ? `${qui} · relevée ${ilYA(b.releveeLe, maintenantMs)}` : `${qui} · posée ${ilYA(b.poseeLe, maintenantMs)}`;
}

// ── Le tri : ce qui réclame une décision remonte ────────────────────────────

const RANG: Record<EtatBoite, number> = { a_relever: 0, posee: 1, retiree: 2 };

/** À relever d'abord, puis les vivantes par relève la plus ancienne, puis les retirées. */
export function trierBoites(boites: readonly Boite[], maintenantMs: number): Boite[] {
  return [...boites].sort((a, b) => {
    const ra = RANG[etatBoite(a, maintenantMs)];
    const rb = RANG[etatBoite(b, maintenantMs)];
    if (ra !== rb) return ra - rb;
    const ta = new Date(a.releveeLe ?? a.poseeLe).getTime();
    const tb = new Date(b.releveeLe ?? b.poseeLe).getTime();
    return ta - tb;
  });
}

// ── Ce qui fuit ─────────────────────────────────────────────────────────────

export interface Fuites {
  /** Coupons saisis, jamais appelés — du plus ancien au plus récent. */
  aAppeler: Coupon[];
  /** Ancienneté du plus vieux, en jours. */
  attenteMax: number;
  /** Boîtes à relever. */
  aRelever: Boite[];
}

/**
 * Ce que l'écran doit crier en haut de page — et rien d'autre.
 *
 * Les gens passent AVANT les boîtes : une personne à qui on a promis une
 * évaluation par écrit et que personne ne rappelle est la seule vraie promesse
 * de cet écran. Une boîte oubliée, elle, attend sans se plaindre.
 *
 * Un coupon dont l'issue est déjà tranchée n'attend plus personne, même si
 * `appeleLe` est resté vide — sinon la liste ne se viderait jamais.
 */
export function fuites(boites: readonly Boite[], coupons: readonly Coupon[], maintenantMs: number): Fuites {
  const aAppeler = coupons
    .filter((c) => !c.appeleLe && !c.issue)
    .sort((a, b) => new Date(a.saisiLe).getTime() - new Date(b.saisiLe).getTime());
  const aRelever = boites.filter((b) => etatBoite(b, maintenantMs) === "a_relever");
  return {
    aAppeler,
    attenteMax: aAppeler.length ? (joursDepuis(aAppeler[0].saisiLe, maintenantMs) ?? 0) : 0,
    aRelever,
  };
}

// ── L'entonnoir d'une boîte ─────────────────────────────────────────────────

export interface Entonnoir {
  coupons: number;
  joints: number;
  rdv: number;
  demarrages: number;
}

export function entonnoir(coupons: readonly Coupon[]): Entonnoir {
  return {
    coupons: coupons.length,
    joints: coupons.filter((c) => Boolean(c.appeleLe)).length,
    rdv: coupons.filter((c) => c.issue === "rdv" || c.issue === "demarre").length,
    demarrages: coupons.filter((c) => c.issue === "demarre").length,
  };
}

// ── Qui pose, qui récolte ───────────────────────────────────────────────────

export interface Poseur {
  cle: string;
  nom: string;
  estMembre: boolean;
  boites: number;
  coupons: number;
  demarrages: number;
}

/**
 * Le classement des poseurs.
 *
 * La clé est l'identifiant du poseur quand on l'a, son nom sinon : un poseur
 * retiré de l'équipe garde sa ligne du mois plutôt que de disparaître du
 * classement (le nom est figé en base à la pose, pour cette raison).
 */
export function classementPoseurs(boites: readonly Boite[], coupons: readonly Coupon[]): Poseur[] {
  const parBoite = new Map<string, Coupon[]>();
  for (const c of coupons) {
    const l = parBoite.get(c.boiteId) ?? [];
    l.push(c);
    parBoite.set(c.boiteId, l);
  }

  const par = new Map<string, Poseur>();
  for (const b of boites) {
    const cle = b.poseurClientId ?? b.poseurUserId ?? `nom:${b.poseurNom}`;
    const p = par.get(cle) ?? {
      cle,
      nom: b.poseurNom,
      estMembre: Boolean(b.poseurClientId),
      boites: 0,
      coupons: 0,
      demarrages: 0,
    };
    p.boites += 1;
    const siens = parBoite.get(b.id) ?? [];
    p.coupons += siens.length;
    p.demarrages += siens.filter((c) => c.issue === "demarre").length;
    par.set(cle, p);
  }

  return [...par.values()].sort(
    (a, b) => b.demarrages - a.demarrages || b.coupons - a.coupons || a.nom.localeCompare(b.nom),
  );
}

// ── Le numéro de la prochaine boîte ─────────────────────────────────────────

/**
 * Le plus petit numéro libre, jamais `max + 1`.
 *
 * Une boîte retirée rend son numéro : les bons pré-imprimés qui restent dans le
 * carton peuvent resservir. Et un numéro qui grimpe à l'infini finit par ne plus
 * tenir sur l'étiquette.
 */
export function prochainNumero(boites: readonly Boite[]): number {
  const pris = new Set(boites.filter((b) => !b.retireeLe).map((b) => b.numero));
  let n = 1;
  while (pris.has(n)) n += 1;
  return n;
}
