// =============================================================================
// Réunir les fiches d'une même personne — « les lignes doivent se parler ».
//
// LE CONSTAT (Thomas, 24/08) : « trop de dossiers, des lignes qui ne discutent
// pas entre elles ». Le CRM regroupait déjà les doublons depuis le 12/08, mais
// il se contentait d'AFFICHER LA PLUS RÉCENTE et de replier les autres. Tout ce
// que portaient les fiches repliées était donc invisible.
//
// ── POURQUOI « LA PLUS RÉCENTE » NE MARCHE PAS ────────────────────────────
// Mesure en base du 24/08, cas Florian : sa fiche club (nom + téléphone) et son
// bilan en ligne (3 objectifs, motivation 7/10, 26 ans) sont arrivés à UNE
// MINUTE d'intervalle. Le bilan a gagné — par chance. S'il avait rempli son
// bilan avant de réserver, le coach n'aurait vu qu'un nom et un numéro, et les
// réponses du bilan seraient restées cachées derrière un « 2 fiches ».
//
// On ne choisit donc plus « la plus récente » : on réunit. Chaque champ est
// pris là où il est le plus utile, avec une règle écrite et testée.
//
// ── RIEN N'EST DÉTRUIT ────────────────────────────────────────────────────
// Cette fonction est PURE et ne touche pas la base : elle produit une VUE.
// Les lignes d'origine restent intactes, donc tout est réversible et un
// mauvais rapprochement se corrige sans perte.
//
// ── CE QU'ON NE DÉCIDE PAS EN SILENCE ─────────────────────────────────────
// Si deux fiches appartiennent à DEUX COACHS différents, on garde celui du
// maître et on le SIGNALE (`conflits`). L'attribution décide de qui touche la
// commission : ça ne se tranche pas dans une fonction utilitaire.
// =============================================================================

/** Le sous-ensemble dont dépend la réunion. Structurel : testable sans le hook.
 *
 *  ⚠️ PAS de signature d'index ici : elle empêcherait `CrmLead` (une interface
 *  fermée) de satisfaire ce contrat. Les champs annexes sont lus via `champ()`. */
export interface FicheFusionnable {
  table: string;
  status: string;
  source: string;
  createdAt: string;
  contactedAt: string | null;
  relanceDueAt: string | null;
  ownerUserId: string | null;
  dormant?: boolean;
  enAttente?: boolean;
}

/** Lit un champ annexe (bilan, funnel, rdv…) sans exiger de signature d'index. */
const champ = (f: FicheFusionnable, nom: string): unknown => (f as unknown as Record<string, unknown>)[nom];

export interface Fusion<T> {
  /** La fiche qui porte l'identité et la route (/crm/leads/:key). */
  maitre: T;
  /** La vue unifiée : le maître, enrichi de ce que portaient les autres. */
  vue: T;
  /** Les fiches absorbées, dans l'ordre d'arrivée. Jamais perdues. */
  autres: T[];
  /** Ce qu'on n'a PAS tranché tout seul (ex. deux coachs). */
  conflits: string[];
}

/** Du moins avancé au plus avancé. `lost` est en bas : quelqu'un qui revient
 *  après avoir été classé perdu est de nouveau un contact vivant. */
const RANG_STATUT: Record<string, number> = {
  lost: 0, new: 1, contacted: 2, qualified: 3, converted: 4,
};

/** Ce qui rend une fiche « riche » : ce qu'un coach y trouverait d'utile. */
function richesse(f: FicheFusionnable): number {
  let n = 0;
  const objectifs = champ(f, "bilanObjectives");
  if (Array.isArray(objectifs) && objectifs.length > 0) n += 5; // le bilan pèse le plus
  if (champ(f, "bilanMotivation") != null) n += 2;
  if (champ(f, "bilanAge") != null) n += 1;
  if (champ(f, "bilanWeightTarget") != null) n += 1;
  if (champ(f, "funnelAnswers") || champ(f, "colisAnswers")) n += 2;
  for (const c of ["lastName", "email", "phone", "city", "notes", "rdv"]) {
    if (champ(f, c)) n += 1;
  }
  return n;
}

const tempsDe = (iso: string | null | undefined): number => {
  if (!iso) return Number.NaN;
  const t = new Date(iso).getTime();
  return Number.isNaN(t) ? Number.NaN : t;
};

/** La 1re valeur utilisable, en parcourant les fiches dans l'ordre donné. */
function premiere<T extends FicheFusionnable>(fiches: T[], nom: string): unknown {
  for (const f of fiches) {
    const v = champ(f, nom);
    if (v !== null && v !== undefined && v !== "" && !(Array.isArray(v) && v.length === 0)) return v;
  }
  return undefined;
}

/**
 * Réunit un groupe de fiches (déjà reconnues comme la même personne).
 *
 * Un groupe d'une seule fiche est rendu tel quel — pas de cas particulier à
 * gérer côté appelant.
 */
export function fusionnerGroupe<T extends FicheFusionnable>(groupe: T[]): Fusion<T> {
  if (groupe.length === 1) {
    return { maitre: groupe[0], vue: groupe[0], autres: [], conflits: [] };
  }

  // Le maître : la plus riche. À richesse égale, la plus récente — c'est celle
  // qui reflète l'intention actuelle de la personne.
  const parInteret = [...groupe].sort((a, b) => {
    const dr = richesse(b) - richesse(a);
    if (dr !== 0) return dr;
    return (tempsDe(b.createdAt) || 0) - (tempsDe(a.createdAt) || 0);
  });
  const maitre = parInteret[0];
  const autres = groupe.filter((f) => f !== maitre)
    .sort((a, b) => (tempsDe(a.createdAt) || 0) - (tempsDe(b.createdAt) || 0));

  // Les champs d'INFORMATION se prennent chez le plus riche qui les porte.
  const infos = [
    "phone", "email", "contact", "city", "lastName", "notes", "objectif",
    "bilanObjectives", "bilanMotivation", "bilanAge", "bilanWeightTarget",
    "funnelAnswers", "colisAnswers", "funnelScore", "funnelTemperature", "funnelProfile",
    "resultToken", "callbackRequestedAt", "engagement", "rdv", "rdvLabel",
    "viaName", "parrainPhone", "parrainClientId", "extra", "derniereReponse",
    "peopleCount", "partnerName", "partnerObjectif", "consentRecontact",
  ];
  const ajouts: Record<string, unknown> = {};
  for (const nom of infos) {
    const v = premiere(parInteret, nom);
    if (v !== undefined) ajouts[nom] = v;
  }

  // Les champs de SUIVI ont chacun leur règle.
  const parDate = [...groupe].sort((a, b) => (tempsDe(a.createdAt) || 0) - (tempsDe(b.createdAt) || 0));

  // Depuis quand cette personne existe : sa PREMIÈRE apparition.
  ajouts.createdAt = parDate[0].createdAt;
  // Ce qui l'a fait venir : la source de cette première apparition.
  ajouts.source = parDate[0].source;

  // Dernière activité : le contact le PLUS RÉCENT.
  const contacts = groupe.map((f) => tempsDe(f.contactedAt)).filter((t) => !Number.isNaN(t));
  ajouts.contactedAt = contacts.length ? new Date(Math.max(...contacts)).toISOString() : null;

  // La relance la PLUS PROCHE : c'est la plus urgente qui commande.
  const relances = groupe.map((f) => tempsDe(f.relanceDueAt)).filter((t) => !Number.isNaN(t));
  ajouts.relanceDueAt = relances.length ? new Date(Math.min(...relances)).toISOString() : null;
  ajouts.relanceDue = relances.length ? Math.min(...relances) <= Date.now() : false;

  // Le statut le PLUS AVANCÉ : si une fiche dit « converti », la personne l'est.
  ajouts.status = groupe.reduce((meilleur, f) =>
    (RANG_STATUT[f.status] ?? 0) > (RANG_STATUT[meilleur] ?? 0) ? f.status : meilleur, groupe[0].status);

  // Endormie / en attente seulement si TOUTES le sont : une seule fiche active
  // suffit à ce que la personne reste dans le flux.
  ajouts.dormant = groupe.every((f) => f.dormant === true);
  ajouts.enAttente = groupe.every((f) => f.enAttente === true);

  // Le coach : celui du maître. Une divergence se signale, elle ne se tranche pas.
  const coachs = new Set(groupe.map((f) => f.ownerUserId).filter(Boolean) as string[]);
  ajouts.ownerUserId = maitre.ownerUserId ?? (premiere(parInteret, "ownerUserId") as string | null) ?? null;

  const conflits: string[] = [];
  if (coachs.size > 1) conflits.push(`${coachs.size} coachs différents sur ces fiches`);
  const tables = new Set(groupe.map((f) => f.table));
  if (tables.size > 1) conflits.push(`arrivée par ${tables.size} portes : ${[...tables].join(", ")}`);

  return { maitre, vue: { ...maitre, ...ajouts } as T, autres, conflits };
}
