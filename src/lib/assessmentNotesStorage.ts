// Chantier Hotfix fuite notes coach (2026-04-24).
// Helper pur : calcule la clé localStorage scopée par prospectId pour
// les notes coach du bilan en cours. Si pas de prospectId (bilan neuf
// sans prospect précis), on retourne null → persistance désactivée,
// état éphémère en state React uniquement.
//
// Avant : clé unique globale 'lorsquad-assessment-coach-notes' → le
// draft d'un bilan abandonné fuyait dans le bilan suivant (BUG).
// Après : clé scopée → pas de fuite cross-client possible.

export const LEGACY_COACH_NOTES_KEY = "lorsquad-assessment-coach-notes";
export const COACH_NOTES_KEY_PREFIX = "lorsquad-assessment-coach-notes:";

/**
 * Retourne la clé localStorage pour les notes coach d'un bilan donné.
 * null → ne pas persister (état éphémère).
 *
 * Règle : on ne persiste QUE quand le bilan est rattaché à un prospect
 * identifié (via ?prospectId=xxx). Pour les bilans 100% neufs sans
 * prospect source, les notes restent en state React uniquement,
 * garantissant zéro fuite entre bilans de clients différents.
 */
export function notesStorageKey(prospectId: string | null | undefined): string | null {
  const id = (prospectId ?? "").trim();
  if (!id) return null;
  return `${COACH_NOTES_KEY_PREFIX}${id}`;
}

/**
 * Lit le draft depuis localStorage selon la clé scopée.
 * Retourne "" si clé null ou absente.
 */
export function readCoachNotesDraft(prospectId: string | null | undefined): string {
  if (typeof window === "undefined") return "";
  const key = notesStorageKey(prospectId);
  if (!key) return "";
  try {
    return window.localStorage.getItem(key) ?? "";
  } catch {
    return "";
  }
}

/**
 * Écrit le draft dans localStorage si la clé est scopée.
 * No-op silencieux si la clé est null (bilan éphémère).
 */
export function writeCoachNotesDraft(
  prospectId: string | null | undefined,
  value: string,
): void {
  if (typeof window === "undefined") return;
  const key = notesStorageKey(prospectId);
  if (!key) return;
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // quota / mode privé
  }
}

/**
 * Purge les draft coach notes : clé scopée courante + clé legacy
 * globale (migration : anciens utilisateurs qui ont encore la clé
 * non-scopée en localStorage — on la nettoie de façon opportuniste).
 */
export function clearCoachNotesDraft(prospectId: string | null | undefined): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(LEGACY_COACH_NOTES_KEY);
    const key = notesStorageKey(prospectId);
    if (key) window.localStorage.removeItem(key);
  } catch {
    // silent
  }
}

/**
 * Purge aveugle de la clé legacy (appelée au montage de NewAssessmentPage)
 * pour les users déjà affectés par le bug : leur ancienne clé globale
 * contient peut-être un draft d'un bilan passé. On la nettoie toujours.
 */
export function purgeLegacyCoachNotesKey(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(LEGACY_COACH_NOTES_KEY);
  } catch {
    // silent
  }
}
