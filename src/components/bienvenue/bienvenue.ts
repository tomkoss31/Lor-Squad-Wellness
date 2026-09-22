// =============================================================================
// La page du lien d'accès (/bienvenue) et l'installation dans son espace —
// la logique pure (22/09/2026, maquette 7pdf4sTkQoHob1axp76vfP validée par
// Thomas : « il est top, good job, continue »).
//
// « La Base, ce sont trois maisons » : La Base Nutrition (le coaching), The
// Breakfast Club (le club petit-déjeuner), La Base Shakes & Drinks (les
// boissons). La maison de la personne passe EN TÊTE : une membre du club voit
// d'abord son club, une cliente en coaching son coaching.
// =============================================================================

/** Qui ouvre le lien : une membre du club (`clients.ebe_bbc`) ou une cliente en coaching. */
export type Variante = "club" | "coaching";
export type Maison = "nutrition" | "bbc" | "shakes";
export type Appareil = "iphone" | "android";

export const ORDRE_MAISONS: Record<Variante, Maison[]> = {
  club: ["bbc", "nutrition", "shakes"],
  coaching: ["nutrition", "bbc", "shakes"],
};

/** La maison de la personne (celle qu'on met en couleur, avec sa pastille). */
export const MAISON_DE: Record<Variante, Maison> = { club: "bbc", coaching: "nutrition" };

/**
 * Le geste de chaque maison sur l'accueil (/welcome, 22/09, maquette Fbk2bRMgzC4bMLYAm91nLM).
 * ⚠️ `/decouvrir` présente le COACHING La Base (« un club, pas une appli de plus »), pas le
 * Breakfast Club : le club a son site, `/club` (le domaine labase-nutrition.com y mène).
 */
export const GESTES_MAISONS: Record<Maison, { libelle: string; href: string; externe?: boolean }> = {
  nutrition: { libelle: "Découvrir le coaching", href: "/decouvrir" },
  bbc: { libelle: "Découvrir le club", href: "/club" },
  shakes: { libelle: "Commander", href: "https://commande.labase-nutrition.com", externe: true },
};

/** iPhone par défaut : un Android se reconnaît à coup sûr, un iPhone (ou un iPad) moins. */
export function appareilDepuisUA(ua: string): Appareil {
  return /android/i.test(ua) ? "android" : "iphone";
}

/**
 * L'icône et le nom qu'elle verra sur son écran d'accueil — les VRAIS, ceux que
 * posent `api/client-manifest` et ClientAppPage (apple-touch-icon, titre).
 * Une membre du club installe « Mon club » (le médaillon), les autres La Base 360.
 */
export const ICONE_ACCUEIL: Record<Variante, { src: string; nom: string }> = {
  club: { src: "/brand/breakfast-club/apple-touch-icon-180.png", nom: "Mon club" },
  coaching: { src: "/brand/labase360/apple-touch-icon-180.png", nom: "La Base 360" },
};
