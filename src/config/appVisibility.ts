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
  | "business.flex"
  | "business.liste-100"
  // ── Pédagogie / perso ──────────────────────────────────────────────────
  | "dev.hub"
  | "dev.formation"
  | "dev.academy"
  | "dev.cahier-de-bord"
  | "dev.simulateur-ebe"
  | "dev.routine-du-jour";

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

  // ── Mon business : Thomas a choisi de tout garder visible… ──────────────
  "business.encaissement": "essentiel", // remonté en tête (LOT 3)
  "business.panier": "essentiel",
  "business.ventes-comptoir": "essentiel",
  "business.mes-liens": "essentiel",
  "business.rentabilite": "essentiel",
  "business.pv": "essentiel",
  "business.boutique": "essentiel",
  "business.prospecter": "essentiel",
  "business.plan-marketing": "essentiel",
  // ── … sauf ces deux-là, retirés explicitement ──────────────────────────
  "business.flex": "complet", // 0 check-in en base depuis le lancement
  "business.liste-100": "complet", // 13 contacts, 100 % Thomas

  // ── Pédagogie ──────────────────────────────────────────────────────────
  "dev.hub": "complet",
  "dev.academy": "essentiel", // tuto de l'app : 5 personnes l'ont finie
  "dev.formation": "essentiel", // rattachée au cockpit Académie (LOT 4)
  "dev.cahier-de-bord": "complet",
  "dev.simulateur-ebe": "complet",
  "dev.routine-du-jour": "complet", // 9 cochages en tout ; reste joignable via la notif 20h
};

/** Vrai si la feature doit apparaître dans les menus pour ce niveau. */
export function isFeatureVisible(key: FeatureKey, level: AppLevel): boolean {
  if (level === "complet") return true;
  return FEATURE_LEVEL[key] === "essentiel";
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
