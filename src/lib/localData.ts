import type { Bilan, BodyScan, Client, ClientProduit, Suivi } from "./types";

const keys = {
  clients: "lor_demo_clients",
  bilans: "lor_demo_bilans",
  scans: "lor_demo_scans",
  suivis: "lor_demo_suivis",
  clientProduits: "lor_demo_client_produits"
} as const;

function readCollection<T>(key: string): T[] {
  if (typeof window === "undefined") {
    return [];
  }

  const raw = window.localStorage.getItem(key);
  if (!raw) {
    return [];
  }

  try {
    return JSON.parse(raw) as T[];
  } catch {
    return [];
  }
}

function writeCollection<T>(key: string, data: T[]) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(key, JSON.stringify(data));
}

function daysAgo(days: number) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString();
}

function dateOnlyFromIso(value: string) {
  return value.slice(0, 10);
}

function buildDemoClients(): Client[] {
  const createdA = daysAgo(18);
  const createdB = daysAgo(11);
  const createdC = daysAgo(5);

  return [
    {
      id: "demo-client-1",
      coach_id: "demo-user",
      first_name: "Sonia",
      last_name: "Carvalho",
      email: "sonia.demo@lor.local",
      phone: "06 12 34 56 78",
      birth_date: "1992-05-14",
      gender: "femme",
      height_cm: 167,
      objective: "Retrouver de l'énergie et relancer la perte de poids",
      notes: "Cliente régulière, très bonne adhésion au suivi.",
      status: "actif",
      created_at: createdA,
      updated_at: createdA
    },
    {
      id: "demo-client-2",
      coach_id: "demo-user",
      first_name: "Lucas",
      last_name: "Costa",
      email: "lucas.demo@lor.local",
      phone: "06 22 33 44 55",
      birth_date: "1988-09-02",
      gender: "homme",
      height_cm: 181,
      objective: "Améliorer la composition corporelle et la récupération",
      notes: "Profil sportif, veut mieux structurer ses repas.",
      status: "actif",
      created_at: createdB,
      updated_at: createdB
    },
    {
      id: "demo-client-3",
      coach_id: "demo-user",
      first_name: "Mélanie",
      last_name: "Rodrigues",
      email: "melanie.demo@lor.local",
      phone: "06 98 76 54 32",
      birth_date: "1995-01-20",
      gender: "femme",
      height_cm: 163,
      objective: "Réduire le grignotage et retrouver un bon sommeil",
      notes: "Suivi à relancer sur l'hydratation.",
      status: "pause",
      created_at: createdC,
      updated_at: createdC
    }
  ];
}

function buildDemoBilans(): Bilan[] {
  return [
    {
      id: "demo-bilan-1",
      client_id: "demo-client-1",
      coach_id: "demo-user",
      date: dateOnlyFromIso(daysAgo(10)),
      sleep_quality: 2,
      energy_level: 2,
      stress_level: 4,
      breakfast: "Café + tartines rapides",
      lunch: "Déjeuner pris au travail",
      dinner: "Repas tardif",
      snacking: "oui",
      snacking_frequency: "souvent en fin d'après-midi",
      water_liters: 1.1,
      digestion_quality: 2,
      main_objective: "perte de poids",
      blockers: "manque de temps, organisation",
      motivation_level: 4,
      recommendations: [
        {
          category: "Hydratation",
          priority: "haute",
          product: "Herbal Aloe Concentrate",
          reason: "Hydratation en dessous des besoins"
        },
        {
          category: "Stress",
          priority: "haute",
          reason: "Niveau de stress élevé détecté"
        }
      ],
      notes: "Bon potentiel, besoin d'un cadre clair.",
      created_at: daysAgo(10)
    },
    {
      id: "demo-bilan-2",
      client_id: "demo-client-2",
      coach_id: "demo-user",
      date: dateOnlyFromIso(daysAgo(7)),
      sleep_quality: 4,
      energy_level: 4,
      stress_level: 2,
      breakfast: "Shake + fruit",
      lunch: "Repas structuré",
      dinner: "Protéines + légumes",
      snacking: "non",
      water_liters: 2.3,
      digestion_quality: 4,
      main_objective: "prise de muscle",
      blockers: "motivation",
      motivation_level: 5,
      recommendations: [],
      notes: "Très bon engagement.",
      created_at: daysAgo(7)
    },
    {
      id: "demo-bilan-3",
      client_id: "demo-client-3",
      coach_id: "demo-user",
      date: dateOnlyFromIso(daysAgo(3)),
      sleep_quality: 3,
      energy_level: 3,
      stress_level: 3,
      breakfast: "Yaourt + café",
      lunch: "Salade ou sandwich",
      dinner: "Repas variable",
      snacking: "oui",
      snacking_frequency: "parfois le soir",
      water_liters: 1.4,
      digestion_quality: 3,
      main_objective: "bien-être",
      blockers: "budget",
      motivation_level: 3,
      recommendations: [
        {
          category: "Hydratation",
          priority: "haute",
          product: "Herbal Aloe Concentrate",
          reason: "Hydratation en dessous des besoins"
        }
      ],
      notes: "À réactiver doucement.",
      created_at: daysAgo(3)
    }
  ];
}

function buildDemoScans(): BodyScan[] {
  return [
    {
      id: "demo-scan-1",
      client_id: "demo-client-1",
      coach_id: "demo-user",
      date: dateOnlyFromIso(daysAgo(4)),
      weight_kg: 72.8,
      fat_mass_percent: 31.2,
      fat_mass_kg: 22.7,
      muscle_mass_kg: 27.9,
      bone_mass_kg: 2.4,
      water_percent: 49.8,
      visceral_fat_level: 11,
      bmr: 1460,
      metabolic_age: 39,
      bmi: 26.1,
      waist_cm: 82,
      hip_cm: 102,
      chest_cm: 94,
      notes: "Hydratation à renforcer.",
      created_at: daysAgo(4)
    },
    {
      id: "demo-scan-2",
      client_id: "demo-client-2",
      coach_id: "demo-user",
      date: dateOnlyFromIso(daysAgo(2)),
      weight_kg: 84.3,
      fat_mass_percent: 18.6,
      fat_mass_kg: 15.7,
      muscle_mass_kg: 39.8,
      bone_mass_kg: 3.1,
      water_percent: 57.4,
      visceral_fat_level: 8,
      bmr: 1820,
      metabolic_age: 31,
      bmi: 25.7,
      waist_cm: 88,
      hip_cm: 97,
      chest_cm: 104,
      notes: "Très bonne base métabolique.",
      created_at: daysAgo(2)
    },
    {
      id: "demo-scan-3",
      client_id: "demo-client-3",
      coach_id: "demo-user",
      date: dateOnlyFromIso(daysAgo(1)),
      weight_kg: 64.1,
      fat_mass_percent: 29.4,
      fat_mass_kg: 18.8,
      muscle_mass_kg: 23.4,
      bone_mass_kg: 2.2,
      water_percent: 51.2,
      visceral_fat_level: 10,
      bmr: 1330,
      metabolic_age: 35,
      bmi: 24.1,
      waist_cm: 76,
      hip_cm: 98,
      chest_cm: 90,
      notes: "Suivi à reprendre progressivement.",
      created_at: daysAgo(1)
    }
  ];
}

function buildDemoSuivis(): Suivi[] {
  return [
    {
      id: "demo-suivi-1",
      client_id: "demo-client-1",
      coach_id: "demo-user",
      date: dateOnlyFromIso(daysAgo(5)),
      week_number: 3,
      energy_level: 3,
      hunger_level: 2,
      digestion_quality: 3,
      bloating: 2,
      water_liters: 1.4,
      sleep_quality: 3,
      meals_respected: true,
      prep_difficulty: "Organisation le midi",
      small_victories: "A gardé son petit-déjeuner 4 jours sur 7",
      remaining_blockers: "Hydratation",
      notes: "Continuer le cadrage simple.",
      created_at: daysAgo(5)
    },
    {
      id: "demo-suivi-2",
      client_id: "demo-client-2",
      coach_id: "demo-user",
      date: dateOnlyFromIso(daysAgo(3)),
      week_number: 2,
      energy_level: 4,
      hunger_level: 3,
      digestion_quality: 4,
      bloating: 1,
      water_liters: 2.5,
      sleep_quality: 4,
      meals_respected: true,
      prep_difficulty: "RAS",
      small_victories: "Très bonne régularité",
      remaining_blockers: "Collation post-entraînement à caler",
      notes: "Profil stable.",
      created_at: daysAgo(3)
    }
  ];
}

function buildDemoClientProduits(): ClientProduit[] {
  return [
    {
      id: "demo-program-1",
      client_id: "demo-client-1",
      coach_id: "demo-user",
      produit_name: "Formula 1 shake",
      start_date: dateOnlyFromIso(daysAgo(24)),
      expected_end_date: dateOnlyFromIso(daysAgo(-4)),
      pv: 24.5,
      price_public: 43.9,
      status: "actif",
      notes: "Renouvellement à anticiper.",
      created_at: daysAgo(24)
    },
    {
      id: "demo-program-2",
      client_id: "demo-client-2",
      coach_id: "demo-user",
      produit_name: "Herbalife24 Rebuild Strength",
      start_date: dateOnlyFromIso(daysAgo(14)),
      expected_end_date: dateOnlyFromIso(daysAgo(-16)),
      pv: 31.2,
      price_public: 59.9,
      status: "actif",
      notes: "Très bon usage.",
      created_at: daysAgo(14)
    }
  ];
}

export function ensureDemoData() {
  if (typeof window === "undefined") {
    return;
  }

  if (readCollection<Client>(keys.clients).length === 0) {
    writeClients(buildDemoClients());
  }

  if (readCollection<Bilan>(keys.bilans).length === 0) {
    writeBilans(buildDemoBilans());
  }

  if (readCollection<BodyScan>(keys.scans).length === 0) {
    writeBodyScans(buildDemoScans());
  }

  if (readCollection<Suivi>(keys.suivis).length === 0) {
    writeSuivis(buildDemoSuivis());
  }

  if (readCollection<ClientProduit>(keys.clientProduits).length === 0) {
    writeClientProduits(buildDemoClientProduits());
  }
}

export function readClients() {
  return readCollection<Client>(keys.clients);
}

export function writeClients(data: Client[]) {
  writeCollection(keys.clients, data);
}

export function readBilans() {
  return readCollection<Bilan>(keys.bilans);
}

export function writeBilans(data: Bilan[]) {
  writeCollection(keys.bilans, data);
}

export function readBodyScans() {
  return readCollection<BodyScan>(keys.scans);
}

export function writeBodyScans(data: BodyScan[]) {
  writeCollection(keys.scans, data);
}

export function readSuivis() {
  return readCollection<Suivi>(keys.suivis);
}

export function writeSuivis(data: Suivi[]) {
  writeCollection(keys.suivis, data);
}

export function readClientProduits() {
  return readCollection<ClientProduit>(keys.clientProduits);
}

export function writeClientProduits(data: ClientProduit[]) {
  writeCollection(keys.clientProduits, data);
}
