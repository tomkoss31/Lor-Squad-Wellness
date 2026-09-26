// =============================================================================
// « Ma caisse » — ce que la coach en caisse a vendu et gagné (lot 3, 26/09/2026).
//
// La règle de Thomas : elle vend au prix du club ce qu'elle a acheté sur sa
// plateforme avec SA remise (25, 35, 42 ou 50 % selon son rang). Sur une unité :
//   gagné = prix du club − prix public de l'unité × (1 − sa remise).
// Le prix public et les PV d'une unité viennent du catalogue de l'app :
//   · un produit avec sa référence et ses portions (sachet F1 = pot de 550 g / 21) ;
//   · sinon ses doses de la recette du club (packs, grand thé-aloé, shake à emporter) ;
//   · sinon on ne sait pas (accessoires…) : compté dans le vendu, jamais dans le gagné.
// Fonctions PURES : la base ne rend que les faits (`club_ma_caisse`).
// =============================================================================

import { getProductByRef } from "../../../data/herbalifeCatalog";
import { pvProductCatalog } from "../../../data/pvCatalog";
import { PV_TO_EUR_RATIO, tierPctForRank } from "../../../lib/herbalifeFormulas";
import { RECETTE_CLUB } from "../data/bbcClubPrices";
import { lireAchats, type Achat, type LigneVendue } from "./caisse";
import { DOSES, jourParis, lireDoses, type Dose, type Doses } from "./maison";

/** Les références que le catalogue public n'a pas : leur fiche dans pvCatalog. */
const HORS_CATALOGUE: Record<string, string> = { "076K": "collagene-skin-booster" };

/** Une dose de la recette du club vient de ce contenant (F1 26 g, PDM 14 g, thé 1,7 g, aloé 10 ml). */
const REF_DE_DOSE: Record<Dose, string> = { f1: "4466", pdm: "2600", the: "178K", aloe: "0006" };

export interface ValeurUnite {
  /** Le prix public Herbalife d'une unité vendue. */
  publicUnite: number;
  /** Ses PV. */
  pvUnite: number;
}

export interface BaseProduit {
  ref: string | null;
  portions: number | null;
  maison: Doses | null;
  recette: Doses | null;
}

/** Le prix public et les PV d'un contenant, par sa référence Herbalife. */
export function contenant(ref: string): { publicPrice: number; pv: number } | null {
  const p = getProductByRef(ref);
  if (p) return { publicPrice: p.publicPrice, pv: p.pv };
  const id = HORS_CATALOGUE[ref];
  const q = id ? pvProductCatalog.find((x) => x.id === id) : undefined;
  return q ? { publicPrice: q.pricePublic, pv: q.pv } : null;
}

/** Une dose de la recette du club, au prix public et en PV. */
export function valeurDose(k: Dose): ValeurUnite | null {
  const ref = REF_DE_DOSE[k];
  const ingredient = RECETTE_CLUB.find((i) => i.ref === ref);
  const c = contenant(ref);
  if (!ingredient || !c || ingredient.doses <= 0) return null;
  return { publicUnite: c.publicPrice / ingredient.doses, pvUnite: c.pv / ingredient.doses };
}

/** Ce que vaut UNE unité vendue. null = on ne sait pas (accessoires, produit hors catalogue). */
export function valeurUnite(b: BaseProduit): ValeurUnite | null {
  if (b.ref && b.portions && b.portions > 0) {
    const c = contenant(b.ref);
    if (c) return { publicUnite: c.publicPrice / b.portions, pvUnite: c.pv / b.portions };
  }
  const doses = b.recette ?? b.maison;
  if (!doses) return null;
  let publicUnite = 0;
  let pvUnite = 0;
  for (const k of DOSES) {
    const n = doses[k] ?? 0;
    if (n <= 0) continue;
    const v = valeurDose(k);
    if (!v) return null;
    publicUnite += v.publicUnite * n;
    pvUnite += v.pvUnite * n;
  }
  return publicUnite > 0 ? { publicUnite, pvUnite } : null;
}

/** Sa remise, d'après son rang (`users.current_rank`) : 25, 35, 42 ou 50. */
export function remiseDuRang(rang: string | null | undefined): number {
  return tierPctForRank(rang);
}

export interface TotalCaisse {
  vendu: number;
  gagne: number;
  pv: number;
  /** Les articles vendus dont on ne connaît pas le coût (dans le vendu, pas dans le gagné). */
  sansCout: number;
}

/** Vendu, gagné et PV d'une liste de ventes, au centime. */
export function totalVentes(ventes: readonly Achat[], valeurs: ReadonlyMap<string, ValeurUnite | null>, remisePct: number): TotalCaisse {
  let vendu = 0;
  let gagne = 0;
  let pv = 0;
  let sansCout = 0;
  const partAchat = 1 - remisePct / 100;
  for (const v of ventes) {
    for (const l of v.lignes) {
      const prix = Math.round(l.prix * 100);
      vendu += prix * l.qte;
      const val = valeurs.get(l.carteId) ?? null;
      if (!val) {
        sansCout += l.qte;
        continue;
      }
      gagne += (prix - Math.round(val.publicUnite * partAchat * 100)) * l.qte;
      pv += val.pvUnite * l.qte;
    }
  }
  return { vendu: vendu / 100, gagne: gagne / 100, pv: Math.round(pv * 10) / 10, sansCout };
}

export interface MembreDuJour {
  cle: string;
  membre: string;
  resume: string;
  total: number;
}

/** « Mélanie P. · 5 × Formula 1, Grand thé-aloé · 39,70 € » : ses achats du jour, réunis. */
export function parMembre(ventes: readonly VenteMaCaisse[]): MembreDuJour[] {
  const groupes = new Map<string, { membre: string; lignes: Map<string, LigneVendue>; total: number; premier: string }>();
  for (const v of ventes) {
    const cle = v.clientId ?? `vente:${v.id}`;
    const g = groupes.get(cle) ?? { membre: v.membre || "Sans fiche", lignes: new Map(), total: 0, premier: v.quand };
    g.total = Math.round((g.total + v.total) * 100) / 100;
    for (const l of v.lignes) {
      const deja = g.lignes.get(l.carteId);
      g.lignes.set(l.carteId, deja ? { ...deja, qte: deja.qte + l.qte } : { ...l });
    }
    if (v.quand < g.premier) g.premier = v.quand;
    groupes.set(cle, g);
  }
  return [...groupes.entries()]
    .sort((a, b) => a[1].premier.localeCompare(b[1].premier))
    .map(([cle, g]) => ({
      cle,
      membre: g.membre,
      resume: [...g.lignes.values()].map((l) => (l.qte > 1 ? `${l.qte} × ${l.nom}` : l.nom)).join(", "),
      total: g.total,
    }));
}

export interface VenteMaCaisse extends Achat {
  clientId: string | null;
  membre: string;
}

export interface DonneesMaCaisse {
  mois: string;
  rang: string | null;
  valeurs: Map<string, ValeurUnite | null>;
  ventes: VenteMaCaisse[];
}

/** Relit `club_ma_caisse` sans jamais planter. */
export function lireMaCaisse(brut: unknown): DonneesMaCaisse {
  const o = (brut && typeof brut === "object" ? brut : {}) as Record<string, unknown>;
  const valeurs = new Map<string, ValeurUnite | null>();
  for (const x of Array.isArray(o.carte) ? o.carte : []) {
    if (!x || typeof x !== "object") continue;
    const k = x as Record<string, unknown>;
    if (typeof k.id !== "string") continue;
    const portions = Number(k.portions);
    valeurs.set(
      k.id,
      valeurUnite({
        ref: typeof k.ref === "string" && k.ref.trim() ? k.ref.trim() : null,
        portions: Number.isFinite(portions) && portions > 0 ? portions : null,
        maison: lireDoses(k.maison),
        recette: lireDoses(k.recette),
      }),
    );
  }
  const brutes = Array.isArray(o.ventes) ? o.ventes : [];
  const achats = lireAchats(brutes);
  const ventes: VenteMaCaisse[] = achats.map((a) => {
    const r = (brutes.find((b) => b && typeof b === "object" && (b as Record<string, unknown>).id === a.id) ?? {}) as Record<string, unknown>;
    return { ...a, clientId: typeof r.client_id === "string" ? r.client_id : null, membre: typeof r.membre === "string" ? r.membre : "" };
  });
  return {
    mois: typeof o.mois === "string" ? o.mois : "",
    rang: typeof o.rang === "string" ? o.rang : null,
    valeurs,
    ventes,
  };
}

/** Les ventes d'aujourd'hui (heure de Paris). */
export function ventesDuJour(ventes: readonly VenteMaCaisse[], aujourdhui: string): VenteMaCaisse[] {
  return ventes.filter((v) => {
    const d = new Date(v.quand);
    return !Number.isNaN(d.getTime()) && jourParis(d) === aujourdhui;
  });
}

const MOIS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];

/** « Septembre » depuis « 2026-09 ». */
export function nomDuMois(mois: string): string {
  const m = Number(mois.slice(5, 7));
  const nom = MOIS[m - 1] ?? "";
  return nom ? nom[0].toUpperCase() + nom.slice(1) : "";
}

// =============================================================================
// Lot 4 (26/09) : « Ce qui reste au club » — le mois du club, pour le propriétaire.
// Maquette v3, écran 5 : cartes encaissées − produits servis + vos ventes + écarts.
// L'écart d'une coach = ses PV vendus × (50 % − sa remise) × 1,78 € : ce que
// Herbalife verse à sa lignée, estimé (le vrai montant arrive dans Bizworks).
// =============================================================================

export interface VendeurClub {
  id: string;
  prenom: string;
  rang: string | null;
  /** Le propriétaire ou un admin : ses ventes sont « vos ventes », pas un écart. */
  proprio: boolean;
}

export interface VenteClub extends Achat {
  vendeurId: string;
}

export interface DonneesRentabilite {
  mois: string;
  cartes: Array<{ type: number; prix: number | null }>;
  visites: number;
  valeurs: Map<string, ValeurUnite | null>;
  ventes: VenteClub[];
  vendeurs: VendeurClub[];
}

/** Relit `club_rentabilite`. null : pas le propriétaire (la base ne rend rien). */
export function lireRentabilite(brut: unknown): DonneesRentabilite | null {
  if (!brut || typeof brut !== "object") return null;
  const o = brut as Record<string, unknown>;
  const base = lireMaCaisse({ mois: o.mois, carte: o.carte, ventes: o.ventes });
  const brutes = Array.isArray(o.ventes) ? o.ventes : [];
  const ventes: VenteClub[] = base.ventes.map((v) => {
    const r = (brutes.find((b) => b && typeof b === "object" && (b as Record<string, unknown>).id === v.id) ?? {}) as Record<string, unknown>;
    return { ...v, vendeurId: typeof r.vendeur_id === "string" ? r.vendeur_id : "" };
  });
  const cartes = (Array.isArray(o.cartes) ? o.cartes : [])
    .map((c) => (c && typeof c === "object" ? (c as Record<string, unknown>) : null))
    .filter((c): c is Record<string, unknown> => c !== null && Number.isFinite(Number(c.type)))
    .map((c) => {
      const prix = c.prix == null ? NaN : Number(c.prix);
      return { type: Number(c.type), prix: Number.isFinite(prix) ? prix : null };
    });
  const vendeurs = (Array.isArray(o.vendeurs) ? o.vendeurs : [])
    .map((v) => (v && typeof v === "object" ? (v as Record<string, unknown>) : null))
    .filter((v): v is Record<string, unknown> => v !== null && typeof v.id === "string")
    .map((v) => ({
      id: v.id as string,
      prenom: typeof v.prenom === "string" && v.prenom ? v.prenom : "Coach",
      rang: typeof v.rang === "string" ? v.rang : null,
      proprio: v.proprio === true,
    }));
  const visites = Number(o.visites);
  return { mois: base.mois, cartes, visites: Number.isFinite(visites) ? visites : 0, valeurs: base.valeurs, ventes, vendeurs };
}

export interface EcartCoach {
  id: string;
  prenom: string;
  remise: number;
  pv: number;
  ecart: number;
}

export interface Rentabilite {
  cartes: { total: number; nb10: number; nb30: number; autres: number; estimees: number };
  visites: number;
  /** Visites × coût d'une visite ; null tant que la recette n'est pas complète. */
  produitsServis: number | null;
  vosVentes: { vendu: number; gagne: number; prenoms: string[] };
  ecarts: EcartCoach[];
  totalEcarts: number;
  /** Ce qui reste au club avant loyer et charges ; null sans coût de visite. */
  reste: number | null;
}

const cents = (n: number) => Math.round(n * 100) / 100;

/**
 * Le mois du club. Une carte sans prix enregistré prend le tarif du club
 * (`prixCartes`) et compte dans `estimees`. Une vendeuse à 50 % qui n'est pas
 * propriétaire ne donne pas d'écart : elle garde ses gains, le club n'y touche pas.
 */
export function rentabiliteDuMois(
  d: DonneesRentabilite,
  coutVisite: number | null,
  prixCartes: Partial<Record<"10" | "30", number | null>>,
): Rentabilite {
  let total = 0;
  let nb10 = 0;
  let nb30 = 0;
  let autres = 0;
  let estimees = 0;
  for (const c of d.cartes) {
    if (c.type === 10) nb10 += 1;
    else if (c.type === 30) nb30 += 1;
    else autres += 1;
    const tarif = c.type === 10 || c.type === 30 ? prixCartes[String(c.type) as "10" | "30"] ?? null : null;
    if (c.prix != null) total += c.prix;
    else if (tarif != null) {
      total += tarif;
      estimees += 1;
    }
  }

  const parVendeuse = new Map<string, VenteClub[]>();
  for (const v of d.ventes) parVendeuse.set(v.vendeurId, [...(parVendeuse.get(v.vendeurId) ?? []), v]);

  let vendu = 0;
  let gagne = 0;
  const prenoms: string[] = [];
  const ecarts: EcartCoach[] = [];
  for (const vendeuse of d.vendeurs) {
    const ventes = parVendeuse.get(vendeuse.id) ?? [];
    if (!ventes.length) continue;
    const remise = remiseDuRang(vendeuse.rang);
    const t = totalVentes(ventes, d.valeurs, remise);
    if (vendeuse.proprio) {
      vendu += t.vendu;
      gagne += t.gagne;
      prenoms.push(vendeuse.prenom);
    } else if (remise < 50) {
      ecarts.push({ id: vendeuse.id, prenom: vendeuse.prenom, remise, pv: t.pv, ecart: cents((t.pv * (50 - remise) * PV_TO_EUR_RATIO) / 100) });
    }
  }
  ecarts.sort((a, b) => b.ecart - a.ecart);
  const totalEcarts = cents(ecarts.reduce((s, e) => s + e.ecart, 0));
  const produitsServis = coutVisite != null ? cents(d.visites * coutVisite) : null;
  const vosVentes = { vendu: cents(vendu), gagne: cents(gagne), prenoms };
  return {
    cartes: { total: cents(total), nb10, nb30, autres, estimees },
    visites: d.visites,
    produitsServis,
    vosVentes,
    ecarts,
    totalEcarts,
    reste: produitsServis == null ? null : cents(total - produitsServis + vosVentes.gagne + totalEcarts),
  };
}
