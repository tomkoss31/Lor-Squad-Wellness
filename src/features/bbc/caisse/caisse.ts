// =============================================================================
// La caisse du comptoir — la logique, sans écran (lot 1, 26/09/2026).
//
// Règles validées par Thomas (docs/REFLEXION_MONETISATION_2026-09.md) :
//   · la carte de visites, c'est le club ; tout ce qui s'ajoute (upgrades et
//     « à emporter ») vient des pots de la coach en caisse, payé sur SON
//     terminal — l'app n'encaisse rien, elle enregistre ;
//   · un seul prix par produit, fixé par le propriétaire dans Réglages.
// Les prix d'une vente sont relus en base par `club_vendre` : le panier
// n'envoie que des identifiants et des quantités.
// =============================================================================

import type { ReglagesHoraires } from "../agenda/agendaClub";
import { lireDoses, lireHoraires, lireMaison, type DonneesMaison, type Doses } from "./maison";

export type Rubrique = "petit_dej" | "supplement" | "encas" | "complement" | "h24" | "accessoire";
/** 'upgrade' = ajouté au shake du jour, sur place ; 'emporter' = part avec elle. */
export type Sorte = "emporter" | "upgrade";

export interface ProduitCarte {
  id: string;
  rubrique: Rubrique;
  nom: string;
  detail: string | null;
  prix: number;
  sorte: Sorte;
  ordre: number;
  actif: boolean;
  /** Ce qu'une unité met « à la maison », en doses (lot 2) : `{ f1: 1 }`, `{ pdm: 2 }`… null = rien qui dure. */
  maison?: Doses | null;
}

export interface Habituel {
  carteId: string;
  qte: number;
}

export interface DonneesCaisse {
  club: string | null;
  /** Le propriétaire du club (ou un admin) : lui seul change la carte. */
  modifiable: boolean;
  carte: ProduitCarte[];
  habituels: Habituel[];
  meilleures: string[];
  /** Les horaires du club, pour « club fermé demain » (lot 2). */
  horaires: ReglagesHoraires | null;
  /** Ce qu'elle a emporté et ses jours au club (lot 2). */
  maison: DonneesMaison | null;
}

export interface LigneVendue {
  carteId: string;
  nom: string;
  prix: number;
  qte: number;
  sorte: Sorte;
}

export interface Achat {
  id: string;
  quand: string;
  total: number;
  lignes: LigneVendue[];
  /** Le prénom de la coach qui a vendu. */
  vendeur: string;
  /** Le jour même, par celle qui a vendu, le propriétaire ou un admin. */
  annulable: boolean;
}

/** carte_id → quantité. Jamais de zéro : une ligne à 0 disparaît. */
export type Panier = Record<string, number>;

/** L'ordre du tableau du comptoir, et son vocabulaire. */
export const RUBRIQUES: ReadonlyArray<{ cle: Rubrique; titre: string }> = [
  { cle: "petit_dej", titre: "Petit déj" },
  { cle: "supplement", titre: "Suppléments sur place" },
  { cle: "encas", titre: "Encas" },
  { cle: "complement", titre: "Compléments" },
  { cle: "h24", titre: "H24" },
  { cle: "accessoire", titre: "Accessoires" },
];

const RUBRIQUES_CONNUES = new Set<string>(RUBRIQUES.map((r) => r.cle));
export const QTE_MAX = 99;

function nombre(v: unknown): number {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
}

function texte(v: unknown): string {
  return typeof v === "string" ? v : "";
}

/** Relit la réponse de `club_caisse` sans jamais planter sur une valeur inattendue. */
export function lireCaisse(brut: unknown): DonneesCaisse {
  const o = (brut && typeof brut === "object" ? brut : {}) as Record<string, unknown>;
  const carte = (Array.isArray(o.carte) ? o.carte : [])
    .map((x) => (x && typeof x === "object" ? (x as Record<string, unknown>) : null))
    .filter((x): x is Record<string, unknown> => x !== null && typeof x.id === "string" && RUBRIQUES_CONNUES.has(texte(x.rubrique)))
    .map<ProduitCarte>((x) => ({
      id: x.id as string,
      rubrique: x.rubrique as Rubrique,
      nom: texte(x.nom),
      detail: typeof x.detail === "string" && x.detail.trim() ? x.detail : null,
      prix: nombre(x.prix),
      sorte: x.sorte === "upgrade" ? "upgrade" : "emporter",
      ordre: nombre(x.ordre),
      actif: x.actif !== false,
      maison: lireDoses(x.maison),
    }));
  const habituels = (Array.isArray(o.habituels) ? o.habituels : [])
    .map((x) => (x && typeof x === "object" ? (x as Record<string, unknown>) : null))
    .filter((x): x is Record<string, unknown> => x !== null && typeof x.carte_id === "string")
    .map<Habituel>((x) => ({ carteId: x.carte_id as string, qte: Math.max(1, Math.min(QTE_MAX, Math.round(nombre(x.qte)) || 1)) }));
  const meilleures = (Array.isArray(o.meilleures) ? o.meilleures : []).filter((x): x is string => typeof x === "string");
  return {
    club: typeof o.club === "string" ? o.club : null,
    modifiable: o.modifiable === true,
    carte,
    habituels,
    meilleures,
    horaires: lireHoraires(o.horaires),
    maison: lireMaison(o.maison),
  };
}

/** Relit la réponse de `club_achats`. */
export function lireAchats(brut: unknown): Achat[] {
  return (Array.isArray(brut) ? brut : [])
    .map((x) => (x && typeof x === "object" ? (x as Record<string, unknown>) : null))
    .filter((x): x is Record<string, unknown> => x !== null && typeof x.id === "string")
    .map<Achat>((x) => ({
      id: x.id as string,
      quand: texte(x.created_at),
      total: nombre(x.total),
      vendeur: texte(x.vendeur) || "Coach",
      annulable: x.annulable === true,
      lignes: (Array.isArray(x.lignes) ? x.lignes : [])
        .map((l) => (l && typeof l === "object" ? (l as Record<string, unknown>) : null))
        .filter((l): l is Record<string, unknown> => l !== null)
        .map<LigneVendue>((l) => ({
          carteId: texte(l.carte_id),
          nom: texte(l.nom),
          prix: nombre(l.prix),
          qte: Math.max(1, Math.round(nombre(l.qte)) || 1),
          sorte: l.sorte === "upgrade" ? "upgrade" : "emporter",
        })),
    }));
}

/** Ajoute (ou retire, delta négatif) une unité. Borné entre 0 et 99 ; 0 retire la ligne. */
export function ajouter(panier: Panier, carteId: string, delta: number): Panier {
  const suivant = Math.max(0, Math.min(QTE_MAX, (panier[carteId] ?? 0) + delta));
  const copie = { ...panier };
  if (suivant === 0) delete copie[carteId];
  else copie[carteId] = suivant;
  return copie;
}

/** Le total en euros, au centime, d'après les prix de la carte. */
export function totalPanier(panier: Panier, carte: readonly ProduitCarte[]): number {
  const prix = new Map(carte.map((p) => [p.id, p.prix]));
  let centimes = 0;
  for (const [id, qte] of Object.entries(panier)) {
    centimes += Math.round((prix.get(id) ?? 0) * 100) * qte;
  }
  return centimes / 100;
}

export function nbArticles(panier: Panier): number {
  return Object.values(panier).reduce((s, q) => s + q, 0);
}

/** Ce qu'on envoie à `club_vendre` : des identifiants et des quantités, jamais des prix. */
export function lignesPanier(panier: Panier): Array<{ carte_id: string; qte: number }> {
  return Object.entries(panier)
    .filter(([, qte]) => qte > 0)
    .map(([carte_id, qte]) => ({ carte_id, qte }));
}

/**
 * Les gros boutons du haut de la feuille : d'abord SES habituels, puis les plus
 * vendus du club, puis le début du petit déj — sans doublon, seulement ce qui
 * est au tableau et part « à emporter » (les upgrades ont leur propre rangée).
 */
export function enTete(
  carte: readonly ProduitCarte[],
  habituels: readonly Habituel[],
  meilleures: readonly string[],
  max = 6,
): ProduitCarte[] {
  const vendables = new Map(carte.filter((p) => p.actif && p.sorte === "emporter").map((p) => [p.id, p]));
  const petitDej = carte
    .filter((p) => p.actif && p.sorte === "emporter" && p.rubrique === "petit_dej")
    .sort((a, b) => a.ordre - b.ordre)
    .map((p) => p.id);
  const vus = new Set<string>();
  const sortie: ProduitCarte[] = [];
  for (const id of [...habituels.map((h) => h.carteId), ...meilleures, ...petitDej]) {
    if (sortie.length >= max) break;
    const p = vendables.get(id);
    if (!p || vus.has(id)) continue;
    vus.add(id);
    sortie.push(p);
  }
  return sortie;
}

/** Les upgrades au tableau, dans l'ordre de la carte. */
export function upgrades(carte: readonly ProduitCarte[]): ProduitCarte[] {
  return carte.filter((p) => p.actif && p.sorte === "upgrade").sort((a, b) => a.ordre - b.ordre);
}

/** Le tableau complet, rangé comme au comptoir. `avecInactifs` pour les Réglages. */
export function parRubrique(
  carte: readonly ProduitCarte[],
  avecInactifs = false,
): Array<{ cle: Rubrique; titre: string; produits: ProduitCarte[] }> {
  return RUBRIQUES.map((r) => ({
    cle: r.cle,
    titre: r.titre,
    produits: carte
      .filter((p) => p.rubrique === r.cle && (avecInactifs || p.actif))
      .sort((a, b) => a.ordre - b.ordre || a.nom.localeCompare(b.nom, "fr")),
  })).filter((g) => g.produits.length > 0);
}

/** « 3 × Formula 1, Grand thé-aloé » — pour la liste de ses achats. */
export function resumeLignes(lignes: readonly LigneVendue[]): string {
  return lignes.map((l) => (l.qte > 1 ? `${l.qte} × ${l.nom}` : l.nom)).join(", ");
}

/** « 14,00 € », avec l'espace insécable du français. */
export function euro(n: number): string {
  return `${n.toFixed(2).replace(".", ",")} €`;
}

/** Lit un prix tapé au clavier (« 2,6 », « 2.60 », « 2 ») ; null s'il n'en est pas un. */
export function lirePrix(saisie: string): number | null {
  const v = saisie.trim().replace(",", ".");
  if (!/^\d{1,3}(\.\d{0,2})?$/.test(v)) return null;
  const n = Number(v);
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : null;
}

/** « aujourd'hui · 8 h 12 », « hier · 18 h 05 », « ven. 26 sept. ». */
export function quandLisible(iso: string, maintenant: Date = new Date()): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const jour = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const ecart = Math.round((jour(maintenant) - jour(d)) / 86_400_000);
  const heure = `${d.getHours()} h ${String(d.getMinutes()).padStart(2, "0")}`;
  if (ecart === 0) return `aujourd'hui · ${heure}`;
  if (ecart === 1) return `hier · ${heure}`;
  return d.toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" });
}
