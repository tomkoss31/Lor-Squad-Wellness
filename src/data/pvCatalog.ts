import { getFirstAssessment, getLatestAssessment } from "../lib/calculations";
import type { Client } from "../types/domain";
import type {
  PvClientProductRecord,
  PvClientTrackingRecord,
  PvClientTransaction,
  PvProductCatalogItem,
  PvProductStatus,
  PvProductUsage,
  PvProgramOption,
  PvStatus,
  PvTransactionType
} from "../types/pv";

const DAY_MS = 24 * 60 * 60 * 1000;

// Les alias couvrent TOUS les espaces d'id qui atterrissent reellement en base
// (audit 2026-07-16) : clients.pv_program_id contient aussi bien des ids PV
// ("premium", "starter") que des ids LEGACY ("p-premium" x18, "p-discovery" x2,
// "p-booster2" x1) ecrits par le bilan initial. Sans alias explicite, ces
// valeurs ne matchaient que par hasard via la branche "substring" (ou pas du
// tout) et tombaient sur le fallback. Ne pas retirer les alias "p-*".
export const pvProgramOptions: PvProgramOption[] = [
  {
    id: "starter",
    title: "Programme Starter",
    alias: [
      "Programme Decouverte",
      "Programme Starter",
      "Decouverte",
      "Découverte",
      "Starter",
      "p-discovery",
      "discovery",
    ],
    summary: "Base simple pour suivre le demarrage et le renouvellement des produits principaux.",
    pricePublic: 159,
    includedProductIds: ["aloe-vera", "the-51g", "formula-1"],
    mainReferenceDurationDays: 21,
    active: true
  },
  {
    id: "premium",
    title: "Programme Premium",
    alias: ["Programme Premium", "Premium", "p-premium"],
    summary: "Routine plus complete avec proteines en plus pour tenir dans le temps.",
    pricePublic: 234,
    includedProductIds: ["aloe-vera", "the-51g", "formula-1", "pdm"],
    mainReferenceDurationDays: 42,
    active: true
  },
  {
    id: "booster-1",
    title: "Programme Booster 1",
    alias: ["Programme Booster 1", "Booster 1", "p-booster1", "booster1"],
    summary: "Version plus structuree avec fibres et lecture volume plus precise.",
    pricePublic: 277,
    includedProductIds: ["aloe-vera", "the-51g", "formula-1", "pdm", "multifibres"],
    mainReferenceDurationDays: 42,
    active: true
  },
  {
    id: "booster-2",
    title: "Programme Booster 2",
    alias: ["Programme Booster 2", "Booster 2", "p-booster2", "booster2"],
    summary: "Cadre plus complet avec produit metabolique en plus.",
    pricePublic: 324,
    includedProductIds: ["aloe-vera", "the-51g", "formula-1", "pdm", "phyto-brule-graisse"],
    mainReferenceDurationDays: 42,
    active: true
  },
  {
    id: "custom",
    title: "Suivi personnalise",
    alias: ["Suivi personnalise", "Suivi personnalisé"],
    summary: "Programme libre pour les cas terrain qui ne rentrent pas pile dans une formule.",
    pricePublic: 0,
    includedProductIds: ["formula-1"],
    mainReferenceDurationDays: 21,
    active: true
  },
  // Vente a l'unite — AUCUNE routine imposee : seuls les produits reellement
  // retenus par le coach comptent. Ajoute le 2026-07-16 (audit programmes) :
  // "À l'unité" n'existait pas ici, donc resolvePvProgram tombait sur le
  // fallback Starter et injectait 3 produits fantomes (aloe-vera + the-51g +
  // formula-1) a des clients qui n'avaient rien pris. includedProductIds DOIT
  // rester vide.
  {
    id: "unit",
    title: "À l'unité",
    alias: [
      "À l'unité",
      "A l'unite",
      "Unite",
      "Unité",
      "A la carte",
      "À la carte",
      "p-unit",
      "unit",
    ],
    summary: "Vente a l'unite : le client repart uniquement avec les produits retenus.",
    pricePublic: 0,
    includedProductIds: [],
    mainReferenceDurationDays: 21,
    active: true
  }
];

export const pvProductCatalog: PvProductCatalogItem[] = [
  {
    id: "formula-1",
    name: "Formula 1",
    category: "shake / repas",
    pricePublic: 63.5,
    pv: 23.95,
    quantiteLabel: "21 doses",
    dureeReferenceJours: 21,
    noteMetier: "En pratique, 1 pot = 21 jours de reference dans le suivi.",
    recommendedProgram: "Programme Starter",
    active: true
  },
  {
    id: "pdm",
    name: "Melange pour boisson proteinee",
    category: "proteine",
    pricePublic: 75,
    pv: 33,
    quantiteLabel: "42 doses",
    dureeReferenceJours: 42,
    noteMetier: "Reference simple de 1 dose / jour sur 42 jours.",
    recommendedProgram: "Programme Premium",
    active: true
  },
  {
    id: "phyto-brule-graisse",
    name: "Phyto Complete",
    category: "gelules",
    pricePublic: 90,
    pv: 38.15,
    quantiteLabel: "60 gelules",
    dureeReferenceJours: 30,
    noteMetier: "Reference simple de 30 jours.",
    recommendedProgram: "Programme Booster 2",
    active: true
  },
  {
    id: "aloe-vera",
    name: "Aloe Vera Classique (473ml)",
    category: "hydratation / aloe",
    pricePublic: 54.5,
    pv: 24.95,
    quantiteLabel: "473 ml",
    dureeReferenceJours: 21,
    noteMetier:
      "Dans le suivi, au-dela de 21 jours on considere l'hydratation comme mal tenue.",
    recommendedProgram: "Programme Starter",
    active: true
  },
  {
    id: "the-51g",
    name: "Thé Classique (51g)",
    category: "hydratation / the",
    pricePublic: 41,
    pv: 19.95,
    quantiteLabel: "51 g",
    dureeReferenceJours: 21,
    noteMetier:
      "Meme logique terrain que l'aloe : au-dela de 21 jours, la routine n'a pas ete tenue.",
    recommendedProgram: "Programme Starter",
    active: true
  },
  {
    id: "multifibres",
    name: "Boisson multifibres",
    category: "fibres",
    pricePublic: 43.5,
    pv: 22.95,
    quantiteLabel: "30 doses",
    dureeReferenceJours: 30,
    noteMetier: "Reference simple de 30 jours.",
    recommendedProgram: "Programme Booster 1",
    active: true
  },
  {
    id: "fibre-concentrate",
    name: "Fibre Concentrate — Orange & Baies de Goji 500ml",
    category: "fibres",
    pricePublic: 67,
    pv: 30,
    quantiteLabel: "500 ml",
    dureeReferenceJours: 30,
    noteMetier: "Fibres concentrees + calcium + enzymes digestives + vitamine C. Nouveaute (SKU 201K).",
    recommendedProgram: "Suivi personnalise",
    active: true
  },
  {
    id: "microbiotic-max",
    name: "Microbiotic Max",
    category: "digestif",
    pricePublic: 64.5,
    pv: 27.1,
    quantiteLabel: "30 jours",
    dureeReferenceJours: 30,
    noteMetier: "Soutien digestif simple sur 30 jours.",
    recommendedProgram: "Suivi personnalise",
    active: true
  },
  {
    id: "night-mode",
    name: "Night Mode",
    category: "sommeil",
    pricePublic: 69,
    pv: 31.25,
    quantiteLabel: "30 jours",
    dureeReferenceJours: 30,
    noteMetier: "Repère routine du soir sur 30 jours.",
    recommendedProgram: "Suivi personnalise",
    active: true
  },
  {
    id: "xtra-cal",
    name: "Xtra-Cal",
    category: "calcium",
    pricePublic: 24.5,
    pv: 10.25,
    quantiteLabel: "30 jours",
    dureeReferenceJours: 30,
    noteMetier: "Repère simple autour du calcium.",
    recommendedProgram: "Suivi personnalise",
    active: true
  },
  {
    id: "beta-heart",
    name: "Beta Heart",
    category: "visceral / routine",
    pricePublic: 57.5,
    pv: 25.95,
    quantiteLabel: "30 jours",
    dureeReferenceJours: 30,
    noteMetier: "Repère complementaire quand la lecture viscerale ressort.",
    recommendedProgram: "Suivi personnalise",
    active: true
  },
  {
    id: "protein-bars",
    name: "Barres aux proteines",
    category: "encas",
    pricePublic: 31.5,
    pv: 13.22,
    quantiteLabel: "14 jours",
    dureeReferenceJours: 14,
    noteMetier: "Encas cadre pour les fringales et les deplacements.",
    recommendedProgram: "Suivi personnalise",
    active: true
  },
  {
    id: "liftoff",
    name: "LiftOff",
    category: "energie",
    pricePublic: 39.5,
    pv: 15.95,
    quantiteLabel: "10 jours",
    dureeReferenceJours: 10,
    noteMetier: "Impulsion simple quand l'energie manque.",
    recommendedProgram: "Suivi personnalise",
    active: true
  },
  {
    id: "h24-hydrate",
    name: "H24 Hydrate (électrolytes)",
    category: "sport / hydratation",
    pricePublic: 47.50,
    pv: 17.20,
    quantiteLabel: "20 jours",
    dureeReferenceJours: 20,
    noteMetier: "Hydratation optimale avec électrolytes.",
    recommendedProgram: "Suivi personnalisé",
    active: true
  },
  {
    id: "formula-3",
    name: "Formula 3 — Protein Powder",
    category: "protéine",
    pricePublic: 49.00,
    pv: 17.95,
    quantiteLabel: "30 jours",
    dureeReferenceJours: 30,
    noteMetier: "Complète le shake F1 pour augmenter l'apport protéique.",
    recommendedProgram: "Programme Premium",
    active: true
  },
  {
    id: "active-mind",
    name: "Active Mind Complex",
    category: "énergie / concentration",
    pricePublic: 57.50,
    pv: 27.25,
    quantiteLabel: "30 jours",
    dureeReferenceJours: 30,
    noteMetier: "Concentration et clarté mentale.",
    recommendedProgram: "Suivi personnalisé",
    active: true
  },
  {
    id: "chips-proteinees",
    name: "Chips Protéinées",
    category: "en-cas",
    pricePublic: 27.50,
    pv: 11.75,
    quantiteLabel: "10 sachets",
    dureeReferenceJours: 10,
    noteMetier: "Alternative saine au grignotage.",
    recommendedProgram: "Suivi personnalisé",
    active: true
  },
  {
    id: "immune-booster",
    name: "Immune Booster",
    category: "immunité",
    pricePublic: 51.00,
    pv: 18.90,
    quantiteLabel: "21 sachets",
    dureeReferenceJours: 21,
    noteMetier: "Renfort immunitaire avec vitamines C, D et zinc.",
    recommendedProgram: "Suivi personnalisé",
    active: true
  },
  {
    id: "rebuild-strength",
    name: "Herbalife 24 — Rebuild Strength",
    category: "sport / muscle",
    pricePublic: 83.50,
    pv: 33.55,
    quantiteLabel: "1kg — 30 jours",
    dureeReferenceJours: 30,
    noteMetier: "Protéines & créatine pour prise de masse et récupération.",
    recommendedProgram: "Programme Sport",
    active: true
  },

  // ─── Catalogue elargi (mars 2026) ───────────────────────────────────────
  // Source : Liste de prix distributeurs Herbalife France, vigueur 25/06/2026.

  // ── ALOE VERA (3 variantes) ─────────────────────────────────────────────
  {
    id: "aloe-mangue-473",
    name: "Aloe Vera Mangue (473ml)",
    category: "hydratation / aloe",
    pricePublic: 54.5,
    pv: 24.95,
    quantiteLabel: "473 ml",
    dureeReferenceJours: 21,
    noteMetier: "Variante saveur mangue. 15 ml dilués dans 1 L d'eau (~30 doses).",
    recommendedProgram: "Programme Starter",
    active: true,
  },
  {
    id: "aloe-xxl",
    name: "Aloe Vera Mangue XXL (1.9L)",
    category: "hydratation / aloe",
    pricePublic: 200.5,
    pv: 91.1,
    quantiteLabel: "1.892 L (≈ 4× 473 ml)",
    dureeReferenceJours: 84,
    noteMetier:
      "Format XXL équivalent à 4 bouteilles 473 ml. Dosage 15 ml par L de boisson, ~84 jours de cure.",
    recommendedProgram: "Programme Starter",
    active: true,
  },
  {
    id: "alo-max",
    name: "AloeMax (concentré)",
    category: "hydratation / aloe",
    pricePublic: 62,
    pv: 28.15,
    quantiteLabel: "30 doses",
    dureeReferenceJours: 30,
    noteMetier: "Aloe concentré format avancé.",
    recommendedProgram: "Suivi personnalisé",
    active: true,
  },

  // ── F1 (sachets et formats alternatifs) ─────────────────────────────────
  {
    id: "f1-sachets",
    name: "Formula 1 (7 sachets)",
    category: "shake / repas",
    pricePublic: 26.5,
    pv: 10,
    quantiteLabel: "7 sachets",
    dureeReferenceJours: 7,
    noteMetier: "Format dépannage — 1 dose / jour sur 7 jours.",
    recommendedProgram: "Suivi personnalisé",
    active: true,
  },
  {
    id: "f1-780g",
    name: "Formula 1 Vanille (780g)",
    category: "shake / repas",
    pricePublic: 80,
    pv: 32.75,
    quantiteLabel: "30 doses",
    dureeReferenceJours: 30,
    noteMetier: "Gros format — 1 dose / jour sur 30 jours.",
    recommendedProgram: "Programme Premium",
    active: true,
  },
  {
    id: "f1-express-bars",
    name: "Barres Repas F1 Express",
    category: "shake / repas / encas",
    pricePublic: 31,
    pv: 14,
    quantiteLabel: "7 barres",
    dureeReferenceJours: 7,
    noteMetier: "Substitut repas nomade. Saveurs : chocolat noir / cranberry-chocolat blanc.",
    recommendedProgram: "Suivi personnalisé",
    active: true,
  },
  {
    id: "tri-blend-select",
    name: "Tri Blend Select Banane",
    category: "shake / repas",
    pricePublic: 91,
    pv: 37.5,
    quantiteLabel: "30 doses",
    dureeReferenceJours: 30,
    noteMetier: "Shake premium 3 sources de protéines.",
    recommendedProgram: "Programme Premium",
    active: true,
  },

  // ── PROTEINES (Vegan, Préparation cuisson) ──────────────────────────────
  {
    id: "vegan-protein",
    name: "Mélange Vegan pour Boisson Protéinée",
    category: "proteine",
    pricePublic: 71.5,
    pv: 31.45,
    quantiteLabel: "42 doses",
    dureeReferenceJours: 42,
    noteMetier: "Alternative végétale au PDM.",
    recommendedProgram: "Programme Premium",
    active: true,
  },
  {
    id: "prep-proteine-cuisine",
    name: "Préparation Protéinée à Cuisiner",
    category: "proteine",
    pricePublic: 66,
    pv: 26.9,
    quantiteLabel: "30 doses",
    dureeReferenceJours: 30,
    noteMetier: "Pour intégrer protéines dans plats salés/sucrés.",
    recommendedProgram: "Suivi personnalisé",
    active: true,
  },

  // ── BOISSONS THE (saveurs et grand format) ──────────────────────────────
  {
    id: "the-51g-citron",
    name: "Thé Citron (51g)",
    category: "hydratation / routine",
    pricePublic: 41,
    pv: 19.95,
    quantiteLabel: "51 g",
    dureeReferenceJours: 21,
    noteMetier: "Variante saveur citron.",
    recommendedProgram: "Programme Starter",
    active: true,
  },
  {
    id: "the-51g-peche",
    name: "Thé Pêche (51g)",
    category: "hydratation / routine",
    pricePublic: 41,
    pv: 19.95,
    quantiteLabel: "51 g",
    dureeReferenceJours: 21,
    noteMetier: "Variante saveur pêche.",
    recommendedProgram: "Programme Starter",
    active: true,
  },
  {
    id: "the-51g-framboise",
    name: "Thé Framboise (51g)",
    category: "hydratation / routine",
    pricePublic: 41,
    pv: 19.95,
    quantiteLabel: "51 g",
    dureeReferenceJours: 21,
    noteMetier: "Variante saveur framboise.",
    recommendedProgram: "Programme Starter",
    active: true,
  },
  {
    id: "the-102g",
    name: "Thé Classique (102g)",
    category: "hydratation / routine",
    pricePublic: 73.5,
    pv: 34.95,
    quantiteLabel: "102 g",
    dureeReferenceJours: 42,
    noteMetier: "Grand format ≈ 42 jours.",
    recommendedProgram: "Programme Premium",
    active: true,
  },
  {
    id: "the-102g-mangue-dragon",
    name: "Thé Mangue-Dragon (102g)",
    category: "hydratation / routine",
    pricePublic: 73.5,
    pv: 34.95,
    quantiteLabel: "102 g",
    dureeReferenceJours: 42,
    noteMetier: "Grand format ≈ 42 jours — parfum mangue fruit du dragon (SKU 331K). Prix déduit du thé 102g (même PV), à confirmer si prix officiel différent.",
    recommendedProgram: "Programme Premium",
    active: true,
  },
  {
    id: "iced-coffee-latte",
    name: "Iced Coffee Latte Macchiato",
    category: "energie / proteine",
    pricePublic: 73.5,
    pv: 30.55,
    quantiteLabel: "30 doses",
    dureeReferenceJours: 30,
    noteMetier: "Café protéiné ready-to-go.",
    recommendedProgram: "Suivi personnalisé",
    active: true,
  },

  // ── COMPLEMENTS (vitamines, oméga, etc) ─────────────────────────────────
  {
    id: "herbalifeline-max",
    name: "Herbalifeline Max",
    category: "complements / omega",
    pricePublic: 41,
    pv: 19.4,
    quantiteLabel: "30 jours",
    dureeReferenceJours: 30,
    noteMetier: "Oméga 3 EPA/DHA.",
    recommendedProgram: "Suivi personnalisé",
    active: true,
  },
  {
    id: "mineral-complex",
    name: "Mineral Complex Plus",
    category: "complements / mineraux",
    pricePublic: 41,
    pv: 15.75,
    quantiteLabel: "30 jours",
    dureeReferenceJours: 30,
    noteMetier: "Apport minéraux quotidien.",
    recommendedProgram: "Suivi personnalisé",
    active: true,
  },
  {
    id: "vitamines-homme",
    name: "Complexe Vitamines & Minéraux — Homme",
    category: "complements / vitamines",
    pricePublic: 31,
    pv: 13.55,
    quantiteLabel: "30 jours",
    dureeReferenceJours: 30,
    noteMetier: "Multivitamines homme.",
    recommendedProgram: "Suivi personnalisé",
    active: true,
  },
  {
    id: "vitamines-femme",
    name: "Complexe Vitamines & Minéraux — Femme",
    category: "complements / vitamines",
    pricePublic: 31,
    pv: 13.55,
    quantiteLabel: "30 jours",
    dureeReferenceJours: 30,
    noteMetier: "Multivitamines femme.",
    recommendedProgram: "Suivi personnalisé",
    active: true,
  },
  {
    id: "niteworks",
    name: "Niteworks",
    category: "complements / vasculaire",
    pricePublic: 113,
    pv: 48.75,
    quantiteLabel: "30 jours",
    dureeReferenceJours: 30,
    noteMetier: "Soutien vasculaire / oxyde nitrique.",
    recommendedProgram: "Suivi personnalisé",
    active: true,
  },

  // ── GELS VITA (gummies) ─────────────────────────────────────────────────
  {
    id: "viewvita",
    name: "Gels ViewVita — vue (baies rouges agrumes)",
    category: "complements / gels",
    pricePublic: 67.5,
    pv: 27.2,
    quantiteLabel: "30 gommes",
    dureeReferenceJours: 30,
    noteMetier: "Gummies pour la santé visuelle.",
    recommendedProgram: "Suivi personnalisé",
    active: true,
  },
  {
    id: "coq10vita",
    name: "Gels CoQ10Vita — saveur cerise",
    category: "complements / gels",
    pricePublic: 57.5,
    pv: 23.2,
    quantiteLabel: "30 gommes",
    dureeReferenceJours: 30,
    noteMetier: "Coenzyme Q10 en gummies.",
    recommendedProgram: "Suivi personnalisé",
    active: true,
  },
  {
    id: "kids-nutrient-vita",
    name: "Gels NutrientVita Kids — tutti frutti",
    category: "complements / kids",
    pricePublic: 23,
    pv: 9.3,
    quantiteLabel: "30 gommes",
    dureeReferenceJours: 30,
    noteMetier: "Multivitamines enfants en gummies.",
    recommendedProgram: "Suivi personnalisé",
    active: true,
  },
  {
    id: "kids-mindvita",
    name: "Gels MindVita Kids — citron baies rouges",
    category: "complements / kids",
    pricePublic: 51,
    pv: 20.5,
    quantiteLabel: "30 gommes",
    dureeReferenceJours: 30,
    noteMetier: "Concentration enfants en gummies.",
    recommendedProgram: "Suivi personnalisé",
    active: true,
  },
  {
    id: "coffret-phyto",
    name: "Coffret Phyto Complete",
    category: "gelules / complements",
    pricePublic: 95,
    pv: 38.15,
    quantiteLabel: "60 capsules",
    dureeReferenceJours: 30,
    noteMetier: "Format coffret cadeau du Phyto Complete.",
    recommendedProgram: "Programme Booster 2",
    active: true,
  },

  // ── SPORT / H24 ─────────────────────────────────────────────────────────
  {
    id: "achieve-h24-cookie",
    name: "Barre Achieve — Cookie Dough",
    category: "sport / encas",
    pricePublic: 27.5,
    pv: 11.3,
    quantiteLabel: "6 barres",
    dureeReferenceJours: 6,
    noteMetier: "Barres protéinées sport.",
    recommendedProgram: "Programme Sport",
    active: true,
  },
  {
    id: "achieve-h24-darkchoc",
    name: "Barre Achieve — Chocolat Noir",
    category: "sport / encas",
    pricePublic: 27.5,
    pv: 11.3,
    quantiteLabel: "6 barres",
    dureeReferenceJours: 6,
    noteMetier: "Barres protéinées sport.",
    recommendedProgram: "Programme Sport",
    active: true,
  },
  {
    id: "liftoff-max-h24",
    name: "LiftOff Max — Pamplemousse",
    category: "sport / energie",
    pricePublic: 38.5,
    pv: 15.95,
    quantiteLabel: "10 sachets",
    dureeReferenceJours: 10,
    noteMetier: "Booster énergie pré-training.",
    recommendedProgram: "Programme Sport",
    active: true,
  },
  {
    id: "h24-prolong",
    name: "Gels Prolong (effort)",
    category: "sport / energie",
    pricePublic: 30,
    pv: 13.6,
    quantiteLabel: "10 sachets",
    dureeReferenceJours: 10,
    noteMetier: "Gels énergétiques pendant l'effort.",
    recommendedProgram: "Programme Sport",
    active: true,
  },
  {
    id: "rebuild-strength-sachets",
    name: "Herbalife 24 — Rebuild Strength (7 sachets)",
    category: "sport / muscle",
    pricePublic: 35.5,
    pv: 15.2,
    quantiteLabel: "7 sachets de 50g",
    dureeReferenceJours: 7,
    noteMetier: "Format dépannage 7 jours du Rebuild Strength.",
    recommendedProgram: "Programme Sport",
    active: true,
  },
  {
    id: "h24-creatine",
    name: "Herbalife 24 — Creatine +",
    category: "sport / muscle",
    pricePublic: 39.5,
    pv: 15.95,
    quantiteLabel: "228 g — 30 jours",
    dureeReferenceJours: 30,
    noteMetier: "Créatine monohydrate pour la force.",
    recommendedProgram: "Programme Sport",
    active: true,
  },
  {
    id: "h24-restore",
    name: "Herbalife 24 — Restore",
    category: "sport / muscle",
    pricePublic: 45,
    pv: 23.55,
    quantiteLabel: "30 jours",
    dureeReferenceJours: 30,
    noteMetier: "Récupération antioxydante.",
    recommendedProgram: "Programme Sport",
    active: true,
  },
  {
    id: "cr7-drive-540g",
    name: "CR7 Drive Açaï (540g)",
    category: "sport / hydratation",
    pricePublic: 27.5,
    pv: 12.5,
    quantiteLabel: "18 doses",
    dureeReferenceJours: 18,
    noteMetier: "Boisson énergétique sport CR7.",
    recommendedProgram: "Programme Sport",
    active: true,
  },
  {
    id: "cr7-drive-sachets",
    name: "CR7 Drive Açaï (10 sachets)",
    category: "sport / hydratation",
    pricePublic: 16.5,
    pv: 8,
    quantiteLabel: "10 sachets",
    dureeReferenceJours: 10,
    noteMetier: "Format dépannage CR7 Drive.",
    recommendedProgram: "Programme Sport",
    active: true,
  },
  {
    id: "collagen-skin-booster",
    name: "Collagen Skin Booster",
    category: "soin / peau collagène",
    pricePublic: 84.5,
    pv: 37.1,
    quantiteLabel: "30 doses",
    dureeReferenceJours: 30,
    noteMetier: "Collagène hydrolysé pour peau/articulations.",
    recommendedProgram: "Suivi personnalisé",
    active: true,
  },

  // ── SOINS VISAGE (HL/Skin & gamme visage) ───────────────────────────────
  // Source : Liste de prix distributeurs Herbalife France, vigueur 25/06/2026.
  {
    id: "hlskin-niacinamide",
    name: "HL/Skin Sérum Niacinamide 10%",
    category: "soin / visage",
    pricePublic: 64.5,
    pv: 31.7,
    quantiteLabel: "30 ml",
    dureeReferenceJours: 60,
    noteMetier: "Sérum éclat / pores resserrés — gamme HL/Skin.",
    recommendedProgram: "Suivi personnalisé",
    active: true,
  },
  {
    id: "hlskin-gel-nettoyant",
    name: "HL/Skin Gel Nettoyant Resurfaçant",
    category: "soin / visage",
    pricePublic: 43.5,
    pv: 21.3,
    quantiteLabel: "150 ml",
    dureeReferenceJours: 45,
    noteMetier: "Nettoyant resurfaçant quotidien — gamme HL/Skin.",
    recommendedProgram: "Suivi personnalisé",
    active: true,
  },
  {
    id: "hlskin-creme-tension",
    name: "HL/Skin Crème Tension Ultime",
    category: "soin / visage",
    pricePublic: 71.5,
    pv: 35.2,
    quantiteLabel: "50 ml",
    dureeReferenceJours: 60,
    noteMetier: "Crème anti-âge effet tenseur — gamme HL/Skin.",
    recommendedProgram: "Suivi personnalisé",
    active: true,
  },
  {
    id: "hlskin-lotion-mains-corps",
    name: "HL/Skin Lotion Mains & Corps",
    category: "soin / visage",
    pricePublic: 32,
    pv: 15.9,
    quantiteLabel: "200 ml",
    dureeReferenceJours: 45,
    noteMetier: "Lotion nourrissante mains et corps — gamme HL/Skin.",
    recommendedProgram: "Suivi personnalisé",
    active: true,
  },
  {
    id: "hlskin-contour-yeux",
    name: "HL/Skin Crème Contour Yeux",
    category: "soin / visage",
    pricePublic: 60,
    pv: 26.7,
    quantiteLabel: "15 ml",
    dureeReferenceJours: 60,
    noteMetier: "Crème contour des yeux nourrissante — gamme HL/Skin.",
    recommendedProgram: "Suivi personnalisé",
    active: true,
  },
  {
    id: "soin-nettoyant-aloe",
    name: "Nettoyant Apaisant Aloe (150ml)",
    category: "soin / visage",
    pricePublic: 33,
    pv: 16.75,
    quantiteLabel: "150 ml",
    dureeReferenceJours: 45,
    noteMetier: "Nettoyant visage apaisant à l'aloe.",
    recommendedProgram: "Suivi personnalisé",
    active: true,
  },
  {
    id: "soin-gommage-agrumes",
    name: "Gommage Agrumes (150ml)",
    category: "soin / visage",
    pricePublic: 33,
    pv: 16.75,
    quantiteLabel: "150 ml",
    dureeReferenceJours: 60,
    noteMetier: "Exfoliant doux nettoyant aux agrumes.",
    recommendedProgram: "Suivi personnalisé",
    active: true,
  },
  {
    id: "soin-lotion-tonique",
    name: "Lotion Tonique Revitalisante",
    category: "soin / visage",
    pricePublic: 25,
    pv: 12.7,
    quantiteLabel: "50 ml",
    dureeReferenceJours: 45,
    noteMetier: "Tonique revitalisant après nettoyage.",
    recommendedProgram: "Suivi personnalisé",
    active: true,
  },
  {
    id: "soin-gel-fermete-yeux",
    name: "Gel Fermeté Contour Yeux",
    category: "soin / visage",
    pricePublic: 52,
    pv: 26.35,
    quantiteLabel: "15 ml",
    dureeReferenceJours: 60,
    noteMetier: "Gel raffermissant contour des yeux.",
    recommendedProgram: "Suivi personnalisé",
    active: true,
  },
  {
    id: "soin-creme-yeux",
    name: "Crème Hydratante Contour Yeux",
    category: "soin / visage",
    pricePublic: 52,
    pv: 26.35,
    quantiteLabel: "15 ml",
    dureeReferenceJours: 60,
    noteMetier: "Crème hydratante contour des yeux.",
    recommendedProgram: "Suivi personnalisé",
    active: true,
  },
  {
    id: "soin-exfoliant-baies",
    name: "Exfoliant Baies Rouges",
    category: "soin / visage",
    pricePublic: 26,
    pv: 13.1,
    quantiteLabel: "120 ml",
    dureeReferenceJours: 60,
    noteMetier: "Exfoliant visage aux baies rouges.",
    recommendedProgram: "Suivi personnalisé",
    active: true,
  },
  {
    id: "soin-masque-argile",
    name: "Masque Argile Menthe",
    category: "soin / visage",
    pricePublic: 28,
    pv: 14.2,
    quantiteLabel: "120 ml",
    dureeReferenceJours: 60,
    noteMetier: "Masque purifiant argile & menthe.",
    recommendedProgram: "Suivi personnalisé",
    active: true,
  },
  {
    id: "soin-creme-nuit",
    name: "Crème de Nuit Régénératrice",
    category: "soin / visage",
    pricePublic: 64.5,
    pv: 32.65,
    quantiteLabel: "50 ml",
    dureeReferenceJours: 60,
    noteMetier: "Crème de nuit régénérante.",
    recommendedProgram: "Suivi personnalisé",
    active: true,
  },
  {
    id: "soin-hydratant-fps30",
    name: "Hydratant Jour FPS 30",
    category: "soin / visage",
    pricePublic: 64.5,
    pv: 32.65,
    quantiteLabel: "50 ml",
    dureeReferenceJours: 60,
    noteMetier: "Soin de jour avec protection FPS 30.",
    recommendedProgram: "Suivi personnalisé",
    active: true,
  },
  {
    id: "soin-serum-rides",
    name: "Sérum Réducteur de Rides",
    category: "soin / visage",
    pricePublic: 86,
    pv: 43.35,
    quantiteLabel: "50 ml",
    dureeReferenceJours: 90,
    noteMetier: "Sérum anti-rides intensif.",
    recommendedProgram: "Suivi personnalisé",
    active: true,
  },
  {
    id: "soin-hydratant-eclat",
    name: "Hydratant Éclat Quotidien",
    category: "soin / visage",
    pricePublic: 64.5,
    pv: 32.65,
    quantiteLabel: "50 ml",
    dureeReferenceJours: 60,
    noteMetier: "Soin de jour éclat quotidien.",
    recommendedProgram: "Suivi personnalisé",
    active: true,
  },

  // ── SOINS CORPS & CHEVEUX (Herbal Aloe) ─────────────────────────────────
  {
    id: "herbal-aloe-savon",
    name: "Herbal Aloe Savon Mains & Corps",
    category: "soin / corps & cheveux",
    pricePublic: 18.5,
    pv: 8.3,
    quantiteLabel: "250 ml",
    dureeReferenceJours: 45,
    noteMetier: "Savon liquide mains et corps à l'aloe.",
    recommendedProgram: "Suivi personnalisé",
    active: true,
  },
  {
    id: "herbal-aloe-gel-apaisant",
    name: "Herbal Aloe Gel Apaisant",
    category: "soin / corps & cheveux",
    pricePublic: 18,
    pv: 8.3,
    quantiteLabel: "200 ml",
    dureeReferenceJours: 45,
    noteMetier: "Gel apaisant multi-usage à l'aloe.",
    recommendedProgram: "Suivi personnalisé",
    active: true,
  },
  {
    id: "herbal-aloe-shampoing",
    name: "Herbal Aloe Shampoing Fortifiant",
    category: "soin / corps & cheveux",
    pricePublic: 18,
    pv: 8.3,
    quantiteLabel: "250 ml",
    dureeReferenceJours: 45,
    noteMetier: "Shampoing fortifiant à l'aloe.",
    recommendedProgram: "Suivi personnalisé",
    active: true,
  },
  {
    id: "herbal-aloe-apres-shampoing",
    name: "Herbal Aloe Après-shampoing",
    category: "soin / corps & cheveux",
    pricePublic: 18,
    pv: 8.3,
    quantiteLabel: "250 ml",
    dureeReferenceJours: 45,
    noteMetier: "Après-shampoing fortifiant à l'aloe.",
    recommendedProgram: "Suivi personnalisé",
    active: true,
  },

  // ── PACKS ───────────────────────────────────────────────────────────────
  {
    id: "pack-essai",
    name: "Pack essai (3×2 sachets F1 + 2 sachets thé)",
    category: "packs / découverte",
    pricePublic: 34,
    pv: 12.4,
    quantiteLabel: "Pack découverte",
    dureeReferenceJours: 3,
    noteMetier: "Pack mini pour faire goûter à un prospect.",
    recommendedProgram: "Suivi personnalisé",
    active: true,
  },
];

function addDays(input: string, days: number) {
  const date = new Date(input);
  date.setDate(date.getDate() + days);
  return date.toISOString();
}

function diffDays(input: string, reference = new Date()) {
  const date = new Date(input);
  const delta = reference.getTime() - date.getTime();
  return Math.max(0, Math.floor(delta / DAY_MS));
}

function isSameMonth(input: string, reference = new Date()) {
  const date = new Date(input);
  return (
    date.getFullYear() === reference.getFullYear() &&
    date.getMonth() === reference.getMonth()
  );
}

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

export function getPvProgramById(programId: string | null | undefined) {
  if (!programId) {
    return null;
  }

  return pvProgramOptions.find((program) => program.id === programId) ?? null;
}

/**
 * Programme neutre de repli : routine VIDE.
 *
 * Fix 2026-07-16 (audit programmes) : le repli etait `pvProgramOptions[0]` =
 * Starter. Consequence, tout titre non reconnu ("À l'unité", "Programme a
 * confirmer", "") injectait silencieusement les 3 produits de la routine
 * Starter (aloe-vera + the-51g + formula-1) dans pv_client_products → PV et
 * rentabilite faux sur des clients qui n'avaient rien pris. On replie
 * desormais sur "unit" (includedProductIds: []) : un titre inconnu ne peut
 * plus fabriquer de produits, il n'ajoute rien.
 */
const PV_PROGRAM_FALLBACK =
  pvProgramOptions.find((program) => program.id === "unit") ?? pvProgramOptions[0];

export function resolvePvProgram(programTitleOrId: string | null | undefined) {
  const byId = getPvProgramById(programTitleOrId);
  if (byId) {
    return byId;
  }

  const normalized = normalize(programTitleOrId ?? "");
  return (
    pvProgramOptions.find((program) => {
      const aliases = [program.title, ...(program.alias ?? [])];
      return aliases.some((alias) => normalize(alias) === normalized);
    }) ??
    pvProgramOptions.find((program) =>
      normalized.includes(normalize(program.title.replace("Programme ", "")))
    ) ??
    PV_PROGRAM_FALLBACK
  );
}

function getProduct(productId: string) {
  return pvProductCatalog.find((product) => product.id === productId) ?? null;
}

function getClientPvProductIds(client: Client) {
  const firstAssessment = getFirstAssessment(client);
  const selectedProductIds = firstAssessment.questionnaire.selectedProductIds ?? [];
  const validSelectedProductIds = selectedProductIds.filter((productId, index, array) =>
    array.indexOf(productId) === index && Boolean(getProduct(productId))
  );
  const program = resolvePvProgram(client.pvProgramId ?? client.currentProgram);

  return validSelectedProductIds.length ? validSelectedProductIds : program.includedProductIds;
}

export function buildSeedPvClientProductsForClient(client: Client): PvClientProductRecord[] {
  if (!client.started || !client.currentProgram.trim()) {
    return [];
  }

  const firstAssessment = getFirstAssessment(client);
  const startDate = client.startDate ?? firstAssessment.date;
  const program = resolvePvProgram(client.pvProgramId ?? client.currentProgram);
  const productIds = getClientPvProductIds(client);

  return productIds.flatMap((productId) => {
    const product = getProduct(productId);
    if (!product) {
      return [];
    }

    return [
      {
        id: `pv-seed-${client.id}-${product.id}`,
        clientId: client.id,
        responsibleId: client.distributorId,
        responsibleName: client.distributorName,
        programId: program.id,
        productId: product.id,
        productName: product.name,
        quantityStart: 1,
        startDate,
        durationReferenceDays: product.dureeReferenceJours,
        pvPerUnit: product.pv,
        pricePublicPerUnit: product.pricePublic,
        quantiteLabel: product.quantiteLabel,
        noteMetier: product.noteMetier,
        active: true
      }
    ];
  });
}

function buildBaseTransactions(clients: Client[]) {
  return clients.flatMap((client) => {
    if (!client.started || !client.currentProgram.trim()) {
      return [];
    }

    const firstAssessment = getFirstAssessment(client);
    const startDate = client.startDate ?? firstAssessment.date;
    const program = resolvePvProgram(client.pvProgramId ?? client.currentProgram);
    const productIds = getClientPvProductIds(client);

    return productIds.flatMap((productId, index) => {
      const product = getProduct(productId);
      if (!product) {
        return [];
      }

      return [
        {
          id: `pv-base-${client.id}-${product.id}`,
          date: addDays(startDate, index),
          clientId: client.id,
          clientName: `${client.firstName} ${client.lastName}`,
          responsibleId: client.distributorId,
          responsibleName: client.distributorName,
          productId: product.id,
          productName: product.name,
          quantity: 1,
          pv: product.pv,
          price: product.pricePublic,
          type: "commande" as PvTransactionType,
          note: `Demarrage ${program.title}`
        }
      ];
    });
  });
}

function mergeClientProducts(
  clients: Client[],
  persistedProducts: PvClientProductRecord[]
) {
  const merged = new Map<string, PvClientProductRecord>();

  clients.forEach((client) => {
    buildSeedPvClientProductsForClient(client).forEach((product) => {
      merged.set(`${product.clientId}:${product.productId}`, product);
    });
  });

  persistedProducts.forEach((product) => {
    merged.set(`${product.clientId}:${product.productId}`, product);
  });

  return [...merged.values()].filter((product) => product.active);
}

function getProductStatus(daysSinceStart: number, daysRemaining: number): PvProductStatus {
  if (daysRemaining <= 7) {
    return "restock";
  }

  if (daysRemaining < -7) {
    return "inconsistent";
  }

  if (daysSinceStart > 0 && daysRemaining <= 0) {
    return "watch";
  }

  return "ok";
}

function getClientStatus(
  productStatuses: PvProductStatus[],
  nextFollowUp: string
): PvStatus {
  const daysUntilFollowUp = Math.ceil(
    (new Date(nextFollowUp).getTime() - Date.now()) / DAY_MS
  );

  if (daysUntilFollowUp <= 0) {
    return "follow-up";
  }

  if (productStatuses.includes("inconsistent")) {
    return "inconsistent";
  }

  if (productStatuses.includes("restock")) {
    return "restock";
  }

  if (productStatuses.includes("watch") || daysUntilFollowUp <= 7) {
    return "watch";
  }

  return "ok";
}

function getActiveProducts(
  client: Client,
  clientProducts: PvClientProductRecord[]
): PvProductUsage[] {
  return clientProducts
    .filter((product) => product.clientId === client.id && product.active)
    .map((product) => {
      const daysSinceStart = diffDays(product.startDate);
      const estimatedRemainingDays = product.durationReferenceDays - daysSinceStart;
      const status = getProductStatus(daysSinceStart, estimatedRemainingDays);

      return {
        id: `${client.id}-${product.productId}`,
        recordId: product.id,
        programId: product.programId,
        productId: product.productId,
        productName: product.productName,
        quantityStart: product.quantityStart,
        startDate: product.startDate,
        durationReferenceDays: product.durationReferenceDays,
        estimatedRemainingDays,
        nextProbableOrderDate: addDays(product.startDate, product.durationReferenceDays),
        pvPerUnit: product.pvPerUnit,
        pricePublicPerUnit: product.pricePublicPerUnit,
        quantiteLabel: product.quantiteLabel,
        noteMetier: product.noteMetier,
        status
      };
    })
    .sort((left, right) => left.estimatedRemainingDays - right.estimatedRemainingDays);
}

export function buildPvTrackingRecords(
  clients: Client[],
  extraTransactions: PvClientTransaction[] = [],
  persistedProducts: PvClientProductRecord[] = []
): PvClientTrackingRecord[] {
  // 2026-04-29 : on inclut aussi les clients qui ont au moins un produit
  // tracke (pv_client_products) ou une transaction recente. Sinon les clients
  // pas encore "started" (ex: Sylvie Chaumont en pause) restaient invisibles
  // meme apres qu'on leur ait enregistre une commande.
  const clientIdsWithProducts = new Set(
    persistedProducts.filter((p) => p.active).map((p) => p.clientId),
  );
  const clientIdsWithTransactions = new Set(
    extraTransactions.map((t) => t.clientId),
  );
  const eligibleClients = clients.filter(
    (client) =>
      (client.started && Boolean(client.currentProgram.trim())) ||
      clientIdsWithProducts.has(client.id) ||
      clientIdsWithTransactions.has(client.id),
  );
  const allTransactions = [...extraTransactions, ...buildBaseTransactions(eligibleClients)];
  const allClientProducts = mergeClientProducts(eligibleClients, persistedProducts);

  return eligibleClients.map((client) => {
    const latestAssessment = getLatestAssessment(client);
    const startDate = client.startDate ?? getFirstAssessment(client).date;
    const program = resolvePvProgram(client.pvProgramId ?? client.currentProgram);
    const clientTransactions = allTransactions
      .filter((transaction) => transaction.clientId === client.id)
      .sort((left, right) => new Date(right.date).getTime() - new Date(left.date).getTime());
    const activeProducts = getActiveProducts(client, allClientProducts);
    const daysSinceStart = diffDays(startDate);
    const estimatedRemainingDays =
      activeProducts[0]?.estimatedRemainingDays ??
      program.mainReferenceDurationDays - daysSinceStart;
    const lastOrderDate = clientTransactions[0]?.date ?? startDate;
    const nextProbableOrderDate =
      activeProducts[0]?.nextProbableOrderDate ??
      addDays(startDate, program.mainReferenceDurationDays);
    // Règle « sur place = 0 PV » (2026-06-16, décision Thomas) : une vente prise
    // sur place (au comptoir du club) ne doit JAMAIS ajouter de PV au compteur
    // du client — le volume est déjà compté côté club/Bizworks, on ne le
    // double-compte pas. On exclut donc les transactions « reprise-sur-place »
    // du PV cumulé et du PV du mois. La rentabilité (€) n'est pas concernée
    // (elle marche sur le prix, pas sur le PV).
    const countsPv = (t: { type: PvTransactionType }) => t.type !== "reprise-sur-place";
    const pvCumulative = Number(
      clientTransactions
        .filter(countsPv)
        .reduce((total, transaction) => total + transaction.pv, 0)
        .toFixed(2)
    );
    const monthlyPv = Number(
      clientTransactions
        .filter((transaction) => countsPv(transaction) && isSameMonth(transaction.date))
        .reduce((total, transaction) => total + transaction.pv, 0)
        .toFixed(2)
    );

    return {
      clientId: client.id,
      clientName: `${client.firstName} ${client.lastName}`,
      responsibleId: client.distributorId,
      responsibleName: client.distributorName,
      programId: program.id,
      program: program.title,
      status: getClientStatus(
        activeProducts.map((product) => product.status),
        client.nextFollowUp
      ),
      startDate,
      lastFollowUpDate: latestAssessment.date,
      lastOrderDate,
      daysSinceStart,
      estimatedRemainingDays,
      nextProbableOrderDate,
      pvCumulative,
      monthlyPv,
      activeProducts,
      transactions: clientTransactions
    };
  });
}

export function flattenPvTransactions(records: PvClientTrackingRecord[]) {
  return records
    .flatMap((record) => record.transactions)
    .sort((left, right) => new Date(right.date).getTime() - new Date(left.date).getTime());
}

export function getPvStatusMeta(status: PvStatus) {
  if (status === "ok") {
    return { label: "RAS", tone: "green" as const };
  }
  if (status === "watch") {
    return { label: "A surveiller", tone: "amber" as const };
  }
  if (status === "restock") {
    return { label: "Reassort probable", tone: "blue" as const };
  }
  if (status === "inconsistent") {
    return { label: "Incoherence conso", tone: "red" as const };
  }
  return { label: "A relancer", tone: "amber" as const };
}

export function getPvProductStatusMeta(status: PvProductStatus) {
  if (status === "ok") {
    return { label: "OK", tone: "green" as const };
  }
  if (status === "restock") {
    return { label: "Reassort", tone: "blue" as const };
  }
  if (status === "watch") {
    return { label: "A surveiller", tone: "amber" as const };
  }
  return { label: "Incoherence", tone: "red" as const };
}

export function getPvTypeLabel(type: PvTransactionType) {
  return type === "commande" ? "Commande" : "Reprise sur place";
}
