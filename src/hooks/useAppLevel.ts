// =============================================================================
// useAppLevel — le niveau de visibilité de l'utilisateur courant (2026-07-27).
//
// Chantier Simplification, LOT 0. Point d'entrée unique côté React : aucun
// composant ne doit lire `currentUser.appLevel` directement, tout passe par ce
// hook + `can()`. Ça garantit qu'on peut changer la règle en un seul endroit.
//
//   const { can } = useAppLevel();
//   if (can("business.flex")) { … }
//
// Rappel : ça pilote l'AFFICHAGE des menus, jamais l'accès aux routes.
// Cf. src/config/appVisibility.ts pour la carte complète.
//
// 2026-08-04 — chantier « l'app d'un débutant ». Le hook expose en plus le
// PALIER DE DÉMARRAGE : un nouveau ne voit d'abord qu'une poignée d'entrées,
// et l'app s'ouvre au fil de ce qu'il fait. `can()` compose les deux filtres.
// =============================================================================

import { useCallback, useMemo } from "react";
import { useAppContext } from "../context/AppContext";
import {
  DEFAULT_APP_LEVEL,
  featureStage,
  isFeatureUnlocked,
  isFeatureVisible,
  STAGE_CONDITION,
  toAppLevel,
  type AppLevel,
  type FeatureKey,
  type StarterStage,
} from "../config/appVisibility";

export interface UseAppLevelResult {
  level: AppLevel;
  isComplet: boolean;
  /** Vrai si la feature doit apparaître dans les menus de cet utilisateur. */
  can: (key: FeatureKey) => boolean;
  /** Palier de démarrage atteint. */
  stage: StarterStage;
  /**
   * Vrai si la feature est encore verrouillée par le PALIER (mais autorisée
   * par le niveau) : on l'affiche alors en grisé avec sa condition, plutôt que
   * de la cacher — le coach doit savoir que ça existe et ce qui l'ouvre.
   */
  isLocked: (key: FeatureKey) => boolean;
  /** Phrase « quand tu auras… » à afficher sur une entrée verrouillée. */
  lockReason: (key: FeatureKey) => string;
}

export function useAppLevel(): UseAppLevelResult {
  const { currentUser, clients } = useAppContext();

  const level = useMemo<AppLevel>(
    () => (currentUser ? toAppLevel(currentUser.appLevel) : DEFAULT_APP_LEVEL),
    [currentUser],
  );

  /**
   * Palier déduit de l'ACTIVITÉ RÉELLE, pas d'une case cochée — même logique
   * que la règle serveur « 3 bilans = coach lancé » (migration
   * activation_sans_hom). Aucune requête supplémentaire : tout vient des
   * clients déjà chargés dans le contexte.
   */
  const stage = useMemo<StarterStage>(() => {
    // Admins et référents ne sont pas des débutants : jamais de verrou.
    if (!currentUser || currentUser.role === "admin" || currentUser.role === "referent") {
      return "lance";
    }
    const mine = (clients ?? []).filter((c) => c.distributorId === currentUser.id);
    const bilans = mine.reduce((n, c) => n + (c.assessments?.length ?? 0), 0);
    if (bilans >= 3) return "lance";
    if (bilans >= 1) return "en_route";
    if (mine.length >= 1) return "premiers_pas";
    return "demarrage";
  }, [currentUser, clients]);

  const can = useCallback(
    (key: FeatureKey) => isFeatureVisible(key, level) && isFeatureUnlocked(key, stage),
    [level, stage],
  );

  const isLocked = useCallback(
    (key: FeatureKey) => isFeatureVisible(key, level) && !isFeatureUnlocked(key, stage),
    [level, stage],
  );

  const lockReason = useCallback((key: FeatureKey) => {
    const required = featureStage(key);
    return required ? STAGE_CONDITION[required] : "";
  }, []);

  return { level, isComplet: level === "complet", can, stage, isLocked, lockReason };
}
