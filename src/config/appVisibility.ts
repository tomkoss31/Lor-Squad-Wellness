// =============================================================================
// appVisibility — LA carte de ce que chacun voit dans l'app (2026-07-27).
//
// Chantier Simplification. Source de vérité UNIQUE de la visibilité des menus.
// Si tu veux qu'une feature réapparaisse ou disparaisse d'un menu, ça se règle
// ICI, dans ce fichier, et nulle part ailleurs.
//
// Deux niveaux (colonne users.app_level) :
//   • essentiel — le socle du quotidien. Défaut de TOUT LE MONDE.
//   • complet   — toute l'app. Thomas seul au départ ; il ouvre au cas par cas.
//
// ⚠ TROIS RÈGLES À NE JAMAIS CASSER
//
//  1. Ça masque un MENU, jamais une route ni une donnée. Une URL tapée à la
//     main, un lien de push, une annonce, un deep-link Co-pilote : tout
//     continue de fonctionner pour tout le monde. Donc aucun lien existant ne
//     casse, et personne ne se retrouve devant un écran mort.
//  2. Ce n'est PAS de la sécurité. Le contrôle d'accès réel, c'est les RLS +
//     le rôle (admin / referent / distributor). Ne jamais protéger quoi que ce
//     soit de sensible avec ce fichier.
//  3. Le niveau est indépendant du rôle. Mélanie est admin ET en essentiel :
//     elle garde « Mon équipe » (réservé admin) mais pas les outils avancés.
//     Les deux filtres se composent — voir AppLayout.
// =============================================================================

export type AppLevel = "essentiel" | "complet";

export const DEFAULT_APP_LEVEL: AppLevel = "essentiel";

export type FeatureKey =
  // ── Entrées de navigation principales ──────────────────────────────────
  | "nav.copilote"
  | "nav.clients"
  | "nav.crm"
  | "nav.agenda"
  | "nav.messages"
  | "nav.nouveau-bilan"
  | "nav.business"
  | "nav.equipe"
  | "nav.developpement"
  | "nav.parametres"
  // ── Hub « Mon business » ───────────────────────────────────────────────
  | "business.encaissement"
  | "business.panier"
  | "business.ventes-comptoir"
  | "business.mes-liens"
  | "business.rentabilite"
  | "business.pv"
  | "business.boutique"
  | "business.prospecter"
  | "business.plan-marketing"
  | "business.liste-100"
  | "business.pv-equipe"
  // ── Pages d'administration ─────────────────────────────────────────────
  | "admin.newsletters"
  | "admin.campagnes"
  // ── Pédagogie / perso ──────────────────────────────────────────────────
  | "dev.hub"
  | "dev.formation"
  | "dev.academy"
  | "dev.cahier-de-bord"
  | "dev.simulateur-ebe";

/**
 * Niveau minimum requis pour qu'une feature apparaisse dans les menus.
 * Tout ce qui est marqué "essentiel" est visible par tout le monde.
 */
export const FEATURE_LEVEL: Record<FeatureKey, AppLevel> = {
  // ── Le socle : ce qu'on ouvre tous les jours ───────────────────────────
  "nav.copilote": "essentiel",
  "nav.clients": "essentiel",
  "nav.crm": "essentiel",
  "nav.agenda": "essentiel",
  "nav.messages": "essentiel", // canal client → coach de la PWA (décision 2026-07-27)
  "nav.nouveau-bilan": "essentiel",
  "nav.business": "essentiel",
  "nav.equipe": "essentiel", // + filtre rôle admin par-dessus (Mélanie la garde)
  "nav.parametres": "essentiel",

  // « Mon développement » devient l'espace perso de Thomas. Les distris
  // apprennent via le cockpit La Base Académie (une seule porte). Un bouton
  // « demander l'accès » permet de le réclamer — cf. LOT 4.
  "nav.developpement": "complet",

  // ── Mon business ───────────────────────────────────────────────────────
  "business.encaissement": "essentiel", // remonté en tête (LOT 3)
  "business.panier": "essentiel",
  "business.ventes-comptoir": "essentiel",
  "business.mes-liens": "essentiel",
  "business.rentabilite": "essentiel", // gardée : refonte dédiée à venir (Thomas 12/08)
  "business.pv": "essentiel",
  "business.boutique": "essentiel",
  "business.plan-marketing": "essentiel", // gardée : « utile, c'est juste du visuel »
  // ── … sauf celles-ci, retirées des menus ───────────────────────────────
  "business.liste-100": "complet", // 13 contacts, 100 % Thomas
  // Ménage du 12/08 : 87 jours sans une tentative, 2 en tout depuis le
  // lancement — pour 4 profils × 6 marchés × 10 sections. Cette clé couvre
  // « Prospecter » (/outils-prospection) ET la prospection froide (/prospection),
  // qui n'est atteignable que par là.
  "business.prospecter": "complet",
  // Vue équipe du Suivi PV : même source que la Rentabilité, dernière saisie
  // il y a 49 jours. La vue globale (/pv) reste, elle.
  "business.pv-equipe": "complet",

  // ── Administration ─────────────────────────────────────────────────────
  // Ménage du 12/08 : 2 lettres et ZÉRO abonné · 2 campagnes.
  "admin.newsletters": "complet",
  "admin.campagnes": "complet",

  // ── Pédagogie ──────────────────────────────────────────────────────────
  "dev.hub": "complet",
  // Ménage du 12/08 : doublon avec la Formation, qui fait la même chose en
  // mieux (47 progressions + 83 questions, vivante) quand l'Academy stagne
  // depuis 35 jours. Une seule porte pour apprendre.
  "dev.academy": "complet",
  "dev.formation": "essentiel", // rattachée au cockpit Académie (LOT 4)
  "dev.cahier-de-bord": "complet",
  "dev.simulateur-ebe": "complet",
};

/** Vrai si la feature doit apparaître dans les menus pour ce niveau. */
export function isFeatureVisible(key: FeatureKey, level: AppLevel): boolean {
  if (level === "complet") return true;
  return FEATURE_LEVEL[key] === "essentiel";
}

// =============================================================================
// PALIERS DE DÉMARRAGE — l'app grandit avec le coach (2026-08-04)
//
// Chantier « l'app d'un débutant ». Le niveau `essentiel` laissait quand même
// 26 fonctions visibles dès la première minute, à quelqu'un qui ne connaît
// rien. On ouvre donc progressivement, au rythme de ce qu'il fait.
//
// ⚠ MÊMES RÈGLES QUE CI-DESSUS : ça masque un MENU, jamais une route. Un lien
// reçu par push ou une URL tapée continue de marcher. Et ça ne s'applique
// QU'AVANT l'activation : dès qu'un coach est lancé, il a tout.
// =============================================================================

export type StarterStage =
  /** Jour 1 — il ne connaît rien. Le strict minimum. */
  | "demarrage"
  /** Il a ses premiers contacts : on ouvre le CRM et l'agenda. */
  | "premiers_pas"
  /** Il a fait son 1er bilan : on ouvre les outils business. */
  | "en_route"
  /** Démarrage terminé — plus aucun verrou de palier. */
  | "lance";

const STAGE_ORDER: StarterStage[] = ["demarrage", "premiers_pas", "en_route", "lance"];

/**
 * Palier à partir duquel chaque entrée apparaît.
 * Absent de cette carte = visible dès le premier jour.
 */
export const FEATURE_STAGE: Partial<Record<FeatureKey, StarterStage>> = {
  // Jour 1 : parler à des gens et noter qui ils sont. Rien d'autre.
  //   → nav.copilote, nav.clients, nav.messages, nav.parametres : dès le départ.
  "nav.crm": "premiers_pas",
  "nav.agenda": "premiers_pas",
  "nav.business": "en_route",
  "nav.developpement": "en_route",
};

/** Phrase affichée sur une entrée encore verrouillée — le « quand ». */
export const STAGE_CONDITION: Record<StarterStage, string> = {
  demarrage: "",
  premiers_pas: "quand tu auras noté tes premiers contacts",
  en_route: "quand tu auras fait ton 1er bilan",
  lance: "quand ton démarrage sera terminé",
};

/** Vrai si le palier atteint débloque cette feature. */
export function isFeatureUnlocked(key: FeatureKey, stage: StarterStage): boolean {
  const required = FEATURE_STAGE[key];
  if (!required) return true;
  return STAGE_ORDER.indexOf(stage) >= STAGE_ORDER.indexOf(required);
}

/** Le palier requis pour cette feature (null = aucune condition). */
export function featureStage(key: FeatureKey): StarterStage | null {
  return FEATURE_STAGE[key] ?? null;
}

/** Liste des features masquées à ce niveau — sert l'écran de réglage admin. */
export function hiddenFeatures(level: AppLevel): FeatureKey[] {
  if (level === "complet") return [];
  return (Object.keys(FEATURE_LEVEL) as FeatureKey[]).filter(
    (k) => FEATURE_LEVEL[k] === "complet",
  );
}

/** Normalise une valeur venue de la base (colonne libre côté TS). */
export function toAppLevel(value: unknown): AppLevel {
  return value === "complet" ? "complet" : DEFAULT_APP_LEVEL;
}
