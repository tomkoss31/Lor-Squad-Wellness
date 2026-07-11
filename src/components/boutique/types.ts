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
};

export type BoutiqueInfo = {
  user_id: string;
  first_name: string | null;
  shop_name: string;
  avatar_url: string | null;
  hero_video_url?: string | null;
  contact_phone?: string | null;
  ai_scan_url?: string | null;
};

// Code promo appliqué (validé serveur).
export type AppliedPromo = { code: string; kind: string; value: number };

// Frais de port (cf. brief CRO : seuil ~90 €, à confirmer).
export const FREE_SHIPPING_THRESHOLD = 90;
export const SHIPPING_COST = 8.9;

// Libellés FR des préoccupations (shop-by-concern).
export const CONCERN_LABELS: Record<string, { label: string; icon: string; sub: string }> = {
  eclat: { label: "Éclat & teint", icon: "✨", sub: "Teint terne, taches" },
  pores: { label: "Pores & grain", icon: "🫧", sub: "Grain irrégulier, sébum" },
  age: { label: "Anti-âge & fermeté", icon: "⏳", sub: "Rides, relâchement" },
  hydratation: { label: "Hydratation", icon: "💧", sub: "Tiraillements, sécheresse" },
};
