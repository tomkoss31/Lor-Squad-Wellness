// src/data/herbalifeCatalog.ts
// Catalogue Herbalife France — Prix publics conseillés à la vente
// Source : Liste de prix distributeurs France — à compter du 10 mars 2026
// ⚠️ Ne pas modifier manuellement — mettre à jour depuis la liste officielle Herbalife

export type ProductCategory =
  | 'formula1'
  | 'select'
  | 'proteines'
  | 'complements'
  | 'complements_enfants'
  | 'boissons'
  | 'sport'
  | 'packs'

export type ProductObjective =
  | 'perte_de_poids'
  | 'prise_de_masse'
  | 'energie'
  | 'sport_performance'
  | 'bien_etre'
  | 'digestion'
  | 'immunite'
  | 'enfants'

export interface HerbalifeProduct {
  ref: string
  name: string
  shortName: string
  category: ProductCategory
  pv: number
  publicPrice: number
  vegan: boolean
  objectives: ProductObjective[]
  shortBenefit: string
  notes?: string
}

export const CATEGORY_LABELS: Record<ProductCategory, string> = {
  formula1: 'Formula 1',
  select: 'Select',
  proteines: 'En-cas & Protéines',
  complements: 'Compléments',
  complements_enfants: 'Compléments Enfants',
  boissons: 'Boissons',
  sport: 'Sport & Vitalité H24',
  packs: 'Packs',
}

export const OBJECTIVE_LABELS: Record<ProductObjective, string> = {
  perte_de_poids: 'Perte de poids',
  prise_de_masse: 'Prise de masse',
  energie: 'Énergie',
  sport_performance: 'Sport & Performance',
  bien_etre: 'Bien-être général',
  digestion: 'Digestion & Transit',
  immunite: 'Immunité',
  enfants: 'Enfants',
}

export const HERBALIFE_PRODUCTS: HerbalifeProduct[] = [
  // ─── FORMULA 1 ───
  { ref: '4462', name: 'Formula 1 Boisson Nutritionnelle — Crème de Banane 550g', shortName: 'Formula 1 Crème de Banane', category: 'formula1', pv: 23.95, publicPrice: 63.50, vegan: true, objectives: ['perte_de_poids', 'bien_etre'], shortBenefit: 'Repas équilibré · Contrôle des calories · Base du programme', notes: '550g' },
  { ref: '4463', name: 'Formula 1 Boisson Nutritionnelle — Délice de Fraise 550g', shortName: 'Formula 1 Fraise', category: 'formula1', pv: 23.95, publicPrice: 63.50, vegan: true, objectives: ['perte_de_poids', 'bien_etre'], shortBenefit: 'Repas équilibré · Contrôle des calories · Base du programme', notes: '550g' },
  { ref: '4465', name: 'Formula 1 Boisson Nutritionnelle — Café Latte 550g', shortName: 'Formula 1 Café Latte', category: 'formula1', pv: 23.95, publicPrice: 63.50, vegan: true, objectives: ['perte_de_poids', 'energie', 'bien_etre'], shortBenefit: 'Repas équilibré · Énergie matinale · Base du programme', notes: '550g' },
  { ref: '4466', name: 'Formula 1 Boisson Nutritionnelle — Vanille Onctueuse 550g', shortName: 'Formula 1 Vanille', category: 'formula1', pv: 23.95, publicPrice: 63.50, vegan: true, objectives: ['perte_de_poids', 'bien_etre'], shortBenefit: 'Repas équilibré · Contrôle des calories · Base du programme', notes: '550g' },
  { ref: '4467', name: 'Formula 1 Boisson Nutritionnelle — Cookie Crunch 550g', shortName: 'Formula 1 Cookie Crunch', category: 'formula1', pv: 23.95, publicPrice: 63.50, vegan: true, objectives: ['perte_de_poids', 'bien_etre'], shortBenefit: 'Repas équilibré · Contrôle des calories · Base du programme', notes: '550g' },
  { ref: '4468', name: 'Formula 1 Boisson Nutritionnelle — Chocolat Gourmand 550g', shortName: 'Formula 1 Chocolat', category: 'formula1', pv: 23.95, publicPrice: 63.50, vegan: true, objectives: ['perte_de_poids', 'bien_etre'], shortBenefit: 'Repas équilibré · Contrôle des calories · Base du programme', notes: '550g' },
  { ref: '4469', name: 'Formula 1 sans soja, sans lactose et sans gluten — Framboise & Chocolat Blanc 500g', shortName: 'Formula 1 Sans Allergènes', category: 'formula1', pv: 23.95, publicPrice: 63.50, vegan: true, objectives: ['perte_de_poids', 'bien_etre'], shortBenefit: 'Sans soja · Sans lactose · Sans gluten · Idéal intolérances', notes: '500g — sans allergènes' },
  { ref: '4471', name: 'Formula 1 Boisson Nutritionnelle — Duo Menthe Chocolat 550g', shortName: 'Formula 1 Menthe Chocolat', category: 'formula1', pv: 23.95, publicPrice: 63.50, vegan: true, objectives: ['perte_de_poids', 'bien_etre'], shortBenefit: 'Repas équilibré · Contrôle des calories · Base du programme', notes: '550g' },
  { ref: '048K', name: 'Formula 1 Boisson Nutritionnelle — Vanille Onctueuse 780g', shortName: 'Formula 1 Vanille Grand Format', category: 'formula1', pv: 32.75, publicPrice: 80.00, vegan: true, objectives: ['perte_de_poids', 'bien_etre'], shortBenefit: 'Grand format économique · Repas équilibré · Base du programme', notes: '780g — grand format' },
  { ref: '4472', name: 'Barres Repas Équilibre Formula 1 Express — Chocolat Noir', shortName: 'Barres F1 Chocolat Noir', category: 'formula1', pv: 14.00, publicPrice: 31.00, vegan: false, objectives: ['perte_de_poids', 'bien_etre'], shortBenefit: 'Repas pratique en déplacement · Contrôle des calories' },
  { ref: '4473', name: 'Barres Repas Équilibre Formula 1 Express — Cranberry & Chocolat Blanc', shortName: 'Barres F1 Cranberry', category: 'formula1', pv: 14.00, publicPrice: 31.00, vegan: false, objectives: ['perte_de_poids', 'bien_etre'], shortBenefit: 'Repas pratique en déplacement · Contrôle des calories' },

  // ─── SELECT ───
  { ref: '013K', name: 'Tri Blend Select — Saveur Banane', shortName: 'Tri Blend Select Banane', category: 'select', pv: 37.50, publicPrice: 91.00, vegan: true, objectives: ['prise_de_masse', 'sport_performance', 'bien_etre'], shortBenefit: 'Protéines + glucides + lipides · Idéal prise de masse · Post-entraînement' },

  // ─── EN-CAS & PROTÉINES ───
  { ref: '141K', name: 'Chips Protéinées — Saveur Barbecue 10x30g', shortName: 'Chips Protéinées Barbecue', category: 'proteines', pv: 11.75, publicPrice: 27.50, vegan: true, objectives: ['perte_de_poids', 'prise_de_masse', 'sport_performance'], shortBenefit: 'En-cas protéiné · Coupe-faim sain · Alternative chips classiques', notes: '10 sachets de 30g' },
  { ref: '142K', name: 'Chips Protéinées — Saveur Sour Cream & Onion 10x30g', shortName: 'Chips Protéinées Sour Cream', category: 'proteines', pv: 11.75, publicPrice: 27.50, vegan: true, objectives: ['perte_de_poids', 'prise_de_masse', 'sport_performance'], shortBenefit: 'En-cas protéiné · Coupe-faim sain · Alternative chips classiques', notes: '10 sachets de 30g' },
  { ref: '172K', name: 'Mélange Vegan pour Boisson Protéinée', shortName: 'Boisson Protéinée Vegan', category: 'proteines', pv: 31.45, publicPrice: 71.50, vegan: true, objectives: ['prise_de_masse', 'sport_performance', 'bien_etre'], shortBenefit: 'Protéines végétales · Prise de masse · 100% vegan' },
  { ref: '2600', name: 'Mélange pour Boisson Protéinée — Parfum Vanille', shortName: 'Boisson Protéinée Vanille', category: 'proteines', pv: 33.00, publicPrice: 75.00, vegan: false, objectives: ['prise_de_masse', 'sport_performance'], shortBenefit: 'Apport protéiné élevé · Prise de masse · Récupération musculaire' },
  { ref: '528K', name: 'Préparation Protéinée à Cuisiner', shortName: 'Protéines à Cuisiner', category: 'proteines', pv: 26.90, publicPrice: 66.00, vegan: false, objectives: ['prise_de_masse', 'sport_performance', 'bien_etre'], shortBenefit: 'Enrichit les plats en protéines · Prise de masse · Sans changer ses habitudes' },
  { ref: '3968', name: 'Barres aux Protéines — Vanille-Amandes (boîte de 14)', shortName: 'Barres Protéines Vanille', category: 'proteines', pv: 13.22, publicPrice: 31.50, vegan: false, objectives: ['prise_de_masse', 'sport_performance', 'perte_de_poids'], shortBenefit: 'En-cas protéiné · Muscle & récupération · Pratique en RDV terrain', notes: 'Boîte de 14 barres' },
  { ref: '3976', name: 'Barres aux Protéines — Citron (boîte de 14)', shortName: 'Barres Protéines Citron', category: 'proteines', pv: 13.22, publicPrice: 31.50, vegan: false, objectives: ['prise_de_masse', 'sport_performance', 'perte_de_poids'], shortBenefit: 'En-cas protéiné · Muscle & récupération · Pratique en RDV terrain', notes: 'Boîte de 14 barres' },
  { ref: '0242', name: 'Formula 3 — Personalised Protein Powder', shortName: 'Formula 3 Protéines', category: 'proteines', pv: 17.95, publicPrice: 49.00, vegan: false, objectives: ['prise_de_masse', 'perte_de_poids', 'sport_performance'], shortBenefit: "Complète le shake F1 · Augmente l'apport protéique · Muscle & satiété" },

  // ─── COMPLÉMENTS ───
  { ref: '173K', name: 'Microbiotic Max', shortName: 'Microbiotic Max', category: 'complements', pv: 27.10, publicPrice: 64.50, vegan: false, objectives: ['digestion', 'bien_etre', 'immunite'], shortBenefit: 'Flore intestinale · Digestion · Transit · Microbiote' },
  { ref: '233K', name: 'Immune Booster — 21 sachets', shortName: 'Immune Booster', category: 'complements', pv: 18.90, publicPrice: 51.00, vegan: true, objectives: ['immunite', 'energie', 'bien_etre'], shortBenefit: 'Renforce les défenses immunitaires · Vitamines C & D · Zinc', notes: '21 sachets' },
  { ref: '236K', name: 'Phyto Complete', shortName: 'Phyto Complete', category: 'complements', pv: 38.15, publicPrice: 90.00, vegan: true, objectives: ['bien_etre', 'digestion', 'immunite'], shortBenefit: 'Extraits de plantes · Bien-être global · Antioxydants naturels' },
  { ref: '243K', name: 'Active Mind Complex', shortName: 'Active Mind', category: 'complements', pv: 27.25, publicPrice: 57.50, vegan: true, objectives: ['energie', 'bien_etre'], shortBenefit: 'Concentration · Mémoire · Clarté mentale · Énergie cognitive' },
  { ref: '282K', name: 'Night Mode', shortName: 'Night Mode', category: 'complements', pv: 31.25, publicPrice: 69.00, vegan: true, objectives: ['bien_etre', 'perte_de_poids'], shortBenefit: 'Qualité du sommeil · Récupération nocturne · Gestion du poids' },
  { ref: '0020', name: 'Xtra-Cal', shortName: 'Xtra-Cal Calcium', category: 'complements', pv: 10.25, publicPrice: 24.50, vegan: false, objectives: ['bien_etre', 'sport_performance'], shortBenefit: 'Calcium & Magnésium · Os & articulations · Récupération' },
  { ref: '0043', name: 'Herbalifeline Max', shortName: 'Herbalifeline Max Oméga-3', category: 'complements', pv: 19.40, publicPrice: 41.00, vegan: false, objectives: ['bien_etre', 'sport_performance', 'immunite'], shortBenefit: 'Oméga-3 · Cœur & cerveau · Anti-inflammatoire naturel' },
  { ref: '0111', name: 'Mineral Complex Plus', shortName: 'Mineral Complex', category: 'complements', pv: 15.75, publicPrice: 41.00, vegan: false, objectives: ['bien_etre', 'energie', 'sport_performance'], shortBenefit: 'Minéraux essentiels · Énergie · Récupération musculaire' },
  { ref: '0267', name: 'Beta Heart', shortName: 'Beta Heart', category: 'complements', pv: 25.95, publicPrice: 57.50, vegan: true, objectives: ['bien_etre'], shortBenefit: 'Bêta-glucanes · Cholestérol · Santé cardiovasculaire' },
  { ref: '1745', name: 'Complexe Vitamines et Minéraux Homme', shortName: 'Multivitamines Homme', category: 'complements', pv: 13.55, publicPrice: 31.00, vegan: false, objectives: ['bien_etre', 'energie', 'immunite'], shortBenefit: 'Vitamines & minéraux adaptés homme · Énergie · Vitalité' },
  { ref: '2038', name: 'Complexe Vitamines et Minéraux Femme', shortName: 'Multivitamines Femme', category: 'complements', pv: 13.55, publicPrice: 31.00, vegan: false, objectives: ['bien_etre', 'energie', 'immunite'], shortBenefit: 'Vitamines & minéraux adaptés femme · Énergie · Vitalité' },
  { ref: '3150', name: 'Niteworks', shortName: 'Niteworks', category: 'complements', pv: 48.75, publicPrice: 113.00, vegan: true, objectives: ['sport_performance', 'bien_etre', 'energie'], shortBenefit: 'Oxyde nitrique · Circulation · Performance & endurance' },
  { ref: '376K', name: 'Gels ViewVita — 30 gommes Baies Rouges & Agrumes', shortName: 'Gels ViewVita Yeux', category: 'complements', pv: 27.20, publicPrice: 67.50, vegan: false, objectives: ['bien_etre'], shortBenefit: 'Santé oculaire · Lutéine & Zéaxanthine · Protection écrans', notes: '30 gommes' },
  { ref: '378K', name: 'Gels CoQ10Vita — 30 gommes Saveur Cerise', shortName: 'Gels CoQ10Vita', category: 'complements', pv: 23.20, publicPrice: 57.50, vegan: false, objectives: ['energie', 'bien_etre', 'sport_performance'], shortBenefit: 'Coenzyme Q10 · Énergie cellulaire · Anti-fatigue', notes: '30 gommes' },
  { ref: '2554', name: 'Boisson Multi-Fibres', shortName: 'Multi-Fibres', category: 'complements', pv: 22.95, publicPrice: 43.50, vegan: false, objectives: ['digestion', 'perte_de_poids', 'bien_etre'], shortBenefit: 'Fibres solubles & insolubles · Transit · Satiété · Intestin' },

  // ─── COMPLÉMENTS ENFANTS ───
  { ref: '369K', name: 'Gels NutrientVita Kids — 30 gommes Tutti Frutti', shortName: 'NutrientVita Kids', category: 'complements_enfants', pv: 9.30, publicPrice: 23.00, vegan: false, objectives: ['enfants', 'immunite', 'bien_etre'], shortBenefit: 'Vitamines & minéraux enfants · Croissance · Immunité', notes: '30 gommes saveur tutti frutti' },
  { ref: '379K', name: 'Gels MindVita Kids — 30 gommes Citron & Baies Rouges', shortName: 'MindVita Kids', category: 'complements_enfants', pv: 20.50, publicPrice: 51.00, vegan: false, objectives: ['enfants', 'energie', 'bien_etre'], shortBenefit: 'Concentration & mémoire enfants · DHA · Oméga-3', notes: '30 gommes' },

  // ─── BOISSONS ───
  { ref: '178K', name: 'Boisson Instantanée à base de Thé — Original 51g', shortName: 'Thé Concentré Original', category: 'boissons', pv: 19.95, publicPrice: 41.00, vegan: true, objectives: ['energie', 'perte_de_poids', 'bien_etre'], shortBenefit: 'Booster d\'énergie · Thermogenèse · Complément du shake F1', notes: '51g — Parfum original' },
  { ref: '179K', name: 'Boisson Instantanée à base de Thé — Original 102g', shortName: 'Thé Concentré Original Grand Format', category: 'boissons', pv: 34.95, publicPrice: 73.50, vegan: true, objectives: ['energie', 'perte_de_poids', 'bien_etre'], shortBenefit: 'Booster d\'énergie · Thermogenèse · Grand format économique', notes: '102g — Parfum original' },
  { ref: '180K', name: 'Boisson Instantanée à base de Thé — Citron 51g', shortName: 'Thé Concentré Citron', category: 'boissons', pv: 19.95, publicPrice: 41.00, vegan: true, objectives: ['energie', 'perte_de_poids', 'bien_etre'], shortBenefit: 'Booster d\'énergie · Thermogenèse · Complément du shake F1', notes: '51g — Parfum citron' },
  { ref: '181K', name: 'Boisson Instantanée à base de Thé — Pêche 51g', shortName: 'Thé Concentré Pêche', category: 'boissons', pv: 19.95, publicPrice: 41.00, vegan: true, objectives: ['energie', 'perte_de_poids', 'bien_etre'], shortBenefit: 'Booster d\'énergie · Thermogenèse · Complément du shake F1', notes: '51g — Parfum pêche' },
  { ref: '182K', name: 'Boisson Instantanée à base de Thé — Framboise 51g', shortName: 'Thé Concentré Framboise', category: 'boissons', pv: 19.95, publicPrice: 41.00, vegan: true, objectives: ['energie', 'perte_de_poids', 'bien_etre'], shortBenefit: 'Booster d\'énergie · Thermogenèse · Complément du shake F1', notes: '51g — Parfum framboise' },
  { ref: '0006', name: 'Boisson Concentrée à l\'Aloe Vera — 473ml', shortName: 'Aloe Vera Original', category: 'boissons', pv: 24.95, publicPrice: 54.50, vegan: true, objectives: ['digestion', 'bien_etre', 'perte_de_poids'], shortBenefit: 'Digestion & transit · Hydratation · Muqueuse intestinale', notes: '473ml' },
  { ref: '1065', name: 'Boisson Concentrée à l\'Aloe Vera — Saveur Mangue 473ml', shortName: 'Aloe Vera Mangue', category: 'boissons', pv: 24.95, publicPrice: 54.50, vegan: true, objectives: ['digestion', 'bien_etre', 'perte_de_poids'], shortBenefit: 'Digestion & transit · Hydratation · Saveur fruitée', notes: '473ml — Saveur mangue' },
  { ref: '1188', name: 'Boisson Concentrée à l\'Aloe Vera — Format XXL 1.892L', shortName: 'Aloe Vera XXL', category: 'boissons', pv: 91.10, publicPrice: 200.50, vegan: true, objectives: ['digestion', 'bien_etre'], shortBenefit: 'Grand format famille · Digestion · Économique', notes: '1.892 litre — format familial' },
  { ref: '1196', name: 'AloeMax', shortName: 'AloeMax', category: 'boissons', pv: 28.15, publicPrice: 62.00, vegan: true, objectives: ['digestion', 'bien_etre', 'immunite'], shortBenefit: 'Aloe vera concentré · Digestion intense · Défenses naturelles' },
  { ref: '012K', name: 'High Protein Iced Coffee Latte Macchiato', shortName: 'Café Protéiné Glacé', category: 'boissons', pv: 30.55, publicPrice: 73.50, vegan: false, objectives: ['prise_de_masse', 'energie', 'sport_performance'], shortBenefit: 'Protéines + caféine · Énergie & muscle · Alternative café classique' },

  // ─── SPORT & VITALITÉ H24 ───
  { ref: '403K', name: 'Herbalife 24 — Rebuild Strength 1000g', shortName: 'Rebuild Strength 1kg', category: 'sport', pv: 33.55, publicPrice: 83.50, vegan: false, objectives: ['prise_de_masse', 'sport_performance'], shortBenefit: 'Protéines & créatine · Prise de masse musculaire · Récupération intense', notes: '1000g' },
  { ref: '486K', name: 'Herbalife 24 — Rebuild Strength 7 sachets', shortName: 'Rebuild Strength 7 sachets', category: 'sport', pv: 15.20, publicPrice: 35.50, vegan: false, objectives: ['prise_de_masse', 'sport_performance'], shortBenefit: 'Format découverte · Protéines & créatine · Prise de masse', notes: '7 sachets de 50g' },
  { ref: '488K', name: 'Herbalife 24 — Créatine+ 228g', shortName: 'Créatine+', category: 'sport', pv: 15.95, publicPrice: 39.50, vegan: true, objectives: ['prise_de_masse', 'sport_performance'], shortBenefit: 'Créatine pure · Force & puissance · Prise de masse', notes: '228g' },
  { ref: '1424', name: 'Herbalife 24 — Restore', shortName: 'H24 Restore', category: 'sport', pv: 23.55, publicPrice: 45.00, vegan: false, objectives: ['sport_performance', 'bien_etre'], shortBenefit: 'Récupération nocturne · Anti-inflammatoire · Muscles & articulations' },
  { ref: '1433', name: 'Herbalife 24 — Hydrate', shortName: 'H24 Hydrate', category: 'sport', pv: 17.20, publicPrice: 47.50, vegan: true, objectives: ['sport_performance', 'energie', 'bien_etre'], shortBenefit: 'Hydratation optimale · Électrolytes · Effort & endurance' },
  { ref: '1466', name: 'Herbalife 24 — CR7 Drive Açai 540g', shortName: 'CR7 Drive Açai', category: 'sport', pv: 12.50, publicPrice: 27.50, vegan: true, objectives: ['sport_performance', 'energie'], shortBenefit: 'Boisson sportive · Énergie & endurance · Hydratation effort', notes: '540g — saveur baies d\'açai' },
  { ref: '192K', name: 'LiftOff® Max H24 — Pamplemousse (10 sachets)', shortName: 'LiftOff Max H24', category: 'sport', pv: 15.95, publicPrice: 38.50, vegan: true, objectives: ['energie', 'sport_performance'], shortBenefit: 'Énergie rapide · Concentration · Avant entraînement', notes: '10 sachets' },
  { ref: '3152', name: 'LiftOff® — Citron Vert (10 comprimés)', shortName: 'LiftOff Citron Vert', category: 'sport', pv: 15.95, publicPrice: 39.50, vegan: true, objectives: ['energie', 'sport_performance', 'bien_etre'], shortBenefit: 'Énergie & concentration · Vitamines B & C · Effervescent', notes: '10 comprimés' },
  { ref: '402K', name: 'Herbalife 24 — Gels Énergétiques Prolong (10 sachets)', shortName: 'Gels Énergétiques Prolong', category: 'sport', pv: 13.60, publicPrice: 30.00, vegan: false, objectives: ['sport_performance', 'energie'], shortBenefit: 'Énergie longue durée · Glucides complexes · Endurance', notes: '10 sachets' },
  { ref: '149K', name: 'Barres Protéinées Achieve H24 — Chocolate Chip Cookie Dough (6 barres)', shortName: 'Barres H24 Cookie Dough', category: 'sport', pv: 11.30, publicPrice: 27.50, vegan: false, objectives: ['prise_de_masse', 'sport_performance'], shortBenefit: 'Protéines sportives · Récupération musculaire · En-cas post-effort', notes: 'Boîte de 6 barres' },
  { ref: '150K', name: 'Barres Protéinées Achieve H24 — Chocolat Noir (6 barres)', shortName: 'Barres H24 Chocolat Noir', category: 'sport', pv: 11.30, publicPrice: 27.50, vegan: false, objectives: ['prise_de_masse', 'sport_performance'], shortBenefit: 'Protéines sportives · Récupération musculaire · En-cas post-effort', notes: 'Boîte de 6 barres' },

  // ─── PACKS ───
  { ref: '75Z1', name: 'Pack Essai — 3x2 sachets F1 + 2 sachets de thé', shortName: 'Pack Découverte', category: 'packs', pv: 12.40, publicPrice: 34.00, vegan: false, objectives: ['perte_de_poids', 'bien_etre'], shortBenefit: 'Idéal pour démarrer · Découverte Formula 1 + Thé · Sans engagement', notes: 'Pack essai — vanille, cookie, chocolat + thé' },
]

// ─── HELPERS ───

export function getProductsByObjective(objective: ProductObjective): HerbalifeProduct[] {
  return HERBALIFE_PRODUCTS.filter(p => p.objectives.includes(objective))
}

export function getProductsByCategory(category: ProductCategory): HerbalifeProduct[] {
  return HERBALIFE_PRODUCTS.filter(p => p.category === category)
}

export function getProductByRef(ref: string): HerbalifeProduct | undefined {
  return HERBALIFE_PRODUCTS.find(p => p.ref === ref)
}

export function calculateTotalPv(refs: string[]): number {
  return refs.reduce((total, ref) => total + (getProductByRef(ref)?.pv ?? 0), 0)
}

export function calculateTotalPublicPrice(refs: string[]): number {
  return refs.reduce((total, ref) => total + (getProductByRef(ref)?.publicPrice ?? 0), 0)
}

export const OBJECTIVE_RECOMMENDATIONS: Record<ProductObjective, string[]> = {
  perte_de_poids: ['4466', '178K', '0006', '0242', '2554'],
  prise_de_masse: ['013K', '403K', '0242', '488K', '1433'],
  energie: ['178K', '192K', '243K', '233K', '3150'],
  sport_performance: ['403K', '1433', '402K', '1424', '488K'],
  bien_etre: ['4466', '0006', '1745', '0043', '173K'],
  digestion: ['0006', '173K', '2554', '1196', '236K'],
  immunite: ['233K', '0043', '173K', '1745', '236K'],
  enfants: ['369K', '379K'],
}
