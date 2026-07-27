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
// =============================================================================

import { useCallback, useMemo } from "react";
import { useAppContext } from "../context/AppContext";
import {
  DEFAULT_APP_LEVEL,
  isFeatureVisible,
  toAppLevel,
  type AppLevel,
  type FeatureKey,
} from "../config/appVisibility";

export interface UseAppLevelResult {
  level: AppLevel;
  isComplet: boolean;
  /** Vrai si la feature doit apparaître dans les menus de cet utilisateur. */
  can: (key: FeatureKey) => boolean;
}

export function useAppLevel(): UseAppLevelResult {
  const { currentUser } = useAppContext();

  const level = useMemo<AppLevel>(
    () => (currentUser ? toAppLevel(currentUser.appLevel) : DEFAULT_APP_LEVEL),
    [currentUser],
  );

  const can = useCallback(
    (key: FeatureKey) => isFeatureVisible(key, level),
    [level],
  );

  return { level, isComplet: level === "complet", can };
}
