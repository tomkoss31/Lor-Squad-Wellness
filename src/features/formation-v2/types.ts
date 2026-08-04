// =============================================================================
// Formation V2 — types du moteur de micro-leçons (2026-08-04).
//
// Chantier « refonte formation Herbalife façon Duolingo ». Maquette validée par
// Thomas : scratchpad/formation-v2.html.
//
// PRINCIPE : une leçon = une IDÉE, tenable en 2 minutes. Elle se joue en 3 temps
//   1. CARTE   — une idée force + un texte court + un exemple copiable
//   2. CHECK   — un mini-QCM à feedback immédiat (pas un examen noté)
//   3. RÉCOMPENSE — validée sur-le-champ : XP + série + confettis
//
// ⚠ On CASSE le mur de l'ancienne formation : plus de quiz-à-100 %, plus de
// validation sponsor obligatoire, plus de réponse libre notée, plus de
// séquentiel strict. Le fond (le contenu) vient de l'existant (Boîte à outils,
// cockpit Go Pro, scripts BBC, Academy) — on le RELIE, on ne le réécrit pas.
// =============================================================================

/** Accent d'une leçon — l'identité de l'app (jamais d'or/orange ici). */
export type LessonAccent = "teal" | "lime" | "violet" | "coral";

/** Une option d'un mini-check. */
export interface CheckOption {
  label: string;
  correct: boolean;
}

/** Le mini-check de fin de leçon : une question, feedback immédiat. */
export interface LessonCheck {
  question: string;
  options: CheckOption[];
  /** Ce qu'on dit quand c'est juste (renforce le pourquoi). */
  successNote: string;
  /** Ce qu'on dit quand c'est faux (explique, sans punir). */
  retryNote: string;
}

/** Un bloc de la carte-leçon (le corps pédagogique). */
export type LessonBlock =
  /** Paragraphe court. `**gras**` autorisé. */
  | { kind: "text"; text: string }
  /** Encadré « exemple copiable » (message, script). */
  | { kind: "example"; label?: string; text: string }
  /** Puce d'une liste (les étapes, les pièges…). */
  | { kind: "bullet"; text: string };

/** Une micro-leçon. */
export interface Lesson {
  /** Identifiant stable (sert de clé de progression). */
  slug: string;
  /** Emoji du nœud sur le chemin. */
  icon: string;
  /** Titre court. */
  title: string;
  /** Sous-ligne du nœud sur le chemin (≤ ~22 car.). */
  pathLabel: string;
  /** Durée annoncée (« 2 min »). */
  minutes: number;
  accent: LessonAccent;
  /** L'idée à retenir, en une phrase choc. */
  ideeForce: string;
  /** Le corps de la carte. */
  blocks: LessonBlock[];
  /** Le mini-check. `undefined` = leçon sans check (juste « J'ai compris »). */
  check?: LessonCheck;
  /** D'où vient le contenu (traçabilité — non affiché). */
  source?: string;
}

/** Un chapitre = un groupe de leçons. */
export interface Chapter {
  slug: string;
  /** « Chapitre 2 · Trouver » → number = 2, theme = « Trouver ». */
  number: number;
  theme: string;
  /** Titre affiché du chapitre. */
  title: string;
  /** Ligne de récap « ce que tu sais faire » sur l'écran de fin de parcours. */
  recap: string;
  lessons: Lesson[];
}

/** XP gagné par leçon terminée (aligné sur le barème existant : +15). */
export const XP_PER_LESSON = 15;
