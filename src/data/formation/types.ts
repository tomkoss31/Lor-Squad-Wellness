// =============================================================================
// Formation — types (2026-04-30)
//
// Types statiques pour le centre de Formation Lor'Squad. Phase 2 = TS pur,
// pas de DB. Migration vers tables formation_* en Phase 3 quand le contenu
// Notion sera mature.
//
// Deux structures coexistent :
//
//   1. PARCOURS GUIDE — 3 niveaux empiles (Démarrer / Construire / Dupliquer)
//      Chaque niveau contient des modules sequentiels avec progression
//      bloquante. Cible : nouveau distri qui veut une route claire.
//
//   2. BIBLIOTHEQUE PAR THEME — 4 catégories transverses (Prospection /
//      Bilan / Suivi / Business). Cible : distri experimente qui pioche
//      selon son besoin du moment.
// =============================================================================

// ─── PARCOURS ─────────────────────────────────────────────────────────────

/** Identifiant unique d un niveau de parcours. */
export type FormationLevelId = "demarrer" | "construire" | "dupliquer";

export type FormationLevelAccent = "gold" | "teal" | "purple";

export interface FormationLevel {
  id: FormationLevelId;
  /** Slug pour URL (/formation/parcours/:slug). */
  slug: string;
  /** Numero du niveau (1, 2, 3) — utilise pour le titre court "N1". */
  order: 1 | 2 | 3;
  /** Titre court ("Démarrer"). */
  title: string;
  /** Sous-titre concret ("0 → 500 PV"). */
  subtitle: string;
  /** Phrase descriptive courte (10-15 mots). */
  description: string;
  /** Emoji visuel principal. */
  icon: string;
  /** Couleur d accent (token var(--ls-{accent})). */
  accent: FormationLevelAccent;
  /** Modules de ce niveau (vides en Phase 2, remplis quand Notion mur). */
  modules: FormationModule[];
  /** Niveau prerequis avant deblocage. null = N1 toujours dispo. */
  unlockedBy?: FormationLevelId;
}

export interface FormationModule {
  id: string;
  /** Slug pour URL (/formation/parcours/:levelSlug/:moduleSlug). */
  slug: string;
  /** Numero du module dans son niveau (M1.1, M1.2, etc.). */
  number: string;
  title: string;
  /** Phrase explicative courte. */
  description: string;
  /** Duree estimee en minutes (10 = court, 25 = long). */
  durationMin: number;
  /** Emoji ou icone. */
  icon: string;
  /** Lecons du module (Phase 3). */
  lessons: FormationLesson[];
  /** Quiz optionnel post-module (Phase 3). */
  quiz?: FormationQuiz;
}

export type FormationLessonKind =
  | "text"
  | "video"
  | "school-link"
  | "checklist"
  | "interactive";

export interface FormationLesson {
  id: string;
  slug: string;
  title: string;
  kind: FormationLessonKind;
  durationMin: number;
  /** Contenu markdown pour kind=text. */
  contentMarkdown?: string;
  /** URL YouTube/Vimeo pour kind=video. */
  videoUrl?: string;
  /** URL Herbalife School pour kind=school-link. */
  schoolUrl?: string;
}

export interface FormationQuiz {
  id: string;
  /** Score minimum pour valider (sur N questions). */
  passingScore: number;
  questions: FormationQuizQuestion[];
}

export interface FormationQuizQuestion {
  id: string;
  question: string;
  answers: string[];
  correctIndex: number;
  /** Explication pédagogique post-réponse. */
  explanation: string;
}

// ─── BIBLIOTHEQUE PAR THEME ───────────────────────────────────────────────

export type FormationCategoryAccent =
  | "gold"
  | "teal"
  | "purple"
  | "coral";

export interface FormationCategory {
  /** Slug pour URL (/formation/:slug). */
  slug: string;
  title: string;
  emoji: string;
  /** Couleur d accent (token var(--ls-{accent})). */
  accent: FormationCategoryAccent;
  description: string;
  /** Ressources de la categorie (vides en Phase 2). */
  resources: FormationResource[];
}

export type FormationResourceKind =
  | "school-video"
  | "internal-video"
  | "pdf"
  | "guide"
  | "module-link";

export interface FormationResource {
  id: string;
  title: string;
  description: string;
  kind: FormationResourceKind;
  /** URL Herbalife School pour kind=school-video. */
  schoolUrl?: string;
  /** URL YouTube/Vimeo pour kind=internal-video. */
  videoUrl?: string;
  /** Path PDF pour kind=pdf. */
  pdfUrl?: string;
  /** Module ID lie pour kind=module-link (renvoie vers parcours). */
  moduleId?: string;
  durationMin?: number;
  /** Tag court ("Fondamentaux", "Script", etc.). */
  tag?: string;
  /** Indicateur "nouveau" (visible 30j apres ajout). */
  isNew?: boolean;
}

// ─── PROGRESSION USER ─────────────────────────────────────────────────────

/**
 * Etat de progression d un user pour chaque niveau. Stocke en localStorage
 * en Phase 2 (clé 'ls_formation_progress'), migre vers DB en Phase 3.
 */
export interface FormationLevelProgress {
  /** Modules valides dans ce niveau. */
  completedModules: string[];
  /** Date du dernier acces (pour reprise). */
  lastSeenAt: string | null;
}

export interface FormationProgressState {
  /** Par niveau, ce que le user a fait. */
  levels: Record<FormationLevelId, FormationLevelProgress>;
}
