// Types boutique HL SKIN « Beauté K Skin ».

export type ProductImage = { url: string; kind?: string };
export type ProductFaq = { q: string; a: string };

export type ShopProduct = {
  id: string;
  slug: string;
  legacy_catalog_id: string | null;
  name: string;
  tagline: string | null;
  description: string | null;
  concern: string | null;
  ingredient_hero: string | null;
  how_to: string | null;
  benefits: string[];
  faq: ProductFaq[];
  price_ttc: number;
  currency: string;
  pv: number;
  volume_label: string | null;
  images: ProductImage[];
  badge: string | null;
  rating: number | null;
  reviews_count: number;
  sort_order: number;
  // Si non null : ce « produit » est un KIT (liste de slugs produits inclus).
  bundle_items?: string[] | null;
};

/**
 * Identité légale DU VENDEUR (le distributeur), renvoyée par get_boutique_by_slug.
 *
 * ⚠️ Ne JAMAIS remplacer un champ manquant par les constantes COMPANY_* de
 * lib/branding.ts : celles-ci désignent SAS HTM FITLIFE, l'éditeur de la
 * plateforme. Les afficher sur la boutique d'un tiers revient à déclarer que
 * c'est SAS HTM FITLIFE qui vend — avec la responsabilité qui va avec.
 * Champ absent ⇒ on l'annonce comme manquant, on n'invente pas.
 */
export type BoutiqueLegal = {
  entity_name: string | null;
  form: string | null;
  address: string | null;
  siret: string | null;
  email: string | null;
  director: string | null;
  vat: string | null;
  rcs: string | null;
  capital: string | null;
  mediator_name: string | null;
  mediator_url: string | null;
  /** Le noyau obligatoire est-il renseigné (cf. boutique_legal_complete) ? */
  complete: boolean;
};

export type BoutiqueInfo = {
  user_id: string;
  first_name: string | null;
  shop_name: string;
  avatar_url: string | null;
  hero_video_url?: string | null;
  contact_phone?: string | null;
  ai_scan_url?: string | null;
  legal?: BoutiqueLegal | null;
};

// Code promo appliqué (validé serveur).
export type AppliedPromo = { code: string; kind: string; value: number };

// Frais de port (cf. brief CRO : seuil ~90 €, à confirmer).
export const FREE_SHIPPING_THRESHOLD = 90;
export const SHIPPING_COST = 8.9;

// Les 3 catégories officielles HL/Skin (code couleur packaging) + la gamme Aloé.
export const CONCERN_LABELS: Record<string, { label: string; icon: string; sub: string; hue: string }> = {
  eclat: { label: "Éclat & Luminosité", icon: "✨", sub: "Teint terne, pores, imperfections", hue: "#E8C86A" },
  hydratation: { label: "Hydratation", icon: "💧", sub: "Tiraillements, sécheresse", hue: "#6FB7B0" },
  age: { label: "Beauté à tout âge", icon: "⏳", sub: "Rides, fermeté, éclat", hue: "#9E86C4" },
  aloe: { label: "Aloe Vera", icon: "🌿", sub: "Apaiser, corps & cheveux", hue: "#7CB342" },
};

// Ordre d'affichage des catégories (Nettoyer → Cibler → Hydrater → Aloé).
export const CONCERN_ORDER = ["eclat", "hydratation", "age", "aloe"] as const;

// Produits à venir (teaser vitrine — PAS en vente).
export type ComingSoonProduct = { name: string; tagline: string; concern: string };
export const COMING_SOON: ComingSoonProduct[] = [
  {
    name: "Crème de Jour Éclat FPS 30",
    tagline: "Hydrate, illumine et protège des UV au quotidien.",
    concern: "eclat",
  },
];
