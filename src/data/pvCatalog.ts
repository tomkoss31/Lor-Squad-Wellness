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

export const pvProgramOptions: PvProgramOption[] = [
  {
    id: "starter",
    title: "Programme Starter",
    alias: ["Programme Decouverte", "Programme Starter", "Decouverte", "Starter"],
    summary: "Base simple pour suivre le demarrage et le renouvellement des produits principaux.",
    pricePublic: 159,
    includedProductIds: ["aloe-vera", "the-51g", "formula-1"],
    mainReferenceDurationDays: 21,
    active: true
  },
  {
    id: "premium",
    title: "Programme Premium",
    summary: "Routine plus complete avec proteines en plus pour tenir dans le temps.",
    pricePublic: 234,
    includedProductIds: ["aloe-vera", "the-51g", "formula-1", "pdm"],
    mainReferenceDurationDays: 42,
    active: true
  },
  {
    id: "booster-1",
    title: "Programme Booster 1",
    summary: "Version plus structuree avec fibres et lecture volume plus precise.",
    pricePublic: 277,
    includedProductIds: ["aloe-vera", "the-51g", "formula-1", "pdm", "multifibres"],
    mainReferenceDurationDays: 42,
    active: true
  },
  {
    id: "booster-2",
    title: "Programme Booster 2",
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
    name: "Boisson Aloe Vera",
    category: "hydratation",
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
    name: "Boisson instantanee a base de the 51 g",
    category: "hydratation / routine",
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
    name: "Herbalife 24 — Hydrate",
    category: "hydratation",
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
  // Source : Liste de prix distributeurs Herbalife France, vigueur 10/03/2026.

  // ── ALOE VERA (3 variantes) ─────────────────────────────────────────────
  {
    id: "aloe-mangue-473",
    name: "Boisson Aloe Vera saveur Mangue (473 ml)",
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
    name: "Boisson Aloe Vera saveur Mangue XXL (1.892 L)",
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
    name: "AloeMax",
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
    name: "Formula 1 — 7 sachets (Vanille / Cookie / Chocolat)",
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
    name: "Formula 1 — Saveur Vanille (780 g)",
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
    name: "Tri Blend Select — saveur banane",
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
    name: "Boisson Thé 51 g — saveur Citron",
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
    name: "Boisson Thé 51 g — saveur Pêche",
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
    name: "Boisson Thé 51 g — saveur Framboise",
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
    name: "Boisson Thé 102 g (grand format)",
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
    id: "iced-coffee-latte",
    name: "High Protein Iced Coffee Latte Macchiato",
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
    name: "Barres Achieve H24 — Chocolate Chip Cookie Dough",
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
    name: "Barres Achieve H24 — Chocolat Noir",
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
    name: "LiftOff Max H24 — Pamplemousse",
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
    name: "Herbalife 24 — Gels énergétiques Prolong",
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
    name: "CR7 Drive — saveur Açaï (540 g)",
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
    name: "CR7 Drive — saveur Açaï (10 sachets)",
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
    category: "sport / collagen",
    pricePublic: 84.5,
    pv: 37.1,
    quantiteLabel: "30 doses",
    dureeReferenceJours: 30,
    noteMetier: "Collagène hydrolysé pour peau/articulations.",
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
    pvProgramOptions[0]
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
  const eligibleClients = clients.filter(
    (client) => client.started && Boolean(client.currentProgram.trim())
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
    const pvCumulative = Number(
      clientTransactions.reduce((total, transaction) => total + transaction.pv, 0).toFixed(2)
    );
    const monthlyPv = Number(
      clientTransactions
        .filter((transaction) => isSameMonth(transaction.date))
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
