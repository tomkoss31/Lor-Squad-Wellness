export interface Profile {
  id: string
  full_name: string | null
  role: "coach" | "admin"
  avatar_url: string | null
  created_at: string
  updated_at?: string
}

export interface Client {
  id: string
  coach_id: string
  first_name: string
  last_name: string
  email?: string
  phone?: string
  birth_date?: string
  gender?: "homme" | "femme" | "autre"
  height_cm?: number
  objective?: string
  notes?: string
  status: "actif" | "inactif" | "pause"
  created_at: string
  updated_at: string
}

export interface Bilan {
  id: string
  client_id: string
  coach_id: string
  date: string
  wake_time?: string
  sleep_time?: string
  sleep_quality?: number
  energy_level?: number
  stress_level?: number
  breakfast?: string
  breakfast_time?: string
  lunch?: string
  dinner?: string
  snacking?: string
  snacking_frequency?: string
  water_liters?: number
  other_drinks?: string
  sport_type?: string
  sport_frequency?: string
  sport_duration?: string
  health_issues?: string
  medications?: string
  digestion_quality?: number
  transit?: string
  main_objective?: string
  secondary_objective?: string
  blockers?: string
  motivation_level?: number
  recommendations: Recommendation[]
  notes?: string
  created_at: string
}

export interface BodyScan {
  id: string
  client_id: string
  coach_id: string
  bilan_id?: string
  date: string
  weight_kg?: number
  fat_mass_percent?: number
  fat_mass_kg?: number
  muscle_mass_kg?: number
  bone_mass_kg?: number
  water_percent?: number
  visceral_fat_level?: number
  bmr?: number
  metabolic_age?: number
  bmi?: number
  waist_cm?: number
  hip_cm?: number
  chest_cm?: number
  notes?: string
  created_at: string
}

export interface Suivi {
  id: string
  client_id: string
  coach_id: string
  date: string
  week_number?: number
  energy_level?: number
  hunger_level?: number
  digestion_quality?: number
  bloating?: number
  water_liters?: number
  sleep_quality?: number
  meals_respected?: boolean
  prep_difficulty?: string
  small_victories?: string
  remaining_blockers?: string
  notes?: string
  created_at: string
}

export interface ClientProduit {
  id: string
  client_id: string
  coach_id: string
  produit_id?: string
  produit_name: string
  start_date: string
  expected_end_date?: string
  pv?: number
  price_public?: number
  status: "actif" | "terminé" | "pause" | "annulé"
  notes?: string
  created_at: string
}

export interface Produit {
  id: string
  name: string
  category: string
  description?: string
  pv?: number
  price_public?: number
  duration_days?: number
  is_active: boolean
  created_at: string
}

export interface Recommendation {
  category: string
  priority: "haute" | "moyenne" | "basse"
  product?: string
  reason: string
}
