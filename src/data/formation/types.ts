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
  /**
   * Phrase clé du module (callout en haut). Phase F (2026-05-02) :
   * issu du contenu Notion ("idee force"). Permet d affirmer l idée
   * dominante avant de plonger dans les lecons.
   */
  ideeForce?: string;
  /**
   * Citation/proverbe (affichage en bas du module). Phase F : issu du
   * contenu Notion ("ancrage"). Permet de marquer l esprit avec une
   * formule courte memorable.
   */
  ancrage?: string;
  /**
   * Action concrete a faire apres le module (markdown court). Phase F :
   * issu du contenu Notion ("action"). Convertit la theorie en pratique
   * immediate.
   */
  action?: string;
  /** Lecons du module. */
  lessons: FormationLesson[];
  /** Quiz optionnel post-module. */
  quiz?: FormationQuiz;
}

export type FormationLessonKind =
  | "text"
  | "video"
  | "school-link"
  | "checklist"
  | "interactive"
  | "audio";

export interface FormationLesson {
  id: string;
  slug: string;
  title: string;
  kind: FormationLessonKind;
  durationMin: number;
  /** Contenu markdown pour kind=text ou checklist. */
  contentMarkdown?: string;
  /** URL YouTube/Vimeo pour kind=video. */
  videoUrl?: string;
  /** URL Herbalife School pour kind=school-link. */
  schoolUrl?: string;
  /** URL audio (mp3/m4a) pour kind=audio (feature #8 — 2026-11-04). */
  audioUrl?: string;
  /** Items checklist explicites pour kind=checklist (feature #8). Si absent,
   *  on parse contentMarkdown pour extraire les lignes "- [ ] item". */
  checklistItems?: Array<{ id: string; label: string }>;
}

export interface FormationQuiz {
  id: string;
  /**
   * Score minimum pour valider — calcule UNIQUEMENT sur les questions
   * QCM (les free_text ne comptent pas dans le score). Passe le seuil
   * = quiz reussi en 100 % auto. Phase F (2026-05-02) : voir
   * service.submitModule pour le calcul exact.
   */
  passingScore: number;
  questions: FormationQuizQuestion[];
}

/**
 * Question quiz : QCM standard OU free_text (réponse libre).
 * Phase F (2026-05-02) : discriminated union pour supporter le coaching
 * pyramidal. Les QCM comptent dans le score, les free_text ne comptent
 * PAS mais leur reponse est obligatoire et passe automatiquement dans
 * le thread sponsor (kind='answer') a la submission.
 */
export type FormationQuizQuestion =
  | FormationQcmQuestion
  | FormationFreeTextQuestion;

export interface FormationQcmQuestion {
  kind: "qcm";
  id: string;
  question: string;
  answers: string[];
  correctIndex: number;
  /** Explication pedagogique toujours affichee post-reponse. */
  explanation: string;
}

export interface FormationFreeTextQuestion {
  kind: "free_text";
  id: string;
  question: string;
  /** Consigne / format attendu de la reponse libre. */
  prompt: string;
  /** Note interne pour le sponsor : sur quoi vérifier la qualité de la reponse. */
  sponsorCheckHint: string;
  /** Nombre minimum de caracteres pour empecher les "ok" / "vu". */
  minChars?: number;
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

// ─── BOÎTE À OUTILS (chantier toolkit, 2026-11-04) ────────────────────────
//
// La boite a outils est differente du parcours guide (modules N1/N2/N3
// qui apprend la theorie). Ici on PASSE A L ACTE : scripts copier-coller,
// fiches premium, checklists actionnables.
//
// Differents types de format :
//   - phrase-pack : pack de scripts copiables (popup sandbox)
//   - script      : 1 script unique avec relances (popup)
//   - page        : fiche premium markdown (route /boite-a-outils/:slug)
//   - checklist   : liste cochable (popup)
//
// Profils cibles : nouveau (J0-J90), relance (reactivation), sup_plus
// (apres rang Sup), tous (universel).

export type FormationToolkitCategory = "prospection" | "bilan" | "suivi" | "business";
export type FormationToolkitKind = "phrase-pack" | "script" | "page" | "checklist";
export type FormationToolkitFormat = "popup" | "page";
export type FormationToolkitProfile = "tous" | "nouveau" | "relance" | "sup_plus";

export interface FormationToolkitScript {
  /** Label du script (ex: "🔥 Contact CHAUD — direct"). */
  label: string;
  /** Texte du script copier-coller. */
  text: string;
  /** Note explicative pour le distri (italic, sous le texte). */
  note?: string;
}

export interface FormationToolkitItem {
  id: string;
  /** Slug pour URL (/formation/boite-a-outils/:slug si format=page). */
  slug: string;
  category: FormationToolkitCategory;
  title: string;
  description: string;
  kind: FormationToolkitKind;
  /** Format d'affichage : popup (modal) ou page (route dédiée). */
  format: FormationToolkitFormat;
  profile: FormationToolkitProfile;
  /** Emoji icon en pill. */
  icon: string;
  /** Durée estimée en minutes. */
  durationMin: number;
  /** Tag court ("Scripts", "Démarrage", "Pièce maîtresse", etc.). */
  tag: string;
  /** Markdown principal (intro, méthode, contexte). */
  contentMarkdown: string;
  /** Scripts copiables (optionnel) — pour kind=phrase-pack ou script. */
  scripts?: FormationToolkitScript[];
  /** Route externe optionnelle. Si presente, le click sur la card de la boite
   *  a outils redirige vers cette route au lieu d ouvrir le popup ou la page
   *  detail markdown. Utile quand un outil a deja une vraie page interactive
   *  (ex: /formation/charte, /formation/calculateur, /formation/reconnaissance). */
  externalRoute?: string;
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
