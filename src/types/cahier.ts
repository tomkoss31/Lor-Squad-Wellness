// =============================================================================
// Types Cahier de bord (2026-05-04)
// =============================================================================

export interface CobayeTrackerEntry {
  id: string;
  user_id: string;
  day_number: number;
  note: string | null;
  energy_level: number | null;
  sleep_quality: number | null;
  weight_kg: number | null;
  created_at: string;
  updated_at: string;
}

export type CobayePhotoPose = "face" | "profil" | "autre";

export interface CobayePhoto {
  id: string;
  user_id: string;
  day_number: number;
  photo_url: string;
  pose: CobayePhotoPose;
  uploaded_at: string;
}

export type Liste100Temperature = "chaud" | "tiede" | "froid";

export type Liste100Status =
  | "non_contacte"
  | "contacte"
  | "rdv_cale"
  | "ebe_fait"
  | "client"
  | "refus";

export type Liste100FrankCategory =
  | "famille"
  | "reseau"
  | "amis"
  | "nouveaux"
  | "connaissances";

export interface Liste100Contact {
  id: string;
  user_id: string;
  full_name: string;
  frank_category: Liste100FrankCategory | null;
  temperature: Liste100Temperature;
  status: Liste100Status;
  note: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  added_at: string;
  updated_at: string;
}

export type EbeOutcome = "signed" | "pending" | "refused";

export interface EbeJournalEntry {
  id: string;
  user_id: string;
  ebe_date: string;
  assessment_id: string | null;
  prospect_name: string | null;
  self_score: number | null;
  what_went_well: string | null;
  what_to_improve: string | null;
  outcome: EbeOutcome | null;
  recos_count: number;
  created_at: string;
  updated_at: string;
}

export const LISTE_100_STATUS_META: Record<Liste100Status, { label: string; color: string; emoji: string }> = {
  non_contacte: { label: "Non contacté", color: "var(--ls-text-muted)", emoji: "⚪" },
  contacte: { label: "Contacté", color: "var(--ls-teal)", emoji: "💬" },
  rdv_cale: { label: "RDV calé", color: "var(--ls-gold)", emoji: "📅" },
  ebe_fait: { label: "EBE fait", color: "var(--ls-purple)", emoji: "📊" },
  client: { label: "Client", color: "var(--ls-teal)", emoji: "✅" },
  refus: { label: "Refus", color: "var(--ls-coral)", emoji: "❌" },
};

export const LISTE_100_TEMP_META: Record<Liste100Temperature, { label: string; color: string; emoji: string }> = {
  chaud: { label: "Chaud", color: "var(--ls-coral)", emoji: "🔥" },
  tiede: { label: "Tiède", color: "var(--ls-gold)", emoji: "🌤" },
  froid: { label: "Froid", color: "var(--ls-teal)", emoji: "❄️" },
};

export const LISTE_100_FRANK_META: Record<Liste100FrankCategory, { label: string; emoji: string }> = {
  famille: { label: "Famille", emoji: "👪" },
  reseau: { label: "Réseau", emoji: "🤝" },
  amis: { label: "Amis", emoji: "🫂" },
  nouveaux: { label: "Nouveaux", emoji: "🌱" },
  connaissances: { label: "Connaissances", emoji: "👋" },
};
