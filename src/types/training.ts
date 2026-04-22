// Chantier Centre de Formation V1 (2026-04-23).
// Types miroir des tables SQL training_categories / training_resources /
// training_progress. Les noms respectent snake_case côté DB.

export type TrainingLevel = "debutant" | "intermediaire" | "avance";
export type TrainingColorRamp = "teal" | "amber" | "purple";
export type TrainingResourceType = "video" | "pdf" | "guide" | "external";

export interface TrainingCategory {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  icon_name: string | null;
  color_ramp: TrainingColorRamp;
  level: TrainingLevel;
  display_order: number;
}

export interface TrainingResource {
  id: string;
  category_id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  resource_type: TrainingResourceType;
  content_url: string | null;
  internal_route: string | null;
  duration_minutes: number | null;
  display_order: number;
  is_new: boolean;
}

export interface TrainingProgressRow {
  resource_id: string;
  completed_at: string;
}

/**
 * Agrégation calculée côté front :
 * total = nb de ressources, completed = progress du user.
 */
export interface TrainingCategoryStats {
  category: TrainingCategory;
  total: number;
  completed: number;
  hasNew: boolean;
}
